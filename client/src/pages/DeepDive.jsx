import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'
import api from '../services/api'
import RatingControl from '../components/RatingControl'

// ─── Fallback Mock Data ────────────────────────────────────────────────────────
const FALLBACK_ROUNDS = [
  {
    id: 1,
    clusterId: 'cluster_1',
    label: 'Atmospheric Thrillers & Mystery',
    reason: 'Deep psychological tension with morally ambiguous characters',
    movies: [
      { id: 27205, tmdbId: 27205, title: 'Inception', year: 2010, genre: 'Sci-Fi', director: 'Christopher Nolan', cinema: 'Hollywood', match: 94, c1: '#0a0a18', c2: '#1a1a4a' },
      { id: 335984, tmdbId: 335984, title: 'Blade Runner 2049', year: 2017, genre: 'Sci-Fi', director: 'Denis Villeneuve', cinema: 'Hollywood', match: 91, c1: '#0d1b2a', c2: '#1e4d7b' },
      { id: 807, tmdbId: 807, title: 'Se7en', year: 1995, genre: 'Crime', director: 'David Fincher', cinema: 'Hollywood', match: 88, c1: '#100810', c2: '#3a1040' },
    ],
  },
  {
    id: 2,
    clusterId: 'cluster_2',
    label: 'Witty & Emotional Character Cinema',
    reason: 'Human connection, evocative dialogue, and thoughtful storytelling',
    movies: [
      { id: 194, tmdbId: 194, title: 'Amélie', year: 2001, genre: 'Romance', director: 'Jean-Pierre Jeunet', cinema: 'French Cinema', match: 89, c1: '#181010', c2: '#5a2828' },
      { id: 76, tmdbId: 76, title: 'Before Sunrise', year: 1995, genre: 'Drama', director: 'Richard Linklater', cinema: 'Hollywood', match: 87, c1: '#1a1408', c2: '#6e4810' },
      { id: 105, tmdbId: 105, title: 'Back to the Future', year: 1985, genre: 'Adventure', director: 'Robert Zemeckis', cinema: 'Hollywood', match: 84, c1: '#081020', c2: '#183060' },
    ],
  },
]

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

const Logo = styled.span`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.01em;
  user-select: none;
  cursor: default;
`

const AccuracyBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #777;
`

const AccDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff751f;
`

const AccVal = styled.span`
  font-weight: 700;
  color: #ff751f;
`

const PageBody = styled.div`
  flex: 1;
  padding: 2rem 3rem 8rem;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 1.5rem 1.25rem 8rem; }
`

const RoundHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
`

const RoundLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RoundBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: #ff751f;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const RoundTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.2;
`

const RoundReason = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #777;
  margin: 0;
  line-height: 1.5;
`

const RoundCount = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: #999;
  white-space: nowrap;
`

const ProgressWrap = styled.div`
  margin-bottom: 1.5rem;
`

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  background: #ddd;
  border-radius: 999px;
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => `${$pct}%`};
  background: #ff751f;
  transition: width 0.3s ease;
`

const ProgressLabel = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #888;
  margin-top: 5px;
  text-align: right;
`

const RoundTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`

const RoundTab = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  user-select: none;

  border: 1.5px solid ${({ $active, $done }) => ($active ? '#ff751f' : $done ? '#3b8b4b' : '#ddd')};
  background: ${({ $active, $done }) => ($active ? '#ff751f' : $done ? 'rgba(59,139,75,0.08)' : '#fff')};
  color: ${({ $active, $done }) => ($active ? '#fff' : $done ? '#3b8b4b' : '#666')};
  font-weight: ${({ $active }) => ($active ? '700' : '500')};

  &:hover {
    border-color: #ff751f;
    color: ${({ $active }) => ($active ? '#fff' : '#ff751f')};
  }
`

