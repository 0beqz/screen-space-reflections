#define MODE_DEFAULT 0
#define MODE_REFLECTIONS 1
#define MODE_RAW_REFLECTION 2
#define MODE_BLURRED_REFLECTIONS 3
#define MODE_INPUT 4
#define MODE_BLUR_MIX 5

#define FLOAT_EPSILON 0.00001
#define SQRT_3 1.7320508075688772 + FLOAT_EPSILON

uniform sampler2D inputBuffer;
uniform sampler2D reflectionsBuffer;
uniform sampler2D blurredReflectionsBuffer;
uniform float samples;

varying vec2 vUv;

void main() {
    vec4 inputTexel = texture2D(inputBuffer, vUv);

    vec4 reflectionsTexel = texture2D(reflectionsBuffer, vUv);

    vec3 reflectionClr = reflectionsTexel.xyz * 1.;

    float blurMix = 0.;

#ifdef USE_BLUR
    vec4 blurredReflectionsTexel = texture2D(blurredReflectionsBuffer, vUv);

    blurMix = reflectionsTexel.a;

    reflectionClr = mix(reflectionClr, blurredReflectionsTexel.xyz, blurMix);
    reflectionClr = mix(reflectionClr, vec3(0.), 0.35 * pow(SQRT_3 - length(reflectionClr), 1.5));
    reflectionClr = max(vec3(0.), reflectionClr);
#endif

#if RENDER_MODE == MODE_DEFAULT
    gl_FragColor = vec4(inputTexel.rgb + reflectionClr, 1.);
#endif

#if RENDER_MODE == MODE_REFLECTIONS
    gl_FragColor = vec4(reflectionClr, 1.);
#endif

#if RENDER_MODE == MODE_RAW_REFLECTION
    gl_FragColor = vec4(reflectionsTexel.xyz, 1.);
#endif

#if RENDER_MODE == MODE_BLURRED_REFLECTIONS
#ifdef USE_BLUR
    gl_FragColor = vec4(blurredReflectionsTexel.xyz, 1.);
#endif
#endif

#if RENDER_MODE == MODE_INPUT
    gl_FragColor = vec4(inputTexel.xyz, 1.);
#endif

#if RENDER_MODE == MODE_BLUR_MIX
#ifdef USE_BLUR
    gl_FragColor = vec4(vec3(blurMix), 1.);
#endif
#endif

#include <encodings_fragment>
}