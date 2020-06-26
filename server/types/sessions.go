package types

import (
	"fmt"
	"time"
)

var SessionNotFound = fmt.Errorf("session not found")

type Sessions []*Session

func (s Sessions) Clone() Sessions {
	sessions := make(Sessions, 0, len(s))
	for _, session := range s {
		sessions = append(sessions, session.Clone())
	}
	return sessions
}

func (s Sessions) Summarize() []SessionSummary {
	sessions := make([]SessionSummary, 0, len(s))
	for _, session := range s {
		sessions = append(sessions, session.Summarize())
	}
	return sessions
}

type Session struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Date    time.Time `json:"date"`
	History History   `json:"history"`
	Mocks   Mocks     `json:"mocks"`
}

func (s *Session) Clone() *Session {
	return &Session{
		ID:      s.ID,
		Name:    s.Name,
		Date:    s.Date,
		History: s.History.Clone(),
		Mocks:   s.Mocks.Clone(),
	}
}

func (s Session) Summarize() SessionSummary {
	return SessionSummary(s)
}

type SessionSummary struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Date    time.Time `json:"date"`
	History History   `json:"-" yaml:"-"`
	Mocks   Mocks     `json:"-" yaml:"-"`
}

type VerifyResult struct {
	Mocks struct {
		Verified bool   `json:"verified"`
		AllUsed  bool   `json:"all_used"`
		Message  string `json:"message"`
		Failures Mocks  `json:"failures,omitempty"`
		Unused   Mocks  `json:"unused,omitempty"`
	} `json:"mocks"`
	History struct {
		Verified bool    `json:"verified"`
		Message  string  `json:"message"`
		Failures History `json:"failures,omitempty"`
	} `json:"history"`
}
