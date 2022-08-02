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

uniform float samples;

// --
#ifdef ENABLE_BLUR
#include <boxBlur>
#endif

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 reflectionsTexel = texture2D(reflectionsTexture, vUv);

    vec3 reflectionClr = reflectionsTexel.xyz;

#ifdef ENABLE_BLUR
    ivec2 size = textureSize(reflectionsTexture, 0);
    vec2 pxSize = vec2(float(size.x), float(size.y));
    vec3 blurredReflectionsColor = denoise(reflectionsTexel.rgb, reflectionsTexture, vUv, pxSize);

    reflectionClr = mix(reflectionClr, blurredReflectionsColor.rgb, blurMix);
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