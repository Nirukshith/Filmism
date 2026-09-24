/**
 * Parse JWT token safely on client (if token string is available).
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Check active user authentication and taste profile completion status.
 * Session token is stored securely in an httpOnly cookie;
 * User metadata in localStorage reflects active UI state.
 */
export function getAuthStatus() {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    return { isAuthenticated: false, tasteProfileComplete: false, user: null };
  }

  try {
    const user = JSON.parse(storedUser);
    if (!user || (!user._id && !user.id)) {
      localStorage.removeItem('user');
      return { isAuthenticated: false, tasteProfileComplete: false, user: null };
    }

    return {
      isAuthenticated: true,
      tasteProfileComplete: !!user.tasteProfileComplete,
      user,
    };
  } catch (e) {
    localStorage.removeItem('user');
    return { isAuthenticated: false, tasteProfileComplete: false, user: null };
  }
}
