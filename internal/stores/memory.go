package stores

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"sync"

	"github.com/google/uuid"
	"github.com/smocker-dev/smocker/internal/types"
)

type MemoryStoreTx struct {
	memoryStore *memoryStore
	mx          sync.RWMutex
}

type memoryStore struct {
	persistentStore     PersistentStore
	currentTimeline     *string
	timelines           map[string]types.Timeline
	mocksByTimelineID   map[string][]types.Mock
	mocksTimesCalled    map[string]map[uuid.UUID]int
	historyByTimelineID map[string][]types.HistoryEntry
}

type MemoryStoreRO interface {
	GetCurrentTimelineID(ctx context.Context) (string, error)

	ListTimelines(ctx context.Context) ([]types.Timeline, error)
	GetTimeline(ctx context.Context, id string) (types.Timeline, error)

	ListTimelineMocks(ctx context.Context, timelineID string) ([]types.MockWithState, error)
	GetTimelineMock(ctx context.Context, timelineID string, mockID uuid.UUID) (types.MockWithState, error)

	GetMockTimesCalled(ctx context.Context, timelineID string, mockID uuid.UUID) (int, error)

	GetTimelineHistory(ctx context.Context, timelineID string) ([]types.HistoryEntry, error)
}

type MemoryStoreRW interface {
	MemoryStoreRO

	UseTimeline(ctx context.Context, id string) error

	CreateTimeline(ctx context.Context, timeline types.Timeline) error
	UpdateTimeline(ctx context.Context, timeline types.Timeline) error
	DeleteTimeline(ctx context.Context, id string) error

	PushTimelineMock(ctx context.Context, timelineID string, mock types.Mock) error
	IncrementMockTimesCalled(ctx context.Context, timelineID string, mockID uuid.UUID) error

	AppendTimelineHistoryEntry(ctx context.Context, timelineID string, entry types.HistoryEntry) error
	DeleteTimelineHistory(ctx context.Context, id string) error
}

var (
	_ MemoryStoreRO = (*memoryStore)(nil)
	_ MemoryStoreRW = (*memoryStore)(nil)
)

func NewMemoryStoreTx(ctx context.Context, persistentStore PersistentStore) (*MemoryStoreTx, error) {
	currentTimeline, err := persistentStore.LoadCurrentTimeline(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load current timeline from persistent store: %w", err)
	}

	timelines, err := persistentStore.LoadTimelines(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load timelines from persistent store: %w", err)
	}

	mocks, err := persistentStore.LoadMocks(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load mocks from persistent store: %w", err)
	}

	timesCalled, err := persistentStore.LoadMocksTimesCalled(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load mocks times called from persistent store: %w", err)
	}

	history, err := persistentStore.LoadHistoryEntries(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load history from persistent store: %w", err)
	}

	for _, timeline := range timelines {
		if _, ok := mocks[timeline.ID]; !ok {
			mocks[timeline.ID] = []types.Mock{}
		}
		if _, ok := timesCalled[timeline.ID]; !ok {
			timesCalled[timeline.ID] = map[uuid.UUID]int{}
		}
		if _, ok := history[timeline.ID]; !ok {
			history[timeline.ID] = []types.HistoryEntry{}
		}
	}

	return &MemoryStoreTx{
		memoryStore: &memoryStore{
			persistentStore:     persistentStore,
			currentTimeline:     currentTimeline,
			timelines:           timelines,
			mocksByTimelineID:   mocks,
			mocksTimesCalled:    timesCalled,
			historyByTimelineID: history,
		},
	}, nil
}

func (s *MemoryStoreTx) WithROLock(ctx context.Context, f func(ctx context.Context, s MemoryStoreRO) error) error {
	s.mx.RLock()
	defer s.mx.RUnlock()

	return f(ctx, s.memoryStore)
}

func (s *MemoryStoreTx) WithRWLock(ctx context.Context, f func(ctx context.Context, s MemoryStoreRW) error) error {
	s.mx.Lock()
	defer s.mx.Unlock()

	return f(ctx, s.memoryStore)
}

func (s *memoryStore) GetCurrentTimelineID(ctx context.Context) (string, error) {
	if s.currentTimeline == nil {
		return "", types.ErrNoCurrentTimeline
	}

	return *s.currentTimeline, nil
}

