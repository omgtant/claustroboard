package web

import (
	"embed"
	"io/fs"
	"net/http"
)

var (
	//go:embed out
	StaticFiles embed.FS
)

func GetRouter() *http.ServeMux {
	mux := http.NewServeMux()

	staticFS, err := fs.Sub(StaticFiles, "out")
	if err == nil {
		fs := http.FileServer(http.FS(staticFS))
		mux.Handle("/", fs)
	}

	return mux
}
