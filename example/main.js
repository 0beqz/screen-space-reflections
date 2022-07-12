import * as POSTPROCESSING from "postprocessing"
import { SSRPass } from "screen-space-reflections"
import Stats from "stats.js"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { Pane } from "tweakpane"
import { defaultSSROptions } from "../src/SSRPass"
import "./style.css"

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()

	renderer.setSize(window.innerWidth, window.innerHeight)
	ssrPass.setSize(window.innerWidth, window.innerHeight)
})

const scene = new THREE.Scene()
window.scene = scene
scene.add(new THREE.AmbientLight())

const hemiLight = new THREE.HemisphereLight(0x443333, 0x111122)
scene.add(hemiLight)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)

scene.add(camera)
scene.autoUpdate = false
window.camera = camera

const canvas = document.querySelector(".webgl")

let rendererCanvas

// use an offscreen canvas if available
if (window.OffscreenCanvas) {
	rendererCanvas = canvas.transferControlToOffscreen()
	rendererCanvas.style = canvas.style
} else {
	rendererCanvas = canvas
}

// Renderer
const renderer = new THREE.WebGLRenderer({
	canvas: rendererCanvas,
	powerPreference: "high-performance",
	premultipliedAlpha: false,
	depth: false,
	stencil: false,
	antialias: false,
	preserveDrawingBuffer: true
})
window.renderer = renderer

renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)

// since using "rendererCanvas" doesn't work when using an offscreen canvas
const controls = new OrbitControls(camera, document.querySelector("#orbitControlsDomElem"))
window.controls = controls

const composer = new POSTPROCESSING.EffectComposer(renderer)
window.composer = composer
const renderPass = new POSTPROCESSING.RenderPass(scene, camera)
composer.addPass(renderPass)

new POSTPROCESSING.LUT3dlLoader().load("starwars.3dl", lutTexture => {
	const lutEffect = new POSTPROCESSING.LUTEffect(lutTexture)

	let bloom1Options = {
		intensity: 0.3,
		blendFunction: POSTPROCESSING.BlendFunction.SCREEN,
		kernelSize: POSTPROCESSING.KernelSize.HUGE,
		luminanceThreshold: 0.26,
		luminanceSmoothing: 0.5,
		width: 600,
		height: 400
	}

	let bloomEffect = new POSTPROCESSING.BloomEffect(bloom1Options)

	composer.addPass(
		new POSTPROCESSING.EffectPass(
			camera,
			// lutEffect,
			bloomEffect,
			new POSTPROCESSING.VignetteEffect({ offset: 0.4, darkness: 0.35 })
		)
	)
})

let params = {
	enabled: true,
	floorRoughness: 1,
	floorNormalScale: 1,
	antialias: false,

	width: window.innerWidth,
	height: window.innerHeight,
	temporalResolve: true,
	temporalResolveMixSamples: 6,
	maxSamples: 0,
	staticNoise: false,
	ENABLE_BLUR: true,
	blurMix: 0.5,
	blurKernelSize: 5,
	blurSharpness: 7.07,
	rayStep: 0.534,
	intensity: 1,
	maxRoughness: 0.99,
	ENABLE_JITTERING: true,
	jitter: 0,
	jitterRough: 2,
	jitterSpread: 3.37,
	roughnessFadeOut: 0.51,
	rayFadeOut: 1.03,
	maxDepth: 1,
	thickness: 3.5,
	ior: 2,
	rayFadeOut: 0,
	MAX_STEPS: 25,
	NUM_BINARY_SEARCH_STEPS: 7,
	maxDepthDifference: 3,
	STRETCH_MISSED_RAYS: false,
	floorRoughness: 2.6,
	floorNormalScale: 0,
	useMRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}

// params.jitter = 0
// params.jitterRough = 3
// params.jitterSpread = 0.72
// params.rayStep = 0.093
// params.intensity = 1.45
// params.ior = 2.01
// params.rayStep = 0.093
// params.rayFadeOut = 0.07
// params.MAX_STEPS = 128
// params.NUM_BINARY_SEARCH_STEPS = 0

