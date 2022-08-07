import { defaultSSROptions } from "screen-space-reflections"
import { Pane } from "tweakpane"

export class SSRDebugGUI {
	constructor(ssrEffect, params = defaultSSROptions) {
		const pane = new Pane()
		this.pane = pane
		pane.containerElem_.style.userSelect = "none"
		pane.containerElem_.style.width = "380px"

		pane.on("change", ev => {
			const { presetKey } = ev

			ssrEffect[presetKey] = ev.value
		})

		const generalFolder = pane.addFolder({ title: "General" })
		generalFolder.addInput(params, "resolutionScale", { min: 0.125, max: 1, step: 0.125 })
		generalFolder.addInput(params, "velocityResolutionScale", { min: 0.125, max: 1, step: 0.125 })
		generalFolder.addInput(params, "intensity", { min: 0, max: 3, step: 0.01 })
		generalFolder.addInput(params, "colorExponent", { min: 0.125, max: 4, step: 0.125 })
		generalFolder.addInput(params, "rayDistance", { min: 0.001, max: 10, step: 0.1 })
		generalFolder.addInput(params, "rayFadeOut", {
			min: 0,
			max: 20,
			step: 0.01
		})
		generalFolder.addInput(params, "roughnessFadeOut", {
			min: 0,
			max: 1,
			step: 0.01
		})
		generalFolder.addInput(params, "thickness", {
			min: 0,
			max: 10,
			step: 0.01
		})
		generalFolder.addInput(params, "ior", {
			min: 1,
			max: 2.33333,
			step: 0.01
		})

		const maximumValuesFolder = pane.addFolder({ title: "Maximum Values" })
		maximumValuesFolder.addInput(params, "maxDepthDifference", {
			min: 0,
			max: 100,
			step: 0.1
		})
		maximumValuesFolder.addInput(params, "maxRoughness", { min: 0, max: 1, step: 0.01 })

		const temporalResolveFolder = pane.addFolder({ title: "Temporal Resolve" })

		temporalResolveFolder.addInput(params, "temporalResolve")
		temporalResolveFolder.addInput(params, "temporalResolveMix", { min: 0, max: 0.975, step: 0.001 })
		temporalResolveFolder.addInput(params, "temporalResolveCorrection", { min: 0, max: 1, step: 0.0001 })
		temporalResolveFolder.addInput(params, "CLAMP_RADIUS", { min: 1, max: 4, step: 1 })

		const blurFolder = pane.addFolder({ title: "Blur" })
		blurFolder.addInput(params, "blurMix", { min: 0, max: 1, step: 0.01 })
		blurFolder.addInput(params, "blurSharpness", { min: 0, max: 100, step: 1 })
		blurFolder.addInput(params, "blurKernelSize", { min: 0, max: 5, step: 1 })

		const jitterFolder = pane.addFolder({ title: "Jitter" })

		jitterFolder.addInput(params, "jitter", { min: 0, max: 0.5, step: 0.01 })
		jitterFolder.addInput(params, "jitterRough", { min: 0, max: 1.5, step: 0.01 })
		jitterFolder.addInput(params, "jitterSpread", { min: 0, max: 5, step: 0.01 })

		const definesFolder = pane.addFolder({ title: "Tracing" })

		definesFolder.addInput(params, "MAX_STEPS", { min: 1, max: 256, step: 1 })
		definesFolder.addInput(params, "NUM_BINARY_SEARCH_STEPS", { min: 0, max: 16, step: 1 })
		definesFolder.addInput(params, "ALLOW_MISSED_RAYS")
	}
}
