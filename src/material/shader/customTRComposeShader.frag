// the compose shader when Temporal Resolve is enabled

float alpha = min(inputTexel.a, accumulatedTexel.a);
alpha = didReproject && (samples < 4. || velocityDisocclusion < FLOAT_EPSILON) ? (0.05 + alpha) : 0.;

if (maxSamples != 0. && samples > maxSamples && alpha > 1. - FLOAT_EPSILON) {
    gl_FragColor = accumulatedTexel;
    return;
}

if (!didReproject) {
    gl_FragColor = vec4(averageNeighborColor, alpha);
    return;
}

if (length(accumulatedTexel.rgb) > FLOAT_EPSILON && length(inputTexel.rgb) == 0.) {
    gl_FragColor = accumulatedTexel;
    return;
}

if (alpha < 1.) {
    // the reflections aren't correct anymore (e.g. due to occlusion from moving object) so we need to have inputTexel influence the reflections more
    outputColor = mix(accumulatedTexel.rgb, inputTexel.rgb, (1. - alpha * alpha) * temporalResolveCorrectionMix);
} else if (samples > 4. && movement < FLOAT_EPSILON && length(accumulatedTexel.rgb) < FLOAT_EPSILON) {
    // this will prevent the appearing of distracting colorful dots around the edge of a reflection once the camera has stopped moving
    outputColor = accumulatedTexel.rgb;
} else if (1. / samples >= 1. - temporalResolveMix) {
    // the default way to sample the reflections evenly for the first "1 / temporalResolveMix" frames
    outputColor = accumulatedTexel.rgb * temporalResolveMix + inputTexel.rgb * (1. - temporalResolveMix);
} else {
    // default method that samples quite subtly
    float mixVal = (1. / samples) / EULER;
    if (alpha < FLOAT_EPSILON && samples < 15.) mixVal += 0.3;

    outputColor = mix(accumulatedTexel.rgb, inputTexel.rgb, mixVal);
}