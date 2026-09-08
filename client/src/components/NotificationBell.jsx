import { useState, useEffect, useRef, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { notificationAPI } from '../services/api'

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const BellIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const MessageIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const RequestIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
)

const CheckCircleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const CheckAllIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L7 17l-5-5" />
    <path d="M22 10l-7.5 7.5L13 16" />
  </svg>
)

// ─── Animations & Styled Components ──────────────────────────────────────────

const fadeSlide = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`

const pulse = keyframes`
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
`

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const BellButton = styled.button`
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: transparent;
  color: #555;
  border: 1.5px solid #eaeaea;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    color: #ff751f;
    border-color: #ff751f;
    background: rgba(255, 117, 31, 0.05);
    transform: scale(1.05);
  }

  &.active {
    color: #ff751f;
    border-color: #ff751f;
  }
`

const Badge = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 10px;
  background: #ff751f;
  color: #fff;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  animation: ${pulse} 2s infinite ease-in-out;
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 320px;
  max-width: 90vw;
  background: #ffffff;
  border: 1.5px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  animation: ${fadeSlide} 0.18s ease;
  z-index: 120;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
`

const Title = styled.h4`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  letter-spacing: 0.04em;
`

const MarkAllBtn = styled.button`
  background: none;
  border: none;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #ff751f;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0;
  font-weight: 500;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
    text-decoration: none;
  }
`

const NotificationList = styled.div`
  max-height: 360px;
  overflow-y: auto;
  padding: 0.25rem 0;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 4px;
  }
`

const Item = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f8f8f8;
  cursor: pointer;
  background: ${(props) => (props.$isRead ? '#ffffff' : '#fff9f5')};
  transition: background 0.15s ease;

  &:hover {
    background: #f5f5f5;
  }

  &:last-child {
    border-bottom: none;
  }
`

const IconBox = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${(props) => {
    switch (props.$type) {
      case 'new_message':
        return '#eef6ff';
      case 'connection_request':
        return '#fff0f5';
      case 'connection_accepted':
        return '#f0fdf4';
      default:
        return '#f4f4f5';
    }
  }};
  color: ${(props) => {
    switch (props.$type) {
      case 'new_message':
        return '#2563eb';
      case 'connection_request':
        return '#db2777';
      case 'connection_accepted':
        return '#16a34a';
      default:
        return '#71717a';
    }
  }};
`

const Content = styled.div`
  flex: 1;
  min-width: 0;
`

const ItemTitle = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.76rem;
  font-weight: ${(props) => (props.$isRead ? '500' : '700')};
  color: #111;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ItemBody = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.71rem;
  color: #666;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const ItemMeta = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #999;
  margin-top: 4px;
`

const UnreadDot = styled.div`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff751f;
  flex-shrink: 0;
  margin-top: 5px;
`

const EmptyState = styled.div`
  padding: 2.5rem 1rem;
  text-align: center;
  color: #888;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
`

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount()
      if (res.data?.success) {
        setUnreadCount(res.data.unreadCount || 0)
      }
    } catch (e) {}
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationAPI.getNotifications({ limit: 20 })
      if (res.data?.success) {
        setNotifications(res.data.notifications || [])
        setUnreadCount(res.data.unreadCount || 0)
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll unread count every 12 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 12000)

    const handleFocus = () => fetchUnreadCount()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchUnreadCount])

  // Open dropdown & fetch notifications list
  const handleToggle = () => {
    if (!open) {
      fetchNotifications()
    }
    setOpen((prev) => !prev)
  }

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (e) {}
  }

  const handleItemClick = async (notif) => {
    // Mark as read in state & backend
    if (!notif.isRead) {
      try {
        await notificationAPI.markRead(notif.notificationId)
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notif.notificationId
              ? { ...n, isRead: true, readAt: new Date() }
              : n
          )
        )
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch (e) {}
    }

    setOpen(false)

    // Navigate to appropriate route
    if (notif.type === 'new_message' || notif.type === 'connection_accepted') {
      const convId = notif.data?.conversationId
      if (convId) {
        navigate(`/messages?conv=${convId}`)
      } else {
        navigate('/messages')
      }
    } else if (notif.type === 'connection_request') {
      navigate('/twin')
    }
  }

  return (
    <Wrapper ref={ref}>
      <BellButton
        id="notification-bell-btn"
        className={open ? 'active' : ''}
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <BellIcon size={16} />
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
      </BellButton>

      {open && (
        <Dropdown role="dialog" aria-label="Notifications menu">
          <Header>
            <Title>Notifications</Title>
            <MarkAllBtn onClick={handleMarkAllRead} disabled={unreadCount === 0}>
              <CheckAllIcon size={12} />
              mark all read
            </MarkAllBtn>
          </Header>

          <NotificationList>
            {loading && notifications.length === 0 ? (
              <EmptyState>Loading alerts...</EmptyState>
            ) : notifications.length === 0 ? (
              <EmptyState>No notifications yet</EmptyState>
            ) : (
              notifications.map((notif) => (
                <Item
                  key={notif.notificationId}
                  $isRead={notif.isRead}
                  onClick={() => handleItemClick(notif)}
                >
                  <IconBox $type={notif.type}>
                    {notif.type === 'new_message' ? (
                      <MessageIcon size={13} />
                    ) : notif.type === 'connection_request' ? (
                      <RequestIcon size={13} />
                    ) : (
                      <CheckCircleIcon size={13} />
                    )}
                  </IconBox>

                  <Content>
                    <ItemTitle $isRead={notif.isRead}>{notif.title}</ItemTitle>
                    <ItemBody>{notif.body}</ItemBody>
                    <ItemMeta>{formatTimeAgo(notif.createdAt)}</ItemMeta>
                  </Content>

                  {!notif.isRead && <UnreadDot />}
                </Item>
              ))
            )}
          </NotificationList>
        </Dropdown>
      )}
    </Wrapper>
  )
}
