import { DepthPass, Pass, RenderPass } from "postprocessing"
import {
	FramebufferTexture,
	HalfFloatType,
	NearestFilter,
	NearestMipmapNearestFilter,
	RGBAFormat,
	Uniform,
	WebGLMultipleRenderTargets,
	WebGLRenderTarget
} from "three"
import WEBGL from "three/examples/jsm/capabilities/WebGL.js"
import { NormalDepthRoughnessMaterial } from "./material/NormalDepthRoughnessMaterial.js"
import { SSRMaterial } from "./material/SSRMaterial.js"
import { VelocityPass } from "./passes/VelocityPass.js"

export class ReflectionsPass extends Pass {
	#defaultMaterials = {}
	#normalDepthMaterials = {}
	#options = {}
	#useMRT = false
	#webgl1DepthPass = null
	#webgl1VelocityPass = null
	samples = 1

	staticNoise = false

	constructor(ssrPass, options = {}) {
		super("ReflectionsPass")

		this.ssrPass = ssrPass
		this._scene = ssrPass._scene
		this._camera = ssrPass._camera
		this.#options = options

		this.fullscreenMaterial = new SSRMaterial()

		const width = options.width || window.innerWidth
		const height = options.height || window.innerHeight

		this.renderTarget = new WebGLRenderTarget(width, height, {
			minFilter: NearestFilter,
			magFilter: NearestFilter
		})

		this.renderPass = new RenderPass(this._scene, this._camera)

		this.#useMRT = options.useMRT && WEBGL.isWebGL2Available()

		if (this.#useMRT) {
			// buffers: normal, depth (2), roughness will be written to the alpha channel of the normal buffer
			this.gBuffersRenderTarget = new WebGLMultipleRenderTargets(width, height, 3, {
				minFilter: NearestMipmapNearestFilter,
				magFilter: NearestMipmapNearestFilter,
				generateMipmaps: true,
				type: HalfFloatType
			})

			this.normalTexture = this.gBuffersRenderTarget.texture[0]
			this.depthTexture = this.gBuffersRenderTarget.texture[1]
			this.velocityTexture = this.gBuffersRenderTarget.texture[2]

			this.fullscreenMaterial.defines.USE_ROUGHNESSMAP = true
		} else {
			// depth pass
			this.#webgl1DepthPass = new DepthPass(this._scene, this._camera)
			this.#webgl1DepthPass.renderTarget.minFilter = NearestMipmapNearestFilter
			this.#webgl1DepthPass.renderTarget.magFilter = NearestMipmapNearestFilter
			this.#webgl1DepthPass.renderTarget.generateMipmaps = true

			this.#webgl1DepthPass.renderTarget.texture.minFilter = NearestMipmapNearestFilter
			this.#webgl1DepthPass.renderTarget.texture.magFilter = NearestMipmapNearestFilter
			this.#webgl1DepthPass.renderTarget.texture.generateMipmaps = true

			this.#webgl1DepthPass.setSize(window.innerWidth, window.innerHeight)

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
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)
		this.gBuffersRenderTarget.setSize(width, height)

		if (!this.#useMRT) {
			this.#webgl1DepthPass.setSize(width, height)
			this.#webgl1VelocityPass.setSize(width, height)
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
					if (this.#useMRT) {
						normalDepthMaterial.defines.USE_MRT = ""
					}
					normalDepthMaterial._originalUuid = c.material.uuid

					normalDepthMaterial.extensions.derivatives = true

					normalDepthMaterial.normalScale = origMat.normalScale

					normalDepthMaterial.uniforms.normalMap = new Uniform(null)
					normalDepthMaterial.uniforms.normalMap.value = origMat.normalMap

					Object.defineProperty(normalDepthMaterial.uniforms.roughness, "value", {
						get() {
							return origMat.roughness || 0
						},
						set(_) {}
					})

					if (this.#options.useNormalMap && origMat.normalMap) {
						normalDepthMaterial.normalMap = origMat.normalMap
						normalDepthMaterial.defines.USE_NORMALMAP = ""
					}
					if (this.#options.useRoughnessMap && origMat.roughnessMap) {
						normalDepthMaterial.uniforms.roughnessMap.value = origMat.roughnessMap
						normalDepthMaterial.defines.USE_ROUGHNESSMAP = ""
					}

					normalDepthMaterial.uniforms.normalScale.value = origMat.normalScale

					const map = origMat.map || origMat.normalMap || origMat.roughnessMap || origMat.metalnessMap

					if (map) normalDepthMaterial.uniforms.uvTransform.value = map.matrix
				}

				const normalDepthMaterial = this.#normalDepthMaterials[c.material.uuid]

				c.material = normalDepthMaterial
			}
		})
	}

	#unsetNormalDepthRoughnessMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material) {
				c.material.uniforms.prevProjectionMatrix.value.copy(this._camera.projectionMatrix)
				c.material.uniforms.prevModelViewMatrix.value.copy(c.modelViewMatrix)

				c.material = this.#defaultMaterials[c.material._originalUuid]
			}
		})
	}

	render(renderer, inputBuffer) {
		if (this.staticNoise) {
			// this.samples = this.samples === 1 ? 2 : 1
			this.samples = 1
		} else {
			this.samples++
		}

		// render depth and velocity in seperate passes
		if (!this.#useMRT) {
			this.#webgl1DepthPass.renderPass.render(renderer, this.#webgl1DepthPass.renderTarget)

			if (this.ssrPass.temporalResolve) this.#webgl1VelocityPass.render(renderer, inputBuffer)
		}

		this.#setNormalDepthRoughnessMaterialInScene()
		renderer.setRenderTarget(this.gBuffersRenderTarget)
		this.renderPass.render(renderer, this.gBuffersRenderTarget, this.gBuffersRenderTarget)
		this.#unsetNormalDepthRoughnessMaterialInScene()

		this.fullscreenMaterial.uniforms.inputBuffer.value = inputBuffer.texture
		this.fullscreenMaterial.uniforms.normalBuffer.value = this.normalTexture
		this.fullscreenMaterial.uniforms.depthBuffer.value = this.depthTexture
		this.fullscreenMaterial.uniforms.samples.value = this.samples
		this.fullscreenMaterial.uniforms.lastFrameReflectionsBuffer.value = this.lastFrameReflectionsTexture
		this.fullscreenMaterial.uniforms.cameraMatrixWorld.value = this._camera.matrixWorld
		this.fullscreenMaterial.uniforms._projectionMatrix.value = this._camera.projectionMatrix
		this.fullscreenMaterial.uniforms._inverseProjectionMatrix.value = this._camera.projectionMatrixInverse
		this.fullscreenMaterial.uniforms.cameraNear.value = this._camera.near
		this.fullscreenMaterial.uniforms.cameraFar.value = this._camera.far

		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
