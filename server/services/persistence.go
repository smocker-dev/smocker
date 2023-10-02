package services

import (
	"io"
	"os"
	"path/filepath"
	"sync"

	"github.com/Thiht/smocker/server/types"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
	"gopkg.in/yaml.v3"
)

const (
	historyFileName  = "history.yml"
	mocksFileName    = "mocks.yml"
	sessionsFileName = "sessions.yml"
)

type Persistence interface {
	LoadSessions() (types.Sessions, error)
	StoreMocks(sessionID string, mocks types.Mocks)
	StoreHistory(sessionID string, history types.History)
	StoreSession(summary []types.SessionSummary, session *types.Session)
	StoreSessions(types.Sessions)
}

var mu sync.Mutex

type persistence struct {
	persistenceDirectory string
}

func NewPersistence(persistenceDirectory string) Persistence {
	p := &persistence{
		persistenceDirectory: persistenceDirectory,
	}
	return p
}

func (p *persistence) StoreMocks(sessionID string, mocks types.Mocks) {
	mu.Lock()
	defer mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	err := p.createSessionDirectory(sessionID)
	if err != nil {
		log.Errorf("unable to create directory for session %q: %v", sessionID, err)
		return
	}
	err = p.persistMocks(sessionID, mocks)
	if err != nil {
		log.Errorf("unable to store mocks for session %q: %v", sessionID, err)
	}
}

func (p *persistence) StoreHistory(sessionID string, history types.History) {
	mu.Lock()
	defer mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	err := p.createSessionDirectory(sessionID)
	if err != nil {
		log.Errorf("unable to create directory for session %q: %v", sessionID, err)
		return
	}
	err = p.persistHistory(sessionID, history)
	if err != nil {
		log.Errorf("unable to store history for session %q: %v", sessionID, err)
	}
}

func (p *persistence) StoreSession(summary []types.SessionSummary, session *types.Session) {
	mu.Lock()
	defer mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	if err := p.createSessionDirectory(session.ID); err != nil {
		log.Errorf("unable to create directory for session %q: %v", session.ID, err)
		return
	}

	var sessionGroup errgroup.Group
	sessionGroup.Go(func() error {
		return p.persistHistory(session.ID, session.History)
	})
	sessionGroup.Go(func() error {
		return p.persistMocks(session.ID, session.Mocks)
	})
	sessionGroup.Go(func() error {
		return p.persistSessionsSummary(summary)
	})
	if err := sessionGroup.Wait(); err != nil {
		log.Errorf("unable to store session %q: %v", session.ID, err)
	}
}

func (p *persistence) StoreSessions(sessions types.Sessions) {
	mu.Lock()
	defer mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	var sessionsGroup errgroup.Group
	for _, ses := range sessions {
		session := *ses
		sessionsGroup.Go(func() error {
			if err := p.createSessionDirectory(session.ID); err != nil {
				return err
			}
			var g errgroup.Group
			g.Go(func() error {
				return p.persistHistory(session.ID, session.History)
			})
			g.Go(func() error {
				return p.persistMocks(session.ID, session.Mocks)
			})
			if err := g.Wait(); err != nil {
				return err
			}
			return nil
		})
	}
	sessionsGroup.Go(func() error {
		return p.persistSessionsSummary(sessions.Summarize())
	})
	if err := sessionsGroup.Wait(); err != nil {
		log.Error("unable to store sessions: ", err)
	}
	if err := p.cleanOutdatedSessions(sessions); err != nil {
		log.Error("unable to clean outdated sessions: ", err)
	}
}

