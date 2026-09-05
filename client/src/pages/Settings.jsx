import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getAuthStatus } from '../utils/auth'
import { useTasteProfile } from '../hooks/useTasteProfile'
import UserAvatar from '../components/UserAvatar'

// ─── Professional SVG Icons ───────────────────────────────────────────────────

const UserIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const LockIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const ShieldAlertIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const EditIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const SettingsGearIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ff751f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

// ─── Styled Components ────────────────────────────────────────────────────────

const PageWrapper = styled.main`
  width: 100%;
  min-height: 100vh;
  background: #efefef;
  display: flex;
  flex-direction: column;
`

const Topbar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.75rem;
  border-bottom: 1.5px solid #ddd;
  background: #efefef;
  position: sticky;
  top: 0;
  z-index: 30;
`

const Logo = styled.span`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.01em;
  user-select: none;
  cursor: default;
`

const PageBody = styled.div`
  flex: 1;
  padding: 1.25rem 2rem 4.5rem;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 1rem 1rem 4.5rem; }
`

const Breadcrumb = styled.nav`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.76rem;
  color: #888;
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  a {
    color: #666;
    text-decoration: none;
    &:hover { color: #ff751f; text-decoration: underline; }
  }

  span.active {
    color: #111;
    font-weight: 600;
  }
`

const HeaderSection = styled.div`
  margin-bottom: 1.75rem;
`

const PageHeading = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 2.6vw, 2.1rem);
  font-weight: 700;
  color: #111;
  margin: 0 0 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;

  span.icon {
    font-size: 1.5rem;
    color: #ff751f;
  }
`

const PageSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.84rem;
  color: #666;
  margin: 0;
`

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.75rem;
  align-items: flex-start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`

// ─── Left Sidebar Tabs ───

const SidebarTabs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 12px;
  padding: 0.6rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);

  @media (max-width: 860px) {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.5rem;
  }
`

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: none;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  background: ${({ $active }) => ($active ? '#111827' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#4b5563')};
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  white-space: nowrap;

  span.icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${({ $active }) => ($active ? '#ff751f' : '#9ca3af')};
    transition: color 0.15s ease;
  }

  &:hover {
    background: ${({ $active }) => ($active ? '#111827' : '#f3f4f6')};
    color: ${({ $active }) => ($active ? '#fff' : '#111')};

    span.icon {
      color: ${({ $active }) => ($active ? '#ff751f' : '#111')};
    }
  }
`

// ─── Right Content Area ───

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

// Hero Profile Banner
const HeroBanner = styled.div`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d1b2a 100%);
  border-radius: 14px;
  padding: 2rem 2.2rem;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.15);
  display: flex;
  align-items: center;
  gap: 1.5rem;

  &::after {
    content: '';
    position: absolute;
    right: -40px;
    top: -40px;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(255,117,31,0.18) 0%, rgba(255,117,31,0) 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.5rem;
  }
`

const HeroAvatarWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
`

const HeroAvatar = styled.div`
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: #fff;
  color: #111;
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3.5px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
`

const OnlineBadge = styled.span`
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #10b981;
  border: 2.5px solid #0f172a;
`

const HeroDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 0.35rem;
  z-index: 1;
`

const HeroName = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.3rem, 2.2vw, 1.75rem);
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.1;
  letter-spacing: 0.02em;
  text-align: left;
`

const HeroBadges = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.15rem;
`

const HeroBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ $accent }) => ($accent ? 'rgba(255, 117, 31, 0.16)' : 'rgba(255, 255, 255, 0.08)')};
  color: ${({ $accent }) => ($accent ? '#ff9d5c' : '#cbd5e1')};
  border: 1px solid ${({ $accent }) => ($accent ? 'rgba(255, 117, 31, 0.32)' : 'rgba(255, 255, 255, 0.14)')};
  display: inline-flex;
  align-items: center;
  line-height: 1.3;
