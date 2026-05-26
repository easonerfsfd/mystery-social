import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomAlias } from '../../shared/aliases.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../server/data')
const DB_PATH = join(DATA_DIR, 'db.sqlite')

mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(join(DATA_DIR, 'uploads'), { recursive: true })

const db = new DatabaseSync(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS question (
    id         INTEGER PRIMARY KEY,
    text       TEXT NOT NULL,
    changed_by INTEGER DEFAULT 0,
    author_alias TEXT
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    alias      TEXT,
    text       TEXT NOT NULL,
    mood       TEXT,
    image_url  TEXT,
    likes      INTEGER DEFAULT 0,
    revealed   INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS users (
    session_id TEXT PRIMARY KEY,
    alias      TEXT DEFAULT '神秘用户',
    bio        TEXT DEFAULT '',
    avatar_url TEXT,
    revealed   INTEGER DEFAULT 0,
    answers    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`)

// 初始问题（如果还没有）
const existing = db.prepare('SELECT id FROM question WHERE id = 1').get()
if (!existing) {
  db.prepare(`INSERT INTO question (id, text, changed_by, author_alias) VALUES (1, ?, 0, ?)`).run(
    '"你有没有一种累，\n是解释了\n也没人懂的那种？"',
    randomAlias()
  )
}

export function getOrCreateUser(sessionId) {
  let user = db.prepare('SELECT * FROM users WHERE session_id = ?').get(sessionId)
  if (!user) {
    const alias = randomAlias()
    db.prepare(`
      INSERT INTO users (session_id, alias) VALUES (?, ?)
    `).run(sessionId, alias)
    user = db.prepare('SELECT * FROM users WHERE session_id = ?').get(sessionId)
  }
  return user
}

export default db
