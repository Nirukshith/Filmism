import { useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'


// ─── Mock Data ────────────────────────────────────────────────────────────────
// In production these rounds would be generated based on the user's
// selected favourite films from TasteProfile

const ROUNDS = [
  {
    id: 1,
    label: 'Because you love Bong Joon ho',
    reason: 'Films by the same director or from Korean cinema',
    movies: [
      { id: 1,  title: 'Memories of Murder',    year: 2003, genre: 'Crime',    director: 'Bong Joon-ho',    cinema: 'Korean Cinema',   match: 89, c1: '#0a0a18', c2: '#1a1a4a' },
      { id: 2,  title: 'Mother',                year: 2009, genre: 'Thriller', director: 'Bong Joon-ho',    cinema: 'Korean Cinema',   match: 84, c1: '#0a1a0a', c2: '#2d5c2d' },
      { id: 3,  title: 'The Handmaiden',        year: 2016, genre: 'Thriller', director: 'Park Chan-wook',  cinema: 'Korean Cinema',   match: 77, c1: '#100810', c2: '#3a1040' },
    ],
  },
  {
    id: 2,
    label: 'If you liked Blade Runner 2049',
    reason: 'Cerebral sci-fi with similar mood and pacing',
    movies: [
      { id: 4,  title: 'Arrival',               year: 2016, genre: 'Sci-Fi',   director: 'Denis Villeneuve',cinema: 'Hollywood',       match: 93, c1: '#081818', c2: '#1a5a5a' },
      { id: 5,  title: 'Ex Machina',            year: 2014, genre: 'Sci-Fi',   director: 'Alex Garland',    cinema: 'Hollywood',       match: 87, c1: '#0d1b2a', c2: '#1e4d7b' },
      { id: 6,  title: 'Under the Skin',        year: 2013, genre: 'Sci-Fi',   director: 'Jonathan Glazer', cinema: 'Hollywood',       match: 72, c1: '#080818', c2: '#202860' },
    ],
  },
  {
    id: 3,
    label: 'World cinema you should know',
    reason: 'Matches your Iranian & French cinema picks',
    movies: [
      { id: 7,  title: 'The Past',              year: 2013, genre: 'Drama',    director: 'Asghar Farhadi',  cinema: 'Iranian Cinema',  match: 88, c1: '#181010', c2: '#5a2828' },
      { id: 8,  title: 'Caché',                 year: 2005, genre: 'Thriller', director: 'Michael Haneke',  cinema: 'French Cinema',   match: 81, c1: '#080818', c2: '#202860' },
      { id: 9,  title: 'Blue Is the Warmest',   year: 2013, genre: 'Romance',  director: 'Abdellatif Kechiche', cinema: 'French Cinema', match: 66, c1: '#0a1020', c2: '#1a3060' },
    ],
  },
  {
    id: 4,
    label: 'Darker, more challenging picks',
    reason: 'For when you want something that stays with you',
    movies: [
      { id: 10, title: 'The White Ribbon',      year: 2009, genre: 'Drama',    director: 'Michael Haneke',  cinema: 'German Cinema',   match: 85, c1: '#180808', c2: '#5a1818' },
      { id: 11, title: 'Son of Saul',           year: 2015, genre: 'War',      director: 'László Nemes',    cinema: 'East European',   match: 79, c1: '#181408', c2: '#5a4818' },
      { id: 12, title: '4 Months 3 Weeks',      year: 2007, genre: 'Drama',    director: 'Cristian Mungiu', cinema: 'East European',   match: 74, c1: '#101010', c2: '#383838' },
    ],
  },
  {
    id: 5,
    label: 'Hidden gems worth finding',
    reason: 'Underseen films that match your taste closely',
    movies: [
      { id: 13, title: 'Leviathan',             year: 2014, genre: 'Drama',    director: 'Andrei Zvyagintsev', cinema: 'East European', match: 82, c1: '#0a1820', c2: '#1a3848' },
      { id: 14, title: 'Force Majeure',         year: 2014, genre: 'Drama',    director: 'Ruben Östlund',   cinema: 'East European',   match: 76, c1: '#181818', c2: '#484848' },
      { id: 15, title: 'I, Daniel Blake',       year: 2016, genre: 'Drama',    director: 'Ken Loach',       cinema: 'Hollywood',       match: 68, c1: '#0a1010', c2: '#1e3838' },
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

const Logo = styled(Link)`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
  text-decoration: none;
  letter-spacing: -0.01em;
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

// Round header
const RoundHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
  margin-bottom: 0.4rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`

const RoundLeft = styled.div`
  text-align: center;
`

const RoundBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  background: #ff751f;
  color: #fff;
  text-transform: lowercase;
  display: inline-block;
  margin-bottom: 6px;
`

const RoundTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 700;
  color: #111;
  margin: 0 0 3px;
  letter-spacing: -0.01em;
  line-height: 1.15;
  text-align: center;
`

const RoundReason = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #999;
  margin: 0;
  text-transform: lowercase;
  text-align: center;
`

const RoundCount = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #aaa;
  white-space: nowrap;
  flex-shrink: 0;
  position: absolute;
  right: 0;
  top: 4px;

  @media (max-width: 768px) {
    position: static;
    margin-top: 0.25rem;
  }
`

// Progress
const ProgressWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 1rem 0 1.25rem;
`

const ProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  background: #ff751f;
  border-radius: 2px;
  width: ${({ $pct }) => $pct}%;
  transition: width 0.4s ease;
`

const ProgressLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #aaa;
  white-space: nowrap;
`

// Round tabs
const RoundTabs = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1.5px solid #ddd;
  margin-bottom: 1.75rem;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`

const RoundTab = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: ${({ $active, $done }) => $active ? '#ff751f' : $done ? '#555' : '#bbb'};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  padding: 8px 14px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#ff751f' : 'transparent')};
  background: none;
  cursor: ${({ $done, $active }) => ($done || $active) ? 'pointer' : 'default'};
  white-space: nowrap;
  text-transform: lowercase;
  transition: all 0.15s;
  margin-bottom: -1.5px;
  display: flex;
  align-items: center;
  gap: 5px;
  &:hover { color: ${({ $active }) => ($active ? '#ff751f' : '#888')}; }
`

const DoneCheck = styled.span`
  font-size: 10px;
  color: #3b8b4b;
`

// Movie grid
const MovieGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 420px)  { grid-template-columns: 1fr; }
`

const MovieCard = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  overflow: hidden;
  opacity: ${({ $unseen }) => ($unseen ? 0.5 : 1)};
  transition: opacity 0.2s;
`

const MoviePoster = styled.div`
  width: 100%;
  height: 140px;
  background: linear-gradient(180deg, ${({ $c1 }) => $c1}, ${({ $c2 }) => $c2});
  position: relative;
`

const MatchBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${({ $pct }) =>
    $pct >= 80 ? 'rgba(59,139,75,0.92)' :
    $pct >= 55 ? 'rgba(200,124,16,0.92)' :
    'rgba(100,100,100,0.75)'};
  color: #fff;
`

const MovieInfo = styled.div`
  padding: 12px 12px 10px;
`

const MovieTitle = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 2px;
  line-height: 1.2;
`

const MovieMeta = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #bbb;
  margin: 0 0 12px;
  text-transform: lowercase;
`

// Rating row
const RatingRow = styled.div`
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
`

const RateBtn = styled.button`
  flex: 1;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 6px 0;
  border-radius: 5px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  text-transform: lowercase;
  transition: all 0.15s;
  opacity: ${({ $disabled }) => ($disabled ? 0.3 : 1)};

  border: 1.5px solid ${({ $type, $selected }) => {
    if ($type === 'meh')  return $selected ? '#888'    : '#e0e0e0'
    if ($type === 'good') return $selected ? '#3B8BD4' : '#e0e0e0'
    if ($type === 'wow')  return $selected ? '#ff751f' : '#e0e0e0'
    return '#e0e0e0'
  }};

  background: ${({ $type, $selected }) => {
    if (!$selected) return 'transparent'
    if ($type === 'meh')  return '#888'
    if ($type === 'good') return '#3B8BD4'
    if ($type === 'wow')  return '#ff751f'
    return 'transparent'
  }};

  color: ${({ $type, $selected }) => {
    if ($selected) return '#fff'
    if ($type === 'meh')  return '#888'
    if ($type === 'good') return '#3B8BD4'
    if ($type === 'wow')  return '#ff751f'
    return '#ccc'
  }};

  &:hover:not(:disabled) {
    border-color: ${({ $type }) => {
      if ($type === 'meh')  return '#888'
      if ($type === 'good') return '#3B8BD4'
      if ($type === 'wow')  return '#ff751f'
      return '#ccc'
    }};
  }
`

// Or divider
const OrDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #f0f0f0;
  }
  span {
    font-family: 'Lexend Deca', sans-serif;
    font-size: 0.65rem;
    color: #ccc;
  }
`

// Haven't seen
const HaventBtn = styled.button`
  width: 100%;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 7px 0;
  border-radius: 5px;
  text-transform: lowercase;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  border: 1.5px solid ${({ $active }) => ($active ? '#888' : '#e0e0e0')};
  background: ${({ $active }) => ($active ? 'rgba(136,136,136,0.08)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#555' : '#bbb')};

  &:hover { border-color: #888; color: #555; }
`

// Round complete banner
const CompleteBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  background: rgba(59,139,75,0.06);
  border: 1.5px solid rgba(59,139,75,0.25);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #3b8b4b;
  font-weight: 600;
  text-transform: lowercase;
`

// Legend
const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #aaa;
  text-transform: lowercase;
`

const LegendDot = styled.div`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

// Bottom bar
const BottomBar = styled.div`
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
  @media (max-width: 640px) {
    padding: 1rem 1.25rem;
    flex-direction: column;
    gap: 0.75rem;
  }
`

const BottomHint = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #777;
  span { color: #ff751f; font-weight: 700; }
`

const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  @media (max-width: 640px) { width: 100%; }
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
  transition: all 0.2s;
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
  transition: all 0.2s;
  border-radius: 4px;
  &:hover { background: transparent; color: #111; }
  &:disabled { opacity: 0.35; cursor: not-allowed; background: #111; color: #fff; }
  @media (max-width: 640px) { flex: 1; }
`

// ─── Component ────────────────────────────────────────────────────────────────

function DeepDive() {
  const navigate = useNavigate()
  const {
    ratings,
    setRatings,
    haventSeen,
    setHaventSeen,
  } = useTasteProfile()

  const [currentRound, setCurrentRound]       = useState(0)
  const [completedRounds, setCompletedRounds] = useState([])

  const round      = ROUNDS[currentRound]
  const isLastRound = currentRound === ROUNDS.length - 1

  const totalRated = Object.keys(ratings).length
  const accuracy   = Math.min(Math.round((totalRated / (ROUNDS.length * 3)) * 100), 91)

  const setRating = (movieId, rating) => {
    setRatings(prev => ({
      ...prev,
      [movieId]: prev[movieId] === rating ? null : rating
    }))
    setHaventSeen(prev => prev.filter(id => id !== movieId))
  }

  const toggleHaventSeen = (movieId) => {
    const isCurrentlyUnseen = haventSeen.includes(movieId)
    if (isCurrentlyUnseen) {
      setHaventSeen(prev => prev.filter(id => id !== movieId))
    } else {
      setHaventSeen(prev => [...prev, movieId])
      setRatings(prev => {
        const next = { ...prev }
        delete next[movieId]
        return next
      })
    }
  }

  const ratedInRound = round.movies.filter(m => {
    return ratings[m.id] !== undefined || haventSeen.includes(m.id)
  }).length

  const roundComplete = ratedInRound === round.movies.length

  const progressPct   = ((currentRound + (roundComplete ? 1 : 0)) / ROUNDS.length) * 100

  const handleNextRound = () => {
    if (!completedRounds.includes(round.id)) {
      setCompletedRounds(prev => [...prev, round.id])
    }
    if (isLastRound) navigate('/recommend')
    else setCurrentRound(prev => prev + 1)
  }

  return (
    <>
      <PageWrapper>
        <Topbar>
          <Logo to="/">Filmism</Logo>
          <AccuracyBadge>
            <AccDot />
            taste accuracy
            <AccVal>{accuracy}%</AccVal>
          </AccuracyBadge>
        </Topbar>

        <PageBody>

          {/* Round header */}
          <RoundHeader>
            <RoundLeft>
              <RoundBadge>round {currentRound + 1}</RoundBadge>
              <RoundTitle>{round.label}</RoundTitle>
              <RoundReason>{round.reason}</RoundReason>
            </RoundLeft>
            <RoundCount>{currentRound + 1} / {ROUNDS.length}</RoundCount>
          </RoundHeader>

          {/* Progress */}
          <ProgressWrap>
            <ProgressTrack>
              <ProgressFill $pct={progressPct} />
            </ProgressTrack>
            <ProgressLabel>
              {roundComplete ? 'round complete!' : `${ratedInRound} of ${round.movies.length} rated`}
            </ProgressLabel>
          </ProgressWrap>

          {/* Round tabs */}
          <RoundTabs>
            {ROUNDS.map((r, idx) => (
              <RoundTab
                key={r.id}
                $active={idx === currentRound}
                $done={completedRounds.includes(r.id)}
                onClick={() => {
                  if (completedRounds.includes(r.id) || idx === currentRound)
                    setCurrentRound(idx)
                }}
              >
                {completedRounds.includes(r.id) && <DoneCheck>✓</DoneCheck>}
                round {r.id}
              </RoundTab>
            ))}
          </RoundTabs>

          {/* Complete banner */}
          {roundComplete && (
            <CompleteBanner>
              ✓ round {currentRound + 1} done — taste accuracy now {accuracy}%
            </CompleteBanner>
          )}

          {/* Legend */}
          <Legend>
            <LegendItem><LegendDot $color="#888" />meh</LegendItem>
            <LegendItem><LegendDot $color="#3B8BD4" />good</LegendItem>
            <LegendItem><LegendDot $color="#ff751f" />wow!</LegendItem>
            <LegendItem><LegendDot $color="#ddd" />haven't seen</LegendItem>
          </Legend>

          {/* Movie cards */}
          <MovieGrid>
            {round.movies.map((movie) => {
              const isUnseen = haventSeen.includes(movie.id)
              const hasRating = ratings[movie.id]

              return (
                <MovieCard key={movie.id} $unseen={isUnseen}>
                  <MoviePoster $c1={movie.c1} $c2={movie.c2}>
                    <MatchBadge $pct={movie.match}>{movie.match}%</MatchBadge>
                  </MoviePoster>
                  <MovieInfo>
                    <MovieTitle>{movie.title}</MovieTitle>
                    <MovieMeta>
                      {movie.year} · {movie.genre.toLowerCase()} · {movie.director.toLowerCase()}
                    </MovieMeta>

                    <RatingRow>
                      {['meh', 'good', 'wow'].map((type) => (
                        <RateBtn
                          key={type}
                          $type={type}
                          $selected={hasRating === type}
                          $disabled={isUnseen}
                          disabled={isUnseen}
                          onClick={() => !isUnseen && setRating(movie.id, type)}
                        >
                          {type === 'wow' ? 'wow!' : type}
                        </RateBtn>
                      ))}
                    </RatingRow>

                    <HaventBtn
                      $active={isUnseen}
                      onClick={() => toggleHaventSeen(movie.id)}
                    >
                      <span>{isUnseen ? '●' : '○'}</span>
                      haven't seen
                    </HaventBtn>
                  </MovieInfo>
                </MovieCard>
              )
            })}
          </MovieGrid>


        </PageBody>
      </PageWrapper>

      {/* Bottom bar */}
      <BottomBar>
        <BottomHint>
          {roundComplete
            ? isLastRound
              ? 'all rounds done — ready for your matches'
              : <><span>{ROUNDS.length - currentRound - 1} rounds</span> left</>
            : <><span>{ratedInRound} of {round.movies.length}</span> rated this round</>
          }
        </BottomHint>
        <BtnRow>
          {currentRound > 0 && (
            <BackBtn onClick={() => setCurrentRound(prev => prev - 1)}>← prev</BackBtn>
          )}
          <NextBtn disabled={!roundComplete} onClick={handleNextRound}>
            {isLastRound ? 'see my matches →' : 'next round →'}
          </NextBtn>
        </BtnRow>
      </BottomBar>
    </>
  )
}

export default DeepDive