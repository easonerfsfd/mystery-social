import { Router } from 'express'
import db, { getOrCreateUser } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  getOrCreateUser(req.sessionId)
  const q = db.prepare('SELECT * FROM question WHERE id = 1').get()
  res.json({
    id: q.id,
    text: q.text,
    changedBy: q.changed_by,
    authorAlias: q.author_alias,
  })
})

// 最近改变过问题的用户（answers > 0），用于飘屏展示
router.get('/changers', (req, res) => {
  const rows = db.prepare(
    `SELECT alias FROM users WHERE answers > 0 ORDER BY created_at DESC LIMIT 30`
  ).all()
  res.json({ changers: rows.map(r => r.alias) })
})

// 仅做参数校验 + 确保用户存在；问题进化和计数由 ai-reply 统一处理
router.post('/answer', (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })
  getOrCreateUser(req.sessionId)
  res.json({ ok: true })
})

export default router
