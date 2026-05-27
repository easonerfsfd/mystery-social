<template>
  <div class="tab-d">
    <!-- Header -->
    <div class="d-header">
      <h2>发现</h2>
      <button class="d-pub-btn" @click="openCompose">
        <i class="ti ti-plus"></i>发布
      </button>
    </div>

    <!-- Feed -->
    <div class="d-feed" ref="feedEl" @scroll="onScroll">
      <div v-if="feedStore.loading && feedStore.posts.length === 0" class="d-loading">
        <i class="ti ti-loader-2 spin"></i>
      </div>

      <div v-for="post in feedStore.posts" :key="post.id" class="post-card">
        <!-- Post head -->
        <div class="post-head">
          <div class="post-avatar" :class="post.revealed ? 'revealed' : 'mystery'">
            <img
              v-if="post.revealed && post.user_avatar_url"
              :src="post.user_avatar_url"
              class="avatar-img"
            >
            <img
              v-else
              :src="getPixelAvatar(post.user_id)"
              class="avatar-img pixel"
            >
          </div>
          <div class="post-meta">
            <div class="post-name">{{ post.alias || '神秘用户' }}</div>
            <div class="post-time">{{ relativeTime(post.created_at) }}</div>
          </div>
          <span class="post-tag" :class="post.revealed ? 'revealed' : 'mystery'">
            {{ post.revealed ? '已现身' : '神秘用户' }}
          </span>
        </div>

        <!-- Image -->
        <div v-if="post.image_url" class="post-img" @click="lightboxSrc = post.image_url">
          <img :src="post.image_url" alt="">
        </div>

        <!-- Mood -->
        <div v-if="post.mood" class="post-mood">
          <i class="ti ti-mood-smile"></i> {{ post.mood }}
        </div>

        <!-- Text -->
        <p class="post-text">{{ post.text }}</p>

        <!-- Actions -->
        <div class="post-actions">
          <button
            class="post-action-btn"
            :class="{ liked: post._liked }"
            @click="feedStore.toggleLike(post.id)"
          >
            <i class="ti ti-heart"></i> {{ post.likes }}
          </button>
          <button
            class="post-action-btn"
            :class="{ 'comment-active': expandedPostId === post.id }"
            @click="toggleComments(post.id)"
          >
            <i class="ti ti-message-circle"></i>
            {{ commentCounts[post.id] ?? (post.comment_count || '') }}
          </button>
        </div>

        <!-- Comments section -->
        <div v-if="expandedPostId === post.id" class="comments-section">
          <div v-if="commentsLoading[post.id]" class="comments-loading">
            <i class="ti ti-loader-2 spin"></i>
          </div>
          <div v-else>
            <div v-if="(comments[post.id] || []).length === 0" class="no-comments">还没有评论，来说点什么</div>
            <template v-for="c in topLevelComments(post.id)" :key="c.id">
              <div class="comment-row">
                <img :src="getPixelAvatar(c.user_id)" class="comment-avatar pixel">
                <div class="comment-body">
                  <span class="comment-alias">{{ c.alias }}</span>
                  <span class="comment-text">{{ c.text }}</span>
                  <button class="reply-btn" @click="setReplyTarget(post.id, c)">
                    <i class="ti ti-corner-down-right"></i> 回复
                  </button>
                </div>
              </div>
              <!-- Replies -->
              <div
                v-for="r in repliesFor(post.id, c.id)" :key="r.id"
                class="comment-row reply-row"
              >
                <img :src="getPixelAvatar(r.user_id)" class="comment-avatar pixel">
                <div class="comment-body">
                  <span class="comment-alias">{{ r.alias }}</span>
                  <span class="reply-at">回复 {{ c.alias }}</span>
                  <span class="comment-text">{{ r.text }}</span>
                </div>
              </div>
            </template>
            <div class="comment-input-row">
              <div v-if="replyTarget[post.id]" class="reply-hint">
                <span>回复 {{ replyTarget[post.id].alias }}</span>
                <button class="reply-cancel" @click="clearReplyTarget(post.id)"><i class="ti ti-x"></i></button>
              </div>
              <div class="comment-input-wrap">
                <textarea
                  v-model="commentDraft[post.id]"
                  class="comment-input"
                  :placeholder="replyTarget[post.id] ? `回复 ${replyTarget[post.id].alias}…` : '说点什么…'"
                  rows="1"
                  @keydown.enter.prevent="submitComment(post.id)"
                ></textarea>
                <button class="comment-send" @click="submitComment(post.id)">
                  <i class="ti ti-send"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!feedStore.hasMore && feedStore.posts.length > 0" class="d-end">已经到底了</div>
    </div>

    <!-- Image lightbox -->
    <Transition name="lb-fade">
      <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
        <img :src="lightboxSrc" class="lb-img" @click.stop>
        <button class="lb-close" @click="lightboxSrc = null"><i class="ti ti-x"></i></button>
      </div>
    </Transition>

    <!-- Compose overlay -->
    <Transition name="overlay-fade">
      <div v-if="composeOpen" class="compose-overlay" @click="closeCompose"></div>
    </Transition>

    <!-- Compose sheet -->
    <Transition name="sheet-slide">
      <div v-if="composeOpen" class="compose-sheet">
        <div class="compose-top">
          <button class="compose-cancel" @click="closeCompose">取消</button>
          <span class="compose-title">发布动态</span>
          <button class="compose-submit" @click="submitPost" :disabled="submitting">
            <i v-if="submitting" class="ti ti-loader-2 spin"></i>
            <span v-else>发布</span>
          </button>
        </div>
        <div class="compose-body">
          <div class="compose-anon" :class="userStore.revealed ? 'revealed' : 'mystery'">
            <img
              v-if="userStore.revealed && userStore.avatarUrl"
              :src="userStore.avatarUrl"
              class="avatar-img-sm"
            >
            <img v-else :src="myPixelAvatar" class="avatar-img-sm pixel">
          </div>
          <div class="compose-right">
            <div class="compose-who" :class="userStore.revealed ? 'revealed-text' : ''">
              {{ userStore.alias || '神秘用户' }}
              <span v-if="!userStore.revealed" class="mystery-badge">神秘用户</span>
            </div>
            <textarea
              v-model="composeText"
              class="compose-textarea"
              placeholder="此刻你在想什么..."
              maxlength="200"
              ref="composeTA"
            ></textarea>
          </div>
        </div>
        <div v-if="previewSrc" class="img-preview-area">
          <img :src="previewSrc" alt="">
          <button class="img-remove" @click="removeImage"><i class="ti ti-x"></i></button>
        </div>
        <div v-if="moodOpen" class="mood-picker">
          <button
            v-for="m in MOODS" :key="m.label"
            class="mood-chip"
            :class="{ selected: selectedMood === m.label }"
            @click="toggleMood(m.label)"
          >{{ m.emoji }} {{ m.label }}</button>
        </div>
        <div class="compose-toolbar">
          <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="onImagePick">
          <button class="toolbar-btn" @click="fileInput.click()">
            <i class="ti ti-photo" style="color:var(--d)"></i>图片
          </button>
          <button class="toolbar-btn" :class="{ 'mood-active': moodOpen }" @click="moodOpen = !moodOpen">
            <i class="ti ti-mood-smile" style="color:var(--d)"></i>心情
          </button>
          <span class="char-count" :style="composeText.length > 180 ? 'color:var(--m)' : ''">
            {{ composeText.length }} / 200
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useFeedStore } from '@/stores/feed.js'
import { useUserStore } from '@/stores/user.js'
import { pixelAvatar } from '@/utils/pixelAvatar.js'
import { MOODS } from '@shared/constants.js'
import api from '@/api.js'

