<template>
  <div class="tab-m">
    <!-- Profile header -->
    <div class="profile-header">
      <div class="avatar-wrap" :class="userStore.revealed ? 'revealed' : 'mystery'">
        <img
          :src="userStore.avatarUrl || pixelSrc"
          class="avatar-photo"
          :class="{ pixel: !userStore.avatarUrl }"
        >
        <label class="avatar-camera-badge" title="更换头像">
          <i class="ti ti-camera"></i>
          <input type="file" accept="image/*" style="display:none" @change="onAvatarPick">
        </label>
      </div>

      <!-- View mode -->
      <div v-if="!editMode" class="profile-view">
        <div class="display-name">{{ userStore.alias || '神秘用户' }}</div>
        <div v-if="userStore.bio" class="display-bio">{{ userStore.bio }}</div>
        <div class="display-status">
          {{ userStore.revealed ? '已现身' : '神秘用户' }} · 加入于{{ joinedDays }}天前
        </div>
        <button v-if="!userStore.revealed" class="reveal-btn" @click="doReveal">解除隐身 →</button>
        <button v-else class="edit-profile-btn" @click="openEdit">
          <i class="ti ti-edit"></i> 编辑资料
        </button>
      </div>

      <!-- Edit mode -->
      <div v-else class="profile-edit">
        <div class="edit-field">
          <div class="edit-label">昵称</div>
          <input v-model="editAlias" class="edit-input" type="text" placeholder="你的名字">
        </div>
        <div class="edit-field">
          <div class="edit-label">简介</div>
          <textarea v-model="editBio" class="edit-textarea" placeholder="写点什么..."></textarea>
        </div>
        <div class="edit-actions">
          <button class="btn-cancel-edit" @click="editMode = false">取消</button>
          <button class="btn-save" @click="saveProfile">保存资料</button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-cell">
        <div class="stat-num">{{ userStore.stats.posts }}</div>
        <div class="stat-label">动态</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">{{ userStore.stats.likes }}</div>
        <div class="stat-label">获赞</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num purple">{{ userStore.stats.answers }}</div>
        <div class="stat-label">改变过问题</div>
      </div>
    </div>

    <!-- My posts -->
    <div class="my-posts">
      <div class="section-label">我的动态</div>
      <div v-if="myPosts.length === 0 && !loadingPosts" class="no-posts">还没有发布过动态</div>
      <div v-for="post in myPosts" :key="post.id" class="my-post-card">
        <p class="my-post-text">{{ post.text }}</p>
        <div class="my-post-footer">
          <span class="my-post-time">{{ relativeTime(post.created_at) }}</span>
          <div class="my-post-counts">
            <span><i class="ti ti-heart"></i> {{ post.likes }}</span>
            <button class="my-post-delete" @click="deletePost(post.id)">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback -->
    <div class="feedback-wrap">
      <div class="feedback-card">
        <div class="feedback-head">
          <i class="ti ti-message-report"></i>
          <span>建议反馈</span>
        </div>
        <div v-if="!feedbackSent">
          <textarea v-model="feedbackText" class="feedback-textarea" placeholder="告诉我们你的想法，或者遇到的问题..."></textarea>
          <button class="feedback-btn" @click="submitFeedback">提交反馈</button>
        </div>
        <div v-else class="feedback-sent">
          <i class="ti ti-check"></i>
          <p>感谢你的反馈，我们会认真看的</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { useFeedStore } from '@/stores/feed.js'
import { pixelAvatar } from '@/utils/pixelAvatar.js'
import api from '@/api.js'

const userStore = useUserStore()
const feedStore = useFeedStore()

const editMode = ref(false)
const editAlias = ref('')
const editBio = ref('')
const myPosts = ref([])
const loadingPosts = ref(false)
const feedbackText = ref('')
const feedbackSent = ref(false)

const pixelSrc = computed(() => pixelAvatar(userStore.sessionId, 72))

const joinedDays = computed(() => {
  if (!userStore.joinedAt) return 0
  const diff = Date.now() - new Date(userStore.joinedAt + 'Z').getTime()
  return Math.max(1, Math.floor(diff / 86400000))
})

onMounted(fetchMyPosts)
watch(() => userStore.stats.posts, fetchMyPosts)

async function fetchMyPosts() {
  loadingPosts.value = true
  try {
    const { data } = await api.get('/me/posts')
    myPosts.value = data.posts
  } catch (e) {
    console.error('fetchMyPosts failed', e)
  } finally {
    loadingPosts.value = false
  }
}

function openEdit() {
  editAlias.value = userStore.alias
  editBio.value = userStore.bio
  editMode.value = true
}

async function saveProfile() {
  try {
    await userStore.updateProfile({ alias: editAlias.value, bio: editBio.value })
    editMode.value = false
  } catch (e) {
    console.error('saveProfile failed', e)
  }
}

async function doReveal() {
  try {
    await userStore.reveal()
  } catch (e) {
    console.error('reveal failed', e)
  }
}

async function onAvatarPick(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async ev => {
    try {
      await userStore.uploadAvatar(ev.target.result)
    } catch (e) {
      console.error('uploadAvatar failed', e)
    }
  }
  reader.readAsDataURL(file)
}

async function submitFeedback() {
  if (!feedbackText.value.trim()) return
  feedbackSent.value = true
  try {
    await api.post('/feedback', { text: feedbackText.value.trim() })
  } catch (e) {
    // 即使接口不存在也不影响 UI 感知
  }
}

async function deletePost(id) {
  try {
    await api.delete(`/feed/${id}`)
    myPosts.value = myPosts.value.filter(p => p.id !== id)
    feedStore.removePost(id)
    await userStore.fetchMe()
  } catch (e) {
    console.error('deletePost failed', e)
  }
}

