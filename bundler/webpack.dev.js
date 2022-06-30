import { merge } from "webpack-merge"
import commonConfiguration from "./webpack.common.js"

export default merge(commonConfiguration, {
	mode: "development",
	devServer: {
		open: true,
		static: "./dist",
		hot: true,
		liveReload: true
	},
	cache: false
})
