// a basic shader to implement temporal resolving

uniform sampler2D inputTexture;
uniform sampler2D accumulatedTexture;
uniform sampler2D velocityTexture;
uniform sampler2D lastVelocityTexture;

uniform float temporalResolveCorrection;
uniform vec2 invTexSize;
uniform float colorExponent;

uniform mat4 curInverseProjectionMatrix;
uniform mat4 curCameraMatrixWorld;
uniform mat4 prevInverseProjectionMatrix;
uniform mat4 prevCameraMatrixWorld;

varying vec2 vUv;

#include <packing>

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

vec3 transformColorExponent;
vec3 undoColorTransformExponent;

// idea from: https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/
vec3 transformColor(vec3 color) {
    if (colorExponent == 1.) return color;

    return pow(color, transformColorExponent);
}

vec3 undoColorTransform(vec3 color) {
    if (colorExponent == 1.) return color;

    return pow(color, undoColorTransformExponent);
}

void main() {
    transformColorExponent = vec3(1. / colorExponent);
    undoColorTransformExponent = vec3(colorExponent);

    vec4 inputTexel = textureLod(inputTexture, vUv, 0.);

    vec3 inputColor = transformColor(inputTexel.rgb);
    vec3 accumulatedColor;
    vec3 outputColor;

    vec4 velocity;
    vec4 lastVelocity;
    vec2 lastVelUv;

    // REPROJECT_START

#ifdef DILATION
    velocity = getDilatedTexture(velocityTexture, vUv, invTexSize);
#else
    velocity = textureLod(velocityTexture, vUv, 0.);
#endif

    vec2 velUv = velocity.xy;
    vec2 reprojectedUv = vUv - velUv;

#ifdef DILATION
    lastVelocity = getDilatedTexture(lastVelocityTexture, reprojectedUv, invTexSize);
#else
    lastVelocity = textureLod(lastVelocityTexture, reprojectedUv, 0.);
#endif

    lastVelUv = lastVelocity.xy;

    float velocityLength = length(lastVelUv - velUv);

    // idea from: https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/
    float velocityDisocclusion = (velocityLength - 0.000005) * 10.;
    velocityDisocclusion *= velocityDisocclusion;

    bool canReproject = reprojectedUv.x >= 0. && reprojectedUv.x <= 1. && reprojectedUv.y >= 0. && reprojectedUv.y <= 1.;

    float movement = length(velUv) * 100.;
    bool isMoving = velocityDisocclusion > 0.001 || movement > 0.001;

    float alpha = inputTexel.a;

    vec3 boxBlurredColor = inputColor;

    if (isMoving) {
        vec3 minNeighborColor = inputColor;
        vec3 maxNeighborColor = inputColor;

        vec2 neighborUv;
        vec3 col;

        for (int x = -CLAMP_RADIUS; x <= CLAMP_RADIUS; x++) {
            for (int y = -CLAMP_RADIUS; y <= CLAMP_RADIUS; y++) {
                if (x != 0 || y != 0) {
                    neighborUv = vUv + vec2(x, y) * invTexSize;

                    col = textureLod(inputTexture, neighborUv, 0.).xyz;
                    col = transformColor(col);

                    if (canReproject) {
                        minNeighborColor = min(col, minNeighborColor);
                        maxNeighborColor = max(col, maxNeighborColor);
                    }

                    boxBlurredColor += col;
                }
            }
        }

        float pxRadius = pow(float(CLAMP_RADIUS * 2 + 1), 2.);
        boxBlurredColor /= pxRadius;

        // check if reprojecting is necessary (due to movement) and that the reprojected UV is valid
        if (canReproject) {
            vec4 accumulatedTexel = textureLod(accumulatedTexture, reprojectedUv, 0.);
            // alpha = min(alpha, accumulatedTexel.a);
            accumulatedColor = transformColor(accumulatedTexel.rgb);

            vec3 clampedColor = clamp(accumulatedColor, minNeighborColor, maxNeighborColor);

            float mixFactor = temporalResolveCorrection * (1. + movement);
            mixFactor = min(mixFactor, 1.);

            accumulatedColor = mix(accumulatedColor, clampedColor, mixFactor);
        } else {
            // reprojected UV coordinates are outside of screen
            accumulatedColor = boxBlurredColor;
        }
    } else {
        // there was no movement so no checks and clamping need to be done
        accumulatedColor = transformColor(textureLod(accumulatedTexture, vUv, 0.).rgb);
    }

    if (velocity.r > 1. - FLOAT_EPSILON && velocity.g > 1. - FLOAT_EPSILON) {
        alpha = 0.;
        velocityDisocclusion = 10.0e10;
        movement = 10.0e10;
    }

    // REPROJECT_END

// the user's shader to compose a final outputColor from the inputTexel and accumulatedTexel
#include <custom_compose_shader>

    gl_FragColor = vec4(undoColorTransform(outputColor), alpha);
}