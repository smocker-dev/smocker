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
	mocksServices services.Mocks
}

func NewAdmin(ms services.Mocks) *Admin {
	return &Admin{
		mocksServices: ms,
	}
}

func (a *Admin) GetMocks(c echo.Context) error {
	sessionID := ""
	if sessionID = c.QueryParam("session"); sessionID == "" {
		sessionID = a.mocksServices.GetLastSession().ID
	}

	if id := c.QueryParam("id"); id != "" {
		mock, err := a.mocksServices.GetMockByID(sessionID, id)
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		if mock == nil {
			return echo.NewHTTPError(http.StatusNotFound, fmt.Sprintf("No mock found with ID %q", id))
		}
		return respondAccordingAccept(c, types.Mocks{mock})
	}
	mocks, err := a.mocksServices.GetMocks(sessionID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	return respondAccordingAccept(c, mocks)
}

func (a *Admin) AddMocks(c echo.Context) error {
	if reset, _ := strconv.ParseBool(c.QueryParam("reset")); reset {
		a.mocksServices.Reset()
	}
	sessionID := a.mocksServices.GetLastSession().ID
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
		_, err := a.mocksServices.AddMock(sessionID, mock)
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
	}

	return c.JSON(http.StatusOK, echo.Map{
		"message": "Mocks registered successfully",
	})
}

func (a *Admin) VerifyMocks(c echo.Context) error {
	sessionID := ""
	if sessionID = c.QueryParam("session"); sessionID == "" {
		sessionID = a.mocksServices.GetLastSession().ID
	}

	mocks, err := a.mocksServices.GetMocks(sessionID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
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
		sessionID = a.mocksServices.GetLastSession().ID
	}
	filter := c.QueryParam("filter")
	history, err := a.mocksServices.GetHistoryByPath(sessionID, filter)
	if err == services.UnknownSession {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	} else if err != nil {
		log.WithError(err).Error("Failed to retrieve history")
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return respondAccordingAccept(c, history)
}

type sessionSummary struct {
	ID   string    `json:"id"`
	Name string    `json:"name"`
	Date time.Time `json:"date"`
}

func (a *Admin) GetSessions(c echo.Context) error {
	sessions := a.mocksServices.GetSessions()
	return respondAccordingAccept(c, sessions)
}

func (a *Admin) SummarizeSessions(c echo.Context) error {
	sessions := a.mocksServices.GetSessions()
	sessionSummaries := []sessionSummary{}
	for _, session := range sessions {
		sessionSummaries = append(sessionSummaries, sessionSummary{
			ID:   session.ID,
			Name: session.Name,
			Date: session.Date,
		})
	}
	return respondAccordingAccept(c, sessionSummaries)
}

func (a *Admin) NewSession(c echo.Context) error {
	name := c.QueryParam("name")
	session := a.mocksServices.NewSession(name)
	return respondAccordingAccept(c, sessionSummary{
		ID:   session.ID,
		Name: session.Name,
		Date: session.Date,
	})
}

type updateSessionBody struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (a *Admin) UpdateSession(c echo.Context) error {
	var body updateSessionBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	session, err := a.mocksServices.UpdateSession(body.ID, body.Name)
	if err == services.UnknownSession {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	} else if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return respondAccordingAccept(c, sessionSummary{
		ID:   session.ID,
		Name: session.Name,
		Date: session.Date,
	})
}

func (a *Admin) ImportSession(c echo.Context) error {
	var sessions types.Sessions
	if err := c.Bind(&sessions); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	a.mocksServices.SetSessions(sessions)
	sessionSummaries := []sessionSummary{}
	for _, session := range sessions {
		sessionSummaries = append(sessionSummaries, sessionSummary{
			ID:   session.ID,
			Name: session.Name,
			Date: session.Date,
		})
	}
	return respondAccordingAccept(c, sessionSummaries)
}

func (a *Admin) Reset(c echo.Context) error {
	a.mocksServices.Reset()
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
