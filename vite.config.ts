/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

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
  // The build emits relative asset refs ("./assets/<file>") so the Go server's runtime
  // <base href="{{.basePath}}"> can relocate them under any deployment base path (e.g. behind
  // Caddy stripping /smocker). Dev serves from "/" for clean absolute URLs against the dev server.
  base: command === "build" ? "./" : "/",
  plugins: [react(), devIndexHtml()],
  server: {
    // Allow importing the canonical mock schema (docs/mock.schema.json) from client code, which
    // lives above the Vite root.
    fs: { allow: [import.meta.dirname] },
    // Proxy the admin API to the backend so `npm run dev` works against `make start`.
    proxy: apiProxy,
  },
  build: {
    // Build straight into the go:embed source: release binaries bake it in (-tags embedclient),
    // and dev serves it from disk via --static-files. Assets land in dist/assets (served at
    // /assets/*), index.html at the root (rendered as a Go template). Keep in sync with
    // server/admin_server.go and the Makefile.
    outDir: "../server/frontend/dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Relative to the Vite root ("client"), so this matches client/**/*.test.{ts,tsx}.
    include: ["**/*.test.{ts,tsx}"],
  },
}));
