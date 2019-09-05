package main

import (
	"io/ioutil"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

type MockServer interface {
	AddRoute(Route)
	Reset()
}

type mockServer struct {
	server       *echo.Echo
	mocksByRoute map[string]Routes
}

func NewMockServer(port int) MockServer {
	s := &mockServer{
		server:       echo.New(),
		mocksByRoute: map[string]Routes{},
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
	body, err := ioutil.ReadAll(c.Request().Body)
	if err != nil {
		log.WithError(err).Error("Failed to read request body")
	}

	actualRequest := Request{
		Path:        c.Request().URL.Path,
		Method:      c.Request().Method,
		QueryParams: QueryParams(c.QueryParams()),
		Body:        string(body),
	}

	// Query Params
	var (
		response      Response
		responseFound bool
	)
	mocks := s.mocksByRoute[actualRequest.Hash()]
	for _, mock := range mocks {
		if actualRequest.QueryParams.Equals(mock.Request.QueryParams) {
			if mock.DynamicResponse != nil {
				response = mock.DynamicResponse.ToMockResponse(actualRequest)
			} else {
				response = mock.Response
			}
			responseFound = true
			break
		}
	}
	if !responseFound {
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
	_, err = c.Response().Write([]byte(response.Body))
	return err
}

func (s *mockServer) AddRoute(newMock Route) {
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

	s.mocksByRoute[newMock.Request.Hash()] = Routes{newMock}
}

func (s *mockServer) Reset() {
	s.mocksByRoute = map[string]Routes{}
}
