<template>
  <div class="tab-q">
    <!-- 输入态 -->
    <div v-if="!sent" class="q-input-wrap">
      <div class="q-header">
        <div class="q-label">
          <span class="q-label-text">今日之问</span>
          <span class="q-count">已被 <strong>{{ question.changedBy }}</strong> 人改变</span>
        </div>
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
            @keydown.ctrl.enter="send"
          ></textarea>
          <button class="q-send" :disabled="!answer.trim()" @click="send">
            <i class="ti ti-send"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 发送后分享态 -->
    <div v-else class="q-sent">
      <div class="q-sent-top">
        <div class="q-sent-icon"><i class="ti ti-check"></i></div>
        <h3>你的回答已发出</h3>
        <p>正在悄悄改变下一个问题...</p>
      </div>
      <div class="q-card">
        <div class="q-card-label">你回答了</div>
        <div class="q-card-q" v-html="formattedQuestion"></div>
        <div class="q-answer-preview">{{ answer }}</div>
      </div>
      <button class="btn-primary" @click="copyShare">
        <i class="ti ti-share"></i>分享这一刻
      </button>
      <button class="btn-ghost" @click="next">看看下一个问题</button>
    </div>

    <!-- Toast -->
    <transition name="toast-fade">
      <div v-if="toastVisible" class="toast">链接已复制 ✓</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api.js'

const question = ref({ id: 1, text: '', changedBy: 0, authorAlias: '' })
const answer = ref('')
const sent = ref(false)
const toastVisible = ref(false)

const formattedQuestion = computed(() =>
  question.value.text.replace(/\n/g, '<br>')
)

onMounted(fetchQuestion)

async function fetchQuestion() {
  try {
    const { data } = await api.get('/question')
    question.value = data
  } catch (e) {
    console.error(e)
  }
}

async function send() {
  if (!answer.value.trim()) return
  try {
    await api.post('/question/answer', { text: answer.value.trim() })
    question.value.changedBy++
    sent.value = true
  } catch (e) {
    console.error(e)
  }
}

function copyShare() {
  navigator.clipboard?.writeText(window.location.href).catch(() => {})
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 2000)
}

async function next() {
  answer.value = ''
  sent.value = false
  await fetchQuestion()
}
</script>

<style scoped>
.tab-q { height: 100%; display: flex; flex-direction: column; background: var(--bg); position: relative; overflow: hidden; }

.q-input-wrap { height: 100%; display: flex; flex-direction: column; }

.q-header { padding: 18px 20px 0; flex-shrink: 0; }
.q-label { display: flex; justify-content: space-between; align-items: center; }
.q-label-text { font-size: 10px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; }
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
.q-send {
  width: 44px; height: 44px; background: var(--q); border-radius: 12px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  flex-shrink: 0; border: none; transition: opacity .2s;
}
.q-send:disabled { opacity: .4; cursor: not-allowed; }
.q-send i { font-size: 18px; color: #fff; }

/* Sent state */
.q-sent { height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 24px 20px; gap: 16px; }
.q-sent-top { text-align: center; }
.q-sent-icon {
  width: 52px; height: 52px; background: var(--q-bg); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;
}
.q-sent-icon i { font-size: 24px; color: var(--q); }
.q-sent h3 { font-size: 15px; color: var(--text); font-weight: 500; margin-bottom: 6px; }
.q-sent p { font-size: 12px; color: var(--muted); }

.q-card { background: var(--card); border-radius: 16px; padding: 20px; border: 0.5px solid var(--border); }
.q-card-label { font-size: 10px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
.q-card-q { font-size: 15px; color: var(--text); line-height: 1.6; margin-bottom: 16px; font-family: var(--font-serif); }
.q-answer-preview { font-size: 13px; color: var(--q); background: var(--q-bg); padding: 10px 14px; border-radius: 10px; line-height: 1.5; }

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
  position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
  background: var(--d); color: #fff; font-size: 13px; padding: 8px 18px;
  border-radius: 20px; white-space: nowrap; z-index: 99;
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity .3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
</style>
