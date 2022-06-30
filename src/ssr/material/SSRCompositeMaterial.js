import { Matrix4 } from "three"
import { ShaderMaterial, Uniform } from "three"
import fragmentShader from "./shader/ssrComposite.frag"

export class SSRCompositeMaterial extends ShaderMaterial {
	constructor() {
		super({
			type: "SSRCompositeMaterial",

			uniforms: {
				inputBuffer: new Uniform(null),
				reflectionsBuffer: new Uniform(null),
				blurredReflectionsBuffer: new Uniform(null),
				blurredReflectionsBuffer4: new Uniform(null),
				_projectionMatrix: new Uniform(new Matrix4())
			},

			defines: {
				RENDER_MODE: 0,
				USE_BLUR: ""
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
