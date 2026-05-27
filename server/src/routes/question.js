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
    originQuestion: q.origin_question || null,
    originAnswer: q.origin_answer || null,
  })
})

// 最近改变过问题的用户（answers > 0），用于飘屏展示，含头像
router.get('/changers', (req, res) => {
  const rows = db.prepare(
    `SELECT session_id, alias, avatar_url FROM users WHERE answers > 0 ORDER BY answers DESC LIMIT 20`
  ).all()
  res.json({
    changers: rows.map(r => ({
      sessionId: r.session_id,
      alias: r.alias,
      avatarUrl: r.avatar_url || null,
    }))
  })
})

// 仅做参数校验 + 确保用户存在；问题进化和计数由 ai-reply 统一处理
router.post('/answer', (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })
  getOrCreateUser(req.sessionId)
  res.json({ ok: true })
})

export default router
