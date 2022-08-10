alpha = velocityDisocclusion < FLOAT_EPSILON ? (alpha + 0.0075) : 0.0;
alpha = clamp(alpha, 0.0, 1.0);

float m = mix(alpha * alpha, 1.0, blend);

#ifdef boxBlur
if (alpha == 0.0) {
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);

    float lum = dot(inputTexel.rgb, W);
    float lum2 = dot(accumulatedTexel.rgb, W);
    float lumDiff = abs(lum - lum2);

    lumDiff = min(1.0, lumDiff);

    inputColor = mix(inputColor, boxBlurredColor, lumDiff);
}
#endif

if (alpha == 1.0) m = 1.0;

// if there's been an abrupt change (e.g. teleporting) then we need to fully use the input color
if (velocityDisocclusion > 0.5) m = 0.0;

outputColor = accumulatedColor * m + inputColor * (1.0 - m);