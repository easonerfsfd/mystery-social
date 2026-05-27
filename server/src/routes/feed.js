import { Router } from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import db, { getOrCreateUser } from '../db.js'
import { saveImage } from '../imageUtil.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../../server/data/uploads')

const router = Router()
const PAGE_SIZE = 20

// 含评论数 + 当前头像（已现身用户显示真实头像）
const POST_SELECT = `
  SELECT p.*,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
    u.avatar_url AS user_avatar_url
  FROM posts p
  LEFT JOIN users u ON p.user_id = u.session_id
`

router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const posts = db.prepare(
    POST_SELECT + ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
  ).all(PAGE_SIZE + 1, offset)

  const hasMore = posts.length > PAGE_SIZE
  res.json({ posts: posts.slice(0, PAGE_SIZE), hasMore })
})

router.post('/', (req, res) => {
  const user = getOrCreateUser(req.sessionId)
  const { text, mood, imageBase64 } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })

  let imageUrl = null
  if (imageBase64) {
    try {
      imageUrl = saveImage(imageBase64, UPLOADS_DIR, 'post')
    } catch (e) {
      return res.status(e.status || 400).json({ error: e.message })
    }
  }

  const result = db.prepare(`
    INSERT INTO posts (user_id, alias, text, mood, image_url, revealed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.sessionId, user.alias, text.trim(), mood || null, imageUrl, user.revealed, new Date().toISOString())

  const post = db.prepare(POST_SELECT + ' WHERE p.id = ?').get(result.lastInsertRowid)
  res.json({ post })
})

router.patch('/:id/like', (req, res) => {
  const { id } = req.params
  const post = db.prepare('SELECT id, likes FROM posts WHERE id = ?').get(id)
  if (!post) return res.status(404).json({ error: 'not found' })
  db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(id)
  res.json({ likes: post.likes + 1 })
})

router.get('/:id/comments', (req, res) => {
  const { id } = req.params
  const comments = db.prepare(
    'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC'
  ).all(id)
  res.json({ comments })
})

router.post('/:id/comments', (req, res) => {
  const { id } = req.params
  const { text, parentId } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })

  const user = getOrCreateUser(req.sessionId)
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id)
  if (!post) return res.status(404).json({ error: 'post not found' })

  if (parentId != null) {
    const parent = db.prepare('SELECT id FROM comments WHERE id = ? AND post_id = ?').get(parentId, id)
    if (!parent) return res.status(404).json({ error: 'parent comment not found' })
  }

  const result = db.prepare(`
    INSERT INTO comments (post_id, user_id, alias, text, revealed, parent_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.sessionId, user.alias, text.trim(), user.revealed, parentId ?? null, new Date().toISOString())

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid)
  res.json({ comment })
})

router.delete('/:id', (req, res) => {
  const { id } = req.params
  const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(id)
  if (!post) return res.status(404).json({ error: 'not found' })
  if (post.user_id !== req.sessionId) return res.status(403).json({ error: 'forbidden' })
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(id)
  db.prepare('DELETE FROM posts WHERE id = ?').run(id)
  res.json({ ok: true })
})

export default router
