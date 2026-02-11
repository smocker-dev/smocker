-- +goose Up
CREATE TABLE IF NOT EXISTS timelines (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS mocks (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    data JSONB NOT NULL,
    times_called INTEGER NOT NULL DEFAULT 0,
    UNIQUE (timeline_id, position),
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    data JSONB NOT NULL,
    UNIQUE (timeline_id, position),
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS current_timeline (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    timeline_id TEXT,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE SET NULL
);

INSERT INTO current_timeline (id, timeline_id)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
