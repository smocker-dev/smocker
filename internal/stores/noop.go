package stores

import (
	"context"

	"github.com/google/uuid"
	"github.com/smocker-dev/smocker/internal/types"
)

type noopStore struct{}

var _ PersistentStore = (*noopStore)(nil)

func NewNoopStore() *noopStore {
	return &noopStore{}
}

func (*noopStore) SaveCurrentTimeline(context.Context, *string) error {
	return nil
}

func (*noopStore) LoadCurrentTimeline(context.Context) (*string, error) {
	return nil, nil
}

func (*noopStore) SaveTimeline(context.Context, string, types.Timeline) error {
	return nil
}

func (*noopStore) LoadTimelines(context.Context) (map[string]types.Timeline, error) {
	return map[string]types.Timeline{}, nil
}

func (*noopStore) DeleteTimeline(context.Context, string) error {
	return nil
}

func (*noopStore) SaveMock(context.Context, uuid.UUID, string, int, types.Mock) error {
	return nil
}

func (*noopStore) LoadMocks(context.Context) (map[string][]types.Mock, error) {
	return map[string][]types.Mock{}, nil
}

func (*noopStore) SaveMockTimesCalled(context.Context, uuid.UUID, int) error {
	return nil
}

func (*noopStore) LoadMocksTimesCalled(context.Context) (map[string]map[uuid.UUID]int, error) {
	return map[string]map[uuid.UUID]int{}, nil
}

func (*noopStore) DeleteMocksTimesCalled(context.Context, string) error {
	return nil
}

func (*noopStore) SaveHistoryEntry(context.Context, uuid.UUID, string, int, types.HistoryEntry) error {
	return nil
}

func (*noopStore) LoadHistoryEntries(context.Context) (map[string][]types.HistoryEntry, error) {
	return map[string][]types.HistoryEntry{}, nil
}

func (*noopStore) DeleteHistoryEntries(context.Context, string) error {
	return nil
}
