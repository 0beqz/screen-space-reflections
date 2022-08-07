// the default compose shader when Temporal Resolve is disabled
alpha = samples < 2. || movement < FLOAT_EPSILON ? (0.05 + alpha) : 0.;

if (maxSamples != 0. && samples > maxSamples && alpha > 1. - FLOAT_EPSILON) {
    outputColor = accumulatedColor;
} else {
    // smoothing for higher samples to get rid of "bland reflections" after a high amount of samples
    float samplesMultiplier = pow(samples / 32., 4.) + 1.;
    if (samples > 1. && alpha > 1. - FLOAT_EPSILON) {
        outputColor = accumulatedColor * (1. - 1. / (samples * samplesMultiplier)) + inputColor / (samples * samplesMultiplier);
    } else {
        outputColor = inputColor;
    }
}