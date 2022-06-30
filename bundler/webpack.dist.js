import { CleanWebpackPlugin } from "clean-webpack-plugin"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
	entry: path.resolve(__dirname, "../src/ssr/index.js"),
	target: "web",
	mode: "production",
	// type: "module",
	output: {
		filename: "SSRPass.js",
		path: path.resolve(__dirname, "../dist"),
		// clean: true,
		library: {
			type: "module"
		}
	},
	externals: {
		three: "three",
		postprocessing: "postprocessing"
	},
	plugins: [new CleanWebpackPlugin()],
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: false
	},
	module: {
		rules: [
			// HTML
			{
				test: /\.(html)$/,
				use: ["html-loader"]
			},

			// JS
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						plugins: [
							"@babel/plugin-proposal-private-methods",
							"@babel/plugin-proposal-class-properties",
							"@babel/plugin-proposal-object-rest-spread"
						]
					}
				}
			},

			// CSS
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"]
			},

			// Images
			{
				test: /\.(jpg|png|gif|svg)$/,
				use: [
					{
						loader: "file-loader",
						options: {
							outputPath: "assets/images/"
						}
					}
				]
			},
			{ test: /\.vert$/, use: "raw-loader" },
			{ test: /\.frag$/, use: "raw-loader" }
		]
	}
}
