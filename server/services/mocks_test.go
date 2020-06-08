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
		t.Fatal("unable to retrieve history", err)
	}
	if len(history) > 1 {
		t.Fatalf("too much entries in history: %v should be 1", len(history))
	}
	if history[0].MockID != "456" {
		t.Fatalf("wrong entry in history: entry.MockID %v should be 456", history[0].MockID)
	}
}
