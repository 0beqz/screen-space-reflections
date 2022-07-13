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
uniform float temporalResolveMix;

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

float grayscale(vec3 image) {
    return dot(image, vec3(0.3, 0.59, 0.11));
}

void main() {
    vec4 inputTexel = texture2D(inputTexture, vUv);
    vec4 lastFrameReflectionsTexel = texture2D(lastFrameReflectionsTexture, vUv);

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

#ifdef TEMPORAL_RESOLVE
    vec2 velUv = texture2D(velocityTexture, vUv).xy;
    vec2 reprojectedUv = vUv - velUv;

    float movement = length(velUv);

    if (reprojectedUv.x >= 0. && reprojectedUv.x <= 1. && reprojectedUv.y >= 0. && reprojectedUv.y <= 1.) {
        vec4 lastFrameReflectionsProjectedTexel = texture2D(lastFrameReflectionsTexture, reprojectedUv);

        // neighborhood clamping
        if (samples < 4.) {
            vec3 origColor = lastFrameReflectionsProjectedTexel.rgb;
            lastFrameReflectionsProjectedTexel.rgb = clamp(lastFrameReflectionsProjectedTexel.rgb, minNeighborColor, maxNeighborColor);
        }

        if (length(lastFrameReflectionsTexel.rgb) < FLOAT_EPSILON) {
            lastFrameReflectionsTexel.rgb = lastFrameReflectionsProjectedTexel.rgb;
        } else {
            lastFrameReflectionsTexel.rgb += lastFrameReflectionsProjectedTexel.rgb;
            lastFrameReflectionsTexel.rgb /= 2.;
        }

        lastFrameReflectionsTexel = lastFrameReflectionsProjectedTexel;
    }

    float alpha = min(inputTexel.a, lastFrameReflectionsTexel.a);
    movement *= 100.;

    if (samples < 2. || movement < FLOAT_EPSILON) {
        alpha = 0.05 + alpha;
    } else {
        alpha = 0.;
    }

    float mixVal = 1. / samples;
    mixVal /= EULER;

    if (alpha < FLOAT_EPSILON && samples < 15.) mixVal += 0.3;

    // calculate output color depending on the samples and lightness of the color
    vec3 newColor;

    if (1. / samples >= 1. - temporalResolveMix) {
        newColor = lastFrameReflectionsTexel.rgb * (temporalResolveMix) + inputTexel.rgb * (1. - temporalResolveMix);
    } else {
        newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);
    }

    if (samples > 4. && movement < FLOAT_EPSILON && length(lastFrameReflectionsTexel.rgb) < FLOAT_EPSILON) {
        // this will prevent the appearing of distracting colorful dots around the edge of a reflection once the camera has stopped moving
        newColor = lastFrameReflectionsTexel.rgb;
    }

    if (alpha < 1.) newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, (1. - alpha) * 0.25);

    gl_FragColor = vec4(vec3(newColor), alpha);
#else
    float samplesMultiplier = pow(samples / 32., 4.) + 1.;
    if (samples > 1.) inputTexel.rgb = lastFrameReflectionsTexel.rgb * (1. - 1. / (samples * samplesMultiplier)) + inputTexel.rgb / (samples * samplesMultiplier);
    gl_FragColor = vec4(inputTexel.rgb, inputTexel.a);
#endif
}