#define INV_EULER 0.36787944117144233

alpha = velocityDisocclusion < FLOAT_EPSILON ? (alpha + 0.0075) : 0.0;
alpha = clamp(alpha, 0.0, 1.0);

bool needsBlur = !didReproject || velocityDisocclusion > 0.5;

#ifdef boxBlur
if (alpha == 0.) {
    if (needsBlur) {
        inputColor = boxBlurredColor;
    } else {
        const vec3 W = vec3(0.2125, 0.7154, 0.0721);

        float lum = dot(inputTexel.rgb, W);
        float lum2 = dot(accumulatedTexel.rgb, W);
        float lumDiff = abs(lum - lum2);

        lumDiff = min(1.0, lumDiff);

        inputColor = mix(inputColor, boxBlurredColor, lumDiff);
    }
}
#endif

if (alpha == 1.0) {
    outputColor = accumulatedColor;
} else {
    float alphaPow = alpha * alpha;
    float m = mix(alphaPow, 1.0, blend * 0.975 + alphaPow * 0.025);

    // if there's been an abrupt change (e.g. teleporting) then we need to entirely use the input color
    if (needsBlur) m = 0.0;

    outputColor = accumulatedColor * m + inputColor * (1.0 - m);
}
