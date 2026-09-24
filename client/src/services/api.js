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

// Cinephile Twin matching & connection endpoints
export const matchingAPI = {
  toggleOptIn: (matchingEnabled) => api.patch('/matching/opt-in', { matchingEnabled }),
  getCurrentMatch: () => api.get('/matching/current'),
  findMatch: () => api.post('/matching/find'),
  requestConnect: (data) => api.post('/matching/request-connect', data),
  getRequests: () => api.get('/matching/requests'),
  respondRequest: (id, action) => api.post(`/matching/requests/${id}/respond`, { action }),
  cancelRequest: (id) => api.post(`/matching/requests/${id}/cancel`),
  getNextRecommendation: (data) => api.post('/matching/next-recommendation', data),
}

// Conversations & Messaging endpoints
export const conversationAPI = {
  getConversations: () => api.get('/conversations'),
  getMessages: (conversationId, params = {}) =>
    api.get(`/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, text) =>
    api.post(`/conversations/${conversationId}/messages`, { text }),
  markRead: (conversationId) => api.patch(`/conversations/${conversationId}/read`),
  archiveConversation: (conversationId, archive = true) =>
    api.post(`/conversations/${conversationId}/archive`, { archive }),
}

// Safety & Moderation endpoints (Block, Report, Admin triage & Ban)
export const safetyAPI = {
  blockUser: (userId, reason) => api.post(`/users/${userId}/block`, { reason }),
  unblockUser: (userId) => api.post(`/users/${userId}/unblock`),
  getBlockedUsers: () => api.get('/users/blocked'),
  reportUser: (userId, data) => api.post(`/users/${userId}/report`, data),
  getReports: (params = {}) => api.get('/safety/reports', { params }),
  updateReport: (id, data) => api.patch(`/safety/reports/${id}`, data),
  getAdminStats: () => api.get('/safety/stats'),
  banUser: (userId, data = {}) => api.post(`/safety/users/${userId}/ban`, data),
  unbanUser: (userId) => api.post(`/safety/users/${userId}/unban`),
  getBannedUsers: () => api.get('/safety/users/banned'),
}

// Notification endpoints
export const notificationAPI = {
  getNotifications: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

export default api
