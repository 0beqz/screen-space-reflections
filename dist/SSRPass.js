import * as __WEBPACK_EXTERNAL_MODULE_postprocessing__ from "postprocessing";
import * as __WEBPACK_EXTERNAL_MODULE_three__ from "three";
/******/ // The require scope
/******/ var __webpack_require__ = {};
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "b": () => (/* reexport */ SSRPass)
});

;// CONCATENATED MODULE: external "postprocessing"
var x = y => { var x = {}; __webpack_require__.d(x, y); return x; }
var y = x => () => x
const external_postprocessing_namespaceObject = x({ ["DepthPass"]: () => __WEBPACK_EXTERNAL_MODULE_postprocessing__.DepthPass, ["KawaseBlurPass"]: () => __WEBPACK_EXTERNAL_MODULE_postprocessing__.KawaseBlurPass, ["KernelSize"]: () => __WEBPACK_EXTERNAL_MODULE_postprocessing__.KernelSize, ["Pass"]: () => __WEBPACK_EXTERNAL_MODULE_postprocessing__.Pass, ["RenderPass"]: () => __WEBPACK_EXTERNAL_MODULE_postprocessing__.RenderPass });
;// CONCATENATED MODULE: external "three"
var external_three_x = y => { var x = {}; __webpack_require__.d(x, y); return x; }
var external_three_y = x => () => x
const external_three_namespaceObject = external_three_x({ ["GLSL3"]: () => __WEBPACK_EXTERNAL_MODULE_three__.GLSL3, ["LinearFilter"]: () => __WEBPACK_EXTERNAL_MODULE_three__.LinearFilter, ["Matrix3"]: () => __WEBPACK_EXTERNAL_MODULE_three__.Matrix3, ["Matrix4"]: () => __WEBPACK_EXTERNAL_MODULE_three__.Matrix4, ["NearestFilter"]: () => __WEBPACK_EXTERNAL_MODULE_three__.NearestFilter, ["NearestMipmapNearestFilter"]: () => __WEBPACK_EXTERNAL_MODULE_three__.NearestMipmapNearestFilter, ["ShaderMaterial"]: () => __WEBPACK_EXTERNAL_MODULE_three__.ShaderMaterial, ["TangentSpaceNormalMap"]: () => __WEBPACK_EXTERNAL_MODULE_three__.TangentSpaceNormalMap, ["Uniform"]: () => __WEBPACK_EXTERNAL_MODULE_three__.Uniform, ["Vector2"]: () => __WEBPACK_EXTERNAL_MODULE_three__.Vector2, ["WebGLMultipleRenderTargets"]: () => __WEBPACK_EXTERNAL_MODULE_three__.WebGLMultipleRenderTargets, ["WebGLRenderTarget"]: () => __WEBPACK_EXTERNAL_MODULE_three__.WebGLRenderTarget });
;// CONCATENATED MODULE: ./src/ssr/material/shader/ssrComposite.frag
/* harmony default export */ const ssrComposite = ("#define MODE_DEFAULT 0\r\n#define MODE_REFLECTIONS 1\r\n#define MODE_RAW_REFLECTION 2\r\n#define MODE_BLURRED_REFLECTIONS 3\r\n#define MODE_INPUT 4\r\n#define MODE_BLUR_MIX 5\r\n\r\n#define FLOAT_EPSILON 0.00001\r\n#define SQRT_3 1.7320508075688772 + FLOAT_EPSILON\r\n\r\nuniform sampler2D inputBuffer;\r\nuniform sampler2D reflectionsBuffer;\r\nuniform sampler2D blurredReflectionsBuffer;\r\nuniform sampler2D blurredReflectionsBuffer4;\r\n\r\nvarying vec2 vUv;\r\n\r\nvoid main() {\r\n    vec4 inputTexel = texture2D(inputBuffer, vUv);\r\n\r\n    vec4 reflectionsTexel = texture2D(reflectionsBuffer, vUv);\r\n    vec3 reflectionClr = reflectionsTexel.xyz;\r\n\r\n#ifdef USE_BLUR\r\n    vec4 blurredReflectionsTexel = texture2D(blurredReflectionsBuffer, vUv);\r\n\r\n    float blurMix = reflectionsTexel.a;\r\n\r\n    reflectionClr = mix(reflectionClr, blurredReflectionsTexel.xyz, blurMix);\r\n    reflectionClr = mix(reflectionClr, vec3(0.), 0.35 * pow(SQRT_3 - length(reflectionClr), 1.5));\r\n    reflectionClr = max(vec3(0.), reflectionClr);\r\n#endif\r\n\r\n#if RENDER_MODE == MODE_DEFAULT\r\n    gl_FragColor = vec4(inputTexel.rgb + reflectionClr, 1.);\r\n#endif\r\n\r\n#if RENDER_MODE == MODE_REFLECTIONS\r\n    gl_FragColor = vec4(reflectionClr, 1.);\r\n#endif\r\n\r\n#if RENDER_MODE == MODE_RAW_REFLECTION\r\n    gl_FragColor = vec4(reflectionsTexel.xyz, 1.);\r\n#endif\r\n\r\n#if RENDER_MODE == MODE_BLURRED_REFLECTIONS\r\n#ifdef USE_BLUR\r\n    gl_FragColor = vec4(blurredReflectionsTexel.xyz, 1.);\r\n#endif\r\n#endif\r\n\r\n#if RENDER_MODE == MODE_INPUT\r\n    gl_FragColor = vec4(inputTexel.xyz, 1.);\r\n#endif\r\n\r\n#if RENDER_MODE == MODE_BLUR_MIX\r\n#ifdef USE_BLUR\r\n    gl_FragColor = vec4(vec3(blurMix), 1.);\r\n#endif\r\n#endif\r\n\r\n#include <encodings_fragment>\r\n}");
;// CONCATENATED MODULE: ./src/ssr/material/SSRCompositeMaterial.js



