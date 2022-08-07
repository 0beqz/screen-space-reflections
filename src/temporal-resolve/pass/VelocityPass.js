import { Pass } from "postprocessing"
import {
	Color,
	DataTexture,
	FloatType,
	HalfFloatType,
	LinearFilter,
	Matrix4,
	RGBAFormat,
	VideoTexture,
	WebGLRenderTarget
} from "three"
import { getVisibleChildren } from "../utils/Utils.js"
import { MeshVelocityMaterial } from "../material/MeshVelocityMaterial.js"

const backgroundColor = new Color(0)
const updateProperties = ["visible", "wireframe", "side"]
const tmpMatrix4 = new Matrix4()

export class VelocityPass extends Pass {
	#cachedMaterials = new WeakMap()
	visibleMeshes = []
	renderedMeshesThisFrame = 0
	renderedMeshesLastFrame = 0

	constructor(scene, camera) {
		super("VelocityPass")

		this._scene = scene
		this._camera = camera

		this.renderTarget = new WebGLRenderTarget(window?.innerWidth || 1000, window?.innerHeight || 1000, {
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			type: HalfFloatType
		})
	}

	#setVelocityMaterialInScene() {
		this.renderedMeshesThisFrame = 0

		this.visibleMeshes = getVisibleChildren(this._scene)

		for (const c of this.visibleMeshes) {
			const originalMaterial = c.material

			let [cachedOriginalMaterial, velocityMaterial] = this.#cachedMaterials.get(c) || []

			if (originalMaterial !== cachedOriginalMaterial) {
				velocityMaterial = new MeshVelocityMaterial()

				if (c.skeleton?.boneTexture) this.#saveBoneTexture(c)

				this.#cachedMaterials.set(c, [originalMaterial, velocityMaterial])
			}

			tmpMatrix4.copy(velocityMaterial.uniforms.velocityMatrix.value)

			velocityMaterial.uniforms.velocityMatrix.value.multiplyMatrices(this._camera.projectionMatrix, c.modelViewMatrix)

			c.visible = c.skeleton || !tmpMatrix4.equals(velocityMaterial.uniforms.velocityMatrix.value)

			c.material = velocityMaterial

			if (!c.visible) continue

			this.renderedMeshesThisFrame++

			for (const prop of updateProperties) velocityMaterial[prop] = originalMaterial[prop]

			if (c.userData.needsUpdatedReflections || c.material.map instanceof VideoTexture) {
				if (!("NEEDS_UPDATED_REFLECTIONS" in velocityMaterial.defines)) velocityMaterial.needsUpdate = true
				velocityMaterial.defines.NEEDS_UPDATED_REFLECTIONS = ""
			} else {
				if ("NEEDS_UPDATED_REFLECTIONS" in velocityMaterial.defines) velocityMaterial.needsUpdate = true
			}

			if (c.skeleton?.boneTexture) {
				velocityMaterial.defines.USE_SKINNING = ""
				velocityMaterial.defines.BONE_TEXTURE = ""

				velocityMaterial.uniforms.boneTexture.value = c.skeleton.boneTexture
			}
		}
	}

	#saveBoneTexture(object) {
		let boneTexture = object.material.uniforms.prevBoneTexture.value

		if (boneTexture && boneTexture.image.width === object.skeleton.boneTexture.width) {
			boneTexture = object.material.uniforms.prevBoneTexture.value
			boneTexture.image.data.set(object.skeleton.boneTexture.image.data)
		} else {
			boneTexture?.dispose()

			const boneMatrices = object.skeleton.boneTexture.image.data.slice()
			const size = object.skeleton.boneTexture.image.width

			boneTexture = new DataTexture(boneMatrices, size, size, RGBAFormat, FloatType)
			object.material.uniforms.prevBoneTexture.value = boneTexture

			boneTexture.needsUpdate = true
		}
	}

	#unsetVelocityMaterialInScene() {
		for (const c of this.visibleMeshes) {
			if (c.material.isMeshVelocityMaterial) {
				c.visible = true

				c.material.uniforms.prevVelocityMatrix.value.multiplyMatrices(this._camera.projectionMatrix, c.modelViewMatrix)

				if (c.skeleton?.boneTexture) this.#saveBoneTexture(c)

				c.material = this.#cachedMaterials.get(c)[0]
			}
		}
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)
	}

	renderVelocity(renderer) {
		renderer.setRenderTarget(this.renderTarget)

		if (this.renderedMeshesThisFrame > 0) {
			const { background } = this._scene

			this._scene.background = backgroundColor

			renderer.render(this._scene, this._camera)

			this._scene.background = background
		} else {
			renderer.clearColor()
		}
	}

	render(renderer) {
		this.#setVelocityMaterialInScene()

		if (this.renderedMeshesThisFrame > 0 || this.renderedMeshesLastFrame > 0) this.renderVelocity(renderer)

		this.#unsetVelocityMaterialInScene()

		this.renderedMeshesLastFrame = this.renderedMeshesThisFrame
	}
}
