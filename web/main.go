package web

import (
    "embed"
    "io/fs"
    "net/http"
    "os"
    "path/filepath"
    "runtime"
)

var (
    //go:embed out
    StaticFiles embed.FS
)

func GetRouter() *http.ServeMux {
    mux := http.NewServeMux()

    // Prefer serving from disk during development
    _, thisFile, _, _ := runtime.Caller(0)
    projectRoot := filepath.Clean(filepath.Join(filepath.Dir(thisFile), ".."))
    diskOut := filepath.Join(projectRoot, "web", "out")

    if fi, err := os.Stat(diskOut); err == nil && fi.IsDir() {
        mux.Handle("/", http.FileServer(http.Dir(diskOut)))
        return mux
    }

    // Fallback to embedded assets (production)
    staticFS, err := fs.Sub(StaticFiles, "out")
    if err == nil {
        fs := http.FileServer(http.FS(staticFS))
        mux.Handle("/", fs)
    }

    return mux
}