package services

import (
	"regexp"
	"sync"
	"time"

	"github.com/Thiht/smocker/types"
	"github.com/google/uuid"
)

type MockServer interface {
	AddMock(sessionID string, mock *types.Mock)
	GetMocks(sessionID string) types.Mocks
	GetMockByID(sessionID, id string) *types.Mock
	AddEntry(sessionID string, entry *types.Entry)
	GetHistory(sessionID string) types.History
	GetHistoryByPath(sessionID string, filterPath string) (types.History, error)
	NewSession(name string)
	GetSessions() types.Sessions
	GetLastSession() *types.Session
	GetSessionByID(id string) *types.Session
	GetSessionByName(name string) *types.Session
	Reset()
}

type mockServer struct {
	sessions types.Sessions
	mu       sync.Mutex
}

func NewMockServer() MockServer {
	s := &mockServer{
		sessions: types.Sessions{},
	}
	return s
}

func (s *mockServer) AddMock(sessionID string, newMock *types.Mock) {
	session := s.GetSessionByID(sessionID)
	s.mu.Lock()
	defer s.mu.Unlock()
	session.Mocks = append(types.Mocks{newMock}, session.Mocks...)
}

func (s *mockServer) GetMocks(sessionID string) types.Mocks {
	session := s.GetSessionByID(sessionID)
	s.mu.Lock()
	mocks := make(types.Mocks, len(session.Mocks))
	copy(mocks, session.Mocks)
	s.mu.Unlock()
	return mocks
}

func (s *mockServer) GetMockByID(sessionID, id string) *types.Mock {
	session := s.GetSessionByID(sessionID)
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, mock := range session.Mocks {
		if mock.State.ID == id {
			return mock
		}
	}
	return nil
}

func (s *mockServer) AddEntry(sessionID string, entry *types.Entry) {
	session := s.GetSessionByID(sessionID)
	s.mu.Lock()
	defer s.mu.Unlock()
	session.History = append(session.History, entry)
}

func (s *mockServer) GetHistory(sessionID string) types.History {
	session := s.GetSessionByID(sessionID)
	s.mu.Lock()
	defer s.mu.Unlock()
	return session.History
}

func (s *mockServer) GetHistoryByPath(sessionID, filterPath string) (types.History, error) {
	history := s.GetHistory(sessionID)
	s.mu.Lock()
	defer s.mu.Unlock()
	res := types.History{}
	regex, err := regexp.Compile(filterPath)
	if err != nil {
		return res, err
	}
	for _, entry := range history {
		if regex.Match([]byte(entry.Request.Path)) {
			res = append(res, entry)
		}
	}
	return res, nil
}

func (s *mockServer) NewSession(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = append(s.sessions, &types.Session{
		ID:      uuid.New().String(),
		Name:    name,
		Date:    time.Now(),
		History: types.History{},
		Mocks:   types.Mocks{},
	})
}

func (s *mockServer) GetSessions() types.Sessions {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sessions
}

func (s *mockServer) GetLastSession() *types.Session {
	s.mu.Lock()
	if len(s.sessions) == 0 {
		s.mu.Unlock()
		s.NewSession("")
		s.mu.Lock()
	}
	defer s.mu.Unlock()
	return s.sessions[len(s.sessions)-1]
}

func (s *mockServer) GetSessionByID(id string) *types.Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == "" {
		return nil
	}
	for _, session := range s.sessions {
		if session.ID == id {
			return session
		}
	}
	return nil
}

func (s *mockServer) GetSessionByName(name string) *types.Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	if name == "" {
		return nil
	}
	for _, session := range s.sessions {
		if session.Name == name {
			return session
		}
	}
	return nil
}

func (s *mockServer) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = types.Sessions{}
}