class SSRCompositeMaterial extends external_three_namespaceObject.ShaderMaterial {
  constructor() {
    super({
      type: "SSRCompositeMaterial",
      uniforms: {
        inputBuffer: new external_three_namespaceObject.Uniform(null),
        reflectionsBuffer: new external_three_namespaceObject.Uniform(null),
        blurredReflectionsBuffer: new external_three_namespaceObject.Uniform(null),
        blurredReflectionsBuffer4: new external_three_namespaceObject.Uniform(null),
        _projectionMatrix: new external_three_namespaceObject.Uniform(new external_three_namespaceObject.Matrix4())
      },
      defines: {
        RENDER_MODE: 0,
        USE_BLUR: ""
      },
      fragmentShader: ssrComposite,
      vertexShader:
      /* glsl */
      `
                varying vec2 vUv;

                void main() {
                    vUv = position.xy * 0.5 + 0.5;
                    gl_Position = vec4(position.xy, 1.0, 1.0);
                }
            `
    });
  }

}
;// CONCATENATED MODULE: ./src/ssr/material/NormalDepthRoughnessMaterial.js
 // WebGL1: will render normals to RGB channel and roughness to A channel
// WebGL2: will render normals to RGB channel of "gNormal" buffer, roughness to A channel of "gNormal" buffer, depth to RGBA channel of "gDepth" buffer

