import { Pass } from "postprocessing"
import { Matrix4, NearestFilter, ShaderMaterial, Uniform, WebGLRenderTarget } from "three"
import vertexShader from "./material/shader/basicVertexShader.vert"
import fragmentShader from "./material/shader/composeReflectionsShader.frag"

export class ComposeReflectionsPass extends Pass {
	constructor(ssrPass) {
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
				_projectionMatrix: new Uniform(new Matrix4()),
				_lastProjectionMatrix: new Uniform(new Matrix4()),
				cameraMatrixWorld: new Uniform(new Matrix4()),
				lastCameraMatrixWorld: new Uniform(new Matrix4()),
				samples: new Uniform(1),
				temporalResolveMixSamples: new Uniform(6)
			},
			vertexShader,
			fragmentShader
		})

		this.fullscreenMaterial.uniforms._projectionMatrix.value = ssrPass._camera.projectionMatrix
		this.fullscreenMaterial.uniforms.cameraMatrixWorld.value = ssrPass._camera.matrixWorld
	}

	render(renderer) {
		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
