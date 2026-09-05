import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import UserAvatar from '../components/UserAvatar'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

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

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const PageBody = styled.div`
  flex: 1;
  padding: 1rem 1.75rem 4.5rem;
  max-width: 1380px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 0.85rem 1rem 4.5rem; }
`

const PageHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1.5px solid #ddd;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const PageTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.1;
`

const PageCount = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #888;
`

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`

const LoadingText = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.9rem;
  color: #888;
  text-align: center;
  padding: 4rem 0;
  animation: ${pulse} 1.6s ease infinite;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 5rem 1rem;
`

const EmptyTitle = styled.p`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.2rem;
  color: #111;
  margin: 0 0 0.5rem;
`

const EmptySub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #888;
  margin: 0 0 1.5rem;
`

const EmptyLink = styled(Link)`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  background: #ff751f;
  border: none;
  padding: 0.6rem 1.4rem;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.2s;
  &:hover { background: #e6600c; }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.1rem;

  @media (max-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 0.75rem;
  }
`

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const Card = styled.div`
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px solid #e8e8e8;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: ${fadeIn} 0.3s ease both;
  animation-delay: ${({ $i }) => $i * 0.03}s;
  display: flex;
  flex-direction: column;

  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
`

const PosterWrap = styled.div`
  width: 100%;
  aspect-ratio: 2/3;
  background: #e0e0e0;
  position: relative;
  overflow: hidden;
`

const Poster = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const PosterFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #aaa;
  text-align: center;
  padding: 0.5rem;
`

const ScoreBadge = styled.div`
  position: absolute;
  top: 7px;
  right: 7px;
  background: ${({ $score }) =>
    $score >= 90 ? '#2e7d32' : $score >= 75 ? '#ff751f' : '#555'};
  color: #fff;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
`

const CardBody = styled.div`
  padding: 0.55rem 0.65rem 0.65rem;
  display: flex;
  flex-direction: column;
  flex: 1;
`

const CardTitle = styled.p`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 2px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardMeta = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #999;
  margin: 0 0 auto;
`

const CardCluster = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  color: #ff751f;
  margin: 0.4rem 0 0.55rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RemoveBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #aaa;
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 3px 8px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  align-self: flex-start;
  &:hover { color: #c0392b; border-color: #c0392b; }
`

// ─── Component ────────────────────────────────────────────────────────────────

function Watchlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const sessionId = localStorage.getItem('filmism_session_id') || undefined
    api.get('/recommendations/watchlist', { params: { sessionId } })
      .then((res) => setItems(res.data.watchlist || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (tmdbId) => {
    setItems((prev) => prev.filter((f) => f.tmdbId !== tmdbId))
    try {
      const sessionId = localStorage.getItem('filmism_session_id') || undefined
      await api.post('/recommendations/action', {
        tmdbId,
        action: 'dismissed',
        sessionId,
      })
    } catch {
      // silently fail — item already removed from UI
    }
  }

  return (
    <PageWrapper>
      <Topbar>
        <Logo>Filmism</Logo>
        <TopbarRight>
          <UserAvatar />
        </TopbarRight>
      </Topbar>

      <PageBody>
        <PageHeader>
          <div>
            <PageTitle>watchlist</PageTitle>
            {!loading && (
              <PageCount>
                {items.length === 0
                  ? 'no films saved yet'
                  : `${items.length} film${items.length !== 1 ? 's' : ''} saved`}
              </PageCount>
            )}
          </div>
        </PageHeader>

        {loading ? (
          <LoadingText>loading your watchlist...</LoadingText>
        ) : items.length === 0 ? (
          <EmptyState>
            <EmptyTitle>your watchlist is empty.</EmptyTitle>
            <EmptySub>
              Head to recommendations and save films you want to watch.
            </EmptySub>
            <EmptyLink to="/recommend">browse recommendations →</EmptyLink>
          </EmptyState>
        ) : (
          <Grid>
            {items.map((film, i) => (
              <Card key={film.tmdbId} $i={i}>
                <PosterWrap>
                  {film.poster_path ? (
                    <Poster
                      src={`${TMDB_IMG}${film.poster_path}`}
                      alt={film.title}
                      loading="lazy"
                    />
                  ) : (
                    <PosterFallback>{film.title}</PosterFallback>
                  )}
                  {film.matchScore > 0 && (
                    <ScoreBadge $score={film.matchScore}>{film.matchScore}%</ScoreBadge>
                  )}
                </PosterWrap>
                <CardBody>
                  <CardTitle>{film.title}</CardTitle>
                  <CardMeta>
                    {[film.year, ...(film.genres || [])].filter(Boolean).join(' · ')}
                  </CardMeta>
                  {film.sourceClusterName && (
                    <CardCluster>{film.sourceClusterName}</CardCluster>
                  )}
                  <RemoveBtn onClick={() => handleRemove(film.tmdbId)}>
                    remove
                  </RemoveBtn>
                </CardBody>
              </Card>
            ))}
          </Grid>
        )}
      </PageBody>
    </PageWrapper>
  )
}

export default Watchlist
