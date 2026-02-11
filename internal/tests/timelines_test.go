//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/smocker-dev/smocker/internal/pkg/assert"
	"github.com/smocker-dev/smocker/internal/types"

	_ "modernc.org/sqlite"
)

func TestListTimelines(t *testing.T) {
	t.Run("no timelines", func(t *testing.T) {
		req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, hostConfig+"/timelines", nil)
		assert.Err(t, err, nil)

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		rawBody, err := io.ReadAll(resp.Body)
		assert.Err(t, err, nil)

		var body types.ListTimelinesResponse
		assert.Err(t, json.Unmarshal(rawBody, &body), nil)

		assert.Equal(t, 0, len(body.Timelines))
	})

	t.Run("multiple timelines", func(t *testing.T) {
		timeline1 := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "Timeline 1"})
		timeline2 := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "Timeline 2"})
		t.Cleanup(func() {
			deleteTimeline(t, context.Background(), timeline1.Timeline.ID)
			deleteTimeline(t, context.Background(), timeline2.Timeline.ID)
		})

		req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, hostConfig+"/timelines", nil)
		assert.Err(t, err, nil)

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		rawBody, err := io.ReadAll(resp.Body)
		assert.Err(t, err, nil)

		var body types.ListTimelinesResponse
		assert.Err(t, json.Unmarshal(rawBody, &body), nil)

		assert.Equal(t, 2, len(body.Timelines))
		assert.Equal(t, timeline1.Timeline.ID, body.Timelines[0].ID)
		assert.Equal(t, timeline1.Timeline.Name, body.Timelines[0].Name)
		assert.Equal(t, timeline1.Timeline.CreatedAt, body.Timelines[0].CreatedAt)
		assert.Equal(t, timeline1.Timeline.UpdatedAt, body.Timelines[0].UpdatedAt)
		assert.Equal(t, timeline2.Timeline.ID, body.Timelines[1].ID)
		assert.Equal(t, timeline2.Timeline.Name, body.Timelines[1].Name)
		assert.Equal(t, timeline2.Timeline.CreatedAt, body.Timelines[1].CreatedAt)
		assert.Equal(t, timeline2.Timeline.UpdatedAt, body.Timelines[1].UpdatedAt)
	})
}

func TestGetTimeline(t *testing.T) {
	t.Run("timeline not found", func(t *testing.T) {
		req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, hostConfig+"/timelines/123", nil)
		assert.Err(t, err, nil)

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("existing timeline", func(t *testing.T) {
		timeline := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "Timeline 1"})
		t.Cleanup(func() {
			deleteTimeline(t, context.Background(), timeline.Timeline.ID)
		})

		req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, hostConfig+"/timelines/"+timeline.Timeline.ID, nil)
		assert.Err(t, err, nil)

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		rawBody, err := io.ReadAll(resp.Body)
		assert.Err(t, err, nil)

		var body types.GetTimelineResponse
		assert.Err(t, json.Unmarshal(rawBody, &body), nil)

		assert.Equal(t, timeline.Timeline.ID, body.Timeline.ID)
		assert.Equal(t, timeline.Timeline.Name, body.Timeline.Name)
		assert.Equal(t, timeline.Timeline.CreatedAt, body.Timeline.CreatedAt)
		assert.Equal(t, timeline.Timeline.UpdatedAt, body.Timeline.UpdatedAt)
	})
}

func TestGetCurrentTimeline(t *testing.T) {
	t.Run("current timeline not found", func(t *testing.T) {
		req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, hostConfig+"/timelines/current", nil)
		assert.Err(t, err, nil)

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("existing current timeline", func(t *testing.T) {
		timeline := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "Timeline 1"})
		t.Cleanup(func() {
			deleteTimeline(t, context.Background(), timeline.Timeline.ID)
		})
		useTimeline(t, t.Context(), timeline.Timeline.ID)

		req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, hostConfig+"/timelines/current", nil)
		assert.Err(t, err, nil)

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		rawBody, err := io.ReadAll(resp.Body)
		assert.Err(t, err, nil)

		var body types.GetTimelineResponse
		assert.Err(t, json.Unmarshal(rawBody, &body), nil)

		assert.Equal(t, timeline.Timeline.ID, body.Timeline.ID)
		assert.Equal(t, timeline.Timeline.Name, body.Timeline.Name)
		assert.Equal(t, timeline.Timeline.CreatedAt, body.Timeline.CreatedAt)
		assert.Equal(t, timeline.Timeline.UpdatedAt, body.Timeline.UpdatedAt)
	})
}

