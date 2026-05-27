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

    <!-- 对话态 -->
    <div v-show="phase === 'chat'" class="q-sent">
      <div class="chat-area">
        <!-- 你回答的问题 -->
        <div v-if="sentQuestion" class="sent-q-label">{{ sentQuestion }}</div>

        <!-- 用户气泡 -->
        <div class="chat-user">
          <div class="chat-user-bubble">{{ sentAnswer }}</div>
          <div class="chat-sent-tag"><i class="ti ti-check"></i> 已发送，正在改变下一个问题</div>
        </div>

        <!-- AI 回复 -->
        <div class="chat-ai">
          <div class="ai-avatar-sm"><i class="ti ti-sparkles"></i></div>
          <div v-if="aiTyping" class="ai-bubble ai-typing">
            <span></span><span></span><span></span>
          </div>
          <div v-else class="ai-bubble">{{ aiReply }}</div>
        </div>

        <!-- 来历卡：这道题是怎么来的 -->
        <Transition name="origin-fade">
          <div v-if="question.originQuestion && !aiTyping" class="origin-card" @click="originExpanded = !originExpanded">
            <div class="origin-header">
              <span class="origin-label">✦ 这道题是这样来的</span>
              <i :class="['ti', originExpanded ? 'ti-chevron-up' : 'ti-chevron-down', 'origin-chevron']"></i>
            </div>
            <Transition name="origin-expand">
              <div v-if="originExpanded" class="origin-body">
                <div class="origin-q">{{ question.originQuestion }}</div>
                <div class="origin-arrow">└ 有人回答了：</div>
                <div class="origin-a">「{{ question.originAnswer }}」</div>
              </div>
            </Transition>
          </div>
        </Transition>
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

const question = ref({ id: 1, text: '', changedBy: 0, authorAlias: '', originQuestion: null, originAnswer: null })
const answer = ref('')
const sentAnswer = ref('')
const sentQuestion = ref('')
const phase = ref('input')
const sending = ref(false)
const aiTyping = ref(false)
const aiReply = ref('')
const nextQuestionText = ref('')
const toastVisible = ref(false)
const originExpanded = ref(false)

// 飘屏
const floatItems = ref([])
let floatTimer = null
let floatIdCounter = 0
let floatIndex = 0
let changerPool = []

async function loadChangers() {
  try {
    const { data } = await api.get('/question/changers')
    changerPool = (data.changers || []).map(c => c.alias || c)
    floatIndex = 0
  } catch {}
}

function spawnFloat() {
  if (!changerPool.length || floatIndex >= changerPool.length) { stopFloats(); return }
  const alias = changerPool[floatIndex++]
  const id = ++floatIdCounter
  floatItems.value.push({ id, alias })
  setTimeout(() => { floatItems.value = floatItems.value.filter(i => i.id !== id) }, 3500)
}

function startFloats() {
  floatTimer = setInterval(spawnFloat, 2400)
}

