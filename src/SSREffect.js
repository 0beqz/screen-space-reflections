import { Effect, Selection } from "postprocessing"
import { Quaternion, Uniform, Vector3 } from "three"
import accumulatedCompose from "./material/shader/accumulatedCompose.frag"
import boxBlur from "./material/shader/boxBlur.frag"
import finalSSRShader from "./material/shader/finalSSRShader.frag"
import helperFunctions from "./material/shader/helperFunctions.frag"
import trCompose from "./material/shader/trCompose.frag"
import { ReflectionsPass } from "./pass/ReflectionsPass.js"
import { TemporalResolvePass } from "./temporal-resolve/pass/TemporalResolvePass.js"
import temporalResolve from "./temporal-resolve/shader/temporalResolve.frag"

const finalFragmentShader = finalSSRShader
	.replace("#include <helperFunctions>", helperFunctions)
	.replace("#include <boxBlur>", boxBlur)

/**
 * The complete Triforce, or one or more components of the Triforce.
 * @typedef {Object} SSROptions
 * @property {boolean} temporalResolve - whether you want to use Temporal Resolving to re-use reflections from the last frames; this will reduce noise tremendously but may result in "smearing"
 * @property {Number} temporalResolveMix - a value between 0 and 1 to set how much the last frame's reflections should be blended in; higher values will result in less noisy reflections when moving the camera but a more smeary look
 * @property {Number} resolutionScale - Resolution of the SSR effect, a resolution of 0.5 means the effect will be rendered at half resolution
 * @property {Number} velocityResolutionScale - Resolution of the velocity buffer, a resolution of 0.5 means velocity will be rendered at half resolution
 * @property {Number} width - width of the SSREffect
 * @property {Number} height - height of the SSREffect
 * @property {Number} blurMix - how much the blurred reflections should be mixed with the raw reflections
 * @property {Number} blurSharpness - exponent of the Box Blur filter; higher values will result in more sharpness
 * @property {Number} blurKernelSize - kernel size of the Box Blur Filter; higher kernel sizes will result in blurrier reflections with more artifacts
 * @property {Number} rayDistance - maximum distance a reflection ray can travel to find what it reflects
 * @property {Number} intensity - intensity of the reflections
 * @property {Number} colorExponent - exponent by which reflections will be potentiated when composing the current frame's reflections and the accumulated reflections into a final reflection; higher values will make reflections clearer by highlighting darker spots less
 * @property {Number} maxRoughness - maximum roughness a texel can have to have reflections calculated for it
 * @property {Number} jitter - how intense jittering should be
 * @property {Number} jitterSpread - how much the jittered rays should be spread; higher values will give a rougher look regarding the reflections but are more expensive to compute with
 * @property {Number} jitterRough - how intense jittering should be in relation to a material's roughness
 * @property {Number} roughnessFadeOut - how intense reflections should be on rough spots; a higher value will make reflections fade out quicker on rough spots
 */

/**
 * The options of the SSR effect
 * @type {SSROptions}
 */
export const defaultSSROptions = {
	temporalResolve: true,
	temporalResolveMix: 0.9,
	temporalResolveCorrection: 1,
	resolutionScale: 1,
	velocityResolutionScale: 1,
	width: typeof window !== "undefined" ? window.innerWidth : 2000,
	height: typeof window !== "undefined" ? window.innerHeight : 1000,
	blurMix: 0.5,
	blurSharpness: 10,
	blurKernelSize: 1,
	rayDistance: 0.1,
	intensity: 1,
	colorExponent: 1,
	maxRoughness: 0.1,
	jitter: 0.1,
	jitterSpread: 0.1,
	jitterRough: 0,
	roughnessFadeOut: 1,
	rayFadeOut: 0,
	MAX_STEPS: 20,
	NUM_BINARY_SEARCH_STEPS: 5,
	maxDepthDifference: 10,
	thickness: 10,
	ior: 1.45,
	ALLOW_MISSED_RAYS: true,
	USE_MRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}

// all the properties for which we don't have to resample
const noResetSamplesProperties = ["blurMix", "blurSharpness", "blurKernelSize"]

