import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import api, { matchingAPI, conversationAPI } from '../services/api'
import UserAvatar from '../components/UserAvatar'
import { getAuthStatus } from '../utils/auth'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'
const TMDB_IMG_BACKDROP = 'https://image.tmdb.org/t/p/w780'

// ─── Icons ───────────────────────────────────────────────────────────────────

const ChatIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const EyeIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const SparklesIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const SpinningSvg = styled.svg`
  display: block;
  animation: ${({ $spinning }) => ($spinning ? 'spinAnim 0.85s linear infinite' : 'none')};

  @keyframes spinAnim {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`

const RefreshIcon = ({ size = 15, spinning = false }) => (
  <SpinningSvg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    $spinning={spinning}
  >
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </SpinningSvg>
)

const FilmIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
)

const HeartIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const PlusIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const BookmarkIcon = ({ filled = false, size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#ff751f' : 'none'}
    stroke={filled ? '#ff751f' : 'currentColor'}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, transition: 'all 0.15s ease' }}
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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

  @media (max-width: 640px) {
    padding: 0.65rem 1rem;
  }
`

const Logo = styled.span`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.01em;
  user-select: none;
  cursor: default;

  @media (max-width: 480px) {
    font-size: 1.25rem;
  }
`

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const PageBody = styled.div`
  flex: 1;
  padding: 1.5rem 1.75rem 5rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  animation: pageFadeIn 0.4s ease-out;

  @keyframes pageFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    padding: 0.85rem 0.85rem 4.5rem;
  }
`

const PageHeader = styled.div`
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: 1.5px solid #ddd;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const PageTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.4rem, 5vw, 2.3rem);
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.02em;
`

const PageSubtitle = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #666;
  margin: 0;
`

// Action Button
const RefreshBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #111;
  color: #fff;
  border: 1px solid #111;
  border-radius: 6px;
  padding: 0.55rem 1.15rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #ff751f;
    border-color: #ff751f;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 117, 31, 0.25);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// ─── Hero Twin Banner ─────────────────────────────────────────────────────────

const TwinHeroCard = styled.div`
  background: linear-gradient(135deg, #111111 0%, #1e1e1e 100%);
  border-radius: 20px;
  padding: 2rem 2.25rem;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(255, 117, 31, 0.18) 0%, rgba(0,0,0,0) 70%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.25rem;
  }
`

const TwinProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 480px) {
    gap: 1rem;
  }
