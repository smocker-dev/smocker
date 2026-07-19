//go:build !embedclient

// Package frontend optionally embeds the built web UI. By default (no build tag) the UI is NOT
// embedded: FS reports none, so the server falls back to serving from --static-files. This lets
// `go build` / `go test` work without a built client (CI test/lint/security never build it).
// Release builds pass `-tags embedclient` after building the client to bake the UI into the
// binary — see frontend_embed.go.
package frontend

import "io/fs"

// FS returns the embedded client filesystem and whether a UI is embedded. Without the
// "embedclient" build tag there is none.
func FS() (fs.FS, bool) { return nil, false }
