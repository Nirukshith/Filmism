import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link } from 'react-router-dom'
import api from '../services/api'
import UserAvatar from '../components/UserAvatar'
import { useTasteProfile } from '../hooks/useTasteProfile'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

const RATING_TIERS = [
  { value: 4, label: 'great',       symbol: '♥', desc: 'Masterpiece / Loved it',         color: '#2e7d32', bg: 'rgba(46,125,50,0.1)'   },
  { value: 3, label: 'good',        symbol: '★', desc: 'Solid film / Enjoyed it',        color: '#ff751f', bg: 'rgba(255,117,31,0.1)'  },
  { value: 2, label: 'okay',        symbol: '—', desc: 'Decent / Mixed feelings',        color: '#888',    bg: 'rgba(0,0,0,0.06)'      },
  { value: 1, label: 'not for me',  symbol: '✕', desc: 'Disliked / Didn\'t connect',      color: '#c0392b', bg: 'rgba(192,57,43,0.08)' },
]

const RATING_CONFIG = {
  'great':       { label: 'great',       symbol: '♥', color: '#2e7d32', bg: 'rgba(46,125,50,0.1)'   },
  'good':        { label: 'good',        symbol: '★', color: '#ff751f', bg: 'rgba(255,117,31,0.1)'  },
  'okay':        { label: 'okay',        symbol: '—', color: '#888',    bg: 'rgba(0,0,0,0.06)'      },
  'not for me':  { label: 'not for me',  symbol: '✕', color: '#c0392b', bg: 'rgba(192,57,43,0.08)' },
  'none':        { label: 'unrated',     symbol: '○', color: '#bbb',    bg: 'rgba(0,0,0,0.04)'      },
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const PageWrapper = styled.main`
  width: 100%; min-height: 100vh; background: #efefef; display: flex; flex-direction: column;
`
const Topbar = styled.header`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1.75rem; border-bottom: 1.5px solid #ddd;
  background: #efefef; position: sticky; top: 0; z-index: 30;
  @media (max-width: 640px) { padding: 0.65rem 1rem; }
`
const Logo = styled.span`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem; font-weight: 700; color: #111; user-select: none; cursor: default;
  @media (max-width: 480px) { font-size: 1.25rem; }
`
const PageBody = styled.div`
  flex: 1; padding: 1rem 1.75rem 4.5rem; max-width: 1380px; width: 100%; margin: 0 auto;
  @media (max-width: 768px) { padding: 0.75rem 0.75rem 4.5rem; }
`
const PageHeader = styled.div`
  margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1.5px solid #ddd;
  display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
`
const PageTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.4rem, 5vw, 2.2rem); font-weight: 700; color: #111; margin: 0; line-height: 1.1;
`
const PageCount = styled.span`
  font-family: 'Lexend Deca', sans-serif; font-size: 0.78rem; color: #888;
`
const pulse = keyframes`0%,100%{opacity:0.4}50%{opacity:1}`
const LoadingText = styled.p`
  font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem; color: #888;
  text-align: center; padding: 4rem 0; animation: ${pulse} 1.6s ease infinite;
`
const EmptyState = styled.div`text-align: center; padding: 5rem 1rem;`
const EmptyTitle = styled.p`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.2rem; color: #111; margin: 0 0 0.5rem;
`
const EmptySub = styled.p`font-family: 'Lexend Deca', sans-serif; font-size: 0.85rem; color: #888; margin: 0 0 1.5rem;`
const EmptyLink = styled(Link)`
  font-family: 'Lexend Deca', sans-serif; font-size: 0.85rem; font-weight: 700;
  color: #fff; background: #ff751f; border: none; padding: 0.6rem 1.4rem;
  border-radius: 6px; text-decoration: none; transition: background 0.2s;
  &:hover { background: #e6600c; }
`
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`
const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 0.85rem;
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }
`
const Card = styled.div`
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e5e5;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: ${fadeIn} 0.25s ease both;
  animation-delay: ${({ $i }) => Math.min($i * 0.02, 0.3)}s;
  display: flex;
  flex-direction: column;
  position: relative;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,0.08);
  }
`
const PosterWrap = styled.div`
  width: 100%;
  aspect-ratio: 2/3;
  background: #e0e0e0;
  position: relative;
  overflow: hidden;
`
const Poster = styled.img`width: 100%; height: 100%; object-fit: cover; display: block;`
const PosterFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #aaa;
  text-align: center;
  padding: 0.4rem;
