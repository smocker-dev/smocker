package middlewares

import (
	"log/slog"
	"net/http"
	"time"
)

func Log(next http.Handler, ignoredPaths ...string) http.Handler {
	ignoredPathsMap := make(map[string]struct{}, len(ignoredPaths))
	for _, path := range ignoredPaths {
		ignoredPathsMap[path] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ignored := ignoredPathsMap[r.URL.Path]; ignored {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now().UTC()
		slogAttrs := []any{
			slog.Time("start_time", start),
			slog.String("remote_addr", r.RemoteAddr),
			slog.String("proto", r.Proto),
			slog.String("method", r.Method),
			slog.String("host", r.Host),
			slog.String("path", r.URL.Path),
		}

		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r)

		end := time.Now().UTC()
		slogAttrs = append(slogAttrs,
			slog.Int("status", sw.status),
			slog.Time("end_time", end),
			slog.Duration("duration", end.Sub(start)),
		)

		slog.DebugContext(r.Context(), "handled request", slogAttrs...)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}
