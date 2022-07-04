#define EULER 2.718281828459045
#define FLOAT_EPSILON 0.00001

uniform sampler2D inputBuffer;
uniform sampler2D lastFrameReflectionsBuffer;
uniform sampler2D velocityBuffer;

uniform float samples;

varying vec2 vUv;

void main() {
    vec4 inputTexel = texture2D(inputBuffer, vUv);
    vec4 lastFrameReflectionsTexel = texture2D(lastFrameReflectionsBuffer, vUv);

#ifdef TEMPORAL_RESOLVE
    vec2 velUv = texture2D(velocityBuffer, vUv).xy;
    vec2 reprojectedUv = vUv - velUv;

    if (reprojectedUv.x >= 0. && reprojectedUv.x <= 1. && reprojectedUv.y >= 0. && reprojectedUv.y <= 1.) {
        vec4 lastFrameReflectionsProjectedTexel = texture2D(lastFrameReflectionsBuffer, reprojectedUv);

        lastFrameReflectionsTexel.rgb += lastFrameReflectionsProjectedTexel.rgb;
        lastFrameReflectionsTexel.rgb /= 2.;
    }

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

    vec3 newColor;
    float movementSpeed = dot(velUv, velUv);
    float blurMix = 0.;

    if (alpha > 0.) {
        newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);
    }

    blurMix = mix(lastFrameReflectionsTexel.a, inputTexel.a + 0.5, mixVal);

    if (length(lastFrameReflectionsTexel.rgb) < 0.001) {
        newColor = mix(lastFrameReflectionsTexel.rgb, lastFrameReflectionsTexel.rgb + inputTexel.rgb, min(1., 0.1 + movementSpeed * 100.));
    }

    // newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);

    gl_FragColor = vec4(newColor, alpha);
#else
    gl_FragColor = vec4(inputTexel.rgb, inputTexel.a);
#endif
}