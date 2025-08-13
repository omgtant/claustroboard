package web

import (
	"embed"
	"net/http"
	"omgtant/claustroboard/web/middlewares"
	"omgtant/claustroboard/web/routers"
)

var (
	//go:embed out
	StaticFiles embed.FS
)

func GetRouter(projectRoot string) *http.ServeMux {
	mux := http.NewServeMux()

	// routers
	fileServer := routers.CreateFileServer(projectRoot, StaticFiles)

	// middlewares
	mux.Handle("/", middlewares.LoggingMiddleware(fileServer))

	return mux
}
