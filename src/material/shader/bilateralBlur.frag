/*
 * Copyright (c) 2014-2021, NVIDIA CORPORATION.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-FileCopyrightText: Copyright (c) 2014-2021 NVIDIA CORPORATION
 * SPDX-License-Identifier: Apache-2.0
 */

const float KERNEL_RADIUS = 5.;

uniform float g_Sharpness;
uniform vec2 g_InvResolutionDirection;  // either set x to 1/width or y to 1/height
uniform float kernelRadius;

uniform float cameraNear;
uniform float cameraFar;

float getViewZ(const float depth) {
    return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
}

// source: https://github.com/CesiumGS/cesium/blob/main/Source/Shaders/Builtin/Functions/luminance.glsl
float czm_luminance(vec3 rgb) {
    // Algorithm from Chapter 10 of Graphics Shaders.
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    return dot(rgb, W);
}

vec4 BlurFunction(sampler2D texSource, sampler2D texLinearDepth, vec2 uv, float r, vec4 center_c, float center_d, inout float w_total, in float radius) {
    vec4 c = texture2D(texSource, uv);
    float d = getViewZ(1. / unpackRGBAToDepth(texture2D(texLinearDepth, uv)));

    float BlurSigma = radius * 0.5;
    float BlurFalloff = 1.0 / (2.0 * BlurSigma * BlurSigma);

    float ddiff = (d - center_d) * g_Sharpness * 5.;
    float w = exp2(-r * r * BlurFalloff - ddiff * ddiff);
    w_total += w;

    return c * w;
}

vec4 blur(sampler2D blurTexture, sampler2D depthTexture) {
    vec4 center_c = texture2D(blurTexture, vUv);
    float center_d = getViewZ(1. / unpackRGBAToDepth(texture2D(depthTexture, vUv)));
    float luminance = czm_luminance(center_c.rgb);

    float radius = kernelRadius;  //(1. - mix(luminance * luminance, 0., 0.5)) * kernelRadius + 1.;

    vec4 c_total = center_c;
    float w_total = 1.0;

    vec2 uv;

    for (float r = 1.; r <= radius; ++r) {
        uv = vUv + g_InvResolutionDirection * r;
        c_total += BlurFunction(blurTexture, depthTexture, uv, r, center_c, center_d, w_total, radius);
    }

    for (float r = 1.; r <= radius; ++r) {
        uv = vUv - g_InvResolutionDirection * r;
        c_total += BlurFunction(blurTexture, depthTexture, uv, r, center_c, center_d, w_total, radius);
    }

    return c_total / w_total;
}