`

const ReviewPillBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 3px 5px;
  border-radius: 999px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.61rem;
  font-weight: 700;
  text-transform: lowercase;
  letter-spacing: 0.02em;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $color }) => $color}44;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  flex: 1;
  min-width: 0;

  &:hover {
    border-color: ${({ $color }) => $color};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }

  span.pill-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span.edit-icon {
    font-size: 0.58rem;
    opacity: 0.65;
    flex-shrink: 0;
  }
`

const CardBody = styled.div`
  padding: 0.45rem 0.55rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.18rem;
  flex: 1;
  text-align: center;
`
const CardTitle = styled.p`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.69rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.25;
  word-break: break-word;
  overflow-wrap: break-word;
`
const CardYear = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.6rem;
  color: #aaa;
  margin: 0;
  letter-spacing: 0.02em;
`

const CardActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: auto;
  padding-top: 0.35rem;
  width: 100%;
`

const RemoveBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.64rem;
  color: #999;
  background: transparent;
  border: 1px solid transparent;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    color: #e05353;
    background: #fdf2f2;
    border-color: rgba(224, 83, 83, 0.2);
  }
`

const ModalRemoveBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.76rem;
  font-weight: 600;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.06);
  border: 1px solid rgba(192, 57, 43, 0.2);
  border-radius: 6px;
  padding: 0.65rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  margin-top: 1.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: #c0392b;
    color: #fff;
    border-color: #c0392b;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(192, 57, 43, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ConfirmModalCard = styled.div`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1.6rem;
  max-width: 420px;
  width: 100%;
  color: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
  position: relative;
  animation: ${scaleIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const ConfirmTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.05rem;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const ConfirmBody = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #a1a1aa;
  margin: 0;
  line-height: 1.5;

  strong {
    color: #fff;
  }
`

const ConfirmFilmCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
`

const ConfirmPoster = styled.img`
  width: 42px;
  height: 62px;
  border-radius: 6px;
  object-fit: cover;
  background: #27272a;
`

const ConfirmFilmDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden;
`

const ConfirmFilmTitle = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ConfirmFilmYear = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #888;
`

const ConfirmButtonGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const CancelBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #d4d4d8;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
`

const DeleteConfirmBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  border: none;
  background: #c0392b;
  color: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    background: #e74c3c;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(231, 76, 60, 0.35);
  }
`

const FilterTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`

const FilterBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  border: 1.5px solid ${({ $active }) => ($active ? '#ff751f' : '#ddd')};
  background: ${({ $active }) => ($active ? '#ff751f' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#555')};
  cursor: pointer;
  transition: all 0.2s;
  text-transform: lowercase;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    border-color: #ff751f;
    color: ${({ $active }) => ($active ? '#fff' : '#ff751f')};
  }

  span.count {
    opacity: 0.75;
    font-size: 0.72rem;
  }
`

const FavoriteBadge = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(17, 17, 17, 0.85);
  backdrop-filter: blur(4px);
  color: #ffb800;
  border: 1px solid rgba(255, 184, 0, 0.4);
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 1.5px 5px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 2px;
  letter-spacing: 0.02em;
  text-transform: lowercase;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  z-index: 2;
`

// ─── Clean Rating Modal ────────────────────────────────────────────────────────

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  z-index: 100;
  animation: ${fadeIn} 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`

const ModalCard = styled.div`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 440px;
  width: 100%;
  color: #fff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  position: relative;
  animation: ${scaleIn} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`

const ModalCloseBtn = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #aaa;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
  }
`

const FilmHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding-right: 2rem;
`

const ModalPoster = styled.img`
  width: 52px;
  height: 78px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #27272a;
`

const ModalFilmInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

const ModalFilmTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1rem;
  color: #fff;
  margin: 0;
  line-height: 1.2;
`

const ModalFilmSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #a1a1aa;
  margin: 0;
`

const ModalInstruction = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #d4d4d8;
  margin: 0 0 1rem;
  line-height: 1.4;
`

const TierList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`

const TierCardBtn = styled.button`
  background: ${({ $active }) => ($active ? 'rgba(255, 117, 31, 0.15)' : 'rgba(255, 255, 255, 0.04)')};
  border: 1.5px solid ${({ $active, $color }) => ($active ? '#ff751f' : 'rgba(255, 255, 255, 0.08)')};
  border-radius: 10px;
  padding: 0.75rem 0.95rem;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;

  &:hover {
    border-color: ${({ $color }) => $color};
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const TierLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const TierIconBox = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
`

const TierTextCol = styled.div`
  display: flex;
  flex-direction: column;
`

