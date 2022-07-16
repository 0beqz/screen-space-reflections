import { Pass } from "postprocessing"
import { NearestFilter, ShaderMaterial, Uniform, WebGLRenderTarget } from "three"
import vertexShader from "./material/shader/basicVertexShader.vert"
import fragmentShader from "./material/shader/composeReflectionsShader.frag"

export class ComposeReflectionsPass extends Pass {
	constructor(ssrEffect) {
		super("ComposeReflectionsPass")

		this.ssrEffect = ssrEffect

		this.renderTarget = new WebGLRenderTarget(
			typeof window !== "undefined" ? window.innerWidth : 2000,
			typeof window !== "undefined" ? window.innerHeight : 1000,
			{
				minFilter: NearestFilter,
				magFilter: NearestFilter
			}
		)

		this.fullscreenMaterial = new ShaderMaterial({
			type: "ComposeReflectionsMaterial",
			uniforms: {
				inputTexture: new Uniform(null),
				lastFrameReflectionsTexture: new Uniform(null),
				velocityTexture: new Uniform(null),
				samples: new Uniform(1),
				maxSamples: new Uniform(0),
				temporalResolveMix: new Uniform(0.9),
				temporalResolveCorrectionMix: new Uniform(0.3875)
			},
			vertexShader,
			fragmentShader
		})
	}

	dispose() {
		this.renderTarget.dispose()

		this.fullscreenMaterial.dispose()
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)
	}

	render(renderer) {
		this.fullscreenMaterial.uniforms.samples.value = this.ssrEffect.samples

		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
