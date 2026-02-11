package types

import (
	"errors"
	"fmt"
)

// StatusSmockerError is an extended HTTP status code used to represent a Smocker error.
const StatusSmockerError = 600

type CreateTimelineRequest struct {
	ID    string       `json:"id" yaml:"id"`
	Name  string       `json:"name" yaml:"name"`
	Mocks []CreateMock `json:"mocks" yaml:"mocks"`
}

type CreateTimelineResponse struct {
	Timeline Timeline `json:"timeline"`
	Mocks    []Mock   `json:"mocks"`
}

type ListTimelinesResponse struct {
	Timelines []TimelineWithState `json:"timelines"`
}

type GetTimelineResponse struct {
	Timeline Timeline `json:"timeline"`
}

type UpdateTimelineRequest struct {
	Name string `json:"name"`
}

type UpdateTimelineResponse struct {
	Timeline Timeline `json:"timeline"`
}

type CreateMocks []CreateMock

func (m CreateMocks) Validate() error {
	var errs []error
	for i, mock := range m {
		if err := mock.Validate(); err != nil {
			errs = append(errs, fmt.Errorf("failed to validate mock at index %d: %w", i, err))
		}
	}

	return errors.Join(errs...)
}

type CreateMock struct {
	Options         MockOptions          `json:"options" yaml:"options"`
	Request         MockRequest          `json:"request" yaml:"request"`
	Response        *MockResponse        `json:"response,omitempty" yaml:"response,omitempty"`
	DynamicResponse *MockDynamicResponse `json:"dynamic_response,omitempty" yaml:"dynamic_response,omitempty"`
	Proxy           *MockProxy           `json:"proxy,omitempty" yaml:"proxy,omitempty"`
}

func (m *CreateMock) Validate() error {
	if m.Response == nil && m.DynamicResponse == nil && m.Proxy == nil {
		return errors.New("the route must define at least a response, a dynamic response or a proxy")
	}

	if m.Response != nil && (m.DynamicResponse != nil || m.Proxy != nil) ||
		(m.DynamicResponse != nil && m.Proxy != nil) {
		return errors.New("the route must define either a response, a dynamic response or a proxy, not multiple of them")
	}

	if m.DynamicResponse != nil && !m.DynamicResponse.Engine.IsValid() {
		return fmt.Errorf("the dynamic response engine must be one of the following: %v", TemplateEngines)
	}

	if m.Options.Times != nil && *m.Options.Times < 0 {
		return errors.New("the \"times\" option must be greater than or equal to 0")
	}

	return nil
}

// APIError represents an RFC 7807 error response
type APIError struct {
	Type     string         `json:"type"`
	Title    string         `json:"title,omitempty"`
	Status   int            `json:"status,omitempty"`
	Detail   string         `json:"detail,omitempty"`
	Instance string         `json:"instance,omitempty"`
	Extra    map[string]any `json:"extra,omitempty"`
}
