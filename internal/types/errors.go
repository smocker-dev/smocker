package types

import "errors"

var (
	ErrTimelineNotFound      = errors.New("timeline not found")
	ErrTimelineAlreadyExists = errors.New("timeline already exists")
	ErrInvalidTimelineName   = errors.New("invalid timeline name")
	ErrNoCurrentTimeline     = errors.New("no current timeline")
	ErrMockNotFound          = errors.New("mock not found")
	ErrNoMatchingMock        = errors.New("no matching mock")
)

type SmockerError struct {
	Err          error
	WrappedError error
	Extra        map[string]any
}

func (e *SmockerError) Error() string {
	return e.Err.Error()
}

func (e *SmockerError) Is(target error) bool {
	return errors.Is(e.Err, target)
}

func (e *SmockerError) Unwrap() error {
	return e.WrappedError
}

type stdError interface {
	error
	Unwrap() error
	Is(error) bool
}

var _ stdError = &SmockerError{}