class NormalDepthRoughnessMaterial extends external_three_namespaceObject.ShaderMaterial {
  constructor() {
    super({
      type: "NormalDepthRoughnessMaterial",
      defines: {
        USE_UV: ""
      },
      uniforms: {
        opacity: new external_three_namespaceObject.Uniform(1),
        normalMap: new external_three_namespaceObject.Uniform(null),
        normalScale: new external_three_namespaceObject.Uniform(new external_three_namespaceObject.Vector2(1, 1)),
        uvTransform: new external_three_namespaceObject.Uniform(new external_three_namespaceObject.Matrix3()),
        roughness: new external_three_namespaceObject.Uniform(1),
        roughnessMap: new external_three_namespaceObject.Uniform(null)
      },
      vertexShader:
      /* glsl */
      `
                #ifdef USE_MRT
                out vec2 vHighPrecisionZW;
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

                }
            `,
      fragmentShader:
      /* glsl */
      `
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
                    #else
                        gl_FragColor = vec4(normalColor, roughnessValue);
                    #endif

                }
            `,
      toneMapped: false
    });
    this.normalMapType = external_three_namespaceObject.TangentSpaceNormalMap;
    this.normalScale = new external_three_namespaceObject.Vector2(1, 1);
    Object.defineProperty(this, "glslVersion", {
      get() {
        return "USE_MRT" in this.defines ? external_three_namespaceObject.GLSL3 : null;
      },

      set(_) {}

    });
  }

}
;// CONCATENATED MODULE: ./src/ssr/material/shader/helperFunctions.frag
/* harmony default export */ const helperFunctions = ("// source: https://github.com/mrdoob/three.js/blob/dev/examples/js/shaders/SSAOShader.js\r\nvec3 getViewPosition(const float depth) {\r\n    float clipW = _projectionMatrix[2][3] * depth + _projectionMatrix[3][3];\r\n    vec4 clipPosition = vec4((vec3(vUv, depth) - 0.5) * 2.0, 1.0);\r\n    clipPosition *= clipW;\r\n    return (_inverseProjectionMatrix * clipPosition).xyz;\r\n}\r\n\r\n// source: https://github.com/mrdoob/three.js/blob/dev/examples/js/shaders/SSAOShader.js\r\nfloat getViewZ(const float depth) {\r\n    return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);\r\n}\r\n\r\n// credits for transforming screen position to world position: https://discourse.threejs.org/t/reconstruct-world-position-in-screen-space-from-depth-buffer/5532/2\r\nvec3 screenSpaceToWorldSpace(const vec2 uv, const float depth) {\r\n    vec4 ndc = vec4(\r\n        (uv.x - 0.5) * 2.0,\r\n        (uv.y - 0.5) * 2.0,\r\n        (depth - 0.5) * 2.0,\r\n        1.0);\r\n\r\n    vec4 clip = _inverseProjectionMatrix * ndc;\r\n    vec4 view = cameraMatrixWorld * (clip / clip.w);\r\n\r\n    return view.xyz;\r\n}\r\n\r\n#define Scale (vec3(0.8, 0.8, 0.8))\r\n#define K (19.19)\r\n\r\nvec3 hash(vec3 a) {\r\n    a = fract(a * Scale);\r\n    a += dot(a, a.yxz + K);\r\n    return fract((a.xxy + a.yxx) * a.zyx);\r\n}\r\n\r\n// source: https://github.com/blender/blender/blob/594f47ecd2d5367ca936cf6fc6ec8168c2b360d0/source/blender/gpu/shaders/material/gpu_shader_material_fresnel.glsl\r\nfloat fresnel_dielectric_cos(float cosi, float eta) {\r\n    /* compute fresnel reflectance without explicitly computing\r\n     * the refracted direction */\r\n    float c = abs(cosi);\r\n    float g = eta * eta - 1.0 + c * c;\r\n    float result;\r\n\r\n    if (g > 0.0) {\r\n        g = sqrt(g);\r\n        float A = (g - c) / (g + c);\r\n        float B = (c * (g + c) - 1.0) / (c * (g - c) + 1.0);\r\n        result = 0.5 * A * A * (1.0 + B * B);\r\n    } else {\r\n        result = 1.0; /* TIR (no refracted component) */\r\n    }\r\n\r\n    return result;\r\n}\r\n\r\n// source: https://github.com/blender/blender/blob/594f47ecd2d5367ca936cf6fc6ec8168c2b360d0/source/blender/gpu/shaders/material/gpu_shader_material_fresnel.glsl\r\nfloat fresnel_dielectric(vec3 Incoming, vec3 Normal, float eta) {\r\n    /* compute fresnel reflectance without explicitly computing\r\n     * the refracted direction */\r\n\r\n    float cosine = dot(Incoming, Normal);\r\n    return min(1.0, 5.0 * fresnel_dielectric_cos(cosine, eta));\r\n}\r\n");
;// CONCATENATED MODULE: ./src/ssr/material/shader/ssrMaterial.frag
/* harmony default export */ const ssrMaterial = ("varying vec2 vUv;\r\n\r\nuniform sampler2D inputBuffer;\r\nuniform sampler2D normalBuffer;\r\nuniform sampler2D depthBuffer;\r\n\r\nuniform mat4 _projectionMatrix;\r\nuniform mat4 _inverseProjectionMatrix;\r\nuniform mat4 cameraMatrixWorld;\r\nuniform float cameraNear;\r\nuniform float cameraFar;\r\n\r\nuniform float rayStep;\r\nuniform float intensity;\r\nuniform float power;\r\nuniform float maxDepthDifference;\r\nuniform float roughnessFadeOut;\r\nuniform float depthBlur;\r\nuniform float maxDepth;\r\nuniform float rayFadeOut;\r\nuniform float thickness;\r\nuniform float ior;\r\n\r\n#ifdef USE_JITTERING\r\nuniform float jitter;\r\nuniform float jitterRough;\r\nuniform float jitterSpread;\r\n#endif\r\n\r\n#include <packing>\r\n\r\n#define FLOAT_EPSILON 0.00001\r\n#define EARLY_OUT_COLOR vec4(0., 0., 0., 1.)\r\n\r\nconst vec2 INVALID_RAY_COORDS = vec2(-1.);\r\n\r\nvec2 BinarySearch(inout vec3 dir, inout vec3 hitPos, inout float rayHitDepthDifference);\r\nvec2 RayMarch(vec3 dir, inout vec3 hitPos, inout float rayHitDepthDifference);\r\n\r\n#include <helperFunctions>\r\n\r\nvoid main() {\r\n    vec4 depthTexel = texture2D(depthBuffer, vUv);\r\n\r\n    // filter out sky\r\n    if (dot(depthTexel.rgb, depthTexel.rgb) < FLOAT_EPSILON) {\r\n        gl_FragColor = EARLY_OUT_COLOR;\r\n        return;\r\n    }\r\n\r\n    float unpackedDepth = unpackRGBAToDepth(depthTexel);\r\n\r\n    if (unpackedDepth > maxDepth) {\r\n        gl_FragColor = EARLY_OUT_COLOR;\r\n        return;\r\n    }\r\n\r\n    vec4 normalTexel = texture2D(normalBuffer, vUv);\r\n\r\n    float roughness = normalTexel.a;\r\n\r\n    if (roughness > 1. - FLOAT_EPSILON && roughnessFadeOut > 1. - FLOAT_EPSILON) {\r\n        gl_FragColor = EARLY_OUT_COLOR;\r\n        return;\r\n    }\r\n\r\n    float specular = 1. - roughness;\r\n    specular *= specular;\r\n\r\n    normalTexel.rgb = unpackRGBToNormal(normalTexel.rgb);\r\n\r\n    // view-space depth\r\n    float depth = getViewZ(unpackedDepth);\r\n\r\n    // view-space normal of the current texel\r\n    vec3 viewNormal = normalTexel.xyz;\r\n\r\n    // view-space position of the current texel\r\n    vec3 viewPos = getViewPosition(depth);\r\n\r\n    // world-space position of the current texel\r\n    vec3 worldPos = screenSpaceToWorldSpace(vUv, unpackedDepth);\r\n\r\n    // view-space reflected ray\r\n    vec3 reflected = normalize(reflect(normalize(viewPos), normalize(viewNormal)));\r\n\r\n    // early out if the reflection is pretty much pointing at the camera as we know there won't be anything to reflect\r\n    if (viewNormal.z - reflected.z < 0.005) {\r\n        gl_FragColor = EARLY_OUT_COLOR;\r\n        return;\r\n    }\r\n\r\n    // jitteriing\r\n    vec3 jitt = vec3(0.);\r\n\r\n#ifdef USE_JITTERING\r\n    vec3 randomJitter = hash(5. * (worldPos + viewNormal)) - vec3(0.5, 0.5, 0.5);\r\n    float spread = ((2. - specular) + 0.05 * roughness * jitterRough) * jitterSpread;\r\n    float jitterMix = jitter + jitterRough * roughness;\r\n    if (jitterMix > 1.) jitterMix = 1.;\r\n    jitt = mix(vec3(0.), randomJitter * spread, jitterMix);\r\n#endif\r\n\r\n    vec3 hitPos = viewPos;\r\n    float rayHitDepthDifference;\r\n\r\n    vec2 coords = RayMarch(jitt + reflected * -viewPos.z, hitPos, rayHitDepthDifference);\r\n\r\n    if (coords.x == -1.) {\r\n        gl_FragColor = EARLY_OUT_COLOR;\r\n        return;\r\n    }\r\n\r\n    // from: https://github.com/kode80/kode80SSR\r\n    // source: https://github.com/kode80/kode80SSR/blob/master/Assets/Resources/Shaders/SSR.shader#L256\r\n    vec2 coordsNDC = (coords * 2.0 - 1.0);\r\n    float screenFade = 0.1;\r\n    float maxDimension = min(1.0, max(abs(coordsNDC.x), abs(coordsNDC.y)));\r\n    float screenEdgefactor = 1.0 - (max(0.0, maxDimension - screenFade) / (1.0 - screenFade));\r\n\r\n    float reflectionMultiplier = max(0., screenEdgefactor);\r\n\r\n    vec3 SSR = texture2D(inputBuffer, coords.xy).rgb;\r\n    if (power != 1.) SSR = pow(SSR, vec3(power));\r\n\r\n    float roughnessFactor = mix(specular, 1., max(0., 1. - roughnessFadeOut));\r\n\r\n    vec3 finalSSR = SSR * reflectionMultiplier * roughnessFactor;\r\n\r\n    vec3 hitWorldPos = screenSpaceToWorldSpace(coords, rayHitDepthDifference);\r\n\r\n    // distance from the reflection point to what it's reflecting\r\n    float reflectionDistance = distance(hitWorldPos, worldPos);\r\n    reflectionDistance += 1.;\r\n\r\n    if (rayFadeOut != 0.) {\r\n        float opacity = 1. / ((reflectionDistance * reflectionDistance) * rayFadeOut * 0.01);\r\n        if (opacity > 1.) opacity = 1.;\r\n        finalSSR *= opacity;\r\n    }\r\n\r\n    float blurMix = 0.;\r\n#ifdef USE_BLUR\r\n    // increase the reflection blur the further away the reflecting object is\r\n    blurMix = reflectionDistance * depthBlur;\r\n    if (blurMix > 1.) blurMix = 1.;\r\n#endif\r\n\r\n    float fresnelFactor = fresnel_dielectric(normalize(viewPos), viewNormal, ior);\r\n\r\n    finalSSR = finalSSR * fresnelFactor * intensity;\r\n    finalSSR = min(vec3(1.), finalSSR);\r\n\r\n    gl_FragColor = vec4(vec3(finalSSR), blurMix);\r\n\r\n#include <encodings_fragment>\r\n}\r\n\r\nvec2 RayMarch(vec3 dir, inout vec3 hitPos, inout float rayHitDepthDifference) {\r\n    dir = normalize(dir);\r\n    dir *= rayStep;\r\n\r\n    float depth;\r\n    int steps;\r\n    vec4 projectedCoord;\r\n    vec4 lastProjectedCoord;\r\n    float unpackedDepth;\r\n    float stepMultiplier = 1.;\r\n    vec4 depthTexel;\r\n\r\n    for (int i = 0; i < MAX_STEPS; i++) {\r\n        hitPos += dir * stepMultiplier;\r\n\r\n        projectedCoord = _projectionMatrix * vec4(hitPos, 1.0);\r\n        projectedCoord.xy /= projectedCoord.w;\r\n        // [-1, 1] --> [0, 1] (NDC to screen position)\r\n        projectedCoord.xy = projectedCoord.xy * 0.5 + 0.5;\r\n\r\n        // the ray is outside the screen so we know there won't be anything it will hit\r\n        // undo the last step and halve the step multiplier\r\n        if (projectedCoord.x > 1. || projectedCoord.y > 1.) {\r\n            hitPos -= dir * stepMultiplier;\r\n            stepMultiplier *= 0.5;\r\n            continue;\r\n        }\r\n\r\n        depthTexel = textureLod(depthBuffer, projectedCoord.xy, 0.);\r\n\r\n        unpackedDepth = unpackRGBAToDepth(depthTexel);\r\n\r\n        // if (unpackedDepth > maxDepth) return INVALID_RAY_COORDS;\r\n\r\n        depth = getViewZ(unpackedDepth);\r\n\r\n        rayHitDepthDifference = depth - hitPos.z;\r\n\r\n        if (rayHitDepthDifference >= 0.) {\r\n            // early out if the ray's depth is \"way higher\" than the depth at that view position\r\n            if (rayHitDepthDifference > thickness) return INVALID_RAY_COORDS;\r\n\r\n#if NUM_BINARY_SEARCH_STEPS == 0\r\n            // filter out sky\r\n            if (dot(depthTexel.rgb, depthTexel.rgb) < FLOAT_EPSILON) return INVALID_RAY_COORDS;\r\n#else\r\n            projectedCoord.xy = BinarySearch(dir, hitPos, rayHitDepthDifference);\r\n#endif\r\n\r\n            return projectedCoord.xy;\r\n        }\r\n\r\n        steps++;\r\n        lastProjectedCoord = projectedCoord;\r\n    }\r\n\r\n#ifndef STRETCH_MISSED_RAYS\r\n    return INVALID_RAY_COORDS;\r\n#endif\r\n\r\n    rayHitDepthDifference = unpackedDepth;\r\n\r\n    return projectedCoord.xy;\r\n}\r\n\r\nvec2 BinarySearch(inout vec3 dir, inout vec3 hitPos, inout float rayHitDepthDifference) {\r\n    float depth;\r\n    vec4 projectedCoord;\r\n    vec2 lastMinProjectedCoordXY;\r\n    float unpackedDepth;\r\n    vec4 depthTexel;\r\n\r\n    for (int i = 0; i < NUM_BINARY_SEARCH_STEPS; i++) {\r\n        projectedCoord = _projectionMatrix * vec4(hitPos, 1.0);\r\n        projectedCoord.xy /= projectedCoord.w;\r\n        projectedCoord.xy = projectedCoord.xy * 0.5 + 0.5;\r\n\r\n        if ((lastMinProjectedCoordXY.x > 1. || lastMinProjectedCoordXY.y > 1.) && (projectedCoord.x > 1. || projectedCoord.y > 1.)) return INVALID_RAY_COORDS;\r\n\r\n        depthTexel = textureLod(depthBuffer, projectedCoord.xy, 0.);\r\n\r\n        unpackedDepth = unpackRGBAToDepth(depthTexel);\r\n        depth = getViewZ(unpackedDepth);\r\n\r\n        rayHitDepthDifference = depth - hitPos.z;\r\n\r\n        dir *= 0.5;\r\n\r\n        if (rayHitDepthDifference > 0.0) {\r\n            hitPos -= dir;\r\n        } else {\r\n            hitPos += dir;\r\n            lastMinProjectedCoordXY = projectedCoord.xy;\r\n        }\r\n    }\r\n\r\n    // filter out sky\r\n    if (dot(depthTexel.rgb, depthTexel.rgb) < FLOAT_EPSILON) return INVALID_RAY_COORDS;\r\n\r\n    if (abs(rayHitDepthDifference) > maxDepthDifference) return INVALID_RAY_COORDS;\r\n\r\n    projectedCoord = _projectionMatrix * vec4(hitPos, 1.0);\r\n    projectedCoord.xy /= projectedCoord.w;\r\n    projectedCoord.xy = projectedCoord.xy * 0.5 + 0.5;\r\n\r\n#ifndef STRETCH_MISSED_RAYS\r\n    if (projectedCoord.x > 1. || projectedCoord.y > 1.) return INVALID_RAY_COORDS;\r\n#endif\r\n\r\n    rayHitDepthDifference = unpackedDepth;\r\n\r\n    return projectedCoord.xy;\r\n}");
;// CONCATENATED MODULE: ./src/ssr/material/shader/ssrMaterial.vert
/* harmony default export */ const shader_ssrMaterial = ("varying vec2 vUv;\r\n\r\nvoid main() {\r\n\r\n\tvUv = position.xy * 0.5 + 0.5;\r\n\tgl_Position = vec4(position.xy, 1.0, 1.0);\r\n\r\n}");
;// CONCATENATED MODULE: ./src/ssr/material/SSRMaterial.js




