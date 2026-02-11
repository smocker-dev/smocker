package services

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/smocker-dev/smocker/internal/stores"
	"github.com/smocker-dev/smocker/internal/types"
)

type TimelinesService struct {
	memoryStore *stores.MemoryStoreTx
}

func NewTimelinesService(memoryStore *stores.MemoryStoreTx) *TimelinesService {
	return &TimelinesService{
		memoryStore: memoryStore,
	}
}

func (s *TimelinesService) CreateTimeline(ctx context.Context, id, name string, mocks []types.CreateMock, overwrite, use bool) (types.Timeline, []types.Mock, error) {
	timeline := types.Timeline{
		ID:        id,
		Name:      name,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	if timeline.ID == "" {
		newID, err := uuid.NewV7()
		if err != nil {
			return types.Timeline{}, nil, fmt.Errorf("failed to generate UUID: %w", err)
		}

		timeline.ID = newID.String()
	}

	if timeline.Name == "" {
		timeline.Name = timeline.ID
	}

	createdMocks := make([]types.Mock, 0, len(mocks))
	if err := s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		if overwrite {
			if err := s.DeleteTimeline(ctx, timeline.ID); err != nil {
				if !errors.Is(err, types.ErrTimelineNotFound) {
					return fmt.Errorf("failed to delete existing timeline %q: %w", timeline.ID, err)
				}
			}
		}

		if err := s.CreateTimeline(ctx, timeline); err != nil {
			return fmt.Errorf("failed to create timeline: %w", err)
		}

		for _, createMock := range mocks {
			mock := newMock(createMock, timeline.ID)

			if err := s.PushTimelineMock(ctx, timeline.ID, mock); err != nil {
				return fmt.Errorf("failed to push mock: %w", err)
			}

			createdMocks = append(createdMocks, mock)
		}

		if use {
			if err := s.UseTimeline(ctx, timeline.ID); err != nil {
				return fmt.Errorf("failed to use timeline: %w", err)
			}
		}

		return nil
	}); err != nil {
		return types.Timeline{}, nil, err
	}

	return timeline, createdMocks, nil
}

func newMock(createMock types.CreateMock, timelineID string) types.Mock {
	mockID, err := uuid.NewV7()
	if err != nil {
		panic(fmt.Sprintf("failed to generate UUID: %v", err))
	}

	return types.Mock{
		ID:              mockID,
		TimelineID:      timelineID,
		CreatedAt:       time.Now().UTC(),
		Options:         createMock.Options,
		Request:         createMock.Request,
		Response:        createMock.Response,
		DynamicResponse: createMock.DynamicResponse,
		Proxy:           createMock.Proxy,
	}
}

func (s *TimelinesService) UpdateTimeline(ctx context.Context, id, name string) (types.Timeline, error) {
	if id == "" {
		return types.Timeline{}, types.ErrTimelineNotFound
	}

	if name == "" {
		return types.Timeline{}, types.ErrInvalidTimelineName
	}

	var updatedTimeline types.Timeline
	if err := s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		timeline, err := s.GetTimeline(ctx, id)
		if err != nil {
			return fmt.Errorf("failed to get timeline %q: %w", id, err)
		}

		timeline.Name = name
		timeline.UpdatedAt = time.Now().UTC()

		if err := s.UpdateTimeline(ctx, timeline); err != nil {
			return fmt.Errorf("failed to update timeline %q: %w", id, err)
		}

		updatedTimeline = timeline
		return nil
	}); err != nil {
		return types.Timeline{}, err
	}

	return updatedTimeline, nil
}

func (s *TimelinesService) UseTimeline(ctx context.Context, id string) error {
	if id == "" {
		return types.ErrTimelineNotFound
	}

	return s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		if err := s.UseTimeline(ctx, id); err != nil {
			return fmt.Errorf("failed to use timeline %q: %w", id, err)
		}

		return nil
	})
}

