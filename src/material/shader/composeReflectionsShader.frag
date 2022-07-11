#define EULER 2.718281828459045
#define FLOAT_EPSILON 0.00001

uniform sampler2D inputTexture;
uniform sampler2D lastFrameReflectionsTexture;
uniform sampler2D velocityTexture;

uniform float width;
uniform float height;

uniform mat4 _projectionMatrix;
uniform mat4 cameraMatrixWorld;

uniform mat4 _lastProjectionMatrix;
uniform mat4 lastCameraMatrixWorld;

uniform float samples;
uniform float temporalResolveMixSamples;

varying vec2 vUv;

#include <packing>

// source: https://github.com/blender/blender/blob/594f47ecd2d5367ca936cf6fc6ec8168c2b360d0/source/blender/draw/intern/shaders/common_math_lib.glsl#L42
#define min3(a, b, c) min(a, min(b, c))
#define min4(a, b, c, d) min(a, min3(b, c, d))
#define min5(a, b, c, d, e) min(a, min4(b, c, d, e))
#define min6(a, b, c, d, e, f) min(a, min5(b, c, d, e, f))
#define min7(a, b, c, d, e, f, g) min(a, min6(b, c, d, e, f, g))
#define min8(a, b, c, d, e, f, g, h) min(a, min7(b, c, d, e, f, g, h))
#define min9(a, b, c, d, e, f, g, h, i) min(a, min8(b, c, d, e, f, g, h, i))

#define max3(a, b, c) max(a, max(b, c))
#define max4(a, b, c, d) max(a, max3(b, c, d))
#define max5(a, b, c, d, e) max(a, max4(b, c, d, e))
#define max6(a, b, c, d, e, f) max(a, max5(b, c, d, e, f))
#define max7(a, b, c, d, e, f, g) max(a, max6(b, c, d, e, f, g))
#define max8(a, b, c, d, e, f, g, h) max(a, max7(b, c, d, e, f, g, h))
#define max9(a, b, c, d, e, f, g, h, i) max(a, max8(b, c, d, e, f, g, h, i))

#define lum czm_luminance

// source: https://github.com/CesiumGS/cesium/blob/main/Source/Shaders/Builtin/Functions/luminance.glsl
float czm_luminance(vec3 rgb) {
    // Algorithm from Chapter 10 of Graphics Shaders.
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    return dot(rgb, W);
}

void main() {
    vec4 inputTexel = texture2D(inputTexture, vUv);
    vec4 lastFrameReflectionsTexel = texture2D(lastFrameReflectionsTexture, vUv);

    ivec2 size = textureSize(inputTexture, 0);
    vec2 pxSize = vec2(float(size.x), float(size.y));

    vec3 c02 = texture2D(inputTexture, vUv + vec2(-1., 1.) / pxSize).rgb;
    vec3 c12 = texture2D(inputTexture, vUv + vec2(0., 1.) / pxSize).rgb;
    vec3 c22 = texture2D(inputTexture, vUv + vec2(1., 1.) / pxSize).rgb;
    vec3 c01 = texture2D(inputTexture, vUv + vec2(-1., 0.) / pxSize).rgb;
    vec3 c11 = inputTexel.rgb;
    vec3 c21 = texture2D(inputTexture, vUv + vec2(1., 0.) / pxSize).rgb;
    vec3 c00 = texture2D(inputTexture, vUv + vec2(-1., -1.) / pxSize).rgb;
    vec3 c10 = texture2D(inputTexture, vUv + vec2(0., -1.) / pxSize).rgb;
    vec3 c20 = texture2D(inputTexture, vUv + vec2(1., -1.) / pxSize).rgb;

    vec3 minNeighborColor = min9(c02, c12, c22, c01, c11, c21, c00, c10, c20);
    vec3 maxNeighborColor = max9(c02, c12, c22, c01, c11, c21, c00, c10, c20);

// reduces noise when moving camera and not using temporal resolving
#ifndef TEMPORAL_RESOLVE
    vec3 neighborColor = lum(c02) * c02 + lum(c12) * c12 + lum(c22) * c22 + lum(c01) * c01 + lum(c11) * c11 + lum(c21) * c21 +
                         lum(c00) * c00 + lum(c10) * c10 + lum(c20) * c20;
    neighborColor = inputTexel.rgb * 0.75 + neighborColor * 0.25;
    if (samples < 2.) inputTexel.rgb = max(inputTexel.rgb, neighborColor * 0.75);
#endif

#ifdef TEMPORAL_RESOLVE
    vec2 velUv = texture2D(velocityTexture, vUv).xy;
    vec2 reprojectedUv = vUv - velUv;

    float alpha = lastFrameReflectionsTexel.a;

    // if a ray presumably hit nothing (reflection color is black) then decrease alpha by the given formula
    // going by the formula, a pixel that never reflected anything during sampling should have an alpha of 0 in 14 samples
    // we'll use that info to get rid of ghosting later
    if (samples < 15.) {
        if (length(inputTexel.rgb) < FLOAT_EPSILON) {
            alpha -= 0.1 * (1. - 1. / (samples + 1.));
            if (alpha < 0.) alpha = 0.;
        } else {
            alpha = 1.;
        }
    }

    if (reprojectedUv.x >= 0. && reprojectedUv.x <= 1. && reprojectedUv.y >= 0. && reprojectedUv.y <= 1.) {
        vec4 lastFrameReflectionsProjectedTexel = texture2D(lastFrameReflectionsTexture, reprojectedUv);

        // neighborhood clamping
        if (samples < 4.) {
            lastFrameReflectionsProjectedTexel.rgb = clamp(lastFrameReflectionsProjectedTexel.rgb, minNeighborColor, maxNeighborColor);
        }

        if (length(lastFrameReflectionsTexel.rgb) < FLOAT_EPSILON) {
            lastFrameReflectionsTexel.rgb = lastFrameReflectionsProjectedTexel.rgb;
        } else {
            lastFrameReflectionsTexel.rgb += lastFrameReflectionsProjectedTexel.rgb;
            lastFrameReflectionsTexel.rgb /= 2.;
        }
    }

    float mixVal = 1. / samples;
    mixVal /= EULER;

    if (alpha < FLOAT_EPSILON && samples < 15.) mixVal += 0.3;

    // calculate output color depending on the samples and lightness of the color
    vec3 newColor;
    if (samples <= temporalResolveMixSamples) {
        float w = 1. / temporalResolveMixSamples;
        newColor = lastFrameReflectionsTexel.rgb * (1. - w) + inputTexel.rgb * w;
    } else if (czm_luminance(lastFrameReflectionsTexel.rgb) < 0.005 && samples < 8.) {
        newColor = mix(lastFrameReflectionsTexel.rgb, lastFrameReflectionsTexel.rgb + inputTexel.rgb, 0.5);
    } else {
        newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);
    }

    gl_FragColor = vec4(newColor, alpha);
#else
    float samplesMultiplier = pow(samples / 32., 4.) + 1.;
    if (samples > 1.) inputTexel.rgb = lastFrameReflectionsTexel.rgb * (1. - 1. / (samples * samplesMultiplier)) + inputTexel.rgb / (samples * samplesMultiplier);
    gl_FragColor = vec4(inputTexel.rgb, inputTexel.a);
#endif
}