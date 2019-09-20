package server

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"

	"github.com/Thiht/smock/types"
	"github.com/labstack/echo"
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
			err := next(c)
			if err != nil {
				return err
			}
			var response map[string]interface{}
			err = json.Unmarshal(responseBody.Bytes(), &response)
			if err != nil {
				response = map[string]interface{}{
					"body": string(responseBody.Bytes()),
				}
			} else {
				response = map[string]interface{}{
					"body": response,
				}
			}
			s.history = append(s.history, types.Entry{
				Request:  request,
				Response: types.Response{Body: response},
			})
			return nil
		}
	}
}
