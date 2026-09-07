import { useState, useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { useNavigate, Link } from 'react-router-dom'
import { getAuthStatus } from '../utils/auth'
import { authAPI } from '../services/api'

// ─── Minimalist SVG Dropdown Icons ───────────────────────────────────────────

const DashboardIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
)

const WatchlistIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const DiaryIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

const SettingsIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const LogoutIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const fadeSlide = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`

const Wrapper = styled.div`
  position: relative;
`

const AvatarBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #111;
  color: #fff;
  border: 2px solid transparent;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, transform 0.15s;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
  &:hover { border-color: #ff751f; transform: scale(1.06); }
`

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.12);
  overflow: hidden;
  animation: ${fadeSlide} 0.18s ease;
  z-index: 100;
`

const DropHeader = styled.div`
  padding: 0.9rem 1rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
`

const DropName = styled.p`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DropEmail = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #999;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DropMenu = styled.nav`
  padding: 0.4rem 0;
`

const DropItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 1rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #333;
  text-decoration: none;
  text-transform: lowercase;
  transition: background 0.15s;
  &:hover { 
    background: #f6f6f6; 
    color: #111; 

    span.icon {
      color: #ff751f;
      opacity: 1;
    }
  }
  span.icon { 
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px; 
    color: #666;
    opacity: 0.85; 
    transition: color 0.15s ease, opacity 0.15s ease;
  }
`

const DropDivider = styled.hr`
  border: none;
  border-top: 1px solid #f0f0f0;
  margin: 0.3rem 0;
`

const SignOutBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 1rem;
  background: none;
  border: none;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #c0392b;
  text-align: left;
  text-transform: lowercase;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: #fff5f5; }
  span.icon { font-size: 0.95rem; width: 18px; text-align: center; opacity: 0.8; }
`

function UserAvatar() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(() => getAuthStatus().user)

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getAuthStatus().user)
    }
    window.addEventListener('storage', handleAuthChange)
    window.addEventListener('filmism_auth_update', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleAuthChange)
      window.removeEventListener('filmism_auth_update', handleAuthChange)
    }
  }, [])

  const firstName = currentUser?.firstName || ''
  const lastName = currentUser?.lastName || ''
  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?'
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User'
  const email = currentUser?.email || ''
  const profilePicture = currentUser?.profilePicture || null

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSignOut = async () => {
    try {
      await authAPI.logout()
    } catch (e) {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('filmism_is_returning_user')
    window.dispatchEvent(new Event('filmism_auth_update'))
    navigate('/')
  }

  return (
    <Wrapper ref={ref}>
      <AvatarBtn
        id="user-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        aria-expanded={open}
      >
        {profilePicture ? (
          <AvatarImg src={profilePicture} alt={fullName} />
        ) : (
          initials
        )}
      </AvatarBtn>

      {open && (
        <Dropdown role="menu" aria-label="User menu">
          <DropHeader>
            <DropName>{fullName}</DropName>
            {email && <DropEmail>{email}</DropEmail>}
          </DropHeader>
          <DropMenu>
            <DropItem to="/recommend" onClick={() => setOpen(false)} role="menuitem">
              <span className="icon"><DashboardIcon size={14} /></span>
              dashboard
            </DropItem>
            <DropItem to="/watchlist" onClick={() => setOpen(false)} role="menuitem">
              <span className="icon"><WatchlistIcon size={14} /></span>
              watchlist
            </DropItem>
            <DropItem to="/diary" onClick={() => setOpen(false)} role="menuitem">
              <span className="icon"><DiaryIcon size={14} /></span>
              film logs
            </DropItem>
            <DropItem to="/settings" onClick={() => setOpen(false)} role="menuitem">
              <span className="icon"><SettingsIcon size={14} /></span>
              settings
            </DropItem>
          </DropMenu>
          <DropDivider />
          <SignOutBtn onClick={handleSignOut} role="menuitem">
            <span className="icon"><LogoutIcon size={14} /></span>
            sign out
          </SignOutBtn>
        </Dropdown>
      )}
    </Wrapper>
  )
}

export default UserAvatar