func (s *memoryStore) ListTimelines(ctx context.Context) ([]types.Timeline, error) {
	timelines := make([]types.Timeline, 0, len(s.timelines))
	for _, timeline := range s.timelines {
		timelines = append(timelines, timeline)
	}

	return timelines, nil
}

func (s *memoryStore) GetTimeline(ctx context.Context, id string) (types.Timeline, error) {
	timeline, ok := s.timelines[id]
	if !ok {
		return types.Timeline{}, types.ErrTimelineNotFound
	}

	return timeline, nil
}

func (s *memoryStore) ListTimelineMocks(ctx context.Context, timelineID string) ([]types.MockWithState, error) {
	mocks, ok := s.mocksByTimelineID[timelineID]
	if !ok {
		return nil, types.ErrTimelineNotFound
	}

	mocksWithState := make([]types.MockWithState, 0, len(mocks))
	for _, mock := range slices.Backward(mocks) {
		mocksWithState = append(mocksWithState, types.MockWithState{
			Mock: mock,
			State: types.MockState{
				TimesCalled: s.mocksTimesCalled[timelineID][mock.ID],
			},
		})
	}

	return mocksWithState, nil
}

func (s *memoryStore) GetTimelineMock(ctx context.Context, timelineID string, mockID uuid.UUID) (types.MockWithState, error) {
	mocks, ok := s.mocksByTimelineID[timelineID]
	if !ok {
		return types.MockWithState{}, types.ErrTimelineNotFound
	}

	for _, mock := range mocks {
		if mock.ID == mockID {
			return types.MockWithState{
				Mock: mock,
				State: types.MockState{
					TimesCalled: s.mocksTimesCalled[timelineID][mockID],
				},
			}, nil
		}
	}

	return types.MockWithState{}, types.ErrMockNotFound
}

func (s *memoryStore) GetMockTimesCalled(ctx context.Context, timelineID string, mockID uuid.UUID) (int, error) {
	if _, ok := s.timelines[timelineID]; !ok {
		return 0, types.ErrTimelineNotFound
	}

	timesCalled, ok := s.mocksTimesCalled[timelineID][mockID]
	if !ok {
		return 0, types.ErrMockNotFound
	}

	return timesCalled, nil
}

func (s *memoryStore) GetTimelineHistory(ctx context.Context, timelineID string) ([]types.HistoryEntry, error) {
	history, ok := s.historyByTimelineID[timelineID]
	if !ok {
		return nil, types.ErrTimelineNotFound
	}

	return history, nil
}

func (s *memoryStore) UseTimeline(ctx context.Context, id string) error {
	if _, ok := s.timelines[id]; !ok {
		return types.ErrTimelineNotFound
	}

	s.currentTimeline = &id

	if err := s.persistentStore.SaveCurrentTimeline(ctx, &id); err != nil {
		slog.ErrorContext(ctx, "failed to persist current timeline", slog.Any("error", err), slog.String("timeline_id", id))
	}

	return nil
}

func (s *memoryStore) CreateTimeline(ctx context.Context, timeline types.Timeline) error {
	if _, ok := s.timelines[timeline.ID]; ok {
		return types.ErrTimelineAlreadyExists
	}

	s.timelines[timeline.ID] = timeline
	s.mocksByTimelineID[timeline.ID] = []types.Mock{}
	s.mocksTimesCalled[timeline.ID] = map[uuid.UUID]int{}
	s.historyByTimelineID[timeline.ID] = []types.HistoryEntry{}

	if err := s.persistentStore.SaveTimeline(ctx, timeline.ID, timeline); err != nil {
		slog.ErrorContext(ctx, "failed to persist created timeline", slog.Any("error", err), slog.String("timeline_id", timeline.ID))
	}

	return nil
}

func (s *memoryStore) UpdateTimeline(ctx context.Context, timeline types.Timeline) error {
	if _, ok := s.timelines[timeline.ID]; !ok {
		return types.ErrTimelineNotFound
	}

	s.timelines[timeline.ID] = timeline

	if err := s.persistentStore.SaveTimeline(ctx, timeline.ID, timeline); err != nil {
		slog.ErrorContext(ctx, "failed to persist updated timeline", slog.Any("error", err), slog.String("timeline_id", timeline.ID))
	}

	return nil
}

