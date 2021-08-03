package database

import (
	"encoding/json"
	"time"

	"github.com/Thiht/smocker/server/types"
)

type MockDao struct {
	ID         string         `json:"id" storm:"id"`
	SessionID  string         `json:"session_id" storm:"index"`
	Request    string         `json:"request"`
	Response   string         `json:"response"`
	Type       types.MockType `json:"type"`
	Times      int            `json:"times"`
	TimesCount int            `json:"times_count"`
	Locked     bool           `json:"locked"`
	CreatedAt  time.Time      `json:"created_at"`
}

func NewMockDaoFromMock(mock *types.Mock) *MockDao {
	request, _ := json.Marshal(mock.Request)
	kind := types.StaticMockType
	var response []byte
	if mock.DynamicResponse != nil {
		kind = types.DynamicMockType
		response, _ = json.Marshal(mock.DynamicResponse)
	} else if mock.Proxy != nil {
		kind = types.ProxyMockType
		response, _ = json.Marshal(mock.Proxy)
	} else {
		response, _ = json.Marshal(mock.Response)
	}
	return &MockDao{
		ID:         mock.State.ID,
		SessionID:  mock.State.SessionID,
		Request:    string(request),
		Response:   string(response),
		Type:       kind,
		Times:      mock.Context.Times,
		TimesCount: mock.State.TimesCount,
		Locked:     mock.State.Locked,
		CreatedAt:  mock.State.CreationDate,
	}
}

func (md *MockDao) ToMock() *types.Mock {
	var request types.MockRequest
	_ = json.Unmarshal([]byte(md.Request), &request)
	mock := types.Mock{
		Request: request,
		State: &types.MockState{
			ID:           md.ID,
			SessionID:    md.SessionID,
			TimesCount:   md.TimesCount,
			Locked:       md.Locked,
			CreationDate: md.CreatedAt,
		},
		Context: &types.MockContext{
			Times: md.Times,
		},
	}
	switch md.Type {
	case types.StaticMockType:
		var response types.MockResponse
		_ = json.Unmarshal([]byte(md.Response), &response)
		mock.Response = &response
	case types.DynamicMockType:
		var response types.DynamicMockResponse
		_ = json.Unmarshal([]byte(md.Response), &response)
		mock.DynamicResponse = &response
	case types.ProxyMockType:
		var response types.MockProxy
		_ = json.Unmarshal([]byte(md.Response), &response)
		mock.Proxy = &response
	}
	return &mock
}

type MocksDao []*MockDao

func NewMocksDaoFromMocks(mocks types.Mocks) MocksDao {
	mocksDao := make(MocksDao, 0, len(mocks))
	for _, mock := range mocks {
		mocksDao = append(mocksDao, NewMockDaoFromMock(mock))
	}
	return mocksDao
}

func (md MocksDao) ToMocks() types.Mocks {
	mocks := make(types.Mocks, 0, len(md))
	for _, mock := range md {
		mocks = append(mocks, mock.ToMock())
	}
	return mocks
}

type EntryDao struct {
	ID          string         `json:"id" storm:"id"`
	SessionID   string         `json:"session_id" storm:"index"`
	MockID      string         `json:"mock_id" storm:"index"`
	MockType    types.MockType `json:"mock_type"`
	Delay       string         `json:"delay"`
	Request     string         `json:"request"`
	Response    string         `json:"response"`
	ReceivedAt  time.Time      `json:"received_at"`
	RespondedAt time.Time      `json:"responded_at"`
}

func NewEntryDaoFromEntry(entry *types.Entry) *EntryDao {
	request, _ := json.Marshal(entry.Request)
	response, _ := json.Marshal(entry.Response)
	return &EntryDao{
		ID:          entry.ID,
		SessionID:   entry.Context.SessionID,
		MockID:      entry.Context.MockID,
		MockType:    entry.Context.MockType,
		Delay:       entry.Context.Delay,
		Request:     string(request),
		Response:    string(response),
		ReceivedAt:  entry.Request.Date,
		RespondedAt: entry.Response.Date,
	}
}

func (ed *EntryDao) ToEntry() *types.Entry {
	var request types.Request
	_ = json.Unmarshal([]byte(ed.Request), &request)
	var response types.Response
	_ = json.Unmarshal([]byte(ed.Response), &response)
	entry := types.Entry{
		ID:       ed.ID,
		Request:  request,
		Response: response,
		Context: types.Context{
			SessionID: ed.SessionID,
			MockID:    ed.MockID,
			MockType:  ed.MockType,
			Delay:     ed.Delay,
		},
	}
	return &entry
}

type HistoryDao []*EntryDao

func NewHistoryDaoFromHistory(history types.History) HistoryDao {
	historyDao := make(HistoryDao, 0, len(history))
	for _, entry := range history {
		historyDao = append(historyDao, NewEntryDaoFromEntry(entry))
	}
	return historyDao
}

func (hd HistoryDao) ToHistory() types.History {
	history := make(types.History, 0, len(hd))
	for _, entry := range hd {
		history = append(history, entry.ToEntry())
	}
	return history
}

type SessionDao struct {
	ID   string    `json:"id" storm:"id"`
	Name string    `json:"name" storm:"index"`
	Date time.Time `json:"date" storm:"unique"`
}

func NewSessionDaoFromSession(session *types.Session) *SessionDao {
	if session == nil {
		return nil
	}
	dao := SessionDao(*session)
	return &dao
}

func (sd *SessionDao) ToSession() *types.Session {
	if sd == nil {
		return nil
	}
	session := types.Session(*sd)
	return &session
}

type SessionsDao []*SessionDao

func NewSessionsDaoFromSessions(sessions types.Sessions) SessionsDao {
	sessionsDao := make(SessionsDao, 0, len(sessions))
	for _, session := range sessions {
		sessionsDao = append(sessionsDao, NewSessionDaoFromSession(session))
	}
	return sessionsDao
}

func (sd SessionsDao) ToSessions() types.Sessions {
	sessions := make(types.Sessions, 0, len(sd))
	for _, session := range sd {
		sessions = append(sessions, session.ToSession())
	}
	return sessions
}
