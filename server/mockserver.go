package server

import (
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/Thiht/smocker/templates"
	"github.com/Thiht/smocker/types"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"
)

type MockServer interface {
	AddMock(*types.Mock)
	Mocks() types.Mocks
	History(filterPath string) (types.History, error)
	Reset()
}

type mockServer struct {
	server  *echo.Echo
	mocks   types.Mocks
	history types.History
	mu      sync.Mutex
}

func NewMockServer(port int) MockServer {
	s := &mockServer{
		server:  echo.New(),
		mocks:   types.Mocks{},
		history: types.History{},
	}

	s.server.HideBanner = true
	s.server.HidePort = true
	s.server.Use(recoverMiddleware(), loggerMiddleware(), s.historyMiddleware())
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
	s.mu.Lock()
	defer s.mu.Unlock()

	actualRequest := types.HTTPRequestToRequest(c.Request())
	b, _ := yaml.Marshal(actualRequest)
	log.Debugf("Received request:\n---\n%s\n", string(b))

	/* Request matching */

	var (
		matchingMock *types.Mock
		response     *types.MockResponse
		err          error
	)
	exceededMocks := types.Mocks{}
	for _, mock := range s.mocks {
		if mock.Request.Match(actualRequest) {
			matchingMock = mock
			if matchingMock.Context.Times > 0 && matchingMock.State.TimesCount >= matchingMock.Context.Times {
				b, _ = yaml.Marshal(mock)
				log.Debugf("Times exceeded, skipping mock:\n---\n%s\n", string(b))
				exceededMocks = append(exceededMocks, mock)
				continue
			}
			if mock.DynamicResponse != nil {
				response, err = templates.GenerateMockResponse(mock.DynamicResponse, actualRequest)
				if err != nil {
					return c.JSON(http.StatusInternalServerError, echo.Map{
						"message": err.Error(),
						"request": actualRequest,
					})
				}
			} else {
				response = mock.Response
			}
			matchingMock.State.TimesCount++
			break
		} else {
			b, _ = yaml.Marshal(mock)
			log.Debugf("Skipping mock:\n---\n%s\n", string(b))
		}
	}
	if response == nil {
		resp := echo.Map{
			"message": "No mock found matching the request",
			"request": actualRequest,
		}
		if len(exceededMocks) > 0 {
			for _, mock := range exceededMocks {
				mock.State.TimesCount++
			}
			resp["message"] = "Matching mock found but was exceeded"
			resp["nearest"] = exceededMocks
		}
		return c.JSON(http.StatusNotFound, resp)
	}

	/* Response writing */

	// Headers
	for key, values := range response.Headers {
		for _, value := range values {
			c.Response().Header().Add(key, value)
		}
	}

	// Delay
	time.Sleep(response.Delay)

	// Status
	if response.Status == 0 {
		// Fallback to 200 OK
		response.Status = http.StatusOK
	}
	c.Response().WriteHeader(response.Status)

	// Body
	if _, err = c.Response().Write([]byte(response.Body)); err != nil {
		log.WithError(err).Error("Failed to write response body")
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	b, _ = yaml.Marshal(matchingMock)
	log.Debugf("Matching mock:\n---\n%s\n", string(b))
	b, _ = yaml.Marshal(response)
	log.Debugf("Returned response:\n---\n%s\n", string(b))
	return nil
}

func (s *mockServer) AddMock(newMock *types.Mock) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mocks = append(types.Mocks{newMock}, s.mocks...)
}

func (s *mockServer) Mocks() types.Mocks {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.mocks
}

func (s *mockServer) History(filterPath string) (types.History, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res := types.History{}
	regex, err := regexp.Compile(filterPath)
	if err != nil {
		return res, err
	}
	for _, entry := range s.history {
		if regex.Match([]byte(entry.Request.Path)) {
			res = append(res, entry)
		}
	}
	return res, nil
}

func (s *mockServer) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mocks = types.Mocks{}
	s.history = types.History{}
}
