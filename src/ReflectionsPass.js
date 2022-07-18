import { DepthPass, Pass, RenderPass } from "postprocessing"
import {
	FramebufferTexture,
	HalfFloatType,
	NearestFilter,
	RGBAFormat,
	VideoTexture,
	WebGLMultipleRenderTargets,
	WebGLRenderTarget
} from "three"
import { NormalDepthRoughnessMaterial } from "./material/NormalDepthRoughnessMaterial.js"
import { ReflectionsMaterial } from "./material/ReflectionsMaterial.js"
import { VelocityPass } from "./passes/VelocityPass.js"

// from https://github.com/mrdoob/three.js/blob/dev/examples/jsm/capabilities/WebGL.js#L18
const isWebGL2Available = () => {
	try {
		const canvas = document.createElement("canvas")
		console.log("yes")
		return !!(window.WebGL2RenderingContext && canvas.getContext("webgl2"))
	} catch (e) {
		return false
	}
}

export class ReflectionsPass extends Pass {
	#defaultMaterials = {}
	#normalDepthMaterials = {}
	#USE_MRT = false
	#webgl1DepthPass = null
	#webgl1VelocityPass = null
	samples = 1

	constructor(ssrPass, options = {}) {
		super("ReflectionsPass")

		this.ssrPass = ssrPass
		this._scene = ssrPass._scene
		this._camera = ssrPass._camera

		this.fullscreenMaterial = new ReflectionsMaterial()

		const width = options.width || typeof window !== "undefined" ? window.innerWidth : 2000
		const height = options.height || typeof window !== "undefined" ? window.innerHeight : 1000

		this.renderTarget = new WebGLRenderTarget(width, height, {
			minFilter: NearestFilter,
			magFilter: NearestFilter
		})

		this.renderPass = new RenderPass(this._scene, this._camera)

		this.#USE_MRT = options.USE_MRT && isWebGL2Available()

		if (this.#USE_MRT) {
			// buffers: normal, depth (2), roughness will be written to the alpha channel of the normal buffer
			this.gBuffersRenderTarget = new WebGLMultipleRenderTargets(width, height, 3, {
				minFilter: NearestFilter,
				magFilter: NearestFilter,
				type: HalfFloatType
			})

			this.normalTexture = this.gBuffersRenderTarget.texture[0]
			this.depthTexture = this.gBuffersRenderTarget.texture[1]
			this.velocityTexture = this.gBuffersRenderTarget.texture[2]
		} else {
			// depth pass
			this.#webgl1DepthPass = new DepthPass(this._scene, this._camera)
			this.#webgl1DepthPass.renderTarget.minFilter = NearestFilter
			this.#webgl1DepthPass.renderTarget.magFilter = NearestFilter
			this.#webgl1DepthPass.renderTarget.generateMipmaps = true

			this.#webgl1DepthPass.renderTarget.texture.minFilter = NearestFilter
			this.#webgl1DepthPass.renderTarget.texture.magFilter = NearestFilter
			this.#webgl1DepthPass.renderTarget.texture.generateMipmaps = true

			this.#webgl1DepthPass.setSize(
				typeof window !== "undefined" ? window.innerWidth : 2000,
				typeof window !== "undefined" ? window.innerHeight : 1000
			)

			// render normals (in the rgb channel) and roughness (in the alpha channel) in gBuffersRenderTarget
			this.gBuffersRenderTarget = new WebGLRenderTarget(width, height, {
				minFilter: NearestFilter,
				magFilter: NearestFilter
			})

			this.normalTexture = this.gBuffersRenderTarget.texture
			this.depthTexture = this.#webgl1DepthPass.texture

			this.#webgl1VelocityPass = new VelocityPass(this._scene, this._camera)
			this.velocityTexture = this.#webgl1VelocityPass.renderTarget.texture
		}

		this.lastFrameReflectionsTexture = new FramebufferTexture(width, height, RGBAFormat)
		this.lastFrameReflectionsTexture.minFilter = NearestFilter
		this.lastFrameReflectionsTexture.magFilter = NearestFilter

