import { ShaderChunk } from "three"
import { UniformsUtils } from "three"
import { GLSL3, TangentSpaceNormalMap, Matrix3, Vector2, ShaderMaterial, Uniform } from "three"
import { prev_skinning_pars_vertex, velocity_vertex, VelocityShader } from "./VelocityShader"

// WebGL1: will render normals to RGB channel and roughness to A channel
// WebGL2: will render normals to RGB channel of "gNormal" buffer, roughness to A channel of "gNormal" buffer, depth to RGBA channel of "gDepth" buffer

export class NormalDepthRoughnessMaterial extends ShaderMaterial {
	constructor() {
		super({
			type: "NormalDepthRoughnessMaterial",

			defines: {
				USE_UV: "",
				TEMPORAL_RESOLVE: ""
			},

			uniforms: {
				opacity: new Uniform(1),
				normalMap: new Uniform(null),
				normalScale: new Uniform(new Vector2(1, 1)),
				uvTransform: new Uniform(new Matrix3()),
				roughness: new Uniform(1),
				roughnessMap: new Uniform(null),
				...UniformsUtils.clone(VelocityShader.uniforms)
			},
			vertexShader: /* glsl */ `
                #ifdef USE_MRT
                out vec2 vHighPrecisionZW;
                #endif

                #ifdef TEMPORAL_RESOLVE

                uniform mat4 prevProjectionMatrix;
                uniform mat4 prevModelViewMatrix;
                uniform float interpolateGeometry;
                varying vec4 prevPosition;
                varying vec4 newPosition;
                #endif

                #define NORMAL
                #if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
                    varying vec3 vViewPosition;
                #endif
                #include <common>
                #include <uv_pars_vertex>
                #include <displacementmap_pars_vertex>
                #include <normal_pars_vertex>
                #include <morphtarget_pars_vertex>
                #include <skinning_pars_vertex>
                #include <logdepthbuf_pars_vertex>
                #include <clipping_planes_pars_vertex>

                void main() {
                    #include <uv_vertex>
                    #include <beginnormal_vertex>
                    #include <morphnormal_vertex>
                    #include <skinbase_vertex>
                    #include <skinnormal_vertex>
                    #include <defaultnormal_vertex>
                    #include <normal_vertex>
                    #include <begin_vertex>
                    #include <morphtarget_vertex>
                    #include <skinning_vertex>
                    #include <displacementmap_vertex>
                    #include <project_vertex>
                    #include <logdepthbuf_vertex>
                    #include <clipping_planes_vertex>
                    #if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
                        vViewPosition = - mvPosition.xyz;
                    #endif

                    #ifdef USE_MRT
                        vHighPrecisionZW = gl_Position.zw;
                    #endif 

                    #ifdef USE_UV
                        vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
                    #endif

                    #ifdef TEMPORAL_RESOLVE
                        transformed = vec3( position );
                        
                        newPosition = modelViewMatrix * vec4( transformed, 1.0 );
                        prevPosition = prevModelViewMatrix * vec4( transformed, 1.0 );

                        newPosition =  projectionMatrix * newPosition;
                        prevPosition = prevProjectionMatrix * prevPosition;

                        // gl_Position = mix( newPosition, prevPosition, interpolateGeometry );
                    #endif

                }
            `,

			fragmentShader: /* glsl */ `
                #define NORMAL
                #if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
                    varying vec3 vViewPosition;
                #endif
                #include <packing>
                #include <uv_pars_fragment>
                #include <normal_pars_fragment>
                #include <bumpmap_pars_fragment>
                #include <normalmap_pars_fragment>
                #include <logdepthbuf_pars_fragment>
                #include <clipping_planes_pars_fragment>

                #include <roughnessmap_pars_fragment>

                
                #ifdef USE_MRT
                    layout(location = 0) out vec4 gNormal;
                    layout(location = 1) out vec4 gDepth;

                    #ifdef TEMPORAL_RESOLVE
                        layout(location = 2) out vec4 gVelocity;

                        uniform float intensity;
                        varying vec4 prevPosition;
                        varying vec4 newPosition;
                    #endif
                
                    in vec2 vHighPrecisionZW;
                #endif

                uniform float roughness;

                void main() {
                    #include <clipping_planes_fragment>
                    #include <logdepthbuf_fragment>
                    #include <normal_fragment_begin>
                    #include <normal_fragment_maps>
                    #include <roughnessmap_fragment>

                    vec3 normalColor = packNormalToRGB( normal );
                    float roughnessValue = min(1., roughnessFactor);

                    #ifdef USE_MRT
                        float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
                        vec4 depthColor = packDepthToRGBA( fragCoordZ );
                        gNormal = vec4( normalColor, 1.0 );
                        gNormal.a = roughnessValue;
                        gDepth = depthColor;

                        #ifdef TEMPORAL_RESOLVE
                            vec3 pos0 = prevPosition.xyz / prevPosition.w;
                            pos0 += 1.0;
                            pos0 /= 2.0;

                            vec3 pos1 = newPosition.xyz / newPosition.w;
                            pos1 += 1.0;
                            pos1 /= 2.0;

                            vec3 vel = pos1 - pos0;
                            gVelocity = vec4( vel * intensity, 1.0 );
                        #endif

                    #else
                        gl_FragColor = vec4(normalColor, roughnessValue);
                    #endif

                }
            `,

			toneMapped: false
		})

		this.normalMapType = TangentSpaceNormalMap
		this.normalScale = new Vector2(1, 1)

		Object.defineProperty(this, "glslVersion", {
			get() {
				return "USE_MRT" in this.defines ? GLSL3 : null
			},
			set(_) {}
		})
	}
}
