package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

type MockServer interface {
	AddRoute(MockRoute)
	Reset()
}

type mockServer struct {
	server       *echo.Echo
	mocksByRoute map[string]MockRoutes
}

func NewMockServer(port int) MockServer {
	s := &mockServer{
		server:       echo.New(),
		mocksByRoute: map[string]MockRoutes{},
	}

	s.server.HideBanner = true
	s.server.HidePort = true
	s.server.Any("/*", s.genericHandler)

	log.WithField("port", port).Info("Starting mock server")
	go func() {
		if err := s.server.Start(":" + strconv.Itoa(port)); err != nil {
			log.WithError(err).Error("Mock Server execution failed")
		}
	}()

	return s
}

func (s *mockServer) genericHandler(c echo.Context) error {
	method, path := c.Request().Method, c.Request().URL.Path

	// Query Params
	mocks := s.mocksByRoute[method+" "+path]
	queryParams := QueryParams(c.QueryParams())
	var response *MockResponse
	for _, mock := range mocks {
		if queryParams.Equals(mock.Request.QueryParams) {
			response = &mock.Response
			break
		}
	}
	if response == nil {
		return c.NoContent(http.StatusNotFound)
	}

	// Headers
	for key, values := range response.Headers {
		for _, value := range values {
			c.Response().Header().Add(key, value)
		}
	}

	// Delay
	time.Sleep(response.Delay)

	// Status
	c.Response().WriteHeader(response.Status)

	// Body
	_, err := c.Response().Write([]byte(response.Body))
	return err
}

func (s *mockServer) AddRoute(newMock MockRoute) {
	mocks, ok := s.mocksByRoute[newMock.Request.Hash()]
	if ok {
		for i, mock := range mocks {
			if newMock.Request.QueryParams.Equals(mock.Request.QueryParams) {
				mocks[i] = newMock
				s.mocksByRoute[newMock.Request.Hash()] = mocks
				return
			}
		}
		mocks = append(mocks, newMock)
		s.mocksByRoute[newMock.Request.Hash()] = mocks
		return
	}

	s.mocksByRoute[newMock.Request.Hash()] = MockRoutes{newMock}
}

func (s *mockServer) Reset() {
	s.mocksByRoute = map[string]MockRoutes{}
}
