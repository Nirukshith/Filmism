import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthStatus } from '../utils/auth'

/**
 * Route guard enforcing post-login taste profile completion routing:
 * - tasteProfileComplete: false -> redirected to /taste
 * - tasteProfileComplete: true  -> redirected to /recommend (dashboard)
 */
export function ProtectedRoute({ children, requireComplete = true }) {
  const location = useLocation()
  const { isAuthenticated, tasteProfileComplete } = getAuthStatus()

  // Allow guests to explore onboarding/recommendations if not logged in
  if (!isAuthenticated) {
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
