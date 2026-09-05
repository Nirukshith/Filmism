import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link } from 'react-router-dom'
import api from '../services/api'
import UserAvatar from '../components/UserAvatar'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

const RATING_CONFIG = {
  'great':       { label: 'great',       color: '#2e7d32', bg: 'rgba(46,125,50,0.1)'   },
  'good':        { label: 'good',        color: '#ff751f', bg: 'rgba(255,117,31,0.1)'  },
  'okay':        { label: 'okay',        color: '#888',    bg: 'rgba(0,0,0,0.06)'      },
  'not for me':  { label: 'not for me',  color: '#c0392b', bg: 'rgba(192,57,43,0.08)' },
  'none':        { label: 'unrated',     color: '#bbb',    bg: 'rgba(0,0,0,0.04)'      },
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const PageWrapper = styled.main`
  width: 100%; min-height: 100vh; background: #efefef; display: flex; flex-direction: column;
`
const Topbar = styled.header`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1.75rem; border-bottom: 1.5px solid #ddd;
  background: #efefef; position: sticky; top: 0; z-index: 30;
`
const Logo = styled.span`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem; font-weight: 700; color: #111; user-select: none; cursor: default;
`
const PageBody = styled.div`
  flex: 1; padding: 1rem 1.75rem 4.5rem; max-width: 1380px; width: 100%; margin: 0 auto;
  @media (max-width: 768px) { padding: 0.85rem 1rem 4.5rem; }
`
const PageHeader = styled.div`
  margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1.5px solid #ddd;
  display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
`
const PageTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 700; color: #111; margin: 0; line-height: 1.1;
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
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.1rem;
  @media (max-width: 480px) { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem; }
`
const Card = styled.div`
  background: #fff; border-radius: 10px; overflow: hidden; border: 1.5px solid #e8e8e8;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: ${fadeIn} 0.3s ease both; animation-delay: ${({ $i }) => $i * 0.03}s;
  display: flex; flex-direction: column;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
`
const PosterWrap = styled.div`
  width: 100%; aspect-ratio: 2/3; background: #e0e0e0; position: relative; overflow: hidden;
`
const Poster = styled.img`width: 100%; height: 100%; object-fit: cover; display: block;`
const PosterFallback = styled.div`
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-family: 'Lexend Deca', sans-serif; font-size: 0.7rem; color: #aaa; text-align: center; padding: 0.5rem;
`
const ReviewPill = styled.div`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: lowercase;
  letter-spacing: 0.03em;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $color }) => $color}33;
  margin-top: auto;
  align-self: center;
`
const CardBody = styled.div`
  padding: 0.6rem 0.7rem 0.7rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  text-align: center;
`
const CardTitle = styled.p`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.76rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
const CardYear = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #bbb;
  margin: 0;
  letter-spacing: 0.02em;
`

// ─── Component ────────────────────────────────────────────────────────────────

function Diary() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionId = localStorage.getItem('filmism_session_id') || undefined
    api.get('/recommendations/diary', { params: { sessionId } })
      .then((res) => setItems(res.data.diary || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

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
                {items.length === 0 ? 'no films logged yet' : `${items.length} film${items.length !== 1 ? 's' : ''} logged`}
              </PageCount>
            )}
          </div>
        </PageHeader>

        {loading ? (
          <LoadingText>loading your film logs...</LoadingText>
        ) : items.length === 0 ? (
          <EmptyState>
            <EmptyTitle>no films logged yet.</EmptyTitle>
            <EmptySub>Mark films as watched from your recommendations to log them here.</EmptySub>
            <EmptyLink to="/recommend">browse recommendations →</EmptyLink>
          </EmptyState>
        ) : (
          <Grid>
            {items.map((film, i) => {
              const rc = RATING_CONFIG[film.outcomeLabel] || RATING_CONFIG['none']
              return (
                <Card key={`${film.tmdbId}-${i}`} $i={i}>
                  <PosterWrap>
                    {film.poster_path
                      ? <Poster src={`${TMDB_IMG}${film.poster_path}`} alt={film.title} loading="lazy" />
                      : <PosterFallback>{film.title}</PosterFallback>
                    }
                  </PosterWrap>
                  <CardBody>
                    <CardTitle>{film.title}</CardTitle>
                    {film.year && <CardYear>{film.year}</CardYear>}
                    <ReviewPill $color={rc.color} $bg={rc.bg} style={{ marginTop: 'auto' }}>
                      {rc.label}
                    </ReviewPill>
                  </CardBody>
                </Card>
              )
            })}
          </Grid>
        )}
      </PageBody>
    </PageWrapper>
  )
}

export default Diary
