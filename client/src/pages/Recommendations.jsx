import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { getAuthStatus } from '../utils/auth'
import api from '../services/api'
import PostWatchModal from '../components/PostWatchModal'
import UserAvatar from '../components/UserAvatar'
import ReviewGraph from '../components/ReviewGraph'
import ClapperLoader from '../components/ClapperLoader'
import { CINEMAS } from '../constants/data'

// ─── Cinema Themed SVG Icons ──────────────────────────────────────────────────

const StyledFilmReel = styled.svg`
  flex-shrink: 0;
  animation: ${({ $spinning }) => ($spinning ? 'filmReelSpinAnim 0.85s linear infinite' : 'none')};

  @keyframes filmReelSpinAnim {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`

const FilmReelIcon = ({ size = 13, spinning = false }) => (
  <StyledFilmReel
    $spinning={spinning}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="6" r="1.3" fill="currentColor" />
    <circle cx="12" cy="18" r="1.3" fill="currentColor" />
    <circle cx="6" cy="12" r="1.3" fill="currentColor" />
    <circle cx="18" cy="12" r="1.3" fill="currentColor" />
  </StyledFilmReel>
)

const FilmStripIcon = ({ size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M7 3v18M17 3v18M3 12h18M3 7.5h4M3 16.5h4M17 7.5h4M17 16.5h4" />
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
  padding: 0.75rem 1.5rem;
  border-bottom: 1.5px solid #ddd;
  background: #efefef;
  position: sticky;
  top: 0;
  z-index: 30;
  @media (max-width: 640px) { padding: 0.65rem 1rem; }
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

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const DashboardEyebrow = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #ff751f;
  margin-bottom: 0.25rem;
`

const TelemetryBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  background: #ffffff;
  border: 1px solid #ddd;
  padding: 3px 8px;
  border-radius: 999px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #555;

  span {
    color: #2e7d32;
    font-weight: 700;
  }
`

const TopbarRefreshBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e2e2e5;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  opacity: ${({ $disabled }) => ($disabled ? 0.65 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};

  &:hover {
    background: #f4f4f6;
    border-color: #d1d1d6;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(0);
  }
`

const ContinueBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
  color: #fff;
  background: #ff751f;
  border: 1px solid #ff751f;
  padding: 6px 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &:hover {
    background: #e6600c;
    border-color: #e6600c;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(255, 117, 31, 0.25);
  }

  &:active {
    transform: translateY(0);
  }
`

const PageBody = styled.div`
  flex: 1;
  padding: 1rem 1.75rem 4.5rem;
  max-width: 1380px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 0.85rem 1rem 4.5rem; }
`

const ProfilePanel = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
`

const ProfileTop = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
`

const ProfileTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.4rem, 2.8vw, 1.85rem);
  font-weight: 700;
  color: #111;
  line-height: 1.15;
  margin: 0 0 0.35rem;
`

const ProfileSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #666;
  line-height: 1.5;
  margin: 0 auto;
  max-width: 560px;
  text-align: center;
`

const RefineBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #fff;
  background: #111;
  border: 1.5px solid #111;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  &:hover { background: #333; }
`

const ClustersRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eee;
`

const ClusterTag = styled.button`
  background: ${({ $active }) => ($active ? '#ff751f' : 'rgba(255, 117, 31, 0.1)')};
  color: ${({ $active }) => ($active ? '#fff' : '#ff751f')};
  border: 1px solid ${({ $active }) => ($active ? '#ff751f' : 'rgba(255, 117, 31, 0.25)')};
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: #ff751f;
    color: #fff;
    border-color: #ff751f;
  }
`

const FilterContainer = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
`

const FilterLabel = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
  min-width: 76px;
  display: flex;
  align-items: center;
  gap: 4px;
`

const FilterPillsList = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
`

const FilterPill = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1.5px solid ${({ $active }) => ($active ? '#111' : '#ddd')};
  background: ${({ $active }) => ($active ? '#111' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#555')};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  white-space: nowrap;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 5px;

  &:hover {
    border-color: #111;
    transform: translateY(-1px);
  }
`

const OriginFilterPill = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1.5px solid ${({ $active, $accent }) => ($active ? ($accent || '#111') : ($accent ? `${$accent}55` : '#ddd'))};
  background: ${({ $active, $activeBg, $tint }) => ($active ? ($activeBg || '#111') : ($tint || '#fff'))};
  color: ${({ $active, $accent }) => ($active ? ($accent ? '#111' : '#fff') : ($accent || '#444'))};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  white-space: nowrap;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 5px;

  &:hover {
    border-color: ${({ $accent }) => $accent || '#111'};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }
`

const ResetFiltersBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: #888;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  text-decoration: underline;
  margin-left: auto;
  transition: color 0.2s;

  &:hover {
    color: #e05353;
  }
`

const OriginBadge = styled.span`
  background: ${({ $tint }) => $tint || 'rgba(0,0,0,0.04)'};
  color: ${({ $accent }) => $accent || '#444'};
  border: 1px solid ${({ $accent }) => ($accent ? `${$accent}33` : '#e0e0e0')};
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
`

const RecList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.9rem;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const RecCard = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.65rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: #ff751f;
    box-shadow: 0 8px 20px rgba(255, 117, 31, 0.08);
  }
`

const RecCardTop = styled.div`
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
`

const RecPoster = styled.div`
  width: 95px;
  height: 135px;
  border-radius: 6px;
  background: ${({ $posterPath, $c1, $c2 }) =>
    $posterPath
      ? `url(https://image.tmdb.org/t/p/w500${$posterPath}) center / cover no-repeat`
      : `linear-gradient(180deg, ${$c1 || '#0d1b2a'}, ${$c2 || '#1e4d7b'})`};
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(0,0,0,0.08);
`

const RecBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
`

const RecTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const RecTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.2;
`

const MatchPill = styled.span`
  background: #2e7d32;
  color: #fff;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
`

const ClusterSourceBadge = styled.span`
  background: #f0f0f0;
  color: #444;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
`

const RecMeta = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  color: #777;
`

const WhyBox = styled.div`
  background: #fafafa;
  border-left: 3px solid #ff751f;
  padding: 0.5rem 0.75rem;
  border-radius: 0 6px 6px 0;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #333;
  line-height: 1.45;

  strong {
    color: #ff751f;
  }
`

const OutcomeBadge = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.1);
  border: 1px solid rgba(46, 125, 50, 0.25);
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
`

const RecActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid #f0f0f0;
`

const RecActionsLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

const BookmarkIcon = ({ filled = false, size = 12 }) => (
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

const EyeIcon = ({ size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const RecWatchlistBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;

  border: 1px solid ${({ $active }) => ($active ? '#18181b' : '#e2e2e5')};
  background: ${({ $active }) => ($active ? '#18181b' : '#f4f4f6')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#222224')};

  &:hover {
    background: ${({ $active }) => ($active ? '#27272a' : '#eaebee')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#000000')};
    border-color: ${({ $active }) => ($active ? '#27272a' : '#d2d3d8')};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }

  &:active {
    transform: translateY(0);
  }
`

const RecMarkWatchedBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#ffffff' : '#222224')};
  background: ${({ $active }) => ($active ? '#2e7d32' : '#f4f4f6')};
  border: 1px solid ${({ $active }) => ($active ? '#2e7d32' : '#e2e2e5')};
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) => ($active ? '#256629' : '#eaebee')};
    border-color: ${({ $active }) => ($active ? '#256629' : '#d2d3d8')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#000000')};
    transform: translateY(-1px);
    box-shadow: ${({ $active }) =>
    $active
      ? '0 2px 8px rgba(46, 125, 50, 0.25)'
      : '0 2px 6px rgba(0, 0, 0, 0.05)'};
  }

  &:active {
    transform: translateY(0);
  }
`

const DismissBtn = styled.button`
  background: transparent;
  border: none;
  color: #888;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: #e05353;
    background: #fdf2f2;
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.9rem;
  color: #888;
`

const LoadMoreWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 1.75rem;
  gap: 0.5rem;
`

const LoadMoreBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: #111;
  background: #ffffff;
  border: 1.5px solid #ccc;
  padding: 0.75rem 2.2rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);

  &:hover:not(:disabled) {
    border-color: #ff751f;
    color: #ff751f;
    box-shadow: 0 4px 12px rgba(255, 117, 31, 0.15);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const EndOfListNotice = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #888;
  margin-top: 2.5rem;
  text-align: center;
`

// ─── Main Component ───────────────────────────────────────────────────────────

function Recommendations() {
  const navigate = useNavigate()
  const {
    sessionId,
    tasteClusters,
    favoriteRatings,
    selectedCinemas,
    userTasteProfile,
    dashboardRecs,
    updateDashboardRecs,
    dashboardTelemetry,
    setDashboardTelemetry,
    dashboardHasMore,
    setDashboardHasMore,
    dashboardPage,
    setDashboardPage,
    cachedWatchedOutcomes,
    updateWatchedOutcomes,
    cachedProfileRatings,
    updateProfileRatings,
  } = useTasteProfile()
  const { user } = getAuthStatus()
  const isReturningUser = localStorage.getItem('filmism_is_returning_user') === 'true'

  let greetingTitle = 'Welcome to Filmism'
  if (user?.firstName) {
    greetingTitle = isReturningUser ? `Welcome back, ${user.firstName}` : `Welcome, ${user.firstName}`
  } else if (isReturningUser) {
    greetingTitle = 'Welcome back'
  }

  const hasExistingRecs = Array.isArray(dashboardRecs) && dashboardRecs.length > 0
  const [recommendations, setRecommendations] = useState(() => (hasExistingRecs ? dashboardRecs : []))
  const [loading, setLoading] = useState(() => !hasExistingRecs)
  const [page, setPage] = useState(() => dashboardPage || 1)
  const [hasMore, setHasMore] = useState(() => (dashboardHasMore !== undefined ? dashboardHasMore : true))
  const [loadingMore, setLoadingMore] = useState(false)
  const [activePersonaFilter, setActivePersonaFilter] = useState('all')
  const [activeOriginFilter, setActiveOriginFilter] = useState('all')
  const [userOrigins, setUserOrigins] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [watchedOutcomes, setWatchedOutcomes] = useState(() => cachedWatchedOutcomes || {}) // { [tmdbId]: ratingNumber }
  const [profileRatings, setProfileRatings] = useState(() => cachedProfileRatings || {}) // { [tmdbId]: ratingNumber } from onboarding/profile
  const [dismissed, setDismissed] = useState([])
  const [activeModalMovie, setActiveModalMovie] = useState(null)
  const [telemetry, setTelemetry] = useState(() => dashboardTelemetry || { hitRate: 88, totalShown: 0 })
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Normalize an origin item (number ID, country code, or name) to a CINEMAS object
  const getOriginInfo = (item) => {
    if (!item) return null
    if (typeof item === 'number' || (!isNaN(item) && typeof item === 'string' && item.trim() !== '')) {
      const found = CINEMAS.find((c) => c && c.id === Number(item))
      if (found) return found
    }
    const raw = String(item).trim()
    const cleanStr = raw.toLowerCase().replace(/ cinema$/i, '').trim()

    // Aliases & Country code normalizations
    if (cleanStr === 'us' || cleanStr === 'usa') return CINEMAS.find((c) => c.id === 1) // Hollywood
    if (cleanStr === 'fr') return CINEMAS.find((c) => c.id === 2) // French Cinema
    if (cleanStr === 'jp') return CINEMAS.find((c) => c.id === 3) // Japanese Cinema
    if (cleanStr === 'gb' || cleanStr === 'uk') return CINEMAS.find((c) => c.id === 4) // British Cinema
    if (cleanStr === 'de') return CINEMAS.find((c) => c.id === 5) // German Cinema
    if (cleanStr === 'it') return CINEMAS.find((c) => c.id === 6) // Italian Cinema
    if (cleanStr === 'ru') return CINEMAS.find((c) => c.id === 7) // Russian Cinema
    if (cleanStr === 'kr') return CINEMAS.find((c) => c.id === 8) // Korean Cinema
    if (cleanStr === 'in') return CINEMAS.find((c) => c.id === 9) // Indian Cinema
    if (cleanStr === 'cn') return CINEMAS.find((c) => c.id === 10) // Chinese Cinema
    if (cleanStr === 'es') return CINEMAS.find((c) => c.id === 11) // Spanish Cinema
    if (['se', 'no', 'dk', 'fi', 'is', 'nordic'].includes(cleanStr)) return CINEMAS.find((c) => c.id === 12) // Scandinavian Cinema
    if (cleanStr === 'br') return CINEMAS.find((c) => c.id === 13) // Brazilian Cinema
    if (cleanStr === 'mx') return CINEMAS.find((c) => c.id === 14) // Mexican Cinema

    const foundByNameOrCode = CINEMAS.find(
      (c) =>
        (c?.name && c.name.toLowerCase() === raw.toLowerCase()) ||
        (c?.countryCode && c.countryCode.toLowerCase() === raw.toLowerCase()) ||
        (c?.countryCode && c.countryCode.toLowerCase() === cleanStr) ||
        (c?.name && c.name.toLowerCase().replace(/ cinema$/i, '').trim() === cleanStr)
    )
    if (foundByNameOrCode) return foundByNameOrCode

    return {
      id: raw,
      name: raw,
      countryCode: '',
      accent: '#475569',
      tint: 'rgba(71, 85, 105, 0.08)',
      activeBg: 'rgba(71, 85, 105, 0.18)',
    }
  }

  const fetchRecommendations = async (pageNum = 1, append = false, refresh = false, rotate = false) => {
    if (refresh) {
      setIsRefreshing(true)
      setLoading(true)
    } else if (append) {
      setLoadingMore(true)
    } else if (!hasExistingRecs && recommendations.length === 0) {
      setLoading(true)
    }

    try {
      const [recsRes, statsRes] = await Promise.allSettled([
        api.get('/recommendations/ranked', { params: { sessionId, page: pageNum, limit: 12, refresh, rotate } }),
        api.get('/recommendations/telemetry-stats', { params: { sessionId } }),
      ])

      if (recsRes.status === 'fulfilled' && recsRes.value.data?.recommendations) {
        const newRecs = recsRes.value.data.recommendations
        const more = recsRes.value.data.hasMore !== undefined ? recsRes.value.data.hasMore : newRecs.length >= 12
        setHasMore(more)
        if (setDashboardHasMore) setDashboardHasMore(more)
        setPage(pageNum)
        if (setDashboardPage) setDashboardPage(pageNum)

        if (recsRes.value.data.selectedOrigins?.length > 0) {
          setUserOrigins((prev) => Array.from(new Set([...prev, ...recsRes.value.data.selectedOrigins])))
        }

        if (append) {
          setRecommendations((prev) => {
            const existingIds = new Set(prev.map((r) => r.id))
            const filteredNew = newRecs.filter((r) => !existingIds.has(r.id))
            const combined = [...prev, ...filteredNew]
            if (updateDashboardRecs) updateDashboardRecs(combined)
            return combined
          })
        } else {
          setRecommendations(newRecs)
          if (updateDashboardRecs) updateDashboardRecs(newRecs)
        }
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data?.stats) {
        setTelemetry(statsRes.value.data.stats)
        if (setDashboardTelemetry) setDashboardTelemetry(statsRes.value.data.stats)
      }
    } catch (err) {
      console.warn('Failed to load recommendations:', err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setIsRefreshing(false)
    }
  }

  // Fetch recommendations and profile data
  useEffect(() => {
    const fetchAuxiliaryData = async () => {
      try {
        const [wRes, dRes, pRes] = await Promise.allSettled([
          api.get('/recommendations/watchlist', { params: { sessionId } }),
          api.get('/recommendations/diary', { params: { sessionId } }),
          api.get('/taste-profile/me', { params: { sessionId } }),
        ])
        if (wRes.status === 'fulfilled' && Array.isArray(wRes.value.data?.watchlist)) {
          setWatchlist(wRes.value.data.watchlist.map((item) => Number(item.tmdbId || item.id)))
        }
        if (dRes.status === 'fulfilled' && Array.isArray(dRes.value.data?.diary)) {
          const outcomes = {}
          dRes.value.data.diary.forEach((item) => {
            const id = Number(item.tmdbId || item.id)
            if (id) outcomes[id] = item.outcomeRating || 3
          })
          setWatchedOutcomes(outcomes)
          if (updateWatchedOutcomes) updateWatchedOutcomes(outcomes)
        }
        if (pRes.status === 'fulfilled' && pRes.value.data?.tasteProfile) {
          const tp = pRes.value.data.tasteProfile
          if (tp.favorites) {
            const pRatings = {}
            tp.favorites.forEach((item) => {
              const id = Number(item.tmdbId || item.id)
              if (id && item.rating) pRatings[id] = item.rating
            })
            setProfileRatings(pRatings)
            if (updateProfileRatings) updateProfileRatings(pRatings)
          }
          if (tp.selectedOrigins?.length > 0) {
            setUserOrigins(tp.selectedOrigins)
          }
        }
      } catch (e) {
        // silent fallback
      }
    }

    const fetchInitialData = async () => {
      // Initialize user origins from taste context if present
      if (selectedCinemas?.length > 0) {
        setUserOrigins(selectedCinemas)
      } else if (userTasteProfile?.selectedOrigins?.length > 0) {
        setUserOrigins(userTasteProfile.selectedOrigins)
      }

      // Check if this is a login needing a cached recommendations rotation
      const needsRotate = localStorage.getItem('filmism_rotate_cache') === 'true'
      if (needsRotate) {
        localStorage.removeItem('filmism_rotate_cache')
      }

      // If we already have films loaded in memory/session, show them INSTANTLY without any loader!
      if (hasExistingRecs) {
        setRecommendations(dashboardRecs)
        setLoading(false)
        if (dashboardTelemetry) setTelemetry(dashboardTelemetry)
        if (dashboardHasMore !== undefined) setHasMore(dashboardHasMore)
        if (dashboardPage !== undefined) setPage(dashboardPage)

        // Quietly sync watchlist, diary outcomes & profile in background (zero blocking!)
        fetchAuxiliaryData()
        return
      }

      // First time loading (no cached films): fetch recommendations
      fetchRecommendations(1, false, false, needsRotate)
      fetchAuxiliaryData()
    }

    fetchInitialData()
  }, [sessionId])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchRecommendations(page + 1, true)
    }
  }

  const handleToggleWatchlist = async (movie) => {
    const movieId = Number(movie.id || movie.tmdbId)
    const isCurrentlyWatchlisted = watchlist.includes(movieId)
    const newWatchlist = isCurrentlyWatchlisted
      ? watchlist.filter((x) => x !== movieId)
      : [...watchlist, movieId]

    setWatchlist(newWatchlist)
    setRecommendations((prev) => {
      const filtered = prev.filter((m) => Number(m.id || m.tmdbId) !== movieId)
      if (updateDashboardRecs) updateDashboardRecs(filtered)
      return filtered
    })

    try {
      await api.post('/recommendations/action', {
        sessionId,
        tmdbId: movieId,
        title: movie.title,
        sourceClusterId: movie.sourceClusterId,
        sourceClusterName: movie.sourceClusterName,
        matchScore: movie.match,
        action: isCurrentlyWatchlisted ? 'shown' : 'watchlisted',
      })
    } catch (e) {
      console.warn('Failed to record watchlist action:', e.message)
    }
  }

  const handleDismiss = async (movie) => {
    const movieId = Number(movie.id || movie.tmdbId)
    setDismissed((prev) => [...prev, movieId])
    setRecommendations((prev) => {
      const filtered = prev.filter((m) => Number(m.id || m.tmdbId) !== movieId)
      if (updateDashboardRecs) updateDashboardRecs(filtered)
      return filtered
    })
    try {
      await api.post('/recommendations/action', {
        sessionId,
        tmdbId: movieId,
        title: movie.title,
        sourceClusterId: movie.sourceClusterId,
        action: 'dismissed',
      })
    } catch (e) {
      console.warn('Failed to record dismiss action:', e.message)
    }
  }

  const handleOpenWatchedModal = (movie) => {
    setActiveModalMovie(movie)
  }

  const handleSubmitOutcome = async (movie, outcomeRating) => {
    const movieId = Number(movie.id || movie.tmdbId)
    setWatchedOutcomes((prev) => {
      const updated = {
        ...prev,
        [movieId]: outcomeRating,
      }
      if (updateWatchedOutcomes) updateWatchedOutcomes(updated)
      return updated
    })
    setRecommendations((prev) => {
      const filtered = prev.filter((m) => Number(m.id || m.tmdbId) !== movieId)
      if (updateDashboardRecs) updateDashboardRecs(filtered)
      return filtered
    })
    setActiveModalMovie(null)

    try {
      await api.post('/recommendations/outcome', {
        sessionId,
        tmdbId: movieId,
        outcomeRating,
        sourceClusterId: movie.sourceClusterId,
      })
      const statsRes = await api.get('/recommendations/telemetry-stats', { params: { sessionId } })
      if (statsRes.data?.stats) {
        setTelemetry(statsRes.data.stats)
      }
    } catch (e) {
      console.warn('Failed to record outcome:', e.message)
    }
  }

  const activeRecs = recommendations.filter((r) => {
    const rId = Number(r.id || r.tmdbId)
    return (
      !dismissed.includes(rId) &&
      !watchlist.includes(rId) &&
      !watchedOutcomes[rId]
    )
  })

  // Persona filter options
  const personaNames = (tasteClusters || []).map((c) => c.name).filter(Boolean)
  const personaFilterOptions = ['all', ...Array.from(new Set(personaNames))]
  activeRecs.forEach((r) => {
    if (r.sourceClusterName && !personaFilterOptions.includes(r.sourceClusterName)) {
      personaFilterOptions.push(r.sourceClusterName)
    }
  })

  // User's chosen origins ONLY
  const chosenOriginObjects = []
  const seenOriginNames = new Set()

    ; (userOrigins || []).forEach((o) => {
      const info = getOriginInfo(o)
      if (info && !seenOriginNames.has(info.name)) {
        seenOriginNames.add(info.name)
        chosenOriginObjects.push(info)
      }
    })

  // Filter recommendations by Persona and User-Chosen Cinema Origin
  const filteredRecs = activeRecs.filter((r) => {
    // 1. Persona matching
    let matchesPersona = true
    if (activePersonaFilter !== 'all') {
      matchesPersona =
        r.sourceClusterName === activePersonaFilter ||
        (Array.isArray(r.matchingClusters) && r.matchingClusters.includes(activePersonaFilter)) ||
        r.genre === activePersonaFilter
    }

    // 2. User-chosen origin matching
    let matchesOrigin = true
    if (activeOriginFilter !== 'all') {
      const targetCinema = getOriginInfo(activeOriginFilter)
      const recOriginInfo = getOriginInfo(r.originCountries?.[0] || r.cinema)

      if (targetCinema && recOriginInfo) {
        if (targetCinema.id === recOriginInfo.id || targetCinema.name.toLowerCase() === recOriginInfo.name.toLowerCase()) {
          matchesOrigin = true
        } else if (targetCinema.countryCode && recOriginInfo.countryCode) {
          const tc = targetCinema.countryCode.toUpperCase()
          const rc = recOriginInfo.countryCode.toUpperCase()
          if (tc === rc) {
            matchesOrigin = true
          } else if (tc === 'SE' && ['SE', 'NO', 'DK', 'FI', 'IS'].includes(rc)) {
            matchesOrigin = true
          } else if ((tc === 'GB' || tc === 'UK') && ['GB', 'UK'].includes(rc)) {
            matchesOrigin = true
          } else if ((tc === 'US' || tc === 'USA') && ['US', 'USA'].includes(rc)) {
            matchesOrigin = true
          } else {
            matchesOrigin = false
          }
        } else if (
          targetCinema.countryCode &&
          Array.isArray(r.originCountries) &&
          r.originCountries.map((c) => String(c).toUpperCase()).includes(targetCinema.countryCode.toUpperCase())
        ) {
          matchesOrigin = true
        } else {
          matchesOrigin = false
        }
      } else {
        matchesOrigin = false
      }
    }

    return matchesPersona && matchesOrigin
  })

  const allRatings = {
    ...(favoriteRatings || {}),
    ...profileRatings,
    ...watchedOutcomes,
  }

  const isAnyFilterActive = activePersonaFilter !== 'all' || activeOriginFilter !== 'all'

  const handleResetFilters = () => {
    setActivePersonaFilter('all')
    setActiveOriginFilter('all')
  }

  return (
    <>
      {activeModalMovie && (
        <PostWatchModal
          movie={activeModalMovie}
          onClose={() => setActiveModalMovie(null)}
          onSubmit={handleSubmitOutcome}
        />
      )}

      <PageWrapper>
        <Topbar>
          <Logo>Filmism</Logo>
          <TopbarRight>
            <TopbarRefreshBtn
              disabled={isRefreshing}
              $disabled={isRefreshing}
              onClick={() => fetchRecommendations(1, false, true)}
              title="Refresh personalized recommendations with newly ranked matches"
            >
              <FilmReelIcon size={13} spinning={isRefreshing} />
              {isRefreshing ? 'Refreshing Matches...' : 'Refresh Matches'}
            </TopbarRefreshBtn>
            <ContinueBtn
              onClick={() => navigate('/taste?mode=continue')}
              title="Tune and expand your cinema taste profile"
            >
              <FilmStripIcon size={13} />
              Continue Build Profile
            </ContinueBtn>
            <UserAvatar />
          </TopbarRight>
        </Topbar>

        <PageBody>
          <ProfilePanel>
            <ProfileTop>
              <div>
                <DashboardEyebrow>Cinema Dashboard</DashboardEyebrow>
                <ProfileTitle>{greetingTitle}</ProfileTitle>
                <ProfileSub>
                  Personalized cinematic recommendations scored across your distinct taste personas.
                  Separating pre-watch intent from post-watch outcome ratings.
                </ProfileSub>
              </div>
            </ProfileTop>

            {tasteClusters?.length > 0 && (
              <ClustersRow>
                <span style={{ fontFamily: 'Lexend Deca', fontSize: '0.75rem', color: '#888' }}>
                  active personas:
                </span>
                {tasteClusters.map((c, i) => (
                  <ClusterTag
                    key={c.clusterId || i}
                    $active={activePersonaFilter === c.name}
                    onClick={() => setActivePersonaFilter(activePersonaFilter === c.name ? 'all' : c.name)}
                  >
                    {c.name}
                  </ClusterTag>
                ))}
              </ClustersRow>
            )}
          </ProfilePanel>

          {/* Review Graph showing distribution of Not for me, Okay, Good, Great */}
          <ReviewGraph ratings={allRatings} />

          {/* Filter Controls: Taste Personas & User-Chosen Origins Only */}
          <FilterContainer>
            {personaFilterOptions.length > 1 && (
              <FilterRow>
                <FilterLabel>Personas</FilterLabel>
                <FilterPillsList>
                  {personaFilterOptions.map((f) => (
                    <FilterPill
                      key={f}
                      $active={activePersonaFilter === f}
                      onClick={() => setActivePersonaFilter(f)}
                    >
                      {f === 'all' ? '✦ All Personas' : f}
                    </FilterPill>
                  ))}
                </FilterPillsList>
                {isAnyFilterActive && (
                  <ResetFiltersBtn onClick={handleResetFilters}>
                    Reset filters ✕
                  </ResetFiltersBtn>
                )}
              </FilterRow>
            )}

            {chosenOriginObjects.length > 0 && (
              <FilterRow>
                <FilterLabel>Your Origins</FilterLabel>
                <FilterPillsList>
                  <OriginFilterPill
                    $active={activeOriginFilter === 'all'}
                    onClick={() => setActiveOriginFilter('all')}
                  >
                    All Chosen Origins
                  </OriginFilterPill>
                  {chosenOriginObjects.map((origin) => {
                    const isActive = activeOriginFilter === origin.name
                    return (
                      <OriginFilterPill
                        key={origin.id || origin.name}
                        $active={isActive}
                        $accent={origin.accent}
                        $tint={origin.tint}
                        $activeBg={origin.activeBg}
                        onClick={() => setActiveOriginFilter(isActive ? 'all' : origin.name)}
                      >
                        <span>{origin.name}</span>
                      </OriginFilterPill>
                    )
                  })}
                </FilterPillsList>
              </FilterRow>
            )}
          </FilterContainer>

          {loading || isRefreshing ? (
            <ClapperLoader
              label={isRefreshing ? "Discovering Fresh Matches..." : "Cueing Recommendations..."}
              subLabel={isRefreshing ? "Scanning cinematic personas & fresh candidates" : "Matching your cinephile taste personas"}
            />
          ) : filteredRecs.length === 0 ? (
            <EmptyState>
              <p style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#444', fontWeight: 600 }}>
                No recommendations found matching
                {activeOriginFilter !== 'all' ? ` origin "${activeOriginFilter}"` : ''}
                {activePersonaFilter !== 'all' ? ` in persona "${activePersonaFilter}"` : ''}.
              </p>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: '#888' }}>
                Try selecting "All Chosen Origins" or loading more films from your candidate pool.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <RefineBtn onClick={handleResetFilters}>
                  Clear Active Filters
                </RefineBtn>
                {hasMore && (
                  <RefineBtn
                    style={{ background: '#ff751f', borderColor: '#ff751f', color: '#fff' }}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Finding more films...' : 'Load More Recommendations ↓'}
                  </RefineBtn>
                )}
              </div>
            </EmptyState>
          ) : (
            <>
              <RecList>
                {filteredRecs.map((rec) => {
                  const isWatchlisted = watchlist.includes(rec.id)
                  const outcomeRating = watchedOutcomes[rec.id]
                  const isWatched = outcomeRating !== undefined

                  const cinemaInfo = getOriginInfo(rec.cinema || rec.originCountries?.[0])

                  return (
                    <RecCard key={rec.id} id={`rec-${rec.id}`}>
                      <RecCardTop>
                        <RecPoster
                          $posterPath={rec.posterPath}
                          $c1={rec.c1}
                          $c2={rec.c2}
                        />

                        <RecBody>
                          <RecTopRow>
                            <RecTitle>{rec.title}</RecTitle>
                            <MatchPill>{rec.match}% Match</MatchPill>
                            {cinemaInfo && (
                              <OriginBadge $accent={cinemaInfo.accent} $tint={cinemaInfo.tint}>
                                {cinemaInfo.name}
                              </OriginBadge>
                            )}
                          </RecTopRow>

                          {rec.sourceClusterName && (
                            <ClusterSourceBadge>{rec.sourceClusterName}</ClusterSourceBadge>
                          )}

                          {outcomeRating && (
                            <OutcomeBadge>
                              Verdict: {outcomeRating === 4 ? '✦ Great' : outcomeRating === 3 ? '★ Good' : outcomeRating === 2 ? '∼ Okay' : '✕ Not for me'}
                            </OutcomeBadge>
                          )}

                          <RecMeta>
                            {rec.year} · {(rec.genres || [rec.genre]).slice(0, 3).join(' · ')} · dir. {rec.director}
                          </RecMeta>
                        </RecBody>
                      </RecCardTop>

                      <WhyBox>
                        <strong>Why you'll like this: </strong>
                        {rec.why}
                      </WhyBox>

                      <RecActions>
                        <RecActionsLeft>
                          <RecWatchlistBtn
                            $active={isWatchlisted}
                            onClick={() => handleToggleWatchlist(rec)}
                            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          >
                            <BookmarkIcon filled={isWatchlisted} size={12} />
                            {isWatchlisted ? 'In Watchlist' : 'Watchlist'}
                          </RecWatchlistBtn>
                          <RecMarkWatchedBtn
                            $active={isWatched}
                            onClick={() => handleOpenWatchedModal(rec)}
                            title={isWatched ? 'Edit Diary Entry' : 'Mark as Watched'}
                          >
                            <EyeIcon size={13} />
                            {isWatched ? 'Rated Outcome' : 'Mark Watched'}
                          </RecMarkWatchedBtn>
                        </RecActionsLeft>
                        <DismissBtn onClick={() => handleDismiss(rec)}>
                          not interested ✕
                        </DismissBtn>
                      </RecActions>
                    </RecCard>
                  )
                })}
              </RecList>

              {activePersonaFilter === 'all' && activeOriginFilter === 'all' && (
                <LoadMoreWrapper>
                  {hasMore ? (
                    <LoadMoreBtn onClick={handleLoadMore} disabled={loadingMore}>
                      {loadingMore ? 'Finding more films...' : 'Load more recommendations ↓'}
                    </LoadMoreBtn>
                  ) : (
                    <EndOfListNotice>
                      ✦ You've reached the end of this recommendation set.
                    </EndOfListNotice>
                  )}
                </LoadMoreWrapper>
              )}
            </>
          )}
        </PageBody>
      </PageWrapper>
    </>
  )
}

export default Recommendations