func (s *TimelinesService) ListTimelines(ctx context.Context) ([]types.TimelineWithState, error) {
	var (
		timelines         []types.Timeline
		currentTimelineID string
	)
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		var err error
		timelines, err = s.ListTimelines(ctx)
		if err != nil {
			return fmt.Errorf("failed to list timelines: %w", err)
		}

		currentTimelineID, err = s.GetCurrentTimelineID(ctx)
		if err != nil && !errors.Is(err, types.ErrNoCurrentTimeline) {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	sort.Slice(timelines, func(i, j int) bool {
		return timelines[i].CreatedAt.Before(timelines[j].CreatedAt)
	})

	timelinesWithState := make([]types.TimelineWithState, 0, len(timelines))
	for _, timeline := range timelines {
		timelinesWithState = append(timelinesWithState, types.TimelineWithState{
			Timeline: timeline,
			State: types.TimelineState{
				IsCurrent: timeline.ID == currentTimelineID,
			},
		})
	}

	return timelinesWithState, nil
}

func (s *TimelinesService) GetCurrentTimeline(ctx context.Context) (types.Timeline, error) {
	var timeline types.Timeline
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		timelineID, err := s.GetCurrentTimelineID(ctx)
		if err != nil {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		timeline, err = s.GetTimeline(ctx, timelineID)
		if err != nil {
			return fmt.Errorf("failed to get timeline %q: %w", timelineID, err)
		}

		return nil
	}); err != nil {
		return types.Timeline{}, err
	}

	return timeline, nil
}

func (s *TimelinesService) GetTimeline(ctx context.Context, id string) (types.Timeline, error) {
	if id == "" {
		return types.Timeline{}, types.ErrTimelineNotFound
	}

	var timeline types.Timeline
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		var err error
		timeline, err = s.GetTimeline(ctx, id)
		if err != nil {
			return fmt.Errorf("failed to get timeline %q: %w", id, err)
		}

		return nil
	}); err != nil {
		return types.Timeline{}, err
	}

	return timeline, nil
}

func (s *TimelinesService) DeleteCurrentTimeline(ctx context.Context) error {
	return s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		timelineID, err := s.GetCurrentTimelineID(ctx)
		if err != nil {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		if err := s.DeleteTimeline(ctx, timelineID); err != nil {
			return fmt.Errorf("failed to delete current timeline: %w", err)
		}

		return nil
	})
}

func (s *TimelinesService) DeleteTimeline(ctx context.Context, id string) error {
	if id == "" {
		return types.ErrTimelineNotFound
	}

	return s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		if err := s.DeleteTimeline(ctx, id); err != nil {
			return fmt.Errorf("failed to delete timeline %q: %w", id, err)
		}

		return nil
	})
}

func (s *TimelinesService) ListCurrentTimelineMocks(ctx context.Context) ([]types.MockWithState, error) {
	var mocks []types.MockWithState
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		timelineID, err := s.GetCurrentTimelineID(ctx)
		if err != nil {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		mocks, err = s.ListTimelineMocks(ctx, timelineID)
		if err != nil {
			return fmt.Errorf("failed to list timeline mocks: %w", err)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return mocks, nil
}

func (s *TimelinesService) ListTimelineMocks(ctx context.Context, timelineID string) ([]types.MockWithState, error) {
	if timelineID == "" {
		return nil, types.ErrTimelineNotFound
	}

	var mocks []types.MockWithState
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		var err error
		mocks, err = s.ListTimelineMocks(ctx, timelineID)
		if err != nil {
			return fmt.Errorf("failed to list timeline mocks: %w", err)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return mocks, nil
}

func (s *TimelinesService) GetCurrentTimelineMock(ctx context.Context, mockID uuid.UUID) (types.MockWithState, error) {
	var mock types.MockWithState
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		timelineID, err := s.GetCurrentTimelineID(ctx)
		if err != nil {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		mock, err = s.GetTimelineMock(ctx, timelineID, mockID)
		if err != nil {
			return fmt.Errorf("failed to get timeline mock %q: %w", mockID, err)
		}

		return nil
	}); err != nil {
		return types.MockWithState{}, err
	}

	return mock, nil
}

func (s *TimelinesService) GetTimelineMock(ctx context.Context, timelineID string, mockID uuid.UUID) (types.MockWithState, error) {
	if timelineID == "" {
		return types.MockWithState{}, types.ErrTimelineNotFound
	}

	if mockID == uuid.Nil {
		return types.MockWithState{}, types.ErrMockNotFound
	}

	var mock types.MockWithState
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		var err error
		mock, err = s.GetTimelineMock(ctx, timelineID, mockID)
		if err != nil {
			return fmt.Errorf("failed to get timeline mock %q: %w", mockID, err)
		}

		return nil
	}); err != nil {
		return types.MockWithState{}, err
	}

	return mock, nil
}

