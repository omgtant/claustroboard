package middlewares

import (
	"net/http"
	"omgtant/claustroboard/shared/metrics"
)

func RequestsTotalMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		metrics.RequestsTotal.Inc()
		next.ServeHTTP(w, r)
	})
}