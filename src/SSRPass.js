import { KawaseBlurPass, KernelSize, Pass } from "postprocessing"
import {
	FramebufferTexture,
	LinearFilter,
	NearestFilter,
	Quaternion,
	RGBAFormat,
	Vector2,
	Vector3,
	WebGLRenderTarget
} from "three"
import { ComposeReflectionsPass } from "./ComposeReflectionsPass.js"
import { SSRCompositeMaterial } from "./material/SSRCompositeMaterial.js"
import { ReflectionsPass } from "./ReflectionsPass.js"

const zeroVec2 = new Vector2()

export const defaultSSROptions = {
	temporalResolve: true,
	staticNoise: false,
	width: typeof window !== "undefined" ? window.innerWidth : 2000,
	height: typeof window !== "undefined" ? window.innerHeight : 1000,
	ENABLE_BLUR: true,
	blurKernelSize: KernelSize.SMALL,
	blurWidth: typeof window !== "undefined" ? window.innerWidth : 2000,
	blurHeight: typeof window !== "undefined" ? window.innerHeight : 1000,
	rayStep: 0.1,
	intensity: 1,
	depthBlur: 0.1,
	maxBlur: 1,
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
	useMRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}

const noResetSamplesProperties = ["ENABLE_BLUR", "blurKernelSize", "blurWidth", "blurHeight", "depthBlur"]

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
		this.reflectionsPass.setSize(options.width, options.height)

		this.composeReflectionsPass = new ComposeReflectionsPass(scene, camera)

		this.fullscreenMaterial = new SSRCompositeMaterial()
		this.fullscreenMaterial.uniforms.reflectionsBuffer.value = this.composeReflectionsPass.renderTarget.texture

		this.composeReflectionsPass.fullscreenMaterial.uniforms.inputBuffer.value =
			this.reflectionsPass.renderTarget.texture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.lastFrameReflectionsBuffer.value =
			this.reflectionsPass.lastFrameReflectionsTexture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.depthBuffer.value = this.reflectionsPass.depthTexture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.velocityBuffer.value = this.reflectionsPass.velocityTexture

		// used to smooth out reflections by blurring them (more blur the longer the ray is)
		this.kawaseBlurPass = new KawaseBlurPass()
		this.kawaseBlurPass.kernelSize = options.blurKernelSize

		const parameters = {
			minFilter: LinearFilter,
			magFilter: LinearFilter
		}

		this.kawaseBlurPassRenderTarget = new WebGLRenderTarget(options.blurWidth, options.blurHeight, parameters)

		this.lastFrameDepthTexture = new FramebufferTexture(options.width, options.height, RGBAFormat)

		this.lastFrameDepthRenderTarget = new WebGLRenderTarget(options.width, options.height, {
			minFilter: NearestFilter,
			magFilter: NearestFilter
		})
		this.lastFrameDepthRenderTarget.texture = this.reflectionsPass.depthTexture

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
							break

						case "height":
							this.setSize(options.width, value * dpr)
							break

						case "blurHeight":
							this.kawaseBlurPass.setSize(options.blurWidth, value * dpr)
							break

						case "blurWidth":
							this.kawaseBlurPass.setSize(value * dpr, options.blurHeight)
							break

						case "blurHeight":
							this.kawaseBlurPass.setSize(this.kawaseBlurPass.resolution.base.x, value * dpr)
							break

						case "blurKernelSize":
							this.kawaseBlurPass.kernelSize = value
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
								this.reflectionsPass.fullscreenMaterial.defines.ENABLE_BLUR = ""
							} else {
								delete this.reflectionsPass.fullscreenMaterial.defines.ENABLE_BLUR
							}

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

	render(renderer, inputBuffer, outputBuffer) {
		if (this.staticNoise) {
			this.samples = 1
		} else {
			this.samples++
		}

		const moveDist = this.#lastCameraTransform.position.distanceToSquared(this._camera.position)
		const rotateDist = 8 * (1 - this.#lastCameraTransform.quaternion.dot(this._camera.quaternion))

		if (moveDist > 0.000001 || rotateDist > 0.000001) {
			this.samples = 3

			this.#lastCameraTransform.position.copy(this._camera.position)
			this.#lastCameraTransform.quaternion.copy(this._camera.quaternion)
		}

		// render reflections of current frame
		this.reflectionsPass.render(renderer, inputBuffer, this.reflectionsPass.renderTarget)

		// compose reflection of last and current frame into one reflection
		this.composeReflectionsPass.fullscreenMaterial.uniforms.samples.value = this.samples
		this.composeReflectionsPass.fullscreenMaterial.uniforms.depthBuffer.value = this.reflectionsPass.depthTexture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.lastFrameDepthBuffer.value = this.lastFrameDepthTexture

		this.composeReflectionsPass.render(renderer, this.reflectionsPass.renderTarget, this.composeRenderTarget)

		// save reflections of this frame
		renderer.setRenderTarget(this.composeReflectionsPass.renderTarget)
		renderer.copyFramebufferToTexture(zeroVec2, this.reflectionsPass.lastFrameReflectionsTexture)

		// save depth of this frame
		renderer.setRenderTarget(this.lastFrameDepthRenderTarget)
		renderer.copyFramebufferToTexture(zeroVec2, this.lastFrameDepthTexture)

		if (this.ENABLE_BLUR) {
			renderer.setRenderTarget(this.kawaseBlurPassRenderTarget)
			this.kawaseBlurPass.render(renderer, this.composeReflectionsPass.renderTarget, this.kawaseBlurPassRenderTarget)
		}

		const blurredReflectionsBuffer = this.ENABLE_BLUR ? this.kawaseBlurPassRenderTarget.texture : null

		this.fullscreenMaterial.uniforms.inputBuffer.value = inputBuffer.texture
		this.fullscreenMaterial.uniforms.blurredReflectionsBuffer.value = blurredReflectionsBuffer
		this.fullscreenMaterial.uniforms.samples.value = this.samples

		renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
		renderer.render(this.scene, this.camera)

		this.composeReflectionsPass.fullscreenMaterial.uniforms._lastProjectionMatrix.value.copy(
			this._camera.projectionMatrix
		)
		this.composeReflectionsPass.fullscreenMaterial.uniforms.lastCameraMatrixWorld.value.copy(this._camera.matrixWorld)
	}
}
