package web

import (
	"embed"
	"fmt"
	"net/http"
	"omgtant/claustroboard/shared/config"
	"omgtant/claustroboard/web/middlewares"
	"omgtant/claustroboard/web/routers"
	"os"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	//go:embed out
	StaticFiles embed.FS
)

func GetRouter(projectRoot string) http.Handler {
	mux := http.NewServeMux()

	// init templates
	if err := routers.InitTemplates(StaticFiles); err != nil {
		panic(fmt.Sprintf("Failed to initialize templates: %v", err))
	}

	// template routes
	mux.HandleFunc("GET /{$}", routers.TemplateHandler("index.html", defaultTemplateDataFunc))

	// static files
	mux.Handle("GET /static/", routers.CreateFileServer(projectRoot, StaticFiles))

	// Prometheus /metrics
	mux.Handle("/metrics", promhttp.Handler())

	// API routes
	apiMux := http.NewServeMux()
	apiMux.HandleFunc("POST /feedback", routers.PostFeedback)
	// websocket routes
	apiMux.HandleFunc("GET /start-game", routers.StartGameWS)
	apiMux.HandleFunc("GET /join/{id}", routers.JoinGameWS)
	apiMux.HandleFunc("GET /public-games", routers.RequestRTTWS)
	// debug routes
	if config.Get().ENVIRONMENT == "development" {
		apiMux.HandleFunc("GET /get-pid", getPID)
	}
	mux.Handle("/api/v1/", middlewares.LoggingMiddleware(http.StripPrefix("/api/v1", apiMux)))

	return middlewares.RequestsTotalMiddleware(mux)
}

func getPID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte(fmt.Sprintf("%d", os.Getpid())))
}

func defaultTemplateDataFunc(r *http.Request) any {
	return map[string]any{
		"test": "hello world",
	}
}
