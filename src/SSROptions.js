/**
 * Options of the SSR effect
 * @typedef {Object} SSROptions
 * @property {boolean} [temporalResolve=true] whether you want to use Temporal Resolving to re-use reflections from the last frames; this will reduce noise tremendously but may result in "smearing"
 * @property {Number} [temporalResolveMix] a value between 0 and 1 to set how much the last frame's reflections should be blended in; higher values will result in less noisy reflections when moving the camera but a more smeary look
 * @property {Number} [resolutionScale] resolution of the SSR effect, a resolution of 0.5 means the effect will be rendered at half resolution
 * @property {Number} [velocityResolutionScale] resolution of the velocity buffer, a resolution of 0.5 means velocity will be rendered at half resolution
 * @property {Number} [width] width of the SSREffect
 * @property {Number} [height] height of the SSREffect
 * @property {Number} [blurMix] how much the blurred reflections should be mixed with the raw reflections
 * @property {Number} [blurSharpness] exponent of the Box Blur filter; higher values will result in more sharpness
 * @property {Number} [blurKernelSize] kernel size of the Box Blur Filter; higher kernel sizes will result in blurrier reflections with more artifacts
 * @property {Number} [rayDistance] maximum distance a reflection ray can travel to find what it reflects
 * @property {Number} [intensity] intensity of the reflections
 * @property {Number} [colorExponent] exponent by which reflections will be potentiated when composing the current frame's reflections and the accumulated reflections into a final reflection; higher values will make reflections clearer by highlighting darker spots less
 * @property {Number} [maxRoughness] maximum roughness a texel can have to have reflections calculated for it
 * @property {Number} [jitter] how intense jittering should be
 * @property {Number} [jitterSpread] how much the jittered rays should be spread; higher values will give a rougher look regarding the reflections but are more expensive to compute with
 * @property {Number} [jitterRough] how intense jittering should be in relation to a material's roughness
 * @property {Number} [roughnessFadeOut] how intense reflections should be on rough spots; a higher value will make reflections fade out quicker on rough spots
 * @property {Number} [rayFadeOut] how much reflections will fade out by distance
 * @property {Number} [MAX_STEPS] number of steps a reflection ray can maximally do to find an object it intersected (and thus reflects)
 * @property {Number} [NUM_BINARY_SEARCH_STEPS] once we had our ray intersect something, we need to find the exact point in space it intersected and thus it reflects; this can be done through binary search with the given number of maximum steps
 * @property {Number} [maxDepthDifference] maximum depth difference between a ray and the particular depth at its screen position after refining with binary search; higher values will result in better performance
 * @property {Number} [thickness] maximum depth difference between a ray and the particular depth at its screen position before refining with binary search; higher values will result in better performance
 * @property {Number} [ior] Index of Refraction, used for calculating fresnel; reflections tend to be more intense the steeper the angle between them and the viewer is, the ior parameter sets how much the intensity varies
 * @property {boolean} [ALLOW_MISSED_RAYS] if there should still be reflections for rays for which a reflecting point couldn't be found; enabling this will result in stretched looking reflections which can look good or bad depending on the angle
 * @property {boolean} [USE_MRT] WebGL2 only - whether to use multiple render targets when rendering the G-buffers (normals, depth and roughness); using them can improve performance as they will render all information to multiple buffers for each fragment in one run; this setting can't be changed during run-time
 * @property {boolean} [USE_NORMALMAP] if roughness maps should be taken account of when calculating reflections
 * @property {boolean} [USE_ROUGHNESSMAP] if normal maps should be taken account of when calculating reflections
 */

/**
 * The options of the SSR effect
 * @type {SSROptions}
 */
export const defaultSSROptions = {
	temporalResolve: true,
	temporalResolveMix: 0.9,
	temporalResolveCorrection: 1,
	resolutionScale: 1,
	velocityResolutionScale: 1,
	width: typeof window !== "undefined" ? window.innerWidth : 2000,
	height: typeof window !== "undefined" ? window.innerHeight : 1000,
	blurMix: 0.5,
	blurSharpness: 10,
	blurKernelSize: 1,
	rayDistance: 0.1,
	intensity: 1,
	colorExponent: 1,
	maxRoughness: 0.1,
	jitter: 0.1,
	jitterSpread: 0.1,
	jitterRough: 0,
	roughnessFadeOut: 1,
	rayFadeOut: 0,
	MAX_STEPS: 20,
	NUM_BINARY_SEARCH_STEPS: 5,
	maxDepthDifference: 10,
	thickness: 10,
	ior: 1.45,
	ALLOW_MISSED_RAYS: true,
	USE_MRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}