export class SSREffect extends Effect {
	samples = 0
	selection = new Selection()
	#lastSize
	#lastCameraTransform = {
		position: new Vector3(),
		quaternion: new Quaternion()
	}

	/**
	 * @param {THREE.Scene} scene The scene of the SSR effect
	 * @param {THREE.Camera} camera The camera with which SSR is being rendered
	 * @param {SSROptions} options The optional options for the SSR effect
	 */
	constructor(scene, camera, options = defaultSSROptions) {
		super("SSREffect", finalFragmentShader, {
			type: "FinalSSRMaterial",
			uniforms: new Map([
				["inputTexture", new Uniform(null)],
				["reflectionsTexture", new Uniform(null)],
				["samples", new Uniform(0)],
				["blurMix", new Uniform(0)],
				["blurSharpness", new Uniform(0)],
				["blurKernelSize", new Uniform(0)]
			]),
			defines: new Map([["RENDER_MODE", "0"]])
		})

		this._scene = scene
		this._camera = camera

		options = { ...defaultSSROptions, ...options }

		// set up passes

		// temporal resolve pass
		this.temporalResolvePass = new TemporalResolvePass(scene, camera, "", options)
		this.temporalResolvePass.fullscreenMaterial.uniforms.samples = new Uniform(0)
		this.temporalResolvePass.fullscreenMaterial.uniforms.colorExponent = new Uniform(1)
		this.temporalResolvePass.fullscreenMaterial.defines.EULER = 2.718281828459045
		this.temporalResolvePass.fullscreenMaterial.defines.FLOAT_EPSILON = 0.00001

		this.uniforms.get("reflectionsTexture").value = this.temporalResolvePass.renderTarget.texture

		// reflections pass
		this.reflectionsPass = new ReflectionsPass(this, options)
		this.temporalResolvePass.fullscreenMaterial.uniforms.inputTexture.value = this.reflectionsPass.renderTarget.texture
		this.temporalResolvePass.fullscreenMaterial.uniforms.depthTexture.value = this.reflectionsPass.depthTexture

		this.#lastSize = {
			width: options.width,
			height: options.height,
			resolutionScale: options.resolutionScale,
			velocityResolutionScale: options.velocityResolutionScale
		}

		this.#lastCameraTransform.position.copy(camera.position)
		this.#lastCameraTransform.quaternion.copy(camera.quaternion)

		this.setSize(options.width, options.height)

		this.#makeOptionsReactive(options)
	}

	#makeOptionsReactive(options) {
		const dpr = window.devicePixelRatio
		let needsUpdate = false

		const reflectionPassFullscreenMaterialUniforms = this.reflectionsPass.fullscreenMaterial.uniforms
		const reflectionPassFullscreenMaterialUniformsKeys = Object.keys(reflectionPassFullscreenMaterialUniforms)

		for (const key of Object.keys(options)) {
			Object.defineProperty(this, key, {
				get() {
					return options[key]
				},
				set(value) {
					if (options[key] === value && needsUpdate) return

					options[key] = value

					if (!noResetSamplesProperties.includes(key)) {
						this.samples = 0
						this.setSize(options.width, options.height, true)
					}

					switch (key) {
						case "resolutionScale":
							this.setSize(options.width, options.height)
							break

						case "velocityResolutionScale":
							this.temporalResolvePass.velocityResolutionScale = value
							this.temporalResolvePass.setSize(options.width, options.height)
							break

						case "width":
							if (value === undefined) return
							this.setSize(value * dpr, options.height)
							break

						case "height":
							if (value === undefined) return
							this.setSize(options.width, value * dpr)
							break

						case "blurMix":
							this.uniforms.get("blurMix").value = value
							break

						case "blurSharpness":
							this.uniforms.get("blurSharpness").value = value
							break

						case "blurKernelSize":
							this.uniforms.get("blurKernelSize").value = value
							break

						// defines
						case "MAX_STEPS":
							this.reflectionsPass.fullscreenMaterial.defines.MAX_STEPS = parseInt(value)
							this.reflectionsPass.fullscreenMaterial.needsUpdate = needsUpdate
							break

						case "NUM_BINARY_SEARCH_STEPS":
							this.reflectionsPass.fullscreenMaterial.defines.NUM_BINARY_SEARCH_STEPS = parseInt(value)
							this.reflectionsPass.fullscreenMaterial.needsUpdate = needsUpdate
							break

						case "ALLOW_MISSED_RAYS":
							if (value) {
								this.reflectionsPass.fullscreenMaterial.defines.ALLOW_MISSED_RAYS = ""
							} else {
								delete this.reflectionsPass.fullscreenMaterial.defines.ALLOW_MISSED_RAYS
							}

							this.reflectionsPass.fullscreenMaterial.needsUpdate = needsUpdate
							break

						case "temporalResolve":
							const composeShader = value ? trCompose : accumulatedCompose
							let fragmentShader = temporalResolve

							// if we are not using temporal reprojection, then cut out the part that's doing the reprojection
							if (!value) {
								const removePart = fragmentShader.slice(
									fragmentShader.indexOf("// REPROJECT_START"),
									fragmentShader.indexOf("// REPROJECT_END") + "// REPROJECT_END".length
								)
								fragmentShader = temporalResolve.replace(removePart, "")
							}

							fragmentShader = fragmentShader.replace("#include <custom_compose_shader>", composeShader)

							fragmentShader =
								/* glsl */ `
							uniform float samples;
							uniform float temporalResolveMix;
							` + fragmentShader

							this.temporalResolvePass.fullscreenMaterial.fragmentShader = fragmentShader
							this.temporalResolvePass.fullscreenMaterial.needsUpdate = true
							break

						case "temporalResolveMix":
							this.temporalResolvePass.fullscreenMaterial.uniforms.temporalResolveMix.value = value
							break

						case "temporalResolveCorrection":
							this.temporalResolvePass.fullscreenMaterial.uniforms.temporalResolveCorrection.value = value
							break

						case "colorExponent":
							this.temporalResolvePass.fullscreenMaterial.uniforms.colorExponent.value = value
							break

						// must be a uniform
						default:
							if (reflectionPassFullscreenMaterialUniformsKeys.includes(key)) {
								reflectionPassFullscreenMaterialUniforms[key].value = value
							}
					}
				}
			})

			// apply all uniforms and defines
			this[key] = options[key]
		}

		needsUpdate = true
	}

	setSize(width, height, force = false) {
		if (
			!force &&
			width === this.#lastSize.width &&
			height === this.#lastSize.height &&
			this.resolutionScale === this.#lastSize.resolutionScale &&
			this.velocityResolutionScale === this.#lastSize.velocityResolutionScale
		)
			return

		this.temporalResolvePass.setSize(width, height)
		this.reflectionsPass.setSize(width, height)

		this.#lastSize = {
			width,
			height,
			resolutionScale: this.resolutionScale,
			velocityResolutionScale: this.velocityResolutionScale
		}
	}

	checkNeedsResample() {
		const moveDist = this.#lastCameraTransform.position.distanceToSquared(this._camera.position)
		const rotateDist = 8 * (1 - this.#lastCameraTransform.quaternion.dot(this._camera.quaternion))

		if (moveDist > 0.000001 || rotateDist > 0.000001) {
			this.samples = 1

			this.#lastCameraTransform.position.copy(this._camera.position)
			this.#lastCameraTransform.quaternion.copy(this._camera.quaternion)
		}
	}

	dispose() {
		super.dispose()

		this.reflectionsPass.dispose()
		this.temporalResolvePass.dispose()
	}

	update(renderer, inputBuffer) {
		this.samples++
		this.checkNeedsResample()

		// update uniforms
		this.uniforms.get("samples").value = this.samples

		// render reflections of current frame
		this.reflectionsPass.render(renderer, inputBuffer)

		// compose reflection of last and current frame into one reflection
		this.temporalResolvePass.fullscreenMaterial.uniforms.samples.value = this.samples
		this.temporalResolvePass.render(renderer)
	}
}
