import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Smocker",
  tagline: "A simple and efficient HTTP mock server.",
  favicon: "/img/favicon/favicon.ico",

  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/img/favicon/apple-touch-icon.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/img/favicon/favicon-32x32.png",
      },
    },

    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/img/favicon/favicon-16x16.png",
      },
    },
    {
      tagName: "link",
      attributes: { rel: "manifest", href: "/img/favicon/site.webmanifest" },
    },
    {
      tagName: "meta",
      attributes: { name: "apple-mobile-web-app-title", content: "Smocker" },
    },
    {
      tagName: "meta",
      attributes: { name: "application-name", content: "Smocker" },
    },
    {
      tagName: "meta",
      attributes: { name: "msapplication-TileColor", content: "#446fcd" },
    },
    {
      tagName: "meta",
      attributes: {
        name: "msapplication-config",
        content: "/img/favicon/browserconfig.xml",
      },
    },
    // See: https://css-tricks.com/essential-meta-tags-social-media/#article-header-id-2
    {
      tagName: "meta",
      attributes: { name: "theme-color", content: "#ffffff" },
    },
  ],

  url: "https://smocker.dev",
  baseUrl: "/",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [require.resolve("docusaurus-lunr-search")],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/Thiht/smocker/tree/master/docs/docs",
          sidebarCollapsed: false,
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
  },

  themes: ["@docusaurus/theme-mermaid"],

  themeConfig: {
    image: "/img/cover.png",
    navbar: {
      title: "Smocker",
      logo: {
        alt: "Smocker Logo",
        src: "img/logo-h50.png",
      },
      items: [
        {
          href: "https://github.com/Thiht/smocker",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      copyright: "Distributed under the MIT License.",
      style: "dark",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
