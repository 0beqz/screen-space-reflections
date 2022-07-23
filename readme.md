# three.js Screen Space Reflections

Implements performant Screen Space Reflections in three.js.
<br></br>
[<img src="https://raw.githubusercontent.com/0beqz/screen-space-reflections/screenshots/1.png">](https://screen-space-reflections.vercel.app)
<br></br>
<img src="https://raw.githubusercontent.com/0beqz/screen-space-reflections/screenshots//2.png">
<br></br>

## Demos

- [Basic](https://screen-space-reflections.vercel.app/)

- [Animated Background](https://screen-space-reflections.vercel.app/?dancer=true)

react-three-fiber demos:

- [Rover](https://codesandbox.io/s/ssr-rover-leixne?file=/src/Sophia-v1.js)

- [three.js journey scene](https://codesandbox.io/s/ssr-threejs-journey-84he6c)

## Run Locally

If you'd like to test this project and run it locally, run these commands:

```
git clone https://github.com/0beqz/screen-space-reflections
cd screen-space-reflections/example
npm i --force
npm run dev
```

## Usage

If you are using [react-three-fiber](https://github.com/pmndrs/react-three-fiber), you can also use the `SSR` component from [react-postprocessing](https://github.com/pmndrs/react-postprocessing). Check out the react-three-fiber demos to see how it's used there.
<br>

### Basic usage:

Install the package first:

```
npm i screen-space-reflections
```

Then add it to your code like so:

```javascript
import { SSREffect } from "screen-space-reflections"

const composer = new POSTPROCESSING.EffectComposer(renderer)

const ssrEffect = new SSREffect(scene, camera, options?)

const ssrPass = new POSTPROCESSING.EffectPass(camera, ssrEffect)

composer.addPass(ssrPass)
```

### Options

Default values of the optional `options` parameter:

```javascript
const options = {
	temporalResolve: true,
	temporalResolveMix: 0.9,
	temporalResolveCorrectionMix: 1,
	maxSamples: 0,
	resolutionScale: 1,
	width: typeof window !== "undefined" ? window.innerWidth : 2000,
	height: typeof window !== "undefined" ? window.innerHeight : 1000,
	ENABLE_BLUR: false,
	blurMix: 0.5,
	blurKernelSize: 8,
	blurSharpness: 0.5,
	rayStep: 0.1,
	intensity: 1,
	maxRoughness: 0.1,
	ENABLE_JITTERING: false,
	jitter: 0.1,
	jitterSpread: 0.1,
	jitterRough: 0,
	roughnessFadeOut: 1,
	rayFadeOut: 0,
	MAX_STEPS: 20,
	NUM_BINARY_SEARCH_STEPS: 5,
	maxDepthDifference: 3,
	maxDepth: 1,
	thickness: 10,
	ior: 1.45,
	STRETCH_MISSED_RAYS: true,
	USE_MRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}
```

<details>
  <summary>Description of the properties:</summary>

- `width`: width of the SSREffect

- `height`: height of the SSREffect

- `temporalResolve`: whether you want to use Temporal Resolving to re-use reflections from the last frames; this will reduce noise tremendously but may result in "smearing"

- `temporalResolveMix`: a value between 0 and 1 to set how much the last frame's reflections should be blended in; higher values will result in less noisy reflections when moving the camera but a more smeary look

- `temporalResolveCorrectionMix`: a value between 0 and 1 to set how much the reprojected reflection should be corrected; higher values will reduce smearing but will result in less flickering at reflection edges

- `maxSamples`: the maximum number of samples for reflections; settings it to 0 means unlimited samples; setting it to a value like 6 can help make camera movements less disruptive when calculating reflections

- `ENABLE_BLUR`: whether to blur the reflections and blend these blurred reflections with the raw ones depending on the blurMix value

- `blurMix`: how much the blurred reflections should be mixed with the raw reflections

- `blurSharpness`: the sharpness of the Bilateral Filter used to blur reflections

- `blurKernelSize`: the kernel size of the Bilateral Blur Filter; higher kernel sizes will result in blurrier reflections with more artifacts

- `rayStep`: how much the reflection ray should travel in each of its iteration; higher values will give deeper reflections but with more artifacts

- `intensity`: the intensity of the reflections

- `maxRoughness`: the maximum roughness a texel can have to have reflections calculated for it

- `ENABLE_JITTERING`: whether jittering is enabled; jittering will randomly jitter the reflections resulting in a more noisy but overall more realistic look, enabling jittering can be expensive depending on the view angle

- `jitter`: how intense jittering should be

- `jitterSpread`: how much the jittered rays should be spread; higher values will give a rougher look regarding the reflections but are more expensive to compute with

- `jitterRough`: how intense jittering should be in relation to a material's roughness

- `MAX_STEPS`: the number of steps a reflection ray can maximally do to find an object it intersected (and thus reflects)

- `NUM_BINARY_SEARCH_STEPS`: once we had our ray intersect something, we need to find the exact point in space it intersected and thus it reflects; this can be done through binary search with the given number of maximum steps

- `maxDepthDifference`: the maximum depth difference between a ray and the particular depth at its screen position after refining with binary search; lower values will result in better performance

- `maxDepth`: the maximum depth for which reflections will be calculated

- `thickness`: the maximum depth difference between a ray and the particular depth at its screen position before refining with binary search; lower values will result in better performance

- `ior`: Index of Refraction, used for calculating fresnel; reflections tend to be more intense the steeper the angle between them and the viewer is, the ior parameter set how much the intensity varies

- `STRETCH_MISSED_RAYS`: if there should still be reflections for rays for which a reflecting point couldn't be found; enabling this will result in stretched looking reflections which can look good or bad depending on the angle

- `USE_MRT`: WebGL2 only - whether to use multiple render targets when rendering the G-buffers (normals, depth and roughness); using them can improve performance as they will render all information to multiple buffers for each fragment in one run; this setting can't be changed during run-time

- `USE_ROUGHNESSMAP`: if roughness maps should be taken account of when calculating reflections

- `USE_NORMALMAP`: if normal maps should be taken account of when calculating reflections

</details>

<br>

## Features

- Temporal Reprojection to re-use the last frame and thus reduce noise
- Jittering and blurring reflections to approximate rough reflections
- Using three.js' WebGLMultipleRenderTarget (WebGL2 only) to improve performance when rendering scene normals, depth and roughness
- Early out cases to compute only possible reflections and boost performance
- Using an edge-preserving bilateral blur filter to keep details while blurring noise

## What's new in v2

- Introduced Temporal Reprojection to reduce noise for the reflections when moving the camera by reprojecting the last frame's reflections into the current one
- Implemented accumulative sampling by saving and re-using the last frame's reflections to accumulate especially jittered reflections over frames
- Made all SSR-related options (e.g. `thickness`, `ior`, `rayStep`,...) reactive so that you now just need to set `ssrEffect.rayStep = value` for example to update values
- Fixed jittering so that it's actually correct from all angles (it used to be less intense the higher you were looking down at a reflection)
- Removed Kawase Blur in favor of Bilateral Blur to preserve edges and keep details as the blur method of the SSR effect
- Changed the SSR implementation from a pass to an effect to improve performance
- Optimizations regarding computation of required buffers and reflections

## Tips

<details>
  <summary>Expand to view tips</summary>

### Getting the right look

SSR usually needs a lot of tweaking before it looks alright in a scene, so using a GUI where you can easily modify all values is highly recommended.
The demo uses [tweakpane](https://cocopon.github.io/tweakpane/) as the GUI. If you want to use it, check out how it's initalized and used in the demo: https://github.com/0beqz/screen-space-reflections/blob/main/example/main.js.
<br>

### Getting rid of artifacts

If you are getting artifacts, for example:
<br>
<img src="https://raw.githubusercontent.com/0beqz/screen-space-reflections/screenshots//artifacts.png" width="50%">

Then try the following:

- increase `thickness`
- increase `maxDepthDifference`
- increase `maxDepth` or set it directly to 1
- decrease `rayStep` and increase `MAX_STEPS` if reflections are cutting off now
- increase `NUM_BINARY_SEARCH_STEPS`

Keep in mind that increasing these values will have an impact on performance.
<br>

### Hiding missing reflections

Since SSR only works with screen-space information, there'll be artifacts when there's no scene information for a reflection ray.
This usually happens when another objects occludes a reflecting object behind it.
<br>
To make missing reflections less apparent, use an env-map that can then be used as a fallback when there is no reflection.
Ideally use a box-projected env-map.

Here are two implementations for three.js and react-three-fiber:

- [Gist to include box-projected env-maps in three.js](https://gist.github.com/0beqz/8d51b4ae16d68021a09fb504af708fca)
- [useBoxProjectedEnv in react-three-fiber](https://github.com/pmndrs/drei#useboxprojectedenv)
  <br>

### Getting updated reflections for animated materials

By default, the SSR effect won't really update reflections if the camera is not moving and no mesh in the view is moving.
However, it will check if a mesh's material's map is a `VideoTexture` and will keep its reflections updated each frame.
If your material is not using a `VideoTexture` but is still animated (e.g. it's a custom animated shader material), then you can get updated reflections for it by setting
`mesh.material.userData.needsUpdatedReflections = true`. This will make the SSR effect recalculate its reflections each frame.

### Server Side Rendering and `window` being undefined

If you are using Server Side Rendering and don't have access to the `window` object then the SSR effect won't be able to set the correct width and height for its passes.
So once you have access to the `window` object, set the correct width and height of the SSR effect using:

```javascript
ssrEffect.setSize(window.innerWidth, window.innerHeight)
```

  </details>
  <br>

## Todos

- [ ] Reprojection: support skinned meshes
- [ ] Proper upsampling to still get quality reflections when using half-res buffers

## Credits

- SSR code: [Screen Space Reflections on Epsilon Engine](https://imanolfotia.com/blog/1)

- Edge fade for SSR: [kode80](http://kode80.com/blog/)

- Velocity Shader: [three.js sandbox](https://github.com/gkjohnson/threejs-sandbox)

- Bilateral Blur Filter: [gl_ssao](https://github.com/nvpro-samples/gl_ssao/blob/master/bilateralblur.frag.glsl)

- Video texture: [Uzunov Rostislav](https://www.pexels.com/@rostislav/)

## Resources

### Screen Space Reflections in general

- [Rendering view dependent reflections using the graphics card](https://kola.opus.hbz-nrw.de/opus45-kola/frontdoor/deliver/index/docId/908/file/BA_GuidoSchmidt.pdf)

- [Screen Space Reflections in Unity 5](http://www.kode80.com/blog/2015/03/11/screen-space-reflections-in-unity-5/)

- [Screen Space Glossy Reflections](http://roar11.com/2015/07/screen-space-glossy-reflections/)

- [Screen Space Reflection (SSR)](https://lettier.github.io/3d-game-shaders-for-beginners/screen-space-reflection.html)

- [Approximating ray traced reflections using screenspace data](https://publications.lib.chalmers.se/records/fulltext/193772/193772.pdf)

- [Screen Space Reflection Techniques](https://ourspace.uregina.ca/bitstream/handle/10294/9245/Beug_Anthony_MSC_CS_Spring2020.pdf)

- [Shiny Pixels and Beyond: Real-Time Raytracing at SEED](https://media.contentapi.ea.com/content/dam/ea/seed/presentations/dd18-seed-raytracing-in-hybrid-real-time-rendering.pdf)

- [DD2018: Tomasz Stachowiak - Stochastic all the things: raytracing in hybrid real-time rendering (YouTube)](https://www.youtube.com/watch?v=MyTOGHqyquU)

### Temporal Reprojection

- [Temporal Reprojection Anti-Aliasing in INSIDE](http://s3.amazonaws.com/arena-attachments/655504/c5c71c5507f0f8bf344252958254fb7d.pdf?1468341463)

- [Reprojecting Reflections](http://bitsquid.blogspot.com/2017/06/reprojecting-reflections_22.html)

- [Temporal AA (Unreal Engine 4)](https://de45xmedrsdbp.cloudfront.net/Resources/files/TemporalAA_small-59732822.pdf)

- [Temporally Reliable Motion Vectors for Real-time Ray Tracing](https://sites.cs.ucsb.edu/~lingqi/publications/paper_trmv.pdf)

- [Temporal AA and the quest for the Holy Trail](https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/)

- [Visibility TAA and Upsampling with Subsample History](http://filmicworlds.com/blog/visibility-taa-and-upsampling-with-subsample-history/)

- [Temporal Anti Aliasing – Step by Step](https://ziyadbarakat.wordpress.com/2020/07/28/temporal-anti-aliasing-step-by-step/)
