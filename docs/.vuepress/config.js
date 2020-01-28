const path = require("path");

module.exports = {
  title: "Smocker",
  chainWebpack: (config, _) => {
    config.resolve.alias.set("@root", path.resolve(__dirname, ".."));
  },
  themeConfig: {
    logo: "/logo/logo-h50.png",
    nav: [{ text: "GitHub", link: "https://github.com/Thiht/smocker" }],
    sidebar: [
      {
        title: "Guide",
        collapsable: false,
        sidebarDepth: 1,
        children: ["/guide/", "/guide/getting-started", "/guide/real-life"]
      }
    ]
  },
  plugins: [
    "vuepress-plugin-mermaidjs",
    "one-click-copy",
    {
      copySelector: [
        'div[class*="language-"] pre',
        'div[class*="aside-code"] aside'
      ],
      copyMessage: "Copy successfully and then paste it for use.",
      duration: 300
    }
  ]
};
