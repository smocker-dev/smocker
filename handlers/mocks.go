package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/Thiht/smocker/services"
	"github.com/Thiht/smocker/templates"
	"github.com/Thiht/smocker/types"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type Mocks struct {
	mocksServices services.Mocks
}

func NewMocks(ms services.Mocks) *Mocks {
	return &Mocks{
		mocksServices: ms,
	}
}

func (m *Mocks) GenericHandler(c echo.Context) error {
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
	session := m.mocksServices.GetLastSession()
	mocks, err := m.mocksServices.GetMocks(session.ID)
	if err != nil {
		return c.JSON(types.StatusSmockerInternalError, echo.Map{
			"message": fmt.Sprintf("%s: %v", types.SmockerInternalError, err),
			"request": actualRequest,
		})
	}

	for _, mock := range mocks {
		if mock.Request.Match(actualRequest) {
			matchingMock = mock
			if matchingMock.Context.Times > 0 && matchingMock.State.TimesCount >= matchingMock.Context.Times {
				b, _ = yaml.Marshal(mock)
				log.Tracef("Times exceeded, skipping mock:\n---\n%s\n", string(b))
				exceededMocks = append(exceededMocks, mock)
				continue
			}

			b, _ = yaml.Marshal(matchingMock)
			log.Debugf("Matching mock:\n---\n%s\n", string(b))
			if mock.DynamicResponse != nil {
				response, err = templates.GenerateMockResponse(mock.DynamicResponse, actualRequest)
				if err != nil {
					return c.JSON(types.StatusSmockerEngineExecutionError, echo.Map{
						"message": fmt.Sprintf("%s: %v", types.SmockerEngineExecutionError, err),
						"request": actualRequest,
					})
				}
			} else if mock.Proxy != nil {
				response, err = mock.Proxy.Redirect(actualRequest)
				if err != nil {
					return c.JSON(types.StatusSmockerProxyRedirectionError, echo.Map{
						"message": fmt.Sprintf("%s: %v", types.SmockerProxyRedirectionError, err),
						"request": actualRequest,
					})
				}
			} else if mock.Response != nil {
				response = mock.Response
			}

			matchingMock.State.TimesCount++
			c.Set(types.MockIDKey, matchingMock.State.ID)
			break
		} else {
			b, _ = yaml.Marshal(mock)
			log.Tracef("Skipping mock:\n---\n%s\n", string(b))
		}
	}

	if response == nil {
		resp := echo.Map{
			"message": types.SmockerMockNotFound,
			"request": actualRequest,
		}

		if len(exceededMocks) > 0 {
			for _, mock := range exceededMocks {
				mock.State.TimesCount++
			}
			resp["message"] = types.SmockerMockExceeded
			resp["nearest"] = exceededMocks
		}

		b, _ = yaml.Marshal(resp)
		log.Debugf("No mock found, returning:\n---\n%s\n", string(b))
		return c.JSON(types.StatusSmockerMockNotFound, resp)
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
		return echo.NewHTTPError(types.StatusSmockerInternalError, fmt.Sprintf("%s: %v", types.SmockerInternalError, err))
	}

	b, _ = yaml.Marshal(response)
	log.Debugf("Returned response:\n---\n%s\n", string(b))
	return nil
}
