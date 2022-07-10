import { ShaderMaterial, Uniform } from "three"
import fragmentShader from "./shader/finalSSRShader.frag"
import helperFunctions from "./shader/helperFunctions.frag"
import bilateralBlur from "./shader/bilateralBlur.frag"
import { Vector2 } from "three"

export class FinalSSRMaterial extends ShaderMaterial {
	constructor() {
		super({
			type: "FinalSSRMaterial",

			uniforms: {
				inputTexture: new Uniform(null),
				reflectionsTexture: new Uniform(null),
				depthTexture: new Uniform(null),
				samples: new Uniform(1),
				cameraNear: new Uniform(0),
				cameraFar: new Uniform(0),
				blurMix: new Uniform(0.5),
				g_Sharpness: new Uniform(1),
				g_InvResolutionDirection: new Uniform(new Vector2()),
				kernelRadius: new Uniform(16)
			},

			defines: {
				RENDER_MODE: 0
			},
			vertexShader: /* glsl */ `
                varying vec2 vUv;

                void main() {
                    vUv = position.xy * 0.5 + 0.5;
                    gl_Position = vec4(position.xy, 1.0, 1.0);
                }
            `
		})

		const finalFragmentShader = fragmentShader
			.replace("#include <helperFunctions>", helperFunctions)
			.replace("#include <bilateralBlur>", bilateralBlur)

		this.fragmentShader = finalFragmentShader
	}
}
