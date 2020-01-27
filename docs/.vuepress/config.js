const path = require("path");

module.exports = {
  title: "smocker",
  chainWebpack: (config, _) => {
    config.resolve.alias.set("@root", path.resolve(__dirname, ".."));
  },
  themeConfig: {
    sidebar: [
      {
        title: "Guide",
        collapsable: false,
        sidebarDepth: 1,
        children: ["/guide/", "/guide/getting-started"]
      }
    ]
  },
  plugins: ["vuepress-plugin-mermaidjs"]
};
