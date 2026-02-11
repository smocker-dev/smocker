package stores

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/pressly/goose/v3"
	"github.com/smocker-dev/smocker/internal/types"
)

//go:embed migrations/sqlite/*.sql
var sqliteMigrations embed.FS

type sqliteStore struct {
	db *sql.DB
}

var _ PersistentStore = (*sqliteStore)(nil)

func NewSQLiteStore(db *sql.DB) (*sqliteStore, error) {
	goose.SetBaseFS(sqliteMigrations)

	if err := goose.SetDialect("sqlite"); err != nil {
		return nil, fmt.Errorf("failed to set SQLite dialect: %w", err)
	}

	if err := goose.Up(db, "migrations/sqlite"); err != nil {
		return nil, fmt.Errorf("failed to migrate SQLite schema: %w", err)
	}

	return &sqliteStore{db: db}, nil
}

func (s *sqliteStore) SaveCurrentTimeline(ctx context.Context, id *string) error {
	if _, err := s.db.ExecContext(ctx, `
        UPDATE current_timeline
        SET timeline_id = ?
        WHERE id = 1
    `, id); err != nil {
		return fmt.Errorf("failed to set current timeline: %w", err)
	}

	return nil
}

func (s *sqliteStore) LoadCurrentTimeline(ctx context.Context) (*string, error) {
	var id *string
	if err := s.db.QueryRowContext(ctx, `
        SELECT timeline_id
        FROM current_timeline
        WHERE id = 1
    `).Scan(&id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}

		return nil, fmt.Errorf("failed to load current timeline: %w", err)
	}

	return id, nil
}

func (s *sqliteStore) SaveTimeline(ctx context.Context, id string, timeline types.Timeline) error {
	if _, err := s.db.ExecContext(ctx, `
        INSERT INTO timelines (id, data)
        VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET
            data = excluded.data
    `, id, timeline); err != nil {
		return fmt.Errorf("failed to upsert timeline: %w", err)
	}

	return nil
}

func (s *sqliteStore) LoadTimelines(ctx context.Context) (map[string]types.Timeline, error) {
	rows, err := s.db.QueryContext(ctx, `
        SELECT data
        FROM timelines
    `)
	if err != nil {
		return nil, fmt.Errorf("failed to load timelines: %w", err)
	}
	defer rows.Close()

	timelines := map[string]types.Timeline{}
	for rows.Next() {
		var timeline types.Timeline
		if err := rows.Scan(&timeline); err != nil {
			return nil, fmt.Errorf("failed to scan timeline: %w", err)
		}

		timelines[timeline.ID] = timeline
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan timelines: %w", err)
	}

	return timelines, nil
}

func (s *sqliteStore) DeleteTimeline(ctx context.Context, id string) error {
	if _, err := s.db.ExecContext(ctx, `
        DELETE FROM timelines
        WHERE id = ?
    `, id); err != nil {
		return fmt.Errorf("failed to delete timeline: %w", err)
	}

	return nil
}

func (s *sqliteStore) SaveMock(ctx context.Context, id uuid.UUID, timelineID string, position int, mock types.Mock) error {
	if _, err := s.db.ExecContext(ctx, `
            INSERT INTO mocks (id, timeline_id, position, data)
            VALUES (?, ?, ?, ?)
        `, id.String(), timelineID, position, mock); err != nil {
		return fmt.Errorf("failed to save mock: %w", err)
	}

	return nil
}

func (s *sqliteStore) LoadMocks(ctx context.Context) (map[string][]types.Mock, error) {
	rows, err := s.db.QueryContext(ctx, `
        SELECT timeline_id, data
        FROM mocks
        ORDER BY timeline_id, position
    `)
	if err != nil {
		return nil, fmt.Errorf("failed to load mocks: %w", err)
	}
	defer rows.Close()

	mocks := map[string][]types.Mock{}
	for rows.Next() {
		var timelineID string
		var mock types.Mock
		if err := rows.Scan(&timelineID, &mock); err != nil {
			return nil, fmt.Errorf("failed to scan mock: %w", err)
		}

		mocks[timelineID] = append(mocks[timelineID], mock)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan mocks: %w", err)
	}

	return mocks, nil
}

