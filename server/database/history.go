package database

import (
	"github.com/asdine/storm/v3"
	"github.com/asdine/storm/v3/q"
)

type HistoryRepository interface {
	GetHistory(sessionID string) (HistoryDao, error)
	SaveEntry(entry *EntryDao) (*EntryDao, error)
	RemoveEntryByID(id string) error
	RemoveEntryByRetention(sessionID string, retention int) error
	SaveHistory(history HistoryDao) (HistoryDao, error)
	ClearHistory() error
}

func (c *client) GetHistory(sessionID string) (HistoryDao, error) {
	var history HistoryDao
	err := c.db.Select(q.Eq("SessionID", sessionID)).OrderBy("ReceivedAt").Find(&history)
	if err != nil && err != storm.ErrNotFound {
		return nil, err
	}
	return history, nil
}

func (c *client) SaveEntry(entry *EntryDao) (*EntryDao, error) {
	err := c.db.Save(entry)
	if err != nil {
		return nil, err
	}
	return entry, nil
}

func (c *client) RemoveEntryByID(id string) error {
	return c.db.DeleteStruct(&EntryDao{ID: id})
}

func (c *client) RemoveEntryByRetention(sessionID string, retention int) error {
	return c.db.Select(q.Eq("SessionID", sessionID)).OrderBy("CreatedAt").Reverse().Skip(retention).Delete(new(EntryDao))
}

func (c *client) SaveHistory(history HistoryDao) (HistoryDao, error) {
	tx, err := c.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	savedHistory := HistoryDao{}
	for _, entry := range history {
		h, err := tx.SaveEntry(entry)
		if err != nil {
			return nil, err
		}
		savedHistory = append(savedHistory, h)
	}
	err = tx.Commit()
	if err != nil {
		return nil, err
	}
	return savedHistory, nil
}

func (c *client) ClearHistory() error {
	err := c.db.Drop(new(EntryDao))
	if err != nil {
		return err
	}
	return c.db.Init(new(EntryDao))
}
