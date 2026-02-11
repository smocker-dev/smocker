package render

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("failed to encode JSON response", slog.Any("error", err))
	}
}

func Error(w http.ResponseWriter, status int, err error) {
	JSON(w, status, map[string]string{
		"error": err.Error(),
	})
}
