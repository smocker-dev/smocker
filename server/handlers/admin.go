package handlers

import (
	"net/http"
	"strconv"

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
		session, err := a.mocksServices.GetLastSession()
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		sessionID = session.ID
	}

	if id := c.QueryParam("id"); id != "" {
		mock, err := a.mocksServices.GetMockByID(id)
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
		if err := a.mocksServices.Reset(false); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
	}

	sessionName := c.QueryParam("session")
	if sessionName == "" {
		// Deprecated, keep it for retrocompatibility
		sessionName = c.QueryParam("newSession")
	}
	if sessionName != "" {
		if _, err := a.mocksServices.NewSession(sessionName); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
	}

	session, err := a.mocksServices.GetLastSession()
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

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
		if _, err := a.mocksServices.AddMock(session.ID, mock); err != nil {
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

	sessionID := c.QueryParam("session")
	if sessionID == "" {
		session, err := a.mocksServices.GetLastSession()
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		sessionID = session.ID
	}

	mocks, err := a.mocksServices.LockMocks(sessionID, ids)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, mocks)
}

func (a *Admin) UnlockMocks(c echo.Context) error {
	var ids []string
	if err := bindAccordingAccept(c, &ids); err != nil {
		return err
	}

	sessionID := c.QueryParam("session")
	if sessionID == "" {
		session, err := a.mocksServices.GetLastSession()
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		sessionID = session.ID
	}

	mocks, err := a.mocksServices.UnlockMocks(sessionID, ids)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, mocks)
}

func (a *Admin) VerifySession(c echo.Context) error {
	sessionID := c.QueryParam("session")
	var session *types.Session
	var err error
	if sessionID != "" {
		session, err = a.mocksServices.GetSessionByID(sessionID)
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
	} else {
		session, err = a.mocksServices.GetLastSession()
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
	}
	failedMocks := types.Mocks{}
	unusedMocks := types.Mocks{}
	mocks, err := a.mocksServices.GetMocks(session.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	for _, mock := range mocks {
		if !mock.Verify() {
			failedMocks = append(failedMocks, mock)
		}
		if mock.State.TimesCount == 0 {
			unusedMocks = append(unusedMocks, mock)
		}
	}

	failedHistory := types.History{}
	history, err := a.mocksServices.GetHistory(session.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	for _, entry := range history {
		if entry.Response.Status > 600 {
			failedHistory = append(failedHistory, entry)
		}
	}

	mocksVerified := len(failedMocks) == 0
	mocksAllUsed := len(unusedMocks) == 0
	historyIsClean := len(failedHistory) == 0

	response := types.VerifyResult{}
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
		session, err := a.mocksServices.GetLastSession()
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		sessionID = session.ID
	}

	filter := c.QueryParam("filter")
	history, err := a.mocksServices.GetHistoryByPath(sessionID, filter)
	if err != nil {
		if err == types.SessionNotFound {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}

		log.WithError(err).Error("Failed to retrieve history")
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return respondAccordingAccept(c, history)
}

func (a *Admin) GetSessions(c echo.Context) error {
	res := []*types.SessionDump{}
	sessions, err := a.mocksServices.GetSessions()
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	for _, session := range sessions {
		history, err := a.mocksServices.GetHistory(session.ID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		mocks, err := a.mocksServices.GetMocks(session.ID)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		res = append(res, &types.SessionDump{
			Session: *session,
			History: history,
			Mocks:   mocks,
		})
	}
	return respondAccordingAccept(c, res)
}

func (a *Admin) SummarizeSessions(c echo.Context) error {
	sessions, err := a.mocksServices.GetSessions()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return respondAccordingAccept(c, sessions)
}

func (a *Admin) NewSession(c echo.Context) error {
	name := c.QueryParam("name")
	session, err := a.mocksServices.NewSession(name)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return respondAccordingAccept(c, *session)
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
		if err == types.SessionNotFound {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}

		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return respondAccordingAccept(c, session)
}

func (a *Admin) ImportSession(c echo.Context) error {
	var body []*types.SessionDump
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	err := a.mocksServices.ImportSessions(body)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	sessions, err := a.mocksServices.GetSessions()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return respondAccordingAccept(c, sessions)
}

func (a *Admin) Reset(c echo.Context) error {
	force, _ := strconv.ParseBool(c.QueryParam("force"))
	if err := a.mocksServices.Reset(force); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, echo.Map{
		"message": "Reset successful",
	})
}

func (a *Admin) SummarizeHistory(c echo.Context) error {
	sessionID := c.QueryParam("session")
	if sessionID == "" {
		session, err := a.mocksServices.GetLastSession()
		if err != nil {
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		}
		sessionID = session.ID
	}

	history, err := a.mocksServices.GetHistory(sessionID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	mocks, err := a.mocksServices.GetMocks(sessionID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	var cfg types.GraphConfig
	if err := c.Bind(&cfg); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return respondAccordingAccept(c, a.graphsServices.Generate(cfg, history, mocks))
}
