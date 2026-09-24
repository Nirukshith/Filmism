import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthStatus } from '../utils/auth'

/**
 * Route guard enforcing:
 * 1. Admin privileges (requireAdmin = true)
 * 2. Post-login taste profile completion routing for normal users:
 *    - tasteProfileComplete: false -> redirected to /taste
 *    - tasteProfileComplete: true  -> redirected to /recommend (dashboard)
 */
export function ProtectedRoute({ children, requireComplete = true, requireAdmin = false }) {
  const location = useLocation()
  const { isAuthenticated, tasteProfileComplete, user } = getAuthStatus()

  // 1. If requireAdmin is true:
  if (requireAdmin) {
    if (!isAuthenticated) {
      return <Navigate to="/login?returnTo=/admin" replace />
    }
    if (user?.role !== 'admin') {
      return <Navigate to="/recommend" replace />
    }
    return children
  }

  // Allow guests to explore onboarding/recommendations if not logged in
  if (!isAuthenticated) {
    return children
  }

  // Admins do not have taste profiles, watchlists, or cinephile twin features -> route to /admin
  if (user?.role === 'admin') {
    const consumerRoutes = ['/recommend', '/watchlist', '/diary', '/twin', '/cinephile-twin', '/taste', '/messages']
    if (consumerRoutes.includes(location.pathname)) {
      return <Navigate to="/admin" replace />
    }
    return children
  }

  // If page requires completed taste profile, but user hasn't completed it -> go to /taste
  if (requireComplete && !tasteProfileComplete) {
    return <Navigate to="/taste" replace />
  }

  // If user is on /taste onboarding but has already completed profile and is NOT in continue/recalibrate mode -> go to /recommend
  if (location.pathname === '/taste' && !requireComplete && tasteProfileComplete) {
    const searchParams = new URLSearchParams(location.search)
    const isContinuing = searchParams.get('mode') === 'continue' || searchParams.has('recalibrate')
    if (!isContinuing) {
      return <Navigate to="/recommend" replace />
    }
  }

  return children
}

export default ProtectedRoute
