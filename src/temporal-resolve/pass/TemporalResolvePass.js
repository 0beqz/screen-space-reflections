import { Pass } from "postprocessing"
import {
	FramebufferTexture,
	HalfFloatType,
	LinearFilter,
	Matrix4,
	NearestFilter,
	RGBAFormat,
	ShaderMaterial,
	Uniform,
	Vector2,
	WebGLRenderTarget
} from "three"
import vertexShader from "../../material/shader/basicVertexShader.vert"
import temporalResolve from "../shader/temporalResolve.frag"
import { VelocityPass } from "./VelocityPass"

const zeroVec2 = new Vector2()

export class TemporalResolvePass extends Pass {
	velocityPass = null
	velocityResolutionScale = 1

	constructor(scene, camera, customComposeShader, options = {}) {
		super("TemporalResolvePass")

		this._scene = scene

		const width = options.width || typeof window !== "undefined" ? window.innerWidth : 2000
		const height = options.height || typeof window !== "undefined" ? window.innerHeight : 1000

		this.renderTarget = new WebGLRenderTarget(width, height, {
			minFilter: NearestFilter,
			magFilter: NearestFilter,
			type: HalfFloatType,
			depthBuffer: false
		})

		this.velocityPass = new VelocityPass(scene, camera)

		const fragmentShader = temporalResolve.replace("#include <custom_compose_shader>", customComposeShader)

		this.fullscreenMaterial = new ShaderMaterial({
			type: "TemporalResolveMaterial",
			uniforms: {
				inputTexture: new Uniform(null),
				accumulatedTexture: new Uniform(null),
				velocityTexture: new Uniform(this.velocityPass.renderTarget.texture),
				lastVelocityTexture: new Uniform(null),
				depthTexture: new Uniform(null),
				temporalResolveMix: new Uniform(0),
				temporalResolveCorrection: new Uniform(0),
				colorExponent: new Uniform(1),
				invTexSize: new Uniform(new Vector2()),
				curInverseProjectionMatrix: { value: new Matrix4() },
				curCameraMatrixWorld: { value: new Matrix4() },
				prevInverseProjectionMatrix: { value: new Matrix4() },
				prevCameraMatrixWorld: { value: new Matrix4() }
			},
			defines: {
				CLAMP_RADIUS: 1
			},
			vertexShader,
			fragmentShader
		})

		this.fullscreenMaterial.defines.DILATION = ""

		if (!scene.userData.velocityTexture) {
			scene.userData.velocityTexture = this.velocityPass.renderTarget.texture
		}

		this.setupAccumulatedTexture(width, height)
	}

	dispose() {
		if (this._scene.userData.velocityTexture === this.velocityPass.renderTarget.texture) {
			delete this._scene.userData.velocityTexture
		}

		this.renderTarget.dispose()
		this.accumulatedTexture.dispose()
		this.fullscreenMaterial.dispose()
		this.velocityPass.dispose()
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)
		this.velocityPass.setSize(width * this.velocityResolutionScale, height * this.velocityResolutionScale)

		this.velocityPass.renderTarget.texture.minFilter = this.velocityResolutionScale === 1 ? NearestFilter : LinearFilter
		this.velocityPass.renderTarget.texture.magFilter = this.velocityResolutionScale === 1 ? NearestFilter : LinearFilter
		this.velocityPass.renderTarget.texture.needsUpdate = true

		this.fullscreenMaterial.uniforms.invTexSize.value.set(1 / width, 1 / height)
		this.setupAccumulatedTexture(width, height)
	}

	setupAccumulatedTexture(width, height) {
		if (this.accumulatedTexture) this.accumulatedTexture.dispose()
		if (this.lastVelocityTexture) this.lastVelocityTexture.dispose()

		this.accumulatedTexture = new FramebufferTexture(width, height, RGBAFormat)
		this.accumulatedTexture.minFilter = LinearFilter
		this.accumulatedTexture.magFilter = LinearFilter
		this.accumulatedTexture.type = HalfFloatType

		this.lastVelocityTexture = new FramebufferTexture(
			width * this.velocityResolutionScale,
			height * this.velocityResolutionScale,
			RGBAFormat
		)
		this.lastVelocityTexture.minFilter = this.velocityResolutionScale === 1 ? NearestFilter : LinearFilter
		this.lastVelocityTexture.magFilter = this.velocityResolutionScale === 1 ? NearestFilter : LinearFilter
		this.lastVelocityTexture.type = HalfFloatType

		this.fullscreenMaterial.uniforms.accumulatedTexture.value = this.accumulatedTexture
		this.fullscreenMaterial.uniforms.lastVelocityTexture.value = this.lastVelocityTexture

		this.fullscreenMaterial.needsUpdate = true
	}

	render(renderer) {
		this.velocityPass.render(renderer)

		this.fullscreenMaterial.uniforms.curInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse)
		this.fullscreenMaterial.uniforms.curCameraMatrixWorld.value.copy(this.camera.matrixWorld)

		renderer.setRenderTarget(this.renderTarget)
		renderer.render(this.scene, this.camera)

		this.fullscreenMaterial.uniforms.prevInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse)
		this.fullscreenMaterial.uniforms.prevCameraMatrixWorld.value.copy(this.camera.matrixWorld)

		// save the render target's texture for use in next frame
		renderer.copyFramebufferToTexture(zeroVec2, this.accumulatedTexture)

		renderer.setRenderTarget(this.velocityPass.renderTarget)
		renderer.copyFramebufferToTexture(zeroVec2, this.lastVelocityTexture)
	}
}
