uniform float blurMix;
uniform float blurSharpness;
uniform int blurKernelSize;

// algorithm is from: https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/denoise.js
vec3 denoise(vec3 center, sampler2D tex, vec2 uv, vec2 texSize) {
    vec3 color;
    float total;
    vec3 col;
    float weight;

    for (int x = -blurKernelSize; x <= blurKernelSize; x++) {
        for (int y = -blurKernelSize; y <= blurKernelSize; y++) {
            col = textureLod(tex, uv + vec2(x, y) / texSize, 0.).rgb;
            weight = 1.0 - abs(dot(col - center, vec3(0.25)));
            weight = pow(weight, blurSharpness);
            color += col * weight;
            total += weight;
        }
    }

    return color / total;
}