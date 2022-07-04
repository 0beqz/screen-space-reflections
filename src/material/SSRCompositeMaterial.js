import { ShaderMaterial, Uniform } from "three"
import fragmentShader from "./shader/composeSSRShader.frag"

export class SSRCompositeMaterial extends ShaderMaterial {
	constructor() {
		super({
			type: "SSRCompositeMaterial",

			uniforms: {
				inputBuffer: new Uniform(null),
				reflectionsBuffer: new Uniform(null),
				blurredReflectionsBuffer: new Uniform(null),
				blurredReflectionsBuffer4: new Uniform(null),
				samples: new Uniform(1)
			},

			defines: {
				RENDER_MODE: 0
			},

			fragmentShader,
			vertexShader: /* glsl */ `
                varying vec2 vUv;

                void main() {
                    vUv = position.xy * 0.5 + 0.5;
                    gl_Position = vec4(position.xy, 1.0, 1.0);
                }
            `
		})
	}
}
