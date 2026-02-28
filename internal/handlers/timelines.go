package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/smocker-dev/smocker/internal/handlers/bind"
	"github.com/smocker-dev/smocker/internal/handlers/render"
	"github.com/smocker-dev/smocker/internal/services"
	"github.com/smocker-dev/smocker/internal/types"
)

type TimelinesHandler struct {
	timelinesService *services.TimelinesService
}

func NewTimelinesHandler(timelinesService *services.TimelinesService) *TimelinesHandler {
	return &TimelinesHandler{
		timelinesService: timelinesService,
	}
}

func (h *TimelinesHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func (h *TimelinesHandler) ExportTimelines(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func (h *TimelinesHandler) ImportTimelines(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func (h *TimelinesHandler) CreateTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	overwrite, _ := strconv.ParseBool(r.URL.Query().Get("overwrite"))
	use, _ := strconv.ParseBool(r.URL.Query().Get("use"))

	var req types.CreateTimelineRequest
	if err := bind.Bind(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, err)
		return
	}

	if req.ID == "current" {
		render.Error(w, http.StatusBadRequest, errors.New("timeline ID cannot be \"current\""))
		return
	}

	if overwrite && req.ID == "" {
		render.Error(w, http.StatusBadRequest, errors.New("timeline ID must be provided when overwrite is true"))
		return
	}

	if req.Mocks != nil {
		if err := types.CreateMocks(req.Mocks).Validate(); err != nil {
			render.Error(w, http.StatusBadRequest, err)
			return
		}
	}

	timeline, mocks, err := h.timelinesService.CreateTimeline(
		ctx,
		strings.TrimSpace(req.ID), strings.TrimSpace(req.Name), req.Mocks,
		overwrite, use,
	)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineAlreadyExists):
			render.Error(w, http.StatusConflict, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusCreated, types.CreateTimelineResponse{
		Timeline: timeline,
		Mocks:    mocks,
	})
}

func (h *TimelinesHandler) UpdateTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	var req types.UpdateTimelineRequest
	if err := bind.Bind(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, err)
		return
	}

	timeline, err := h.timelinesService.UpdateTimeline(ctx, timelineID, strings.TrimSpace(req.Name))
	if err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		case errors.Is(err, types.ErrInvalidTimelineName):
			render.Error(w, http.StatusBadRequest, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, types.UpdateTimelineResponse{
		Timeline: timeline,
	})
}

func (h *TimelinesHandler) UseTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	if err := h.timelinesService.UseTimeline(ctx, timelineID); err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TimelinesHandler) ListTimelines(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelines, err := h.timelinesService.ListTimelines(ctx)
	if err != nil {
		render.Error(w, http.StatusInternalServerError, err)
		return
	}

	render.JSON(w, http.StatusOK, types.ListTimelinesResponse{
		Timelines: timelines,
	})
}

func (h *TimelinesHandler) GetCurrentTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timeline, err := h.timelinesService.GetCurrentTimeline(ctx)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrNoCurrentTimeline):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, struct {
		Timeline types.Timeline `json:"timeline"`
	}{
		Timeline: timeline,
	})
}

func (h *TimelinesHandler) GetTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	timeline, err := h.timelinesService.GetTimeline(ctx, timelineID)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, types.GetTimelineResponse{
		Timeline: timeline,
	})
}

func (h *TimelinesHandler) DeleteCurrentTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if err := h.timelinesService.DeleteCurrentTimeline(ctx); err != nil {
		switch {
		case errors.Is(err, types.ErrNoCurrentTimeline):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TimelinesHandler) DeleteTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	if err := h.timelinesService.DeleteTimeline(ctx, timelineID); err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TimelinesHandler) ListCurrentTimelineMocks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	mocks, err := h.timelinesService.ListCurrentTimelineMocks(ctx)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrNoCurrentTimeline):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, struct {
		Mocks []types.MockWithState `json:"mocks"`
	}{
		Mocks: mocks,
	})
}

func (h *TimelinesHandler) ListTimelineMocks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	mocks, err := h.timelinesService.ListTimelineMocks(ctx, timelineID)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, struct {
		Mocks []types.MockWithState `json:"mocks"`
	}{
		Mocks: mocks,
	})
}

