import { useState, useEffect, useRef, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link, useSearchParams } from 'react-router-dom'
import { conversationAPI, matchingAPI, safetyAPI } from '../services/api'
import UserAvatar from '../components/UserAvatar'
import ReportModal from '../components/ReportModal'
import BlockConfirmModal from '../components/BlockConfirmModal'

// ─── Icons ───────────────────────────────────────────────────────────────────

const SendIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const ShieldAlertIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const BlockIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
)

const CheckIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const XIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ─── Styled Components ────────────────────────────────────────────────────────

const PageWrapper = styled.main`
  width: 100%;
  height: 100vh;
  background: #efefef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Topbar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.75rem;
  border-bottom: 1.5px solid #ddd;
  background: #efefef;
  flex-shrink: 0;
  z-index: 30;
`

const Logo = styled(Link)`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.01em;
  text-decoration: none;
`

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
`

const NavLink = styled(Link)`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: #444;
  text-decoration: none;
  text-transform: lowercase;
  transition: color 0.15s;
  &:hover {
    color: #ff751f;
  }
`

const ChatLayout = styled.div`
  flex: 1;
  display: flex;
  max-width: 1380px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem 1.75rem 1.5rem;
  gap: 1.25rem;
  overflow: hidden;

  @media (max-width: 820px) {
    padding: 0.5rem;
    gap: 0;
  }
`

const Sidebar = styled.aside`
  width: 340px;
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 820px) {
    width: 100%;
    display: ${({ $hasActiveChat }) => ($hasActiveChat ? 'none' : 'flex')};
  }
`

const SidebarHeader = styled.div`
  padding: 1.1rem 1.25rem 0.75rem;
  border-bottom: 1.5px solid #f0f0f0;
`

const SidebarTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.1rem;
  color: #111;
  margin: 0 0 0.75rem;
`

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
`

const TabBtn = styled.button`
  flex: 1;
  padding: 0.45rem 0.5rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${({ $active }) => ($active ? '#111' : '#f5f5f5')};
  color: ${({ $active }) => ($active ? '#fff' : '#666')};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;

  &:hover {
    background: ${({ $active }) => ($active ? '#111' : '#ebebeb')};
  }
`

const Badge = styled.span`
  background: #ff751f;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.38rem;
  border-radius: 10px;
`

const ListScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

const ConvItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.15rem;
  background: ${({ $selected }) => ($selected ? '#fdf8f5' : '#fff')};
  border: none;
  border-bottom: 1px solid #f2f2f2;
  border-left: 3px solid ${({ $selected }) => ($selected ? '#ff751f' : 'transparent')};
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${({ $selected }) => ($selected ? '#fdf8f5' : '#fafafa')};
  }
`

const AvatarPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #222;
  color: #fff;
  font-family: 'Lemon Milk', sans-serif;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ConvInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const ConvNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
`

const ConvName = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: ${({ $unread }) => ($unread ? '700' : '600')};
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ConvTime = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #999;
  flex-shrink: 0;
`

const ConvSnippet = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: ${({ $unread }) => ($unread ? '#111' : '#777')};
  font-weight: ${({ $unread }) => ($unread ? '600' : '400')};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const EmptySidebar = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  color: #888;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
`

// ─── Request Cards in Sidebar ───

const RequestCard = styled.div`
  padding: 1rem 1.15rem;
  border-bottom: 1.5px solid #f2f2f2;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: #fafafa;
`

const ReqTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ReqName = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #111;
`

const SimScoreBadge = styled.span`
  font-family: 'Lemon Milk', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: #ff751f;
  background: rgba(255, 117, 31, 0.1);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
`

const ReqMessage = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #555;
  margin: 0;
  font-style: italic;
  background: #fff;
  padding: 0.45rem 0.6rem;
  border-radius: 4px;
  border: 1px solid #eee;
`

const ReqActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
`

const ReqBtn = styled.button`
  flex: 1;
  padding: 0.4rem 0.5rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  transition: opacity 0.15s;

  ${({ $variant }) =>
    $variant === 'accept'
      ? `background: #ff751f; color: #fff; &:hover { background: #e6600c; }`
      : `background: #e4e4e4; color: #444; &:hover { background: #d8d8d8; }`}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// ─── Main Chat Pane ───

const MainChat = styled.section`
  flex: 1;
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 820px) {
    display: ${({ $hasActiveChat }) => ($hasActiveChat ? 'flex' : 'none')};
  }
`

const ChatHeader = styled.header`
  padding: 0.9rem 1.25rem;
  border-bottom: 1.5px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fafafa;
`

const PartnerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const BackBtn = styled.button`
  display: none;
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #444;
  cursor: pointer;
  padding: 0.2rem;

  @media (max-width: 820px) {
    display: block;
  }
`

const PartnerName = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.95rem;
  color: #111;
  margin: 0;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const SafetyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fff;
  color: ${({ $variant }) => ($variant === 'danger' ? '#c0392b' : '#555')};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${({ $variant }) => ($variant === 'danger' ? '#fdf5f5' : '#f5f5f5')};
    border-color: ${({ $variant }) => ($variant === 'danger' ? '#c0392b' : '#bbb')};
  }
`

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #fdfdfd;
`

const EmptyMessages = styled.div`
  margin: auto;
  text-align: center;
  color: #888;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  max-width: 320px;
  line-height: 1.5;
`

const MessageBubble = styled.div`
  max-width: 68%;
  align-self: ${({ $isMe }) => ($isMe ? 'flex-end' : 'flex-start')};
  background: ${({ $isMe }) => ($isMe ? '#111' : '#f2f2f2')};
  color: ${({ $isMe }) => ($isMe ? '#fff' : '#111')};
  padding: 0.65rem 0.95rem;
  border-radius: ${({ $isMe }) =>
    $isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.83rem;
  line-height: 1.45;
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const MessageTime = styled.span`
  display: block;
  font-size: 0.62rem;
  opacity: 0.65;
  margin-top: 0.3rem;
  text-align: ${({ $isMe }) => ($isMe ? 'right' : 'left')};
`

const ChatInputArea = styled.form`
  padding: 0.85rem 1.25rem;
  border-top: 1.5px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fff;
`

const Input = styled.input`
  flex: 1;
  padding: 0.65rem 0.95rem;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  background: #fafafa;
  color: #111;
  outline: none;

  &:focus {
    border-color: #ff751f;
    background: #fff;
  }
`

const SendButton = styled.button`
  padding: 0.65rem 1.1rem;
  background: #ff751f;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #e6600c;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const BlockedBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const BlockedBanner = styled.div`
  padding: 0.95rem 1.4rem;
  border-top: 1.5px solid #fee2e2;
  background: #fffafa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const BlockedText = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span.icon {
    display: inline-flex;
    color: #dc2626;
  }

  strong {
    color: #7f1d1d;
  }
`

const UnblockButton = styled.button`
  padding: 0.5rem 1rem;
  background: #111827;
  color: #fff;
  border: 1.5px solid #111827;
  border-radius: 6px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #ff751f;
    border-color: #ff751f;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const EmptySelection = styled.div`
  margin: auto;
  text-align: center;
  padding: 2rem;
`

const EmptyIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`

const EmptyTitle = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.1rem;
  color: #111;
  margin: 0 0 0.5rem;
`

const EmptySub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #777;
  max-width: 320px;
  margin: 0 auto 1.5rem;
  line-height: 1.5;
`

const TwinBtn = styled(Link)`
  display: inline-block;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  background: #ff751f;
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.15s;

  &:hover {
    background: #e6600c;
  }
`