func (s *memoryStore) DeleteTimeline(ctx context.Context, id string) error {
	if _, ok := s.timelines[id]; !ok {
		return types.ErrTimelineNotFound
	}

	if s.currentTimeline != nil && *s.currentTimeline == id {
		s.currentTimeline = nil
		if err := s.persistentStore.SaveCurrentTimeline(ctx, nil); err != nil {
			slog.ErrorContext(ctx, "failed to persist deleted current timeline", slog.Any("error", err))
		}
	}

	delete(s.timelines, id)
	delete(s.mocksByTimelineID, id)
	delete(s.mocksTimesCalled, id)
	delete(s.historyByTimelineID, id)

	if err := s.persistentStore.DeleteTimeline(ctx, id); err != nil {
		slog.ErrorContext(ctx, "failed to persist deleted timeline", slog.Any("error", err), slog.String("timeline_id", id))
	}

	return nil
}

func (s *memoryStore) PushTimelineMock(ctx context.Context, timelineID string, mock types.Mock) error {
	if _, ok := s.timelines[timelineID]; !ok {
		return types.ErrTimelineNotFound
	}

	s.mocksByTimelineID[timelineID] = append(s.mocksByTimelineID[timelineID], mock)
	s.mocksTimesCalled[timelineID][mock.ID] = 0

	if err := s.persistentStore.SaveMock(ctx, mock.ID, timelineID, len(s.mocksByTimelineID[timelineID])-1, mock); err != nil {
		slog.ErrorContext(ctx, "failed to persist created mock", slog.Any("error", err), slog.String("timeline_id", timelineID), slog.String("mock_id", mock.ID.String()))
	}

	return nil
}

func (s *memoryStore) IncrementMockTimesCalled(ctx context.Context, timelineID string, mockID uuid.UUID) error {
	if _, ok := s.timelines[timelineID]; !ok {
		return types.ErrTimelineNotFound
	}

	if _, ok := s.mocksTimesCalled[timelineID][mockID]; !ok {
		return types.ErrMockNotFound
	}

	s.mocksTimesCalled[timelineID][mockID]++

	if err := s.persistentStore.SaveMockTimesCalled(ctx, mockID, s.mocksTimesCalled[timelineID][mockID]); err != nil {
		slog.ErrorContext(ctx, "failed to persist mock times called", slog.Any("error", err), slog.String("timeline_id", timelineID), slog.String("mock_id", mockID.String()))
	}

	return nil
}

func (s *memoryStore) AppendTimelineHistoryEntry(ctx context.Context, timelineID string, entry types.HistoryEntry) error {
	if _, ok := s.timelines[timelineID]; !ok {
		return types.ErrTimelineNotFound
	}

	s.historyByTimelineID[timelineID] = append(s.historyByTimelineID[timelineID], entry)

	if err := s.persistentStore.SaveHistoryEntry(ctx, entry.ID, timelineID, len(s.historyByTimelineID[timelineID])-1, entry); err != nil {
		slog.ErrorContext(ctx, "failed to persist history entry", slog.Any("error", err), slog.String("timeline_id", timelineID), slog.String("entry_id", entry.ID.String()))
	}

	return nil
}

func (s *memoryStore) DeleteTimelineHistory(ctx context.Context, id string) error {
	if _, ok := s.timelines[id]; !ok {
		return types.ErrTimelineNotFound
	}

	s.mocksTimesCalled[id] = map[uuid.UUID]int{}
	s.historyByTimelineID[id] = []types.HistoryEntry{}

	if err := s.persistentStore.DeleteMocksTimesCalled(ctx, id); err != nil {
		slog.ErrorContext(ctx, "failed to persist deleted mocks", slog.Any("error", err), slog.String("timeline_id", id))
	}

	if err := s.persistentStore.DeleteHistoryEntries(ctx, id); err != nil {
		slog.ErrorContext(ctx, "failed to persist deleted history entries", slog.Any("error", err), slog.String("timeline_id", id))
	}

	return nil
}
