import express from 'express'
import cors from 'cors'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import questionRouter from './routes/question.js'
import feedRouter from './routes/feed.js'
import userRouter from './routes/user.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// session_id 中间件
app.use((req, _res, next) => {
  req.sessionId = req.headers['x-session-id'] || 'anonymous'
  next()
})

// 静态文件：上传的图片
app.use('/uploads', express.static(join(__dirname, '../../server/data/uploads')))

app.use('/api/question', questionRouter)
app.use('/api/feed', feedRouter)
app.use('/api', userRouter)

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
})
