package services

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Thiht/smocker/server/types"
	"github.com/google/uuid"
)

var (
	SessionNotFound = fmt.Errorf("session not found")
	MockNotFound    = fmt.Errorf("mock not found")
)

type Mocks interface {
	AddMock(sessionID string, mock *types.Mock) (*types.Mock, error)
	GetMocks(sessionID string) (types.Mocks, error)
	GetMockByID(sessionID, id string) (*types.Mock, error)
	AddHistoryEntry(sessionID string, entry *types.Entry) (*types.Entry, error)
	GetHistory(sessionID string) (types.History, error)
	GetHistoryByPath(sessionID, filterPath string) (types.History, error)
	NewSession(name string) *types.Session
	UpdateSession(id, name string) (*types.Session, error)
	GetLastSession() *types.Session
	GetSessionByID(id string) (*types.Session, error)
	GetSessionByName(name string) (*types.Session, error)
	GetSessions() types.Sessions
	SetSessions(sessions types.Sessions)
	Reset()
}

type mocks struct {
	sessions types.Sessions
	mu       sync.Mutex
}

func NewMocks() Mocks {
	s := &mocks{
		sessions: types.Sessions{},
	}
	return s
}

func (s *mocks) AddMock(sessionID string, newMock *types.Mock) (*types.Mock, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	session.Mocks = append(types.Mocks{newMock}, session.Mocks...)
	return newMock, nil
}

func (s *mocks) GetMocks(sessionID string) (types.Mocks, error) {
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

func (s *mocks) GetMockByID(sessionID, id string) (*types.Mock, error) {
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
	return nil, MockNotFound
}

func (s *mocks) AddHistoryEntry(sessionID string, entry *types.Entry) (*types.Entry, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	session.History = append(session.History, entry)
	return entry, nil
}

func (s *mocks) GetHistory(sessionID string) (types.History, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	return session.History, nil
}

func (s *mocks) GetHistoryByPath(sessionID, filterPath string) (types.History, error) {
	history, err := s.GetHistory(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	regex, err := regexp.Compile(filterPath)
	if err != nil {
		return nil, err
	}

	res := types.History{}
	for _, entry := range history {
		if regex.MatchString(entry.Request.Path) {
			res = append(res, entry)
		}
	}
	return res, nil
}

func (s *mocks) NewSession(name string) *types.Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(name) == "" {
		name = fmt.Sprintf("Session #%d", len(s.sessions)+1)
	}

	session := &types.Session{
		ID:      uuid.New().String(),
		Name:    name,
		Date:    time.Now(),
		History: types.History{},
		Mocks:   types.Mocks{},
	}
	s.sessions = append(s.sessions, session)
	return session
}

func (s *mocks) UpdateSession(sessionID, name string) (*types.Session, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	session.Name = name
	return session, nil
}

func (s *mocks) GetLastSession() *types.Session {
	s.mu.Lock()
	if len(s.sessions) == 0 {
		s.mu.Unlock()
		s.NewSession("")
		s.mu.Lock()
	}
	defer s.mu.Unlock()
	return s.sessions[len(s.sessions)-1]
}

func (s *mocks) GetSessionByID(id string) (*types.Session, error) {
	if id == "" {
		return nil, SessionNotFound
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, session := range s.sessions {
		if session.ID == id {
			return session, nil
		}
	}
	return nil, SessionNotFound
}

func (s *mocks) GetSessionByName(name string) (*types.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if name == "" {
		return nil, SessionNotFound
	}

	for _, session := range s.sessions {
		if session.Name == name {
			return session, nil
		}
	}
	return nil, SessionNotFound
}

func (s *mocks) GetSessions() types.Sessions {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sessions
}

func (s *mocks) SetSessions(sessions types.Sessions) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = sessions
}

func (s *mocks) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = types.Sessions{}
}
