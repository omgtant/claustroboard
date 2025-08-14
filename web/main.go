package web

import (
	"embed"
	"fmt"
	"net/http"
	"omgtant/claustroboard/shared/config"
	"omgtant/claustroboard/web/middlewares"
	"omgtant/claustroboard/web/routers"
	"os"
)

var (
	//go:embed out
	StaticFiles embed.FS
)

func GetRouter(projectRoot string) *http.ServeMux {
	mux := http.NewServeMux()

	// static files
	mux.Handle("/", routers.CreateFileServer(projectRoot, StaticFiles))

	// debug
	if config.Get().ENVIRONMENT == "development" {
		mux.HandleFunc("/api/v1/get-pid", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/plain")
			w.Write([]byte(fmt.Sprintf("%d", os.Getpid())))
		})
	}

	// API routes
	apiMux := http.NewServeMux()
	// Upgraded to websocket (GET)
	apiMux.HandleFunc("GET /start-game", routers.StartGameWS)
	apiMux.HandleFunc("GET /join/{id}", routers.JoinGameWS)

	mux.Handle("/api/v1/", middlewares.LoggingMiddleware(http.StripPrefix("/api/v1", apiMux)))

	return mux
}
