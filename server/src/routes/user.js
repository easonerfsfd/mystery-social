import { Router } from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import db, { getOrCreateUser } from '../db.js'
import { saveImage } from '../imageUtil.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../../server/data/uploads')

const router = Router()

router.get('/me', (req, res) => {
  const user = getOrCreateUser(req.sessionId)
  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(req.sessionId)
  const likesCount = db.prepare('SELECT COALESCE(SUM(likes),0) as total FROM posts WHERE user_id = ?').get(req.sessionId)
  const totalLikes = likesCount.total
  const unreadLikes = Math.max(0, totalLikes - (user.likes_last_seen || 0))
  res.json({
    alias: user.alias,
    bio: user.bio,
    avatar: user.avatar_url,
    revealed: !!user.revealed,
    stats: {
      posts: postCount.c,
      likes: totalLikes,
      answers: user.answers,
    },
    unreadLikes,
    joinedAt: user.created_at,
  })
})

router.post('/me/ack-likes', (req, res) => {
  const likesCount = db.prepare('SELECT COALESCE(SUM(likes),0) as total FROM posts WHERE user_id = ?').get(req.sessionId)
  db.prepare('UPDATE users SET likes_last_seen = ? WHERE session_id = ?').run(likesCount.total, req.sessionId)
  res.json({ ok: true })
})

router.patch('/me', (req, res) => {
  const { alias, bio } = req.body
  const user = getOrCreateUser(req.sessionId)
  const newAlias = alias?.trim() || user.alias
  const newBio = bio !== undefined ? bio.trim() : user.bio
  db.prepare('UPDATE users SET alias = ?, bio = ? WHERE session_id = ?').run(newAlias, newBio, req.sessionId)
  const updated = db.prepare('SELECT * FROM users WHERE session_id = ?').get(req.sessionId)
  res.json({ user: updated })
})

router.post('/me/avatar', (req, res) => {
  const { imageBase64 } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  let avatarUrl
  try {
    avatarUrl = saveImage(imageBase64, UPLOADS_DIR, 'avatar')
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message })
  }

  db.prepare('UPDATE users SET avatar_url = ? WHERE session_id = ?').run(avatarUrl, req.sessionId)
  res.json({ avatarUrl })
})

router.get('/me/posts', (req, res) => {
  const posts = db.prepare(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.sessionId)
  res.json({ posts })
})

router.post('/me/reveal', (req, res) => {
  getOrCreateUser(req.sessionId)
  db.prepare('UPDATE users SET revealed = 1 WHERE session_id = ?').run(req.sessionId)
  res.json({ ok: true })
})

router.post('/feedback', (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.json({ ok: true })
  db.prepare('INSERT INTO feedbacks (user_id, text) VALUES (?, ?)').run(req.sessionId, text.trim())
  res.json({ ok: true })
})

export default router
