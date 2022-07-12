import { Pass } from "postprocessing"
import { Quaternion, Vector2, Vector3 } from "three"
import { ComposeReflectionsPass } from "./ComposeReflectionsPass.js"
import { FinalSSRMaterial } from "./material/FinalSSRMaterial.js"
import { ReflectionsPass } from "./ReflectionsPass.js"

const zeroVec2 = new Vector2()

export const defaultSSROptions = {
	temporalResolve: true,
	temporalResolveMixSamples: 6,
	maxSamples: 0,
	staticNoise: false,
	width: typeof window !== "undefined" ? window.innerWidth : 2000,
	height: typeof window !== "undefined" ? window.innerHeight : 1000,
	ENABLE_BLUR: true,
	blurMix: 0.5,
	blurKernelSize: 8,
	blurSharpness: 0.5,
	rayStep: 0.1,
	intensity: 1,
	maxRoughness: 0.1,
	ENABLE_JITTERING: false,
	jitter: 0.1,
	jitterSpread: 0.1,
	jitterRough: 0.1,
	roughnessFadeOut: 1,
	rayFadeOut: 0,
	MAX_STEPS: 20,
	NUM_BINARY_SEARCH_STEPS: 5,
	maxDepthDifference: 3,
	maxDepth: 1,
	thickness: 10,
	ior: 1.45,
	STRETCH_MISSED_RAYS: true,
	USE_MRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}

// all the properties for which we don't have to resample
const noResetSamplesProperties = ["ENABLE_BLUR", "blurSharpness", "blurKernelSize", "blurMix"]

