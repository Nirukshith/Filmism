import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { getAuthStatus } from '../utils/auth'
import api from '../services/api'
import PostWatchModal from '../components/PostWatchModal'
import UserAvatar from '../components/UserAvatar'
import ReviewGraph from '../components/ReviewGraph'
import { CINEMAS } from '../constants/data'

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

const ContinueBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  background: #ff751f;
  border: 1.5px solid #ff751f;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  &:hover {
    background: #e6600c;
    border-color: #e6600c;
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

const ActionBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  white-space: nowrap;

  border: 1.5px solid ${({ $active, $type }) => ($active ? ($type === 'watched' ? '#2e7d32' : '#ff751f') : '#ddd')};
  background: ${({ $active, $type }) => ($active ? ($type === 'watched' ? 'rgba(46,125,50,0.1)' : 'rgba(255,117,31,0.1)') : '#fff')};
  color: ${({ $active, $type }) => ($active ? ($type === 'watched' ? '#2e7d32' : '#ff751f') : '#666')};

  &:hover {
    border-color: #111;
    color: #111;
  }
`

const DismissBtn = styled.button`
  background: none;
  border: none;
  color: #aaa;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  cursor: pointer;
  padding: 2px 4px;
  &:hover { color: #e05353; }
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
  const { sessionId, tasteClusters, favoriteRatings, selectedCinemas, userTasteProfile } = useTasteProfile()
  const { user } = getAuthStatus()
  const isReturningUser = localStorage.getItem('filmism_is_returning_user') === 'true'

  let greetingTitle = 'Welcome to Filmism'
  if (user?.firstName) {
    greetingTitle = isReturningUser ? `Welcome back, ${user.firstName}` : `Welcome, ${user.firstName}`
  } else if (isReturningUser) {
    greetingTitle = 'Welcome back'
  }

  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activePersonaFilter, setActivePersonaFilter] = useState('all')
  const [activeOriginFilter, setActiveOriginFilter] = useState('all')
  const [userOrigins, setUserOrigins] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [watchedOutcomes, setWatchedOutcomes] = useState({}) // { [tmdbId]: ratingNumber }
  const [profileRatings, setProfileRatings] = useState({}) // { [tmdbId]: ratingNumber } from onboarding/profile
  const [dismissed, setDismissed] = useState([])
  const [activeModalMovie, setActiveModalMovie] = useState(null)
  const [telemetry, setTelemetry] = useState({ hitRate: 88, totalShown: 0 })
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

  const fetchRecommendations = async (pageNum = 1, append = false, refresh = false) => {
    if (refresh) setIsRefreshing(true)
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const [recsRes, statsRes] = await Promise.allSettled([
        api.get('/recommendations/ranked', { params: { sessionId, page: pageNum, limit: 12, refresh } }),
        api.get('/recommendations/telemetry-stats', { params: { sessionId } }),
      ])

      if (recsRes.status === 'fulfilled' && recsRes.value.data?.recommendations) {
        const newRecs = recsRes.value.data.recommendations
        setHasMore(recsRes.value.data.hasMore !== undefined ? recsRes.value.data.hasMore : newRecs.length >= 12)
        setPage(pageNum)

        if (recsRes.value.data.selectedOrigins?.length > 0) {
          setUserOrigins((prev) => Array.from(new Set([...prev, ...recsRes.value.data.selectedOrigins])))
        }

        if (append) {
          setRecommendations((prev) => {
            const existingIds = new Set(prev.map((r) => r.id))
            const filteredNew = newRecs.filter((r) => !existingIds.has(r.id))
            return [...prev, ...filteredNew]
          })
        } else {
          setRecommendations(newRecs)
        }
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data?.stats) {
        setTelemetry(statsRes.value.data.stats)
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
    const fetchInitialData = async () => {
      // Initialize user origins from taste context if present
      if (selectedCinemas?.length > 0) {
        setUserOrigins(selectedCinemas)
      } else if (userTasteProfile?.selectedOrigins?.length > 0) {
        setUserOrigins(userTasteProfile.selectedOrigins)
      }

      // 1. Fetch user's existing logs and profile data
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
          }
          if (tp.selectedOrigins?.length > 0) {
            setUserOrigins(tp.selectedOrigins)
          }
        }
      } catch (e) {
        // silent fallback
      }

      // 2. Fetch recommendations
      const needsRefresh = localStorage.getItem('filmism_needs_refresh') === 'true'
      if (needsRefresh) {
        localStorage.removeItem('filmism_needs_refresh')
        fetchRecommendations(1, false, true)
      } else {
        fetchRecommendations(1, false)
      }
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
    setRecommendations((prev) => prev.filter((m) => Number(m.id || m.tmdbId) !== movieId))

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
    } catch (e) { }
  }

  const handleDismiss = async (movie) => {
    const movieId = Number(movie.id || movie.tmdbId)
    setDismissed((prev) => [...prev, movieId])
    setRecommendations((prev) => prev.filter((m) => Number(m.id || m.tmdbId) !== movieId))
    try {
      await api.post('/recommendations/action', {
        sessionId,
        tmdbId: movieId,
        title: movie.title,
        sourceClusterId: movie.sourceClusterId,
        action: 'dismissed',
      })
    } catch (e) { }
  }

  const handleOpenWatchedModal = (movie) => {
    setActiveModalMovie(movie)
  }

  const handleSubmitOutcome = async (movie, outcomeRating) => {
    const movieId = Number(movie.id || movie.tmdbId)
    setWatchedOutcomes((prev) => ({
      ...prev,
      [movieId]: outcomeRating,
    }))
    setRecommendations((prev) => prev.filter((m) => Number(m.id || m.tmdbId) !== movieId))
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

  ;(userOrigins || []).forEach((o) => {
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
            <RefineBtn
              style={{ background: '#fff', color: '#111', border: '1.5px solid #ccc', opacity: isRefreshing ? 0.7 : 1, fontSize: '0.75rem', padding: '4px 10px' }}
              disabled={isRefreshing}
              onClick={() => fetchRecommendations(1, false, true)}
            >
              {isRefreshing ? '↻ Refreshing...' : '↻ Refresh Matches'}
            </RefineBtn>
            <ContinueBtn onClick={() => navigate('/taste?mode=continue')}>
              + Continue Build Profile
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

          {loading ? (
            <EmptyState>Loading personalized recommendations...</EmptyState>
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
                          <ActionBtn
                            $type="watchlist"
                            $active={isWatchlisted}
                            onClick={() => handleToggleWatchlist(rec)}
                          >
                            {isWatchlisted ? '✓ Watchlisted' : '+ Watchlist'}
                          </ActionBtn>
                          <ActionBtn
                            $type="watched"
                            $active={isWatched}
                            onClick={() => handleOpenWatchedModal(rec)}
                          >
                            {isWatched ? '✓ Rated Outcome' : 'Mark Watched'}
                          </ActionBtn>
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