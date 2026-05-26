import axios from 'axios'

let sessionId = localStorage.getItem('session_id')
if (!sessionId) {
  sessionId = crypto.randomUUID()
  localStorage.setItem('session_id', sessionId)
}

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  config.headers['X-Session-Id'] = sessionId
  return config
})

export { sessionId }
export default api
