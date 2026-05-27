<template>
  <div class="tab-q">

    <!-- 飘屏通知：仅输入态展示 -->
    <div v-if="phase === 'input'" class="float-feed" aria-hidden="true">
      <TransitionGroup name="float-item">
        <div v-for="item in floatItems" :key="item.id" class="float-item">
          <span class="float-alias">「{{ item.alias }}」</span>改变了问题
        </div>
      </TransitionGroup>
    </div>

    <!-- 输入态 -->
    <div v-show="phase === 'input'" class="q-input-wrap">
      <div class="q-header">
        <span class="q-count">已被 <strong>{{ question.changedBy }}</strong> 人改变</span>
      </div>
      <div class="q-body">
        <div class="q-bar"></div>
        <div class="q-question" v-html="formattedQuestion"></div>
        <div class="q-author">
          <div class="q-dot"></div>
          <span class="q-author-name">来自 <em>{{ question.authorAlias }}</em></span>
        </div>
      </div>
      <div class="q-footer">
        <div class="q-hint">你的回答会悄悄改变下一个人看到的问题</div>
        <div class="q-input-row">
          <textarea
            v-model="answer"
            class="q-textarea"
            placeholder="写下你的回答..."
            :disabled="sending"
            @keydown.ctrl.enter="send"
          ></textarea>
          <button class="q-send" :disabled="!answer.trim() || sending" @click="send">
            <i v-if="!sending" class="ti ti-send"></i>
            <i v-else class="ti ti-loader-2 spin"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 对话态（发送后即进入，AI 打字中或已回复） -->
    <div v-show="phase === 'chat'" class="q-sent">
      <!-- 对话区 -->
      <div class="chat-area">
        <!-- 用户气泡 -->
        <div class="chat-user">
          <div class="chat-user-bubble">{{ answer }}</div>
          <div class="chat-sent-tag"><i class="ti ti-check"></i> 已发送，正在改变下一个问题</div>
        </div>
        <!-- AI 回复 -->
        <div class="chat-ai">
          <div class="ai-avatar-sm"><i class="ti ti-sparkles"></i></div>
          <!-- 打字中 -->
          <div v-if="aiTyping" class="ai-bubble ai-typing">
            <span></span><span></span><span></span>
          </div>
          <!-- 已回复 -->
          <div v-else class="ai-bubble">{{ aiReply }}</div>
        </div>
      </div>

      <!-- 操作区：AI 回复后才显示 -->
      <Transition name="actions-fade">
        <div v-if="!aiTyping" class="share-actions">
          <button class="btn-primary" @click="copyShare">
            <i class="ti ti-share"></i>分享这一刻
          </button>
          <button class="btn-ghost" @click="next">看看下一个问题</button>
        </div>
      </Transition>
    </div>

    <transition name="toast-fade">
      <div v-if="toastVisible" class="toast">链接已复制 ✓</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api.js'

const question = ref({ id: 1, text: '', changedBy: 0, authorAlias: '' })
const answer = ref('')
const phase = ref('input')   // 'input' | 'chat'
const sending = ref(false)
const aiTyping = ref(false)
const aiReply = ref('')
const nextQuestionText = ref('')  // Claude 预生成的下一个问题
const toastVisible = ref(false)

// 飘屏
const floatItems = ref([])
let changerPool = []
let floatTimer = null
let floatIdCounter = 0

let floatIndex = 0

async function loadChangers() {
  try {
    const { data } = await api.get('/question/changers')
    changerPool = data.changers || []
  } catch {}
}

function spawnFloat() {
  if (!changerPool.length || floatIndex >= changerPool.length) {
    stopFloats()
    return
  }
  const alias = changerPool[floatIndex++]
  const id = ++floatIdCounter
  floatItems.value.push({ id, alias })
  setTimeout(() => {
    floatItems.value = floatItems.value.filter(i => i.id !== id)
  }, 3500)
}

function startFloats() {
  floatTimer = setInterval(spawnFloat, 2400)
}

function stopFloats() {
  clearInterval(floatTimer)
  floatTimer = null
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
const formattedQuestion = computed(() =>
  escapeHtml(question.value.text).replace(/\n/g, '<br>')
)

onMounted(async () => {
  await fetchQuestion()
  await loadChangers()
  if (changerPool.length) {
    setTimeout(spawnFloat, 1000)
    startFloats()
  }
})
onUnmounted(stopFloats)

async function fetchQuestion() {
  try {
    const { data } = await api.get('/question')
    question.value = data
  } catch (e) {
    console.error(e)
  }
}

async function send() {
  if (!answer.value.trim() || sending.value) return
  sending.value = true
  aiTyping.value = true
  phase.value = 'chat'  // 立即进入对话态，用户气泡先出现
  try {
    await api.post('/question/answer', { text: answer.value.trim() })
    const { data } = await api.post('/question/ai-reply', {
      question: question.value.text,
      answer: answer.value.trim(),
    })
    aiReply.value = data.reply || ''
    nextQuestionText.value = data.nextQuestion || ''
    if (data.changedBy) question.value.changedBy = data.changedBy
  } catch (e) {
    console.error(e)
    aiReply.value = '…'
  } finally {
    sending.value = false
    aiTyping.value = false
  }
}

function copyShare() {
  navigator.clipboard?.writeText(window.location.href).catch(() => {})
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 2000)
}

async function next() {
  if (nextQuestionText.value) {
    // 直接使用 Claude 预生成的下一个问题，无需额外请求
    question.value = {
      ...question.value,
      text: nextQuestionText.value,
      changedBy: question.value.changedBy,
    }
    nextQuestionText.value = ''
  } else {
    await fetchQuestion()
  }
  answer.value = ''
  aiReply.value = ''
  aiTyping.value = false
  phase.value = 'input'
}
</script>

