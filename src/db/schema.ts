import { db } from './connection'

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS findings (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      detector    TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      message     TEXT NOT NULL,
      evidence    TEXT NOT NULL DEFAULT '{}',
      detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL,
      external_ref   TEXT,
      detector       TEXT,
      message        TEXT NOT NULL,
      type           TEXT NOT NULL DEFAULT 'insight',
      scheduled_at   TEXT NOT NULL,
      generated_date TEXT NOT NULL DEFAULT (date('now')),
      created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS finding_notifications (
      notification_id TEXT NOT NULL REFERENCES notifications(id),
      finding_id      TEXT NOT NULL REFERENCES findings(id),
      PRIMARY KEY (notification_id, finding_id)
    );
  `)

  // migrations for existing DBs
  try {
    db.exec(`ALTER TABLE findings RENAME COLUMN severity TO notification_type`)
  } catch { /* already migrated or column doesn't exist */ }

  try {
    db.exec(`UPDATE findings SET evidence = '{}' WHERE evidence IS NULL`)
  } catch { /* no nulls to fix */ }

  // migration: add generated_date to existing notifications tables
  try {
    db.exec(`ALTER TABLE notifications ADD COLUMN generated_date TEXT NOT NULL DEFAULT (date('now'))`)
  } catch { /* column already exists */ }

  try {
    db.exec(`ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'insight'`)
  } catch { /* column already exists */ }

  try {
    db.exec(`ALTER TABLE notifications ADD COLUMN scheduled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`)
  } catch { /* column already exists */ }

  try {
    db.exec(`ALTER TABLE notifications ADD COLUMN delivered_at TEXT`)
  } catch { /* column already exists */ }

  try {
    db.exec(`ALTER TABLE notifications ADD COLUMN external_ref TEXT`)
  } catch { /* column already exists */ }

  try {
    db.exec(`ALTER TABLE notifications ADD COLUMN detector TEXT`)
  } catch { /* column already exists */ }

  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_notif_per_day ON notifications(detector, external_ref, generated_date)`)
  } catch { /* index already exists */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_profiles (
      external_ref      TEXT PRIMARY KEY,
      organization_id   TEXT NOT NULL DEFAULT '',
      organization_name TEXT NOT NULL DEFAULT '',
      top_categories    TEXT NOT NULL DEFAULT '[]',
      top_subcategories TEXT NOT NULL DEFAULT '[]',
      daily_pattern     TEXT NOT NULL DEFAULT '{}',
      last_updated      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}