class SSRMaterial extends external_three_namespaceObject.ShaderMaterial {
  constructor() {
    super({
      type: "SSRMaterial",
      uniforms: {
        inputBuffer: new external_three_namespaceObject.Uniform(null),
        normalBuffer: new external_three_namespaceObject.Uniform(null),
        depthBuffer: new external_three_namespaceObject.Uniform(null),
        _projectionMatrix: new external_three_namespaceObject.Uniform(new external_three_namespaceObject.Matrix4()),
        _inverseProjectionMatrix: new external_three_namespaceObject.Uniform(new external_three_namespaceObject.Matrix4()),
        cameraMatrixWorld: new external_three_namespaceObject.Uniform(new external_three_namespaceObject.Matrix4()),
        cameraNear: new external_three_namespaceObject.Uniform(0),
        cameraFar: new external_three_namespaceObject.Uniform(0),
        rayStep: new external_three_namespaceObject.Uniform(0.1),
        intensity: new external_three_namespaceObject.Uniform(1),
        power: new external_three_namespaceObject.Uniform(1),
        roughnessFadeOut: new external_three_namespaceObject.Uniform(1),
        rayFadeOut: new external_three_namespaceObject.Uniform(0),
        thickness: new external_three_namespaceObject.Uniform(10),
        ior: new external_three_namespaceObject.Uniform(1.45),
        maxDepthDifference: new external_three_namespaceObject.Uniform(1),
        maxDepth: new external_three_namespaceObject.Uniform(0.9999),
        jitter: new external_three_namespaceObject.Uniform(0.5),
        jitterRough: new external_three_namespaceObject.Uniform(0.5),
        jitterSpread: new external_three_namespaceObject.Uniform(1),
        depthBlur: new external_three_namespaceObject.Uniform(1)
      },
      defines: {
        MAX_STEPS: 20,
        NUM_BINARY_SEARCH_STEPS: 5
      },
      fragmentShader: ssrMaterial.replace("#include <helperFunctions>", helperFunctions),
      vertexShader: shader_ssrMaterial,
      toneMapped: false,
      depthWrite: false,
      depthTest: false
    });
  }

}
;// CONCATENATED MODULE: ./node_modules/three/examples/jsm/capabilities/WebGL.js
class WebGL {

