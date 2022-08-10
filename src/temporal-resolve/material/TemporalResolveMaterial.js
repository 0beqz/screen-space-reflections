import { Vector2 } from "three"
import { Uniform } from "three"
import { ShaderMaterial } from "three"
import vertexShader from "../shader/basicVertexShader.vert"
import temporalResolve from "../shader/temporalResolve.frag"

export class TemporalResolveMaterial extends ShaderMaterial {
	constructor(customComposeShader) {
		const fragmentShader = temporalResolve.replace("#include <custom_compose_shader>", customComposeShader)

		super({
			type: "TemporalResolveMaterial",
			uniforms: {
				inputTexture: new Uniform(null),
				accumulatedTexture: new Uniform(null),
				velocityTexture: new Uniform(null),
				lastVelocityTexture: new Uniform(null),
				samples: new Uniform(1),
				temporalResolveMix: new Uniform(0.5),
				temporalResolveCorrection: new Uniform(1),
				colorExponent: new Uniform(1),
				invTexSize: new Uniform(new Vector2())
			},
			defines: {
				CLAMP_RADIUS: 1
			},
			vertexShader,
			fragmentShader
		})
	}
}