func (p *persistence) LoadSessions() (types.Sessions, error) {
	mu.Lock()
	defer mu.Unlock()
	if p.persistenceDirectory == "" {
		return nil, nil
	}
	if _, err := os.Stat(p.persistenceDirectory); os.IsNotExist(err) {
		return nil, err
	}
	file, err := os.Open(filepath.Join(p.persistenceDirectory, sessionsFileName))
	if err != nil {
		if err == os.ErrNotExist {
			return types.Sessions{}, nil
		}
		return nil, err
	}
	defer file.Close()
	bytes, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}
	var sessions types.Sessions
	err = yaml.Unmarshal(bytes, &sessions)
	if err != nil {
		return nil, err
	}
	var sessionsGroup errgroup.Group
	var sessionsLock sync.Mutex
	for _, ses := range sessions {
		session := *ses
		sessionsGroup.Go(func() error {
			historyFile, err := os.Open(filepath.Join(p.persistenceDirectory, session.ID, historyFileName))
			if err != nil {
				log.WithError(err).Errorf("Unable to open history file for session %q", session.ID)
				return err
			}
			defer historyFile.Close()
			bytes, err := io.ReadAll(historyFile)
			if err != nil {
				return err
			}
			var history types.History
			err = yaml.Unmarshal(bytes, &history)
			if err != nil {
				return err
			}
			sessionsLock.Lock()
			session.History = history
			sessionsLock.Unlock()
			return nil
		})
		sessionsGroup.Go(func() error {
			mocksFile, err := os.Open(filepath.Join(p.persistenceDirectory, session.ID, mocksFileName))
			if err != nil {
				log.WithError(err).Errorf("Unable to open mocks file for session %q", session.ID)
				return err
			}
			defer mocksFile.Close()
			bytes, err := io.ReadAll(mocksFile)
			if err != nil {
				return err
			}
			var mocks types.Mocks
			err = yaml.Unmarshal(bytes, &mocks)
			if err != nil {
				return err
			}

			// mocks are stored as a stack so we need to reverse the list from mocks file
			orderedMocks := make(types.Mocks, 0, len(mocks))
			for i := len(mocks) - 1; i >= 0; i-- {
				orderedMocks = append(orderedMocks, mocks[i])
			}
			sessionsLock.Lock()
			session.Mocks = orderedMocks
			sessionsLock.Unlock()
			return nil
		})
	}
	if err := sessionsGroup.Wait(); err != nil {
		return nil, err
	}
	if err := p.cleanOutdatedSessions(sessions); err != nil {
		return nil, err
	}

	return sessions, nil
}

func (p *persistence) createSessionDirectory(sessionID string) error {
	log.Debugf("Create directory for session %q", sessionID)
	sessionDirectory := filepath.Join(p.persistenceDirectory, sessionID)
	if err := os.MkdirAll(sessionDirectory, os.ModePerm); err != nil && !os.IsExist(err) {
		return err
	}
	return nil
}

func (p *persistence) persistHistory(sessionID string, h types.History) error {
	log.Debugf("Persist history for session %q", sessionID)
	history, err := yaml.Marshal(h)
	if err != nil {
		return err
	}
	err = os.WriteFile(filepath.Join(p.persistenceDirectory, sessionID, historyFileName), history, os.ModePerm)
	if err != nil {
		return err
	}
	return nil
}

func (p *persistence) persistMocks(sessionID string, m types.Mocks) error {
	log.Debugf("Persist mocks for session %q", sessionID)
	// we need to reverse mocks before storage in order to have a reusable mocks file as mocks are stored as a stack
	orderedMocks := make(types.Mocks, 0, len(m))
	for i := len(m) - 1; i >= 0; i-- {
		orderedMocks = append(orderedMocks, m[i])
	}
	mocks, err := yaml.Marshal(orderedMocks)
	if err != nil {
		return err
	}
	err = os.WriteFile(filepath.Join(p.persistenceDirectory, sessionID, mocksFileName), mocks, os.ModePerm)
	if err != nil {
		return err
	}
	return nil
}

func (p *persistence) persistSessionsSummary(summary []types.SessionSummary) error {
	log.Debug("Persist sessions summary")
	sessions, err := yaml.Marshal(summary)
	if err != nil {
		return err
	}
	err = os.WriteFile(filepath.Join(p.persistenceDirectory, sessionsFileName), sessions, os.ModePerm)
	if err != nil {
		return err
	}
	return nil
}

func (p *persistence) cleanOutdatedSessions(sessions types.Sessions) error {
	sessionsIDs := make(map[string]bool, len(sessions))
	for _, ses := range sessions {
		session := *ses
		sessionsIDs[session.ID] = true
	}
	log.Debug("Clean old sessions")
	entries, err := os.ReadDir(p.persistenceDirectory)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() && !sessionsIDs[entry.Name()] {
			path := filepath.Join(p.persistenceDirectory, entry.Name())
			log.Debugf("Removing directory: %q", path)
			os.RemoveAll(path)
		}
	}
	return nil
}