const DoneCheck = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
`

const CompleteBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  background: rgba(59,139,75,0.08);
  border: 1.5px solid rgba(59,139,75,0.25);
  border-radius: 10px;
  margin-bottom: 1.5rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #2e7d32;
  font-weight: 600;
`

const MovieGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
`

const MovieCard = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${({ $unseen }) => ($unseen ? 0.6 : 1)};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.07);
    border-color: #ff751f;
  }
`

const MoviePoster = styled.div`
  width: 100%;
  height: 160px;
  background: ${({ $posterPath, $c1, $c2 }) =>
    $posterPath
      ? `url(https://image.tmdb.org/t/p/w500${$posterPath}) center / cover no-repeat`
      : `linear-gradient(180deg, ${$c1 || '#0d1b2a'}, ${$c2 || '#1e4d7b'})`};
  position: relative;
`

const MovieInfo = styled.div`
  padding: 1.1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
`

const MovieTitle = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 3px;
  line-height: 1.2;
`

const MovieMeta = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #777;
`

const MovieSummary = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #555;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const BottomBar = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #efefef;
  border-top: 1.5px solid #ddd;
  padding: 1rem 3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
  @media (max-width: 640px) { padding: 1rem 1.25rem; flex-direction: column; gap: 0.75rem; }
`

