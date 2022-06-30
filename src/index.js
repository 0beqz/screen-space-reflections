import "./style/main.css"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"
import * as POSTPROCESSING from "postprocessing"
import { Pane } from "tweakpane"
import Stats from "stats.js"
import { SSRPass } from "./ssr/SSRPass.js"

const sizes = {}
sizes.width = window.innerWidth
sizes.height = window.innerHeight

window.addEventListener("resize", () => {
	// Save sizes
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	// Update camera
	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	// Update renderer
	renderer.setSize(sizes.width, sizes.height)
})

const scene = new THREE.Scene()
window.scene = scene
scene.add(new THREE.AmbientLight())

const hemiLight = new THREE.HemisphereLight(0x443333, 0x111122)
scene.add(hemiLight)

const camera = new THREE.PerspectiveCamera(
	75,
	sizes.width / sizes.height,
	0.1,
	100
)

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
renderer.setSize(sizes.width, sizes.height)

// since using "rendererCanvas" doesn't work when using an offscreen canvas
const controls = new OrbitControls(
	camera,
	document.querySelector("#orbitControlsDomElem")
)
controls.maxDepth = 15
window.controls = controls

const composer = new POSTPROCESSING.EffectComposer(renderer)
window.composer = composer
const renderPass = new POSTPROCESSING.RenderPass(scene, camera)
composer.addPass(renderPass)

let params = {
	enabled: true,
	floorRoughness: 1,
	floorNormalScale: 1,
	antialias: false,

	width: window.innerWidth,
	height: window.innerHeight,
	useBlur: true,
	blurKernelSize: POSTPROCESSING.KernelSize.SMALL,
	blurWidth: 935,
	blurHeight: 304,
	rayStep: 0.534,
	intensity: 1,
	power: 1,
	depthBlur: 0.11,
	enableJittering: false,
	jitter: 0.17,
	jitterSpread: 0.59,
	jitterRough: 0.8,
	roughnessFadeOut: 1,
	maxDepth: 0.996,
	thickness: 3.5,
	ior: 1.45,
	rayFadeOut: 0,
	MAX_STEPS: 25,
	NUM_BINARY_SEARCH_STEPS: 7,
	maxDepthDifference: 1,
	stretchMissedRays: false,
	useMRT: true,
	useNormalMap: true,
	useRoughnessMap: true
}

const paramsDesert = {
	enabled: true,
	floorRoughness: 1,
	floorNormalScale: 1,
	antialias: false,

	width: window.innerWidth,
	height: window.innerHeight,
	useBlur: true,
	blurKernelSize: 3,
	blurWidth: 1370,
	blurHeight: 370,
	rayStep: 0.205,
	intensity: 0.7,
	power: 1.1,
	depthBlur: 0.11,
	enableJittering: true,
	jitter: 0.17,
	jitterRough: 0,
	jitterSpread: 0.98,
	roughnessFadeOut: 0,
	rayFadeOut: 0,
	MAX_STEPS: 32,
	NUM_BINARY_SEARCH_STEPS: 6,
	maxDepth: 1,
	stretchMissedRays: true,
	maxDepthDifference: 5,
	thickness: 22.83,
	ior: 1.68,
	useMRT: true,
	useNormalMap: false,
	useRoughnessMap: false
}

const urlParams = new URLSearchParams(window.location.search)
const useDesert = urlParams.get("desert") === "true"

if (useDesert) {
	params = paramsDesert

	camera.position.set(43.41796615579645, -0.989309749754447, 111.06453952471358)
	controls.target.set(
		30.557604018998227,
		-1.0641165515106161,
		111.09867225736214
	)
} else {
	camera.position.set(
		9.830958100630163,
		1.0769590725793634,
		0.43954473968492885
	)
	controls.target.set(
		-0.0036586000844819433,
		1.006404176473826,
		0.46503426700631345
	)
}

const defaultParams = { ...params }