`

// Information Grid
const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.div`
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.35rem 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #f0f0f0;
`

const CardTitle = styled.h3`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #888;
  margin: 0;
`

const DataRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.85rem;

  &:last-child {
    margin-bottom: 0;
  }
`

const DataLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #999;
`

const DataValue = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  color: #111;
`

// Quick Actions
const QuickActionsCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
`

const ActionPillBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.65rem 1rem;
  background: #f8fafc;
  color: #1e293b;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  span.icon { color: #ff751f; font-size: 0.95rem; }

  &:hover {
    background: #fff;
    border-color: #ff751f;
    color: #ff751f;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0,0,0,0.04);
  }
`

const PrimaryEditBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.7rem 1.4rem;
  background: #111827;
  color: #fff;
  border: 1.5px solid #111827;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  transition: all 0.2s;

  &:hover {
    background: #ff751f;
    border-color: #ff751f;
  }
`

// Form Styles
const FormSection = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const Label = styled.label`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
  color: #444;
  text-transform: lowercase;
  letter-spacing: 0.04em;
`

const Input = styled.input`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #111;
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
  outline: none;
  transition: all 0.2s;
  width: 100%;

  &::placeholder { color: #bbb; }
  &:focus {
    background: #fff;
    border-color: #ff751f;
    box-shadow: 0 0 0 3px rgba(255, 117, 31, 0.12);
  }
`

const FormActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const SaveBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.6rem 1.3rem;
  background: #111827;
  color: #fff;
  border: 1.5px solid #111827;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #ff751f;
    border-color: #ff751f;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const CancelBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.6rem 1.1rem;
  background: transparent;
  color: #666;
  border: 1.5px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #111;
    border-color: #999;
  }
`

const DangerCard = styled(Card)`
  border: 1.5px solid #fecaca;
  background: #fffafa;
`

const DangerTitle = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1rem;
  color: #991b1b;
  margin: 0 0 0.4rem;
`

const DangerDesc = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #7f1d1d;
  line-height: 1.45;
  margin: 0 0 1rem;
`

const DangerActionBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.6rem 1.2rem;
  background: #dc2626;
  color: #fff;
  border: 1.5px solid #dc2626;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) { background: #b91c1c; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const ErrorText = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  color: #dc2626;
`

const SuccessText = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  color: #16a34a;
`

const OtpBox = styled.div`
  background: #fdfaf7;
  border: 1.5px solid #fed7aa;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-top: 0.5rem;
`

const OtpNote = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #78350f;
  margin: 0 0 0.75rem;

  span { color: #ff751f; font-weight: 700; }
`

// ─── Main Component ───────────────────────────────────────────────────────────

function Settings() {
  const navigate = useNavigate()
  const { user } = getAuthStatus()
  const { tasteClusters } = useTasteProfile()

  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'security' | 'taste' | 'danger'
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Name state
  const [name, setName] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '' })
  const [nameStatus, setNameStatus] = useState({ loading: false, error: '', success: '' })

  // Email state
  const [email, setEmail] = useState(user?.email || '')
  const [emailStatus, setEmailStatus] = useState({ loading: false, error: '', success: '', pendingVerify: false, pendingEmail: '' })
  const [emailOtp, setEmailOtp] = useState('')
  const [otpStatus, setOtpStatus] = useState({ loading: false, error: '', success: '' })

  // Password state
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [pwdStatus, setPwdStatus] = useState({ loading: false, error: '', success: '' })

  // Reset & stats state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetStatus, setResetStatus] = useState({ loading: false, error: '', success: '' })
  const [cinemaStats, setCinemaStats] = useState({ watchlistCount: 0, diaryCount: 0 })

  const activePersonasCount = tasteClusters?.length || 0
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Film Enthusiast'
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'FP'
  const userIdentifier = `FILM-${(user?._id || '0000').slice(-4).toUpperCase()}`

  // Fetch summary stats for display
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const sessionId = localStorage.getItem('filmism_session_id') || undefined
        const [wRes, dRes] = await Promise.allSettled([
          api.get('/recommendations/watchlist', { params: { sessionId } }),
          api.get('/recommendations/diary', { params: { sessionId } }),
        ])
        const watchlistCount = wRes.status === 'fulfilled' ? (wRes.value.data?.watchlist?.length || 0) : 0
        const diaryCount = dRes.status === 'fulfilled' ? (dRes.value.data?.diary?.length || 0) : 0
        setCinemaStats((prev) => ({ ...prev, watchlistCount, diaryCount }))
      } catch (e) { }
    }
    fetchStats()
  }, [])

  // ── Reset & Close Profile Editor ──
  const handleCloseEditor = () => {
    setIsEditingProfile(false)
    setName({ firstName: user?.firstName || '', lastName: user?.lastName || '' })
    setEmail(user?.email || '')
    setNameStatus({ loading: false, error: '', success: '' })
    setEmailStatus({ loading: false, error: '', success: '', pendingVerify: false, pendingEmail: '' })
    setEmailOtp('')
    setOtpStatus({ loading: false, error: '', success: '' })
  }

  // ── Cancel Pending Email Change ──
  const handleCancelEmailChange = () => {
    setEmail(user?.email || '')
    setEmailStatus({ loading: false, error: '', success: '', pendingVerify: false, pendingEmail: '' })
    setEmailOtp('')
    setOtpStatus({ loading: false, error: '', success: '' })
  }

  // ── Save Name ──
  const handleSaveName = async () => {
    if (!name.firstName.trim() || !name.lastName.trim()) {
      setNameStatus({ loading: false, error: 'Both fields are required.', success: '' })
      return
    }
    setNameStatus({ loading: true, error: '', success: '' })
    try {
      const res = await api.patch('/auth/profile', { firstName: name.firstName, lastName: name.lastName })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data))
      setNameStatus({ loading: false, error: '', success: 'Name updated successfully.' })
    } catch (err) {
      setNameStatus({ loading: false, error: err.response?.data?.message || 'Failed to update name.', success: '' })
    }
  }

  // ── Save Email ──
  const handleSaveEmail = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setEmailStatus({ ...emailStatus, error: 'Enter a valid email address.', success: '' })
      return
    }
    if (email.toLowerCase() === user?.email) {
      setEmailStatus({ ...emailStatus, error: 'That is already your current email.', success: '' })
      return
    }
    setEmailStatus({ loading: true, error: '', success: '', pendingVerify: false, pendingEmail: '' })
    try {
      const res = await api.patch('/auth/profile', { email })
      if (res.data.emailChangePending) {
        setEmailStatus({ loading: false, error: '', success: '', pendingVerify: true, pendingEmail: res.data.pendingEmail })
      } else {
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data))
        setEmailStatus({ loading: false, error: '', success: 'Email updated.', pendingVerify: false, pendingEmail: '' })
      }
    } catch (err) {
      setEmailStatus({ loading: false, error: err.response?.data?.message || 'Failed to update email.', success: '', pendingVerify: false, pendingEmail: '' })
    }
  }

  // ── Verify OTP for Email Change ──
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim() || emailOtp.length !== 6) {
      setOtpStatus({ loading: false, error: 'Enter the 6-digit verification code.', success: '' })
      return
    }
    setOtpStatus({ loading: true, error: '', success: '' })
    try {
      const res = await api.post('/auth/verify-email-change', { otp: emailOtp })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data))
      setEmailStatus({ loading: false, error: '', success: `Email changed to ${res.data.email}.`, pendingVerify: false, pendingEmail: '' })
      setEmailOtp('')
      setOtpStatus({ loading: false, error: '', success: '' })
    } catch (err) {
      setOtpStatus({ loading: false, error: err.response?.data?.message || 'Invalid or expired code.', success: '' })
    }
  }

  // ── Save Password ──
  const handleSavePassword = async () => {
    if (!pwd.current || !pwd.new || !pwd.confirm) {
      setPwdStatus({ loading: false, error: 'All password fields are required.', success: '' })
      return
    }
    if (pwd.new !== pwd.confirm) {
      setPwdStatus({ loading: false, error: 'New passwords do not match.', success: '' })
      return
    }
    if (pwd.new.length < 8) {
      setPwdStatus({ loading: false, error: 'New password must be at least 8 characters.', success: '' })
      return
    }
    if (!/[A-Z]/.test(pwd.new)) {
      setPwdStatus({ loading: false, error: 'New password must contain at least one uppercase letter.', success: '' })
      return
    }
    if (!/[^A-Za-z0-9]/.test(pwd.new)) {
      setPwdStatus({ loading: false, error: 'New password must contain at least one special character.', success: '' })
      return
    }
    setPwdStatus({ loading: true, error: '', success: '' })
    try {
      const res = await api.patch('/auth/profile', { currentPassword: pwd.current, newPassword: pwd.new })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data))
      setPwd({ current: '', new: '', confirm: '' })
      setPwdStatus({ loading: false, error: '', success: 'Password changed successfully.' })
    } catch (err) {
      setPwdStatus({ loading: false, error: err.response?.data?.message || 'Failed to change password.', success: '' })
    }
  }

  // ── Reset Taste Profile ──
  const handleResetTasteProfile = async () => {
    setResetStatus({ loading: true, error: '', success: '' })
    try {
      const res = await api.post('/auth/reset-taste')
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data))
      }
      setResetStatus({ loading: false, error: '', success: 'Taste profile reset. Redirecting to onboarding...' })
      setTimeout(() => {
        navigate('/taste')
      }, 900)
    } catch (err) {
      setResetStatus({ loading: false, error: err.response?.data?.message || 'Failed to reset taste profile.', success: '' })
    }
  }

  return (
    <PageWrapper>
      <Topbar>
        <Logo>Filmism</Logo>
        <UserAvatar />
      </Topbar>

      <PageBody>
        <Breadcrumb>
          <Link to="/recommend">Dashboard</Link>
          <span>›</span>
          <span className="active">Settings</span>
        </Breadcrumb>

        <HeaderSection>
          <PageHeading>
            <span className="icon"><SettingsGearIcon size={22} /></span> Settings
          </PageHeading>
          <PageSub>
            Manage your profile, cinematic preferences and account settings
          </PageSub>
        </HeaderSection>

        <LayoutGrid>
          {/* Left Tabs */}
          <SidebarTabs>
            <TabButton
              $active={activeTab === 'profile'}
              onClick={() => { setActiveTab('profile'); handleCloseEditor(); }}
            >
              <span className="icon"><UserIcon size={16} /></span> Profile
            </TabButton>
            <TabButton
              $active={activeTab === 'security'}
              onClick={() => { setActiveTab('security'); handleCloseEditor(); }}
            >
              <span className="icon"><LockIcon size={16} /></span> Security
            </TabButton>
            <TabButton
              $active={activeTab === 'danger'}
              onClick={() => setActiveTab('danger')}
            >
              <span className="icon"><ShieldAlertIcon size={16} /></span> Reset Profile
            </TabButton>
          </SidebarTabs>

          {/* Right Content */}
          <ContentArea>
            {/* ── TAB 1: PROFILE ── */}
            {activeTab === 'profile' && (
              <>
                {/* Hero Banner */}
                <HeroBanner>
                  <HeroAvatarWrapper>
                    <HeroAvatar>{initials}</HeroAvatar>
                    <OnlineBadge />
                  </HeroAvatarWrapper>
                  <HeroDetails>
                    <HeroName>{fullName}</HeroName>
                    <HeroBadges>
                      <HeroBadge $accent={true}>Cinephile</HeroBadge>
                      <HeroBadge>ID: #{userIdentifier}</HeroBadge>
                      <HeroBadge>{activePersonasCount > 0 ? `${activePersonasCount} Personas Active` : 'Active Taste Profile'}</HeroBadge>
                    </HeroBadges>
                  </HeroDetails>
                </HeroBanner>

                {/* Information Grid */}
                <InfoGrid>
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Info</CardTitle>
                    </CardHeader>
                    <DataRow>
                      <DataLabel>Email</DataLabel>
                      <DataValue>{user?.email || 'Not configured'}</DataValue>
                    </DataRow>
                    <DataRow>
                      <DataLabel>Full Name</DataLabel>
                      <DataValue>{fullName}</DataValue>
                    </DataRow>
                    <DataRow>
                      <DataLabel>Account Status</DataLabel>
                      <DataValue style={{ color: '#10b981' }}>● Verified Cinephile</DataValue>
                    </DataRow>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Cinema Stats</CardTitle>
                    </CardHeader>
                    <DataRow>
                      <DataLabel>Watchlist</DataLabel>
                      <DataValue>{cinemaStats.watchlistCount} films saved</DataValue>
                    </DataRow>
                    <DataRow>
                      <DataLabel>Film Logs</DataLabel>
                      <DataValue>{cinemaStats.diaryCount} films logged</DataValue>
                    </DataRow>
                  </Card>
                </InfoGrid>

                {/* Quick Actions */}
                {!isEditingProfile && (
                  <PrimaryEditBtn onClick={() => {
                    setName({ firstName: user?.firstName || '', lastName: user?.lastName || '' })
                    setEmail(user?.email || '')
                    setEmailStatus({ loading: false, error: '', success: '', pendingVerify: false, pendingEmail: '' })
                    setEmailOtp('')
                    setOtpStatus({ loading: false, error: '', success: '' })
                    setNameStatus({ loading: false, error: '', success: '' })
                    setIsEditingProfile(true)
                  }}>
                    <EditIcon size={14} /> Edit Profile Information
                  </PrimaryEditBtn>
                )}

                {/* Inline Profile Edit Form */}
                {isEditingProfile && (
                  <FormSection>
                    <CardHeader>
                      <CardTitle>Edit Account Information</CardTitle>
                    </CardHeader>

                    <Field>
                      <Label htmlFor="editFirstName">first name</Label>
                      <Input
                        id="editFirstName"
                        value={name.firstName}
                        onChange={(e) => setName((p) => ({ ...p, firstName: e.target.value }))}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="editLastName">last name</Label>
                      <Input
                        id="editLastName"
                        value={name.lastName}
                        onChange={(e) => setName((p) => ({ ...p, lastName: e.target.value }))}
                      />
                    </Field>
                    {nameStatus.error && <ErrorText>{nameStatus.error}</ErrorText>}
                    {nameStatus.success && <SuccessText>{nameStatus.success}</SuccessText>}
                    <SaveBtn onClick={handleSaveName} disabled={nameStatus.loading}>
                      {nameStatus.loading ? 'Saving...' : 'Save Name'}
                    </SaveBtn>

                    <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '0.5rem 0' }} />

                    <Field>
                      <Label htmlFor="editEmail">email address</Label>
                      <Input
                        id="editEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Field>
                    {emailStatus.error && <ErrorText>{emailStatus.error}</ErrorText>}
                    {emailStatus.success && <SuccessText>{emailStatus.success}</SuccessText>}

                    {!emailStatus.pendingVerify && (
                      <SaveBtn onClick={handleSaveEmail} disabled={emailStatus.loading}>
                        {emailStatus.loading ? 'Saving...' : 'Change Email'}
                      </SaveBtn>
                    )}

                    {emailStatus.pendingVerify && (
                      <OtpBox>
                        <OtpNote>
                          A verification code was sent to <span>{emailStatus.pendingEmail}</span>. Enter it below:
                        </OtpNote>
                        <Field>
                          <Label htmlFor="otpInput">6-digit code</Label>
                          <Input
                            id="otpInput"
                            maxLength={6}
                            value={emailOtp}
                            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="_ _ _ _ _ _"
                          />
                        </Field>
                        {otpStatus.error && <ErrorText>{otpStatus.error}</ErrorText>}
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.5rem' }}>
                          <SaveBtn onClick={handleVerifyEmailOtp} disabled={otpStatus.loading}>
                            {otpStatus.loading ? 'Verifying...' : 'Verify & Confirm'}
                          </SaveBtn>
                          <CancelBtn type="button" onClick={handleCancelEmailChange} style={{ padding: '0.65rem 1rem', fontSize: '0.78rem' }}>
                            Cancel Change
                          </CancelBtn>
                        </div>
                      </OtpBox>
                    )}

                    <FormActionsRow>
                      <CancelBtn onClick={handleCloseEditor}>
                        Close Editor
                      </CancelBtn>
                    </FormActionsRow>
                  </FormSection>
                )}
              </>
            )}

            {/* ── TAB 2: SECURITY ── */}
            {activeTab === 'security' && (
              <FormSection>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <Field>
                  <Label htmlFor="currentPwd">current password</Label>
                  <Input
                    id="currentPwd"
                    type="password"
                    value={pwd.current}
                    onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                    placeholder="Your current password"
                  />
                </Field>
                <Field>
                  <Label htmlFor="newPwd">new password</Label>
                  <Input
                    id="newPwd"
                    type="password"
                    value={pwd.new}
                    onChange={(e) => setPwd((p) => ({ ...p, new: e.target.value }))}
                    placeholder="Min. 8 chars, 1 uppercase, 1 special char"
                  />
                </Field>
                <Field>
                  <Label htmlFor="confirmPwd">confirm new password</Label>
                  <Input
                    id="confirmPwd"
                    type="password"
                    value={pwd.confirm}
                    onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                </Field>
                {pwdStatus.error && <ErrorText>{pwdStatus.error}</ErrorText>}
                {pwdStatus.success && <SuccessText>{pwdStatus.success}</SuccessText>}
                <FormActionsRow>
                  <SaveBtn onClick={handleSavePassword} disabled={pwdStatus.loading}>
                    {pwdStatus.loading ? 'Updating...' : 'Update Password'}
                  </SaveBtn>
                </FormActionsRow>
              </FormSection>
            )}

            {/* ── TAB 3: RESET PROFILE ── */}
            {activeTab === 'danger' && (
              <DangerCard>
                <DangerTitle>Reset Taste Profile</DangerTitle>
                <DangerDesc>
                  Resetting will permanently clear your generated cinematic clusters, AI persona models, and saved favorite films. You will be redirected to build your profile from scratch.
                </DangerDesc>
                {resetStatus.error && <ErrorText>{resetStatus.error}</ErrorText>}
                {resetStatus.success && <SuccessText>{resetStatus.success}</SuccessText>}

                {!showResetConfirm ? (
                  <DangerActionBtn onClick={() => setShowResetConfirm(true)}>
                    Reset Taste Profile
                  </DangerActionBtn>
                ) : (
                  <FormActionsRow style={{ marginTop: '0.75rem' }}>
                    <DangerActionBtn onClick={handleResetTasteProfile} disabled={resetStatus.loading}>
                      {resetStatus.loading ? 'Resetting...' : 'Yes, Permanently Reset'}
                    </DangerActionBtn>
                    <CancelBtn onClick={() => setShowResetConfirm(false)} disabled={resetStatus.loading}>
                      Cancel
                    </CancelBtn>
                  </FormActionsRow>
                )}
              </DangerCard>
            )}
          </ContentArea>
        </LayoutGrid>
      </PageBody>
    </PageWrapper>
  )
}

export default Settings