	static isWebGLAvailable() {

		try {

			const canvas = document.createElement( 'canvas' );
			return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );

		} catch ( e ) {

			return false;

		}

	}

	static isWebGL2Available() {

		try {

			const canvas = document.createElement( 'canvas' );
			return !! ( window.WebGL2RenderingContext && canvas.getContext( 'webgl2' ) );

		} catch ( e ) {

			return false;

		}

	}

	static getWebGLErrorMessage() {

		return this.getErrorMessage( 1 );

	}

	static getWebGL2ErrorMessage() {

		return this.getErrorMessage( 2 );

	}

	static getErrorMessage( version ) {

		const names = {
			1: 'WebGL',
			2: 'WebGL 2'
		};

		const contexts = {
			1: window.WebGLRenderingContext,
			2: window.WebGL2RenderingContext
		};

		let message = 'Your $0 does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">$1</a>';

		const element = document.createElement( 'div' );
		element.id = 'webglmessage';
		element.style.fontFamily = 'monospace';
		element.style.fontSize = '13px';
		element.style.fontWeight = 'normal';
		element.style.textAlign = 'center';
		element.style.background = '#fff';
		element.style.color = '#000';
		element.style.padding = '1.5em';
		element.style.width = '400px';
		element.style.margin = '5em auto 0';

		if ( contexts[ version ] ) {

			message = message.replace( '$0', 'graphics card' );

		} else {

			message = message.replace( '$0', 'browser' );

		}

		message = message.replace( '$1', names[ version ] );

		element.innerHTML = message;

		return element;

	}

}

