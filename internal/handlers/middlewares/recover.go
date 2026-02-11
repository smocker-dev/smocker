package middlewares

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/smocker-dev/smocker/internal/types"
)

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		defer func() {
			if r := recover(); r != nil {
				//nolint:errorlint // r is not necessarily an error
				if r == http.ErrAbortHandler {
					panic(r)
				}

				slog.ErrorContext(req.Context(), "panic recovered", slog.String("error", fmt.Sprintf("%v", r)), slog.String("stack_trace", string(debug.Stack())))

				if req.Header.Get("Connection") != "Upgrade" {
					w.WriteHeader(types.StatusSmockerError)
				}
			}
		}()

		next.ServeHTTP(w, req)
	})
}
