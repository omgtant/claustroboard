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

	// static files
	mux.Handle("/", routers.CreateFileServer(projectRoot, StaticFiles))

	// API routes
	apiMux := http.NewServeMux()
	apiMux.HandleFunc("POST /start-game", routers.StartGame)
	apiMux.HandleFunc("POST /join/{id}", routers.JoinGame)

	mux.Handle("/api/v1/", middlewares.LoggingMiddleware(http.StripPrefix("/api/v1", apiMux)))

	return mux
}