func (s *TimelinesService) PushMocksToCurrentTimeline(ctx context.Context, mocks []types.CreateMock) ([]types.Mock, error) {
	createdMocks := make([]types.Mock, 0, len(mocks))
	if err := s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		timelineID, err := s.GetCurrentTimelineID(ctx)
		if err != nil {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		for _, createMock := range mocks {
			mock := newMock(createMock, timelineID)

			if err := s.PushTimelineMock(ctx, timelineID, mock); err != nil {
				return fmt.Errorf("failed to push mock: %w", err)
			}

			createdMocks = append(createdMocks, mock)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return createdMocks, nil
}

func (s *TimelinesService) PushMocksToTimeline(ctx context.Context, timelineID string, mocks []types.CreateMock) ([]types.Mock, error) {
	if timelineID == "" {
		return nil, types.ErrTimelineNotFound
	}

	createdMocks := make([]types.Mock, 0, len(mocks))
	if err := s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		for _, createMock := range mocks {
			mock := newMock(createMock, timelineID)

			if err := s.PushTimelineMock(ctx, timelineID, mock); err != nil {
				return fmt.Errorf("failed to push mock: %w", err)
			}

			createdMocks = append(createdMocks, mock)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return createdMocks, nil
}

func (s *TimelinesService) GetCurrentTimelineHistory(ctx context.Context) ([]types.HistoryEntry, error) {
	var history []types.HistoryEntry
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		timelineID, err := s.GetCurrentTimelineID(ctx)
		if err != nil {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		history, err = s.GetTimelineHistory(ctx, timelineID)
		if err != nil {
			return fmt.Errorf("failed to get timeline history: %w", err)
		}

		sort.Slice(history, func(i, j int) bool {
			return history[i].Request.Date.After(history[j].Request.Date)
		})

		return nil
	}); err != nil {
		return nil, err
	}

	return history, nil
}

func (s *TimelinesService) GetTimelineHistory(ctx context.Context, timelineID string) ([]types.HistoryEntry, error) {
	if timelineID == "" {
		return nil, types.ErrTimelineNotFound
	}

	var history []types.HistoryEntry
	if err := s.memoryStore.WithROLock(ctx, func(ctx context.Context, s stores.MemoryStoreRO) error {
		var err error
		history, err = s.GetTimelineHistory(ctx, timelineID)
		if err != nil {
			return fmt.Errorf("failed to get timeline history: %w", err)
		}

		sort.Slice(history, func(i, j int) bool {
			return history[i].Request.Date.After(history[j].Request.Date)
		})

		return nil
	}); err != nil {
		return nil, err
	}

	return history, nil
}

func (s *TimelinesService) DeleteCurrentTimelineHistory(ctx context.Context) error {
	return s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		timelineID, err := s.GetCurrentTimelineID(ctx)
		if err != nil {
			return fmt.Errorf("failed to get current timeline: %w", err)
		}

		if err := s.DeleteTimelineHistory(ctx, timelineID); err != nil {
			return fmt.Errorf("failed to delete current timeline history: %w", err)
		}

		return nil
	})
}

func (s *TimelinesService) DeleteTimelineHistory(ctx context.Context, id string) error {
	if id == "" {
		return types.ErrTimelineNotFound
	}

	return s.memoryStore.WithRWLock(ctx, func(ctx context.Context, s stores.MemoryStoreRW) error {
		if err := s.DeleteTimelineHistory(ctx, id); err != nil {
			return fmt.Errorf("failed to delete timeline %q history: %w", id, err)
		}

		return nil
	})
}
