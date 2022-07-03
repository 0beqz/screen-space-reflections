import { Matrix4, ShaderMaterial, Uniform } from "three"
import helperFunctions from "./shader/helperFunctions.frag"
import fragmentShader from "./shader/ssrMaterial.frag"
import vertexShader from "./shader/ssrMaterial.vert"

export class SSRMaterial extends ShaderMaterial {
	constructor() {
		super({
			type: "SSRMaterial",

			uniforms: {
				inputBuffer: new Uniform(null),
				normalBuffer: new Uniform(null),
				depthBuffer: new Uniform(null),
				_projectionMatrix: new Uniform(new Matrix4()),
				_inverseProjectionMatrix: new Uniform(new Matrix4()),
				cameraMatrixWorld: new Uniform(new Matrix4()),
				cameraNear: new Uniform(0),
				cameraFar: new Uniform(0),
				rayStep: new Uniform(0.1),
				intensity: new Uniform(1),
				power: new Uniform(1),
				roughnessFadeOut: new Uniform(1),
				rayFadeOut: new Uniform(0),
				thickness: new Uniform(10),
				ior: new Uniform(1.45),
				maxDepthDifference: new Uniform(1),
				maxDepth: new Uniform(0.9999),
				jitter: new Uniform(0.5),
				jitterRough: new Uniform(0.5),
				jitterSpread: new Uniform(1),
				depthBlur: new Uniform(1)
			},

			defines: {
				MAX_STEPS: 20,
				NUM_BINARY_SEARCH_STEPS: 5
			},

			fragmentShader: fragmentShader.replace("#include <helperFunctions>", helperFunctions),
			vertexShader,

			toneMapped: false,
			depthWrite: false,
			depthTest: false
		})
	}
}
