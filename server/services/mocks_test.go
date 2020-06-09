package services

import (
	"testing"

	"github.com/Thiht/smocker/server/config"
	"github.com/Thiht/smocker/server/types"
)

func Test_Mockserver_AddHistoryEntry_HistoryMaxRetention(t *testing.T) {
	mockserver := NewMocks(config.Config{
		HistoryMaxRetention: 1,
	})

	sessionID := mockserver.NewSession("").ID
	_, _ = mockserver.AddHistoryEntry(sessionID, &types.Entry{
		MockID: "123",
	})
	_, _ = mockserver.AddHistoryEntry(sessionID, &types.Entry{
		MockID: "456",
	})
	history, err := mockserver.GetHistory(sessionID)
	if err != nil {
		t.Fatal("unable to retrieve history:", err)
	}
	if len(history) > 1 {
		t.Fatalf("too much entries in history: %v should be 1", len(history))
	}
	if history[0].MockID != "456" {
		t.Fatalf("wrong entry in history: entry.MockID %v should be 456", history[0].MockID)
	}
}

func Test_Mockserver_LockMocks(t *testing.T) {
	mockserver := NewMocks(config.Config{})

	sessionID := mockserver.GetLastSession().ID
	mock := &types.Mock{
		Request: types.MockRequest{
			Method: types.StringMatcher{
				Matcher: "ShouldEqual",
				Value:   "GET",
			},
			Path: types.StringMatcher{
				Matcher: "ShouldMatch",
				Value:   ".*",
			},
		},
		Response: &types.MockResponse{
			Status: 200,
		},
	}
	_, _ = mockserver.AddMock(sessionID, mock)
	_, _ = mockserver.AddMock(sessionID, &types.Mock{
		Request: types.MockRequest{
			Method: types.StringMatcher{
				Matcher: "ShouldEqual",
				Value:   "POST",
			},
			Path: types.StringMatcher{
				Matcher: "ShouldMatch",
				Value:   ".*",
			},
		},
		Response: &types.MockResponse{
			Status: 500,
		},
	})

	mockID := mock.State.ID

	_ = mockserver.LockMocks([]string{mockID})
	mockserver.Reset()
	sessionID = mockserver.GetLastSession().ID
	mocks, err := mockserver.GetMocks(sessionID)
	if err != nil {
		t.Fatal("unable to retrieve mocks:", err)
	}
	if len(mocks) != 1 {
		t.Fatalf("wrong number of mocks after reset: %v should be 1", len(mocks))
	}
	if mocks[0].State.ID != mockID {
		t.Fatalf("wrong mock ID of after reset: %s should be %s", mocks[0].State.ID, mockID)
	}

	sessionID = mockserver.NewSession("").ID
	mocks, err = mockserver.GetMocks(sessionID)
	if err != nil {
		t.Fatal("unable to retrieve mocks:", err)
	}
	if len(mocks) != 1 {
		t.Fatalf("wrong number of mocks after reset: %v should be 1", len(mocks))
	}
	if mocks[0].State.ID != mockID {
		t.Fatalf("wrong mock ID of after reset: %s should be %s", mocks[0].State.ID, mockID)
	}

	_ = mockserver.UnlockMocks([]string{mockID})
	mockserver.Reset()
	sessionID = mockserver.GetLastSession().ID
	mocks, err = mockserver.GetMocks(sessionID)
	if err != nil {
		t.Fatal("unable to retrieve mocks:", err)
	}
	if len(mocks) > 0 {
		t.Fatalf("wrong number of mocks after reset: %v should be 0", len(mocks))
	}
}
