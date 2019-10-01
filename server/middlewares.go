package server

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"runtime"
	"strconv"
	"time"

	"github.com/Thiht/smocker/types"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"

	log "github.com/sirupsen/logrus"
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

func (s *mockServer) historyMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()
			if req == nil {
				return fmt.Errorf("empty request")
			}
			request := types.HTTPRequestToRequest(req)
			responseBody := new(bytes.Buffer)
			mw := io.MultiWriter(c.Response().Writer, responseBody)
			writer := &bodyDumpResponseWriter{Writer: mw, ResponseWriter: c.Response().Writer}
			c.Response().Writer = writer

			if err := next(c); err != nil {
				return err
			}

			response := c.Response()

			var body interface{}
			var tmp map[string]interface{}
			if err := json.Unmarshal(responseBody.Bytes(), &tmp); err != nil {
				body = responseBody.String()
			} else {
				body = tmp
			}
			s.history = append(s.history, types.Entry{
				Request: request,
				Response: types.Response{
					Status:  response.Status,
					Body:    body,
					Headers: types.HTTPHeaderToMapStringSlice(response.Header()),
				},
			})
			return nil
		}
	}
}

func loggerMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()
			res := c.Response()
			start := time.Now()
			if err := next(c); err != nil {
				c.Error(err)
			}
			end := time.Now()

			p := req.URL.Path
			if p == "" {
				p = "/"
			}

			bytesIn := req.Header.Get(echo.HeaderContentLength)
			if bytesIn == "" {
				bytesIn = "0"
			}

			entry := log.WithFields(log.Fields{
				"start":     start.Format(time.RFC3339),
				"end":       end.Format(time.RFC3339),
				"remote-ip": c.RealIP(),
				"host":      req.Host,
				"uri":       req.RequestURI,
				"method":    req.Method,
				"path":      p,
				"status":    res.Status,
				"latency":   end.Sub(start).String(),
				"bytes-in":  bytesIn,
				"bytes-out": strconv.FormatInt(res.Size, 10),
			})

			if res.Status < 400 {
				entry.Info("Handled request")
			} else if res.Status < 500 {
				entry.Warn("Handled request")
			} else {
				entry.Error("Handled request")
			}

			return nil
		}
	}
}

// recoverMiddleware returns a middleware which recovers from panics anywhere in the chain
// and handles the control to the centralized HTTPErrorHandler.
func recoverMiddleware() echo.MiddlewareFunc {
	return recoverWithConfig(middleware.DefaultRecoverConfig)
}

// See: https://github.com/labstack/echo/blob/master/middleware/recover.go#L49. but use logrus
func recoverWithConfig(config middleware.RecoverConfig) echo.MiddlewareFunc {
	// Defaults
	if config.Skipper == nil {
		config.Skipper = middleware.DefaultRecoverConfig.Skipper
	}
	if config.StackSize == 0 {
		config.StackSize = middleware.DefaultRecoverConfig.StackSize
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if config.Skipper(c) {
				return next(c)
			}

			defer func() {
				if r := recover(); r != nil {
					err, ok := r.(error)
					if !ok {
						err = fmt.Errorf("%v", r)
					}
					stack := make([]byte, config.StackSize)
					length := runtime.Stack(stack, !config.DisableStackAll)
					if !config.DisablePrintStack {
						log.WithError(err).Errorf("[PANIC RECOVER] %s", stack[:length])
					}
					c.Error(err)
				}
			}()
			return next(c)
		}
	}
}