const ssrPass = new SSRPass(composer, scene, camera, params)
composer.addPass(ssrPass)
window.ssrPass = ssrPass

const gltflLoader = new GLTFLoader()

let floorMesh
let emitterMesh

gltflLoader.load(useDesert ? "desert.glb" : "scene.glb", asset => {
	scene.add(asset.scene)
	asset.scene.traverse(c => {
		if (c.material) {
			c.material.normalScale.setScalar(1)
			if (useDesert) c.material.roughness = 0.1
		}

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
	box.position.set(2, 1, 5)
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

	scene.add(box)
	scene.add(box2)

	// if (floorMesh) floorMesh.material.roughness = 0
	// if (floorMesh) floorMesh.material.roughnessMap = null
	// floorMesh.material.map.repeat.setScalar(16)

	loop()

	if (urlParams.get("dancer") === "true" && !useDesert)
		useVideoBackgroundAndDancer()
})

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

new RGBELoader().load("env.hdr", tex => {
	const envMap = pmremGenerator.fromEquirectangular(tex).texture
	envMap.minFilter = THREE.LinearFilter

	if (useDesert) scene.environment = envMap
	if (useDesert) scene.background = envMap
})

let mixer
let skinMesh
let didLoadVideoBackgroundAndDancer = false

const useVideoBackgroundAndDancer = () => {
	for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]

	params.useBlur = true
	params.blurWidth = 935
	params.blurHeight = 304
	params.depthBlur = 0.13
	params.blurKernelSize = 2
	params.enableJittering = true
	params.jitter = 0.18
	params.jitterRough = 0.36
	params.jitterSpread = 0.34
	params.intensity = 2
	params.power = 1
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

optionsFolder.addInput(params, "width", { min: 0, max: 2000, step: 1 })
optionsFolder.addInput(params, "height", { min: 0, max: 2000, step: 1 })
optionsFolder.addInput(params, "rayStep", { min: 0.001, max: 5, step: 0.001 })
optionsFolder.addInput(params, "intensity", { min: 0.1, max: 5, step: 0.1 })
optionsFolder.addInput(params, "power", { min: 0.1, max: 5, step: 0.1 })
optionsFolder.addInput(params, "depthBlur", { min: 0, max: 0.5, step: 0.01 })
optionsFolder.addInput(params, "maxDepthDifference", {
	min: 0,
	max: useDesert ? 10 : 1,
	step: 0.0001
})
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
	max: useDesert ? 30 : 10,
	step: 0.01
})

optionsFolder.addInput(params, "ior", {
	min: 1,
	max: 2.33333,
	step: 0.01
})

const blurFolder = pane.addFolder({ title: "Blur" })
blurFolder.addInput(params, "useBlur").on("change", () => {
	if (params.useBlur) {
		ssrPass.fullscreenMaterial.defines.USE_BLUR = ""
		ssrPass.reflectionsPass.fullscreenMaterial.defines.USE_BLUR = ""
	} else {
		delete ssrPass.fullscreenMaterial.defines.USE_BLUR
		delete ssrPass.reflectionsPass.fullscreenMaterial.defines.USE_BLUR
	}

	ssrPass.fullscreenMaterial.needsUpdate = true
})
blurFolder.addInput(params, "blurKernelSize", { min: 0, max: 5, step: 1 })
blurFolder.addInput(params, "blurWidth", { min: 0, max: 2000, step: 1 })
blurFolder.addInput(params, "blurHeight", { min: 0, max: 2000, step: 1 })

const jitterFolder = pane.addFolder({ title: "Jitter", expanded: false })

jitterFolder.addInput(params, "enableJittering").on("change", () => {
	if (params.enableJittering) {
		ssrPass.reflectionsPass.fullscreenMaterial.defines.USE_JITTERING = ""
	} else {
		delete ssrPass.reflectionsPass.fullscreenMaterial.defines.USE_JITTERING
	}
	ssrPass.reflectionsPass.fullscreenMaterial.needsUpdate = true
})

