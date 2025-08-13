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
	// Upgraded to websocket (GET)
	apiMux.HandleFunc("GET /start-game", routers.StartGameWS)
	apiMux.HandleFunc("GET /join/{id}", routers.JoinGameWS)

	mux.Handle("/api/v1/", middlewares.LoggingMiddleware(http.StripPrefix("/api/v1", apiMux)))

	return mux
}
