package database

import (
	"time"

	"github.com/asdine/storm/v3"
	"github.com/teris-io/shortid"
)

type SessionRepository interface {
	GetSessions() (SessionsDao, error)
	GetSessionByID(id string) (*SessionDao, error)
	GetSessionByName(name string) (*SessionDao, error)
	GetLastSession() (*SessionDao, error)
	SaveSession(session *SessionDao) (*SessionDao, error)
	SaveSessions(sessions SessionsDao) (SessionsDao, error)
	ClearSessions() error
}

func (c *client) GetSessions() (SessionsDao, error) {
	var sessions SessionsDao
	err := c.db.AllByIndex("Date", &sessions)
	if err != nil && err != storm.ErrNotFound {
		return nil, err
	}
	return sessions, nil
}

func (c *client) GetSessionByID(id string) (*SessionDao, error) {
	var session SessionDao
	err := c.db.One("ID", id, &session)
	return &session, err
}
func (c *client) GetSessionByName(name string) (*SessionDao, error) {
	var session SessionDao
	err := c.db.One("Name", name, &session)
	return &session, err
}

func (c *client) GetLastSession() (*SessionDao, error) {
	var sessions SessionsDao
	err := c.db.AllByIndex("CreatedAt", &sessions, storm.Limit(1), storm.Reverse())
	if len(sessions) == 0 {
		return c.SaveSession(&SessionDao{
			ID:   shortid.MustGenerate(),
			Date: time.Now(),
		})
	}
	return sessions[len(sessions)-1], err
}

func (c *client) SaveSession(session *SessionDao) (*SessionDao, error) {
	err := c.db.Save(session)
	return session, err
}

func (c *client) SaveSessions(sessions SessionsDao) (SessionsDao, error) {
	tx, err := c.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	savedSessions := SessionsDao{}
	for _, session := range sessions {
		s, err := tx.SaveSession(session)
		if err != nil {
			return nil, err
		}
		savedSessions = append(savedSessions, s)
	}
	err = tx.Commit()
	if err != nil {
		return nil, err
	}
	return savedSessions, nil
}

func (c *client) ClearSessions() error {
	err := c.db.Drop(&SessionDao{})
	if err != nil {
		return err
	}
	return c.db.Init(&SessionDao{})
}
