package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/Thiht/smocker/server/database"
	"github.com/Thiht/smocker/server/types"
	"github.com/teris-io/shortid"
)

type Mocks interface {
	AddMock(sessionID string, mock *types.Mock) (*types.Mock, error)
	SaveMock(mock *types.Mock) (*types.Mock, error)
	GetMocks(sessionID string) (types.Mocks, error)
	GetMockByID(id string) (*types.Mock, error)
	LockMocks(sessionID string, ids []string) (types.Mocks, error)
	UnlockMocks(sessionID string, ids []string) (types.Mocks, error)
	AddHistoryEntry(sessionID string, entry *types.Entry) (*types.Entry, error)
	GetHistory(sessionID string) (types.History, error)
	GetHistoryByPath(sessionID, filterPath string) (types.History, error)
	NewSession(name string) (*types.Session, error)
	UpdateSession(id, name string) (*types.Session, error)
	GetLastSession() (*types.Session, error)
	GetSessionByID(id string) (*types.Session, error)
	GetSessions() (types.Sessions, error)
	ImportSessions(sessions []*types.SessionDump) error
	Reset(force bool) error
}

type mocks struct {
	db               database.DB
	historyRetention int
}

func NewMocks(db database.DB, historyRetention int) Mocks {
	s := &mocks{
		db:               db,
		historyRetention: historyRetention,
	}
	return s
}

func (s *mocks) AddMock(sessionID string, newMock *types.Mock) (*types.Mock, error) {
	newMock.Init()
	newMock.State.SessionID = sessionID
	dao, err := s.db.SaveMock(database.NewMockDaoFromMock(newMock))
	if err != nil {
		return nil, err
	}
	return dao.ToMock(), nil
}
func (s *mocks) SaveMock(newMock *types.Mock) (*types.Mock, error) {
	dao, err := s.db.SaveMock(database.NewMockDaoFromMock(newMock))
	if err != nil {
		return nil, err
	}
	return dao.ToMock(), nil
}

func (s *mocks) GetMocks(sessionID string) (types.Mocks, error) {
	dao, err := s.db.GetMocks(sessionID)
	if err != nil {
		return nil, err
	}
	return dao.ToMocks(), nil
}

func (s *mocks) LockMocks(sessionID string, ids []string) (types.Mocks, error) {
	return s.changeLockMocksForIDs(sessionID, ids, true /* locked */)
}

func (s *mocks) UnlockMocks(sessionID string, ids []string) (types.Mocks, error) {
	return s.changeLockMocksForIDs(sessionID, ids, false /* locked */)
}

