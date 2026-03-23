import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import Database from 'better-sqlite3'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'oraku.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
