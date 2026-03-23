import { db } from './connection'

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS findings (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      detector    TEXT NOT NULL,
      severity    TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
      message     TEXT NOT NULL,
      evidence    TEXT,
      detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS finding_notifications (
      notification_id TEXT NOT NULL REFERENCES notifications(id),
      finding_id      TEXT NOT NULL REFERENCES findings(id),
      PRIMARY KEY (notification_id, finding_id)
    );
  `)
}
