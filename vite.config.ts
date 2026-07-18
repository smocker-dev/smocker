/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// The Go admin server serves the built client directory (build/client) under the /assets URL
// prefix and renders index.html as a Go text/template (injecting {{.basePath}} / {{.version}}).
// Parcel used publicUrl "./assets": flat files in build/client referenced as relative
// "./assets/<file>", so the runtime <base href> makes them resolve under any deployment base
// path (e.g. behind Caddy stripping /smocker). Vite forbids a "./assets/" base, so we emit flat,
// relative refs (base "./", assetsDir ".") and prefix them with "assets/" in the HTML afterwards.
// Keep this in sync with server/admin_server.go (Static("/assets", ...) + renderIndex) and the
// Makefile (which packages build/client).
function assetsPrefix(): Plugin {
  let indexPath = "";
  return {
    name: "smocker-assets-prefix",
    apply: "build",
    configResolved(cfg) {
      indexPath = resolve(cfg.root, cfg.build.outDir, "index.html");
    },
    // Rewrite on disk after Vite has finished emitting (so both injected <script> tags and
    // resolved source <link> hrefs are covered): "./<file>" -> "./assets/<file>".
    closeBundle() {
      let html = readFileSync(indexPath, "utf8");
      html = html.replace(/(src|href)="\.\/(?!assets\/)/g, '$1="./assets/');
      writeFileSync(indexPath, html);
    },
  };
}

// In the dev server, Vite serves index.html without the Go template step, so the runtime globals
// stay as literal "{{.basePath}}" / "{{.version}}" and break the API base + <base href>. Substitute
// them for dev only; the production build keeps the placeholders for the Go server to render.
function devIndexHtml(): Plugin {
  return {
    name: "smocker-dev-index-html",
    apply: "serve",
    transformIndexHtml(html) {
      return html
        .replace(/\{\{\.basePath\}\}/g, "/")
        .replace(/\{\{\.version\}\}/g, "dev");
    },
  };
}

// Where `npm run dev` proxies the API to (the running `make start` admin server).
const devProxyTarget = process.env.SMOCKER_DEV_PROXY ?? "http://localhost:8081";
const apiProxy = Object.fromEntries(
  ["/mocks", "/sessions", "/history", "/version", "/reset"].map((path) => [
    path,
    devProxyTarget,
  ]),
);

export default defineConfig(({ command }) => ({
  root: "client",
  // Dev serves from "/" (clean absolute URLs against the dev server); the build keeps "./" so the
  // Go server's <base href> can relocate assets under any deployment base path.
  base: command === "build" ? "./" : "/",
  plugins: [react(), assetsPrefix(), devIndexHtml()],
  server: {
    // Allow importing the canonical mock schema (docs/mock.schema.json) from client code, which
    // lives above the Vite root.
    fs: { allow: [import.meta.dirname] },
    // Proxy the admin API to the backend so `npm run dev` works against `make start`.
    proxy: apiProxy,
  },
  build: {
    outDir: "../build/client",
    emptyOutDir: true,
    assetsDir: ".",
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Relative to the Vite root ("client"), so this matches client/**/*.test.{ts,tsx}.
    include: ["**/*.test.{ts,tsx}"],
  },
}));