func (s *sqliteStore) SaveMockTimesCalled(ctx context.Context, id uuid.UUID, timesCalled int) error {
	result, err := s.db.ExecContext(ctx, `
        UPDATE mocks
        SET times_called = ?
        WHERE id = ?
    `, timesCalled, id.String())
	if err != nil {
		return fmt.Errorf("failed to save mock times called: %w", err)
	}

	if rowsAffected, err := result.RowsAffected(); err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	} else if rowsAffected == 0 {
		return types.ErrMockNotFound
	}

	return nil
}

func (s *sqliteStore) LoadMocksTimesCalled(ctx context.Context) (map[string]map[uuid.UUID]int, error) {
	rows, err := s.db.QueryContext(ctx, `
        SELECT id, timeline_id, times_called
        FROM mocks
    `)
	if err != nil {
		return nil, fmt.Errorf("failed to load mocks times called: %w", err)
	}
	defer rows.Close()

	mocksTimesCalled := map[string]map[uuid.UUID]int{}
	for rows.Next() {
		var id uuid.UUID
		var timelineID string
		var timesCalled int
		if err := rows.Scan(&id, &timelineID, &timesCalled); err != nil {
			return nil, fmt.Errorf("failed to scan mock times called: %w", err)
		}

		if mocksTimesCalled[timelineID] == nil {
			mocksTimesCalled[timelineID] = map[uuid.UUID]int{}
		}
		mocksTimesCalled[timelineID][id] = timesCalled
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan mocks times called: %w", err)
	}

	return mocksTimesCalled, nil
}

func (s *sqliteStore) DeleteMocksTimesCalled(ctx context.Context, timelineID string) error {
	if _, err := s.db.ExecContext(ctx, `
        UPDATE mocks
        SET times_called = 0
        WHERE timeline_id = ?
    `, timelineID); err != nil {
		return fmt.Errorf("failed to delete mocks times called: %w", err)
	}

	return nil
}

func (s *sqliteStore) SaveHistoryEntry(ctx context.Context, id uuid.UUID, timelineID string, position int, history types.HistoryEntry) error {
	if _, err := s.db.ExecContext(ctx, `
        INSERT INTO history (id, timeline_id, position, data)
        VALUES (?, ?, ?, ?)
    `, id.String(), timelineID, position, history); err != nil {
		return fmt.Errorf("failed to save history entry: %w", err)
	}

	return nil
}

func (s *sqliteStore) LoadHistoryEntries(ctx context.Context) (map[string][]types.HistoryEntry, error) {
	rows, err := s.db.QueryContext(ctx, `
        SELECT timeline_id, data
        FROM history
        ORDER BY timeline_id, position
    `)
	if err != nil {
		return nil, fmt.Errorf("failed to load history entries: %w", err)
	}
	defer rows.Close()

	historyEntries := map[string][]types.HistoryEntry{}
	for rows.Next() {
		var timelineID string
		var historyEntry types.HistoryEntry
		if err := rows.Scan(&timelineID, &historyEntry); err != nil {
			return nil, fmt.Errorf("failed to scan history entry: %w", err)
		}

		historyEntries[timelineID] = append(historyEntries[timelineID], historyEntry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to scan history entries: %w", err)
	}

	return historyEntries, nil
}

func (s *sqliteStore) DeleteHistoryEntries(ctx context.Context, timelineID string) error {
	if _, err := s.db.ExecContext(ctx, `
        DELETE FROM history
        WHERE timeline_id = ?
    `, timelineID); err != nil {
		return fmt.Errorf("failed to delete history entries: %w", err)
	}

	return nil
}
