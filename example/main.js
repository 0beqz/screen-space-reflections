import * as POSTPROCESSING from "postprocessing"
import { defaultSSROptions, SSREffect } from "../src/SSREffect"
import Stats from "stats.js"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { useBoxProjectedEnvMap } from "./addons/BoxProjectedEnvMapHelper"
import { enhanceShaderLighting } from "./addons/EnhanceShaderLighting"
import { setMovementCamera, setSpawn, spawnPlayer, updateFirstPersonMovement, worldOctree } from "./addons/Movement"
import { SSRDebugGUI } from "./SSRDebugGUI"
import "./style.css"

let ssrEffect
let gui
let stats

const scene = new THREE.Scene()
window.scene = scene
scene.add(new THREE.AmbientLight())

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20)

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

setMovementCamera(camera, scene, 1.3)
setSpawn([
	new THREE.Vector3(5.113053737140886, 1.8300000071525564, -2.013112958154061),
	new THREE.Euler(0, 1.9200000000000146, -0.005999999999999719)
])

const composer = new POSTPROCESSING.EffectComposer(renderer)
const renderPass = new POSTPROCESSING.RenderPass(scene, camera)
composer.addPass(renderPass)

const params = {
	...defaultSSROptions,
	...{
		enabled: true,
		antialias: true,
		resolutionScale: 1,
		temporalResolve: true,
		temporalResolveMix: 0.95,
		temporalResolveCorrection: 0.15,
		blurMix: 0.33,
		blurSharpness: 10,
		blurKernelSize: 1,
		rayDistance: 8,
		intensity: 1,
		colorExponent: 1.75,
		maxRoughness: 0.99,
		jitter: 0,
		jitterRough: 0.63,
		jitterSpread: 3.6,
		roughnessFadeOut: 1,
		rayFadeOut: 1.03,
		thickness: 3.5,
		ior: 1.75,
		rayFadeOut: 0,
		MAX_STEPS: 5,
		NUM_BINARY_SEARCH_STEPS: 6,
		maxDepthDifference: 50,
		ALLOW_MISSED_RAYS: true,
		USE_MRT: true,
		USE_NORMALMAP: true,
		USE_ROUGHNESSMAP: true
	}
}

if (params.antialias) composer.multisampling = 4

const defaultParams = { ...params }

const gltflLoader = new GLTFLoader()

let emitterMesh

const url = "room/room.gltf"

const settings = {
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
	radianceIntensity: 6.34
}

const envMapPos = new THREE.Vector3(settings.envMapPosX, settings.envMapPosY, settings.envMapPosZ)
const envMapSize = new THREE.Vector3(settings.envMapSizeX, settings.envMapSizeY, settings.envMapSizeZ)

const enhanceShaderLightingOptions = {
	...settings,
	...{
		aoColor: new THREE.Color(settings.aoColor),
		hemisphereColor: new THREE.Color(settings.hemisphereColor),
		irradianceColor: new THREE.Color(settings.irradianceColor),
		radianceColor: new THREE.Color(settings.radianceColor)
	}
}

