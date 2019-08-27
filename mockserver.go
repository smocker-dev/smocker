package main

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

type MockServer interface {
	Start(port int)
	AddRoute(MockRoute)
}

type mockServer struct {
	server       *echo.Echo
	running      bool
	mocksByRoute map[string]MockRoutes
}

func NewMockServer() MockServer {
	s := echo.New()
	s.HideBanner = true
	s.HidePort = true
	return &mockServer{
		server:       s,
		running:      false,
		mocksByRoute: map[string]MockRoutes{},
	}
}

func (s *mockServer) Start(port int) {
	if !s.running {
		log.WithField("port", port).Info("Starting mock server")
		s.running = true
		go func() {
			if err := s.server.Start(":" + strconv.Itoa(port)); err != nil {
				log.WithError(err).Error("Mock Server execution failed")
			}
			s.running = false
		}()
	}
}

func (s *mockServer) AddRoute(route MockRoute) {
	mocks, ok := s.mocksByRoute[route.Request.Hash()]
	if ok {
		for i, mock := range mocks {
			if route.Request.QueryParams.Equals(mock.Request.QueryParams) {
				mocks[i] = route
				s.mocksByRoute[route.Request.Hash()] = mocks
				return
			}
		}
		mocks = append(mocks, route)
		s.mocksByRoute[route.Request.Hash()] = mocks
		return
	}

	s.mocksByRoute[route.Request.Hash()] = MockRoutes{route}

	s.server.Add(route.Request.Method, route.Request.Path, func(c echo.Context) error {
		// Query Params
		mocks := s.mocksByRoute[route.Request.Hash()]
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

		// Status
		c.Response().WriteHeader(response.Status)

		// Body
		_, err := c.Response().Write([]byte(response.Body))
		return err
	})
}
