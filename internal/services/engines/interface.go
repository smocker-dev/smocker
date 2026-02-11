package engines

import (
	"context"

	"github.com/smocker-dev/smocker/internal/types"
)

type Engine interface {
	Execute(ctx context.Context, request types.Request, script string) (types.MockResponse, error)
}
