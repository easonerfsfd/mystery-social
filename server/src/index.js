import express from 'express'
import cors from 'cors'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import questionRouter from './routes/question.js'
import feedRouter from './routes/feed.js'
import userRouter from './routes/user.js'
import aiRouter from './routes/ai.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
// 5MB limit — enough for base64-encoded images (≈3.75MB decoded)
app.use(express.json({ limit: '10mb' }))

// session_id 中间件：若无有效 header 则生成临时 UUID（不持久化）
const SESSION_RE = /^[a-zA-Z0-9_-]{8,64}$/
app.use((req, _res, next) => {
  const raw = req.headers['x-session-id']
  req.sessionId = (raw && SESSION_RE.test(raw)) ? raw : randomUUID()
  next()
})

// 静态文件：上传的图片
app.use('/uploads', express.static(join(__dirname, '../../server/data/uploads')))

app.use('/api/question', questionRouter)
app.use('/api/question', aiRouter)
app.use('/api/feed', feedRouter)
app.use('/api', userRouter)

// 生产模式：托管前端打包文件
const DIST = join(__dirname, '../../client/dist')
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
})
