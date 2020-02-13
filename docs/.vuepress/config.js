const path = require("path");

module.exports = {
  title: "Smocker",
  description: "Smocker is a simple and efficient HTTP mock server.",
  head: [
    [
      "link",
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/logo/favicon/apple-touch-icon.png"
      }
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/logo/favicon/favicon-32x32.png"
      }
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/logo/favicon/favicon-16x16.png"
      }
    ],
    ["link", { rel: "manifest", href: "/logo/favicon/site.webmanifest" }],
    [
      "link",
      {
        rel: "mask-icon",
        href: "/logo/favicon/safari-pinned-tab.svg",
        color: "#b51629"
      }
    ],
    ["link", { rel: "shortcut icon", href: "/logo/favicon/favicon.ico" }],
    ["meta", { name: "apple-mobile-web-app-title", content: "Smocker" }],
    ["meta", { name: "application-name", content: "Smocker" }],
    ["meta", { name: "msapplication-TileColor", content: "#446fcd" }],
    [
      "meta",
      {
        name: "msapplication-config",
        content: "/logo/favicon/browserconfig.xml"
      }
    ],
    ["meta", { name: "theme-color", content: "#ffffff" }]
  ],
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
        children: [
          "/guide/",
          "/guide/installation",
          "/guide/getting-started",
          "/guide/real-life",
          "/guide/tooling"
        ]
      },
      {
        title: "Technical Documentation",
        collapsable: false,
        sidebarDepth: 1,
        children: [
          "/technical-documentation/api",
          "/technical-documentation/mock-definition"
        ]
      }
    ]
  },
  plugins: [
    "vuepress-plugin-mermaidjs",
    [
      "one-click-copy",
      {
        copySelector: [
          'div[class*="language-"] pre',
          'div[class*="aside-code"] aside'
        ],
        copyMessage: "Code copied to your clipboard.",
        duration: 1000
      }
    ],
    [
      "vuepress-plugin-zooming",
      {
        selector: "#app .theme-default-content:not(.custom) img",
        delay: 1000,
        options: {
          bgColor: "black",
          zIndex: 10000
        }
      }
    ]
  ]
};
