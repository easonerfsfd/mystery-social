import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api.js'

export const useFeedStore = defineStore('feed', () => {
  const posts = ref([])
  const hasMore = ref(true)
  const page = ref(1)
  const loading = ref(false)
  const feedVersion = ref(0)  // increments on full reset; TabDiscover watches this to clear comment state

  async function fetchFeed(reset = false) {
    if (loading.value) return
    if (reset) {
      page.value = 1
      posts.value = []
      hasMore.value = true
      feedVersion.value++
    }
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
    if (!post || post._liked) return  // 防重复点赞
    post.likes++
    post._liked = true
    try {
      await api.patch(`/feed/${postId}/like`)
    } catch {
      post.likes--
      post._liked = false
    }
  }

  function removePost(postId) {
    posts.value = posts.value.filter(p => p.id !== postId)
  }

  return { posts, hasMore, loading, feedVersion, fetchFeed, publish, toggleLike, removePost }
})
