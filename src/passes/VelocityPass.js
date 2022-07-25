import { Pass } from "postprocessing"
import {
	Data3DTexture,
	FloatType,
	HalfFloatType,
	Matrix4,
	NearestFilter,
	RGBAFormat,
	ShaderMaterial,
	UniformsUtils,
	VideoTexture,
	WebGLRenderTarget
} from "three"
import { VelocityShader } from "../material/VelocityShader.js"

export class VelocityPass extends Pass {
	#cachedMaterials = new WeakMap()
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
				const originalMaterial = c.material

				let [cachedOriginalMaterial, velocityMaterial] = this.#cachedMaterials.get(c) || []

				if (!this.#cachedMaterials.has(c) || originalMaterial !== cachedOriginalMaterial) {
					if (velocityMaterial) velocityMaterial.dispose()

					velocityMaterial = new ShaderMaterial({
						uniforms: UniformsUtils.clone(VelocityShader.uniforms),
						vertexShader: VelocityShader.vertexShader,
						fragmentShader: VelocityShader.fragmentShader,
						type: "VelocityMaterial"
					})

					velocityMaterial.uniforms.prevProjectionMatrix.value = this.#prevProjectionMatrix

					this.#cachedMaterials.set(c, [originalMaterial, velocityMaterial])
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

				if (c.skeleton) {
					velocityMaterial.defines.USE_SKINNING = ""
					velocityMaterial.defines.BONE_TEXTURE = ""

					this.#updateBoneTexture(velocityMaterial, c.skeleton, "boneTexture", "boneMatrices")
				}

				c.material = velocityMaterial
			}
		})
	}

	#updateBoneTexture(material, skeleton, uniformName, boneMatricesName) {
		let boneMatrices = material[boneMatricesName]

		if (material[boneMatricesName]?.length !== skeleton.boneMatrices.length) {
			delete material[boneMatricesName]
			boneMatrices = new Float32Array(skeleton.boneMatrices.length)
			material[boneMatricesName] = boneMatrices
		}

		material[boneMatricesName].set(skeleton.boneMatrices)

		const size = Math.sqrt(skeleton.boneMatrices.length / 4)
		const boneTexture = new Data3DTexture(boneMatrices, size, size, RGBAFormat, FloatType)
		boneTexture.needsUpdate = true

		if (material.uniforms[uniformName].value) material.uniforms[uniformName].value.dispose()
		material.uniforms[uniformName].value = boneTexture
	}

	#unsetVelocityMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material?.type === "VelocityMaterial") {
				c.material.uniforms.prevModelViewMatrix.value.copy(c.modelViewMatrix)

				if (c.skeleton) this.#updateBoneTexture(c.material, c.skeleton, "prevBoneTexture", "prevBoneMatrices")

				// set material back to the original one
				const [originalMaterial] = this.#cachedMaterials.get(c)

				c.material = originalMaterial
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
