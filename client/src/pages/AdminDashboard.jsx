import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link } from 'react-router-dom'
import { safetyAPI } from '../services/api'
import UserAvatar from '../components/UserAvatar'

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.94) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
`

const Container = styled.div`
  min-height: 100vh;
  background-color: #0b0b0d;
  color: #f0f0f4;
  font-family: 'Lexend Deca', sans-serif;
  display: flex;
  flex-direction: column;
`

const Header = styled.header`
  padding: 1.25rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1e1e24;
  background: rgba(11, 11, 13, 0.95);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;

  @media (max-width: 768px) {
    padding: 1rem 1.25rem;
  }
`

const BrandGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const Logo = styled(Link)`
  font-family: 'Lemon Milk', 'Playfair Display', serif;
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.08em;
  text-decoration: none;
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
`

const AdminBadge = styled.span`
  background: #ff751f22;
  color: #ff751f;
  border: 1px solid #ff751f55;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ff751f;
    animation: ${pulse} 2s infinite ease-in-out;
  }
`

const Main = styled.main`
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 2.5rem;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }
`

const PageTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.4rem 0;
  letter-spacing: 0.04em;
`

const PageSubtitle = styled.p`
  font-size: 0.88rem;
  color: #8a8a93;
  margin: 0 0 2rem 0;
`

// ─── Stats Overview Grid ───────────────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`

const StatCard = styled.div`
  background: #141418;
  border: 1px solid #22222a;
  border-radius: 12px;
  padding: 1.25rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: transform 0.2s, border-color 0.2s;

  &:hover {
    transform: translateY(-2px);
    border-color: #333340;
  }
`

const StatLabel = styled.span`
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7b7b88;
  font-weight: 600;
`

const StatValue = styled.span`
  font-family: 'Lemon Milk', sans-serif;
  font-size: 1.7rem;
  font-weight: 700;
  color: ${(props) => props.$color || '#fff'};
`

// ─── Controls & Tabs ───────────────────────────────────────────────────────

const ControlsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const TabsGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  background: #141418;
  padding: 0.3rem;
  border-radius: 10px;
  border: 1px solid #22222a;
  overflow-x: auto;
`

const TabBtn = styled.button`
  background: ${(props) => (props.$active ? '#ff751f' : 'transparent')};
  color: ${(props) => (props.$active ? '#0b0b0d' : '#9a9aa5')};
  border: none;
  border-radius: 7px;
  padding: 0.5rem 0.9rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;

  &:hover {
    color: ${(props) => (props.$active ? '#0b0b0d' : '#fff')};
  }
`

const TabBadge = styled.span`
  background: ${(props) => (props.$active ? '#0b0b0d' : '#22222a')};
  color: ${(props) => (props.$active ? '#ff751f' : '#888896')};
  font-size: 0.68rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: 800;
`

const RefreshBtn = styled.button`
  background: #141418;
  border: 1px solid #22222a;
  color: #d0d0d8;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: #1c1c22;
    color: #fff;
    border-color: #333340;
  }
`

// ─── Reports List / Table ──────────────────────────────────────────────────

const ReportsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  animation: ${fadeIn} 0.25s ease;
`

const ReportItem = styled.div`
  background: #131317;
  border: 1px solid #202028;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr 140px 140px auto;
  align-items: center;
  gap: 1.25rem;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: #2e2e3a;
    background: #16161c;
  }

  @media (max-width: 992px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const AvatarPlaceholder = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #252530;
  color: #ff751f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const UserMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const UserRoleLabel = styled.span`
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #6a6a78;
  font-weight: 700;
  letter-spacing: 0.04em;
`

const UserName = styled.span`
  font-size: 0.88rem;
  font-weight: 600;
  color: #f0f0f4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const BannedTag = styled.span`
  background: #e74c3c22;
  color: #e74c3c;
  border: 1px solid #e74c3c55;
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
`

const ReasonBadge = styled.span`
  display: inline-block;
  background: ${(props) => {
    switch (props.$reason) {
      case 'harassment': return '#e74c3c22'
      case 'hate_speech': return '#9b59b622'
      case 'inappropriate_content': return '#e67e2222'
      case 'spam': return '#f1c40f22'
      default: return '#34495e22'
    }
  }};
  color: ${(props) => {
    switch (props.$reason) {
      case 'harassment': return '#ff6b6b'
      case 'hate_speech': return '#be79df'
      case 'inappropriate_content': return '#ffa154'
      case 'spam': return '#f7d75c'
      default: return '#95a5a6'
    }
  }};
  border: 1px solid currentColor;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
  text-transform: capitalize;