camera.position.set(11.002333350656253, 2.406571150547438, -2.833099999666251)
controls.target.set(-0.0036586000844819433, 1.006404176473826, 0.46503426700631345)

// camera.position.set(-44.97245046706518, -1.5838993198634246, 15.961596242069124)
// controls.target.set(-44.6043968840537, -1.421013025386915, 25.31290598262705)

const defaultParams = { ...params }

const ssrPass = new SSRPass(scene, camera, params)
composer.addPass(ssrPass)
window.ssrPass = ssrPass

const gltflLoader = new GLTFLoader()

let floorMesh
let emitterMesh

gltflLoader.load("scene.glb", asset => {
	scene.add(asset.scene)
	asset.scene.traverse(c => {
		if (c.material) {
			c.material.normalScale.setScalar(1)
			if (c.name.includes("heli") || c.name.includes("plane")) {
				c.material.roughness = 0.1
				c.material.metalness = 1
				c.material.color.multiplyScalar(0.075)
			}

			// c.material.roughness = 0.2
			// c.material.metalness = 0.9
			// c.material.color.setScalar(0.8)
			// c.material.normalScale.setScalar(2.5)

			if (c.material.name.toLowerCase().includes("shd")) {
				c.material.roughness = 0.1
				c.material.metalness = 0.6
				c.material.color.multiplyScalar(0.08)
			}
		}

		c.updateMatrixWorld()

		if (c.name === "Plane") floorMesh = c

		if (c.name === "Cube") {
			emitterMesh = c
			c.material.emissiveMap = null
			c.material.emissive.setScalar(0)
			c.material.roughness = 3

			c.material.side = THREE.FrontSide
		}
	})

	const box = new THREE.Mesh(
		new THREE.BoxBufferGeometry(2, 2, 2),
		new THREE.MeshStandardMaterial({
			color: 0,
			metalness: 1,
			roughness: 0
		})
	)
	box.position.set(4, 1, 4)
	box.updateMatrixWorld()

	const box2 = new THREE.Mesh(
		new THREE.CylinderBufferGeometry(0.5, 0.5, 3, 32, 32),
		new THREE.MeshStandardMaterial({
			color: 0,
			metalness: 1,
			roughness: 0
		})
	)
	box2.position.set(4, 1, -3.5)
	box2.updateMatrixWorld()

	box.name = "box"

	scene.add(box)
	scene.add(box2)

	// if (floorMesh) floorMesh.material.roughness = 0
	// if (floorMesh) floorMesh.material.roughnessMap = null
	// floorMesh.material.map.repeat.setScalar(16)

	loop()

	const urlParams = new URLSearchParams(window.location.search)
	if (urlParams.get("dancer") === "true") useVideoBackgroundAndDancer()
})

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

// new RGBELoader().load("env.hdr", tex => {
// 	const envMap = pmremGenerator.fromEquirectangular(tex).texture
// 	envMap.minFilter = THREE.LinearFilter

// 	scene.environment = envMap
// 	scene.background = envMap
// })

let mixer
let skinMesh
let didLoadVideoBackgroundAndDancer = false

const useVideoBackgroundAndDancer = () => {
	for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]

	params.ENABLE_BLUR = true
	params.blurKernelSize = 2
	params.ENABLE_JITTERING = true
	params.jitter = 0.18
	params.jitterRough = 0.36
	params.jitterSpread = 0.34
	params.intensity = 2
	params.roughnessFadeOut = 1
	params.rayFadeOut = 1.14
	params.MAX_STEPS = 64
	params.rayStep = 0.2

	params.ior = 1.23

	params.floorRoughness = 1.5
	params.floorNormalScale = 1.85

	pane.refresh()

	if (didLoadVideoBackgroundAndDancer) return
	didLoadVideoBackgroundAndDancer = true

	const video = document.getElementById("video")
	video.src = "video.mp4"
	video.playbackRate = 2
	video.play()
	window.video = video
	const videoTexture = new THREE.VideoTexture(video)
	emitterMesh.material.map = videoTexture

	gltflLoader.load("skin.glb", asset => {
		skinMesh = asset.scene
		skinMesh.scale.multiplyScalar(2.1)
		skinMesh.position.set(2.5, 0, 0)
		skinMesh.rotation.y += Math.PI / 2
		skinMesh.updateMatrixWorld()
		skinMesh.traverse(c => {
			if (c.material) {
				c.material.roughness = 0
				c.material.metalness = 1
			}
		})
		scene.add(asset.scene)
		mixer = new THREE.AnimationMixer(skinMesh)
		const clips = asset.animations

		const action = mixer.clipAction(clips[0])
		action.play()
	})
}

