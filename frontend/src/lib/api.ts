import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const api = axios.create({
  baseURL: process.env.API_URL ?? 'http://localhost:3000',
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && process.env.BYPASS_AUTH !== 'true') {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  }
)

export default api
