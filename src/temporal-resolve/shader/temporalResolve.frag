// a basic shader to implement temporal resolving

uniform sampler2D inputTexture;
uniform sampler2D accumulatedTexture;
uniform sampler2D velocityTexture;
uniform sampler2D lastVelocityTexture;
uniform sampler2D depthTexture;

uniform float temporalResolveCorrectionMix;

varying vec2 vUv;

#include <packing>

// source: https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/ (modified to GLSL)
vec2 getVelocity(sampler2D tex, vec2 uv, vec2 texSize) {
    float closestDepth = 100.0;
    vec2 closestUVOffset;

    for (int j = -1; j <= 1; ++j) {
        for (int i = -1; i <= 1; ++i) {
            vec2 uvOffset = vec2(i, j) / texSize;

            float neighborDepth = unpackRGBAToDepth(textureLod(depthTexture, vUv + uvOffset, 0.));

            if (neighborDepth < closestDepth) {
                closestUVOffset = uvOffset;
                closestDepth = neighborDepth;
            }
        }
    }

    return textureLod(velocityTexture, vUv + closestUVOffset, 0.).xy;
}

void main() {
    vec4 inputTexel = textureLod(inputTexture, vUv, 0.);

    vec4 accumulatedTexel;
    vec3 outputColor;

    // REPROJECT_START

    ivec2 size = textureSize(inputTexture, 0);
    vec2 pxSize = vec2(float(size.x), float(size.y));

    vec2 velUv = textureLod(velocityTexture, vUv, 0.).xy;
    vec2 reprojectedUv = vUv - velUv;

    vec2 lastVelUv = textureLod(lastVelocityTexture, reprojectedUv, 0.).xy;

    float velocityLength = length(lastVelUv - velUv);

    // idea from: https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/
    float velocityDisocclusion = (velocityLength - 0.000005) * 10.;
    velocityDisocclusion *= velocityDisocclusion;

#ifdef DILATION
    velUv = getVelocity(velocityTexture, vUv, pxSize);
    reprojectedUv = vUv - velUv;
#endif

    vec3 averageNeighborColor;

    bool canReproject = reprojectedUv.x >= 0. && reprojectedUv.x <= 1. && reprojectedUv.y >= 0. && reprojectedUv.y <= 1.;

    float movement = length(velUv) * 100.;
    if (movement > 0.) {
        vec2 px = 1. / pxSize;

        vec3 minNeighborColor = vec3(1., 1., 1.);
        vec3 maxNeighborColor = vec3(0., 0., 0.);

        vec3 color;
        float total;
        vec3 s;
        float weight;

        for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
                vec3 col = textureLod(inputTexture, vUv + vec2(x, y) * px, 0.).rgb;

                if (!canReproject) {
                    weight = 1.0 - abs(dot(col - inputTexel.rgb, vec3(0.25)));
                    weight = pow(weight, BLUR_EXPONENT);
                    color += col * weight;
                    total += weight;
                }

                averageNeighborColor += col;
                minNeighborColor = min(col, minNeighborColor);
                maxNeighborColor = max(col, maxNeighborColor);
            }
        }

        averageNeighborColor /= 9.;

        // check if reprojecting is necessary (due to movement) and that the reprojected UV is valid
        if (canReproject) {
            accumulatedTexel = textureLod(accumulatedTexture, reprojectedUv, 0.);

            vec3 clampedColor = clamp(accumulatedTexel.rgb, minNeighborColor, maxNeighborColor);

            float mixFactor = temporalResolveCorrectionMix * (1. + movement);
            mixFactor = min(mixFactor, 1.);

            accumulatedTexel.rgb = mix(accumulatedTexel.rgb, clampedColor, mixFactor);
        } else {
            // reprojected UV coordinates are outside of screen
            vec3 boxBlurredColor = color / total;
            accumulatedTexel.rgb = boxBlurredColor;
        }
    } else {
        // there was no movement so no checks and clamping need to be done
        accumulatedTexel = textureLod(accumulatedTexture, vUv, 0.);
    }

    // REPROJECT_END

// the user's shader to compose a final outputColor from the inputTexel and accumulatedTexel
#include <custom_compose_shader>

    gl_FragColor = vec4(vec3(outputColor), alpha);
}