		this.fullscreenMaterial.uniforms.normalTexture.value = this.normalTexture
		this.fullscreenMaterial.uniforms.depthTexture.value = this.depthTexture
		this.fullscreenMaterial.uniforms.lastFrameReflectionsTexture.value = this.lastFrameReflectionsTexture
		this.fullscreenMaterial.uniforms.cameraMatrixWorld.value = this._camera.matrixWorld
		this.fullscreenMaterial.uniforms._projectionMatrix.value = this._camera.projectionMatrix
		this.fullscreenMaterial.uniforms._inverseProjectionMatrix.value = this._camera.projectionMatrixInverse
	}

	setSize(width, height) {
		this.renderTarget.setSize(width * this.ssrPass.resolutionScale, height * this.ssrPass.resolutionScale)
		this.gBuffersRenderTarget.setSize(width * this.ssrPass.resolutionScale, height * this.ssrPass.resolutionScale)

		this.lastFrameReflectionsTexture.dispose()
		this.lastFrameReflectionsTexture = new FramebufferTexture(width, height, RGBAFormat)
		this.lastFrameReflectionsTexture.minFilter = NearestFilter
		this.lastFrameReflectionsTexture.magFilter = NearestFilter

		this.fullscreenMaterial.uniforms.lastFrameReflectionsTexture.value = this.lastFrameReflectionsTexture
		this.fullscreenMaterial.needsUpdate = true

		this.ssrPass.composeReflectionsPass.fullscreenMaterial.uniforms.lastFrameReflectionsTexture.value =
			this.lastFrameReflectionsTexture

		this.ssrPass.composeReflectionsPass.fullscreenMaterial.needsUpdate = true

		if (!this.#USE_MRT) {
			this.#webgl1DepthPass.setSize(width, height)
			this.#webgl1VelocityPass.setSize(width, height)
		}
	}

	dispose() {
		this.renderTarget.dispose()
		this.gBuffersRenderTarget.dispose()
		this.renderPass.dispose()
		this.fullscreenMaterial.dispose()

		if (!this.#USE_MRT) {
			this.#webgl1DepthPass.dispose()
			this.#webgl1VelocityPass.dispose()
		}

		this.lastFrameReflectionsTexture.dispose()

		this.normalTexture = null
		this.depthTexture = null
		this.velocityTexture = null
	}

	#keepMaterialUpdated(normalDepthMaterial, origMat, prop, define) {
		if (this.ssrPass[define]) {
			if (origMat[prop] !== normalDepthMaterial[prop]) {
				normalDepthMaterial[prop] = origMat[prop]
				normalDepthMaterial.uniforms[prop].value = origMat[prop]

				if (origMat[prop]) {
					normalDepthMaterial.defines[define] = ""
				} else {
					delete normalDepthMaterial.defines[define]
				}

				normalDepthMaterial.needsUpdate = true
			}
		} else if (normalDepthMaterial[prop] !== undefined) {
			normalDepthMaterial[prop] = undefined
			normalDepthMaterial.uniforms[prop].value = undefined
			delete normalDepthMaterial.defines[define]
			normalDepthMaterial.needsUpdate = true
		}
	}

	#setNormalDepthRoughnessMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material) {
				const origMat = c.material
				this.#defaultMaterials[c.material.uuid] = origMat

				if (this.#normalDepthMaterials[origMat.uuid] === undefined) {
					this.#normalDepthMaterials[origMat.uuid] = new NormalDepthRoughnessMaterial()

					const normalDepthMaterial = this.#normalDepthMaterials[origMat.uuid]
					if (this.#USE_MRT) normalDepthMaterial.defines.USE_MRT = ""
					normalDepthMaterial._originalUuid = c.material.uuid

					Object.defineProperty(normalDepthMaterial.uniforms.roughness, "value", {
						get() {
							return origMat.roughness || 0
						},
						set(_) {}
					})

					normalDepthMaterial.normalScale = origMat.normalScale
					normalDepthMaterial.uniforms.normalScale.value = origMat.normalScale

					const map = origMat.map || origMat.normalMap || origMat.roughnessMap || origMat.metalnessMap
					if (map) normalDepthMaterial.uniforms.uvTransform.value = map.matrix
				}

				const normalDepthMaterial = this.#normalDepthMaterials[c.material.uuid]

				this.#keepMaterialUpdated(normalDepthMaterial, origMat, "normalMap", "USE_NORMALMAP")
				this.#keepMaterialUpdated(normalDepthMaterial, origMat, "roughnessMap", "USE_ROUGHNESSMAP")

				const needsUpatedReflections =
					c.material.userData.needsUpatedReflections || c.material.map instanceof VideoTexture

				// mark the material as "ANIMATED" so that, when using temporal resolve, we get updated reflections
				if (needsUpatedReflections && !Object.keys(normalDepthMaterial.defines).includes("NEEDS_UPDATED_REFLECTIONS")) {
					normalDepthMaterial.defines.NEEDS_UPDATED_REFLECTIONS = ""
					normalDepthMaterial.needsUpdate = true
				} else if (
					!needsUpatedReflections &&
					Object.keys(normalDepthMaterial.defines).includes("NEEDS_UPDATED_REFLECTIONS")
				) {
					delete normalDepthMaterial.defines.NEEDS_UPDATED_REFLECTIONS
					normalDepthMaterial.needsUpdate = true
				}

				c.material = normalDepthMaterial
			}
		})
	}

	#unsetNormalDepthRoughnessMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material?.type === "NormalDepthRoughnessMaterial") {
				c.material.uniforms.prevProjectionMatrix.value.copy(this._camera.projectionMatrix)
				c.material.uniforms.prevModelViewMatrix.value.copy(c.modelViewMatrix)

				c.material.uniforms.prevModelViewMatrix.value.multiplyMatrices(this._camera.matrixWorldInverse, c.matrixWorld)

				c.material = this.#defaultMaterials[c.material._originalUuid]
			}
		})
	}

	render(renderer, inputTexture) {
		this.#setNormalDepthRoughnessMaterialInScene()
		renderer.setRenderTarget(this.gBuffersRenderTarget)
		this.renderPass.render(renderer, this.gBuffersRenderTarget, this.gBuffersRenderTarget)
		this.#unsetNormalDepthRoughnessMaterialInScene()

		// render depth and velocity in seperate passes
		if (!this.#USE_MRT) {
			this.#webgl1DepthPass.renderPass.render(renderer, this.#webgl1DepthPass.renderTarget)

			if (this.ssrPass.temporalResolve) this.#webgl1VelocityPass.render(renderer, inputTexture)
		}

		this.fullscreenMaterial.uniforms.inputTexture.value = inputTexture.texture
		this.fullscreenMaterial.uniforms.samples.value = this.ssrPass.samples
		this.fullscreenMaterial.uniforms.cameraNear.value = this._camera.near
		this.fullscreenMaterial.uniforms.cameraFar.value = this._camera.far

		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
