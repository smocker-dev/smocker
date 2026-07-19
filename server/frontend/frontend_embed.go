//go:build embedclient

package frontend

import (
	"embed"
	"io/fs"
)

// dist is populated by the client build (Vite outputs straight here — see the Makefile and
// vite.config.ts). It only needs to exist when building with `-tags embedclient`.
//
//go:embed all:dist
var dist embed.FS

// FS returns the embedded client filesystem (rooted at dist) and whether it holds a built UI.
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
