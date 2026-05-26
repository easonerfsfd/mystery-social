import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api.js'

export const useFeedStore = defineStore('feed', () => {
  const posts = ref([])
  const hasMore = ref(true)
  const page = ref(1)
  const loading = ref(false)

  async function fetchFeed(reset = false) {
    if (loading.value) return
    if (reset) { page.value = 1; posts.value = []; hasMore.value = true }
    loading.value = true
    try {
      const { data } = await api.get('/feed', { params: { page: page.value } })
      posts.value = reset ? data.posts : [...posts.value, ...data.posts]
      hasMore.value = data.hasMore
      page.value++
    } finally {
      loading.value = false
    }
  }

  async function publish(payload) {
    const { data } = await api.post('/feed', payload)
    posts.value.unshift(data.post)
    return data.post
  }

  async function toggleLike(postId) {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    post.likes++
    post._liked = true
    try {
      await api.patch(`/feed/${postId}/like`)
    } catch {
      post.likes--
      post._liked = false
    }
  }

  return { posts, hasMore, loading, fetchFeed, publish, toggleLike }
})
