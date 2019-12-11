const path = require("path");

module.exports = {
  title: 'smocker',
  chainWebpack: (config, _) => {
    config.resolve.alias.set('@root', path.resolve(__dirname, ".."))
  }
}