const BottomHint = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #777;
  span { color: #ff751f; font-weight: 700; }
`

const BtnRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  @media (max-width: 640px) { width: 100%; justify-content: space-between; }
`

const SkipLink = styled.button`
  background: none;
  border: none;
  color: #777;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
  padding: 6px 10px;
  &:hover { color: #111; }
`

const BackBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  padding: 0.7rem 1.2rem;
  border: 1.5px solid #bbb;
  background: transparent;
  color: #555;
  cursor: pointer;
  text-transform: lowercase;
  border-radius: 4px;
  &:hover { border-color: #111; color: #111; }
`

const NextBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.7rem 1.6rem;
  border: 2px solid #111;
  background: #111;
  color: #fff;
  cursor: pointer;
  text-transform: lowercase;
  letter-spacing: 0.04em;
  border-radius: 4px;
  transition: all 0.2s;
  &:hover:not(:disabled) { background: transparent; color: #111; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`

// ─── Main Component ───────────────────────────────────────────────────────────

function DeepDive() {
  const navigate = useNavigate()
  const { sessionId } = useTasteProfile()

  const [rounds, setRounds] = useState(FALLBACK_ROUNDS)
  const [loading, setLoading] = useState(true)
  const [currentRound, setCurrentRound] = useState(0)
  const [candidateRatings, setCandidateRatings] = useState({})
  const [completedRounds, setCompletedRounds] = useState([])

  // Fetch real candidate pool from backend
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true)
      try {
        const response = await api.post('/recommendations/candidates', { sessionId })
        if (response.data?.rounds && response.data.rounds.length > 0) {
          setRounds(response.data.rounds)
        }
      } catch (err) {
        console.warn('Using default candidate rounds:', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCandidates()
  }, [sessionId])

  const round = rounds[currentRound] || rounds[0] || FALLBACK_ROUNDS[0]
  const isLastRound = currentRound === rounds.length - 1

  const totalRated = Object.keys(candidateRatings).length
  const accuracy = Math.min(96, Math.max(72, 70 + totalRated * 2))

  const handleRateMovie = async (movie, ratingValue) => {
    const movieId = movie.tmdbId || movie.id
    setCandidateRatings((prev) => ({
      ...prev,
      [movieId]: ratingValue,
    }))

    // Stream rating to backend
    try {
      await api.post('/recommendations/rate-candidate', {
        sessionId,
        tmdbId: movieId,
        rating: ratingValue,
        sourceClusterId: round.clusterId,
      })
    } catch (e) {
      console.warn('Failed to stream rating:', e.message)
    }
  }

  const ratedInRound = (round.movies || []).filter((m) => {
    const mId = m.tmdbId || m.id
    return candidateRatings[mId] !== undefined
  }).length

  const roundComplete = ratedInRound >= Math.min(2, round.movies?.length || 1)
  const progressPct = ((currentRound + (roundComplete ? 1 : 0)) / rounds.length) * 100

  const handleNextRound = () => {
    if (!completedRounds.includes(round.id)) {
      setCompletedRounds((prev) => [...prev, round.id])
    }
    if (isLastRound) navigate('/recommend')
    else setCurrentRound((prev) => prev + 1)
  }

  return (
    <PageWrapper>
      <Topbar>
        <Logo>Filmism</Logo>
        <AccuracyBadge>
          <AccDot />
          taste accuracy
          <AccVal>{accuracy}%</AccVal>
        </AccuracyBadge>
      </Topbar>

      <PageBody>
        <RoundHeader>
          <RoundLeft>
            <RoundBadge>Feedback Round {currentRound + 1}</RoundBadge>
            <RoundTitle>{round.label}</RoundTitle>
            <RoundReason>{round.reason}</RoundReason>
          </RoundLeft>
          <RoundCount>{currentRound + 1} / {rounds.length}</RoundCount>
        </RoundHeader>

        <ProgressWrap>
          <ProgressTrack>
            <ProgressFill $pct={progressPct} />
          </ProgressTrack>
          <ProgressLabel>
            {roundComplete ? '✓ round signal captured' : `${ratedInRound} of ${round.movies?.length || 0} evaluated`}
          </ProgressLabel>
        </ProgressWrap>

        <RoundTabs>
          {rounds.map((r, idx) => (
            <RoundTab
              key={r.id || idx}
              $active={idx === currentRound}
              $done={completedRounds.includes(r.id)}
              onClick={() => setCurrentRound(idx)}
            >
              {completedRounds.includes(r.id) && <DoneCheck>✓</DoneCheck>}
              Round {idx + 1}
            </RoundTab>
          ))}
        </RoundTabs>

        {roundComplete && (
          <CompleteBanner>
            ✓ Taste signal sharpened — current profile accuracy is {accuracy}%
          </CompleteBanner>
        )}

        <MovieGrid>
          {(round.movies || []).map((movie) => {
            const mId = movie.tmdbId || movie.id
            const currentRating = candidateRatings[mId] !== undefined ? candidateRatings[mId] : 0
            const isUnseen = currentRating === 0

            return (
              <MovieCard key={mId} $unseen={isUnseen}>
                <MoviePoster
                  $posterPath={movie.posterPath}
                  $c1={movie.c1}
                  $c2={movie.c2}
                />
                <MovieInfo>
                  <div>
                    <MovieTitle>{movie.title}</MovieTitle>
                    <MovieMeta>
                      {movie.year} · {(movie.genres || [movie.genre]).join(' · ')} · {movie.director}
                    </MovieMeta>
                    {movie.aiSummary && (
                      <MovieSummary style={{ marginTop: '6px' }}>{movie.aiSummary}</MovieSummary>
                    )}
                  </div>

                  <RatingControl
                    value={currentRating}
                    onChange={(val) => handleRateMovie(movie, val)}
                    showHaventWatched={true}
                  />
                </MovieInfo>
              </MovieCard>
            )
          })}
        </MovieGrid>
      </PageBody>

      <BottomBar>
        <BottomHint>
          <span>{rounds.length - currentRound - 1} rounds</span> remaining · rate candidates to sharpen recommendations
        </BottomHint>
        <BtnRow>
          <SkipLink onClick={() => navigate('/recommend')}>
            skip directly to recommendations →
          </SkipLink>
          {currentRound > 0 && (
            <BackBtn onClick={() => setCurrentRound((prev) => prev - 1)}>← prev</BackBtn>
          )}
          <NextBtn onClick={handleNextRound}>
            {isLastRound ? 'see my recommendations →' : 'next round →'}
          </NextBtn>
        </BtnRow>
      </BottomBar>
    </PageWrapper>
  )
}

export default DeepDive