package services

import (
	"fmt"
	"log/slog"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/smocker-dev/smocker/server/types"
	"gopkg.in/yaml.v3"
)

var (
	SessionNotFound = fmt.Errorf("session not found")
	MockNotFound    = fmt.Errorf("mock not found")
)

type Mocks interface {
	AddMock(sessionID string, mock *types.Mock) (*types.Mock, error)
	UpdateMock(sessionID, id string, mock *types.Mock) (*types.Mock, error)
	DeleteMock(sessionID, id string) error
	GetMocks(sessionID string) (types.Mocks, error)
	GetMockByID(sessionID, id string) (*types.Mock, error)
	LockMocks(ids []string) types.Mocks
	UnlockMocks(ids []string) types.Mocks
	AddHistoryEntry(sessionID string, entry *types.Entry) (*types.Entry, error)
	GetHistory(sessionID string) (types.History, error)
	GetHistoryByPath(sessionID, filterPath string) (types.History, error)
	ClearHistory(sessionID string) error
	NewSession(name string) *types.Session
	UpdateSession(id, name string) (*types.Session, error)
	DeleteSession(id string) error
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

func NewMocks(sessions types.Sessions, historyRetention int, persistence Persistence, initMocksFile string) (Mocks, error) {
	s := &mocks{
		sessions:         types.Sessions{},
		historyRetention: historyRetention,
		persistence:      persistence,
	}
	if sessions != nil {
		s.sessions = sessions
	}
	if initMocksFile != "" {
		if err := s.seedFromFile(initMocksFile); err != nil {
			return nil, err
		}
	}
	return s, nil
}

// seedFromFile loads mocks from a YAML file (the POST /mocks format) into a fresh "init-mocks"
// session. Backs the --init-mocks startup flag; the mocks are never written back.
func (s *mocks) seedFromFile(path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	var loaded types.Mocks
	if err := yaml.NewDecoder(file).Decode(&loaded); err != nil {
		return err
	}
	for _, mock := range loaded {
		if err := mock.Validate(); err != nil {
			return err
		}
	}

	sessionID := s.NewSession("init-mocks").ID
	for _, mock := range loaded {
		if _, err := s.AddMock(sessionID, mock); err != nil {
			return err
		}
	}

	slog.Info("Loaded initial mocks", "count", len(loaded), "init-mocks", path)
	return nil
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

// UpdateMock replaces the definition of an existing mock in place, keeping its identity (ID and
// creation date). It is only allowed while the session's history is still empty, because a history
// entry is tied to the mock that answered it; see types.MockEditForbidden.
func (s *mocks) UpdateMock(sessionID, id string, newMock *types.Mock) (*types.Mock, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if len(session.History) > 0 {
		return nil, types.MockEditForbidden
	}

	for _, mock := range session.Mocks {
		if mock.State.ID == id {
			// Preserve the existing identity/state; only the definition changes.
			newMock.State = mock.State
			if newMock.Context == nil {
				newMock.Context = &types.MockContext{}
			}
			*mock = *newMock
			go s.persistence.StoreMocks(session.ID, session.Mocks.Clone())
			return mock, nil
		}
	}
	return nil, types.MockNotFound
}

// DeleteMock removes a mock from the session. Like UpdateMock, it is only allowed while the
// session's history is still empty.
func (s *mocks) DeleteMock(sessionID, id string) error {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if len(session.History) > 0 {
		return types.MockEditForbidden
	}

	for i, mock := range session.Mocks {
		if mock.State.ID == id {
			session.Mocks = append(session.Mocks[:i], session.Mocks[i+1:]...)
			go s.persistence.StoreMocks(session.ID, session.Mocks.Clone())
			return nil
		}
	}
	return types.MockNotFound
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

// ClearHistory empties a session's history while keeping its mocks. It lets the user make mocks
// editable again (edition/deletion require an empty history) without dropping the mocks themselves.
// The per-mock call counters are reset too, so the state stays consistent with the now-empty
// history (a mock with times_count > 0 but no history entry would be contradictory).
func (s *mocks) ClearHistory(sessionID string) error {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	session.History = types.History{}
	for _, mock := range session.Mocks {
		mock.State.TimesCount = 0
	}
	go s.persistence.StoreHistory(session.ID, session.History.Clone())
	go s.persistence.StoreMocks(session.ID, session.Mocks.Clone())
	return nil
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
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.newSessionLocked(name)
}

// newSessionLocked appends a new session and returns it. The caller MUST hold s.mu: the default
// name and the carried-over locked mocks are both derived from s.sessions, so the whole thing has
// to happen in one critical section — otherwise two concurrent creators can read the same length
// and both mint e.g. "Session #1" (the bug behind the flaky rename e2e test).
func (s *mocks) newSessionLocked(name string) *types.Session {
	if strings.TrimSpace(name) == "" {
		name = fmt.Sprintf("Session #%d", len(s.sessions)+1)
	}

	var history types.History
	if s.historyRetention > 0 {
		history = make(types.History, 0, s.historyRetention)
	} else {
		history = types.History{}
	}

	// Carry over the locked mocks from the current last session, reset for the new one.
	mocks := types.Mocks{}
	if len(s.sessions) > 0 {
		for _, mock := range s.sessions[len(s.sessions)-1].Mocks {
			if mock.State.Locked {
				mocks = append(mocks, mock.CloneAndReset())
			}
		}
	}

	session := &types.Session{
		ID:      types.NewID(),
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

func (s *mocks) DeleteSession(id string) error {
	if id == "" {
		return types.SessionNotFound
	}

	s.mu.Lock()
	index := -1
	for i, session := range s.sessions {
		if session.ID == id {
			index = i
			break
		}
	}
	if index == -1 {
		s.mu.Unlock()
		return types.SessionNotFound
	}
	s.sessions = append(s.sessions[:index], s.sessions[index+1:]...)
	sessions := s.sessions.Clone()
	s.mu.Unlock()

	// StoreSessions wipes the persistence directory and rewrites the remaining sessions, so the
	// deleted session's on-disk directory is removed too.
	go s.persistence.StoreSessions(sessions)
	return nil
}

func (s *mocks) GetLastSession() *types.Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.sessions) == 0 {
		return s.newSessionLocked("").Clone()
	}
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
