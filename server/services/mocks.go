package services

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/types"
	log "github.com/sirupsen/logrus"
	"github.com/teris-io/shortid"
	"golang.org/x/sync/errgroup"
	"gopkg.in/yaml.v3"
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
	GetSessionByName(name string) (*types.Session, error)
	GetSessions() types.Sessions
	SetSessions(sessions types.Sessions)
	StoreSessions()
	LoadSessions() error
	Reset()
}

type mocks struct {
	sessions             types.Sessions
	mu                   sync.Mutex
	historyRetention     int
	persistenceDirectory string
}

func NewMocks(cfg config.Config) Mocks {
	s := &mocks{
		sessions:             types.Sessions{},
		historyRetention:     cfg.HistoryMaxRetention,
		persistenceDirectory: cfg.PersistenceDirectory,
	}
	return s
}

func (s *mocks) AddMock(sessionID string, newMock *types.Mock) (*types.Mock, error) {
	defer s.StoreSessions()

	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	newMock.Init()
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

func (s *mocks) LockMocks(ids []string) types.Mocks {
	session := s.GetLastSession()
	s.mu.Lock()
	for _, id := range ids {
		for _, mock := range session.Mocks {
			if mock.State.ID == id {
				mock.State.Locked = true
			}
		}
	}
	mocks := make(types.Mocks, len(session.Mocks))
	copy(mocks, session.Mocks)
	s.mu.Unlock()
	return mocks
}

func (s *mocks) UnlockMocks(ids []string) types.Mocks {
	session := s.GetLastSession()
	s.mu.Lock()
	for _, id := range ids {
		for _, mock := range session.Mocks {
			if mock.State.ID == id {
				mock.State.Locked = false
			}
		}
	}
	mocks := make(types.Mocks, len(session.Mocks))
	copy(mocks, session.Mocks)
	s.mu.Unlock()
	return mocks
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
	defer s.StoreSessions()

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
	defer s.StoreSessions()

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
	return session
}

func (s *mocks) UpdateSession(sessionID, name string) (*types.Session, error) {
	defer s.StoreSessions()

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
	defer s.StoreSessions()

	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = sessions
}

func (s *mocks) StoreSessions() {
	if s.persistenceDirectory == "" {
		return
	}
	go func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if err := ClearDir(s.persistenceDirectory); err != nil {
			log.Error("unable to clean directory: ", err)
			return
		}
		var sessionsGroup errgroup.Group
		sessionsSummary := make([]types.SessionSummary, 0, len(s.sessions))
		for _, session := range s.sessions {
			sessionsSummary = append(sessionsSummary, types.SessionSummary(*session))
			sessionsGroup.Go(func() error {
				if err := os.MkdirAll(filepath.Join(s.persistenceDirectory, session.ID), os.ModePerm); err != nil {
					return err
				}
				var g errgroup.Group
				g.Go(func() error {
					history, err := yaml.Marshal(session.History)
					if err != nil {
						return err
					}
					err = ioutil.WriteFile(filepath.Join(s.persistenceDirectory, session.ID, "history.yml"), history, os.ModePerm)
					if err != nil {
						return err
					}
					return nil
				})
				g.Go(func() error {
					mocks, err := yaml.Marshal(session.Mocks)
					if err != nil {
						return err
					}
					err = ioutil.WriteFile(filepath.Join(s.persistenceDirectory, session.ID, "mocks.yml"), mocks, os.ModePerm)
					if err != nil {
						return err
					}
					return nil
				})
				if err := g.Wait(); err != nil {
					return err
				}
				return nil
			})
		}
		sessionsGroup.Go(func() error {
			sessions, err := yaml.Marshal(sessionsSummary)
			if err != nil {
				return err
			}
			err = ioutil.WriteFile(filepath.Join(s.persistenceDirectory, "sessions.yml"), sessions, os.ModePerm)
			if err != nil {
				return err
			}
			return nil
		})
		if err := sessionsGroup.Wait(); err != nil {
			log.Error("unable to store sessions: ", err)
		}
	}()
}

func (s *mocks) LoadSessions() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.persistenceDirectory == "" {
		return nil
	}
	if _, err := os.Stat(s.persistenceDirectory); os.IsNotExist(err) {
		return err
	}
	file, err := os.Open(filepath.Join(s.persistenceDirectory, "sessions.yml"))
	if err != nil {
		return err
	}
	defer file.Close()
	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		return err
	}
	var sessions types.Sessions
	err = yaml.Unmarshal(bytes, &sessions)
	if err != nil {
		return err
	}
	var sessionsGroup errgroup.Group
	var mu sync.Mutex
	for _, session := range sessions {
		sessionsGroup.Go(func() error {
			historyFile, err := os.Open(filepath.Join(s.persistenceDirectory, session.ID, "history.yml"))
			if err != nil {
				return err
			}
			defer historyFile.Close()
			bytes, err := ioutil.ReadAll(historyFile)
			if err != nil {
				return err
			}
			var history types.History
			err = yaml.Unmarshal(bytes, &history)
			if err != nil {
				return err
			}
			mu.Lock()
			session.History = history
			mu.Unlock()
			return nil
		})
		sessionsGroup.Go(func() error {
			mocksFile, err := os.Open(filepath.Join(s.persistenceDirectory, session.ID, "mocks.yml"))
			if err != nil {
				return err
			}
			defer mocksFile.Close()
			bytes, err := ioutil.ReadAll(mocksFile)
			if err != nil {
				return err
			}
			var mocks types.Mocks
			err = yaml.Unmarshal(bytes, &mocks)
			if err != nil {
				return err
			}
			mu.Lock()
			session.Mocks = mocks
			mu.Unlock()
			return nil
		})
	}
	if err := sessionsGroup.Wait(); err != nil {
		return err
	}
	s.sessions = sessions
	return nil
}

func (s *mocks) Reset() {
	defer s.StoreSessions()
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

	if len(mocks) > 0 {
		session = s.GetLastSession()
		s.mu.Lock()
		session.Mocks = mocks
		s.mu.Unlock()
	}
}
