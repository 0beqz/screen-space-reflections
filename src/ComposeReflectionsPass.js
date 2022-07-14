import { Pass } from "postprocessing"
import { NearestFilter, ShaderMaterial, Uniform, WebGLRenderTarget } from "three"
import vertexShader from "./material/shader/basicVertexShader.vert"
import fragmentShader from "./material/shader/composeReflectionsShader.frag"

export class ComposeReflectionsPass extends Pass {
	constructor() {
		super("ComposeReflectionsPass")

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
				temporalResolveMix: new Uniform(6)
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
		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
