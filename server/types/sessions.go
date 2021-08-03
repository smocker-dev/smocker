package types

import (
	"fmt"
	"time"
)

var SessionNotFound = fmt.Errorf("session not found")

type Sessions []*Session
type Session struct {
	ID   string    `json:"id"`
	Name string    `json:"name"`
	Date time.Time `json:"date"`
}

type SessionDump struct {
	Session
	History History `json:"history"`
	Mocks   Mocks   `json:"mocks"`
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