`

const StatusBadge = styled.span`
  display: inline-block;
  background: ${(props) => {
    switch (props.$status) {
      case 'open': return '#ff751f22'
      case 'in_review': return '#3498db22'
      case 'resolved': return '#2ecc7122'
      case 'dismissed': return '#7f8c8d22'
      default: return '#22222a'
    }
  }};
  color: ${(props) => {
    switch (props.$status) {
      case 'open': return '#ff751f'
      case 'in_review': return '#5dade2'
      case 'resolved': return '#58d68d'
      case 'dismissed': return '#95a5a6'
      default: return '#aaa'
    }
  }};
  border: 1px solid currentColor;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
`

const ActionBtn = styled.button`
  background: #ff751f;
  color: #0b0b0d;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: #ff8b42;
    transform: translateY(-1px);
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #131317;
  border: 1px dashed #282834;
  border-radius: 12px;
  color: #7b7b88;

  h3 {
    color: #fff;
    font-size: 1.1rem;
    margin: 0 0 0.5rem 0;
  }
  p {
    font-size: 0.85rem;
    margin: 0;
  }
`

// ─── Evidence & Action Modal ───────────────────────────────────────────────

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1000;
  animation: ${fadeIn} 0.15s ease-out;
`

const ModalCard = styled.div`
  background: #121216;
  border: 1px solid #282834;
  border-radius: 16px;
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  animation: ${popIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1);
`

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #22222c;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ModalTitle = styled.h2`
  font-family: 'Lemon Milk', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #888896;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;

  &:hover { color: #fff; }
`

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const DetailSection = styled.div`
  background: #17171e;
  border: 1px solid #252532;
  border-radius: 10px;
  padding: 1rem 1.25rem;
`

const SectionHeading = styled.h4`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ff751f;
  margin: 0 0 0.6rem 0;
  font-weight: 700;
`

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  margin-bottom: 0.4rem;

  span.label { color: #888896; }
  span.val { color: #f0f0f4; font-weight: 500; }
`

const SnapshotContainer = styled.div`
  background: #0d0d10;
  border: 1px solid #202028;
  border-radius: 10px;
  padding: 1rem;
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const ChatMessageBubble = styled.div`
  background: ${(props) => (props.$isReported ? '#3b1c1c' : '#1f2029')};
  border: 1px solid ${(props) => (props.$isReported ? '#612525' : '#2b2c3a')};
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #eaeaf0;
  align-self: ${(props) => (props.$isReported ? 'flex-end' : 'flex-start')};
  max-width: 80%;

  .msg-meta {
    font-size: 0.68rem;
    color: ${(props) => (props.$isReported ? '#ff9999' : '#8888a0')};
    margin-bottom: 0.2rem;
    font-weight: 600;
  }
`

const Textarea = styled.textarea`
  width: 100%;
  background: #0d0d10;
  border: 1px solid #282834;
  border-radius: 8px;
  color: #f0f0f4;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.82rem;
  box-sizing: border-box;
  resize: vertical;
  min-height: 70px;

  &:focus {
    outline: none;
    border-color: #ff751f;
  }
`

const ModalFooter = styled.div`
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #22222c;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  background: #15151a;
`

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`

const BtnBan = styled.button`
  background: #c0392b;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #e74c3c; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const BtnUnban = styled.button`
  background: #27ae60;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #2ecc71; }
`

const BtnSecondary = styled.button`
  background: #252530;
  color: #d0d0d8;
  border: 1px solid #333342;
  border-radius: 8px;
  padding: 0.55rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #30303e;
    color: #fff;
  }
`

const BtnWarning = styled.button`
  background: #d35400;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #e67e22; }
