import { Effect, Selection } from "postprocessing"
import { CubeCamera, PMREMGenerator, Quaternion, Texture, Uniform, Vector3, WebGLCubeRenderTarget } from "three"
import accumulatedCompose from "./material/shader/accumulatedCompose.frag"
import boxBlur from "./material/shader/boxBlur.frag"
import finalSSRShader from "./material/shader/finalSSRShader.frag"
import helperFunctions from "./material/shader/helperFunctions.frag"
import trCompose from "./material/shader/trCompose.frag"
import { ReflectionsPass } from "./pass/ReflectionsPass.js"
import { defaultSSROptions } from "./SSROptions"
import { TemporalResolvePass } from "./temporal-resolve/pass/TemporalResolvePass.js"
import temporalResolve from "./temporal-resolve/shader/temporalResolve.frag"
import { useBoxProjectedEnvMap } from "./utils/useBoxProjectedEnvMap"
import { setupEnvMap } from "./utils/Utils"

const finalFragmentShader = finalSSRShader
	.replace("#include <helperFunctions>", helperFunctions)
	.replace("#include <boxBlur>", boxBlur)

// all the properties for which we don't have to resample
const noResetSamplesProperties = ["blurMix", "blurSharpness", "blurKernelSize"]

const defaultCubeRenderTarget = new WebGLCubeRenderTarget(1)
let pmremGenerator

export class SSREffect extends Effect {
	samples = 0
	selection = new Selection()
	lastSize
	lastCameraTransform = {
		position: new Vector3(),
		quaternion: new Quaternion()
	}
	cubeCamera = new CubeCamera(0.001, 1000, defaultCubeRenderTarget)

	/**
	 * @param {THREE.Scene} scene The scene of the SSR effect
	 * @param {THREE.Camera} camera The camera with which SSR is being rendered
	 * @param {SSROptions} [options] The optional options for the SSR effect
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
		this.usingBoxProjectedEnvMap = false

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

		this.lastSize = {
			width: options.width,
			height: options.height,
			resolutionScale: options.resolutionScale,
			velocityResolutionScale: options.velocityResolutionScale
		}

		this.lastCameraTransform.position.copy(camera.position)
		this.lastCameraTransform.quaternion.copy(camera.quaternion)

		this.setSize(options.width, options.height)

		this.makeOptionsReactive(options)
	}

	makeOptionsReactive(options) {
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
							this.setSize(options.width, options.height, true)
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

						case "CLAMP_RADIUS":
							this.temporalResolvePass.fullscreenMaterial.defines.CLAMP_RADIUS = Math.round(value)

							this.temporalResolvePass.fullscreenMaterial.needsUpdate = needsUpdate
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
			width === this.lastSize.width &&
			height === this.lastSize.height &&
			this.resolutionScale === this.lastSize.resolutionScale &&
			this.velocityResolutionScale === this.lastSize.velocityResolutionScale
		)
			return

		this.temporalResolvePass.setSize(width, height)
		this.reflectionsPass.setSize(width, height)

		this.lastSize = {
			width,
			height,
			resolutionScale: this.resolutionScale,
			velocityResolutionScale: this.velocityResolutionScale
		}
	}

	generateBoxProjectedEnvMapFallback(renderer, position = new Vector3(), size = new Vector3(), envMapSize = 512) {
		this.cubeCamera.renderTarget.dispose()
		this.cubeCamera.renderTarget = new WebGLCubeRenderTarget(envMapSize)

		this.cubeCamera.position.copy(position)
		this.cubeCamera.updateMatrixWorld()
		this.cubeCamera.update(renderer, this._scene)

		if (!pmremGenerator) {
			pmremGenerator = new PMREMGenerator(renderer)
			pmremGenerator.compileCubemapShader()
		}
		const envMap = pmremGenerator.fromCubemap(this.cubeCamera.renderTarget.texture).texture

		const reflectionsMaterial = this.reflectionsPass.fullscreenMaterial

		useBoxProjectedEnvMap(reflectionsMaterial, position, size)
		reflectionsMaterial.fragmentShader = reflectionsMaterial.fragmentShader
			.replace("vec3 worldPos", "worldPos")
			.replace("varying vec3 vWorldPosition;", "vec3 worldPos;")

		reflectionsMaterial.uniforms.envMapPosition.value.copy(position)
		reflectionsMaterial.uniforms.envMapSize.value.copy(size)

		setupEnvMap(reflectionsMaterial, envMap, envMapSize)

		this.usingBoxProjectedEnvMap = true

		return envMap
	}

	deleteeBoxProjectedEnvMapFallback() {
		const reflectionsMaterial = this.reflectionsPass.fullscreenMaterial
		reflectionsMaterial.uniforms.envMap.value = null
		reflectionsMaterial.fragmentShader = reflectionsMaterial.fragmentShader.replace("worldPos = ", "vec3 worldPos = ")
		delete reflectionsMaterial.defines.BOX_PROJECTED_ENV_MAP

		reflectionsMaterial.needsUpdate = true

		this.usingBoxProjectedEnvMap = false
	}

	checkNeedsResample() {
		const moveDist = this.lastCameraTransform.position.distanceToSquared(this._camera.position)
		const rotateDist = 8 * (1 - this.lastCameraTransform.quaternion.dot(this._camera.quaternion))

		if (moveDist > 0.000001 || rotateDist > 0.000001) {
			this.samples = 1

			this.lastCameraTransform.position.copy(this._camera.position)
			this.lastCameraTransform.quaternion.copy(this._camera.quaternion)
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

		if (!this.usingBoxProjectedEnvMap && this._scene.environment) {
			const reflectionsMaterial = this.reflectionsPass.fullscreenMaterial

			let envMap = null

			// not sure if there is a cleaner way to find the internal Texture of a CubeTexture (when used as scene environment)
			this._scene.traverse(c => {
				if (!envMap && c.material && !c.material.envMap) {
					const properties = renderer.properties.get(c.material)

					if ("envMap" in properties && properties.envMap instanceof Texture) envMap = properties.envMap
				}
			})

			if (envMap) {
				const envMapCubeUVHeight = this._scene.environment.image.height
				setupEnvMap(reflectionsMaterial, envMap, envMapCubeUVHeight)
			}
		}

		// update uniforms
		this.uniforms.get("samples").value = this.samples

		// render reflections of current frame
		this.reflectionsPass.render(renderer, inputBuffer)

		// compose reflection of last and current frame into one reflection
		this.temporalResolvePass.fullscreenMaterial.uniforms.samples.value = this.samples
		this.temporalResolvePass.render(renderer)
	}
}
