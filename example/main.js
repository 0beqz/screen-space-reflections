import * as POSTPROCESSING from "postprocessing"
import Stats from "stats.js"
import * as THREE from "three"
import { HalfFloatType } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"
import { Pane } from "tweakpane"
import { SSRPass } from "screen-space-reflections"
import "./style.css"
import { defaultSSROptions } from "../src/SSRPass"
import { Color } from "three"

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()

	renderer.setSize(window.innerWidth, window.innerHeight)
	ssrPass.setSize(window.innerWidth, window.innerHeight)

	ssrPass.samples = 0
})

const scene = new THREE.Scene()
window.scene = scene
scene.add(new THREE.AmbientLight())

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)

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

controls.addEventListener("change", () => {
	if (ssrPass) ssrPass.samples = 1
	// ssrPass.reflectionsPass.createLastLastFrameReflectionsTexture()
})

const composer = new POSTPROCESSING.EffectComposer(renderer)
window.composer = composer

const renderPass = new POSTPROCESSING.RenderPass(scene, camera)
composer.addPass(renderPass)

const params = {
	enabled: true,
	floorRoughness: 1,
	floorNormalScale: 1,
	antialias: false,

	width: window.innerWidth,
	height: window.innerHeight,
	temporalResolve: true,
	staticNoise: false,
	ENABLE_BLUR: false,
	blurKernelSize: 1,
	blurWidth: 1696,
	blurHeight: 1500,
	rayStep: 0.193,
	intensity: 1,
	depthBlur: 0.26,
	maxBlur: 0.85,
	ENABLE_JITTERING: true,
	jitter: 0.36,
	jitterRough: 2,
	jitterSpread: 3.37,
	roughnessFadeOut: 0.51,
	rayFadeOut: 1.03,
	maxDepth: 1,
	thickness: 0.65,
	ior: 1.45,
	rayFadeOut: 0,
	MAX_STEPS: 64,
	NUM_BINARY_SEARCH_STEPS: 4,
	maxDepthDifference: 3,
	STRETCH_MISSED_RAYS: true,
	floorRoughness: 2.6,
	floorNormalScale: 0,
	useMRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}

const urlParams = new URLSearchParams(window.location.search)

camera.position.set(11.52397338793808, 1.3288224896940117, -0.5247956153854474)
controls.target.set(-0.0036586000844819433, 1.006404176473826, 0.46503426700631345)

const defaultParams = { ...params }

const ssrPass = new SSRPass(scene, camera, params)
composer.addPass(ssrPass)
window.ssrPass = ssrPass

const gltflLoader = new GLTFLoader()

let floorMesh
let emitterMesh

gltflLoader.load("sceneAircrafts.glb", asset => {
	scene.add(asset.scene)
	asset.scene.traverse(c => {
		c.updateMatrixWorld()

		if (c.material) {
			c.material.normalScale.setScalar(1)

			if (c.name.startsWith("plane")) {
				c.material.setValues({
					roughness: 0.05,
					metalness: 0.9
				})

				c.material.color.multiplyScalar(0.0675)
			}

			if (c.name.startsWith("heli")) {
				c.material.setValues({
					roughness: 0.05,
					metalness: 0.9
				})

				c.material.color.multiplyScalar(0.0825)
			}
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

	// scene.add(box)
	// scene.add(box2)

	// if (floorMesh) floorMesh.material.roughness = 0
	// if (floorMesh) floorMesh.material.roughnessMap = null
	// floorMesh.material.map.repeat.setScalar(16)

	loop()

	if (urlParams.get("dancer") === "true") useVideoBackgroundAndDancer()
})

// gltflLoader.load("plane.glb", asset => {
// 	const mesh = asset.scene
// 	mesh.position.set(5, 0, 0.5)
// 	mesh.rotateY(1.2)
// 	mesh.scale.multiplyScalar(2)

// 	mesh.traverse(c => {
// 		if (c.material) {
// 			c.material.setValues({
// 				roughness: 0.05,
// 				metalness: 0.9
// 			})
// 			console.log(c.material)
// 			c.material.color.multiplyScalar(0.0675)
// 		}
// 	})

// 	mesh.updateMatrixWorld()

// 	scene.add(mesh)
// })

// gltflLoader.load("heli.glb", asset => {
// 	const mesh = asset.scene
// 	mesh.position.set(5, 0, 2.5)
// 	mesh.rotateY(1.2)
// 	mesh.scale.multiplyScalar(2)

// 	mesh.traverse(c => {
// 		if (c.material) {
// 			c.material.setValues({
// 				roughness: 0.05,
// 				metalness: 0.9
// 			})
// 			console.log(c.material)
// 			c.material.color.multiplyScalar(0.0825)
// 		}
// 	})

// 	mesh.updateMatrixWorld()

// 	scene.add(mesh)
// })

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
	params.blurWidth = 935
	params.blurHeight = 304
	params.depthBlur = 0.13
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
		console.log("set", presetKey)
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

optionsFolder.addInput(params, "staticNoise")

optionsFolder.addInput(params, "width", { min: 0, max: 2000, step: 1 })
optionsFolder.addInput(params, "height", { min: 0, max: 2000, step: 1 })
optionsFolder.addInput(params, "rayStep", { min: 0.001, max: 5, step: 0.001 })
optionsFolder.addInput(params, "intensity", { min: 0.1, max: 5, step: 0.1 })
optionsFolder.addInput(params, "depthBlur", { min: 0, max: 0.5, step: 0.01 })
optionsFolder.addInput(params, "maxBlur", { min: 0, max: 1, step: 0.01 })
optionsFolder.addInput(params, "maxDepthDifference", {
	min: 0,
	max: 8,
	step: 0.01
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
	max: 10,
	step: 0.01
})

optionsFolder.addInput(params, "ior", {
	min: 1,
	max: 2.33333,
	step: 0.01
})

const blurFolder = pane.addFolder({ title: "Blur" })
blurFolder.addInput(params, "ENABLE_BLUR")
blurFolder.addInput(params, "blurKernelSize", { min: 0, max: 5, step: 1 })
blurFolder.addInput(params, "blurWidth", { min: 0, max: 2000, step: 1 })
blurFolder.addInput(params, "blurHeight", { min: 0, max: 2000, step: 1 })

const jitterFolder = pane.addFolder({ title: "Jitter", expanded: false })

jitterFolder.addInput(params, "ENABLE_JITTERING")
jitterFolder.addInput(params, "jitter", { min: 0, max: 3, step: 0.01 })
jitterFolder.addInput(params, "jitterRough", { min: 0, max: 2, step: 0.01 })
jitterFolder.addInput(params, "jitterSpread", { min: 0, max: 5, step: 0.01 })

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
		params.blurWidth = 1130
		params.blurHeight = 391
		params.depthBlur = 0.06
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

const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()

let lastWidth
let lastHeight

let goRight = true

const loop = () => {
	const dt = clock.getDelta()

	// const val = goRight ? 4 : -4
	// camera.position.z += val * dt * 0.875
	// if (Math.abs(Math.abs(val) < Math.abs(camera.position.z))) {
	// 	camera.position.z = val
	// 	goRight = !goRight
	// }

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