`

// ─── Custom Dark Confirmation Modal (Replaces browser confirm) ─────────────

const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  z-index: 1100;
  animation: ${fadeIn} 0.15s ease;
`

const DialogCard = styled.div`
  background: #141419;
  border: 1px solid ${(props) => (props.$danger ? '#c0392b66' : '#2ecc7166')};
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  animation: ${popIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
`

const DialogHeader = styled.div`
  padding: 1.25rem 1.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const DialogIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${(props) => (props.$danger ? '#c0392b22' : '#2ecc7122')};
  color: ${(props) => (props.$danger ? '#ff6b6b' : '#2ecc71')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
`

const DialogTitle = styled.h3`
  font-family: 'Lemon Milk', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
`

const DialogBody = styled.div`
  padding: 0.5rem 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: #c0c0cc;
  font-size: 0.85rem;
  line-height: 1.5;
`

const WarningCallout = styled.div`
  background: #1e1416;
  border-left: 3px solid #e74c3c;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #ff9999;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  ul {
    margin: 0.25rem 0 0;
    padding-left: 1.2rem;
    color: #ffbbbb;
  }
`

const DialogFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #22222a;
  background: #111115;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`

const DialogCancelBtn = styled.button`
  background: #22222a;
  color: #c0c0cc;
  border: 1px solid #333340;
  border-radius: 8px;
  padding: 0.55rem 1.1rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #2c2c36;
    color: #fff;
  }
`

const DialogActionBtn = styled.button`
  background: ${(props) => (props.$danger ? '#c0392b' : '#27ae60')};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1.2rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${(props) => (props.$danger ? '#e74c3c' : '#2ecc71')};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// ─── Toast Notifications (Replaces browser alert) ──────────────────────────

const ToastWrapper = styled.div`
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 2000;
  animation: ${slideInRight} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  max-width: 400px;
`

const ToastCard = styled.div`
  background: ${(props) => (props.$error ? '#251314' : '#102217')};
  border: 1px solid ${(props) => (props.$error ? '#e74c3c' : '#2ecc71')};
  border-radius: 10px;
  padding: 0.9rem 1.2rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(props) => (props.$error ? '#ffb3b3' : '#b7f4cc')};
  font-size: 0.84rem;
  font-weight: 500;