// ─── Component Implementation ─────────────────────────────────────────────────

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialConvId = searchParams.get('conversationId')

  const [activeTab, setActiveTab] = useState('conversations') // 'conversations' | 'requests'
  const [conversations, setConversations] = useState([])
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] })
  const [activeConvId, setActiveConvId] = useState(initialConvId || null)
  const [activePartner, setActivePartner] = useState(null)
  const [activeConvBlockStatus, setActiveConvBlockStatus] = useState({
    isBlocked: false,
    isBlockedByMe: false,
    isBlockedByPartner: false,
    canMessage: true,
  })
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loadingConv, setLoadingConv] = useState(true)
  const [sending, setSending] = useState(false)
  const [unblocking, setUnblocking] = useState(false)

  // Safety Modals State
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)

  const messagesEndRef = useRef(null)
  const currentUserIdRef = useRef(null)

  // Get current authenticated user ID
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      if (user?._id || user?.id) {
        currentUserIdRef.current = (user._id || user.id).toString()
      }
    } catch (e) {}
  }, [])

  // 1. Fetch Conversations and Requests
  const loadSidebarData = useCallback(async () => {
    try {
      const [convRes, reqRes] = await Promise.all([
        conversationAPI.getConversations(),
        matchingAPI.getRequests(),
      ])

      if (convRes.data?.conversations) {
        setConversations(convRes.data.conversations)
      }
      if (reqRes.data) {
        setRequests({
          incoming: reqRes.data.incoming || [],
          outgoing: reqRes.data.outgoing || [],
        })
      }
    } catch (err) {
      console.error('Failed to load conversations or requests:', err)
    } finally {
      setLoadingConv(false)
    }
  }, [])

  useEffect(() => {
    loadSidebarData()
  }, [loadSidebarData])

  // 2. Fetch Active Conversation Messages & Setup Tab-Aware Polling
  const fetchMessages = useCallback(
    async (isPolling = false) => {
      if (!activeConvId) return

      try {
        const lastMsg = messages[messages.length - 1]
        const params = isPolling && lastMsg?.messageId ? { after: lastMsg.messageId } : {}

        const res = await conversationAPI.getMessages(activeConvId, params)

        if (res.data?.partner) {
          setActivePartner(res.data.partner)
        }

        if (res.data) {
          setActiveConvBlockStatus({
            isBlocked: Boolean(res.data.isBlocked),
            isBlockedByMe: Boolean(res.data.isBlockedByMe),
            isBlockedByPartner: Boolean(res.data.isBlockedByPartner),
            canMessage: res.data.canMessage !== false && !res.data.isBlocked,
          })
        }

        if (res.data?.messages) {
          if (isPolling) {
            if (res.data.messages.length > 0) {
              setMessages((prev) => [...prev, ...res.data.messages])
            }
          } else {
            setMessages(res.data.messages)
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
      }
    },
    [activeConvId, messages]
  )

  // Initial load when activeConvId changes
  useEffect(() => {
    if (activeConvId) {
      fetchMessages(false)
      // Update query param
      setSearchParams({ conversationId: activeConvId })
    }
  }, [activeConvId])

  // Polling Effect (3.5s interval, paused on tab blur)
  useEffect(() => {
    if (!activeConvId) return

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMessages(true)
      }
    }, 3500)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages(true)
        loadSidebarData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeConvId, fetchMessages, loadSidebarData])

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 3. Send Message Handler
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || !activeConvId || sending || activeConvBlockStatus.isBlocked) return

    const textToSend = inputText.trim()
    setInputText('')
    setSending(true)

    // Optimistic UI update
    const tempId = 'temp_' + Date.now()
    const optimisticMsg = {
      messageId: tempId,
      sender: currentUserIdRef.current,
      text: textToSend,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await conversationAPI.sendMessage(activeConvId, textToSend)
      if (res.data?.message) {
        // Replace optimistic message with actual message
        setMessages((prev) =>
          prev.map((m) => (m.messageId === tempId ? res.data.message : m))
        )
      }
      loadSidebarData()
    } catch (err) {
      console.error('Failed to send message:', err)
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.messageId !== tempId))
    } finally {
      setSending(false)
    }
  }

  // 4. Request Action Handlers (Accept / Decline)
  const handleRespondRequest = async (requestId, action) => {
    try {
      const res = await matchingAPI.respondRequest(requestId, action)
      await loadSidebarData()
      if (action === 'accept' && res.data?.conversationId) {
        setActiveConvId(res.data.conversationId)
        setActiveTab('conversations')
      }
    } catch (err) {
      console.error('Error responding to request:', err)
    }
  }

  // 5. Block / Unblock / Report Handlers
  const handleUserBlocked = () => {
    setActiveConvBlockStatus({
      isBlocked: true,
      isBlockedByMe: true,
      isBlockedByPartner: false,
      canMessage: false,
    })
    loadSidebarData()
    fetchMessages(false)
  }

  const handleUnblockActiveUser = async () => {
    if (!activePartner?.userId) return
    setUnblocking(true)
    try {
      await safetyAPI.unblockUser(activePartner.userId)
      setActiveConvBlockStatus({
        isBlocked: false,
        isBlockedByMe: false,
        isBlockedByPartner: false,
        canMessage: true,
      })
      await Promise.all([fetchMessages(false), loadSidebarData()])
    } catch (err) {
      console.error('Failed to unblock user:', err)
    } finally {
      setUnblocking(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <PageWrapper>
      <Topbar>
        <Logo to="/recommend">FILMISM</Logo>
        <TopbarRight>
          <NavLink to="/recommend">Dashboard</NavLink>
          <NavLink to="/twin">Cinephile Twin</NavLink>
          <NavLink to="/diary">Diary</NavLink>
          <UserAvatar />
        </TopbarRight>
      </Topbar>

      <ChatLayout>
        {/* Left Sidebar: Conversations & Incoming Requests */}
        <Sidebar $hasActiveChat={Boolean(activeConvId)}>
          <SidebarHeader>
            <SidebarTitle>Messages</SidebarTitle>
            <TabRow>
              <TabBtn
                $active={activeTab === 'conversations'}
                onClick={() => setActiveTab('conversations')}
                id="conversations-tab-btn"
              >
                Chats {conversations.length > 0 && `(${conversations.length})`}
              </TabBtn>
              <TabBtn
                $active={activeTab === 'requests'}
                onClick={() => setActiveTab('requests')}
                id="requests-tab-btn"
              >
                Requests{' '}
                {requests.incoming.length > 0 && (
                  <Badge>{requests.incoming.length}</Badge>
                )}
              </TabBtn>
            </TabRow>
          </SidebarHeader>

          <ListScroll>
            {activeTab === 'conversations' ? (
              conversations.length === 0 ? (
                <EmptySidebar>
                  No active conversations yet.<br />Connect with your Cinephile Twin to start talking!
                </EmptySidebar>
              ) : (
                conversations.map((conv) => {
                  const initials = (conv.partner?.firstName?.[0] || 'C').toUpperCase()
                  const isSelected = activeConvId === conv.conversationId

                  return (
                    <ConvItem
                      key={conv.conversationId}
                      $selected={isSelected}
                      onClick={() => {
                        setActiveConvId(conv.conversationId)
                        setActivePartner(conv.partner)
                      }}
                    >
                      <AvatarPlaceholder>
                        {conv.partner?.profilePicture ? (
                          <img src={conv.partner.profilePicture} alt="" />
                        ) : (
                          initials
                        )}
                      </AvatarPlaceholder>
                      <ConvInfo>
                        <ConvNameRow>
                          <ConvName $unread={conv.hasUnread}>
                            {conv.partner?.firstName || 'Twin'}
                          </ConvName>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {conv.isBlocked && (
                              <BlockedBadge>
                                {conv.isBlockedByMe ? 'Blocked' : 'Unavailable'}
                              </BlockedBadge>
                            )}
                            <ConvTime>{formatTime(conv.lastMessageAt)}</ConvTime>
                          </div>
                        </ConvNameRow>
                        <ConvSnippet $unread={conv.hasUnread}>
                          {conv.isBlockedByMe
                            ? '🚫 You have blocked this user'
                            : conv.isBlocked
                            ? '🚫 This conversation is blocked'
                            : conv.lastMessage?.text || 'Connected! Say hello.'}
                        </ConvSnippet>
                      </ConvInfo>
                      {conv.hasUnread && !conv.isBlocked && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#ff751f',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </ConvItem>
                  )
                })
              )
            ) : requests.incoming.length === 0 ? (
              <EmptySidebar>No pending connection requests.</EmptySidebar>
            ) : (
              requests.incoming.map((req) => (
                <RequestCard key={req.requestId}>
                  <ReqTopRow>
                    <ReqName>{req.fromUser?.firstName || 'Cinephile'}</ReqName>
                    {req.similarityScore && (
                      <SimScoreBadge>{req.similarityScore}% match</SimScoreBadge>
                    )}
                  </ReqTopRow>
                  {req.message && <ReqMessage>"{req.message}"</ReqMessage>}
                  <ReqActionRow>
                    <ReqBtn
                      $variant="accept"
                      onClick={() => handleRespondRequest(req.requestId, 'accept')}
                    >
                      <CheckIcon size={12} /> Accept
                    </ReqBtn>
                    <ReqBtn
                      $variant="decline"
                      onClick={() => handleRespondRequest(req.requestId, 'decline')}
                    >
                      <XIcon size={12} /> Decline
                    </ReqBtn>
                  </ReqActionRow>
                </RequestCard>
              ))
            )}
          </ListScroll>
        </Sidebar>

        {/* Right Main Pane: Active Chat */}
        <MainChat $hasActiveChat={Boolean(activeConvId)}>
          {activeConvId ? (
            <>
              <ChatHeader>
                <PartnerHeader>
                  <BackBtn onClick={() => setActiveConvId(null)} aria-label="Back to conversations">
                    ←
                  </BackBtn>
                  <AvatarPlaceholder style={{ width: 34, height: 34, fontSize: '0.75rem' }}>
                    {activePartner?.profilePicture ? (
                      <img src={activePartner.profilePicture} alt="" />
                    ) : (
                      (activePartner?.firstName?.[0] || 'C').toUpperCase()
                    )}
                  </AvatarPlaceholder>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <PartnerName>{activePartner?.firstName || 'Cinephile Twin'}</PartnerName>
                      {activeConvBlockStatus.isBlocked && (
                        <BlockedBadge>
                          {activeConvBlockStatus.isBlockedByMe ? 'Blocked by you' : 'Blocked'}
                        </BlockedBadge>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#888', fontFamily: 'Lexend Deca, sans-serif' }}>
                      Cinephile Twin Connection
                    </span>
                  </div>
                </PartnerHeader>

                {/* Direct Safety Buttons */}
                <HeaderActions>
                  {activeConvBlockStatus.isBlockedByMe ? (
                    <SafetyBtn
                      onClick={handleUnblockActiveUser}
                      disabled={unblocking}
                      title="Unblock this user to message them"
                      id="unblock-user-header-btn"
                    >
                      <CheckIcon size={13} /> {unblocking ? 'Unblocking...' : 'Unblock'}
                    </SafetyBtn>
                  ) : (
                    <>
                      <SafetyBtn
                        onClick={() => setShowReportModal(true)}
                        title="Report user for abusive or inappropriate behavior"
                        id="report-user-btn"
                      >
                        <ShieldAlertIcon size={13} /> Report
                      </SafetyBtn>
                      <SafetyBtn
                        $variant="danger"
                        onClick={() => setShowBlockModal(true)}
                        title="Block this user"
                        id="block-user-btn"
                      >
                        <BlockIcon size={13} /> Block
                      </SafetyBtn>
                    </>
                  )}
                </HeaderActions>
              </ChatHeader>

              <MessagesContainer>
                {messages.length === 0 ? (
                  <EmptyMessages>
                    This is the beginning of your conversation with <strong>{activePartner?.firstName || 'your twin'}</strong>.
                    <br />
                    Share your latest film discoveries and discuss recommendations!
                  </EmptyMessages>
                ) : (
                  messages.map((m, idx) => {
                    const isMe =
                      m.sender?.toString() === currentUserIdRef.current ||
                      m.sender?._id?.toString() === currentUserIdRef.current

                    return (
                      <MessageBubble key={m.messageId || idx} $isMe={isMe}>
                        <div>{m.text}</div>
                        <MessageTime $isMe={isMe}>{formatTime(m.createdAt)}</MessageTime>
                      </MessageBubble>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </MessagesContainer>

              {/* Chat Input or Blocked Banner */}
              {activeConvBlockStatus.isBlockedByMe ? (
                <BlockedBanner>
                  <BlockedText>
                    <span className="icon"><BlockIcon size={16} /></span>
                    <span>
                      You have blocked <strong>{activePartner?.firstName || 'this user'}</strong>. Unblock them to send a message.
                    </span>
                  </BlockedText>
                  <UnblockButton
                    onClick={handleUnblockActiveUser}
                    disabled={unblocking}
                    id="unblock-user-input-btn"
                  >
                    <CheckIcon size={13} />
                    {unblocking ? 'Unblocking...' : 'Unblock User'}
                  </UnblockButton>
                </BlockedBanner>
              ) : activeConvBlockStatus.isBlockedByPartner ? (
                <BlockedBanner>
                  <BlockedText>
                    <span className="icon"><BlockIcon size={16} /></span>
                    <span>You cannot send messages to this conversation.</span>
                  </BlockedText>
                </BlockedBanner>
              ) : (
                <ChatInputArea onSubmit={handleSendMessage}>
                  <Input
                    type="text"
                    placeholder={`Message ${activePartner?.firstName || 'your twin'}...`}
                    value={inputText}
                    maxLength={1000}
                    onChange={(e) => setInputText(e.target.value)}
                    autoFocus
                    id="chat-message-input"
                  />
                  <SendButton
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    id="send-message-btn"
                  >
                    <SendIcon size={15} /> Send
                  </SendButton>
                </ChatInputArea>
              )}
            </>
          ) : (
            <EmptySelection>
              <EmptyIcon>💬</EmptyIcon>
              <EmptyTitle>Your Cinephile Inbox</EmptyTitle>
              <EmptySub>
                Select a conversation from the sidebar, accept pending connection requests, or explore your taste twin.
              </EmptySub>
              <TwinBtn to="/twin">Find Cinephile Twin</TwinBtn>
            </EmptySelection>
          )}
        </MainChat>
      </ChatLayout>

      {/* Safety Modals */}
      {showReportModal && (
        <ReportModal
          targetUser={activePartner}
          conversationId={activeConvId}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showBlockModal && (
        <BlockConfirmModal
          targetUser={activePartner}
          onClose={() => setShowBlockModal(false)}
          onBlocked={handleUserBlocked}
        />
      )}
    </PageWrapper>
  )
}
