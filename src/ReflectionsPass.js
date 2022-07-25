import { DepthPass, Pass, RenderPass } from "postprocessing"
import { NearestFilter, WebGLMultipleRenderTargets, WebGLRenderTarget } from "three"
import { MRTMaterial } from "./material/MRTMaterial.js"
import { ReflectionsMaterial } from "./material/ReflectionsMaterial.js"
import { VelocityPass } from "./passes/VelocityPass.js"

// from https://github.com/mrdoob/three.js/blob/dev/examples/jsm/capabilities/WebGL.js#L18
const isWebGL2Available = () => {
	try {
		const canvas = document.createElement("canvas")
		return !!(window.WebGL2RenderingContext && canvas.getContext("webgl2"))
	} catch (e) {
		return false
	}
}

export class ReflectionsPass extends Pass {
	#ssrEffect
	#cachedMaterials = new WeakMap()
	#USE_MRT = false
	#webgl1DepthPass = null
	#velocityPass = null

	constructor(ssrEffect, options = {}) {
		super("ReflectionsPass")

		this.#ssrEffect = ssrEffect
		this._scene = ssrEffect._scene
		this._camera = ssrEffect._camera

		this.fullscreenMaterial = new ReflectionsMaterial()

		const width = options.width || typeof window !== "undefined" ? window.innerWidth : 2000
		const height = options.height || typeof window !== "undefined" ? window.innerHeight : 1000

		this.renderTarget = new WebGLRenderTarget(width, height, {
			minFilter: NearestFilter,
			magFilter: NearestFilter,
			depthBuffer: false
		})

		this.renderPass = new RenderPass(this._scene, this._camera)

		this.#USE_MRT = options.USE_MRT && isWebGL2Available()

		if (this.#USE_MRT) {
			// buffers: normal, depth, velocity (3), roughness will be written to the alpha channel of the normal buffer
			this.gBuffersRenderTarget = new WebGLMultipleRenderTargets(width, height, 2, {
				minFilter: NearestFilter,
				magFilter: NearestFilter
			})

			this.normalTexture = this.gBuffersRenderTarget.texture[0]
			this.depthTexture = this.gBuffersRenderTarget.texture[1]
		} else {
			// depth pass
			this.#webgl1DepthPass = new DepthPass(this._scene, this._camera)
			this.#webgl1DepthPass.renderTarget.minFilter = NearestFilter
			this.#webgl1DepthPass.renderTarget.magFilter = NearestFilter

			this.#webgl1DepthPass.renderTarget.texture.minFilter = NearestFilter
			this.#webgl1DepthPass.renderTarget.texture.magFilter = NearestFilter

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
		}

		this.#velocityPass = new VelocityPass(this._scene, this._camera)
		this.velocityTexture = this.#velocityPass.renderTarget.texture

		// set up uniforms
		this.fullscreenMaterial.uniforms.normalTexture.value = this.normalTexture
		this.fullscreenMaterial.uniforms.depthTexture.value = this.depthTexture
		this.fullscreenMaterial.uniforms.accumulatedReflectionsTexture.value =
			this.#ssrEffect.composeReflectionsPass.accumulatedReflectionsTexture
		this.fullscreenMaterial.uniforms.cameraMatrixWorld.value = this._camera.matrixWorld
		this.fullscreenMaterial.uniforms._projectionMatrix.value = this._camera.projectionMatrix
		this.fullscreenMaterial.uniforms._inverseProjectionMatrix.value = this._camera.projectionMatrixInverse
	}