jitterFolder.addInput(params, "jitter", { min: 0, max: 1, step: 0.01 })
jitterFolder.addInput(params, "jitterRough", { min: 0, max: 2, step: 0.01 })
jitterFolder.addInput(params, "jitterSpread", { min: 0, max: 2, step: 0.01 })

const definesFolder = pane.addFolder({ title: "Steps", expanded: false })

definesFolder
	.addInput(params, "MAX_STEPS", { min: 1, max: 256, step: 1 })
	.on("change", () => {
		ssrPass.reflectionsPass.fullscreenMaterial.defines.MAX_STEPS = parseInt(
			params.MAX_STEPS
		)
		ssrPass.reflectionsPass.fullscreenMaterial.needsUpdate = true
	})

definesFolder
	.addInput(params, "NUM_BINARY_SEARCH_STEPS", { min: 0, max: 16, step: 1 })
	.on("change", () => {
		ssrPass.reflectionsPass.fullscreenMaterial.defines.NUM_BINARY_SEARCH_STEPS =
			parseInt(params.NUM_BINARY_SEARCH_STEPS)
		ssrPass.reflectionsPass.fullscreenMaterial.needsUpdate = true
	})

const sceneFolder = pane.addFolder({ title: "Scene", expanded: false })

sceneFolder
	.addInput(params, "floorRoughness", { min: 0, max: 7, step: 0.05 })
	.on("change", () => {
		floorMesh.material.roughness = params.floorRoughness
	})

sceneFolder
	.addInput(params, "floorNormalScale", { min: 0, max: 7, step: 0.05 })
	.on("change", () => {
		floorMesh.material.normalScale.setScalar(params.floorNormalScale)
	})

sceneFolder.addInput(params, "antialias").on("change", () => {
	composer.multisampling = params.antialias ? 8 : 0
})

const presetsFolder = pane.addFolder({ title: "Presets", expanded: false })
presetsFolder
	.addButton({
		title: "Default"
	})
	.on("click", () => {
		for (const key of Object.keys(defaultParams))
			params[key] = defaultParams[key]
		pane.refresh()
	})

if (!useDesert) {
	presetsFolder
		.addButton({
			title: "Fast"
		})
		.on("click", () => {
			for (const key of Object.keys(defaultParams))
				params[key] = defaultParams[key]

			params.useBlur = true
			params.blurWidth = 1130
			params.blurHeight = 391
			params.depthBlur = 0.06
			params.width = 1359
			params.height = 804
			params.blurKernelSize = 1
			params.enableJittering = false
			params.maxDepthDifference = 1

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
			for (const key of Object.keys(defaultParams))
				params[key] = defaultParams[key]

			params.MAX_STEPS = 256
			params.rayStep = 0.055
			params.intensity = 1
			params.floorNormalScale = 0
			params.floorRoughness = 0
			params.depthBlur = 0

			pane.refresh()
		})

	presetsFolder
		.addButton({
			title: "Video Background with Dancer"
		})
		.on("click", () => {
			useVideoBackgroundAndDancer()
		})
}

const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()

const loop = () => {
	const dt = clock.getDelta()

	stats.begin()

	controls.update()

	if (skinMesh) {
		mixer.update(dt)
		skinMesh.updateMatrixWorld()
		// skinMesh = null
	}

	if (ssrPass) {
		ssrPass.setSize(params.width, params.height)

		for (const key of Object.keys(params)) {
			if (key in ssrPass.reflectionUniforms) {
				ssrPass.reflectionUniforms[key].value = params[key]
			}
		}

		ssrPass.kawaseBlurPass.kernelSize = params.blurKernelSize
		ssrPass.kawaseBlurPass.setSize(params.blurWidth, params.blurHeight)
	}

	composer.render()

	stats.end()
	window.requestAnimationFrame(loop)
}