const feedStore = useFeedStore()
const userStore = useUserStore()

const feedEl = ref(null)
const composeOpen = ref(false)
const composeText = ref('')
const previewSrc = ref(null)
const selectedMood = ref(null)
const moodOpen = ref(false)
const fileInput = ref(null)
const composeTA = ref(null)
const submitting = ref(false)

// Lightbox
const lightboxSrc = ref(null)

// Comments state
const expandedPostId = ref(null)
const comments = ref({})          // { postId: [...] }
const commentCounts = ref({})     // { postId: number }
const commentsLoading = ref({})   // { postId: bool }
const commentDraft = ref({})      // { postId: string }
const replyTarget = ref({})       // { postId: { id, alias } }

// feed 刷新时清空所有评论本地状态，防止悬空 ID
watch(() => feedStore.feedVersion, () => {
  expandedPostId.value = null
  comments.value = {}
  commentCounts.value = {}
  commentsLoading.value = {}
  commentDraft.value = {}
  replyTarget.value = {}
})

// pixel avatar cache
const avatarCache = {}
function getPixelAvatar(userId) {
  if (!avatarCache[userId]) avatarCache[userId] = pixelAvatar(userId, 36)
  return avatarCache[userId]
}

const myPixelAvatar = computed(() => pixelAvatar(userStore.sessionId, 36))