function relativeTime(ts) {
  if (!ts) return ''
  const d = ts.includes('Z') || ts.includes('+') ? new Date(ts) : new Date(ts.replace(' ', 'T'))
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}
</script>

<style scoped>
.tab-m { height: 100%; overflow-y: auto; background: var(--bg); position: relative; }
.tab-m::-webkit-scrollbar { display: none; }

.profile-header { padding: 24px 20px 20px; text-align: center; border-bottom: 0.5px solid #1a1a1a; }

.avatar-wrap {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px; cursor: pointer; position: relative; overflow: visible;
}
.avatar-wrap.mystery { background: transparent; }
.avatar-wrap.revealed { background: transparent; }
.avatar-photo { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; position: absolute; top: 0; left: 0; }
.avatar-photo.pixel { image-rendering: pixelated; }
.avatar-camera-badge {
  position: absolute; bottom: 0; right: 0;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--m); border: 2px solid var(--bg);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.avatar-camera-badge i { font-size: 11px; color: #fff; }

.profile-view { }
.display-name { font-size: 17px; color: var(--text); font-weight: 500; margin-bottom: 4px; }
.display-bio { font-size: 12px; color: var(--muted2); margin-bottom: 4px; }
.display-status { font-size: 12px; color: var(--muted); margin-bottom: 18px; }
.reveal-btn { background: none; border: 0.5px solid var(--q); color: var(--q); border-radius: 20px; padding: 8px 22px; font-size: 13px; cursor: pointer; font-family: var(--font-sans); }
.edit-profile-btn { background: none; border: 0.5px solid var(--d); color: var(--d); border-radius: 20px; padding: 8px 22px; font-size: 13px; cursor: pointer; font-family: var(--font-sans); display: inline-flex; align-items: center; gap: 6px; }

.profile-edit { text-align: left; }
.edit-field { margin-bottom: 10px; }
.edit-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
.edit-input { width: 100%; background: var(--card); border: 0.5px solid var(--border2); border-radius: 10px; color: var(--text); font-size: 14px; padding: 10px 12px; outline: none; font-family: var(--font-sans); }
.edit-input:focus { border-color: var(--d); }
.edit-textarea { width: 100%; background: var(--card); border: 0.5px solid var(--border2); border-radius: 10px; color: var(--text); font-size: 14px; padding: 10px 12px; outline: none; font-family: var(--font-sans); resize: none; height: 56px; line-height: 1.5; }
.edit-textarea:focus { border-color: var(--d); }
.edit-actions { display: flex; gap: 8px; margin-top: 14px; }
.btn-cancel-edit { flex: 1; background: none; border: 0.5px solid var(--border2); border-radius: 10px; color: var(--muted2); font-size: 13px; padding: 9px; cursor: pointer; font-family: var(--font-sans); }
.btn-save { flex: 2; background: var(--d); border: none; border-radius: 10px; color: #fff; font-size: 13px; padding: 9px; cursor: pointer; font-family: var(--font-sans); font-weight: 500; }

.stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 0.5px solid #1a1a1a; }
.stat-cell { padding: 16px; text-align: center; }
.stat-cell:not(:last-child) { border-right: 0.5px solid #1a1a1a; }
.stat-num { font-size: 20px; color: var(--text); font-weight: 500; }
.stat-num.purple { color: var(--q); }
.stat-label { font-size: 11px; color: var(--muted); margin-top: 3px; }

.my-posts { padding: 16px 20px 0; }
.section-label { font-size: 12px; color: var(--muted); margin-bottom: 12px; letter-spacing: .5px; }
.no-posts { font-size: 13px; color: var(--muted); text-align: center; padding: 20px 0; }
.my-post-card { background: var(--card); border-radius: 12px; padding: 14px; margin-bottom: 10px; border: 0.5px solid var(--border); }
.my-post-text { font-size: 14px; color: var(--text2); margin: 0 0 10px; line-height: 1.5; }
.my-post-footer { display: flex; justify-content: space-between; align-items: center; }
.my-post-time { font-size: 11px; color: var(--muted); }
.my-post-counts { display: flex; gap: 12px; align-items: center; }
.my-post-counts span { font-size: 12px; color: var(--muted2); }
.my-post-delete { background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; display: flex; align-items: center; }
.my-post-delete:hover { color: var(--m); }
.my-post-delete i { font-size: 13px; }

.feedback-wrap { padding: 16px 20px 28px; }
.feedback-card { background: var(--card); border-radius: 14px; padding: 16px; border: 0.5px solid var(--border); }
.feedback-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.feedback-head i { font-size: 16px; color: var(--q); }
.feedback-head span { font-size: 14px; color: var(--text); font-weight: 500; }
.feedback-textarea { width: 100%; background: #1a1a1a; border: 0.5px solid #222; border-radius: 10px; color: var(--text2); font-size: 13px; padding: 10px 12px; resize: none; height: 72px; font-family: var(--font-sans); outline: none; line-height: 1.5; margin-bottom: 10px; }
.feedback-textarea:focus { border-color: var(--q); }
.feedback-btn { width: 100%; background: none; border: 0.5px solid var(--q); border-radius: 10px; color: var(--q); font-size: 13px; padding: 9px; cursor: pointer; font-family: var(--font-sans); }
.feedback-sent { text-align: center; padding: 10px 0; }
.feedback-sent i { font-size: 20px; color: var(--d); }
.feedback-sent p { font-size: 13px; color: var(--d); margin-top: 6px; }
</style>
