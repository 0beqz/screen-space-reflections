import * as POSTPROCESSING from "postprocessing"
import { defaultSSROptions, SSREffect } from "screen-space-reflections"
import Stats from "stats.js"
import * as THREE from "three"
import { Color } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { Pane } from "tweakpane"
import { enhanceShaderLighting } from "./EnhanceShaderLighting"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader"
import "./style.css"
import { useBoxProjectedEnvMap } from "./BoxProjectedEnvMapHelper"
import { Vector3 } from "three"
import { TextureLoader } from "three"
import { FrontSide } from "three"
import { MeshStandardMaterial } from "three"
import { controls, setMovementCamera, setSpawn, spawnPlayer, worldOctree } from "./Movement"
import { Euler } from "three"

let ssrEffect, ssrPass

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()

	renderer.setSize(window.innerWidth, window.innerHeight)
	if (ssrEffect) ssrEffect.setSize(window.innerWidth, window.innerHeight)
})

document.querySelector("#orbitControlsDomElem").addEventListener("mousedown", () => {
	document.body.requestPointerLock()
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
renderer.toneMappingExposure = 1.4
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)

// since using "rendererCanvas" doesn't work when using an offscreen canvas
// const controls = new OrbitControls(camera, document.querySelector("#orbitControlsDomElem"))
// window.controls = controls

setMovementCamera(camera, scene, 1.3)
setSpawn([
	new Vector3(2.628027999058114, 1.649999999999989, -2.0229278829404005),
	new Euler(0.0020000000000002603, 2.3680000000000057, 0)
])

const composer = new POSTPROCESSING.EffectComposer(renderer)
window.composer = composer
const renderPass = new POSTPROCESSING.RenderPass(scene, camera)
composer.addPass(renderPass)

const params = {
	enabled: true,
	antialias: true,
	resolutionScale: 1,
	temporalResolve: true,
	temporalResolveMix: 0.975,
	temporalResolveCorrectionMix: 0.15,
	maxSamples: 0,
	ENABLE_BLUR: true,
	blurMix: 0.29,
	blurKernelSize: 5,
	blurSharpness: 7.07,
	rayStep: 0.347,
	intensity: 1,
	maxRoughness: 0.99,
	ENABLE_JITTERING: true,
	jitter: 0,
	jitterRough: 1.53,
	jitterSpread: 3.3,
	roughnessFadeOut: 1,
	rayFadeOut: 1.03,
	maxDepth: 1,
	thickness: 3.5,
	ior: 1.75,
	rayFadeOut: 0,
	MAX_STEPS: 25,
	NUM_BINARY_SEARCH_STEPS: 7,
	maxDepthDifference: 3,
	STRETCH_MISSED_RAYS: true,
	floorRoughness: 2.6,
	floorNormalScale: 1,
	USE_MRT: true,
	USE_NORMALMAP: true,
	USE_ROUGHNESSMAP: true
}

camera.position.set(3.834002850041, 1.7334461523667284, -2.8164590671451015)
// controls.target.set(0.03946622428351244, 1.1662644953346295, 0.5720257630544779)

if (params.antialias) composer.multisampling = 8

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
// params.STRETCH_MISSED_RAYS = true
// params.blurMix = 0.65
// params.blurKernelSize = 7
// params.blurSharpness = 2.77
// params.rayFadeOut = 0.04

// camera.position.set(-44.97245046706518, -1.5838993198634246, 15.961596242069124)
// controls.target.set(-44.6043968840537, -1.421013025386915, 25.31290598262705)

const defaultParams = { ...params }

const gltflLoader = new GLTFLoader()

let floorMesh
let emitterMesh

const url = "scene2.glb"

const settings = {
	"color lut": false,
	compressionPass: false,
	fogColor: 7373462,
	fogDensity: 0.0049,
	toneMapping: "4",
	toneMappingExposure: 0.5875,
	gamma: 0.9500000000000001,
	hue: 0,
	saturation: 0,
	envMapIntensity: 16.31,
	lightMapIntensity: 1,
	aoMapIntensity: 1,
	roughness: 0.25,
	metalness: 0.13,
	envMapPosX: 0,
	envMapPosY: 1,
	envMapPosZ: 0,
	envMapSizeX: 12,
	envMapSizeY: 3.90714,
	envMapSizeZ: 9,
	aoPower: 2,
	aoSmoothing: 0.43,
	aoMapGamma: 0.74,
	lightMapGamma: 1.21,
	lightMapSaturation: 1.09,
	envPower: 3.6,
	smoothingPower: 0.41000000000000003,
	roughnessPower: 1,
	sunIntensity: 0,
	aoColor: 13744018,
	aoColorSaturation: 0.4064516129032258,
	hemisphereColor: 2301734,
	irradianceColor: 9011574,
	radianceColor: 12222327,
	sunColor: 16777215,
	mapContrast: 0.77,
	lightMapContrast: 1.1500000000000001,
	irradianceIntensity: 0.44,
	radianceIntensity: 6.34,
	fov: 56,
	baseIor: 0.9520000000000001,
	bandOffset: 0.0013000000000000002,
	jitterIntensity: 4,
	bloom1_intensity: 1.78,
	bloom1_luminanceThreshold: 0.64,
	bloom1_luminanceSmoothing: 1.55,
	bloom1_kernelSize: 3,
	bloom2_intensity: 0.23,
	bloom2_luminanceThreshold: 0.32,
	bloom2_luminanceSmoothing: 0.5,
	bloom2_kernelSize: 5
}

const envMapPos = new Vector3(settings.envMapPosX, settings.envMapPosY, settings.envMapPosZ)
const envMapSize = new Vector3(settings.envMapSizeX, settings.envMapSizeY, settings.envMapSizeZ)

const enhanceShaderLightingOptions = {
	...settings,
	...{
		aoColor: new Color(settings.aoColor),
		hemisphereColor: new Color(settings.hemisphereColor),
		irradianceColor: new Color(settings.irradianceColor),
		radianceColor: new Color(settings.radianceColor)
	}
}

const placeholderTexture = new RGBELoader().load("lightmap/placeholder.hdr")

gltflLoader.load(
	url,
	asset => {
		document.querySelector("#loading").remove()

		scene.add(asset.scene)

		const collider = asset.scene.getObjectByName("collider")
		if (collider) {
			worldOctree.fromGraphNode(collider)
			collider.removeFromParent()
			collider.geometry.dispose()
			collider.material.dispose()
		}

		asset.scene.traverse(c => {
			if (c.material) {
				c.material.normalScale.setScalar(1)
				if (c.name.includes("heli") || c.name.includes("plane")) {
					c.material.roughness = 0.1
					c.material.metalness = 1
					c.material.color.multiplyScalar(0.075)
				}

				if (c.name !== "emissive") {
					c.material.emissiveMap = c.material.emissiveMap || placeholderTexture
					const lightMap = c.material.emissiveMap

					// lightmap
					if (lightMap) {
						c.material.lightMap = lightMap
						c.material.emissiveMap = null

						lightMap.encoding = THREE.LinearEncoding
					}

					c.material.onBeforeCompile = shader => {
						useBoxProjectedEnvMap(shader, envMapPos, envMapSize)
						enhanceShaderLighting(shader, enhanceShaderLightingOptions)
					}
				}

				if (c.material.name.includes("ceiling")) {
					c.material.map.offset.setScalar(0)
					const tex = new TextureLoader().load("OfficeCeiling002_1K_Emission.png")
					const emissiveMap = c.material.map.clone()
					emissiveMap.source = tex.source
					c.material.emissiveMap = emissiveMap
					c.material.emissive.setHex(0xffb580)
				}

				if (c.material.name.includes("floor")) {
					c.material.normalScale.setScalar(0.55)
				}

				// c.material.roughness = 0.2
				// c.material.metalness = 0.9
				// c.material.color.setScalar(0.8)
				// c.material.normalScale.setScalar(2.5)

				c.material.color.setScalar(0.05)
				c.material.roughness = 0.2

				if (c.name.includes("props")) {
					c.material.color.setScalar(0.35)

					if (c.material.name.includes("Couch")) c.material.roughness = 1
				}

				if (c.material.emissiveMap && c.material.normalMap) {
					window.e = c.material
					c.material.emissiveIntensity = 10
				}

				if (c.material.name.toLowerCase().includes("shd")) {
					c.material.roughness = 0.1
					c.material.metalness = 0.6
					c.material.color.multiplyScalar(0.08)
				}
			}

			c.updateMatrixWorld()

			if (c.name === "Plane") floorMesh = c

			if (c.name === "emissive") {
				c.material.envMapIntensity = 0
				emitterMesh = c
			}
		})

		new POSTPROCESSING.LUT3dlLoader().load("room.3dl", lutTexture => {
			const lutEffect = new POSTPROCESSING.LUTEffect(lutTexture)

			// now init SSR effect
			ssrEffect = new SSREffect(scene, camera, params)
			ssrPass = new POSTPROCESSING.EffectPass(camera, ssrEffect)
			composer.addPass(ssrPass)

			window.ssrEffect = ssrEffect
			window.ssrPass = ssrPass

			const bloomEffect = new POSTPROCESSING.BloomEffect({
				intensity: 2,
				luminanceThreshold: 0.4,
				luminanceSmoothing: 0.7,
				kernelSize: POSTPROCESSING.KernelSize.HUGE,
				mipmapBlur: true
			})

			composer.addPass(new POSTPROCESSING.EffectPass(camera, bloomEffect, lutEffect))
		})

		spawnPlayer()

		loop()

		const urlParams = new URLSearchParams(window.location.search)
		if (urlParams.get("dancer") === "true") useVideoBackground()
	},
	ev => {
		const progress = Math.round((ev.loaded / 1127388) * 100)
		document.querySelector("#loading").textContent = progress + "%"
	}
)

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

new RGBELoader().load("envRoom.hdr", tex => {
	const envMap = pmremGenerator.fromEquirectangular(tex).texture
	envMap.minFilter = THREE.LinearFilter

	scene.environment = envMap
})

let mixer
let skinMesh

const useVideoBackground = () => {
	if (emitterMesh.material._videoMap) {
		emitterMesh.material.map = emitterMesh.material._videoMap
		emitterMesh.material.emissiveMap = emitterMesh.material._videoMap
	} else {
		const video = document.getElementById("video")
		video.src = "video.mp4"
		video.playbackRate = 2
		video.play()
		const videoTexture = new THREE.VideoTexture(video)
		emitterMesh.material._oldMap = emitterMesh.material.map
		emitterMesh.material.map = videoTexture
		emitterMesh.material.emissiveMap = videoTexture
		emitterMesh.material._videoMap = videoTexture

		ssrEffect.samples = 0
	}

	// gltflLoader.load("skin.glb", asset => {
	// 	skinMesh = asset.scene
	// 	skinMesh.scale.multiplyScalar(2.1)
	// 	skinMesh.position.set(2.5, 0, 0)
	// 	skinMesh.rotation.y += Math.PI / 2
	// 	skinMesh.updateMatrixWorld()
	// 	skinMesh.traverse(c => {
	// 		if (c.material) {
	// 			c.material.roughness = 0
	// 			c.material.metalness = 1
	// 		}
	// 	})
	// 	scene.add(asset.scene)
	// 	mixer = new THREE.AnimationMixer(skinMesh)
	// 	const clips = asset.animations

	// 	const action = mixer.clipAction(clips[0])
	// 	action.play()
	// })
}

// gltflLoader.load("skin.glb", asset => {
// 	skinMesh = asset.scene
// 	skinMesh.scale.multiplyScalar(2.1)
// 	skinMesh.position.set(2.5, 0, 0)
// 	skinMesh.rotation.y += Math.PI / 2
// 	skinMesh.updateMatrixWorld()
// 	skinMesh.traverse(c => {
// 		if (c.material) {
// 			c.material.roughness = 0
// 			c.material.metalness = 1
// 		}
// 	})
// 	scene.add(asset.scene)
// 	mixer = new THREE.AnimationMixer(skinMesh)
// 	const clips = asset.animations

// 	const action = mixer.clipAction(clips[0])
// 	action.play()
// })

const pane = new Pane()
window.pane = pane
pane.containerElem_.style.userSelect = "none"

pane.on("change", ev => {
	const { presetKey } = ev

	if (Object.keys(defaultSSROptions).includes(presetKey)) {
		ssrEffect[presetKey] = ev.value
	}
})

pane.addInput(params, "enabled").on("change", () => {
	if (params.enabled) {
		ssrPass = new POSTPROCESSING.EffectPass(camera, ssrEffect)
		composer.addPass(ssrPass)
		window.ssrPass = ssrPass
	} else {
		composer.removePass(ssrPass)
		window.ssrPass = null
	}
})

const optionsFolder = pane.addFolder({ title: "Options" })
optionsFolder.addInput(params, "resolutionScale", { min: 0.125, max: 1, step: 0.125 })
optionsFolder.addInput(params, "temporalResolve")
optionsFolder.addInput(params, "temporalResolveMix", { min: 0, max: 0.975, step: 0.001 })
optionsFolder.addInput(params, "temporalResolveCorrectionMix", { min: 0, max: 1, step: 0.0001 })
optionsFolder.addInput(params, "maxSamples", { min: 0, max: 16, step: 1 })
optionsFolder.addInput(params, "rayStep", { min: 0.001, max: 5, step: 0.001 })
optionsFolder.addInput(params, "intensity", { min: 0.1, max: 5, step: 0.01 })
optionsFolder.addInput(params, "maxRoughness", { min: 0, max: 1, step: 0.01 })
optionsFolder.addInput(params, "maxDepth", {
	min: 0,
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
blurFolder.addInput(params, "blurMix", { min: 0, max: 1, step: 0.01 })
blurFolder.addInput(params, "blurKernelSize", { min: 0, max: 10, step: 1 })
blurFolder.addInput(params, "blurSharpness", { min: 0, max: 5, step: 0.01 })

const jitterFolder = pane.addFolder({ title: "Jitter", expanded: false })

jitterFolder.addInput(params, "ENABLE_JITTERING")
jitterFolder.addInput(params, "jitter", { min: 0, max: 0.5, step: 0.01 })
jitterFolder.addInput(params, "jitterRough", { min: 0, max: 3, step: 0.01 })
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

		if (emitterMesh.material._oldMap) {
			emitterMesh.material.map = emitterMesh.material._oldMap
			emitterMesh.material.emissiveMap = emitterMesh.material._oldMap
		}

		ssrEffect.samples = 0
	})

presetsFolder
	.addButton({
		title: "Animated Background"
	})
	.on("click", () => {
		for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]
		params.temporalResolveCorrectionMix = 0.15
		pane.refresh()

		useVideoBackground()
	})

const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()

// let goRight = true

const loop = () => {
	const dt = clock.getDelta()

	// let box = scene.getObjectByName("box")

	// const val = goRight ? 2 : -2
	// box.position.z += val * dt * 0.875
	// if (Math.abs(Math.abs(val) < Math.abs(box.position.z))) {
	// 	box.position.z = val
	// 	goRight = !goRight
	// }
	// box.updateMatrixWorld()

	stats.begin()

	// controls.update()
	controls(dt)

	if (skinMesh) {
		mixer.update(dt)
		skinMesh.updateMatrixWorld()
		// skinMesh = null
	}

	composer.render()

	stats.end()
	window.requestAnimationFrame(loop)
}