<style scoped>
.tab-q { height: 100%; display: flex; flex-direction: column; background: var(--bg); position: relative; overflow: hidden; }

/* 飘屏 */
.float-feed { position: absolute; right: 12px; bottom: 120px; display: flex; flex-direction: column-reverse; gap: 8px; z-index: 10; pointer-events: none; max-width: 160px; }
.float-item { background: rgba(255,255,255,.06); backdrop-filter: blur(8px); border: 0.5px solid rgba(255,255,255,.1); border-radius: 20px; padding: 5px 10px; font-size: 11px; color: rgba(255,255,255,.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.float-alias { color: var(--q); }
.float-item-enter-active { transition: opacity .4s, transform .4s; }
.float-item-leave-active { transition: opacity .6s, transform .6s; }
.float-item-enter-from { opacity: 0; transform: translateY(10px); }
.float-item-leave-to { opacity: 0; transform: translateY(-16px); }

/* 输入态 */
.q-input-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; }

.q-header { padding: 16px 20px 0; flex-shrink: 0; display: flex; justify-content: flex-end; }
.q-count { font-size: 11px; color: var(--q); background: var(--q-bg); padding: 3px 10px; border-radius: 20px; }
.q-count strong { font-weight: 600; }

.q-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 24px 20px; }
.q-bar { width: 3px; height: 32px; background: var(--q); border-radius: 2px; margin-bottom: 20px; }
.q-question { color: var(--text); font-size: 21px; line-height: 1.65; font-weight: 600; margin-bottom: 28px; font-family: var(--font-serif); }
.q-author { display: flex; align-items: center; gap: 8px; }
.q-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--muted); }
.q-author-name { font-size: 12px; color: var(--muted); }
.q-author-name em { color: var(--q); font-style: normal; }

.q-footer { padding: 14px 20px 20px; border-top: 0.5px solid #1a1a1a; flex-shrink: 0; }
.q-hint { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
.q-input-row { display: flex; gap: 10px; align-items: flex-end; }
.q-textarea {
  flex: 1; background: var(--card); border: 0.5px solid #222; border-radius: 12px;
  color: var(--text2); font-size: 14px; padding: 12px; resize: none; height: 72px;
  font-family: var(--font-sans); outline: none; line-height: 1.5; transition: border-color .2s;
}
.q-textarea:focus { border-color: var(--q); }
.q-textarea:disabled { opacity: .5; }
.q-send {
  width: 44px; height: 44px; background: var(--q); border-radius: 12px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  flex-shrink: 0; border: none; transition: opacity .2s;
}
.q-send:disabled { opacity: .4; cursor: not-allowed; }
.q-send i { font-size: 18px; color: #fff; }

/* 打字指示器（在 AI 气泡内） */
.ai-typing { display: flex; align-items: center; gap: 5px; padding: 14px 16px; }
.ai-typing span {
  width: 7px; height: 7px; border-radius: 50%; background: var(--q);
  animation: typing-dot 1.2s ease-in-out infinite;
}
.ai-typing span:nth-child(2) { animation-delay: .2s; }
.ai-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typing-dot { 0%,100% { opacity: .3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }

/* 分享态 — chat layout */
.q-sent { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--bg); }

.chat-area { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 20px 16px; display: flex; flex-direction: column; gap: 20px; }
.chat-area::-webkit-scrollbar { display: none; }

/* 用户气泡 */
.chat-user { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.chat-user-bubble {
  max-width: 80%; background: var(--q); color: #fff; font-size: 14px; line-height: 1.6;
  padding: 12px 16px; border-radius: 18px 18px 4px 18px;
}
.chat-sent-tag { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.chat-sent-tag i { font-size: 11px; color: var(--d); }

/* AI 气泡 */
.chat-ai { display: flex; align-items: flex-start; gap: 10px; }
.ai-avatar-sm {
  width: 32px; height: 32px; border-radius: 50%; background: #1e1e38;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
}
.ai-avatar-sm i { font-size: 14px; color: var(--q); }
.ai-bubble {
  max-width: 80%; background: var(--card); border: 0.5px solid var(--border);
  color: var(--text2); font-size: 14px; line-height: 1.7;
  padding: 12px 16px; border-radius: 4px 18px 18px 18px;
}

/* 操作区 */
.share-actions { padding: 12px 20px 24px; display: flex; flex-direction: column; gap: 10px; border-top: 0.5px solid #1a1a1a; }

.btn-primary {
  width: 100%; background: var(--q); border: none; border-radius: 14px;
  color: #fff; font-size: 14px; font-weight: 500; padding: 13px; cursor: pointer;
  font-family: var(--font-sans); display: flex; align-items: center; justify-content: center;
  gap: 8px; transition: opacity .2s;
}
.btn-primary:active { opacity: .8; }
.btn-ghost {
  width: 100%; background: none; border: 0.5px solid var(--border2);
  border-radius: 14px; color: var(--muted2); font-size: 14px; padding: 13px;
  cursor: pointer; font-family: var(--font-sans);
}

.toast {
  position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: var(--d); color: #fff; font-size: 13px; padding: 8px 18px;
  border-radius: 20px; white-space: nowrap; z-index: 99;
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity .3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
.actions-fade-enter-active { transition: opacity .4s, transform .4s; }
.actions-fade-enter-from { opacity: 0; transform: translateY(10px); }

.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
