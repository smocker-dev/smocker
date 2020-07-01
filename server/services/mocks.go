package services

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Thiht/smocker/server/types"
	"github.com/teris-io/shortid"
)

var (
	SessionNotFound = fmt.Errorf("session not found")
	MockNotFound    = fmt.Errorf("mock not found")
)

type Mocks interface {
	AddMock(sessionID string, mock *types.Mock) (*types.Mock, error)
	GetMocks(sessionID string) (types.Mocks, error)
	GetMockByID(sessionID, id string) (*types.Mock, error)
	LockMocks(ids []string) types.Mocks
	UnlockMocks(ids []string) types.Mocks
	AddHistoryEntry(sessionID string, entry *types.Entry) (*types.Entry, error)
	GetHistory(sessionID string) (types.History, error)
	GetHistoryByPath(sessionID, filterPath string) (types.History, error)
	NewSession(name string) *types.Session
	UpdateSession(id, name string) (*types.Session, error)
	GetLastSession() *types.Session
	GetSessionByID(id string) (*types.Session, error)
	GetSessions() types.Sessions
	SetSessions(sessions types.Sessions)
	Reset(force bool)
}

type mocks struct {
	sessions         types.Sessions
	mu               sync.Mutex
	historyRetention int
	persistence      Persistence
}

func NewMocks(sessions types.Sessions, historyRetention int, persistence Persistence) Mocks {
	s := &mocks{
		sessions:         types.Sessions{},
		historyRetention: historyRetention,
		persistence:      persistence,
	}
	if sessions != nil {
		s.sessions = sessions
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

	newMock.Init()
	session.Mocks = append(types.Mocks{newMock}, session.Mocks...)
	go s.persistence.StoreMocks(session.ID, session.Mocks.Clone())
	return newMock, nil
}

func (s *mocks) GetMocks(sessionID string) (types.Mocks, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return session.Mocks.Clone(), nil
}

func (s *mocks) LockMocks(ids []string) types.Mocks {
	session := s.GetLastSession()
	s.mu.Lock()
	defer s.mu.Unlock()
	modifiedMocks := make(types.Mocks, 0, len(session.Mocks))
	for _, id := range ids {
		for _, mock := range session.Mocks {
			if mock.State.ID == id {
				mock.State.Locked = true
				modifiedMocks = append(modifiedMocks, mock)
			}
		}
	}
	go s.persistence.StoreMocks(session.ID, session.Mocks.Clone())
	return modifiedMocks
}

func (s *mocks) UnlockMocks(ids []string) types.Mocks {
	session := s.GetLastSession()
	s.mu.Lock()
	defer s.mu.Unlock()
	modifiedMocks := make(types.Mocks, 0, len(session.Mocks))
	for _, id := range ids {
		for _, mock := range session.Mocks {
			if mock.State.ID == id {
				mock.State.Locked = false
				modifiedMocks = append(modifiedMocks, mock)
			}
		}
	}
	go s.persistence.StoreMocks(session.ID, session.Mocks.Clone())
	return modifiedMocks
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
	return nil, types.MockNotFound
}

func (s *mocks) AddHistoryEntry(sessionID string, entry *types.Entry) (*types.Entry, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.historyRetention > 0 && len(session.History)+1 > s.historyRetention {
		session.History = session.History[1:]
	}

	session.History = append(session.History, entry)
	go s.persistence.StoreHistory(session.ID, session.History.Clone())
	return entry, nil
}

func (s *mocks) GetHistory(sessionID string) (types.History, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return session.History.Clone(), nil
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

	if strings.TrimSpace(name) == "" {
		name = fmt.Sprintf("Session #%d", len(s.sessions)+1)
	}

	var history types.History
	if s.historyRetention > 0 {
		history = make(types.History, 0, s.historyRetention)
	} else {
		history = types.History{}
	}

	mocks := types.Mocks{}
	if len(s.sessions) > 0 {
		session := s.GetLastSession()
		s.mu.Lock()
		for _, mock := range session.Mocks {
			if mock.State.Locked {
				mocks = append(mocks, mock.CloneAndReset())
			}
		}
		s.mu.Unlock()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	session := &types.Session{
		ID:      shortid.MustGenerate(),
		Name:    name,
		Date:    time.Now(),
		History: history,
		Mocks:   mocks,
	}
	s.sessions = append(s.sessions, session)

	go s.persistence.StoreSession(s.sessions.Summarize(), session)
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
	go s.persistence.StoreSession(s.sessions.Summarize(), session)
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
	return s.sessions[len(s.sessions)-1].Clone()
}

func (s *mocks) GetSessionByID(id string) (*types.Session, error) {
	if id == "" {
		return nil, types.SessionNotFound
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, session := range s.sessions {
		if session.ID == id {
			return session, nil
		}
	}
	return nil, types.SessionNotFound
}

func (s *mocks) GetSessionByName(name string) (*types.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if name == "" {
		return nil, types.SessionNotFound
	}

	for _, session := range s.sessions {
		if session.Name == name {
			return session, nil
		}
	}
	return nil, types.SessionNotFound
}

func (s *mocks) GetSessions() types.Sessions {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sessions.Clone()
}

func (s *mocks) SetSessions(sessions types.Sessions) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = sessions
	go s.persistence.StoreSessions(s.sessions.Clone())
}

func (s *mocks) Reset(force bool) {
	session := s.GetLastSession()

	s.mu.Lock()
	mocks := types.Mocks{}
	for _, mock := range session.Mocks {
		if mock.State.Locked {
			mocks = append(mocks, mock.CloneAndReset())
		}
	}
	s.sessions = types.Sessions{}
	s.mu.Unlock()

	if len(mocks) > 0 && !force {
		_ = s.GetLastSession()
		s.mu.Lock()
		s.sessions[len(s.sessions)-1].Mocks = mocks
		s.mu.Unlock()
	}

	go s.persistence.StoreSessions(s.sessions.Clone())
}
