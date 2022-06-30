import path from "path"
import glslify from "rollup-plugin-glslify"
import { fileURLToPath } from "url"
import { getBabelOutputPlugin } from "@rollup/plugin-babel"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
	{
		output: {
			file: path.resolve(__dirname, "test.js"),
			format: "es"
		},
		input: path.resolve(__dirname, "../src/ssr/index.js"),
		plugins: [
			glslify(),
			getBabelOutputPlugin({
				plugins: [
					"@babel/plugin-proposal-private-methods",
					"@babel/plugin-proposal-class-properties",
					"@babel/plugin-proposal-object-rest-spread"
				]
			})
		]
	}
]
