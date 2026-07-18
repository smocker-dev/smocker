// Package frontend embeds the built web UI so a released binary is self-contained (no need to
// ship the client directory alongside it). The dist directory is populated by the client build
// (see the Makefile release target); a committed placeholder keeps `go build` working before the
// client has ever been built.
package frontend

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var dist embed.FS

// FS returns the embedded client filesystem (rooted at dist) together with whether it actually
// holds a built UI (an index.html). When only the placeholder is present it returns ok=false, so
// callers fall back to serving from the --static-files directory on disk.
func FS() (fs.FS, bool) {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		return nil, false
	}
	if _, err := fs.Stat(sub, "index.html"); err != nil {
		return nil, false
	}
	return sub, true
}