const pane = new Pane()
window.pane = pane
pane.containerElem_.style.userSelect = "none"

pane.on("change", ev => {
	const { presetKey } = ev

	if (Object.keys(defaultSSROptions).includes(presetKey)) {
		ssrPass[presetKey] = ev.value
	}
})

// eslint-disable-next-line prefer-const
let renderModesList

pane.addInput(params, "enabled").on("change", () => {
	ssrPass.fullscreenMaterial.defines.RENDER_MODE = params.enabled ? 0 : 4
	renderModesList.value = ssrPass.fullscreenMaterial.defines.RENDER_MODE
	ssrPass.fullscreenMaterial.needsUpdate = true
})

const optionsFolder = pane.addFolder({ title: "Options" })

renderModesList = optionsFolder
	.addBlade({
		view: "list",
		label: "Render Mode",
		options: [
			{ text: "Default", value: 0 },
			{ text: "Reflections", value: 1 },
			{ text: "Raw Reflections", value: 2 },
			{ text: "Blurred Reflections", value: 3 },
			{ text: "Input Frame", value: 4 },
			{ text: "Blur Mix Value", value: 5 }
		],
		value: 0
	})
	.on("change", ev => {
		const { value } = ev

		ssrPass.fullscreenMaterial.defines.RENDER_MODE = value
		ssrPass.fullscreenMaterial.needsUpdate = true
	})

optionsFolder.addInput(params, "temporalResolve")
optionsFolder.addInput(params, "temporalResolveMixSamples", { min: 0, max: 24, step: 1 })
optionsFolder.addInput(params, "maxSamples", { min: 0, max: 16, step: 1 })
optionsFolder.addInput(params, "staticNoise")
optionsFolder.addInput(params, "width", { min: 0, max: 2000, step: 1 })
optionsFolder.addInput(params, "height", { min: 0, max: 2000, step: 1 })
optionsFolder.addInput(params, "rayStep", { min: 0.001, max: 5, step: 0.001 })
optionsFolder.addInput(params, "intensity", { min: 0.1, max: 5, step: 0.01 })
optionsFolder.addInput(params, "maxRoughness", { min: 0, max: 1, step: 0.01 })
optionsFolder.addInput(params, "maxDepth", {
	min: 0.99,
	max: 1,
	step: 0.00001
})
optionsFolder.addInput(params, "roughnessFadeOut", {
	min: 0,
	max: 1,
	step: 0.01
})
optionsFolder.addInput(params, "rayFadeOut", {
	min: 0,
	max: 5,
	step: 0.01
})
optionsFolder.addInput(params, "thickness", {
	min: 0,
	max: 10,
	step: 0.01
})
optionsFolder.addInput(params, "maxDepthDifference", {
	min: 0,
	max: 8,
	step: 0.01
})

optionsFolder.addInput(params, "ior", {
	min: 1,
	max: 2.33333,
	step: 0.01
})

const blurFolder = pane.addFolder({ title: "Blur" })
blurFolder.addInput(params, "ENABLE_BLUR")
blurFolder.addInput(params, "blurMix", { min: 0, max: 1, step: 0.01 })
blurFolder.addInput(params, "blurKernelSize", { min: 0, max: 10, step: 1 })
blurFolder.addInput(params, "blurSharpness", { min: 0, max: 10, step: 0.01 })

