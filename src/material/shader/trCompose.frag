// the compose shader when Temporal Resolve is enabled
alpha = (velocityDisocclusion < FLOAT_EPSILON) ? (alpha + 0.05) : (alpha - 0.05);
alpha = clamp(alpha, 0., 1.);

if ((length(accumulatedColor) > FLOAT_EPSILON && length(inputColor) == 0.)) {
    accumulatedColor = undoColorTransform(accumulatedColor);

    float alphaVal = canReproject ? alpha : 0.;
    gl_FragColor = vec4(accumulatedColor, alpha);
    return;
}

if (alpha < 1.) {
    // the reflections aren't correct anymore (e.g. due to occlusion from moving object) so we need to have inputTexel influence the reflections more
    outputColor = mix(accumulatedColor, inputColor, (1. - alpha) * 0.25);
} else if (1. / samples >= 1. - temporalResolveMix) {
    // the default way to sample the reflections evenly for the first "1 / temporalResolveMix" frames
    outputColor = mix(inputColor, accumulatedColor, temporalResolveMix);
} else {
    // default method that samples quite subtly
    float mixVal = (1. / samples) / EULER;
    if (alpha < FLOAT_EPSILON && samples < 15.) mixVal += 0.3;

    outputColor = mix(accumulatedColor, inputColor, mixVal);
}