gltflLoader.load(url, asset => {
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
			if (c.name.includes("heli") || c.name.includes("plane")) {
				c.material.roughness = 0.1
				c.material.metalness = 1
				c.material.color.multiplyScalar(0.075)
			}

			if (c.name !== "emissive") {
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

			c.material.color.setScalar(0.05)
			c.material.roughness = 0.2

			if (c.material.name.includes("ceiling")) {
				c.material.map.offset.setScalar(0)
				const tex = new THREE.TextureLoader().load("OfficeCeiling002_1K_Emission.webp")
				const emissiveMap = c.material.map.clone()
				emissiveMap.source = tex.source
				c.material.emissiveMap = emissiveMap
				c.material.emissive.setHex(0xffb580)
				c.material.roughness = 0.35
			}

			if (c.material.name.includes("floor")) {
				c.material.normalScale.setScalar(0.4)
			}

			if (c.name.includes("props")) {
				c.material.color.setScalar(0.35)

				if (c.material.name.includes("Couch")) c.material.roughness = 1
			}

			if (c.material.emissiveMap && c.material.normalMap) {
				window.e = c.material
				c.material.emissiveIntensity = 10
			}
		}

		c.updateMatrixWorld()

		if (c.name === "emissive") {
			c.material.envMapIntensity = 0
			emitterMesh = c
		}
	})

	new POSTPROCESSING.LUT3dlLoader().load("room.3dl", lutTexture => {
		const lutEffect = new POSTPROCESSING.LUTEffect(lutTexture)

		// now init SSR effect
		ssrEffect = new SSREffect(scene, camera, params)
		window.ssrEffect = ssrEffect

		gui = new SSRDebugGUI(ssrEffect, params)

		stats = new Stats()
		stats.showPanel(0)
		document.body.appendChild(stats.dom)

		const presetsFolder = gui.pane.addFolder({ title: "Presets", expanded: false })
		presetsFolder
			.addButton({
				title: "Default"
			})
			.on("click", () => {
				for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]
				gui.pane.refresh()

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
				useVideoBackground()
			})

		const bloomEffect = new POSTPROCESSING.BloomEffect({
			intensity: 2,
			luminanceThreshold: 0.4,
			luminanceSmoothing: 0.7,
			kernelSize: POSTPROCESSING.KernelSize.HUGE,
			mipmapBlur: true
		})

		const vignetteEffect = new POSTPROCESSING.VignetteEffect({
			darkness: 0.3675
		})

		composer.addPass(new POSTPROCESSING.EffectPass(camera, ssrEffect, bloomEffect, vignetteEffect, lutEffect))
	})

	spawnPlayer()

	loop()

	const urlParams = new URLSearchParams(window.location.search)
	if (urlParams.get("dancer") === "true") useVideoBackground()
})

const loadingEl = document.querySelector("#loading")

let loadedCount = 0
const loadFiles = 29
THREE.DefaultLoadingManager.onProgress = () => {
	loadedCount++

	if (loadedCount === loadFiles) {
		setTimeout(() => {
			if (loadingEl) loadingEl.remove()
		}, 150)
	}

	const progress = Math.round((loadedCount / loadFiles) * 100)
	if (loadingEl) loadingEl.textContent = progress + "%"
}

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

new THREE.TextureLoader().load("envRoom.webp", tex => {
	tex.mapping = THREE.EquirectangularReflectionMapping
	tex.encoding = THREE.sRGBEncoding
	scene.environment = tex
})

const useVideoBackground = () => {
	for (const key of Object.keys(defaultParams)) params[key] = defaultParams[key]
	params.temporalResolveCorrection = 0.1
	if (gui) gui.pane.refresh()

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

		if (ssrEffect) ssrEffect.samples = 0
	}
}

const clock = new THREE.Clock()

// const box = new THREE.Mesh(
// 	new THREE.BoxBufferGeometry(1, 1, 1),
// 	new THREE.MeshStandardMaterial({ color: 0, roughness: 0.05 })
// )
// scene.add(box)
// box.position.y = 1.5

// let goRight = true

const loop = () => {
	const dt = clock.getDelta()
	if (stats) stats.begin()

	// const val = goRight ? 2 : -2
	// box.position.z += val * dt * 0.875
	// if (Math.abs(Math.abs(val) < Math.abs(box.position.z))) {
	// 	box.position.z = val
	// 	goRight = !goRight
	// }
	// box.updateMatrixWorld()

	// controls.update()
	updateFirstPersonMovement(dt)

	composer.render()

	if (stats) stats.end()
	window.requestAnimationFrame(loop)
}

// event handlers
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()

	renderer.setSize(window.innerWidth, window.innerHeight)
	if (ssrEffect) ssrEffect.setSize(window.innerWidth, window.innerHeight)
})

document.querySelector("#orbitControlsDomElem").addEventListener("mousedown", () => {
	document.body.requestPointerLock()
})

document.addEventListener("pointerlockchange", () => {
	gui.pane.containerElem_.style.display = gui.pane.containerElem_.style.display === "none" ? "block" : "none"
	stats.dom.style.display = stats.dom.style.display === "none" ? "block" : "none"
})