/* harmony default export */ const capabilities_WebGL = (WebGL);

;// CONCATENATED MODULE: ./src/ssr/ReflectionsPass.js
function _classPrivateMethodInitSpec(obj, privateSet) { _checkPrivateRedeclaration(obj, privateSet); privateSet.add(obj); }

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }

function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }

function _classPrivateMethodGet(receiver, privateSet, fn) { if (!privateSet.has(receiver)) { throw new TypeError("attempted to get private field on non-instance"); } return fn; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }









var _defaultMaterials = /*#__PURE__*/new WeakMap();

var _normalDepthMaterials = /*#__PURE__*/new WeakMap();

var _options = /*#__PURE__*/new WeakMap();

var _useMRT = /*#__PURE__*/new WeakMap();

var _setNormalDepthRoughnessMaterialInScene = /*#__PURE__*/new WeakSet();

var _unsetNormalDepthRoughnessMaterialInScene = /*#__PURE__*/new WeakSet();

class ReflectionsPass extends external_postprocessing_namespaceObject.Pass {
  constructor(composer, scene, camera, options = {}) {
    super("ReflectionsPass");

    _classPrivateMethodInitSpec(this, _unsetNormalDepthRoughnessMaterialInScene);

    _classPrivateMethodInitSpec(this, _setNormalDepthRoughnessMaterialInScene);

    _classPrivateFieldInitSpec(this, _defaultMaterials, {
      writable: true,
      value: {}
    });

    _classPrivateFieldInitSpec(this, _normalDepthMaterials, {
      writable: true,
      value: {}
    });

    _classPrivateFieldInitSpec(this, _options, {
      writable: true,
      value: {}
    });

    _classPrivateFieldInitSpec(this, _useMRT, {
      writable: true,
      value: false
    });

    this.composer = composer;
    this._scene = scene;
    this._camera = camera;

    _classPrivateFieldSet(this, _options, options);

    this.fullscreenMaterial = new SSRMaterial();

    for (const key of Object.keys(options)) {
      if (this.fullscreenMaterial.uniforms[key] !== undefined) {
        this.fullscreenMaterial.uniforms[key].value = options[key];
      }
    }

    if (options["enableJittering"] === true) this.fullscreenMaterial.defines.USE_JITTERING = "";
    if (options["MAX_STEPS"]) this.fullscreenMaterial.defines.MAX_STEPS = options["MAX_STEPS"];
    if (options["NUM_BINARY_SEARCH_STEPS"]) this.fullscreenMaterial.defines.NUM_BINARY_SEARCH_STEPS = options["NUM_BINARY_SEARCH_STEPS"];
    const width = options.width || window.innerWidth;
    const height = options.height || window.innerHeight;
    this.renderTarget = new external_three_namespaceObject.WebGLRenderTarget(width, height, {
      minFilter: external_three_namespaceObject.NearestFilter,
      magFilter: external_three_namespaceObject.NearestFilter
    });
    this.renderPass = new external_postprocessing_namespaceObject.RenderPass(scene, camera);

    _classPrivateFieldSet(this, _useMRT, options.useMRT && capabilities_WebGL.isWebGL2Available());

    if (_classPrivateFieldGet(this, _useMRT)) {
      // buffers: normal, depth (2), roughness will be written to the alpha channel of the normal buffer
      this.gBuffersRenderTarget = new external_three_namespaceObject.WebGLMultipleRenderTargets(width, height, 2, {
        minFilter: external_three_namespaceObject.NearestMipmapNearestFilter,
        magFilter: external_three_namespaceObject.NearestMipmapNearestFilter,
        generateMipmaps: true
      });
      this.normalTexture = this.gBuffersRenderTarget.texture[0];
      this.depthTexture = this.gBuffersRenderTarget.texture[1];
      this.fullscreenMaterial.defines.USE_ROUGHNESSMAP = true;
    } else {
      // depth pass
      const depthPass = new external_postprocessing_namespaceObject.DepthPass(scene, camera);
      depthPass.renderTarget.minFilter = external_three_namespaceObject.NearestMipmapNearestFilter;
      depthPass.renderTarget.magFilter = external_three_namespaceObject.NearestMipmapNearestFilter;
      depthPass.renderTarget.generateMipmaps = true;
      depthPass.renderTarget.texture.minFilter = external_three_namespaceObject.NearestMipmapNearestFilter;
      depthPass.renderTarget.texture.magFilter = external_three_namespaceObject.NearestMipmapNearestFilter;
      depthPass.renderTarget.texture.generateMipmaps = true;
      composer.addPass(depthPass);
      this.gBuffersRenderTarget = new external_three_namespaceObject.WebGLRenderTarget(width, height, {
        minFilter: external_three_namespaceObject.NearestFilter,
        magFilter: external_three_namespaceObject.NearestFilter
      });
      this.normalTexture = this.gBuffersRenderTarget.texture;
      this.depthTexture = depthPass.texture;
    }
  }

