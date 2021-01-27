const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  publicPath: './',
  devServer: {
    disableHostCheck: true
  }, configureWebpack: () => {
    if (process.env.NODE_ENV !== 'development') {
      return {
        plugins: [
          new CopyPlugin([
              {
                from: path.resolve(__dirname, `./alida.json`),
                to: path.resolve(__dirname, './dist/json/alida.json')
              }
            ]
          ),
        ],
      }
    } else {
      return;
    }
  }
}
