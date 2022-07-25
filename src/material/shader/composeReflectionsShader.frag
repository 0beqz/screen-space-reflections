#define EULER 2.718281828459045
#define FLOAT_EPSILON 0.00001

uniform sampler2D inputTexture;
uniform sampler2D accumulatedReflectionsTexture;
uniform sampler2D velocityTexture;

uniform float samples;
uniform float maxSamples;
uniform float temporalResolveMix;
uniform float temporalResolveCorrectionMix;

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

void main() {
    vec4 inputTexel = texture2D(inputTexture, vUv);

    vec4 lastFrameReflectionsTexel;

    vec3 newColor;

#ifdef TEMPORAL_RESOLVE
    vec4 velocityTexel = texture2D(velocityTexture, vUv);

    // filter out sky
    // if (velocityTexel.a > 1. - FLOAT_EPSILON) {
    //     return;
    // }

    vec2 velUv = velocityTexel.xy;
    float movement = length(velUv) * 100.;

    if (movement > 0.) {
        vec2 reprojectedUv = vUv - velUv;

        // check if reprojecting is necessary (due to movement) and that the reprojected UV is valid
        if (reprojectedUv.x >= 0. && reprojectedUv.x <= 1. && reprojectedUv.y >= 0. && reprojectedUv.y <= 1.) {
            lastFrameReflectionsTexel = texture2D(accumulatedReflectionsTexture, reprojectedUv);
            // neighborhood clamping (only for the first sample where the camera just moved)
            ivec2 size = textureSize(inputTexture, 0);
            vec2 pxSize = vec2(float(size.x), float(size.y));

            vec2 px = 1. / pxSize;

            // get neighbor pixels
            vec3 c02 = texture2D(inputTexture, vUv + vec2(-px.x, px.y)).rgb;
            vec3 c12 = texture2D(inputTexture, vUv + vec2(0., px.y)).rgb;
            vec3 c22 = texture2D(inputTexture, vUv + vec2(px.x, px.y)).rgb;
            vec3 c01 = texture2D(inputTexture, vUv + vec2(-px.x, 0.)).rgb;
            vec3 c11 = inputTexel.rgb;
            vec3 c21 = texture2D(inputTexture, vUv + vec2(px.x, 0.)).rgb;
            vec3 c00 = texture2D(inputTexture, vUv + vec2(-px.x, -px.y)).rgb;
            vec3 c10 = texture2D(inputTexture, vUv + vec2(0., -px.y)).rgb;
            vec3 c20 = texture2D(inputTexture, vUv + vec2(px.x, -px.y)).rgb;

            vec3 minNeighborColor = min9(c02, c12, c22, c01, c11, c21, c00, c10, c20);
            vec3 maxNeighborColor = max9(c02, c12, c22, c01, c11, c21, c00, c10, c20);

            // reduces noise when moving camera and not using temporal resolving
            // #ifndef TEMPORAL_RESOLVE
            // vec3 neighborColor = c02 + c12 + c22 + c01 + c11 + c21 + c00 + c10 + c20;
            // neighborColor /= 9.;
            // inputTexel.rgb = mix(inputTexel.rgb, neighborColor, 0.5);
            // #endif

            vec3 clampedColor = clamp(lastFrameReflectionsTexel.rgb, minNeighborColor, maxNeighborColor);

            float mixFactor = temporalResolveCorrectionMix * (1. + movement);
            mixFactor = min(mixFactor, 1.);

            lastFrameReflectionsTexel.rgb = mix(lastFrameReflectionsTexel.rgb, clampedColor, mixFactor);
        } else {
            // reprojected UV coordinates are outside of screen, so just use the current frame for it
            lastFrameReflectionsTexel.rgb = inputTexel.rgb;
        }
    } else {
        lastFrameReflectionsTexel = texture2D(accumulatedReflectionsTexture, vUv);
    }

    float alpha = min(inputTexel.a, lastFrameReflectionsTexel.a);
    alpha = samples < 2. || movement < FLOAT_EPSILON ? (0.05 + alpha) : 0.;

    if (maxSamples != 0. && samples > maxSamples && alpha > 1. - FLOAT_EPSILON) {
        gl_FragColor = lastFrameReflectionsTexel;
        return;
    }

    if (alpha < 1.) {
        // the reflections aren't correct anymore (e.g. due to occlusion from moving object) so we need to have inputTexel influence the reflections more
        newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, (1. - alpha) * temporalResolveCorrectionMix);
    } else if (samples > 4. && movement < FLOAT_EPSILON && length(lastFrameReflectionsTexel.rgb) < FLOAT_EPSILON) {
        // this will prevent the appearing of distracting colorful dots around the edge of a reflection once the camera has stopped moving
        newColor = lastFrameReflectionsTexel.rgb;
    } else if (1. / samples >= 1. - temporalResolveMix) {
        // the default way to sample the reflections evenly for the first "1 / temporalResolveMix" frames
        newColor = lastFrameReflectionsTexel.rgb * (temporalResolveMix) + inputTexel.rgb * (1. - temporalResolveMix);
    } else {
        // default method that samples quite subtly
        float mixVal = (1. / samples) / EULER;
        if (alpha < FLOAT_EPSILON && samples < 15.) mixVal += 0.3;

        newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);
    }
#else
    lastFrameReflectionsTexel = texture2D(accumulatedReflectionsTexture, vUv);
    vec2 velUv = texture2D(velocityTexture, vUv).xy;
    float movement = length(velUv) * 100.;

    float alpha = min(inputTexel.a, lastFrameReflectionsTexel.a);
    alpha = samples < 2. || movement < FLOAT_EPSILON ? (0.05 + alpha) : 0.;

    if (maxSamples != 0. && samples > maxSamples && alpha > 1. - FLOAT_EPSILON) {
        newColor = lastFrameReflectionsTexel.rgb;
    } else {
        // smoothing for higher samples to get rid of "bland reflections" after a high amount of samples
        float samplesMultiplier = pow(samples / 32., 4.) + 1.;
        if (samples > 1. && alpha > 1. - FLOAT_EPSILON) {
            newColor = lastFrameReflectionsTexel.rgb * (1. - 1. / (samples * samplesMultiplier)) + inputTexel.rgb / (samples * samplesMultiplier);
        } else {
            newColor = inputTexel.rgb;
        }
    }

#endif

    gl_FragColor = vec4(newColor, alpha);
}