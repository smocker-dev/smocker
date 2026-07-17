package server

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"runtime"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/smocker-dev/smocker/server/services"
	"github.com/smocker-dev/smocker/server/types"
)

type bodyDumpResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w *bodyDumpResponseWriter) WriteHeader(code int) {
	w.ResponseWriter.WriteHeader(code)
}

func (w *bodyDumpResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func (w *bodyDumpResponseWriter) Flush() {
	w.ResponseWriter.(http.Flusher).Flush()
}

func (w *bodyDumpResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return w.ResponseWriter.(http.Hijacker).Hijack()
}

func HistoryMiddleware(s services.Mocks) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			session := s.GetLastSession()
			if c.Request() == nil {
				return echo.NewHTTPError(types.StatusSmockerInternalError, fmt.Sprintf("%s: Empty request", types.SmockerInternalError))
			}

			request := types.HTTPRequestToRequest(c.Request())
			request.Date = time.Now()

			responseBody := new(bytes.Buffer)
			mw := io.MultiWriter(c.Response().Writer, responseBody)
			writer := &bodyDumpResponseWriter{Writer: mw, ResponseWriter: c.Response().Writer}
			c.Response().Writer = writer

			if err := next(c); err != nil {
				return echo.NewHTTPError(types.StatusSmockerInternalError, fmt.Sprintf("%s: %v", types.SmockerInternalError, err))
			}

			responseBytes := responseBody.Bytes()
			if c.Response().Header().Get("Content-Encoding") == "gzip" {
				r, err := gzip.NewReader(responseBody)
				if err != nil {
					slog.Error("Unable to uncompress response body", "error", err)
				} else {
					responseBytes, err = io.ReadAll(r)
					if err != nil {
						slog.Error("Unable to read uncompressed response body", "error", err)
						responseBytes = responseBody.Bytes()
					}
				}
			}

			var body interface{}
			if err := json.Unmarshal(responseBytes, &body); err != nil {
				body = string(responseBytes)
			}

			context, _ := c.Get(types.ContextKey).(*types.Context)
			if context == nil {
				context = &types.Context{}
			}
			_, err := s.AddHistoryEntry(session.ID, &types.Entry{
				Context: *context,
				Request: request,
				Response: types.Response{
					Status:  c.Response().Status,
					Body:    body,
					Headers: c.Response().Header(),
					Date:    time.Now(),
				},
			})
			if err != nil {
				return echo.NewHTTPError(types.StatusSmockerInternalError, fmt.Sprintf("%s: %v", types.SmockerInternalError, err))
			}
			return nil
		}
	}
}

func loggerMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()

			start := time.Now()
			p := req.URL.Path
			if p == "" {
				p = "/"
			}

			bytesIn := req.Header.Get(echo.HeaderContentLength)
			if bytesIn == "" {
				bytesIn = "0"
			}

			headers := fmt.Sprintf("%+v", req.Header)

			entry := slog.With(
				"start", start.Format(time.RFC3339),
				"remote-ip", c.RealIP(),
				"host", req.Host,
				"uri", req.RequestURI,
				"method", req.Method,
				"path", p,
				"headers", headers,
				"bytes-in", bytesIn,
			)
			entry.Debug("Handling request...")

			if err := next(c); err != nil {
				c.Error(err)
			}

			res := c.Response()
			end := time.Now()
			entry = entry.With(
				"end", end.Format(time.RFC3339),
				"status", res.Status,
				"latency", end.Sub(start).String(),
				"bytes-out", res.Size,
			)

			switch {
			case res.Status < 400:
				entry.Info("Handled request")
			case res.Status < 500:
				entry.Warn("Handled request")
			default:
				entry.Error("Handled request")
			}

			return nil
		}
	}
}

// Same as echo's RecoverWithConfig middleware, with DefaultRecoverConfig
func recoverMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			defer func() {
				if r := recover(); r != nil {
					err, ok := r.(error)
					if !ok {
						err = fmt.Errorf("%v", r)
					}
					stack := make([]byte, 4<<10) // 4 KB
					length := runtime.Stack(stack, true)
					slog.Error(fmt.Sprintf("[PANIC RECOVER] %s", stack[:length]), "error", err)
					c.Error(err)
				}
			}()
			return next(c)
		}
	}
}
