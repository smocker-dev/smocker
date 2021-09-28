package database

import (
	"os"
	"path"

	log "github.com/sirupsen/logrus"

	"github.com/asdine/storm/v3"
)

// DB represents the DB access
type DB interface {
	HistoryRepository
	MocksRepository
	SessionRepository
	Begin() (DB, error)
	Commit() error
	Rollback()
	Close() error
}

// ClientDB wrap a storm ClientDB instance
type client struct {
	db *storm.DB
}

// NewClient return interface of db
func NewClient(directory string) DB {
	_ = os.MkdirAll(directory, os.ModePerm)
	db, err := storm.Open(path.Join(directory, "smocker.db"))
	if err != nil {
		log.Fatal(err)
	}

	err = db.Init(new(MockDao))
	if err != nil {
		log.Fatal(err)
	}
	err = db.Init(new(EntryDao))
	if err != nil {
		log.Fatal(err)
	}
	err = db.Init(new(SessionDao))
	if err != nil {
		log.Fatal(err)
	}

	return &client{db: db}
}

func (c *client) Begin() (DB, error) {
	db, err := c.db.Begin(true)
	if err != nil {
		return nil, err
	}
	return &client{db: &storm.DB{Node: db, Bolt: c.db.Bolt}}, nil
}

func (c *client) Commit() error {
	return c.db.Commit()
}

func (c *client) Rollback() {
	if err := c.db.Rollback(); err != nil && err != storm.ErrNotInTransaction {
		log.WithField("error", err).Error("Unable to rollback transaction")
	}
}

func (c *client) Close() error {
	return c.db.Close()
}
