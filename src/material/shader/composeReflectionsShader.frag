#define EULER 2.718281828459045

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
    vec4 lastFrameReflectionsProjectedTexel = texture2D(lastFrameReflectionsBuffer, vUv - velUv);
    lastFrameReflectionsTexel.rgb += lastFrameReflectionsProjectedTexel.rgb;
    lastFrameReflectionsTexel.rgb /= 2.;

    float mixVal = 1. / samples;
    mixVal /= EULER;

    vec3 newColor = mix(lastFrameReflectionsTexel.rgb, inputTexel.rgb, mixVal);

    // alternative sampling option - not using it as ther's much more noise when moving camera
    // newColor = lastFrameReflectionsTexel.rgb * (1. - 1. / samples) + inputTexel.rgb / samples;

    if (length(lastFrameReflectionsTexel.rgb) < 0.001) {
        newColor = mix(lastFrameReflectionsTexel.rgb, lastFrameReflectionsTexel.rgb + inputTexel.rgb, 0.25);
    }

    float blurMix = mix(lastFrameReflectionsTexel.a, inputTexel.a + 0.5, mixVal);
    gl_FragColor = vec4(newColor, blurMix);
#else
    gl_FragColor = vec4(inputTexel.rgb, inputTexel.a);
#endif
}