func TestCreateTimeline(t *testing.T) {
	db, err := sql.Open("sqlite", dsn)
	assert.Err(t, err, nil)
	defer db.Close()

	t.Run("success", func(t *testing.T) {
		timeline := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "My timeline"})
		t.Cleanup(func() {
			deleteTimeline(t, context.Background(), timeline.Timeline.ID)
		})

		_, err = uuid.Parse(timeline.Timeline.ID)
		assert.Err(t, err, nil)

		assert.Equal(t, "My timeline", timeline.Timeline.Name)
		assert.Equal(t, 0, len(timeline.Mocks))

		createdTimelineID := timeline.Timeline.ID

		var timelineFromDB types.Timeline
		assert.Err(t, db.QueryRowContext(t.Context(), `
            SELECT data
            FROM timelines
            WHERE id = ?
        `, createdTimelineID).Scan(&timelineFromDB), nil)

		assert.Equal(t, createdTimelineID, timelineFromDB.ID)
		assert.Equal(t, "My timeline", timelineFromDB.Name)
		assert.Equal(t, timeline.Timeline.CreatedAt, timelineFromDB.CreatedAt)
		assert.Equal(t, timeline.Timeline.UpdatedAt, timelineFromDB.UpdatedAt)
	})
}

func TestUpdateTimeline(t *testing.T) {
	db, err := sql.Open("sqlite", dsn)
	assert.Err(t, err, nil)
	defer db.Close()

	t.Run("timeline not found", func(t *testing.T) {
		reqBody, err := json.Marshal(types.UpdateTimelineRequest{Name: "Updated Name"})
		assert.Err(t, err, nil)

		req, err := http.NewRequestWithContext(t.Context(), http.MethodPut, hostConfig+"/timelines/123", bytes.NewReader(reqBody))
		assert.Err(t, err, nil)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("success", func(t *testing.T) {
		timeline := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "Original Name"})
		t.Cleanup(func() {
			deleteTimeline(t, context.Background(), timeline.Timeline.ID)
		})

		updatedTimeline := updateTimeline(t, t.Context(), timeline.Timeline.ID, types.UpdateTimelineRequest{
			Name: "Updated Name",
		})

		assert.Equal(t, timeline.Timeline.ID, updatedTimeline.Timeline.ID)
		assert.Equal(t, "Updated Name", updatedTimeline.Timeline.Name)
		assert.Equal(t, timeline.Timeline.CreatedAt, updatedTimeline.Timeline.CreatedAt)
		assert.True(t, updatedTimeline.Timeline.UpdatedAt.After(timeline.Timeline.UpdatedAt))

		var timelineFromDB types.Timeline
		assert.Err(t, db.QueryRowContext(t.Context(), `
            SELECT data
            FROM timelines
            WHERE id = ?
        `, timeline.Timeline.ID).Scan(&timelineFromDB), nil)

		assert.Equal(t, timeline.Timeline.ID, timelineFromDB.ID)
		assert.Equal(t, "Updated Name", timelineFromDB.Name)
		assert.Equal(t, updatedTimeline.Timeline.CreatedAt, timelineFromDB.CreatedAt)
		assert.Equal(t, updatedTimeline.Timeline.UpdatedAt, timelineFromDB.UpdatedAt)
	})
}

func TestDeleteTimeline(t *testing.T) {
	db, err := sql.Open("sqlite", dsn)
	assert.Err(t, err, nil)
	defer db.Close()

	t.Run("timeline not found", func(t *testing.T) {
		req, err := http.NewRequestWithContext(t.Context(), http.MethodDelete, hostConfig+"/timelines/non-existent-id", nil)
		assert.Err(t, err, nil)

		resp, err := http.DefaultClient.Do(req)
		assert.Err(t, err, nil)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("success", func(t *testing.T) {
		timelineToDelete := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "Timeline to delete"})
		timelineToKeep := createTimeline(t, t.Context(), types.CreateTimelineRequest{Name: "Timeline to keep"})
		t.Cleanup(func() {
			deleteTimeline(t, context.Background(), timelineToKeep.Timeline.ID)
		})

		var timelineToDeleteFromDB types.Timeline
		assert.Err(t, db.QueryRowContext(t.Context(), `
            SELECT data
            FROM timelines
            WHERE id = ?
        `, timelineToDelete.Timeline.ID).Scan(&timelineToDeleteFromDB), nil)

		deleteTimeline(t, t.Context(), timelineToDelete.Timeline.ID)

		assert.Err(t, db.QueryRowContext(t.Context(), `
            SELECT data
            FROM timelines
            WHERE id = ?
        `, timelineToDelete.Timeline.ID).Scan(&timelineToDeleteFromDB), sql.ErrNoRows)

		var timelineToKeepFromDB types.Timeline
		assert.Err(t, db.QueryRowContext(t.Context(), `
            SELECT data
            FROM timelines
            WHERE id = ?
        `, timelineToKeep.Timeline.ID).Scan(&timelineToKeepFromDB), nil)
	})
}