	setSize(width, height) {
		this.renderTarget.setSize(width * this.#ssrEffect.resolutionScale, height * this.#ssrEffect.resolutionScale)
		this.gBuffersRenderTarget.setSize(width * this.#ssrEffect.resolutionScale, height * this.#ssrEffect.resolutionScale)
		if (!this.#USE_MRT) this.#webgl1DepthPass.setSize(width, height)
		this.#velocityPass.setSize(width, height)

		this.fullscreenMaterial.uniforms.accumulatedReflectionsTexture.value =
			this.#ssrEffect.composeReflectionsPass.accumulatedReflectionsTexture
		this.fullscreenMaterial.needsUpdate = true
	}

	dispose() {
		this.renderTarget.dispose()
		this.gBuffersRenderTarget.dispose()
		this.renderPass.dispose()
		this.#velocityPass.dispose()
		if (!this.#USE_MRT) this.#webgl1DepthPass.dispose()

		this.fullscreenMaterial.dispose()

		this.normalTexture = null
		this.depthTexture = null
		this.velocityTexture = null
	}

	#keepMaterialMapUpdated(mrtMaterial, originalMaterial, prop, define) {
		if (this.#ssrEffect[define]) {
			if (originalMaterial[prop] !== mrtMaterial[prop]) {
				mrtMaterial[prop] = originalMaterial[prop]
				mrtMaterial.uniforms[prop].value = originalMaterial[prop]

				if (originalMaterial[prop]) {
					mrtMaterial.defines[define] = ""
				} else {
					delete mrtMaterial.defines[define]
				}

				mrtMaterial.needsUpdate = true
			}
		} else if (mrtMaterial[prop] !== undefined) {
			mrtMaterial[prop] = undefined
			mrtMaterial.uniforms[prop].value = undefined
			delete mrtMaterial.defines[define]
			mrtMaterial.needsUpdate = true
		}
	}

	#setMRTMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material) {
				const originalMaterial = c.material

				let [cachedOriginalMaterial, mrtMaterial] = this.#cachedMaterials.get(c) || []

				if (!this.#cachedMaterials.has(c) || originalMaterial !== cachedOriginalMaterial) {
					if (mrtMaterial) mrtMaterial.dispose()

					mrtMaterial = new MRTMaterial()

					if (this.#USE_MRT) mrtMaterial.defines.USE_MRT = ""

					mrtMaterial.normalScale = originalMaterial.normalScale
					mrtMaterial.uniforms.normalScale.value = originalMaterial.normalScale

					const map =
						originalMaterial.map ||
						originalMaterial.normalMap ||
						originalMaterial.roughnessMap ||
						originalMaterial.metalnessMap

					if (map) mrtMaterial.uniforms.uvTransform.value = map.matrix

					this.#cachedMaterials.set(c, [originalMaterial, mrtMaterial])
				}

				// update the child's MRT material

				this.#keepMaterialMapUpdated(mrtMaterial, originalMaterial, "normalMap", "USE_NORMALMAP")
				this.#keepMaterialMapUpdated(mrtMaterial, originalMaterial, "roughnessMap", "USE_ROUGHNESSMAP")

				mrtMaterial.uniforms.roughness.value =
					this.#ssrEffect.selection.size === 0 || this.#ssrEffect.selection.has(c)
						? originalMaterial.roughness || 0
						: 10e10

				c.material = mrtMaterial
			}
		})
	}

	#unsetMRTMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material?.type === "MRTMaterial") {
				// set material back to the original one
				const [originalMaterial] = this.#cachedMaterials.get(c)

				c.material = originalMaterial
			}
		})
	}

	render(renderer, inputBuffer) {
		this.#setMRTMaterialInScene()

		renderer.setRenderTarget(this.gBuffersRenderTarget)
		this.renderPass.render(renderer, this.gBuffersRenderTarget)

		this.#unsetMRTMaterialInScene()

		// render depth and velocity in seperate passes
		if (!this.#USE_MRT) this.#webgl1DepthPass.renderPass.render(renderer, this.#webgl1DepthPass.renderTarget)

		if (this.#ssrEffect.temporalResolve) this.#velocityPass.render(renderer)

		this.fullscreenMaterial.uniforms.inputTexture.value = inputBuffer.texture
		this.fullscreenMaterial.uniforms.samples.value = this.#ssrEffect.samples
		this.fullscreenMaterial.uniforms.cameraNear.value = this._camera.near
		this.fullscreenMaterial.uniforms.cameraFar.value = this._camera.far

		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