const TierName = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: capitalize;
  color: #fff;
`

const TierDesc = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #a1a1aa;
`

const ToastBanner = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #111827;
  color: #fff;
  padding: 0.75rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 117, 31, 0.4);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  z-index: 120;
  animation: ${fadeIn} 0.2s ease-out;

  span.icon {
    color: #ff751f;
    font-weight: 700;
  }
`

// ─── Component ────────────────────────────────────────────────────────────────

function Diary() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'favorites' | 'watched'
  const [editingFilm, setEditingFilm] = useState(null)
  const [confirmDeleteFilm, setConfirmDeleteFilm] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const {
    setTasteClusters,
    setAiSynthesis,
    removeMovieFromDashboard,
    cachedWatchedOutcomes,
    updateWatchedOutcomes,
    cachedProfileRatings,
    updateProfileRatings,
  } = useTasteProfile()

  useEffect(() => {
    const sessionId = localStorage.getItem('filmism_session_id') || undefined
    api.get('/recommendations/diary', { params: { sessionId } })
      .then((res) => {
        const diaryList = res.data?.diary || []
        setItems(diaryList)
        if (updateWatchedOutcomes && diaryList.length > 0) {
          const outcomes = { ...(cachedWatchedOutcomes || {}) }
          diaryList.forEach((item) => {
            const id = Number(item.tmdbId || item.id)
            if (id) outcomes[id] = item.outcomeRating || 3
          })
          updateWatchedOutcomes(outcomes)
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const handleRatingChange = async (tier) => {
    if (!editingFilm) return
    setIsUpdating(true)
    const sessionId = localStorage.getItem('filmism_session_id') || undefined

    try {
      const response = await api.put('/taste-profile/favorite-rating', {
        tmdbId: editingFilm.tmdbId,
        rating: tier.value,
        title: editingFilm.title,
        sessionId,
      })

      if (response.data?.success) {
        // Update item in local list
        setItems((prev) =>
          prev.map((item) =>
            item.tmdbId === editingFilm.tmdbId
              ? { ...item, outcomeRating: tier.value, outcomeLabel: tier.label }
              : item
          )
        )

        // Immediately sync review graph metrics
        if (updateWatchedOutcomes) {
          updateWatchedOutcomes({ ...(cachedWatchedOutcomes || {}), [editingFilm.tmdbId]: tier.value })
        }
        if (updateProfileRatings) {
          updateProfileRatings({ ...(cachedProfileRatings || {}), [editingFilm.tmdbId]: tier.value })
        }

        // Sync recalculated taste clusters to context & storage
        if (response.data.clusters) {
          setTasteClusters(response.data.clusters)
          localStorage.setItem('filmism_taste_clusters', JSON.stringify(response.data.clusters))
        }
        if (response.data.aiSynthesis) {
          setAiSynthesis(response.data.aiSynthesis)
          localStorage.setItem('filmism_ai_synthesis', response.data.aiSynthesis)
        }

        localStorage.setItem('filmism_needs_refresh', 'true')
        setToastMessage(`Updated rating for "${editingFilm.title}" & re-calibrated taste clusters!`)
        setTimeout(() => setToastMessage(''), 4000)
      }
    } catch (err) {
      console.error('Failed to update film rating:', err)
      setToastMessage('Failed to update rating. Please try again.')
      setTimeout(() => setToastMessage(''), 3000)
    } finally {
      setIsUpdating(false)
      setEditingFilm(null)
    }
  }

  const handleConfirmRemove = async () => {
    if (!confirmDeleteFilm) return
    const film = confirmDeleteFilm
    const tmdbId = Number(film.tmdbId)

    // Optimistically remove from grid
    setItems((prev) => prev.filter((item) => Number(item.tmdbId) !== tmdbId))
    setConfirmDeleteFilm(null)

    // Keep review graph cached counts synchronized immediately
    if (updateWatchedOutcomes && cachedWatchedOutcomes) {
      const nextOutcomes = { ...cachedWatchedOutcomes }
      delete nextOutcomes[tmdbId]
      updateWatchedOutcomes(nextOutcomes)
    }
    if (updateProfileRatings && cachedProfileRatings) {
      const nextProfile = { ...cachedProfileRatings }
      delete nextProfile[tmdbId]
      updateProfileRatings(nextProfile)
    }

    try {
      const sessionId = localStorage.getItem('filmism_session_id') || undefined
      const response = await api.delete(`/recommendations/diary/${tmdbId}`, { params: { sessionId } })

      // Sync recalculated taste clusters to context & storage if favorites were updated
      if (response.data?.clusters) {
        setTasteClusters(response.data.clusters)
        localStorage.setItem('filmism_taste_clusters', JSON.stringify(response.data.clusters))
      }
      if (response.data?.aiSynthesis) {
        setAiSynthesis(response.data.aiSynthesis)
        localStorage.setItem('filmism_ai_synthesis', response.data.aiSynthesis)
      }

      if (removeMovieFromDashboard) {
        removeMovieFromDashboard(tmdbId)
      }

      setToastMessage(
        response.data?.clusters
          ? `Removed "${film.title}" & re-calibrated taste vectors!`
          : `Removed "${film.title}" from film logs & marked as unwatched.`
      )
      setTimeout(() => setToastMessage(''), 3500)
    } catch (err) {
      console.error('Failed to remove film from diary:', err)
      setToastMessage('Failed to remove film. Please try again.')
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const favoritesCount = items.filter((f) => f.isFavorite).length
  const watchedCount = items.filter((f) => f.source === 'watched').length

  const filteredItems = items.filter((film) => {
    if (filter === 'favorites') return film.isFavorite
    if (filter === 'watched') return film.source === 'watched'
    return true
  })

  return (
    <PageWrapper>
      <Topbar>
        <Logo>Filmism</Logo>
        <UserAvatar />
      </Topbar>
      <PageBody>
        <PageHeader>
          <div>
            <PageTitle>film logs</PageTitle>
            {!loading && (
              <PageCount>
                {items.length === 0 ? 'no films logged yet' : `${items.length} total film${items.length !== 1 ? 's' : ''} in your cinema history`}
              </PageCount>
            )}
          </div>

          {!loading && items.length > 0 && (
            <FilterTabs>
              <FilterBtn $active={filter === 'all'} onClick={() => setFilter('all')}>
                all <span className="count">({items.length})</span>
              </FilterBtn>
              <FilterBtn $active={filter === 'favorites'} onClick={() => setFilter('favorites')}>
                ★ favorites <span className="count">({favoritesCount})</span>
              </FilterBtn>
              <FilterBtn $active={filter === 'watched'} onClick={() => setFilter('watched')}>
                watched <span className="count">({watchedCount})</span>
              </FilterBtn>
            </FilterTabs>
          )}
        </PageHeader>

        {loading ? (
          <LoadingText>loading your film logs...</LoadingText>
        ) : items.length === 0 ? (
          <EmptyState>
            <EmptyTitle>no films logged yet.</EmptyTitle>
            <EmptySub>Build your taste profile or mark films as watched to see your cinema log here.</EmptySub>
            <EmptyLink to="/taste">build taste profile →</EmptyLink>
          </EmptyState>
        ) : filteredItems.length === 0 ? (
          <EmptyState>
            <EmptyTitle>no {filter} found.</EmptyTitle>
            <EmptySub>You don't have any films under this filter category yet.</EmptySub>
            <EmptyLink as="button" onClick={() => setFilter('all')}>view all logged films</EmptyLink>
          </EmptyState>
        ) : (
          <Grid>
            {filteredItems.map((film, i) => {
              const rc = RATING_CONFIG[film.outcomeLabel] || RATING_CONFIG['none']

              return (
                <Card key={`${film.tmdbId}-${film.source || ''}-${i}`} $i={i}>
                  <PosterWrap>
                    {film.isFavorite && (
                      <FavoriteBadge>★ favorite</FavoriteBadge>
                    )}
                    {film.poster_path
                      ? <Poster src={`${TMDB_IMG}${film.poster_path}`} alt={film.title} loading="lazy" />
                      : <PosterFallback>{film.title}</PosterFallback>
                    }
                  </PosterWrap>
                  <CardBody>
                    <CardTitle title={film.title}>{film.title}</CardTitle>
                    {film.year && <CardYear>{film.year}</CardYear>}

                    <CardActions>
                      <ReviewPillBtn
                        type="button"
                        $color={rc.color}
                        $bg={rc.bg}
                        onClick={() => setEditingFilm(film)}
                        title="Click to edit rating & re-tune taste profile"
                      >
                        <span className="pill-label">{rc.symbol} {rc.label}</span>
                        <span className="edit-icon">✎</span>
                      </ReviewPillBtn>

                      <RemoveBtn
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDeleteFilm(film)
                        }}
                        title="Remove from film logs and mark as unwatched"
                        aria-label="Remove film"
                      >
                        ✕
                      </RemoveBtn>
                    </CardActions>
                  </CardBody>
                </Card>
              )
            })}
          </Grid>
        )}

        {/* ── Sleek Rating Edit Modal ── */}
        {editingFilm && (
          <ModalOverlay onClick={() => !isUpdating && setEditingFilm(null)}>
            <ModalCard onClick={(e) => e.stopPropagation()}>
              <ModalCloseBtn onClick={() => !isUpdating && setEditingFilm(null)} aria-label="Close">
                ✕
              </ModalCloseBtn>

              <FilmHeaderRow>
                {editingFilm.poster_path ? (
                  <ModalPoster src={`${TMDB_IMG}${editingFilm.poster_path}`} alt={editingFilm.title} />
                ) : null}
                <ModalFilmInfo>
                  <ModalFilmTitle>{editingFilm.title}</ModalFilmTitle>
                  <ModalFilmSub>{editingFilm.year || 'Film Log'}</ModalFilmSub>
                </ModalFilmInfo>
              </FilmHeaderRow>

              <ModalInstruction>
                Select your rating verdict below. Your taste clusters and recommendation weights will automatically recalibrate in real time:
              </ModalInstruction>

              <TierList>
                {RATING_TIERS.map((tier) => {
                  const isActive = editingFilm.outcomeLabel === tier.label
                  return (
                    <TierCardBtn
                      key={tier.value}
                      type="button"
                      $active={isActive}
                      $color={tier.color}
                      disabled={isUpdating}
                      onClick={() => handleRatingChange(tier)}
                    >
                      <TierLeft>
                        <TierIconBox $color={tier.color} $bg={tier.bg}>
                          {tier.symbol}
                        </TierIconBox>
                        <TierTextCol>
                          <TierName>{tier.label}</TierName>
                          <TierDesc>{tier.desc}</TierDesc>
                        </TierTextCol>
                      </TierLeft>
                      {isActive && <span style={{ color: '#ff751f', fontSize: '0.85rem' }}>✓ Current</span>}
                    </TierCardBtn>
                  )
                })}
              </TierList>

              <ModalRemoveBtn
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  const filmToConfirm = editingFilm
                  setEditingFilm(null)
                  setConfirmDeleteFilm(filmToConfirm)
                }}
                title="Remove this film from your logs and mark it as unwatched"
              >
                ✕ Remove & Mark as Unwatched
              </ModalRemoveBtn>
            </ModalCard>
          </ModalOverlay>
        )}

        {/* ── Confirmation Modal ── */}
        {confirmDeleteFilm && (
          <ModalOverlay onClick={() => setConfirmDeleteFilm(null)}>
            <ConfirmModalCard onClick={(e) => e.stopPropagation()}>
              <ModalCloseBtn onClick={() => setConfirmDeleteFilm(null)} aria-label="Close">
                ✕
              </ModalCloseBtn>

              <ConfirmTitle>Remove Film?</ConfirmTitle>

              <ConfirmFilmCard>
                {confirmDeleteFilm.poster_path ? (
                  <ConfirmPoster
                    src={`${TMDB_IMG}${confirmDeleteFilm.poster_path}`}
                    alt={confirmDeleteFilm.title}
                  />
                ) : null}
                <ConfirmFilmDetails>
                  <ConfirmFilmTitle title={confirmDeleteFilm.title}>
                    {confirmDeleteFilm.title}
                  </ConfirmFilmTitle>
                  {confirmDeleteFilm.year && (
                    <ConfirmFilmYear>{confirmDeleteFilm.year}</ConfirmFilmYear>
                  )}
                </ConfirmFilmDetails>
              </ConfirmFilmCard>

              <ConfirmBody>
                Are you sure you want to remove <strong>{confirmDeleteFilm.title}</strong>? It will be marked as unwatched and removed from your film logs.
              </ConfirmBody>

              <ConfirmButtonGroup>
                <CancelBtn type="button" onClick={() => setConfirmDeleteFilm(null)}>
                  Cancel
                </CancelBtn>
                <DeleteConfirmBtn type="button" onClick={handleConfirmRemove}>
                  ✕ Remove & Unwatch
                </DeleteConfirmBtn>
              </ConfirmButtonGroup>
            </ConfirmModalCard>
          </ModalOverlay>
        )}

        {toastMessage && (
          <ToastBanner>
            <span className="icon">✦</span>
            <span>{toastMessage}</span>
          </ToastBanner>
        )}
      </PageBody>
    </PageWrapper>
  )
}

export default Diary
