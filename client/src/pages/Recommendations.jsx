import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'
import api from '../services/api'
import PostWatchModal from '../components/PostWatchModal'
import RecalibrateModal from '../components/RecalibrateModal'

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
  padding: 1.1rem 3rem;
  border-bottom: 1.5px solid #ddd;
  background: #efefef;
  position: sticky;
  top: 0;
  z-index: 30;
  @media (max-width: 640px) { padding: 1rem 1.25rem; }
`

const Logo = styled(Link)`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  text-decoration: none;
  letter-spacing: -0.01em;
`

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const TelemetryBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #ddd;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #555;

  span {
    color: #2e7d32;
    font-weight: 700;
  }
`

const RecalBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #555;
  background: transparent;
  border: 1.5px solid #ccc;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #111; color: #111; }
`

const PageBody = styled.div`
  flex: 1;
  padding: 2.5rem 3rem 8rem;
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 1.5rem 1.25rem 8rem; }
`

const ProfilePanel = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
`

const ProfileTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
`

const ProfileTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.8rem, 3.5vw, 2.5rem);
  font-weight: 700;
  color: #111;
  line-height: 1.15;
  margin: 0 0 0.5rem;
`

const ProfileSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.92rem;
  color: #666;
  line-height: 1.6;
  margin: 0;
  max-width: 680px;
`

const RefineBtn = styled.button`
  background: #111;
  color: #fff;
  border: 1.5px solid #111;
  border-radius: 6px;
  padding: 8px 16px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  &:hover { background: transparent; color: #111; }
`

const ClustersRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid #eee;
`

const ClusterTag = styled.span`
  background: rgba(255, 117, 31, 0.1);
  color: #ff751f;
  border: 1px solid rgba(255, 117, 31, 0.25);
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
`

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding-bottom: 4px;
`

const FilterPill = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1.5px solid ${({ $active }) => ($active ? '#111' : '#ddd')};
  background: ${({ $active }) => ($active ? '#111' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#555')};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  white-space: nowrap;
  transition: all 0.2s;
  &:hover { border-color: #111; }
`

const RecList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const RecCard = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 14px;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 1.5rem;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: #ff751f;
    box-shadow: 0 10px 25px rgba(255, 117, 31, 0.1);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const RecPoster = styled.div`
  width: 140px;
  height: 190px;
  border-radius: 8px;
  background: ${({ $posterPath, $c1, $c2 }) =>
    $posterPath
      ? `url(https://image.tmdb.org/t/p/w500${$posterPath}) center / cover no-repeat`
      : `linear-gradient(180deg, ${$c1 || '#0d1b2a'}, ${$c2 || '#1e4d7b'})`};
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);

  @media (max-width: 768px) {
    width: 100%;
    height: 200px;
  }
`

const RecBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const RecTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const RecTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.2;
`

const MatchPill = styled.span`
  background: #2e7d32;
  color: #fff;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
`

const ClusterSourceBadge = styled.span`
  background: #f0f0f0;
  color: #444;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
`

const RecMeta = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #777;
`

const WhyBox = styled.div`
  background: #fafafa;
  border-left: 3px solid #ff751f;
  padding: 0.75rem 1rem;
  border-radius: 0 8px 8px 0;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #333;
  line-height: 1.5;

  strong {
    color: #ff751f;
  }
`

const OutcomeBadge = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.1);
  border: 1px solid rgba(46, 125, 50, 0.25);
  padding: 3px 8px;
  border-radius: 4px;
  width: fit-content;
`

const RecRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;

  @media (max-width: 768px) {
    align-items: flex-start;
    flex-direction: row;
  }
`

const ActionBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
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
  font-size: 0.7rem;
  cursor: pointer;
  padding: 4px 6px;
  &:hover { color: #e05353; }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.95rem;
  color: #888;
`

const LoadMoreWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 2.5rem;
  gap: 0.75rem;
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
  const { sessionId, tasteClusters } = useTasteProfile()

  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [watchlist, setWatchlist] = useState([])
  const [watchedOutcomes, setWatchedOutcomes] = useState({}) // { [tmdbId]: ratingNumber }
  const [dismissed, setDismissed] = useState([])
  const [activeModalMovie, setActiveModalMovie] = useState(null)
  const [showRecalibrateModal, setShowRecalibrateModal] = useState(false)
  const [telemetry, setTelemetry] = useState({ hitRate: 88, totalShown: 0 })

  const fetchRecommendations = async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const [recsRes, statsRes] = await Promise.allSettled([
        api.get('/recommendations/ranked', { params: { sessionId, page: pageNum, limit: 12 } }),
        api.get('/recommendations/telemetry-stats', { params: { sessionId } }),
      ])

      if (recsRes.status === 'fulfilled' && recsRes.value.data?.recommendations) {
        const newRecs = recsRes.value.data.recommendations
        setHasMore(recsRes.value.data.hasMore !== undefined ? recsRes.value.data.hasMore : newRecs.length >= 12)
        setPage(pageNum)

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
    }
  }

  // Fetch real ranked recommendations and telemetry stats
  useEffect(() => {
    fetchRecommendations(1, false)
  }, [sessionId])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchRecommendations(page + 1, true)
    }
  }

  const handleToggleWatchlist = async (movie) => {
    const isCurrentlyWatchlisted = watchlist.includes(movie.id)
    const newWatchlist = isCurrentlyWatchlisted
      ? watchlist.filter((x) => x !== movie.id)
      : [...watchlist, movie.id]

    setWatchlist(newWatchlist)

    try {
      await api.post('/recommendations/action', {
        sessionId,
        tmdbId: movie.id,
        title: movie.title,
        sourceClusterId: movie.sourceClusterId,
        sourceClusterName: movie.sourceClusterName,
        matchScore: movie.match,
        action: isCurrentlyWatchlisted ? 'shown' : 'watchlisted',
      })
    } catch (e) {}
  }

  const handleDismiss = async (movie) => {
    setDismissed((prev) => [...prev, movie.id])
    try {
      await api.post('/recommendations/action', {
        sessionId,
        tmdbId: movie.id,
        title: movie.title,
        sourceClusterId: movie.sourceClusterId,
        action: 'dismissed',
      })
    } catch (e) {}
  }

  const handleOpenWatchedModal = (movie) => {
    setActiveModalMovie(movie)
  }

  const handleSubmitOutcome = async (movie, outcomeRating) => {
    setWatchedOutcomes((prev) => ({
      ...prev,
      [movie.id]: outcomeRating,
    }))
    setActiveModalMovie(null)

    try {
      await api.post('/recommendations/outcome', {
        sessionId,
        tmdbId: movie.id,
        outcomeRating,
        sourceClusterId: movie.sourceClusterId,
      })
      // Refresh telemetry hit-rate
      const statsRes = await api.get('/recommendations/telemetry-stats', { params: { sessionId } })
      if (statsRes.data?.stats) {
        setTelemetry(statsRes.data.stats)
      }
    } catch (e) {
      console.warn('Failed to record outcome:', e.message)
    }
  }

  const activeRecs = recommendations.filter((r) => !dismissed.includes(r.id))

  // Filter options
  const filterOptions = ['all']
  activeRecs.forEach((r) => {
    if (r.sourceClusterName && !filterOptions.includes(r.sourceClusterName)) {
      filterOptions.push(r.sourceClusterName)
    }
  })

  const filteredRecs = activeRecs.filter((r) => {
    if (activeFilter === 'all') return true
    return r.sourceClusterName === activeFilter || r.genre === activeFilter
  })

  return (
    <>
      {activeModalMovie && (
        <PostWatchModal
          movie={activeModalMovie}
          onClose={() => setActiveModalMovie(null)}
          onSubmit={handleSubmitOutcome}
        />
      )}

      <RecalibrateModal
        isOpen={showRecalibrateModal}
        onClose={() => setShowRecalibrateModal(false)}
      />

      <PageWrapper>
        <Topbar>
          <Logo to="/">Filmism</Logo>
          <TopbarRight>
            <TelemetryBadge>
              hit rate: <span>{telemetry.hitRate || 88}%</span>
            </TelemetryBadge>
            <RecalBtn onClick={() => setShowRecalibrateModal(true)}>recalibrate profile →</RecalBtn>
          </TopbarRight>
        </Topbar>

        <PageBody>
          <ProfilePanel>
            <ProfileTop>
              <div>
                <ProfileTitle>Your Ranked Matches</ProfileTitle>
                <ProfileSub>
                  Personalized cinematic recommendations scored across your distinct taste personas.
                  Separating pre-watch intent from post-watch outcome ratings.
                </ProfileSub>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <RefineBtn style={{ background: '#fff', color: '#111', border: '1.5px solid #ccc' }} onClick={() => fetchRecommendations(1, false)}>
                  ↻ Refresh Matches
                </RefineBtn>
                <RefineBtn onClick={() => setShowRecalibrateModal(true)}>
                  + Recalibrate Taste
                </RefineBtn>
              </div>
            </ProfileTop>

            {tasteClusters?.length > 0 && (
              <ClustersRow>
                <span style={{ fontFamily: 'Lexend Deca', fontSize: '0.75rem', color: '#888' }}>
                  active personas:
                </span>
                {tasteClusters.map((c, i) => (
                  <ClusterTag key={c.clusterId || i}>{c.name}</ClusterTag>
                ))}
              </ClustersRow>
            )}
          </ProfilePanel>

          {filterOptions.length > 1 && (
            <FilterBar>
              {filterOptions.map((f) => (
                <FilterPill
                  key={f}
                  $active={activeFilter === f}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </FilterPill>
              ))}
            </FilterBar>
          )}

          {loading ? (
            <EmptyState>Loading personalized recommendations...</EmptyState>
          ) : filteredRecs.length === 0 ? (
            <EmptyState>No recommendations found matching filter.</EmptyState>
          ) : (
            <>
              <RecList>
                {filteredRecs.map((rec) => {
                  const isWatchlisted = watchlist.includes(rec.id)
                  const outcomeRating = watchedOutcomes[rec.id]
                  const isWatched = outcomeRating !== undefined

                  return (
                    <RecCard key={rec.id} id={`rec-${rec.id}`}>
                      <RecPoster
                        $posterPath={rec.posterPath}
                        $c1={rec.c1}
                        $c2={rec.c2}
                      />

                      <RecBody>
                        <RecTopRow>
                          <RecTitle>{rec.title}</RecTitle>
                          <MatchPill>{rec.match}% Match</MatchPill>
                          {rec.sourceClusterName && (
                            <ClusterSourceBadge>{rec.sourceClusterName}</ClusterSourceBadge>
                          )}
                          {outcomeRating && (
                            <OutcomeBadge>
                              Verdict: {outcomeRating === 4 ? '✦ Great' : outcomeRating === 3 ? '★ Good' : outcomeRating === 2 ? '∼ Okay' : '✕ Not for me'}
                            </OutcomeBadge>
                          )}
                        </RecTopRow>

                        <RecMeta>
                          {rec.year} · {(rec.genres || [rec.genre]).join(' · ')} · directed by {rec.director}
                        </RecMeta>

                        <WhyBox>
                          <strong>Why you'll like this: </strong>
                          {rec.why}
                        </WhyBox>
                      </RecBody>

                      <RecRight>
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
                        <DismissBtn onClick={() => handleDismiss(rec)}>
                          not interested ✕
                        </DismissBtn>
                      </RecRight>
                    </RecCard>
                  )
                })}
              </RecList>

              {activeFilter === 'all' && (
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