func (s *mocks) changeLockMocksForIDs(sessionID string, ids []string, locked bool) (types.Mocks, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	daos, err := tx.GetMocks(sessionID)
	if err != nil {
		return nil, err
	}
	for _, dao := range daos {
		if contains(ids, dao.ID) {
			dao.Locked = locked
			if _, err := tx.SaveMock(dao); err != nil {
				return nil, err
			}
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	daos, err = s.db.GetMocks(sessionID)
	if err != nil {
		return nil, err
	}
	return daos.ToMocks(), nil
}

func (s *mocks) GetMockByID(id string) (*types.Mock, error) {
	dao, err := s.db.GetMockByID(id)
	if err != nil {
		return nil, err
	}
	return dao.ToMock(), nil
}

func (s *mocks) AddHistoryEntry(sessionID string, entry *types.Entry) (*types.Entry, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	dao := database.NewEntryDaoFromEntry(entry)
	dao.SessionID = sessionID
	res, err := tx.SaveEntry(dao)
	if err != nil {
		return nil, err
	}

	if s.historyRetention > 0 {
		if err := tx.RemoveEntryByRetention(sessionID, s.historyRetention); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return res.ToEntry(), nil
}

func (s *mocks) GetHistory(sessionID string) (types.History, error) {
	dao, err := s.db.GetHistory(sessionID)
	if err != nil {
		return nil, err
	}
	return dao.ToHistory(), nil
}

func (s *mocks) GetHistoryByPath(sessionID, filterPath string) (types.History, error) {
	history, err := s.GetHistory(sessionID)
	if err != nil {
		return nil, err
	}

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

func (s *mocks) NewSession(name string) (*types.Session, error) {
	sessions, err := s.db.GetSessions()
	if err != nil {
		return nil, err
	}

	newSessionID := shortid.MustGenerate()
	name = strings.TrimSpace(name)
	if name == "" {
		name = fmt.Sprintf("Session #%d", len(sessions)+1)
	} else {
		if session, err := s.db.GetSessionByName(name); err == nil {
			newSessionID = session.ID
		}
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	mocks := database.MocksDao{}
	if len(sessions) > 0 {
		session := sessions[len(sessions)-1]
		daos, err := tx.GetMocks(session.ID)
		if err != nil {
			return nil, err
		}
		for _, mock := range daos {
			if mock.Locked {
				mock.ID = shortid.MustGenerate()
				mocks = append(mocks, mock)
			}
		}
	}

	session := &database.SessionDao{
		ID:   newSessionID,
		Name: name,
		Date: time.Now(),
	}

	session, err = tx.SaveSession(session)
	if err != nil {
		return nil, err
	}

	for _, mock := range mocks {
		mock.SessionID = session.ID
		if _, err := tx.SaveMock(mock); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return session.ToSession(), nil
}

func (s *mocks) UpdateSession(sessionID, name string) (*types.Session, error) {
	session, err := s.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	session.Name = name
	dao, err := s.db.SaveSession(database.NewSessionDaoFromSession(session))
	if err != nil {
		return nil, err
	}
	return dao.ToSession(), nil
}

func (s *mocks) GetLastSession() (*types.Session, error) {
	sessions, err := s.GetSessions()
	if err != nil {
		return nil, err
	}
	if len(sessions) > 0 {
		return sessions[len(sessions)-1], nil
	}
	return s.NewSession("")
}

func (s *mocks) GetSessionByID(id string) (*types.Session, error) {
	session, err := s.db.GetSessionByID(id)
	if err != nil {
		return nil, err
	}
	return session.ToSession(), nil
}

func (s *mocks) GetSessionByName(name string) (*types.Session, error) {
	session, err := s.db.GetSessionByName(name)
	if err != nil {
		return nil, err
	}
	return session.ToSession(), nil
}

func (s *mocks) GetSessions() (types.Sessions, error) {
	sessions, err := s.db.GetSessions()
	if err != nil {
		return nil, err
	}
	return sessions.ToSessions(), nil
}

func (s *mocks) ImportSessions(dump []*types.SessionDump) error {
	if err := s.db.ClearHistory(); err != nil {
		return err
	}
	if err := s.db.ClearMocks(); err != nil {
		return err
	}
	if err := s.db.ClearSessions(); err != nil {
		return err
	}
	sessions := make(database.SessionsDao, 0, len(dump))
	for _, session := range dump {
		sessions = append(sessions, database.NewSessionDaoFromSession(&session.Session))
		if _, err := s.db.SaveHistory(database.NewHistoryDaoFromHistory(session.History)); err != nil {
			return err
		}
		if _, err := s.db.SaveMocks(database.NewMocksDaoFromMocks(session.Mocks)); err != nil {
			return err
		}
	}
	_, err := s.db.SaveSessions(sessions)
	return err
}

func (s *mocks) Reset(force bool) error {
	lockedMocks := database.MocksDao{}
	session, err := s.GetLastSession()
	if err != nil {
		return err
	}
	daos, err := s.db.GetMocks(session.ID)
	if err != nil {
		return err
	}
	if len(daos) > 0 && !force {
		for _, mock := range daos {
			if mock.Locked {
				lockedMocks = append(lockedMocks, mock)
			}
		}
	}
	if err := s.db.ClearSessions(); err != nil {
		return err
	}
	if err := s.db.ClearHistory(); err != nil {
		return err
	}
	if err := s.db.ClearMocks(); err != nil {
		return err
	}

	if len(lockedMocks) == 0 {
		return nil
	}

	session, err = s.NewSession("")
	if err != nil {
		return err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, mock := range lockedMocks {
		mock.SessionID = session.ID
		_, err := tx.SaveMock(mock)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
