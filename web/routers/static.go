package routers

import (
	"embed"
	"io/fs"
	"net/http"
	"omgtant/claustroboard/shared/config"
	"os"
	"path/filepath"
)

// Creates an http.Handler for serving static files
func CreateFileServer(projectRoot string, files embed.FS) http.Handler {
	// Prefer serving from disk during development
	if config.Get().ENVIRONMENT == "development" {
		diskOut := filepath.Join(projectRoot, "web", "out")

		if fi, err := os.Stat(diskOut); err == nil && fi.IsDir() {
			return http.FileServer(http.Dir(diskOut))
		}
	}

	// Fallback to embedded assets (production)
	staticFS, err := fs.Sub(files, "out")
	if err != nil {
		return http.NotFoundHandler()
	}

	return http.FileServer(http.FS(staticFS))
}
