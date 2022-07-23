import { Pass } from "postprocessing"
import { RGBAFormat } from "three"
import { NearestFilter, ShaderMaterial, Uniform, Vector2, WebGLRenderTarget, FramebufferTexture } from "three"
import vertexShader from "./material/shader/basicVertexShader.vert"
import fragmentShader from "./material/shader/composeReflectionsShader.frag"

const zeroVec2 = new Vector2()

export class ComposeReflectionsPass extends Pass {
	#ssrEffect

	constructor(ssrEffect, options = {}) {
		super("ComposeReflectionsPass")

		this.#ssrEffect = ssrEffect

		const width = options.width || typeof window !== "undefined" ? window.innerWidth : 2000
		const height = options.height || typeof window !== "undefined" ? window.innerHeight : 1000

		this.renderTarget = new WebGLRenderTarget(width, height, {
			minFilter: NearestFilter,
			magFilter: NearestFilter
		})

		this.fullscreenMaterial = new ShaderMaterial({
			type: "ComposeReflectionsMaterial",
			uniforms: {
				inputTexture: new Uniform(null),
				accumulatedReflectionsTexture: new Uniform(null),
				velocityTexture: new Uniform(null),
				samples: new Uniform(0),
				maxSamples: new Uniform(0),
				temporalResolveMix: new Uniform(0),
				temporalResolveCorrectionMix: new Uniform(0)
			},
			vertexShader,
			fragmentShader
		})

		this.setupAccumulatedReflectionsTexture(width, height)
	}

	dispose() {
		this.renderTarget.dispose()
		this.accumulatedReflectionsTexture.dispose()
		this.fullscreenMaterial.dispose()
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)

		this.accumulatedReflectionsTexture.dispose()
		this.setupAccumulatedReflectionsTexture(width, height)

		this.fullscreenMaterial.uniforms.accumulatedReflectionsTexture.value = this.accumulatedReflectionsTexture

		this.fullscreenMaterial.needsUpdate = true
	}

	setupAccumulatedReflectionsTexture(width, height) {
		this.accumulatedReflectionsTexture = new FramebufferTexture(width, height, RGBAFormat)
		this.accumulatedReflectionsTexture.minFilter = NearestFilter
		this.accumulatedReflectionsTexture.magFilter = NearestFilter
	}

	render(renderer) {
		this.fullscreenMaterial.uniforms.samples.value = this.#ssrEffect.samples

		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)

		// save the render target's texture for use in next frame
		renderer.copyFramebufferToTexture(zeroVec2, this.accumulatedReflectionsTexture)
	}
}
