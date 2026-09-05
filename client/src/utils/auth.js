/**
 * Parse JWT token safely on client.
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
 */
export function getAuthStatus() {
  const token = localStorage.getItem('token');
  if (!token) {
    return { isAuthenticated: false, tasteProfileComplete: false, user: null };
  }

  const decoded = parseJwt(token);

  // Check expiration if present
  if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { isAuthenticated: false, tasteProfileComplete: false, user: null };
  }

  let tasteProfileComplete = false;
  if (decoded && decoded.tasteProfileComplete !== undefined) {
    tasteProfileComplete = !!decoded.tasteProfileComplete;
  }

  let user = null;
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      user = JSON.parse(storedUser);
      if (user.tasteProfileComplete !== undefined) {
        tasteProfileComplete = tasteProfileComplete || !!user.tasteProfileComplete;
      }
    }
  } catch (e) {}

  return {
    isAuthenticated: true,
    tasteProfileComplete,
    user,
    decoded,
  };
}