  setSize(width, height) {
    this.renderTarget.setSize(width, height);
    this.gBuffersRenderTarget.setSize(width, height);
  }

  render(renderer, inputBuffer) {
    _classPrivateMethodGet(this, _setNormalDepthRoughnessMaterialInScene, _setNormalDepthRoughnessMaterialInScene2).call(this);

    renderer.setRenderTarget(this.gBuffersRenderTarget);
    this.renderPass.render(renderer, this.gBuffersRenderTarget, this.gBuffersRenderTarget);

    _classPrivateMethodGet(this, _unsetNormalDepthRoughnessMaterialInScene, _unsetNormalDepthRoughnessMaterialInScene2).call(this);

    this.fullscreenMaterial.uniforms.inputBuffer.value = inputBuffer.texture;
    this.fullscreenMaterial.uniforms.normalBuffer.value = this.normalTexture;
    this.fullscreenMaterial.uniforms.depthBuffer.value = this.depthTexture;
    this.fullscreenMaterial.uniforms.cameraMatrixWorld.value = this._camera.matrixWorld;
    this.fullscreenMaterial.uniforms._projectionMatrix.value = this._camera.projectionMatrix;
    this.fullscreenMaterial.uniforms._inverseProjectionMatrix.value = this._camera.projectionMatrixInverse;
    this.fullscreenMaterial.uniforms.cameraNear.value = this._camera.near;
    this.fullscreenMaterial.uniforms.cameraFar.value = this._camera.far;
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
  }

}

