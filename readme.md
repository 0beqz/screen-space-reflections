# three.js Screen Space Reflections

Implements performant Screen Space Reflections in three.js.
<br></br>
[<img src="https://raw.githubusercontent.com/0beqz/screen-space-reflections/screenshots/1.png">](https://screen-space-reflections.vercel.app/?dancer=true)
Glossy Reflections
<br></br>
[<img src="https://raw.githubusercontent.com/0beqz/screen-space-reflections/screenshots//2.png">](https://screen-space-reflections.vercel.app/?dancer=true)
Clean Reflections
<br></br>
[<img src="https://raw.githubusercontent.com/0beqz/screen-space-reflections/screenshots//3.png">](https://screen-space-reflections.vercel.app/?desert=true)
Example scene

<br>

## Demos

- [Dancer with Animated Background](https://screen-space-reflections.vercel.app/?dancer=true)

- [Basic](https://screen-space-reflections.vercel.app/)

- [Desert](https://screen-space-reflections.vercel.app/?desert=true)

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
import { SSRPass } from "screen-space-reflections"

const composer = new POSTPROCESSING.EffectComposer(renderer)

const ssrPass = new SSRPass(scene, camera, options?)
composer.addPass(ssrPass)
```

### Options

Default values of the optional `options` parameter:

```javascript
const options = {
	temporalResolve: true,
	temporalResolveMix: 6,
	staticNoise: false,
	width: typeof window !== "undefined" ? window.innerWidth : 2000,
	height: typeof window !== "undefined" ? window.innerHeight : 1000,
	ENABLE_BLUR: true,
	blurMix: 0.5,
	blurKernelSize: 8,
	blurSharpness: 0.5,
	rayStep: 0.1,
	intensity: 1,
	maxRoughness: 0.1,
	ENABLE_JITTERING: false,
	jitter: 0.1,
	jitterSpread: 0.1,
	jitterRough: 0.1,
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

Description:

- `width`: width of the SSRPass

- `height`: height of the SSRPass

- `temporalResolve`: whether you want to use Temporal Resolving to re-use reflections from the last frames; this will reduce noise tremendously but may result in "smearing"

- `temporalResolveMix`: an integer factor used to set how much the last frame should be blended in when the camera moves; higher values will result in less noise when moving the camera but more smear

- `ENABLE_BLUR`: whether to blur the reflections and blend these blurred reflections depending on the roughness and depth of the reflection ray

- `blurMix`: how much the blurred reflections should be mixed with the raw reflections

- `blurSharpness`: the sharpness of the Bilateral Filter used to blur reflections

- `blurKernelSize`: the kernel size of the blur pass which is used to blur reflections; higher kernel sizes will result in blurrier reflections with more artifacts

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

- `USE_MRT`: WebGL2 only - whether to use multiple render targets when rendering the G-buffers (normals, depth and roughness); using them can improve performance as they will render all information to multiple buffers for each fragment in one run

- `USE_ROUGHNESSMAP`: if roughness maps should be taken account of when calculating reflections

- `USE_NORMALMAP`: if normal maps should be taken account of when calculating reflections

## Features

- Temporal Reprojection to reduce noise
- Jittering and blurring reflections to approximate glossy reflections
- Using three.js' WebGLMultipleRenderTarget (WebGL2 only) to improve performance when rendering scene normals, depth and roughness
- Early out cases to compute only possible reflections and boost performance
- Blurring reflections using Kawase Blur Pass for better performance over a Gaussian Blur Pass

## Tips

### Getting the right look

SSR usually needs a lot of tweaking before it looks alright in a scene, so using a GUI where you can easily modify all values is highly recommended.
The demo uses [tweakpane](https://cocopon.github.io/tweakpane/) as the GUI. If you want to use it, check out how it's initalized and used in the demo: https://github.com/0beqz/screen-space-reflections/blob/main/src/index.js.
<br>

### Handling noise

To smooth out noise from jittering, set the `blurKernelSize` to 2 or 3 and increase `maxRoughness` precisely while using rather low values for `blurWidth` and `blurHeight`. This will blur out reflections the "deeper" they are.
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

## Todos

- [x] Add Temporal Filtering to reduce noise
- [x] Use a Bilateral Filter to reduce noise
- [ ] Reprojection: support skinned meshes
- [x] Reprojection blend moving objects well
- [ ] Reprojection: support for video textures
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