function openCompose() {
  composeOpen.value = true
  nextTick(() => composeTA.value?.focus())
}

function closeCompose() {
  if (submitting.value) return
  composeOpen.value = false
  composeText.value = ''
  previewSrc.value = null
  selectedMood.value = null
  moodOpen.value = false
  if (fileInput.value) fileInput.value.value = ''
}

async function submitPost() {
  if (!composeText.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await feedStore.publish({
      text: composeText.value.trim(),
      mood: selectedMood.value || undefined,
      imageBase64: previewSrc.value || undefined,
    })
    await userStore.fetchMe()
    submitting.value = false
    closeCompose()
  } catch (e) {
    console.error('submitPost failed', e)
    submitting.value = false
  }
}

function onImagePick(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      previewSrc.value = canvas.toDataURL('image/jpeg', 0.82)
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  previewSrc.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function toggleMood(label) {
  selectedMood.value = selectedMood.value === label ? null : label
}

// Comments
async function toggleComments(postId) {
  if (expandedPostId.value === postId) {
    expandedPostId.value = null
    return
  }
  expandedPostId.value = postId
  if (!comments.value[postId]) {
    await loadComments(postId)
  }
}

async function loadComments(postId) {
  commentsLoading.value = { ...commentsLoading.value, [postId]: true }
  try {
    const { data } = await api.get(`/feed/${postId}/comments`)
    comments.value = { ...comments.value, [postId]: data.comments }
    commentCounts.value = { ...commentCounts.value, [postId]: data.comments.length }
  } finally {
    commentsLoading.value = { ...commentsLoading.value, [postId]: false }
  }
}

function topLevelComments(postId) {
  return (comments.value[postId] || []).filter(c => !c.parent_id)
}

function repliesFor(postId, parentId) {
  return (comments.value[postId] || []).filter(c => c.parent_id === parentId)
}

function setReplyTarget(postId, comment) {
  replyTarget.value = { ...replyTarget.value, [postId]: { id: comment.id, alias: comment.alias } }
}

function clearReplyTarget(postId) {
  const t = { ...replyTarget.value }
  delete t[postId]
  replyTarget.value = t
}

async function submitComment(postId) {
  const text = (commentDraft.value[postId] || '').trim()
  if (!text) return
  const savedReplyTarget = replyTarget.value[postId] ?? null
  const parentId = savedReplyTarget?.id ?? null
  commentDraft.value = { ...commentDraft.value, [postId]: '' }
  clearReplyTarget(postId)
  try {
    const { data } = await api.post(`/feed/${postId}/comments`, { text, parentId })
    const list = comments.value[postId] || []
    comments.value = { ...comments.value, [postId]: [...list, data.comment] }
    commentCounts.value = { ...commentCounts.value, [postId]: (commentCounts.value[postId] || 0) + 1 }
  } catch (e) {
    // 失败时恢复草稿和回复目标
    commentDraft.value = { ...commentDraft.value, [postId]: text }
    if (savedReplyTarget) {
      replyTarget.value = { ...replyTarget.value, [postId]: savedReplyTarget }
    }
  }
}

function onScroll() {
  const el = feedEl.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80 && feedStore.hasMore && !feedStore.loading) {
    feedStore.fetchFeed()
  }
}

