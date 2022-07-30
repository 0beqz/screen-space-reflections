import { Pass } from "postprocessing"
import {
	FrontSide,
	HalfFloatType,
	NearestFilter,
	ShaderMaterial,
	UniformsUtils,
	VideoTexture,
	WebGLRenderTarget
} from "three"
import { VelocityShader } from "../shader/VelocityShader.js"

export class VelocityPass extends Pass {
	#cachedMaterials = new WeakMap()

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
					velocityMaterial = new ShaderMaterial({
						uniforms: UniformsUtils.clone(VelocityShader.uniforms),
						vertexShader: VelocityShader.vertexShader,
						fragmentShader: VelocityShader.fragmentShader,
						side: FrontSide
					})

					this.#cachedMaterials.set(c, [originalMaterial, velocityMaterial])
				}

				const needsUpdatedReflections =
					c.material.userData.needsUpdatedReflections || c.material.map instanceof VideoTexture

				// mark the material as "ANIMATED" so that, when using temporal resolve, we get updated reflections
				if (needsUpdatedReflections && !Object.keys(velocityMaterial.defines).includes("NEEDS_FULL_MOVEMENT")) {
					velocityMaterial.defines.NEEDS_FULL_MOVEMENT = ""
					velocityMaterial.needsUpdate = true
				} else if (!needsUpdatedReflections && Object.keys(velocityMaterial.defines).includes("NEEDS_FULL_MOVEMENT")) {
					delete velocityMaterial.defines.NEEDS_FULL_MOVEMENT
					velocityMaterial.needsUpdate = true
				}

				velocityMaterial.uniforms.velocityMatrix.value.multiplyMatrices(
					this._camera.projectionMatrix,
					c.modelViewMatrix
				)

				c.material = velocityMaterial
			}
		})
	}

	#unsetVelocityMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material) {
				c.material.uniforms.prevVelocityMatrix.value.multiplyMatrices(this._camera.projectionMatrix, c.modelViewMatrix)

				const [originalMaterial] = this.#cachedMaterials.get(c)

				c.material = originalMaterial
			}
		})
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)
	}

	render(renderer) {
		this.#setVelocityMaterialInScene()

		renderer.setRenderTarget(this.renderTarget)
		renderer.clear()
		renderer.render(this._scene, this._camera)

		this.#unsetVelocityMaterialInScene()
	}
}
