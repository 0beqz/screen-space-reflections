#define MODE_DEFAULT 0
#define MODE_REFLECTIONS 1
#define MODE_RAW_REFLECTION 2
#define MODE_BLURRED_REFLECTIONS 3
#define MODE_INPUT 4
#define MODE_BLUR_MIX 5

#define FLOAT_EPSILON 0.00001

uniform sampler2D inputTexture;
uniform sampler2D reflectionsTexture;

uniform float samples;

#include <boxBlur>

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 reflectionsTexel = texture2D(reflectionsTexture, vUv);

    vec3 reflectionClr = reflectionsTexel.xyz;

    if (blurMix > FLOAT_EPSILON) {
        ivec2 size = textureSize(reflectionsTexture, 0);
        vec2 pxSize = vec2(float(size.x), float(size.y));
        vec3 blurredReflectionsColor = denoise(reflectionsTexel.rgb, reflectionsTexture, vUv, pxSize);

        reflectionClr = mix(reflectionClr, blurredReflectionsColor.rgb, blurMix);
    }

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
    outputColor = vec4(blurredReflectionsTexel.xyz, 1.);
#endif

#if RENDER_MODE == MODE_INPUT
    outputColor = vec4(inputColor.xyz, 1.);
#endif

#if RENDER_MODE == MODE_BLUR_MIX
    outputColor = vec4(vec3(blurMix), 1.);
#endif
}