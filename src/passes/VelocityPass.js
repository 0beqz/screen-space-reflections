import { Pass } from "postprocessing"
import { VideoTexture } from "three"
import {
	FrontSide,
	HalfFloatType,
	Matrix4,
	NearestFilter,
	ShaderMaterial,
	UniformsUtils,
	WebGLRenderTarget
} from "three"
import { VelocityShader } from "../material/VelocityShader.js"

export class VelocityPass extends Pass {
	#defaultMaterials = {}
	#velocityMaterials = {}
	#prevProjectionMatrix = new Matrix4()

	constructor(scene, camera) {
		super("VelocityPass")

		this._scene = scene
		this._camera = camera

		this.renderTarget = new WebGLRenderTarget(
			typeof window !== "undefined" ? window.innerWidth : 2000,
			typeof window !== "undefined" ? window.innerHeight : 1000,
			{
				minFilter: NearestFilter,
				magFilter: NearestFilter,
				type: HalfFloatType
			}
		)
	}

	#setVelocityMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material) {
				const origMat = c.material
				this.#defaultMaterials[c.material.uuid] = origMat

				if (this.#velocityMaterials[origMat.uuid] === undefined) {
					this.#velocityMaterials[origMat.uuid] = new ShaderMaterial({
						uniforms: UniformsUtils.clone(VelocityShader.uniforms),
						vertexShader: VelocityShader.vertexShader,
						fragmentShader: VelocityShader.fragmentShader,
						side: FrontSide
					})

					const velocityMaterial = this.#velocityMaterials[origMat.uuid]
					velocityMaterial._originalUuid = c.material.uuid
					velocityMaterial.extensions.derivatives = true
				}

				const velocityMaterial = this.#velocityMaterials[c.material.uuid]

				velocityMaterial.uniforms.prevModelViewMatrix.value.multiplyMatrices(
					this._camera.matrixWorldInverse,
					c.matrixWorld
				)
				velocityMaterial.uniforms.prevProjectionMatrix.value = this.#prevProjectionMatrix

				if (c.userData.prevModelViewMatrix) {
					velocityMaterial.uniforms.prevModelViewMatrix.value.copy(c.userData.prevModelViewMatrix)
				}

				const needsUpdatedReflections =
					c.material.userData.needsUpdatedReflections || c.material.map instanceof VideoTexture

				// mark the material as "ANIMATED" so that, when using temporal resolve, we get updated reflections
				if (needsUpdatedReflections && !Object.keys(velocityMaterial.defines).includes("NEEDS_UPDATED_REFLECTIONS")) {
					velocityMaterial.defines.NEEDS_UPDATED_REFLECTIONS = ""
					velocityMaterial.needsUpdate = true
				} else if (
					!needsUpdatedReflections &&
					Object.keys(velocityMaterial.defines).includes("NEEDS_UPDATED_REFLECTIONS")
				) {
					delete velocityMaterial.defines.NEEDS_UPDATED_REFLECTIONS
					velocityMaterial.needsUpdate = true
				}

				c.material = velocityMaterial
			}
		})
	}

	#unsetVelocityMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material) {
				if (c.userData.prevModelViewMatrix === undefined) c.userData.prevModelViewMatrix = new Matrix4()

				c.userData.prevModelViewMatrix.multiplyMatrices(this._camera.matrixWorldInverse, c.matrixWorld)

				c.material = this.#defaultMaterials[c.material._originalUuid]
			}
		})
	}

	render(renderer) {
		this.#setVelocityMaterialInScene()

		renderer.setRenderTarget(this.renderTarget)
		renderer.clear()
		renderer.render(this._scene, this._camera)

		this.#unsetVelocityMaterialInScene()

		this.#prevProjectionMatrix.copy(this._camera.projectionMatrix)
	}
}