function _setNormalDepthRoughnessMaterialInScene2() {
  this._scene.traverse(c => {
    if (c.material) {
      const origMat = c.material;
      _classPrivateFieldGet(this, _defaultMaterials)[c.material.uuid] = origMat;

      if (_classPrivateFieldGet(this, _normalDepthMaterials)[origMat.uuid] === undefined) {
        _classPrivateFieldGet(this, _normalDepthMaterials)[origMat.uuid] = new NormalDepthRoughnessMaterial();

        const normalDepthMaterial = _classPrivateFieldGet(this, _normalDepthMaterials)[origMat.uuid];

        if (_classPrivateFieldGet(this, _useMRT)) {
          normalDepthMaterial.defines.USE_MRT = "";
        }

        normalDepthMaterial._originalUuid = c.material.uuid;
        normalDepthMaterial.normalScale = origMat.normalScale;
        normalDepthMaterial.uniforms.normalMap = new external_three_namespaceObject.Uniform(null);
        normalDepthMaterial.uniforms.normalMap.value = origMat.normalMap;
        Object.defineProperty(normalDepthMaterial.uniforms.roughness, "value", {
          get() {
            return origMat.roughness || 0;
          },

          set(_) {}

        });

        if (_classPrivateFieldGet(this, _options).useNormalMap && origMat.normalMap) {
          normalDepthMaterial.normalMap = origMat.normalMap;
          normalDepthMaterial.defines.USE_NORMALMAP = "";
        }

        if (_classPrivateFieldGet(this, _options).useRoughnessMap && origMat.roughnessMap) {
          normalDepthMaterial.uniforms.roughnessMap.value = origMat.roughnessMap;
          normalDepthMaterial.defines.USE_ROUGHNESSMAP = "";
        }

        normalDepthMaterial.uniforms.normalScale.value = origMat.normalScale;
        const map = origMat.map || origMat.normalMap || origMat.roughnessMap || origMat.metalnessMap;
        if (map) normalDepthMaterial.uniforms.uvTransform.value = map.matrix;
      }

      const normalDepthMaterial = _classPrivateFieldGet(this, _normalDepthMaterials)[c.material.uuid];

      c.material = normalDepthMaterial;
    }
  });
}

function _unsetNormalDepthRoughnessMaterialInScene2() {
  this._scene.traverse(c => {
    if (c.material) c.material = _classPrivateFieldGet(this, _defaultMaterials)[c.material._originalUuid];
  });
}
;// CONCATENATED MODULE: ./src/ssr/SSRPass.js
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }





const defaultOptions = {
  width: window.innerWidth,
  height: window.innerHeight,
  useBlur: true,
  blurKernelSize: external_postprocessing_namespaceObject.KernelSize.SMALL,
  blurWidth: window.innerWidth,
  blurHeight: window.innerHeight,
  rayStep: 0.1,
  intensity: 1,
  power: 1,
  depthBlur: 0.1,
  enableJittering: false,
  jitter: 0.1,
  jitterSpread: 0.1,
  jitterRough: 0.1,
  roughnessFadeOut: 1,
  MAX_STEPS: 20,
  NUM_BINARY_SEARCH_STEPS: 5,
  maxDepthDifference: 1,
  maxDepth: 1,
  thickness: 10,
  ior: 1.45,
  useMRT: true,
  useNormalMap: true,
  useRoughnessMap: true
};
class SSRPass extends external_postprocessing_namespaceObject.Pass {
  constructor(composer, scene, camera, options = defaultOptions) {
    super("SSRPass");
    this.composer = composer;
    this._camera = camera;
    options = _objectSpread(_objectSpread({}, defaultOptions), options);
    this.fullscreenMaterial = new SSRCompositeMaterial(); // returns just the calculates reflections

    this.reflectionsPass = new ReflectionsPass(composer, scene, camera, options);
    this.reflectionsPass.setSize(options.width, options.height);

    if (options.useBlur) {
      this.fullscreenMaterial.defines.USE_BLUR = "";
      this.reflectionsPass.fullscreenMaterial.defines.USE_BLUR = "";
    }

    if (options.stretchMissedRays) {
      this.reflectionsPass.fullscreenMaterial.defines.STRETCH_MISSED_RAYS = "";
    } // used to smooth out reflections by blurring them (more blur the longer the ray is)


    this.kawaseBlurPass = new external_postprocessing_namespaceObject.KawaseBlurPass();
    this.kawaseBlurPass.kernelSize = options.blurKernelSize;
    const parameters = {
      minFilter: external_three_namespaceObject.LinearFilter,
      magFilter: external_three_namespaceObject.LinearFilter
    };
    this.kawaseBlurPassRenderTarget = new external_three_namespaceObject.WebGLRenderTarget(options.blurWidth, options.blurHeight, parameters);
  }

  setSize(width, height) {
    this.reflectionsPass.setSize(width, height);
  }

  get reflectionUniforms() {
    return this.reflectionsPass.fullscreenMaterial.uniforms;
  }

  render(renderer, inputBuffer, outputBuffer) {
    this.reflectionsPass.render(renderer, inputBuffer, this.reflectionsPass.renderTarget);
    const useBlur = ("USE_BLUR" in this.fullscreenMaterial.defines);

    if (useBlur) {
      renderer.setRenderTarget(this.kawaseBlurPassRenderTarget);
      this.kawaseBlurPass.render(renderer, this.reflectionsPass.renderTarget, this.kawaseBlurPassRenderTarget);
    }

    const blurredReflectionsBuffer = useBlur ? this.kawaseBlurPassRenderTarget.texture : null;
    this.fullscreenMaterial.uniforms.inputBuffer.value = inputBuffer.texture;
    this.fullscreenMaterial.uniforms.reflectionsBuffer.value = this.reflectionsPass.renderTarget.texture;
    this.fullscreenMaterial.uniforms.blurredReflectionsBuffer.value = blurredReflectionsBuffer;
    this.fullscreenMaterial.uniforms._projectionMatrix.value = this._camera.projectionMatrix;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }

}
;// CONCATENATED MODULE: ./src/ssr/index.js


var __webpack_exports__SSRPass = __webpack_exports__.b;
export { __webpack_exports__SSRPass as SSRPass };
