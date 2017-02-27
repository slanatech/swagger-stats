var path = require('path');

module.exports = function(env) {
    return {
        entry: './indexui.js',
        output: {
            filename: '[chunkhash].[name].js',
            path: path.resolve(__dirname, 'dist')
        }
    }
}
