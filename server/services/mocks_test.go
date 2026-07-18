package services

import (
	"testing"

	"github.com/smocker-dev/smocker/server/types"
	"gopkg.in/yaml.v3"
)

func mockFromYAML(t *testing.T, s string) *types.Mock {
	t.Helper()
	var m types.Mock
	if err := yaml.Unmarshal([]byte(s), &m); err != nil {
		t.Fatalf("invalid mock yaml: %v", err)
	}
	return &m
}

// TestUpdateAndDeleteMock covers the happy path for the edit/delete feature (issues #299/#266/#303)
// while the session history is still empty.
func TestUpdateAndDeleteMock(t *testing.T) {
	svc := NewMocks(nil, 0, NewPersistence(""))
	session := svc.NewSession("edit")

	added, err := svc.AddMock(
		session.ID,
		mockFromYAML(t, "request: {path: /a}\nresponse: {status: 200}"),
	)
	if err != nil {
		t.Fatal(err)
	}
	id := added.State.ID

	// Update replaces the definition but keeps the identity (ID + creation date).
	updated, err := svc.UpdateMock(
		session.ID, id,
		mockFromYAML(t, "request: {path: /b}\nresponse: {status: 201}"),
	)
	if err != nil {
		t.Fatalf("UpdateMock: %v", err)
	}
	if updated.State.ID != id {
		t.Errorf("update changed the mock ID: got %q want %q", updated.State.ID, id)
	}
	if updated.State.CreationDate != added.State.CreationDate {
		t.Error("update changed the creation date")
	}
	if updated.Response.Status != 201 {
		t.Errorf("update did not apply the new definition: status %d", updated.Response.Status)
	}

	// The change is visible through the session.
	mocks, _ := svc.GetMocks(session.ID)
	if len(mocks) != 1 || mocks[0].Response.Status != 201 {
		t.Fatalf("session does not reflect the update: %+v", mocks)
	}

	// Delete removes it.
	if err := svc.DeleteMock(session.ID, id); err != nil {
		t.Fatalf("DeleteMock: %v", err)
	}
	if mocks, _ := svc.GetMocks(session.ID); len(mocks) != 0 {
		t.Fatalf("mock still present after delete: %+v", mocks)
	}

	// Deleting/updating an unknown ID reports MockNotFound.
	if err := svc.DeleteMock(session.ID, "nope"); err != types.MockNotFound {
		t.Errorf("delete unknown: got %v want MockNotFound", err)
	}
}

// TestDeleteSession covers removing a single session and the not-found path.
func TestDeleteSession(t *testing.T) {
	svc := NewMocks(nil, 0, NewPersistence(""))
	keep := svc.NewSession("keep")
	drop := svc.NewSession("drop")

	if err := svc.DeleteSession(drop.ID); err != nil {
		t.Fatalf("DeleteSession: %v", err)
	}
	sessions := svc.GetSessions()
	if len(sessions) != 1 || sessions[0].ID != keep.ID {
		t.Fatalf("expected only %q to remain, got %+v", keep.ID, sessions)
	}

	// Deleting an unknown (or empty) session reports SessionNotFound.
	if err := svc.DeleteSession(drop.ID); err != types.SessionNotFound {
		t.Errorf("delete already-removed: got %v want SessionNotFound", err)
	}
	if err := svc.DeleteSession(""); err != types.SessionNotFound {
		t.Errorf("delete empty id: got %v want SessionNotFound", err)
	}
}

// TestEditForbiddenOnceCalled locks the maintainers' position: once the session has received calls,
// mocks are append-only (history entries are tied to the mock that answered them).
func TestEditForbiddenOnceCalled(t *testing.T) {
	svc := NewMocks(nil, 0, NewPersistence(""))
	session := svc.NewSession("called")
	added, err := svc.AddMock(
		session.ID,
		mockFromYAML(t, "request: {path: /a}\nresponse: {status: 200}"),
	)
	if err != nil {
		t.Fatal(err)
	}

	// A call happened → history is no longer empty.
	if _, err := svc.AddHistoryEntry(session.ID, &types.Entry{
		Request:  types.Request{Path: "/a", Method: "GET"},
		Response: types.Response{Status: 200},
	}); err != nil {
		t.Fatal(err)
	}

	if _, err := svc.UpdateMock(
		session.ID, added.State.ID,
		mockFromYAML(t, "request: {path: /b}\nresponse: {status: 201}"),
	); err != types.MockEditForbidden {
		t.Errorf("UpdateMock after a call: got %v want MockEditForbidden", err)
	}
	if err := svc.DeleteMock(session.ID, added.State.ID); err != types.MockEditForbidden {
		t.Errorf("DeleteMock after a call: got %v want MockEditForbidden", err)
	}

	// Simulate the mock having answered a call.
	added.State.TimesCount = 3

	// Clearing the history keeps the mocks but makes them editable again, and resets their
	// call counters so the state stays consistent with the now-empty history.
	if err := svc.ClearHistory(session.ID); err != nil {
		t.Fatalf("ClearHistory: %v", err)
	}
	if h, _ := svc.GetHistory(session.ID); len(h) != 0 {
		t.Fatalf("history not cleared: %+v", h)
	}
	mocksAfter, _ := svc.GetMocks(session.ID)
	if len(mocksAfter) != 1 {
		t.Fatalf("ClearHistory dropped the mocks: %+v", mocksAfter)
	}
	if mocksAfter[0].State.TimesCount != 0 {
		t.Errorf("ClearHistory did not reset times_count: %d", mocksAfter[0].State.TimesCount)
	}
	if _, err := svc.UpdateMock(
		session.ID, added.State.ID,
		mockFromYAML(t, "request: {path: /c}\nresponse: {status: 200}"),
	); err != nil {
		t.Errorf("UpdateMock after ClearHistory should succeed, got %v", err)
	}
}
