package stores

import (
	"context"

	"github.com/google/uuid"
	"github.com/smocker-dev/smocker/internal/types"
)

type PersistentStore interface {
	SaveCurrentTimeline(ctx context.Context, id *string) error
	LoadCurrentTimeline(ctx context.Context) (*string, error)
	SaveTimeline(ctx context.Context, id string, timeline types.Timeline) error
	DeleteTimeline(ctx context.Context, id string) error
	LoadTimelines(ctx context.Context) (map[string]types.Timeline, error)
	SaveMock(ctx context.Context, id uuid.UUID, timelineID string, position int, mock types.Mock) error
	LoadMocks(ctx context.Context) (map[string][]types.Mock, error)
	SaveMockTimesCalled(ctx context.Context, id uuid.UUID, timesCalled int) error
	LoadMocksTimesCalled(ctx context.Context) (map[string]map[uuid.UUID]int, error)
	DeleteMocksTimesCalled(ctx context.Context, timelineID string) error
	SaveHistoryEntry(ctx context.Context, id uuid.UUID, timelineID string, position int, history types.HistoryEntry) error
	LoadHistoryEntries(ctx context.Context) (map[string][]types.HistoryEntry, error)
	DeleteHistoryEntries(ctx context.Context, timelineID string) error
}