func (h *TimelinesHandler) GetCurrentTimelineMock(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	mockID, err := uuid.Parse(strings.TrimSpace(r.PathValue("mockID")))
	if err != nil {
		render.Error(w, http.StatusBadRequest, fmt.Errorf("invalid mock ID: %w", err))
		return
	}

	mock, err := h.timelinesService.GetCurrentTimelineMock(ctx, mockID)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrNoCurrentTimeline):
			render.Error(w, http.StatusNotFound, err)
			return

		case errors.Is(err, types.ErrMockNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, struct {
		Mock types.MockWithState `json:"mock"`
	}{
		Mock: mock,
	})
}

func (h *TimelinesHandler) GetTimelineMock(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))
	mockID, err := uuid.Parse(strings.TrimSpace(r.PathValue("mockID")))
	if err != nil {
		render.Error(w, http.StatusBadRequest, fmt.Errorf("invalid mock ID: %w", err))
		return
	}

	mock, err := h.timelinesService.GetTimelineMock(ctx, timelineID, mockID)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		case errors.Is(err, types.ErrMockNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, struct {
		Mock types.MockWithState `json:"mock"`
	}{
		Mock: mock,
	})
}

func (h *TimelinesHandler) PushMocksToCurrentTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// This endpoint defaults to YAML if no Content-Type is provided
	if r.Header.Get("Content-Type") == "" {
		r.Header.Set("Content-Type", "application/yaml")
	}

	var req struct {
		Mocks []types.CreateMock `json:"mocks" yaml:"mocks"`
	}
	if err := bind.Bind(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, err)
		return
	}

	if req.Mocks != nil {
		if err := types.CreateMocks(req.Mocks).Validate(); err != nil {
			render.Error(w, http.StatusBadRequest, err)
			return
		}
	}

	createdMocks, err := h.timelinesService.PushMocksToCurrentTimeline(ctx, req.Mocks)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrNoCurrentTimeline):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusCreated, struct {
		Mocks []types.Mock `json:"mocks"`
	}{
		Mocks: createdMocks,
	})
}

func (h *TimelinesHandler) PushMocksToTimeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// This endpoint defaults to YAML if no Content-Type is provided
	if r.Header.Get("Content-Type") == "" {
		r.Header.Set("Content-Type", "application/yaml")
	}

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	var req struct {
		Mocks []types.CreateMock `json:"mocks" yaml:"mocks"`
	}
	if err := bind.Bind(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, err)
		return
	}

	if req.Mocks != nil {
		if err := types.CreateMocks(req.Mocks).Validate(); err != nil {
			render.Error(w, http.StatusBadRequest, err)
			return
		}
	}

	createdMocks, err := h.timelinesService.PushMocksToTimeline(ctx, timelineID, req.Mocks)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusCreated, struct {
		Mocks []types.Mock `json:"mocks"`
	}{
		Mocks: createdMocks,
	})
}

func (h *TimelinesHandler) GetCurrentTimelineHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	history, err := h.timelinesService.GetCurrentTimelineHistory(ctx)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrNoCurrentTimeline):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, struct {
		History []types.HistoryEntry `json:"history"`
	}{
		History: history,
	})
}

func (h *TimelinesHandler) GetTimelineHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	history, err := h.timelinesService.GetTimelineHistory(ctx, timelineID)
	if err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	render.JSON(w, http.StatusOK, struct {
		History []types.HistoryEntry `json:"history"`
	}{
		History: history,
	})
}

func (h *TimelinesHandler) DeleteCurrentTimelineHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if err := h.timelinesService.DeleteCurrentTimelineHistory(ctx); err != nil {
		switch {
		case errors.Is(err, types.ErrNoCurrentTimeline):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TimelinesHandler) DeleteTimelineHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	timelineID := strings.TrimSpace(r.PathValue("timelineID"))

	if err := h.timelinesService.DeleteTimelineHistory(ctx, timelineID); err != nil {
		switch {
		case errors.Is(err, types.ErrTimelineNotFound):
			render.Error(w, http.StatusNotFound, err)
			return

		default:
			render.Error(w, http.StatusInternalServerError, err)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}
