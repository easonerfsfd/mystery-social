import { Router } from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
import db, { getOrCreateUser } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../../server/data/uploads')

const router = Router()
const PAGE_SIZE = 20

router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const posts = db.prepare(`
    SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(PAGE_SIZE + 1, offset)

  const hasMore = posts.length > PAGE_SIZE
  res.json({ posts: posts.slice(0, PAGE_SIZE), hasMore })
})

router.post('/', (req, res) => {
  const user = getOrCreateUser(req.sessionId)
  const { text, mood, imageBase64 } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })

  let imageUrl = null
  if (imageBase64) {
    const ext = imageBase64.startsWith('data:image/png') ? 'png' : 'jpg'
    const filename = `${Date.now()}-${req.sessionId.slice(0, 8)}.${ext}`
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    writeFileSync(join(UPLOADS_DIR, filename), buffer)
    imageUrl = `/uploads/${filename}`
  }

  const result = db.prepare(`
    INSERT INTO posts (user_id, alias, text, mood, image_url, revealed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.sessionId, user.alias, text.trim(), mood || null, imageUrl, user.revealed)

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid)
  res.json({ post })
})

router.patch('/:id/like', (req, res) => {
  const { id } = req.params
  db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(id)
  const post = db.prepare('SELECT likes FROM posts WHERE id = ?').get(id)
  if (!post) return res.status(404).json({ error: 'not found' })
  res.json({ likes: post.likes })
})

export default router
