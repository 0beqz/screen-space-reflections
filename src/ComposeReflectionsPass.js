import { Pass } from "postprocessing"
import { WebGLRenderTarget } from "three"
import { NearestFilter } from "three"
import { Matrix4 } from "three"
import { Uniform } from "three"
import { ShaderMaterial } from "three"
import vertexShader from "./material/shader/basicVertexShader.vert"
import fragmentShader from "./material/shader/composeReflectionsShader.frag"

export class ComposeReflectionsPass extends Pass {
	constructor(scene, camera) {
		super("ReflectionsPass")

		this._scene = scene
		this._camera = camera

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
				inputBuffer: new Uniform(null),
				lastFrameReflectionsBuffer: new Uniform(null),
				depthBuffer: new Uniform(null),
				lastFrameDepthBuffer: new Uniform(null),
				velocityBuffer: new Uniform(null),
				_projectionMatrix: new Uniform(new Matrix4()),
				_lastProjectionMatrix: new Uniform(new Matrix4()),
				cameraMatrixWorld: new Uniform(new Matrix4()),
				lastCameraMatrixWorld: new Uniform(new Matrix4()),
				samples: new Uniform(1)
			},
			vertexShader,
			fragmentShader
		})

		this.fullscreenMaterial.uniforms._projectionMatrix.value = camera.projectionMatrix
		this.fullscreenMaterial.uniforms.cameraMatrixWorld.value = camera.matrixWorld
	}

	render(renderer) {
		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