function stopFloats() {
  clearInterval(floatTimer); floatTimer = null
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
  originExpanded.value = false
  sentAnswer.value = answer.value.trim()
  sentQuestion.value = question.value.text
  phase.value = 'chat'
  try {
    await api.post('/question/answer', { text: sentAnswer.value })
    const { data } = await api.post('/question/ai-reply', {
      question: question.value.text,
      answer: sentAnswer.value,
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
  const prevOriginQ = question.value.text
  const prevOriginA = sentAnswer.value
  if (nextQuestionText.value) {
    question.value = {
      ...question.value,
      text: nextQuestionText.value,
      changedBy: question.value.changedBy,
      originQuestion: prevOriginQ,
      originAnswer: prevOriginA,
    }
    nextQuestionText.value = ''
  } else {
    await fetchQuestion()
  }
  answer.value = ''
  sentAnswer.value = ''
  sentQuestion.value = ''
  aiReply.value = ''
  aiTyping.value = false
  originExpanded.value = false
  phase.value = 'input'
}
</script>

<style scoped>
.tab-q { height: 100%; display: flex; flex-direction: column; background: var(--bg); position: relative; overflow: hidden; }

/* 飘屏 */
.float-feed { position: absolute; right: 12px; bottom: 120px; display: flex; flex-direction: column-reverse; gap: 8px; z-index: 10; pointer-events: none; max-width: 150px; }
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

/* 打字指示器 */
.ai-typing { display: flex; align-items: center; gap: 5px; padding: 14px 16px; }
.ai-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--q); animation: typing-dot 1.2s ease-in-out infinite; }
.ai-typing span:nth-child(2) { animation-delay: .2s; }
.ai-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typing-dot { 0%,100% { opacity: .3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }

/* 对话态 */
.q-sent { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--bg); }
.chat-area { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 20px 16px; display: flex; flex-direction: column; gap: 16px; }
.chat-area::-webkit-scrollbar { display: none; }
.sent-q-label { font-size: 13px; color: rgba(255,255,255,.35); line-height: 1.6; font-family: var(--font-serif); border-left: 2px solid var(--q); padding-left: 10px; }

/* 来历卡 */
.origin-card {
  background: rgba(127,119,221,.08); border: 0.5px solid rgba(127,119,221,.2);
  border-radius: 14px; padding: 10px 14px; cursor: pointer; flex-shrink: 0;
}
.origin-header { display: flex; align-items: center; justify-content: space-between; }
.origin-label { font-size: 11px; color: var(--q); font-weight: 500; letter-spacing: .02em; }
.origin-chevron { font-size: 12px; color: var(--q); opacity: .7; }
.origin-body { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.origin-q { font-size: 12px; color: rgba(255,255,255,.5); line-height: 1.5; }
.origin-arrow { font-size: 11px; color: var(--muted); }
.origin-a { font-size: 12px; color: rgba(255,255,255,.65); line-height: 1.5; font-style: italic; }
.origin-fade-enter-active { transition: opacity .5s .3s, transform .5s .3s; }
.origin-fade-enter-from { opacity: 0; transform: translateY(-6px); }
.origin-expand-enter-active { transition: opacity .25s, max-height .3s; max-height: 200px; }
.origin-expand-leave-active { transition: opacity .2s, max-height .25s; }
.origin-expand-enter-from { opacity: 0; max-height: 0; }
.origin-expand-leave-to { opacity: 0; max-height: 0; overflow: hidden; }

/* 用户气泡 */
.chat-user { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.chat-user-bubble { max-width: 80%; background: var(--q); color: #fff; font-size: 14px; line-height: 1.6; padding: 12px 16px; border-radius: 18px 18px 4px 18px; }
.chat-sent-tag { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.chat-sent-tag i { font-size: 11px; color: var(--d); }

/* AI 气泡 */
.chat-ai { display: flex; align-items: flex-start; gap: 10px; }
.ai-avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: #1e1e38; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.ai-avatar-sm i { font-size: 14px; color: var(--q); }
.ai-bubble { max-width: 80%; background: var(--card); border: 0.5px solid var(--border); color: var(--text2); font-size: 14px; line-height: 1.7; padding: 12px 16px; border-radius: 4px 18px 18px 18px; }

/* 操作区 */
.share-actions { padding: 12px 20px 24px; display: flex; flex-direction: column; gap: 10px; border-top: 0.5px solid #1a1a1a; }
.btn-primary { width: 100%; background: var(--q); border: none; border-radius: 14px; color: #fff; font-size: 14px; font-weight: 500; padding: 13px; cursor: pointer; font-family: var(--font-sans); display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .2s; }
.btn-primary:active { opacity: .8; }
.btn-ghost { width: 100%; background: none; border: 0.5px solid var(--border2); border-radius: 14px; color: var(--muted2); font-size: 14px; padding: 13px; cursor: pointer; font-family: var(--font-sans); }

.toast { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--d); color: #fff; font-size: 13px; padding: 8px 18px; border-radius: 20px; white-space: nowrap; z-index: 99; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity .3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
.actions-fade-enter-active { transition: opacity .4s, transform .4s; }
.actions-fade-enter-from { opacity: 0; transform: translateY(10px); }

.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
