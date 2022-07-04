import { KawaseBlurPass, KernelSize, Pass } from "postprocessing"
import { LinearFilter, Vector2, WebGLRenderTarget } from "three"
import { ComposeReflectionsPass } from "./ComposeReflectionsPass.js"
import { SSRCompositeMaterial } from "./material/SSRCompositeMaterial.js"
import { ReflectionsPass } from "./ReflectionsPass.js"

const zeroVec2 = new Vector2()

export const defaultSSROptions = {
	width: window.innerWidth,
	height: window.innerHeight,
	ENABLE_BLUR: true,
	blurKernelSize: KernelSize.SMALL,
	blurWidth: window.innerWidth,
	blurHeight: window.innerHeight,
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
	STRETCH_MISSED_RAYS: false,
	useMRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}

const noClearLastFrameReflectionsTextureOptions = [
	"ENABLE_BLUR",
	"blurKernelSize",
	"blurWidth",
	"blurHeight",
	"depthBlur"
]

export class SSRPass extends Pass {
	#lastSize
	needsClearLastFrameReflectionsTexture = false

	constructor(scene, camera, options = defaultSSROptions) {
		super("SSRPass")
		this._scene = scene
		this._camera = camera

		options = { ...defaultSSROptions, ...options }

		this.#lastSize = { width: options.width, height: options.height }

		this.fullscreenMaterial = new SSRCompositeMaterial()

		// returns just the calculates reflections
		this.reflectionsPass = new ReflectionsPass(this, options)

		this.composeReflectionsPass = new ComposeReflectionsPass(scene, camera)

		this.reflectionsPass.setSize(options.width, options.height)

		if (options.ENABLE_BLUR) {
			this.fullscreenMaterial.defines.USE_BLUR = ""
			this.reflectionsPass.fullscreenMaterial.defines.USE_BLUR = ""
		}

		// used to smooth out reflections by blurring them (more blur the longer the ray is)
		this.kawaseBlurPass = new KawaseBlurPass()
		this.kawaseBlurPass.kernelSize = options.blurKernelSize

		const parameters = {
			minFilter: LinearFilter,
			magFilter: LinearFilter
		}

		this.kawaseBlurPassRenderTarget = new WebGLRenderTarget(options.blurWidth, options.blurHeight, parameters)

		this.temporalResolve = options.temporalResolve === true
		if (this.temporalResolve) this.composeReflectionsPass.fullscreenMaterial.defines.TEMPORAL_RESOLVE = ""

		this.#makeOptionsReactive(options)
	}

	#makeOptionsReactive(options) {
		const ssrPass = this
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

					if (!noClearLastFrameReflectionsTextureOptions.includes(key)) {
						ssrPass.needsClearLastFrameReflectionsTexture = true
					}

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
		// render reflections of current frame
		this.reflectionsPass.render(renderer, inputBuffer, this.reflectionsPass.renderTarget)

		const { samples } = this.reflectionsPass

		// compose reflection of last and current frame into one reflection
		this.composeReflectionsPass.fullscreenMaterial.uniforms.inputBuffer.value =
			this.reflectionsPass.renderTarget.texture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.lastFrameReflectionsBuffer.value =
			this.reflectionsPass.lastFrameReflectionsTexture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.velocityBuffer.value = this.reflectionsPass.velocityTexture
		this.composeReflectionsPass.fullscreenMaterial.uniforms.samples.value = samples

		this.composeReflectionsPass.render(renderer, this.reflectionsPass.renderTarget, this.composeRenderTarget)

		// save reflections of this frame
		renderer.setRenderTarget(this.composeReflectionsPass.renderTarget)
		if (this.needsClearLastFrameReflectionsTexture) {
			renderer.clearColor()
			this.needsClearLastFrameReflectionsTexture = false
		}

		renderer.copyFramebufferToTexture(zeroVec2, this.reflectionsPass.lastFrameReflectionsTexture)

		if (this.ENABLE_BLUR) {
			renderer.setRenderTarget(this.kawaseBlurPassRenderTarget)
			this.kawaseBlurPass.render(renderer, this.composeReflectionsPass.renderTarget, this.kawaseBlurPassRenderTarget)
		}

		const blurredReflectionsBuffer = this.ENABLE_BLUR ? this.kawaseBlurPassRenderTarget.texture : null

		this.fullscreenMaterial.uniforms.inputBuffer.value = inputBuffer.texture
		this.fullscreenMaterial.uniforms.reflectionsBuffer.value = this.composeReflectionsPass.renderTarget.texture
		this.fullscreenMaterial.uniforms.blurredReflectionsBuffer.value = blurredReflectionsBuffer
		this.fullscreenMaterial.uniforms.samples.value = samples

		renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
		renderer.render(this.scene, this.camera)
	}
}
