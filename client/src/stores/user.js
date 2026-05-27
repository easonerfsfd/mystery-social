import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { sessionId } from '@/api.js'

export const useUserStore = defineStore('user', () => {
  const sessionIdVal = sessionId
  const alias = ref('')
  const bio = ref('')
  const avatarUrl = ref(null)
  const revealed = ref(false)
  const stats = ref({ posts: 0, likes: 0, answers: 0 })
  const joinedAt = ref('')
  const loaded = ref(false)
  const unreadLikes = ref(0)

  async function fetchMe() {
    const { data } = await api.get('/me')
    alias.value = data.alias
    bio.value = data.bio
    avatarUrl.value = data.avatar
    revealed.value = data.revealed
    stats.value = data.stats
    joinedAt.value = data.joinedAt
    unreadLikes.value = data.unreadLikes || 0
    loaded.value = true
  }

  async function ackLikes() {
    if (unreadLikes.value === 0) return
    unreadLikes.value = 0
    await api.post('/me/ack-likes').catch(() => {})
  }

  async function updateProfile(payload) {
    const { data } = await api.patch('/me', payload)
    alias.value = data.user.alias
    bio.value = data.user.bio
  }

  async function uploadAvatar(imageBase64) {
    const { data } = await api.post('/me/avatar', { imageBase64 })
    avatarUrl.value = data.avatarUrl
  }

  async function reveal() {
    await api.post('/me/reveal')
    revealed.value = true
  }

  return { sessionId: sessionIdVal, alias, bio, avatarUrl, revealed, stats, joinedAt, loaded, unreadLikes, fetchMe, ackLikes, updateProfile, uploadAvatar, reveal }
})
