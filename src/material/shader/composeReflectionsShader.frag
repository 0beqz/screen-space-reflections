#define EULER 2.718281828459045
#define FLOAT_EPSILON 0.00001

uniform sampler2D inputBuffer;
uniform sampler2D lastFrameReflectionsBuffer;
uniform sampler2D velocityBuffer;
uniform sampler2D depthBuffer;
uniform sampler2D lastFrameDepthBuffer;

uniform mat4 _projectionMatrix;
uniform mat4 cameraMatrixWorld;

uniform mat4 _lastProjectionMatrix;
uniform mat4 lastCameraMatrixWorld;

uniform float samples;

varying vec2 vUv;

#include <packing>

vec3 screenSpaceToWorldSpace(const vec2 uv, const float depth, mat4 projectionMatrix, mat4 camMatrixWorld) {
    vec4 ndc = vec4(
        (uv.x - 0.5) * 2.0,
        (uv.y - 0.5) * 2.0,
        (depth - 0.5) * 2.0,
        1.0);

    vec4 clip = inverse(projectionMatrix) * ndc;
    vec4 view = camMatrixWorld * (clip / clip.w);

    return view.xyz;
}

// source: https://github.com/CesiumGS/cesium/blob/main/Source/Shaders/Builtin/Functions/luminance.glsl
float czm_luminance(vec3 rgb) {
    // Algorithm from Chapter 10 of Graphics Shaders.
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    return dot(rgb, W);
}

void main() {
    vec4 inputTexel = texture2D(inputBuffer, vUv);
    vec4 lastFrameReflectionsTexel = texture2D(lastFrameReflectionsBuffer, vUv);

    if (samples < 4.) {
        ivec2 texSize = textureSize(inputBuffer, 0);
        vec2 pxSize = vec2(float(texSize.x), float(texSize.y));

        float weightSum = czm_luminance(inputTexel.rgb);
        vec3 neighborColor;

        for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
                if (x == 0 || y == 0) continue;

                vec3 px = texture2D(inputBuffer, vUv + vec2(float(x), float(y)) / pxSize).rgb;

                float weight = czm_luminance(px.rgb);

                weightSum += weight;
                neighborColor += weight * px;
            }
        }

        neighborColor /= weightSum;
        neighborColor = inputTexel.rgb * 0.75 + neighborColor * 0.25;

        inputTexel.rgb = max(inputTexel.rgb, neighborColor);
    }

#ifdef TEMPORAL_RESOLVE
    vec2 velUv = texture2D(velocityBuffer, vUv).xy;
    vec2 reprojectedUv = vUv - velUv;

    vec4 lastFrameReflectionsProjectedTexel;
    float reprojectionDist;

    float alpha = lastFrameReflectionsTexel.a;

    float mixVal = 1. / samples;
    mixVal /= EULER;

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
        // float curDepth = unpackRGBAToDepth(texture2D(depthBuffer, vUv));
        // float lastDepth = unpackRGBAToDepth(texture2D(lastFrameDepthBuffer, reprojectedUv));

        // vec3 curWorldPos = screenSpaceToWorldSpace(vUv, curDepth, _projectionMatrix, cameraMatrixWorld);
        // vec3 lastWorldPos = screenSpaceToWorldSpace(reprojectedUv, lastDepth, _lastProjectionMatrix, lastCameraMatrixWorld);

        // reprojectionDist = distance(lastWorldPos, curWorldPos);
        // reprojectionDist = pow(reprojectionDist, 4.) * 5.;

        lastFrameReflectionsProjectedTexel = texture2D(lastFrameReflectionsBuffer, reprojectedUv);

        if (length(lastFrameReflectionsTexel.rgb) < FLOAT_EPSILON) {
            lastFrameReflectionsTexel.rgb = lastFrameReflectionsProjectedTexel.rgb;
        } else {
            lastFrameReflectionsTexel.rgb += lastFrameReflectionsProjectedTexel.rgb;
            lastFrameReflectionsTexel.rgb /= 2.;
        }

        // if (reprojectionDist > 0.05) {
        //     lastFrameReflectionsTexel.rgb = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, min(reprojectionDist, 1.));
        //     alpha = 0.;
        // }
    }

    vec3 newColor;
    float movementSpeed = dot(velUv, velUv);
    float blurMix = 0.;

    if (alpha > 0.) {
        newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);
    } else if (samples < 15.) {
        // different approach
        mixVal += 0.3;
    }

    blurMix = mix(lastFrameReflectionsTexel.a, inputTexel.a + 0.5, mixVal);

    newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);

    if (samples > 16. && samples < 32.) {
        // newColor = lastFrameReflectionsTexel.rgb * (1. - 1. / samples) + inputTexel.rgb / samples;
    }

    if (length(lastFrameReflectionsTexel.rgb) < 0.005 && samples < 4.) {
        newColor = mix(lastFrameReflectionsTexel.rgb, lastFrameReflectionsTexel.rgb + inputTexel.rgb, 0.5);
    }

    gl_FragColor = vec4(vec3(newColor), alpha);
#else
    gl_FragColor = vec4(inputTexel.rgb, inputTexel.a);
#endif
}