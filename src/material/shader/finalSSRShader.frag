#define MODE_DEFAULT 0
#define MODE_REFLECTIONS 1
#define MODE_RAW_REFLECTION 2
#define MODE_BLURRED_REFLECTIONS 3
#define MODE_INPUT 4
#define MODE_BLUR_MIX 5

#define FLOAT_EPSILON 0.00001
#define SQRT_3 1.7320508075688772 + FLOAT_EPSILON

uniform sampler2D inputTexture;
uniform sampler2D reflectionsTexture;

#ifdef ENABLE_BLUR
uniform sampler2D depthTexture;
#endif

uniform float samples;
uniform float blurMix;

// --
#include <bilateralBlur>

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 reflectionsTexel = texture2D(reflectionsTexture, vUv);

    vec3 reflectionClr = reflectionsTexel.xyz;

#ifdef ENABLE_BLUR
    vec4 blurredReflectionsTexel = blur(reflectionsTexture, depthTexture);

    reflectionClr = mix(reflectionClr, blurredReflectionsTexel.xyz, blurMix);
#endif

#if RENDER_MODE == MODE_DEFAULT
    outputColor = vec4(inputColor.rgb + reflectionClr, 1.);
#endif

#if RENDER_MODE == MODE_REFLECTIONS
    outputColor = vec4(reflectionClr, 1.);
#endif

#if RENDER_MODE == MODE_RAW_REFLECTION
    outputColor = vec4(reflectionsTexel.xyz, 1.);
#endif

#if RENDER_MODE == MODE_BLURRED_REFLECTIONS
#ifdef ENABLE_BLUR
    outputColor = vec4(blurredReflectionsTexel.xyz, 1.);
#endif
#endif

#if RENDER_MODE == MODE_INPUT
    outputColor = vec4(inputColor.xyz, 1.);
#endif

#if RENDER_MODE == MODE_BLUR_MIX
#ifdef ENABLE_BLUR
    outputColor = vec4(vec3(blurMix), 1.);
#endif
#endif
}