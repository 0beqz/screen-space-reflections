// a basic shader to implement temporal resolving

uniform sampler2D inputTexture;
uniform sampler2D accumulatedTexture;
uniform sampler2D velocityTexture;
uniform sampler2D lastVelocityTexture;

uniform float temporalResolveCorrectionMix;
uniform vec2 invTexSize;

varying vec2 vUv;

#include <packing>

#define USE_VELOCITY true
#define USE_LAST_VELOCITY true

#ifdef DILATION
// source: https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/ (modified to GLSL)
vec4 getDilatedTexture(sampler2D tex, vec2 uv, vec2 invTexSize) {
    float closestDepth = 0.;
    vec2 closestNeighborUv;
    vec2 neighborUv;
    float neighborDepth;

    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            neighborUv = vUv + vec2(x, y) * invTexSize;
            neighborDepth = textureLod(tex, neighborUv, 0.).b;

            if (neighborDepth > closestDepth) {
                closestNeighborUv = neighborUv;
                closestDepth = neighborDepth;
            }
        }
    }

    return textureLod(tex, closestNeighborUv, 0.);
}
#endif

const vec3 transformColorExponent = vec3(1. / 2.);
const vec3 undoColorTransformExponent = vec3(2.);

// idea from: https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/
vec3 transformColor(vec3 color) {
    return pow(color, transformColorExponent);
}

vec3 undoColorTransform(vec3 color) {
    return pow(color, undoColorTransformExponent);
}

void main() {
    ivec2 size = textureSize(inputTexture, 0);

    vec4 inputTexel = textureLod(inputTexture, vUv, 0.);

    vec3 inputColor = transformColor(inputTexel.rgb);
    vec3 accumulatedColor;
    vec3 outputColor;

    vec4 velocity;
    vec2 lastVelUv;

    // REPROJECT_START
    vec2 pxSize = vec2(float(size.x), float(size.y));

#ifdef USE_VELOCITY
#ifdef DILATION
    velocity = getDilatedTexture(velocityTexture, vUv, invTexSize);
#else
    velocity = textureLod(velocityTexture, vUv, 0.);
#endif
#endif

    vec2 velUv = velocity.xy;
    vec2 reprojectedUv = vUv - velUv;
    float velocityLength = length(lastVelUv - velUv);

#ifdef USE_LAST_VELOCITY
#ifdef DILATION
    lastVelUv = getDilatedTexture(lastVelocityTexture, reprojectedUv, invTexSize).xy;
#else
    lastVelUv = textureLod(lastVelocityTexture, reprojectedUv, 0.).xy;
#endif
#endif

    // idea from: https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/
    float velocityDisocclusion = (velocityLength - 0.000005) * 10.;
    velocityDisocclusion *= velocityDisocclusion;

    bool canReproject = reprojectedUv.x >= 0. && reprojectedUv.x <= 1. && reprojectedUv.y >= 0. && reprojectedUv.y <= 1.;

    float movement = length(velUv) * 100.;
    bool isMoving = velocityDisocclusion > 0.001 || movement > 0.001;

    float alpha = inputTexel.a;

    if (isMoving) {
        vec3 minNeighborColor = inputColor;
        vec3 maxNeighborColor = inputColor;

        vec2 neighborUv;
        vec3 col;

        const int radius = 1;
        vec3 boxBlurredColor;

        for (int x = -radius; x <= radius; x++) {
            for (int y = -radius; y <= radius; y++) {
                if (x != 0 || y != 0) {
                    neighborUv = vUv + vec2(x, y) * invTexSize;

                    col = textureLod(inputTexture, neighborUv, 0.).xyz;
                    col = transformColor(col);

                    if (canReproject) {
                        minNeighborColor = min(col, minNeighborColor);
                        maxNeighborColor = max(col, maxNeighborColor);
                    } else {
                        boxBlurredColor += col;
                    }
                }
            }
        }

        // check if reprojecting is necessary (due to movement) and that the reprojected UV is valid
        if (canReproject) {
            vec4 accumulatedTexel = textureLod(accumulatedTexture, reprojectedUv, 0.);
            alpha = min(alpha, accumulatedTexel.a);
            accumulatedColor = transformColor(accumulatedTexel.rgb);

            vec3 clampedColor = clamp(accumulatedColor, minNeighborColor, maxNeighborColor);

            float mixFactor = temporalResolveCorrectionMix * (1. + movement);
            mixFactor = min(mixFactor, 1.);

            accumulatedColor = mix(accumulatedColor, clampedColor, mixFactor);
        } else {
            // reprojected UV coordinates are outside of screen
            float pxRadius = pow(float(radius * 2 + 1), 2.);
            accumulatedColor = boxBlurredColor / pxRadius;
        }
    } else {
        // there was no movement so no checks and clamping need to be done
        accumulatedColor = transformColor(textureLod(accumulatedTexture, vUv, 0.).rgb);
    }

    // REPROJECT_END

// the user's shader to compose a final outputColor from the inputTexel and accumulatedTexel
#include <custom_compose_shader>

    gl_FragColor = vec4(undoColorTransform(outputColor), 1.);
}