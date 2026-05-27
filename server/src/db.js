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
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    session_id TEXT PRIMARY KEY,
    alias      TEXT DEFAULT '神秘用户',
    bio        TEXT DEFAULT '',
    avatar_url TEXT,
    revealed   INTEGER DEFAULT 0,
    answers    INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL,
    user_id    TEXT NOT NULL,
    alias      TEXT,
    text       TEXT NOT NULL,
    revealed   INTEGER DEFAULT 0,
    parent_id  INTEGER REFERENCES comments(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS answer_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    alias        TEXT,
    question     TEXT NOT NULL,
    answer       TEXT NOT NULL,
    ai_reply     TEXT,
    next_question TEXT,
    created_at   TEXT NOT NULL
  );
`)

// 迁移：补充 parent_id 列
try {
  const cols = db.prepare("PRAGMA table_info(comments)").all()
  if (!cols.find(c => c.name === 'parent_id')) {
    db.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id)')
  }
} catch {}

// 迁移：question 表加来历字段
try {
  const qCols = db.prepare("PRAGMA table_info(question)").all()
  if (!qCols.find(c => c.name === 'origin_question')) {
    db.exec('ALTER TABLE question ADD COLUMN origin_question TEXT')
    db.exec('ALTER TABLE question ADD COLUMN origin_answer TEXT')
  }
} catch {}

// 迁移：users 表加点赞已读计数
try {
  const uCols = db.prepare("PRAGMA table_info(users)").all()
  if (!uCols.find(c => c.name === 'likes_last_seen')) {
    db.exec('ALTER TABLE users ADD COLUMN likes_last_seen INTEGER DEFAULT 0')
  }
} catch {}

// 迁移：answer_logs 表
try {
  db.exec(`CREATE TABLE IF NOT EXISTS answer_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    alias        TEXT,
    question     TEXT NOT NULL,
    answer       TEXT NOT NULL,
    ai_reply     TEXT,
    next_question TEXT,
    created_at   TEXT NOT NULL
  )`)
} catch {}

// 迁移：旧版 CST 时间戳（无 Z 后缀）→ UTC ISO（补 +08:00 让 SQLite 转换）
// 只处理形如 "YYYY-MM-DD HH:MM:SS" 的旧格式（不含 T 和 Z）
try {
  for (const tbl of ['posts', 'comments', 'users', 'feedbacks']) {
    db.exec(`UPDATE ${tbl} SET created_at = strftime('%Y-%m-%dT%H:%M:%SZ', created_at, '-8 hours')
      WHERE created_at NOT LIKE '%T%' AND created_at NOT LIKE '%Z%' AND created_at IS NOT NULL`)
  }
} catch (e) {
  console.error('[db] timestamp migration failed:', e.message)
}

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
    db.prepare('INSERT INTO users (session_id, alias, created_at) VALUES (?, ?, ?)').run(sessionId, alias, new Date().toISOString())
    user = db.prepare('SELECT * FROM users WHERE session_id = ?').get(sessionId)
  }
  return user
}

export default db
