package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Thiht/smocker/services"
	"github.com/Thiht/smocker/types"
	"github.com/google/uuid"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

const MIMEApplicationXYaml = "application/x-yaml"

type Admin struct {
	mockServer services.MockServer
}

func NewAdmin(ms services.MockServer) *Admin {
	return &Admin{
		mockServer: ms,
	}
}

func (a *Admin) GetMocks(c echo.Context) error {
	sessionID := ""
	if sessionID = c.QueryParam("session"); sessionID == "" {
		sessionID = a.mockServer.GetLastSession().ID
	}

	if id := c.QueryParam("id"); id != "" {
		mock := a.mockServer.GetMockByID(sessionID, id)
		if mock == nil {
			return echo.NewHTTPError(http.StatusNotFound, fmt.Sprintf("No mock found with ID %q", id))
		}
		return respondAccordingAccept(c, types.Mocks{mock})
	}
	return respondAccordingAccept(c, a.mockServer.GetMocks(sessionID))
}

func (a *Admin) AddMocks(c echo.Context) error {
	if reset, _ := strconv.ParseBool(c.QueryParam("reset")); reset {
		a.mockServer.Reset()
	}
	sessionID := a.mockServer.GetLastSession().ID
	var mocks []*types.Mock
	if err := c.Bind(&mocks); err != nil {
		if err != echo.ErrUnsupportedMediaType {
			log.WithError(err).Error("Failed to parse payload")
			return err
		}

		// echo doesn't support YAML yet
		req := c.Request()
		contentType := req.Header.Get(echo.HeaderContentType)
		if contentType == "" || strings.Contains(strings.ToLower(contentType), MIMEApplicationXYaml) {
			if err := yaml.NewDecoder(req.Body).Decode(&mocks); err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, err.Error())
			}
		} else {
			return echo.NewHTTPError(http.StatusUnsupportedMediaType, err.Error())
		}
	}

	for _, mock := range mocks {
		if err := mock.Validate(); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
	}
	for _, mock := range mocks {
		mock.State = &types.MockState{
			CreationDate: time.Now(),
			ID:           uuid.New().String(),
		}
		if mock.Context == nil {
			mock.Context = &types.MockContext{}
		}
		a.mockServer.AddMock(sessionID, mock)
	}

	return c.JSON(http.StatusOK, echo.Map{
		"message": "Mocks registered successfully",
	})
}

func (a *Admin) VerifyMocks(c echo.Context) error {
	sessionID := ""
	if sessionID = c.QueryParam("session"); sessionID == "" {
		sessionID = a.mockServer.GetLastSession().ID
	}

	mocks := a.mockServer.GetMocks(sessionID)
	failedMocks := types.Mocks{}
	for _, mock := range mocks {
		if mock.Context.Times > 0 && mock.Context.Times != mock.State.TimesCount {
			failedMocks = append(failedMocks, mock)
		}
	}

	verified := len(failedMocks) == 0
	response := echo.Map{
		"verified": verified,
	}
	if verified {
		response["message"] = "All mocks match expectations"
	} else {
		response["message"] = "Some mocks don't match expectations"
		response["mocks"] = failedMocks
	}
	return respondAccordingAccept(c, response)
}

func (a *Admin) GetHistory(c echo.Context) error {
	sessionID := ""
	if sessionID = c.QueryParam("session"); sessionID == "" {
		sessionID = a.mockServer.GetLastSession().ID
	}
	filter := c.QueryParam("filter")
	history, err := a.mockServer.GetHistoryByPath(sessionID, filter)
	if err != nil {
		log.WithError(err).Error("Failed to retrieve history")
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return respondAccordingAccept(c, history)
}

func (a *Admin) GetSessions(c echo.Context) error {

	sessions := a.mockServer.GetSessions()
	if include, _ := strconv.ParseBool(c.QueryParam("include_empty")); !include {
		trimedSessions := types.Sessions{}
		for _, tmp := range sessions {
			if len(tmp.History) > 0 {
				trimedSessions = append(trimedSessions, tmp)
			}
		}
		sessions = trimedSessions
	}
	return respondAccordingAccept(c, sessions)
}

func (a *Admin) Reset(c echo.Context) error {
	a.mockServer.Reset()
	return c.JSON(http.StatusOK, echo.Map{
		"message": "Reset successful",
	})
}

func respondAccordingAccept(c echo.Context, body interface{}) error {
	accept := c.Request().Header.Get(echo.HeaderAccept)
	if strings.Contains(strings.ToLower(accept), MIMEApplicationXYaml) {
		c.Response().Header().Set(echo.HeaderContentType, MIMEApplicationXYaml)
		c.Response().WriteHeader(http.StatusOK)
		out, err := yaml.Marshal(body)
		if err != nil {
			return err
		}
		_, err = c.Response().Write(out)
		return err
	}
	return c.JSONPretty(http.StatusOK, body, "    ")
}