`

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [currentTab, setCurrentTab] = useState('open')
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [adminNotesInput, setAdminNotesInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Custom confirmation modals & alerts state
  const [banModalTarget, setBanModalTarget] = useState(null)
  const [unbanModalTarget, setUnbanModalTarget] = useState(null)
  const [banReasonCustom, setBanReasonCustom] = useState('')
  const [toast, setToast] = useState(null)

  const [bannedUsers, setBannedUsers] = useState([])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast(null)
    }, 4500)
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [statsRes, reportsRes, bannedRes] = await Promise.all([
        safetyAPI.getAdminStats(),
        currentTab !== 'banned' ? safetyAPI.getReports({ status: currentTab }) : Promise.resolve({ data: { reports: [] } }),
        safetyAPI.getBannedUsers(),
      ])
      const statsData = statsRes.data?.stats || statsRes.data || {}
      setStats(statsData)
      setReports(reportsRes.data?.reports || [])
      setBannedUsers(bannedRes.data?.bannedUsers || [])
    } catch (err) {
      console.error('Failed to load moderation data:', err)
      showToast('error', 'Failed to load moderation data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [currentTab])

  const openInspection = (report) => {
    setSelectedReport(report)
    setAdminNotesInput(report.adminNotes || '')
  }

  const closeInspection = () => {
    setSelectedReport(null)
    setAdminNotesInput('')
  }

  const promptBanUser = () => {
    if (!selectedReport?.reportedUser?._id) return
    setBanReasonCustom(selectedReport.reason?.replace('_', ' ') || 'Community guideline violation')
    setBanModalTarget(selectedReport)
  }

  const handleConfirmBan = async () => {
    if (!banModalTarget?.reportedUser?._id) return

    setActionLoading(true)
    try {
      await safetyAPI.banUser(banModalTarget.reportedUser._id, {
        reason: banReasonCustom.trim() || 'Community safety violation',
        reportId: banModalTarget._id,
      })
      showToast(
        'success',
        `User ${banModalTarget.reportedUser.firstName} has been permanently banned. A suspension notice email was sent.`
      )
      setBanModalTarget(null)
      closeInspection()
      await loadDashboardData()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to ban user.')
    } finally {
      setActionLoading(false)
    }
  }

  const promptUnbanUser = (userObj = null) => {
    const target = userObj || selectedReport?.reportedUser
    if (!target) return
    setUnbanModalTarget({ reportedUser: target })
  }

  const handleConfirmUnban = async () => {
    const userId = unbanModalTarget?.reportedUser?._id || unbanModalTarget?.reportedUser?.userId
    if (!userId) return

    setActionLoading(true)
    try {
      await safetyAPI.unbanUser(userId)
      showToast('success', `User ${unbanModalTarget.reportedUser.firstName} has been unbanned.`)
      setUnbanModalTarget(null)
      closeInspection()
      await loadDashboardData()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to unban user.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateStatus = async (status, actionTaken = null) => {
    if (!selectedReport?._id) return
    setActionLoading(true)
    try {
      await safetyAPI.updateReport(selectedReport._id, {
        status,
        actionTaken,
        adminNotes: adminNotesInput,
      })
      if (actionTaken === 'warning_issued') {
        showToast('success', `Report resolved & warning notice email dispatched to ${selectedReport.reportedUser?.firstName || 'user'}.`)
      } else {
        showToast('success', `Report status updated to ${status.replace('_', ' ')}.`)
      }
      await loadDashboardData()
      closeInspection()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update report status.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Container>
      {/* Floating Toast Notification */}
      {toast && (
        <ToastWrapper>
          <ToastCard $error={toast.type === 'error'}>
            <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </ToastCard>
        </ToastWrapper>
      )}

      <Header>
        <BrandGroup>
          <Logo to="/admin">FILMISM</Logo>
          <AdminBadge>Admin Moderation</AdminBadge>
        </BrandGroup>
        <UserAvatar />
      </Header>

      <Main>
        <PageTitle>Moderation Command Center</PageTitle>
        <PageSubtitle>
          Review user reports, inspect immutable conversation evidence snapshots, and maintain community safety.
        </PageSubtitle>

        {/* Stats Row */}
        <StatsGrid>
          <StatCard onClick={() => setCurrentTab('open')} style={{ cursor: 'pointer' }}>
            <StatLabel>Open Reports</StatLabel>
            <StatValue $color="#ff751f">{stats?.openReports ?? '-'}</StatValue>
          </StatCard>
          <StatCard onClick={() => setCurrentTab('in_review')} style={{ cursor: 'pointer' }}>
            <StatLabel>In Review</StatLabel>
            <StatValue $color="#5dade2">{stats?.inReviewReports ?? '-'}</StatValue>
          </StatCard>
          <StatCard onClick={() => setCurrentTab('resolved')} style={{ cursor: 'pointer' }}>
            <StatLabel>Resolved</StatLabel>
            <StatValue $color="#58d68d">{stats?.resolvedReports ?? '-'}</StatValue>
          </StatCard>
          <StatCard onClick={() => setCurrentTab('banned')} style={{ cursor: 'pointer' }}>
            <StatLabel>Banned Users</StatLabel>
            <StatValue $color="#e74c3c">{stats?.bannedUsersCount ?? '-'}</StatValue>
          </StatCard>
          <StatCard onClick={() => setCurrentTab('all')} style={{ cursor: 'pointer' }}>
            <StatLabel>Total Reports Filed</StatLabel>
            <StatValue>{stats?.totalReports ?? '-'}</StatValue>
          </StatCard>
        </StatsGrid>

        {/* Filter Controls */}
        <ControlsBar>
          <TabsGroup>
            <TabBtn $active={currentTab === 'open'} onClick={() => setCurrentTab('open')}>
              Open <TabBadge $active={currentTab === 'open'}>{stats?.openReports ?? 0}</TabBadge>
            </TabBtn>
            <TabBtn $active={currentTab === 'in_review'} onClick={() => setCurrentTab('in_review')}>
              In Review <TabBadge $active={currentTab === 'in_review'}>{stats?.inReviewReports ?? 0}</TabBadge>
            </TabBtn>
            <TabBtn $active={currentTab === 'resolved'} onClick={() => setCurrentTab('resolved')}>
              Resolved <TabBadge $active={currentTab === 'resolved'}>{stats?.resolvedReports ?? 0}</TabBadge>
            </TabBtn>
            <TabBtn $active={currentTab === 'dismissed'} onClick={() => setCurrentTab('dismissed')}>
              Dismissed <TabBadge $active={currentTab === 'dismissed'}>{stats?.dismissedReports ?? 0}</TabBadge>
            </TabBtn>
            <TabBtn $active={currentTab === 'banned'} onClick={() => setCurrentTab('banned')}>
              Banned Users <TabBadge $active={currentTab === 'banned'}>{stats?.bannedUsersCount ?? 0}</TabBadge>
            </TabBtn>
            <TabBtn $active={currentTab === 'all'} onClick={() => setCurrentTab('all')}>
              All Reports
            </TabBtn>
          </TabsGroup>

          <RefreshBtn onClick={loadDashboardData}>
            🔄 Refresh Queue
          </RefreshBtn>
        </ControlsBar>

        {/* Banned Users View vs Reports Queue */}
        {loading ? (
          <EmptyState>
            <p>Loading moderation records...</p>
          </EmptyState>
        ) : currentTab === 'banned' ? (
          bannedUsers.length === 0 ? (
            <EmptyState>
              <h3>No banned users</h3>
              <p>There are currently no suspended accounts on the platform.</p>
            </EmptyState>
          ) : (
            <ReportsWrapper>
              {bannedUsers.map((bUser) => (
                <ReportItem key={bUser._id || bUser.userId} style={{ gridTemplateColumns: '1.2fr 1.2fr 160px auto' }}>
                  <UserCell>
                    <AvatarPlaceholder>
                      {bUser.profilePicture ? (
                        <img src={bUser.profilePicture} alt="" />
                      ) : (
                        bUser.firstName?.[0] || 'U'
                      )}
                    </AvatarPlaceholder>
                    <UserMeta>
                      <UserRoleLabel>Banned User</UserRoleLabel>
                      <UserName>
                        {bUser.firstName} {bUser.lastName} <BannedTag>Banned</BannedTag>
                      </UserName>
                    </UserMeta>
                  </UserCell>

                  <UserMeta>
                    <UserRoleLabel>Account Email</UserRoleLabel>
                    <span style={{ fontSize: '0.85rem', color: '#d0d0d8' }}>{bUser.email}</span>
                  </UserMeta>

                  <UserMeta>
                    <UserRoleLabel>Reason / Date</UserRoleLabel>
                    <span style={{ fontSize: '0.78rem', color: '#ff9999' }}>
                      {bUser.bannedReason || 'Safety Violation'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#777' }}>
                      {bUser.bannedAt ? new Date(bUser.bannedAt).toLocaleDateString() : ''}
                    </span>
                  </UserMeta>

                  <div>
                    <BtnUnban onClick={() => promptUnbanUser(bUser)}>
                      ✅ Unban User
                    </BtnUnban>
                  </div>
                </ReportItem>
              ))}
            </ReportsWrapper>
          )
        ) : reports.length === 0 ? (
          <EmptyState>
            <h3>No reports in this category</h3>
            <p>All clean! No safety incidents currently marked as {currentTab}.</p>
          </EmptyState>
        ) : (
          <ReportsWrapper>
            {reports.map((report) => (
              <ReportItem key={report._id}>
                <UserCell>
                  <AvatarPlaceholder>
                    {report.reporter?.profilePicture ? (
                      <img src={report.reporter.profilePicture} alt="" />
                    ) : (
                      report.reporter?.firstName?.[0] || 'R'
                    )}
                  </AvatarPlaceholder>
                  <UserMeta>
                    <UserRoleLabel>Reporter</UserRoleLabel>
                    <UserName>{report.reporter?.firstName || 'User'} {report.reporter?.lastName || ''}</UserName>
                  </UserMeta>
                </UserCell>

                <UserCell>
                  <AvatarPlaceholder>
                    {report.reportedUser?.profilePicture ? (
                      <img src={report.reportedUser.profilePicture} alt="" />
                    ) : (
                      report.reportedUser?.firstName?.[0] || 'U'
                    )}
                  </AvatarPlaceholder>
                  <UserMeta>
                    <UserRoleLabel>Reported User</UserRoleLabel>
                    <UserName>
                      {report.reportedUser?.firstName || 'User'} {report.reportedUser?.lastName || ''}
                      {report.reportedUser?.isBanned && <BannedTag>Banned</BannedTag>}
                    </UserName>
                  </UserMeta>
                </UserCell>

                <div>
                  <ReasonBadge $reason={report.reason}>
                    {report.reason?.replace('_', ' ')}
                  </ReasonBadge>
                </div>

                <div>
                  <StatusBadge $status={report.status}>
                    {report.status?.replace('_', ' ')}
                  </StatusBadge>
                </div>

                <div>
                  <ActionBtn onClick={() => openInspection(report)}>
                    Inspect & Action
                  </ActionBtn>
                </div>
              </ReportItem>
            ))}
          </ReportsWrapper>
        )}
      </Main>

      {/* Modal Inspector */}
      {selectedReport && (
        <ModalOverlay onClick={closeInspection}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                Incident Review #{selectedReport._id?.slice(-6)}
              </ModalTitle>
              <CloseBtn onClick={closeInspection}>&times;</CloseBtn>
            </ModalHeader>

            <ModalBody>
              <DetailSection>
                <SectionHeading>Report Summary</SectionHeading>
                <DetailRow>
                  <span className="label">Reporter:</span>
                  <span className="val">{selectedReport.reporter?.firstName} ({selectedReport.reporter?.email})</span>
                </DetailRow>
                <DetailRow>
                  <span className="label">Reported User:</span>
                  <span className="val">{selectedReport.reportedUser?.firstName} ({selectedReport.reportedUser?.email})</span>
                </DetailRow>
                <DetailRow>
                  <span className="label">Reason Category:</span>
                  <span className="val" style={{ textTransform: 'capitalize' }}>{selectedReport.reason?.replace('_', ' ')}</span>
                </DetailRow>
                <DetailRow>
                  <span className="label">Filed At:</span>
                  <span className="val">{new Date(selectedReport.createdAt).toLocaleString()}</span>
                </DetailRow>
                {selectedReport.details && (
                  <DetailRow style={{ marginTop: '0.4rem' }}>
                    <span className="label">Reporter Note:</span>
                    <span className="val" style={{ fontStyle: 'italic' }}>"{selectedReport.details}"</span>
                  </DetailRow>
                )}
              </DetailSection>

              {/* Chat Evidence Snapshot */}
              <div>
                <SectionHeading>
                  Chat Evidence Snapshot ({selectedReport.contextSnapshot?.length || 0} messages captured)
                </SectionHeading>
                {selectedReport.contextSnapshot?.length > 0 ? (
                  <SnapshotContainer>
                    {selectedReport.contextSnapshot.map((msg, idx) => {
                      const isReported = String(msg.sender) === String(selectedReport.reportedUser?._id)
                      return (
                        <ChatMessageBubble key={idx} $isReported={isReported}>
                          <div className="msg-meta">
                            {isReported ? selectedReport.reportedUser?.firstName : selectedReport.reporter?.firstName} • {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div>{msg.text}</div>
                        </ChatMessageBubble>
                      )
                    })}
                  </SnapshotContainer>
                ) : (
                  <SnapshotContainer>
                    <span style={{ color: '#777', fontSize: '0.8rem' }}>
                      No chat messages snapshot attached (Report was filed directly from profile or match preview).
                    </span>
                  </SnapshotContainer>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <SectionHeading>Internal Moderator Notes</SectionHeading>
                <Textarea
                  placeholder="Record investigation notes, warning records, or context for team..."
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                />
              </div>
            </ModalBody>

            <ModalFooter>
              <div>
                {selectedReport.reportedUser?.isBanned ? (
                  <BtnUnban onClick={promptUnbanUser} disabled={actionLoading}>
                    Unban User
                  </BtnUnban>
                ) : (
                  <BtnBan onClick={promptBanUser} disabled={actionLoading}>
                    🚫 Ban User (One-Click)
                  </BtnBan>
                )}
              </div>

              <ActionButtonGroup>
                <BtnSecondary
                  onClick={() => handleUpdateStatus('in_review')}
                  disabled={actionLoading}
                >
                  Mark In Review
                </BtnSecondary>
                <BtnWarning
                  onClick={() => handleUpdateStatus('resolved', 'warning_issued')}
                  disabled={actionLoading}
                >
                  Resolve w/ Warning
                </BtnWarning>
                <BtnSecondary
                  onClick={() => handleUpdateStatus('dismissed', 'dismissed')}
                  disabled={actionLoading}
                >
                  Dismiss (No Action)
                </BtnSecondary>
              </ActionButtonGroup>
            </ModalFooter>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ── Custom Styled Ban Confirmation Popup Modal (Replaces browser confirm) ── */}
      {banModalTarget && (
        <DialogOverlay onClick={() => setBanModalTarget(null)}>
          <DialogCard $danger={true} onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogIcon $danger={true}>🚫</DialogIcon>
              <DialogTitle>Confirm Account Ban</DialogTitle>
            </DialogHeader>

            <DialogBody>
              <p style={{ margin: 0 }}>
                Are you sure you want to permanently BAN{' '}
                <strong style={{ color: '#fff' }}>
                  {banModalTarget.reportedUser?.firstName} {banModalTarget.reportedUser?.lastName}
                </strong>{' '}
                ({banModalTarget.reportedUser?.email})?
              </p>

              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#ff751f', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
                  Ban Reason (Sent in official notice email):
                </label>
                <input
                  type="text"
                  value={banReasonCustom}
                  onChange={(e) => setBanReasonCustom(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0c0c0e',
                    border: '1px solid #333342',
                    borderRadius: '7px',
                    color: '#fff',
                    padding: '0.55rem 0.75rem',
                    fontFamily: 'inherit',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                  }}
                  placeholder="e.g. Harassment & Safety Guideline Violations"
                />
              </div>

              <WarningCallout>
                <strong>Immediate Actions Taken:</strong>
                <ul>
                  <li>Account will be banned and prevented from logging in.</li>
                  <li>Suspension notice email will be dispatched to their inbox.</li>
                  <li>All active chat conversations & matches will be terminated.</li>
                </ul>
              </WarningCallout>
            </DialogBody>

            <DialogFooter>
              <DialogCancelBtn onClick={() => setBanModalTarget(null)} disabled={actionLoading}>
                Cancel
              </DialogCancelBtn>
              <DialogActionBtn $danger={true} onClick={handleConfirmBan} disabled={actionLoading}>
                {actionLoading ? 'Banning User...' : '🚫 Confirm Ban & Send Notice'}
              </DialogActionBtn>
            </DialogFooter>
          </DialogCard>
        </DialogOverlay>
      )}

      {/* ── Custom Styled Unban Confirmation Popup Modal ── */}
      {unbanModalTarget && (
        <DialogOverlay onClick={() => setUnbanModalTarget(null)}>
          <DialogCard $danger={false} onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogIcon $danger={false}>✅</DialogIcon>
              <DialogTitle>Restore Account Access</DialogTitle>
            </DialogHeader>

            <DialogBody>
              <p style={{ margin: 0 }}>
                Are you sure you want to UNBAN{' '}
                <strong style={{ color: '#fff' }}>
                  {unbanModalTarget.reportedUser?.firstName} {unbanModalTarget.reportedUser?.lastName}
                </strong>?
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>
                This user will regain access to their account and be able to log in to Filmism again.
              </p>
            </DialogBody>

            <DialogFooter>
              <DialogCancelBtn onClick={() => setUnbanModalTarget(null)} disabled={actionLoading}>
                Cancel
              </DialogCancelBtn>
              <DialogActionBtn $danger={false} onClick={handleConfirmUnban} disabled={actionLoading}>
                {actionLoading ? 'Restoring...' : 'Confirm & Restore Access'}
              </DialogActionBtn>
            </DialogFooter>
          </DialogCard>
        </DialogOverlay>
      )}
    </Container>
  )
}
