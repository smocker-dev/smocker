package services

import (
	"errors"
	"regexp"
	"sync"
	"time"

	"github.com/Thiht/smocker/types"
	"github.com/google/uuid"
)

var UnknownSession error = errors.New("Unknown session ID")

type MockServer interface {
	AddMock(sessionID string, mock *types.Mock) (*types.Mock, error)
	GetMocks(sessionID string) (types.Mocks, error)
	GetMockByID(sessionID, id string) (*types.Mock, error)
	AddEntry(sessionID string, entry *types.Entry) (*types.Entry, error)
	GetHistory(sessionID string) (types.History, error)
	GetHistoryByPath(sessionID string, filterPath string) (types.History, error)
	NewSession(name string)
	GetSessions() types.Sessions
	GetLastSession() *types.Session
	GetSessionByID(id string) (*types.Session, error)
	GetSessionByName(name string) (*types.Session, error)
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

func (s *mockServer) AddMock(sessionID string, newMock *types.Mock) (*types.Mock, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	session.Mocks = append(types.Mocks{newMock}, session.Mocks...)
	return newMock, nil
}

func (s *mockServer) GetMocks(sessionID string) (types.Mocks, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	mocks := make(types.Mocks, len(session.Mocks))
	copy(mocks, session.Mocks)
	s.mu.Unlock()
	return mocks, nil
}

func (s *mockServer) GetMockByID(sessionID, id string) (*types.Mock, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, mock := range session.Mocks {
		if mock.State.ID == id {
			return mock, nil
		}
	}
	return nil, nil
}

func (s *mockServer) AddEntry(sessionID string, entry *types.Entry) (*types.Entry, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	session.History = append(session.History, entry)
	return entry, nil
}

func (s *mockServer) GetHistory(sessionID string) (types.History, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return session.History, nil
}

func (s *mockServer) GetHistoryByPath(sessionID, filterPath string) (types.History, error) {
	history, err := s.GetHistory(sessionID)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	res := types.History{}
	regex, err := regexp.Compile(filterPath)
	if err != nil {
		return nil, err
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

func (s *mockServer) GetSessionByID(id string) (*types.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == "" {
		return nil, UnknownSession
	}
	for _, session := range s.sessions {
		if session.ID == id {
			return session, nil
		}
	}
	return nil, UnknownSession
}

func (s *mockServer) GetSessionByName(name string) (*types.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if name == "" {
		return nil, UnknownSession
	}
	for _, session := range s.sessions {
		if session.Name == name {
			return session, nil
		}
	}
	return nil, UnknownSession
}

func (s *mockServer) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = types.Sessions{}
}
