import CopyWebpackPlugin from "copy-webpack-plugin"
import HtmlWebpackPlugin from "html-webpack-plugin"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
	entry: path.resolve(__dirname, "../src/index.js"),
	target: "web",
	output: {
		filename: "[name].[contenthash].js",
		path: path.resolve(__dirname, "../public"),
		clean: true
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [{ from: "static" }]
		}),
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "../src/index.html")
		})
	],
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
				use: ["babel-loader"]
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
