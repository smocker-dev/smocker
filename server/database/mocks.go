package database

import (
	"github.com/asdine/storm/v3"
	"github.com/asdine/storm/v3/q"
)

type MocksRepository interface {
	GetMocks(sessionID string) (MocksDao, error)
	GetMockByID(id string) (*MockDao, error)
	SaveMock(mock *MockDao) (*MockDao, error)
	SaveMocks(mocks MocksDao) (MocksDao, error)
	RemoveMockByID(id string) error
	ClearMocks() error
	DropMocks() error
}

func (c *client) GetMocks(sessionID string) (MocksDao, error) {
	var mocks MocksDao
	err := c.db.Select(q.Eq("SessionID", sessionID)).OrderBy("CreatedAt").Reverse().Find(&mocks)
	if err != nil && err != storm.ErrNotFound {
		return nil, err
	}
	return mocks, nil
}

func (c *client) GetMockByID(id string) (*MockDao, error) {
	var mock MockDao
	err := c.db.One("ID", id, &mock)
	if err != nil {
		return nil, err
	}
	return &mock, nil
}

func (c *client) SaveMock(mock *MockDao) (*MockDao, error) {
	err := c.db.Save(mock)
	if err != nil {
		return nil, err
	}
	return mock, nil
}

func (c *client) SaveMocks(mocks MocksDao) (MocksDao, error) {
	tx, err := c.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	savedMocks := MocksDao{}
	for _, mock := range mocks {
		m, err := tx.SaveMock(mock)
		if err != nil {
			return nil, err
		}
		savedMocks = append(savedMocks, m)
	}
	err = tx.Commit()
	if err != nil {
		return nil, err
	}
	return savedMocks, nil
}

func (c *client) RemoveMockByID(id string) error {
	err := c.db.DeleteStruct(&MockDao{ID: id})
	if err != storm.ErrNotFound {
		return err
	}
	return nil
}

func (c *client) ClearMocks() error {
	err := c.db.Select(q.Eq("Locked", false)).Delete(new(MockDao))
	if err != storm.ErrNotFound {
		return err
	}
	return nil
}

func (c *client) DropMocks() error {
	err := c.db.Drop(new(MockDao))
	if err != nil {
		return err
	}
	err = c.db.Init(new(MockDao))
	if err != nil {
		return err
	}
	return nil
}
