import axios from 'axios'

function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

function saveSession(id) {
  try { localStorage.setItem('session_id', id) } catch {}
  // Cookie 1年有效，即使 localStorage 被清也能恢复
  document.cookie = `session_id=${encodeURIComponent(id)}; max-age=${365 * 24 * 3600}; path=/; SameSite=Lax`
}

// localStorage → cookie → 新生成，三层保障
let sessionId = localStorage.getItem('session_id') || getCookie('session_id')
if (!sessionId) sessionId = genUUID()
saveSession(sessionId)

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  config.headers['X-Session-Id'] = sessionId
  return config
})

export { sessionId }
export default api