function relativeTime(ts) {
  if (!ts) return ''
  // New posts: ISO string with Z (UTC). Old posts: "YYYY-MM-DD HH:MM:SS" (CST local).
  const d = ts.includes('Z') || ts.includes('+') ? new Date(ts) : new Date(ts.replace(' ', 'T'))
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}
</script>

<style scoped>
.tab-d { height: 100%; display: flex; flex-direction: column; background: var(--bg); position: relative; overflow: hidden; }

.d-header { padding: 18px 20px 14px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.d-header h2 { font-size: 18px; color: var(--text); font-weight: 500; }
.d-pub-btn { background: var(--d); border: none; border-radius: 20px; padding: 7px 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; color: #fff; font-size: 13px; font-family: var(--font-sans); }

.d-feed { flex: 1; min-height: 0; overflow-y: auto; padding-bottom: 8px; }
.d-feed::-webkit-scrollbar { display: none; }
.d-loading { display: flex; justify-content: center; padding: 40px; }
.d-end { text-align: center; font-size: 12px; color: var(--muted); padding: 16px; }

.post-card { margin: 0 16px 12px; background: var(--card); border-radius: 16px; padding: 16px; border: 0.5px solid var(--border); animation: fadeUp .3s ease; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.post-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.post-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.post-avatar.mystery { background: var(--q-bg); }
.post-avatar.revealed { background: var(--d-bg); }
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.avatar-img.pixel { image-rendering: pixelated; }

.post-meta { flex: 1; }
.post-name { font-size: 13px; color: var(--text); font-weight: 500; }
.post-time { font-size: 11px; color: var(--muted); }
.post-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.post-tag.mystery { color: var(--q); background: var(--q-bg); }
.post-tag.revealed { color: var(--d); background: var(--d-bg); }

.post-img { width: 100%; height: 110px; border-radius: 10px; margin-bottom: 10px; overflow: hidden; cursor: zoom-in; }
.post-img img { width: 100%; height: 100%; object-fit: cover; }

/* Lightbox */
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.92); z-index: 100; display: flex; align-items: center; justify-content: center; }
.lb-img { max-width: 96vw; max-height: 88vh; object-fit: contain; border-radius: 8px; }
.lb-close { position: absolute; top: 20px; right: 20px; width: 36px; height: 36px; background: rgba(255,255,255,.15); border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.lb-close i { font-size: 18px; color: #fff; }
.lb-fade-enter-active, .lb-fade-leave-active { transition: opacity .2s; }
.lb-fade-enter-from, .lb-fade-leave-to { opacity: 0; }
.post-mood { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: #1a1a1a; padding: 3px 9px; border-radius: 10px; color: var(--muted2); margin-bottom: 10px; }
.post-mood i { font-size: 12px; }
.post-text { font-size: 14px; color: var(--text2); line-height: 1.6; margin: 0 0 12px; }

.post-actions { display: flex; gap: 16px; }
.post-action-btn { background: none; border: none; color: var(--muted2); font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0; font-family: var(--font-sans); transition: color .2s; }
.post-action-btn.liked { color: var(--m); }
.post-action-btn.comment-active { color: var(--q); }

/* Comments */
.comments-section { margin-top: 12px; border-top: 0.5px solid var(--border); padding-top: 12px; }
.comments-loading { display: flex; justify-content: center; padding: 12px; }
.no-comments { font-size: 12px; color: var(--muted); text-align: center; padding: 8px 0 12px; }
.comment-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
.comment-avatar { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; image-rendering: pixelated; }
.comment-body { font-size: 13px; line-height: 1.5; }
.comment-alias { color: var(--q); font-size: 11px; margin-right: 6px; }
.comment-text { color: var(--text2); }
.reply-btn { background: none; border: none; color: var(--muted); font-size: 11px; cursor: pointer; padding: 2px 0 0; margin-top: 2px; display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-sans); }
.reply-btn:hover { color: var(--q); }
.reply-btn i { font-size: 11px; }
.reply-row { padding-left: 32px; }
.reply-at { font-size: 11px; color: var(--muted); margin-right: 4px; }
.comment-input-row { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.comment-input-wrap { display: flex; gap: 8px; align-items: flex-end; }
.reply-hint { display: flex; align-items: center; justify-content: space-between; background: #1a1a1a; border-radius: 8px; padding: 4px 10px; font-size: 11px; color: var(--q); }
.reply-cancel { background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; display: flex; align-items: center; }
.reply-cancel i { font-size: 12px; }
.comment-input { flex: 1; background: #1a1a1a; border: 0.5px solid var(--border2); border-radius: 10px; color: var(--text); font-size: 13px; padding: 8px 10px; resize: none; font-family: var(--font-sans); outline: none; line-height: 1.4; }
.comment-input:focus { border-color: var(--q); }
.comment-send { width: 32px; height: 32px; background: var(--q); border: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.comment-send i { font-size: 14px; color: #fff; }

/* Compose */
.compose-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 10; }
.compose-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: var(--card); border-radius: 20px 20px 0 0; border-top: 0.5px solid var(--border2); z-index: 11; }
.compose-top { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 12px; }
.compose-cancel { background: none; border: none; color: var(--muted2); font-size: 13px; cursor: pointer; font-family: var(--font-sans); padding: 0; }
.compose-title { font-size: 14px; color: var(--text); font-weight: 500; }
.compose-submit { background: var(--d); border: none; border-radius: 14px; color: #fff; font-size: 13px; cursor: pointer; font-family: var(--font-sans); padding: 6px 14px; font-weight: 500; }

.compose-body { padding: 0 20px 12px; display: flex; align-items: flex-start; gap: 10px; }
.compose-anon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.compose-anon.mystery { background: var(--q-bg); }
.compose-anon.revealed { background: var(--d-bg); }
.avatar-img-sm { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.avatar-img-sm.pixel { image-rendering: pixelated; }
.compose-right { flex: 1; }
.compose-who { font-size: 12px; color: var(--muted2); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.compose-who.revealed-text { color: var(--d); }
.mystery-badge { font-size: 10px; color: var(--q); background: var(--q-bg); padding: 1px 6px; border-radius: 8px; }
.compose-textarea { width: 100%; background: none; border: none; color: var(--text); font-size: 15px; resize: none; height: 72px; font-family: var(--font-sans); outline: none; line-height: 1.6; }

.img-preview-area { margin: 0 20px 12px; position: relative; }
.img-preview-area img { width: 100%; border-radius: 10px; max-height: 120px; object-fit: cover; }
.img-remove { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; background: rgba(0,0,0,.7); border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.img-remove i { font-size: 13px; color: #fff; }

.mood-picker { padding: 0 20px 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.mood-chip { background: #1a1a1a; border: 0.5px solid var(--border2); border-radius: 16px; padding: 5px 12px; font-size: 12px; color: var(--muted2); cursor: pointer; transition: all .15s; font-family: var(--font-sans); }
.mood-chip.selected { border-color: var(--d); color: var(--d); background: var(--d-bg); }

.compose-toolbar { padding: 12px 20px 16px; display: flex; gap: 10px; align-items: center; border-top: 0.5px solid var(--border); }
.toolbar-btn { background: #1a1a1a; border: 0.5px solid var(--border2); border-radius: 10px; padding: 8px 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text2); font-size: 13px; font-family: var(--font-sans); }
.toolbar-btn.mood-active { border-color: var(--d); color: var(--d); }
.char-count { margin-left: auto; font-size: 12px; color: var(--muted); }

.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity .25s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }
.sheet-slide-enter-active, .sheet-slide-leave-active { transition: transform .25s cubic-bezier(.4,0,.2,1); }
.sheet-slide-enter-from, .sheet-slide-leave-to { transform: translateY(100%); }

.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
