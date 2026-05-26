import { Router } from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
import db, { getOrCreateUser } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../../server/data/uploads')

const router = Router()

router.get('/me', (req, res) => {
  const user = getOrCreateUser(req.sessionId)
  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(req.sessionId)
  const likesCount = db.prepare('SELECT COALESCE(SUM(likes),0) as total FROM posts WHERE user_id = ?').get(req.sessionId)
  res.json({
    alias: user.alias,
    bio: user.bio,
    avatar: user.avatar_url,
    revealed: !!user.revealed,
    stats: {
      posts: postCount.c,
      likes: likesCount.total,
      answers: user.answers,
    },
    joinedAt: user.created_at,
  })
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

  const ext = imageBase64.startsWith('data:image/png') ? 'png' : 'jpg'
  const filename = `avatar-${req.sessionId.slice(0, 8)}-${Date.now()}.${ext}`
  const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
  writeFileSync(join(UPLOADS_DIR, filename), buffer)

  const avatarUrl = `/uploads/${filename}`
  db.prepare('UPDATE users SET avatar_url = ? WHERE session_id = ?').run(avatarUrl, req.sessionId)
  res.json({ avatarUrl })
})

router.post('/me/reveal', (req, res) => {
  getOrCreateUser(req.sessionId)
  db.prepare('UPDATE users SET revealed = 1 WHERE session_id = ?').run(req.sessionId)
  res.json({ ok: true })
})

export default router
