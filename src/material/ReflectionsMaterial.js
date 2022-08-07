import { Matrix4, ShaderMaterial, Uniform } from "three"
import helperFunctions from "./shader/helperFunctions.frag"
import fragmentShader from "./shader/reflectionsShader.frag"
import vertexShader from "./shader/basicVertexShader.vert"

export class ReflectionsMaterial extends ShaderMaterial {
	constructor() {
		super({
			type: "ReflectionsMaterial",

			uniforms: {
				inputTexture: new Uniform(null),
				accumulatedTexture: new Uniform(null),
				normalTexture: new Uniform(null),
				depthTexture: new Uniform(null),
				_projectionMatrix: new Uniform(new Matrix4()),
				_inverseProjectionMatrix: new Uniform(new Matrix4()),
				cameraMatrixWorld: new Uniform(new Matrix4()),
				cameraNear: new Uniform(0),
				cameraFar: new Uniform(0),
				rayDistance: new Uniform(0),
				intensity: new Uniform(0),
				roughnessFadeOut: new Uniform(0),
				rayFadeOut: new Uniform(0),
				thickness: new Uniform(0),
				ior: new Uniform(0),
				maxDepthDifference: new Uniform(0),
				jitter: new Uniform(0),
				jitterRough: new Uniform(0),
				jitterSpread: new Uniform(0),
				maxRoughness: new Uniform(0),
				samples: new Uniform(0)
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