export class SSRPass extends Pass {
	#lastSize
	samples = 0
	#lastCameraTransform = {
		position: new Vector3(),
		quaternion: new Quaternion()
	}

	constructor(scene, camera, options = defaultSSROptions) {
		super("SSRPass")
		this._scene = scene
		this._camera = camera

		options = { ...defaultSSROptions, ...options }

		this.#lastSize = { width: options.width, height: options.height }
		this.#lastCameraTransform.position.copy(camera.position)
		this.#lastCameraTransform.quaternion.copy(camera.quaternion)

		// returns just the calculates reflections
		this.reflectionsPass = new ReflectionsPass(this, options)

		this.composeReflectionsPass = new ComposeReflectionsPass(this)

		this.fullscreenMaterial = new FinalSSRMaterial()
		this.fullscreenMaterial.uniforms.reflectionsTexture.value = this.composeReflectionsPass.renderTarget.texture

		this.composeReflectionsPass.fullscreenMaterial.uniforms.inputTexture.value =
			this.reflectionsPass.renderTarget.texture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.lastFrameReflectionsTexture.value =
			this.reflectionsPass.lastFrameReflectionsTexture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.velocityTexture.value = this.reflectionsPass.velocityTexture

		this.fullscreenMaterial.uniforms.depthTexture.value = this.reflectionsPass.depthTexture

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
					options[key] = value

					let resetSamples = true
					for (const prop of noResetSamplesProperties) {
						if (prop === key) {
							resetSamples = false
							break
						}
					}

					if (resetSamples) this.samples = 1

					switch (key) {
						case "width":
							this.setSize(value * dpr, options.height)
							this.fullscreenMaterial.uniforms.g_InvResolutionDirection.value.set(1 / (value * dpr), 1 / options.height)
							break

						case "height":
							this.setSize(options.width, value * dpr)
							this.fullscreenMaterial.uniforms.g_InvResolutionDirection.value.set(1 / options.width, 1 / (value * dpr))
							break

						case "blurMix":
							this.fullscreenMaterial.uniforms.blurMix.value = value
							break

						case "blurSharpness":
							this.fullscreenMaterial.uniforms.g_Sharpness.value = value
							break

						case "blurKernelSize":
							this.fullscreenMaterial.uniforms.kernelRadius.value = value
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

						case "ENABLE_JITTERING":
							if (value) {
								this.reflectionsPass.fullscreenMaterial.defines.ENABLE_JITTERING = ""
							} else {
								delete this.reflectionsPass.fullscreenMaterial.defines.ENABLE_JITTERING
							}

							this.reflectionsPass.fullscreenMaterial.needsUpdate = needsUpdate
							break

						case "ENABLE_BLUR":
							if (value) {
								this.fullscreenMaterial.defines.ENABLE_BLUR = ""
								this.reflectionsPass.fullscreenMaterial.defines.ENABLE_BLUR = ""
							} else {
								delete this.fullscreenMaterial.defines.ENABLE_BLUR
								delete this.reflectionsPass.fullscreenMaterial.defines.ENABLE_BLUR
							}

							this.fullscreenMaterial.needsUpdate = needsUpdate
							this.reflectionsPass.fullscreenMaterial.needsUpdate = needsUpdate
							break

						case "STRETCH_MISSED_RAYS":
							if (value) {
								this.reflectionsPass.fullscreenMaterial.defines.STRETCH_MISSED_RAYS = ""
							} else {
								delete this.reflectionsPass.fullscreenMaterial.defines.STRETCH_MISSED_RAYS
							}

							this.reflectionsPass.fullscreenMaterial.needsUpdate = needsUpdate
							break

						case "USE_NORMALMAP":
							break

						case "USE_ROUGHNESSMAP":
							break

						case "temporalResolve":
							if (value) {
								this.composeReflectionsPass.fullscreenMaterial.defines.TEMPORAL_RESOLVE = ""
							} else {
								delete this.composeReflectionsPass.fullscreenMaterial.defines.TEMPORAL_RESOLVE
							}

							this.composeReflectionsPass.fullscreenMaterial.needsUpdate = true
							break

						case "temporalResolveMixSamples":
							this.composeReflectionsPass.fullscreenMaterial.uniforms.temporalResolveMixSamples.value = value
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

	setSize(width, height) {
		if (width === this.#lastSize.width && height === this.#lastSize.height) return

		this.reflectionsPass.setSize(width, height)

		this.#lastSize = { width, height }
	}

	get reflectionUniforms() {
		return this.reflectionsPass.fullscreenMaterial.uniforms
	}

	render(renderer, inputTexture, outputBuffer) {
		this.samples = this.staticNoise ? 1 : this.samples + 1

		const moveDist = this.#lastCameraTransform.position.distanceToSquared(this._camera.position)
		const rotateDist = 8 * (1 - this.#lastCameraTransform.quaternion.dot(this._camera.quaternion))

		if (moveDist > 0.000001 || rotateDist > 0.000001) {
			this.samples = 1

			this.#lastCameraTransform.position.copy(this._camera.position)
			this.#lastCameraTransform.quaternion.copy(this._camera.quaternion)
		}

		if (this.maxSamples === 0 || this.samples <= this.maxSamples) {
			// render reflections of current frame
			this.reflectionsPass.render(renderer, inputTexture)

			// compose reflection of last and current frame into one reflection
			this.composeReflectionsPass.fullscreenMaterial.uniforms.samples.value = this.samples
			this.composeReflectionsPass.render(renderer)

			if (!this.staticNoise || this.temporalResolve) {
				// save reflections of this frame
				renderer.setRenderTarget(this.composeReflectionsPass.renderTarget)
				renderer.copyFramebufferToTexture(zeroVec2, this.reflectionsPass.lastFrameReflectionsTexture)
			}
		}

		this.fullscreenMaterial.uniforms.inputTexture.value = inputTexture.texture
		this.fullscreenMaterial.uniforms.samples.value = this.samples
		this.fullscreenMaterial.uniforms.cameraNear.value = this._camera.near
		this.fullscreenMaterial.uniforms.cameraFar.value = this._camera.far

		renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
		renderer.render(this.scene, this.camera)

		this.composeReflectionsPass.fullscreenMaterial.uniforms._lastProjectionMatrix.value.copy(
			this._camera.projectionMatrix
		)
		this.composeReflectionsPass.fullscreenMaterial.uniforms.lastCameraMatrixWorld.value.copy(this._camera.matrixWorld)
	}
}
