import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Automatically attach and manage httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/')
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('filmism_taste_clusters')
      localStorage.removeItem('filmism_ai_synthesis')
      window.dispatchEvent(new Event('filmism_auth_update'))
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
}

// Cinephile Twin matching endpoints
export const matchingAPI = {
  toggleOptIn: (matchingEnabled) => api.patch('/matching/opt-in', { matchingEnabled }),
  getCurrentMatch: () => api.get('/matching/current'),
  findMatch: () => api.post('/matching/find'),
}

export default api
