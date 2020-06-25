package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/Thiht/smocker/server/services"
	"github.com/Thiht/smocker/server/types"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
)

const MIMEApplicationXYaml = "application/x-yaml"

type Admin struct {
	mocksServices  services.Mocks
	graphsServices services.Graph
}

func NewAdmin(ms services.Mocks, graph services.Graph) *Admin {
	return &Admin{
		mocksServices:  ms,
		graphsServices: graph,
	}
}

func (a *Admin) GetMocks(c echo.Context) error {
	sessionID := c.QueryParam("session")
	if sessionID == "" {
		sessionID = a.mocksServices.GetLastSession().ID
	}

	if id := c.QueryParam("id"); id != "" {
		mock, err := a.mocksServices.GetMockByID(sessionID, id)
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
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

	sessionName := c.QueryParam("session")
	if sessionName == "" {
		// Deprecated, keep it for retrocompatibility
		sessionName = c.QueryParam("newSession")
	}
	if sessionName != "" {
		a.mocksServices.NewSession(sessionName)
	}

	sessionID := a.mocksServices.GetLastSession().ID
	var mocks []*types.Mock
	if err := bindAccordingAccept(c, &mocks); err != nil {
		return err
	}

	for _, mock := range mocks {
		if err := mock.Validate(); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
	}

	for _, mock := range mocks {
		if _, err := a.mocksServices.AddMock(sessionID, mock); err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
	}

	return c.JSON(http.StatusOK, echo.Map{
		"message": "Mocks registered successfully",
	})
}

func (a *Admin) LockMocks(c echo.Context) error {
	var ids []string
	if err := bindAccordingAccept(c, &ids); err != nil {
		return err
	}

	mocks := a.mocksServices.LockMocks(ids)
	return c.JSON(http.StatusOK, mocks)
}

func (a *Admin) UnlockMocks(c echo.Context) error {
	var ids []string
	if err := bindAccordingAccept(c, &ids); err != nil {
		return err
	}

	mocks := a.mocksServices.UnlockMocks(ids)
	return c.JSON(http.StatusOK, mocks)
}

type verifyResult struct {
	Mocks struct {
		Verified bool        `json:"verified"`
		AllUsed  bool        `json:"all_used"`
		Message  string      `json:"message"`
		Failures types.Mocks `json:"failures,omitempty"`
		Unused   types.Mocks `json:"unused,omitempty"`
	} `json:"mocks"`
	History struct {
		Verified bool          `json:"verified"`
		Message  string        `json:"message"`
		Failures types.History `json:"failures,omitempty"`
	} `json:"history"`
}

func (a *Admin) VerifySession(c echo.Context) error {
	sessionID := c.QueryParam("session")
	var session *types.Session
	if sessionID != "" {
		var err error
		session, err = a.mocksServices.GetSessionByID(sessionID)
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
	} else {
		session = a.mocksServices.GetLastSession()
	}
	failedMocks := types.Mocks{}
	unusedMocks := types.Mocks{}
	for _, mock := range session.Mocks {
		if !mock.Verify() {
			failedMocks = append(failedMocks, mock)
		}
		if mock.State.TimesCount == 0 {
			unusedMocks = append(unusedMocks, mock)
		}
	}

	failedHistory := types.History{}
	for _, entry := range session.History {
		if entry.Response.Status > 600 {
			failedHistory = append(failedHistory, entry)
		}
	}

	mocksVerified := len(failedMocks) == 0
	mocksAllUsed := len(unusedMocks) == 0
	historyIsClean := len(failedHistory) == 0

	response := verifyResult{}
	response.Mocks.Verified = mocksVerified
	response.Mocks.AllUsed = mocksAllUsed
	response.History.Verified = historyIsClean

	if mocksVerified && mocksAllUsed {
		response.Mocks.Message = "All mocks match expectations"
	} else {
		response.Mocks.Message = "Some mocks don't match expectations"
		if !mocksVerified {
			response.Mocks.Failures = failedMocks
		}
		if !mocksAllUsed {
			response.Mocks.Unused = unusedMocks
		}
	}

	if historyIsClean {
		response.History.Message = "History is clean"
	} else {
		response.History.Message = "There are errors in the history"
		response.History.Failures = failedHistory
	}

	return respondAccordingAccept(c, response)
}

func (a *Admin) GetHistory(c echo.Context) error {
	sessionID := c.QueryParam("session")
	if sessionID == "" {
		sessionID = a.mocksServices.GetLastSession().ID
	}

	filter := c.QueryParam("filter")
	history, err := a.mocksServices.GetHistoryByPath(sessionID, filter)
	if err != nil {
		if err == services.SessionNotFound {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}

		log.WithError(err).Error("Failed to retrieve history")
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return respondAccordingAccept(c, history)
}

type sessionSummary struct {
	ID      string        `json:"id"`
	Name    string        `json:"name"`
	Date    time.Time     `json:"date"`
	History types.History `json:"-"`
	Mocks   types.Mocks   `json:"-"`
}

func (a *Admin) GetSessions(c echo.Context) error {
	sessions := a.mocksServices.GetSessions()
	return respondAccordingAccept(c, sessions)
}

func (a *Admin) SummarizeSessions(c echo.Context) error {
	sessions := a.mocksServices.GetSessions()
	sessionSummaries := []sessionSummary{}
	for _, session := range sessions {
		sessionSummaries = append(sessionSummaries, sessionSummary(*session))
	}
	return respondAccordingAccept(c, sessionSummaries)
}

func (a *Admin) NewSession(c echo.Context) error {
	name := c.QueryParam("name")
	session := a.mocksServices.NewSession(name)
	return respondAccordingAccept(c, sessionSummary(*session))
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
	if err != nil {
		if err == services.SessionNotFound {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}

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

func (a *Admin) SummarizeHistory(c echo.Context) error {
	sessionID := ""
	if sessionID = c.QueryParam("session"); sessionID == "" {
		sessionID = a.mocksServices.GetLastSession().ID
	}
	session, err := a.mocksServices.GetSessionByID(sessionID)
	if err == services.SessionNotFound {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	} else if err != nil {
		log.WithError(err).Error("Failed to retrieve session")
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var cfg types.GraphConfig
	if err := c.Bind(&cfg); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return respondAccordingAccept(c, a.graphsServices.Generate(cfg, session))
}
