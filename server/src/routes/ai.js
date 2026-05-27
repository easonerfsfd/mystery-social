import { Router } from 'express'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import db, { getOrCreateUser } from '../db.js'

const execAsync = promisify(exec)
const router = Router()

const FALLBACK_REPLIES = [
  '你说的这些，我没有办法假装完全懂。但我知道，能把它写出来，一定已经在心里压了很久了。',
  '有些感受，不是解释不清楚，是根本不想再解释了。你不需要让所有人都明白。',
  '我在认真读你写的每一个字。谢谢你愿意把这些放在这里。',
  '你描述的那种感觉，我觉得很多人都经历过，但很少人说出口。你说了。',
  '不是所有的重有来处，不是所有的累需要理由。你感受到的，就是真实的。',
  '有时候被人看见一次，就够撑很久了。希望此刻，你感觉到了一点。',
]

const FALLBACK_QUESTIONS = [
  '"你有没有一种关系，\n是你一直在靠近，\n对方一直在原地？"',
  '"如果可以对某个时刻的自己说一句话，\n你想说\n什么？"',
  '"你最近一次\n真的笑出来，\n是因为什么？"',
  '"有没有什么事，\n你一直等着有人来问你，\n但没有人问？"',
  '"你生命里，\n有没有一个人，\n让你觉得被接住过？"',
  '"你现在最想放下的，\n是一件事，\n还是一种感觉？"',
]

function randomFallback(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function parseClaudeJSON(raw) {
  // 去掉 Qwen3 思考标签
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const m = stripped.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('no JSON in response')
  return JSON.parse(m[0])
}

function buildPrompt(question, answer) {
  return `你是一个深夜才出现的匿名倾听者。有人回答了一个走心的问题，你需要做两件事：

【问题】${question}
【对方写的】${answer}

第一件事：写一段回应（reply）
- 真实共情，不说废话，不说"我理解你的感受"这类套话
- 像一个真正在乎对方的人说话，不是在安慰，是在陪伴
- 可以有一点点留白，不要把话说满
- 2-3句，不超过90字，绝对不提自己是AI

第二件事：生成下一个问题（nextQuestion）

好问题有两个维度：
一、能命中——说出某种人人经历过、但从没被命名的感受
二、有趣味——让人读完想笑一下，或者有点意外，然后才发现被戳到了

避免：
- 太沉、太治愈腔（"你有没有一种累……"已经用滥了）
- 追问逻辑（"那你后来怎么做了"）
- 宽泛空洞（"你快乐吗"）

要有的：
- 一点点俏皮或意外的切入角度
- 具体到某个场景、某个细节、某种矛盾感
- 让人觉得"这问题有点坏，但说的是我"

句式可以更多样，不局限于"你有没有"，比如：
- "你有没有……但其实……"（反转）
- "如果……你会……吗"（假设）
- "那种……的感觉，你懂吗"（定义一种感受）
- 或者直接用一个场景开头，不套句式

用中文双引号包裹，适当断行（用\\n），每行不超过12个字

好问题参考（只学那种"有点坏又戳心"的感觉，不要抄）：
"你有没有认真解释过一件事，\\n说完发现对方根本\\n没打算理解你？"
"有没有一首歌，\\n你不敢在别人面前放，\\n因为会暴露太多？"
"你有没有假装没看到消息，\\n但其实看了三遍？"
"有没有某句夸你的话，\\n你表面说没什么，\\n私下记了很久？"

只输出JSON，不要任何解释：{"reply": "...", "nextQuestion": "..."}`
}

// 方式一：claude CLI — 异步执行，不阻塞主线程，多个请求可真正并发
async function callViaCLI(question, answer) {
  const prompt = buildPrompt(question, answer)
  const escaped = prompt.replace(/\\/g, '\\\\').replace(/'/g, `'"'"'`)
  const { stdout } = await execAsync(`claude -p '${escaped}' --output-format text`, {
    timeout: 35000,
    env: { ...process.env, HOME: process.env.HOME || '/Users/dev' },
  })
  return parseClaudeJSON(stdout)
}

// 方式二：OpenAI 兼容接口（Qwen 等自托管模型）
const OPENAI_BASE = process.env.OPENAI_BASE_URL   // e.g. http://160.30.1.242:11011/v1
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'Qwen3.6-27B'
const OPENAI_KEY = process.env.OPENAI_API_KEY || 'sk-placeholder'

async function callViaOpenAI(question, answer) {
  console.log('[ai] calling Qwen at', OPENAI_BASE)
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 400,
      enable_thinking: false,
      messages: [{ role: 'user', content: buildPrompt(question, answer) }],
    }),
    signal: AbortSignal.timeout(30000),
  })
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  return parseClaudeJSON(text)
}

// 方式三：Anthropic SDK（需要 ANTHROPIC_API_KEY）
let sdkClient = null
try {
  if (process.env.ANTHROPIC_API_KEY) sdkClient = new Anthropic()
} catch {}

async function callViaSDK(question, answer) {
  const msg = await sdkClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: buildPrompt(question, answer) }],
  })
  return parseClaudeJSON(msg.content[0]?.text || '')
}

router.post('/ai-reply', async (req, res) => {
  const { question, answer } = req.body
  if (!question || !answer) return res.status(400).json({ error: 'missing params' })

  const user = getOrCreateUser(req.sessionId)

  let result = null

  try {
    result = await callViaCLI(question, answer)
  } catch (e) {
    console.error('[ai] CLI failed:', e.message)
  }

  if (!result && OPENAI_BASE) {
    try {
      result = await callViaOpenAI(question, answer)
    } catch (e) {
      console.error('[ai] OpenAI failed:', e.message)
    }
  }

  if (!result && sdkClient) {
    try {
      result = await callViaSDK(question, answer)
    } catch (e) {
      console.error('[ai] SDK failed:', e.message)
    }
  }

  const reply       = result?.reply?.trim()        || randomFallback(FALLBACK_REPLIES)
  const nextQuestion = result?.nextQuestion?.trim() || randomFallback(FALLBACK_QUESTIONS)

  // 原子写入：changed_by = changed_by + 1 由 SQLite 保证，多个并发写入计数都正确
  let changedBy = 0
  const now = new Date().toISOString()
  try {
    db.prepare(`
      UPDATE question SET text = ?, changed_by = changed_by + 1, author_alias = ? WHERE id = 1
    `).run(nextQuestion, user.alias)
    db.prepare('UPDATE users SET answers = answers + 1 WHERE session_id = ?').run(req.sessionId)
    db.prepare(`
      INSERT INTO answer_logs (user_id, alias, question, answer, ai_reply, next_question, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.sessionId, user.alias, question, answer, reply, nextQuestion, now)
    changedBy = db.prepare('SELECT changed_by FROM question WHERE id = 1').get().changed_by
  } catch (e) {
    console.error('[ai] db update failed:', e.message)
  }

  // 返回 changedBy 让客户端展示准确值，不依赖本地计数
  res.json({ reply, nextQuestion, changedBy })
})

export default router
