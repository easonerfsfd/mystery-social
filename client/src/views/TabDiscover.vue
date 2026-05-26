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
        <div class="post-head">
          <div class="post-avatar" :class="post.revealed ? 'revealed' : 'mystery'">
            <img v-if="post.revealed && post.avatar_url" :src="post.avatar_url" class="avatar-img">
            <i v-else-if="post.revealed" class="ti ti-user"></i>
            <i v-else class="ti ti-help"></i>
          </div>
          <div class="post-meta">
            <div class="post-name">{{ post.alias || '神秘用户' }}</div>
            <div class="post-time">{{ relativeTime(post.created_at) }}</div>
          </div>
          <span class="post-tag" :class="post.revealed ? 'revealed' : 'mystery'">
            {{ post.revealed ? '已现身' : '神秘用户' }}
          </span>
        </div>
        <div v-if="post.image_url" class="post-img">
          <img :src="post.image_url" alt="">
        </div>
        <div v-if="post.mood" class="post-mood">
          <i class="ti ti-mood-smile"></i> {{ post.mood }}
        </div>
        <p class="post-text">{{ post.text }}</p>
        <div class="post-actions">
          <button
            class="post-action-btn"
            :class="{ liked: post._liked }"
            @click="feedStore.toggleLike(post.id)"
          >
            <i class="ti ti-heart"></i> {{ post.likes }}
          </button>
        </div>
      </div>
      <div v-if="!feedStore.hasMore && feedStore.posts.length > 0" class="d-end">已经到底了</div>
    </div>

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
          <button class="compose-submit" @click="submitPost">发布</button>
        </div>
        <div class="compose-body">
          <div class="compose-anon" :class="userStore.revealed ? 'revealed' : 'mystery'">
            <img v-if="userStore.revealed && userStore.avatarUrl" :src="userStore.avatarUrl" class="avatar-img-sm">
            <i v-else-if="userStore.revealed" class="ti ti-user"></i>
            <i v-else class="ti ti-help"></i>
          </div>
          <div class="compose-right">
            <div class="compose-who" :class="userStore.revealed ? 'revealed-text' : ''">
              {{ userStore.revealed ? (userStore.alias || '已现身') : '神秘用户 · 匿名发布' }}
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
        <!-- Image preview -->
        <div v-if="previewSrc" class="img-preview-area">
          <img :src="previewSrc" alt="">
          <button class="img-remove" @click="removeImage"><i class="ti ti-x"></i></button>
        </div>
        <!-- Mood picker -->
        <div v-if="moodOpen" class="mood-picker">
          <button
            v-for="m in MOODS" :key="m.label"
            class="mood-chip"
            :class="{ selected: selectedMood === m.label }"
            @click="toggleMood(m.label)"
          >{{ m.emoji }} {{ m.label }}</button>
        </div>
        <!-- Toolbar -->
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
import { ref, nextTick } from 'vue'
import { useFeedStore } from '@/stores/feed.js'
import { useUserStore } from '@/stores/user.js'
import { MOODS } from '../../../../shared/constants.js'

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

function openCompose() {
  composeOpen.value = true
  nextTick(() => composeTA.value?.focus())
}

function closeCompose() {
  composeOpen.value = false
  composeText.value = ''
  previewSrc.value = null
  selectedMood.value = null
  moodOpen.value = false
  if (fileInput.value) fileInput.value.value = ''
}

async function submitPost() {
  if (!composeText.value.trim()) return
  await feedStore.publish({
    text: composeText.value.trim(),
    mood: selectedMood.value || undefined,
    imageBase64: previewSrc.value || undefined,
  })
  closeCompose()
}

function onImagePick(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => { previewSrc.value = ev.target.result }
  reader.readAsDataURL(file)
}

function removeImage() {
  previewSrc.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function toggleMood(label) {
  selectedMood.value = selectedMood.value === label ? null : label
}

function onScroll() {
  const el = feedEl.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80 && feedStore.hasMore && !feedStore.loading) {
    feedStore.fetchFeed()
  }
}

function relativeTime(ts) {
  const diff = (Date.now() - new Date(ts + 'Z').getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}
</script>

<style scoped>
.tab-d { height: 100%; display: flex; flex-direction: column; background: var(--bg); position: relative; overflow: hidden; }

.d-header {
  padding: 18px 20px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.d-header h2 { font-size: 18px; color: var(--text); font-weight: 500; }
.d-pub-btn {
  background: var(--d); border: none; border-radius: 20px; padding: 7px 14px;
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  color: #fff; font-size: 13px; font-family: var(--font-sans);
}

.d-feed { flex: 1; overflow-y: auto; padding-bottom: 8px; }
.d-feed::-webkit-scrollbar { display: none; }
.d-loading { display: flex; justify-content: center; padding: 40px; }
.d-end { text-align: center; font-size: 12px; color: var(--muted); padding: 16px; }

.post-card {
  margin: 0 16px 12px;
  background: var(--card);
  border-radius: 16px;
  padding: 16px;
  border: 0.5px solid var(--border);
  animation: fadeUp .3s ease;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.post-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.post-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  overflow: hidden;
}
.post-avatar.mystery { background: var(--q-bg); }
.post-avatar.mystery i { color: var(--q); font-size: 18px; }
.post-avatar.revealed { background: var(--d-bg); }
.post-avatar.revealed i { color: var(--d); font-size: 18px; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

.post-meta { flex: 1; }
.post-name { font-size: 13px; color: var(--text); font-weight: 500; }
.post-time { font-size: 11px; color: var(--muted); }
.post-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.post-tag.mystery { color: var(--q); background: var(--q-bg); }
.post-tag.revealed { color: var(--d); background: var(--d-bg); }

.post-img { width: 100%; height: 110px; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
.post-img img { width: 100%; height: 100%; object-fit: cover; }
.post-mood { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: #1a1a1a; padding: 3px 9px; border-radius: 10px; color: var(--muted2); margin-bottom: 10px; }
.post-mood i { font-size: 12px; }
.post-text { font-size: 14px; color: var(--text2); line-height: 1.6; margin: 0 0 12px; }

.post-actions { display: flex; gap: 16px; }
.post-action-btn {
  background: none; border: none; color: var(--muted2); font-size: 13px;
  cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0;
  font-family: var(--font-sans); transition: color .2s;
}
.post-action-btn.liked { color: var(--m); }
.post-action-btn.liked i { color: var(--m); }

/* Compose */
.compose-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,.6); z-index: 10;
}
.compose-sheet {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--card); border-radius: 20px 20px 0 0;
  border-top: 0.5px solid var(--border2); z-index: 11;
}
.compose-top { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 12px; }
.compose-cancel { background: none; border: none; color: var(--muted2); font-size: 13px; cursor: pointer; font-family: var(--font-sans); padding: 0; }
.compose-title { font-size: 14px; color: var(--text); font-weight: 500; }
.compose-submit { background: var(--d); border: none; border-radius: 14px; color: #fff; font-size: 13px; cursor: pointer; font-family: var(--font-sans); padding: 6px 14px; font-weight: 500; }

.compose-body { padding: 0 20px 12px; display: flex; align-items: flex-start; gap: 10px; }
.compose-anon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.compose-anon.mystery { background: var(--q-bg); }
.compose-anon.mystery i { color: var(--q); font-size: 17px; }
.compose-anon.revealed { background: var(--d-bg); }
.compose-anon.revealed i { color: var(--d); font-size: 17px; }
.avatar-img-sm { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.compose-right { flex: 1; }
.compose-who { font-size: 12px; color: var(--q); margin-bottom: 8px; }
.compose-who.revealed-text { color: var(--d); }
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
