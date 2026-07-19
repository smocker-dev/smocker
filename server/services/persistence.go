package services

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	"github.com/smocker-dev/smocker/server/types"
	"golang.org/x/sync/errgroup"
	"gopkg.in/yaml.v3"
)

const (
	historyFileName  = "history.yml"
	mocksFileName    = "mocks.yml"
	sessionsFileName = "sessions.yml"

	// maxPersistenceConcurrency bounds how many session files are read/written in parallel.
	// Persistence spawns work per session, so without a cap a large number of sessions could
	// exhaust the process's file descriptors ("too many open files"). errgroup.Go blocks once
	// this many goroutines are in flight.
	maxPersistenceConcurrency = 16
)

type Persistence interface {
	LoadSessions() (types.Sessions, error)
	StoreMocks(sessionID string, mocks types.Mocks)
	StoreHistory(sessionID string, history types.History)
	StoreSession(summary []types.SessionSummary, session *types.Session)
	StoreSessions(types.Sessions)
}

type persistence struct {
	mu                   sync.Mutex
	persistenceDirectory string
}

func NewPersistence(persistenceDirectory string) Persistence {
	p := &persistence{
		persistenceDirectory: persistenceDirectory,
	}
	return p
}

func (p *persistence) StoreMocks(sessionID string, mocks types.Mocks) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	err := p.createSessionDirectory(sessionID)
	if err != nil {
		slog.Error(fmt.Sprintf("unable to create directory for session %q: %v", sessionID, err))
		return
	}
	err = p.persistMocks(sessionID, mocks)
	if err != nil {
		slog.Error(fmt.Sprintf("unable to store mocks for session %q: %v", sessionID, err))
	}
}

func (p *persistence) StoreHistory(sessionID string, history types.History) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	err := p.createSessionDirectory(sessionID)
	if err != nil {
		slog.Error(fmt.Sprintf("unable to create directory for session %q: %v", sessionID, err))
		return
	}
	err = p.persistHistory(sessionID, history)
	if err != nil {
		slog.Error(fmt.Sprintf("unable to store history for session %q: %v", sessionID, err))
	}
}

func (p *persistence) StoreSession(summary []types.SessionSummary, session *types.Session) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	if err := p.createSessionDirectory(session.ID); err != nil {
		slog.Error(fmt.Sprintf("unable to create directory for session %q: %v", session.ID, err))
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
		slog.Error(fmt.Sprintf("unable to store session %q: %v", session.ID, err))
	}
}

func (p *persistence) StoreSessions(sessions types.Sessions) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.persistenceDirectory == "" {
		return
	}
	if err := p.cleanAll(); err != nil {
		slog.Error("unable to clean directory", "error", err)
		return
	}
	var sessionsGroup errgroup.Group
	sessionsGroup.SetLimit(maxPersistenceConcurrency)
	for i := range sessions {
		session := sessions[i]
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
		slog.Error("unable to store sessions", "error", err)
	}
}

func (p *persistence) LoadSessions() (types.Sessions, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.persistenceDirectory == "" {
		return nil, nil
	}
	if _, err := os.Stat(p.persistenceDirectory); os.IsNotExist(err) {
		return nil, err
	}
	data, err := os.ReadFile(filepath.Join(p.persistenceDirectory, sessionsFileName))
	if err != nil {
		return nil, err
	}
	var sessions types.Sessions
	if err := yaml.Unmarshal(data, &sessions); err != nil {
		return nil, err
	}

	// Load each session's history and mocks independently and resiliently: a missing or
	// unreadable per-session file must never discard the other sessions. Previously a single
	// incomplete session directory made the whole load fail and wiped every persisted session on
	// restart (the recurring persistence reports). The session name always loads from the
	// summary, and whatever history/mocks are readable are kept.
	var sessionsLock sync.Mutex
	var group errgroup.Group
	group.SetLimit(maxPersistenceConcurrency)
	for i := range sessions {
		session := sessions[i]
		group.Go(func() error {
			history, err := loadPersistedFile[types.History](p.persistenceDirectory, session.ID, historyFileName)
			if err != nil {
				logPersistedLoadError("history", session.ID, err)
				return nil
			}
			sessionsLock.Lock()
			session.History = history
			sessionsLock.Unlock()
			return nil
		})
		group.Go(func() error {
			mocks, err := loadPersistedFile[types.Mocks](p.persistenceDirectory, session.ID, mocksFileName)
			if err != nil {
				logPersistedLoadError("mocks", session.ID, err)
				return nil
			}
			// mocks are stored as a stack so we need to reverse the list from mocks file
			orderedMocks := make(types.Mocks, 0, len(mocks))
			for j := len(mocks) - 1; j >= 0; j-- {
				orderedMocks = append(orderedMocks, mocks[j])
			}
			sessionsLock.Lock()
			session.Mocks = orderedMocks
			sessionsLock.Unlock()
			return nil
		})
	}
	_ = group.Wait() // per-file errors are handled above; the load itself never fails here
	return sessions, nil
}

// loadPersistedFile reads and YAML-decodes a per-session persistence file (history or mocks).
func loadPersistedFile[T any](dir, sessionID, name string) (T, error) {
	var v T
	data, err := os.ReadFile(filepath.Join(dir, sessionID, name))
	if err != nil {
		return v, err
	}
	return v, yaml.Unmarshal(data, &v)
}

// logPersistedLoadError reports a per-session load problem without aborting the whole load.
func logPersistedLoadError(kind, sessionID string, err error) {
	if os.IsNotExist(err) {
		slog.Debug(fmt.Sprintf("No %s file for session %q, treating as empty", kind, sessionID))
		return
	}
	slog.Warn(fmt.Sprintf("Unable to load %s for session %q, ignoring it", kind, sessionID), "error", err)
}

func (p *persistence) createSessionDirectory(sessionID string) error {
	slog.Debug(fmt.Sprintf("Create directory for session %q", sessionID))
	sessionDirectory := filepath.Join(p.persistenceDirectory, sessionID)
	if err := os.MkdirAll(sessionDirectory, os.ModePerm); err != nil && !os.IsExist(err) {
		return err
	}
	return nil
}

func (p *persistence) persistHistory(sessionID string, h types.History) error {
	slog.Debug(fmt.Sprintf("Persist history for session %q", sessionID))
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
	slog.Debug(fmt.Sprintf("Persist mocks for session %q", sessionID))
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
	slog.Debug("Persist sessions summary")
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

func (p *persistence) cleanAll() error {
	if err := os.MkdirAll(p.persistenceDirectory, os.ModePerm); err != nil && !os.IsExist(err) {
		slog.Error(fmt.Sprintf("Unable to ensure that directory %q exists", p.persistenceDirectory), "error", err)
		return err
	}
	slog.Debug("Cleanning old sessions")
	files, err := os.ReadDir(p.persistenceDirectory)
	if err != nil {
		slog.Error(fmt.Sprintf("Unable to browse directory %q", p.persistenceDirectory), "error", err)
		return err
	}
	for _, file := range files {
		os.RemoveAll(filepath.Join(p.persistenceDirectory, file.Name()))
	}
	return nil
}
