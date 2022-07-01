import { DepthPass, Pass, RenderPass } from "postprocessing"
import {
	NearestFilter,
	NearestMipmapNearestFilter,
	Uniform,
	WebGLMultipleRenderTargets,
	WebGLRenderTarget
} from "three"
import WEBGL from "three/examples/jsm/capabilities/WebGL.js"
import { NormalDepthRoughnessMaterial } from "./material/NormalDepthRoughnessMaterial.js"
import { SSRMaterial } from "./material/SSRMaterial.js"

export class ReflectionsPass extends Pass {
	#defaultMaterials = {}
	#normalDepthMaterials = {}
	#options = {}
	#useMRT = false

	constructor(composer, scene, camera, options = {}) {
		super("ReflectionsPass")

		this._scene = scene
		this._camera = camera
		this.#options = options

		this.fullscreenMaterial = new SSRMaterial()

		for (const key of Object.keys(options)) {
			if (this.fullscreenMaterial.uniforms[key] !== undefined) {
				this.fullscreenMaterial.uniforms[key].value = options[key]
			}
		}

		if (options["enableJittering"] === true)
			this.fullscreenMaterial.defines.USE_JITTERING = ""

		if (options["MAX_STEPS"])
			this.fullscreenMaterial.defines.MAX_STEPS = options["MAX_STEPS"]

		if (options["NUM_BINARY_SEARCH_STEPS"])
			this.fullscreenMaterial.defines.NUM_BINARY_SEARCH_STEPS =
				options["NUM_BINARY_SEARCH_STEPS"]

		const width = options.width || window.innerWidth
		const height = options.height || window.innerHeight

		this.renderTarget = new WebGLRenderTarget(width, height, {
			minFilter: NearestFilter,
			magFilter: NearestFilter
		})

		this.renderPass = new RenderPass(scene, camera)

		this.#useMRT = options.useMRT && WEBGL.isWebGL2Available()

		if (this.#useMRT) {
			// buffers: normal, depth (2), roughness will be written to the alpha channel of the normal buffer
			this.gBuffersRenderTarget = new WebGLMultipleRenderTargets(
				width,
				height,
				2,
				{
					minFilter: NearestMipmapNearestFilter,
					magFilter: NearestMipmapNearestFilter,
					generateMipmaps: true
				}
			)

			this.normalTexture = this.gBuffersRenderTarget.texture[0]
			this.depthTexture = this.gBuffersRenderTarget.texture[1]

			this.fullscreenMaterial.defines.USE_ROUGHNESSMAP = true
		} else {
			// depth pass
			const depthPass = new DepthPass(scene, camera)
			depthPass.renderTarget.minFilter = NearestMipmapNearestFilter
			depthPass.renderTarget.magFilter = NearestMipmapNearestFilter
			depthPass.renderTarget.generateMipmaps = true

			depthPass.renderTarget.texture.minFilter = NearestMipmapNearestFilter
			depthPass.renderTarget.texture.magFilter = NearestMipmapNearestFilter
			depthPass.renderTarget.texture.generateMipmaps = true

			composer.addPass(depthPass)

			this.gBuffersRenderTarget = new WebGLRenderTarget(width, height, {
				minFilter: NearestFilter,
				magFilter: NearestFilter
			})

			this.normalTexture = this.gBuffersRenderTarget.texture
			this.depthTexture = depthPass.texture
		}
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)
		this.gBuffersRenderTarget.setSize(width, height)
	}

	#setNormalDepthRoughnessMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material) {
				const origMat = c.material
				this.#defaultMaterials[c.material.uuid] = origMat

				if (this.#normalDepthMaterials[origMat.uuid] === undefined) {
					this.#normalDepthMaterials[origMat.uuid] =
						new NormalDepthRoughnessMaterial()

					const normalDepthMaterial = this.#normalDepthMaterials[origMat.uuid]
					if (this.#useMRT) {
						normalDepthMaterial.defines.USE_MRT = ""
					}
					normalDepthMaterial._originalUuid = c.material.uuid

					normalDepthMaterial.normalScale = origMat.normalScale

					normalDepthMaterial.uniforms.normalMap = new Uniform(null)
					normalDepthMaterial.uniforms.normalMap.value = origMat.normalMap

					Object.defineProperty(
						normalDepthMaterial.uniforms.roughness,
						"value",
						{
							get() {
								return origMat.roughness || 0
							},
							set(_) {}
						}
					)

					if (this.#options.useNormalMap && origMat.normalMap) {
						normalDepthMaterial.normalMap = origMat.normalMap
						normalDepthMaterial.defines.USE_NORMALMAP = ""
					}
					if (this.#options.useRoughnessMap && origMat.roughnessMap) {
						normalDepthMaterial.uniforms.roughnessMap.value =
							origMat.roughnessMap
						normalDepthMaterial.defines.USE_ROUGHNESSMAP = ""
					}

					normalDepthMaterial.uniforms.normalScale.value = origMat.normalScale

					const map =
						origMat.map ||
						origMat.normalMap ||
						origMat.roughnessMap ||
						origMat.metalnessMap

					if (map) normalDepthMaterial.uniforms.uvTransform.value = map.matrix
				}

				const normalDepthMaterial = this.#normalDepthMaterials[c.material.uuid]

				c.material = normalDepthMaterial
			}
		})
	}

	#unsetNormalDepthRoughnessMaterialInScene() {
		this._scene.traverse(c => {
			if (c.material)
				c.material = this.#defaultMaterials[c.material._originalUuid]
		})
	}

	render(renderer, inputBuffer) {
		this.#setNormalDepthRoughnessMaterialInScene()

		renderer.setRenderTarget(this.gBuffersRenderTarget)

		this.renderPass.render(
			renderer,
			this.gBuffersRenderTarget,
			this.gBuffersRenderTarget
		)

		this.#unsetNormalDepthRoughnessMaterialInScene()

		this.fullscreenMaterial.uniforms.inputBuffer.value = inputBuffer.texture
		this.fullscreenMaterial.uniforms.normalBuffer.value = this.normalTexture
		this.fullscreenMaterial.uniforms.depthBuffer.value = this.depthTexture
		this.fullscreenMaterial.uniforms.cameraMatrixWorld.value =
			this._camera.matrixWorld
		this.fullscreenMaterial.uniforms._projectionMatrix.value =
			this._camera.projectionMatrix
		this.fullscreenMaterial.uniforms._inverseProjectionMatrix.value =
			this._camera.projectionMatrixInverse
		this.fullscreenMaterial.uniforms.cameraNear.value = this._camera.near
		this.fullscreenMaterial.uniforms.cameraFar.value = this._camera.far

		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)
	}
}