const jitterFolder = pane.addFolder({ title: "Jitter", expanded: false })

jitterFolder.addInput(params, "ENABLE_JITTERING").on("change", () => {
	if (params.ENABLE_JITTERING) {
		ssrPass.reflectionsPass.fullscreenMaterial.defines.USE_JITTERING = ""
	} else {
		delete ssrPass.reflectionsPass.fullscreenMaterial.defines.USE_JITTERING
	}
	ssrPass.reflectionsPass.fullscreenMaterial.needsUpdate = true
})

jitterFolder.addInput(params, "jitter", { min: 0, max: 0.5, step: 0.01 })
jitterFolder.addInput(params, "jitterRough", { min: 0, max: 3, step: 0.01 })
jitterFolder.addInput(params, "jitterSpread", { min: 0, max: 3, step: 0.01 })

const definesFolder = pane.addFolder({ title: "Steps", expanded: false })

definesFolder.addInput(params, "MAX_STEPS", { min: 1, max: 256, step: 1 })
definesFolder.addInput(params, "NUM_BINARY_SEARCH_STEPS", { min: 0, max: 16, step: 1 })
definesFolder.addInput(params, "STRETCH_MISSED_RAYS")

const sceneFolder = pane.addFolder({ title: "Scene", expanded: false })

sceneFolder.addInput(params, "floorRoughness", { min: 0, max: 7, step: 0.05 }).on("change", () => {
	floorMesh.material.roughness = params.floorRoughness
})

sceneFolder.addInput(params, "floorNormalScale", { min: 0, max: 7, step: 0.05 }).on("change", () => {
	floorMesh.material.normalScale.setScalar(params.floorNormalScale)
})

sceneFolder.addInput(params, "USE_NORMALMAP")
sceneFolder.addInput(params, "USE_ROUGHNESSMAP")

sceneFolder.addInput(params, "antialias").on("change", () => {
	composer.multisampling = params.antialias ? 8 : 0
})

const presetsFolder = pane.addFolder({ title: "Presets", expanded: false })
presetsFolder
	.addButton({
		title: "Default"
	})
	.on("click", () => {
		for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]
		pane.refresh()
	})

presetsFolder
	.addButton({
		title: "Fast"
	})
	.on("click", () => {
		for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]

		params.ENABLE_BLUR = true
		params.maxRoughness = 0.06
		params.width = 1359
		params.height = 804
		params.blurKernelSize = 1
		params.ENABLE_JITTERING = false
		params.maxDepthDifference = 6

		params.rayFadeOut = 2.72

		params.rayStep = 3.232
		params.MAX_STEPS = 4
		params.NUM_BINARY_SEARCH_STEPS = 7

		pane.refresh()
	})

presetsFolder
	.addButton({
		title: "High Quality"
	})
	.on("click", () => {
		for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]

		params.MAX_STEPS = 256
		params.rayStep = 0.055
		params.intensity = 1
		params.floorNormalScale = 0
		params.floorRoughness = 0
		params.maxRoughness = 0

		pane.refresh()
	})

presetsFolder
	.addButton({
		title: "Video Background with Dancer"
	})
	.on("click", () => {
		useVideoBackgroundAndDancer()
	})

const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()

let goRight = true

const loop = () => {
	const dt = clock.getDelta()

	// let box = scene.getObjectByName("box")

	// const val = goRight ? 2 : -2
	// // box.position.z += val * dt * 0.875
	// if (Math.abs(Math.abs(val) < Math.abs(box.position.z))) {
	// 	box.position.z = val
	// 	goRight = !goRight
	// }
	// box.updateMatrixWorld()

	stats.begin()

	controls.update()

	if (skinMesh) {
		mixer.update(dt)
		skinMesh.updateMatrixWorld()
		skinMesh = null
	}

	if (ssrPass) {
		for (const key of Object.keys(params)) {
			if (key in ssrPass.reflectionUniforms) {
				ssrPass.reflectionUniforms[key].value = params[key]
			}
		}
	}

	composer.render()

	stats.end()
	window.requestAnimationFrame(loop)
}
