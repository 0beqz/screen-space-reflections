const { merge } = require('webpack-merge');
const commonConfiguration = require('./webpack.common.js')
const path = require('path')

module.exports = merge(
    commonConfiguration,
    {
        mode: 'development',
        devServer:
        {
            open: true,
            static: "./dist",
            hot: true,
            liveReload: true
        },
        cache: false
    }
)