`

const TwinAvatar = styled.div`
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff751f 0%, #ff9d5c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 20px rgba(255, 117, 31, 0.4);
  flex-shrink: 0;
  overflow: hidden;

  @media (max-width: 480px) {
    width: 60px;
    height: 60px;
    font-size: 1.4rem;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const TwinMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const TwinTitleTag = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #ff9d5c;
  display: flex;
  align-items: center;
  gap: 0.35rem;
`

const TwinName = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
  letter-spacing: -0.01em;

  @media (max-width: 480px) {
    font-size: 1.3rem;
  }
`

const MatchedDate = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  color: #999;
`

const ConnectStatusRow = styled.div`
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
`

const ConnectActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.15rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) =>
    $variant === 'connected'
      ? `
        background: #2e7d32;
        color: #fff;
        box-shadow: 0 4px 14px rgba(46, 125, 50, 0.3);
        &:hover { background: #256729; transform: translateY(-1px); }
      `
      : $variant === 'pending'
      ? `
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        &:hover { background: rgba(255, 255, 255, 0.25); }
      `
      : `
        background: #ff751f;
        color: #fff;
        box-shadow: 0 4px 14px rgba(255, 117, 31, 0.4);
        &:hover { background: #e0600f; transform: translateY(-1px); }
      `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// Score Gauge
const ScoreWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;

  @media (max-width: 768px) {
    align-items: flex-start;
    text-align: left;
    width: 100%;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 1.25rem;
  }
`

const ScoreNumber = styled.div`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 2.8rem;
  font-weight: 700;
  color: #ff751f;
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 0.15rem;

  span {
    font-size: 1.4rem;
    color: #ff9d5c;
  }
`

const ScoreLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.76rem;
  font-weight: 600;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.25rem;
`

// ─── Sections Grid ────────────────────────────────────────────────────────────

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.75rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const SectionCard = styled.div`
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 16px;
  padding: 1.5rem 1.75rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;

  @media (max-width: 480px) {
    padding: 1rem 0.85rem;
    border-radius: 12px;
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1.5px solid #f0f0f0;
`

const CardHeading = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const CardBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #666;
`

// ─── Taste Persona Overlap Bars ──────────────────────────────────────────────

const ClusterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
`

const ClusterItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const ClusterTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const ClusterName = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  color: #111;
`

const ClusterOverlapScore = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: #ff751f;
`

const BarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 999px;
  overflow: hidden;
  position: relative;
`

const BarFill = styled.div`
  height: 100%;
  width: ${({ $width }) => `${Math.min(100, Math.max(0, $width))}%`};
  background: linear-gradient(90deg, #ff751f 0%, #ff9d5c 100%);
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
`

const ClusterSubRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #888;
`

// ─── Shared Favorites Grid ───────────────────────────────────────────────────

const FavoritesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  @media (max-width: 340px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const FilmCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-3px);
  }
`

const PosterWrap = styled.div`
  aspect-ratio: 2/3;
  background: #222;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const NoPoster = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  text-align: center;
  padding: 0.5rem;
`

const FilmTitle = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FilmYear = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  color: #888;
`

// ─── Discovery Recommendation Card ───────────────────────────────────────────

const DiscoveryBanner = styled.div`
  grid-column: 1 / -1;
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 16px;
  padding: 1.75rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.25rem;
  }
`

const DiscoveryLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`

const DiscoveryPoster = styled.div`
  width: 90px;
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  background: #111;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const DiscoveryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const DiscoveryTag = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ff751f;
`

const DiscoveryTitle = styled.h4`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111;
  margin: 0;
`

const DiscoveryDesc = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #666;
  margin: 0;
  max-width: 500px;
  line-height: 1.45;
`

const WatchlistBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: #18181b;
  color: #fff;
  border: 1px solid #18181b;
  border-radius: 6px;
  padding: 0.65rem 1.25rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $saved }) => ($saved ? '#27272a' : '#ff751f')};
    border-color: ${({ $saved }) => ($saved ? '#27272a' : '#ff751f')};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`

const DiscoveryActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
`

const AlreadyWatchedBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: #f4f4f6;
  color: #333;
  border: 1px solid #e2e2e5;
  border-radius: 6px;
  padding: 0.65rem 1.25rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #eaebee;
    border-color: #d2d3d8;
    color: #111;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// ─── Opt-In / Empty States ───────────────────────────────────────────────────

const StateCard = styled.div`
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 20px;
  padding: 4rem 2rem;
  text-align: center;
  max-width: 650px;
  margin: 2rem auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
`

const StateIconCircle = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 117, 31, 0.1);
  color: #ff751f;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${({ $pulsing }) => ($pulsing ? 'pulseAnim 1.6s ease infinite' : 'none')};

  @keyframes pulseAnim {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); }
  }
`

const StateTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  margin: 0;
`

const StateDesc = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #666;
  line-height: 1.5;
  margin: 0;
  max-width: 480px;
`

const PrimaryActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ff751f;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.75rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(255, 117, 31, 0.3);

  &:hover:not(:disabled) {
    background: #e0600f;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(255, 117, 31, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CinephileTwin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [matchingEnabled, setMatchingEnabled] = useState(false)
  const [matchData, setMatchData] = useState(null)
  const [error, setError] = useState('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [watchlistedDiscovery, setWatchlistedDiscovery] = useState(false)

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState('none') // 'none' | 'connected' | 'outgoing_pending' | 'incoming_pending'
  const [existingConversationId, setExistingConversationId] = useState(null)
  const [pendingRequestId, setPendingRequestId] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [excludedRecommendations, setExcludedRecommendations] = useState([])
  const [cyclingRecommendation, setCyclingRecommendation] = useState(false)
  const [allRecommendationsExhausted, setAllRecommendationsExhausted] = useState(false)

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  // Check connection state with matched twin
  const checkConnectionStatus = async (twinUserId) => {
    if (!twinUserId) return
    try {
      const [reqRes, convRes] = await Promise.all([
        matchingAPI.getRequests(),
        conversationAPI.getConversations(),
      ])

      // 1. Check if active conversation exists
      const conv = (convRes.data?.conversations || []).find(
        (c) => c.partner?.userId?.toString() === twinUserId.toString()
      )
      if (conv) {
        setConnectionStatus('connected')
        setExistingConversationId(conv.conversationId)
        return
      }

      // 2. Check if incoming request exists
      const incomingReq = (reqRes.data?.incoming || []).find(
        (r) => r.fromUser?.userId?.toString() === twinUserId.toString()
      )
      if (incomingReq) {
        setConnectionStatus('incoming_pending')
        setPendingRequestId(incomingReq.requestId)
        return
      }

      // 3. Check if outgoing request exists
      const outgoingReq = (reqRes.data?.outgoing || []).find(
        (r) => r.toUser?.userId?.toString() === twinUserId.toString()
      )
      if (outgoingReq) {
        setConnectionStatus('outgoing_pending')
        setPendingRequestId(outgoingReq.requestId)
        return
      }

      setConnectionStatus('none')
    } catch (e) {
      console.error('Error checking twin connection status:', e)
    }
  }

  // Fetch current match and matching preference
  const fetchCurrentMatch = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await matchingAPI.getCurrentMatch()
      setMatchingEnabled(Boolean(res.data?.matchingEnabled))
      const match = res.data?.match || null
      setMatchData(match)
      if (match?.twin?.userId) {
        await checkConnectionStatus(match.twin.userId)
      }
    } catch (err) {
      if (err.response?.status === 404 && err.response?.data?.message?.includes('Taste profile')) {
        setError('Please complete your taste profile onboarding first.')
      } else {
        setError(err.response?.data?.message || 'Failed to load Cinephile Twin data.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentMatch()
  }, [])

  // Enable matching from the page
  const handleEnableMatching = async () => {
    setLoading(true)
    try {
      const res = await matchingAPI.toggleOptIn(true)
      setMatchingEnabled(Boolean(res.data?.matchingEnabled))
      await handleFindTwin()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable matching.')
      setLoading(false)
    }
  }

  // Find a new match
  const handleFindTwin = async () => {
    setSearching(true)
    setError('')
    try {
      const res = await matchingAPI.findMatch()
      const match = res.data?.match || null
      setMatchData(match)
      setCooldownSeconds(60) // 60s UI cooldown to prevent spam
      if (match?.twin?.userId) {
        await checkConnectionStatus(match.twin.userId)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to compute match. Please try again soon.')
    } finally {
      setSearching(false)
      setLoading(false)
    }
  }

  // Connect request handlers
  const handleSendConnect = async () => {
    if (!matchData?.twin?.userId || connecting) return
    setConnecting(true)
    try {
      const res = await matchingAPI.requestConnect({
        toUserId: matchData.twin.userId,
        matchId: matchData.matchId,
      })
      if (res.data?.status === 'accepted' && res.data?.conversationId) {
        setConnectionStatus('connected')
        setExistingConversationId(res.data.conversationId)
      } else {
        setConnectionStatus('outgoing_pending')
        setPendingRequestId(res.data?.requestId)
      }
    } catch (err) {
      console.error('Failed to send connect request:', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleAcceptConnect = async () => {
    if (!pendingRequestId || connecting) return
    setConnecting(true)
    try {
      const res = await matchingAPI.respondRequest(pendingRequestId, 'accept')
      if (res.data?.conversationId) {
        setConnectionStatus('connected')
        setExistingConversationId(res.data.conversationId)
      }
    } catch (err) {
      console.error('Failed to accept connection:', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleCancelConnect = async () => {
    if (!pendingRequestId || connecting) return
    setConnecting(true)
    try {
      await matchingAPI.cancelRequest(pendingRequestId)
      setConnectionStatus('none')
      setPendingRequestId(null)
    } catch (err) {
      console.error('Failed to cancel connection:', err)
    } finally {
      setConnecting(false)
    }
  }

  // Handle already watched film -> recommend another film from this twin
  const handleAlreadyWatched = async () => {
    if (!matchData?.recommendedFilm || !matchData?.twin?.userId || cyclingRecommendation) return

    setCyclingRecommendation(true)
    const currentFilm = matchData.recommendedFilm
    const newExcluded = [...excludedRecommendations, currentFilm.tmdbId]
    setExcludedRecommendations(newExcluded)

    try {
      const res = await matchingAPI.getNextRecommendation({
        twinUserId: matchData.twin.userId,
        excludedTmdbIds: newExcluded,
        watchedFilm: {
          tmdbId: currentFilm.tmdbId,
          title: currentFilm.title,
        },
      })

      if (res.data?.recommendedFilm) {
        setMatchData((prev) => ({
          ...prev,
          recommendedFilm: res.data.recommendedFilm,
        }))
        setWatchlistedDiscovery(false)
      } else {
        setAllRecommendationsExhausted(true)
        setMatchData((prev) => ({
          ...prev,
          recommendedFilm: null,
        }))
      }
    } catch (err) {
      console.error('Failed to get next recommendation:', err)
    } finally {
      setCyclingRecommendation(false)
    }
  }

  // Add discovery film to watchlist
  const handleAddToWatchlist = async (film) => {
    if (!film || watchlistedDiscovery) return
    try {
      const sessionId = localStorage.getItem('filmism_session_id') || undefined
      await api.post('/recommendations/action', {
        tmdbId: film.tmdbId,
        title: film.title,
        action: 'watchlisted',
        sessionId,
      })
      setWatchlistedDiscovery(true)
    } catch (err) {
      console.warn('Watchlist add failed:', err.message)
    }
  }

  return (
    <PageWrapper>
      {/* Topbar */}
      <Topbar>
        <Logo to="/recommend" as={Link} style={{ textDecoration: 'none' }}>filmism</Logo>
        <TopbarRight>
          <UserAvatar />
        </TopbarRight>
      </Topbar>

      <PageBody>
        <PageHeader>
          <HeaderLeft>
            <PageTitle>YOUR CINEPHILE TWIN</PageTitle>
            <PageSubtitle>
              High-dimensional vector matching based on your aesthetic persona centroids
            </PageSubtitle>
          </HeaderLeft>

          {matchingEnabled && matchData && (
            <RefreshBtn
              onClick={handleFindTwin}
              disabled={searching || cooldownSeconds > 0}
              id="find-new-twin-btn"
            >
              <RefreshIcon size={14} spinning={searching} />
              {searching
                ? 'Matching...'
                : cooldownSeconds > 0
                ? `Cooldown (${cooldownSeconds}s)`
                : 'Find a New Twin'}
            </RefreshBtn>
          )}
        </PageHeader>

        {error && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: '#dc2626',
              fontFamily: 'Lexend Deca, sans-serif',
              fontSize: '0.84rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <StateCard>
            <StateIconCircle $pulsing={true}>
              <SparklesIcon size={30} />
            </StateIconCircle>
            <StateTitle>CALCULATING TASTE DISTANCE...</StateTitle>
            <StateDesc>
              Comparing your global taste centroid against active cinephiles in the Filmism network.
            </StateDesc>
          </StateCard>
        ) : !matchingEnabled ? (
          /* Opt-in Prompt State */
          <StateCard>
            <StateIconCircle>
              <SparklesIcon size={32} />
            </StateIconCircle>
            <StateTitle>DISCOVER YOUR CINEPHILE TWIN</StateTitle>
            <StateDesc>
              Let our vector search engine pair you with cinephiles who share your exact cinema tastes, themes, and narrative styles.
              <br /><br />
              <strong style={{ color: '#111' }}>Privacy First:</strong> Only your first name, avatar, and taste overlap are shown to matches. Your email, password, and private data are never shared.
            </StateDesc>
            <PrimaryActionBtn onClick={handleEnableMatching} id="opt-in-twin-btn">
              <SparklesIcon size={16} /> Enable Cinephile Twin Matching
            </PrimaryActionBtn>
          </StateCard>
        ) : !matchData ? (
          /* Empty / No Matches State */
          <StateCard>
            <StateIconCircle>
              <FilmIcon size={30} />
            </StateIconCircle>
            <StateTitle>NO ACTIVE TWIN FOUND YET</StateTitle>
            <StateDesc>
              You're opted into matching! As new cinephiles complete onboarding, our vector engine will discover your closest aesthetic match.
            </StateDesc>
            <PrimaryActionBtn onClick={handleFindTwin} disabled={searching} id="trigger-find-twin-btn">
              <RefreshIcon size={15} spinning={searching} />
              {searching ? 'Searching Vector Space...' : 'Scan For Cinephile Twins'}
            </PrimaryActionBtn>
          </StateCard>
        ) : (
          /* Active Twin Match View */
          <>
            {/* Twin Hero Banner */}
            <TwinHeroCard>
              <TwinProfileSection>
                <TwinAvatar>
                  {matchData.twin?.profilePicture ? (
                    <img src={matchData.twin.profilePicture} alt={matchData.twin.firstName} />
                  ) : (
                    (matchData.twin?.firstName?.[0] || 'C').toUpperCase()
                  )}
                </TwinAvatar>
                <TwinMeta>
                  <TwinTitleTag>
                    <SparklesIcon size={12} /> Cinephile Twin Match
                  </TwinTitleTag>
                  <TwinName>{matchData.twin?.firstName || 'Fellow Cinephile'}</TwinName>
                  <MatchedDate>
                    Matched {matchData.matchedAt ? new Date(matchData.matchedAt).toLocaleDateString() : 'recently'}
                  </MatchedDate>
                  <ConnectStatusRow>
                    {connectionStatus === 'connected' ? (
                      <ConnectActionBtn
                        $variant="connected"
                        onClick={() => navigate(`/messages?conversationId=${existingConversationId}`)}
                        id="open-twin-chat-btn"
                      >
                        <ChatIcon size={14} /> Open Messages 💬
                      </ConnectActionBtn>
                    ) : connectionStatus === 'outgoing_pending' ? (
                      <ConnectActionBtn
                        $variant="pending"
                        onClick={handleCancelConnect}
                        disabled={connecting}
                        id="cancel-twin-request-btn"
                        title="Click to cancel pending request"
                      >
                        {connecting ? 'Updating...' : 'Request Pending (Cancel)'}
                      </ConnectActionBtn>
                    ) : connectionStatus === 'incoming_pending' ? (
                      <ConnectActionBtn
                        $variant="primary"
                        onClick={handleAcceptConnect}
                        disabled={connecting}
                        id="accept-twin-request-btn"
                      >
                        <CheckIcon size={14} /> Accept Request
                      </ConnectActionBtn>
                    ) : (
                      <ConnectActionBtn
                        $variant="primary"
                        onClick={handleSendConnect}
                        disabled={connecting}
                        id="connect-twin-btn"
                      >
                        <SparklesIcon size={14} /> {connecting ? 'Sending Request...' : 'Connect to Chat'}
                      </ConnectActionBtn>
                    )}
                  </ConnectStatusRow>
                </TwinMeta>
              </TwinProfileSection>

              <ScoreWrapper>
                <ScoreNumber>
                  {matchData.similarityScore || 90}<span>%</span>
                </ScoreNumber>
                <ScoreLabel>Taste Centroid Overlap</ScoreLabel>
              </ScoreWrapper>
            </TwinHeroCard>

            {/* Overlap Breakdown Grid */}
            <ContentGrid>
              {/* Left Card: Shared Taste Personas */}
              <SectionCard>
                <CardHeader>
                  <CardHeading>
                    <SparklesIcon size={16} /> Shared Aesthetic Personas
                  </CardHeading>
                  <CardBadge>
                    {matchData.sharedClusters?.length || 0} overlapping
                  </CardBadge>
                </CardHeader>

                {matchData.sharedClusters && matchData.sharedClusters.length > 0 ? (
                  <ClusterList>
                    {matchData.sharedClusters.map((cluster, idx) => (
                      <ClusterItem key={idx}>
                        <ClusterTopRow>
                          <ClusterName>{cluster.clusterName}</ClusterName>
                          <ClusterOverlapScore>{cluster.overlapScore}% match</ClusterOverlapScore>
                        </ClusterTopRow>
                        <BarTrack>
                          <BarFill $width={cluster.overlapScore} />
                        </BarTrack>
                        <ClusterSubRow>
                          <span>Your weight: {Math.round((cluster.myWeight || 0) * 100)}%</span>
                          <span>Twin's weight: {Math.round((cluster.twinWeight || 0) * 100)}%</span>
                        </ClusterSubRow>
                      </ClusterItem>
                    ))}
                  </ClusterList>
                ) : (
                  <p style={{ fontFamily: 'Lexend Deca, sans-serif', fontSize: '0.82rem', color: '#888', margin: '1rem 0' }}>
                    Broad taste alignment across overall director and genre themes.
                  </p>
                )}
              </SectionCard>

              {/* Right Card: Shared Favorites */}
              <SectionCard>
                <CardHeader>
                  <CardHeading>
                    <HeartIcon size={16} /> You Both Loved
                  </CardHeading>
                  <CardBadge>
                    {matchData.sharedFavorites?.length || 0} mutual films
                  </CardBadge>
                </CardHeader>

                {matchData.sharedFavorites && matchData.sharedFavorites.length > 0 ? (
                  <FavoritesGrid>
                    {matchData.sharedFavorites.slice(0, 6).map((film) => (
                      <FilmCard key={film.tmdbId}>
                        <PosterWrap>
                          {film.posterPath ? (
                            <img src={`${TMDB_IMG}${film.posterPath}`} alt={film.title} loading="lazy" />
                          ) : (
                            <NoPoster>{film.title}</NoPoster>
                          )}
                        </PosterWrap>
                        <FilmTitle title={film.title}>{film.title}</FilmTitle>
                        {film.year && <FilmYear>{film.year}</FilmYear>}
                      </FilmCard>
                    ))}
                  </FavoritesGrid>
                ) : (
                  <p style={{ fontFamily: 'Lexend Deca, sans-serif', fontSize: '0.82rem', color: '#888', margin: '1rem 0' }}>
                    No exact mutual 4-star favorites yet — your connection is driven by shared aesthetic pacing and atmospheric themes!
                  </p>
                )}
              </SectionCard>

              {/* Cross-Pollination Discovery Recommendation */}
              {matchData.recommendedFilm ? (
                <DiscoveryBanner>
                  <DiscoveryLeft>
                    <DiscoveryPoster>
                      {matchData.recommendedFilm.posterPath ? (
                        <img
                          src={`${TMDB_IMG}${matchData.recommendedFilm.posterPath}`}
                          alt={matchData.recommendedFilm.title}
                          loading="lazy"
                        />
                      ) : (
                        <NoPoster>{matchData.recommendedFilm.title}</NoPoster>
                      )}
                    </DiscoveryPoster>
                    <DiscoveryInfo>
                      <DiscoveryTag>THEY MIGHT INTRODUCE YOU TO</DiscoveryTag>
                      <DiscoveryTitle>{matchData.recommendedFilm.title}</DiscoveryTitle>
                      <DiscoveryDesc>
                        {matchData.twin?.firstName || 'Your twin'} gave this film their highest rating. Since your taste centroids align so closely, there's a strong chance you'll love it too.
                      </DiscoveryDesc>
                    </DiscoveryInfo>
                  </DiscoveryLeft>

                  <DiscoveryActions>
                    <AlreadyWatchedBtn
                      onClick={handleAlreadyWatched}
                      disabled={cyclingRecommendation}
                      id="twin-already-watched-btn"
                      title="Mark as already watched and find another film from this twin"
                    >
                      <EyeIcon size={14} />
                      {cyclingRecommendation ? 'Finding Next...' : 'Already Watched'}
                    </AlreadyWatchedBtn>

                    <WatchlistBtn
                      onClick={() => handleAddToWatchlist(matchData.recommendedFilm)}
                      $saved={watchlistedDiscovery}
                      id="add-twin-recommendation-btn"
                    >
                      {watchlistedDiscovery ? (
                        <>
                          <BookmarkIcon filled size={14} /> Saved to Watchlist
                        </>
                      ) : (
                        <>
                          <BookmarkIcon size={14} /> Save to Watchlist
                        </>
                      )}
                    </WatchlistBtn>
                  </DiscoveryActions>
                </DiscoveryBanner>
              ) : allRecommendationsExhausted ? (
                <DiscoveryBanner style={{ justifyContent: 'center', textAlign: 'center', padding: '1.75rem' }}>
                  <p style={{ fontFamily: 'Lexend Deca, sans-serif', fontSize: '0.85rem', color: '#666', margin: 0 }}>
                    🎉 <strong>You're all caught up!</strong> You've explored all top favorites and recommendations from {matchData.twin?.firstName || 'your twin'}.
                  </p>
                </DiscoveryBanner>
              ) : null}
            </ContentGrid>
          </>
        )}
      </PageBody>
    </PageWrapper>
  )
}
