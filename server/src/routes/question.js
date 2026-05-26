import { Router } from 'express'
import db, { getOrCreateUser } from '../db.js'
import { evolveQuestion } from '../evolve.js'
import { randomAlias } from '../../../shared/aliases.js'

const router = Router()

router.get('/', (req, res) => {
  const user = getOrCreateUser(req.sessionId)
  const q = db.prepare('SELECT * FROM question WHERE id = 1').get()
  res.json({
    id: q.id,
    text: q.text,
    changedBy: q.changed_by,
    authorAlias: q.author_alias,
  })
})

router.post('/answer', (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })

  const user = getOrCreateUser(req.sessionId)
  const q = db.prepare('SELECT * FROM question WHERE id = 1').get()

  const newText = evolveQuestion(q.text, text.trim())

  if (newText) {
    db.prepare(`
      UPDATE question SET text = ?, changed_by = changed_by + 1, author_alias = ? WHERE id = 1
    `).run(newText, user.alias || randomAlias())
  } else {
    db.prepare('UPDATE question SET changed_by = changed_by + 1 WHERE id = 1').run()
  }

  db.prepare('UPDATE users SET answers = answers + 1 WHERE session_id = ?').run(req.sessionId)

  res.json({ ok: true })
})

export default router
