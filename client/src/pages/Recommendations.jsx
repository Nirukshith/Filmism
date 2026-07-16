import { useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'


// ─── Mock Data ────────────────────────────────────────────────────────────────

const USER_FAVOURITES = ['Parasite', 'Blade Runner 2049', 'Hereditary']

const STATS = [
  { label: 'Favourite genre',  value: 'Thriller'  },
  { label: 'Favourite cinema', value: 'Korean'     },
  { label: 'Taste accuracy',   value: '91%'        },
  { label: 'Matches found',    value: '148'        },
]

const TASTE_TAGS = [
  'slow burn',
  'morally complex',
  'atmospheric',
  'dark tone',
  'cerebral',
  'world cinema',
]

const ALL_RECS = [
  {
    id: 1,
    title: 'Memories of Murder',
    year: 2003,
    genre: 'Crime',
    cinema: 'Korean Cinema',
    director: 'Bong Joon-ho',
    match: 94,
    why: "Earlier Bong Joon-ho — if Parasite is your favourite, this is essential viewing.",
    stream: 'MUBI',
    c1: '#0a0a18', c2: '#1a1a4a',
  },
  {
    id: 2,
    title: 'Arrival',
    year: 2016,
    genre: 'Sci-Fi',
    cinema: 'Hollywood',
    director: 'Denis Villeneuve',
    match: 91,
    why: "Villeneuve's most emotionally resonant film — shares Blade Runner 2049's quiet intensity.",
    stream: 'Prime Video',
    c1: '#081818', c2: '#1a5a5a',
  },
  {
    id: 3,
    title: 'The Handmaiden',
    year: 2016,
    genre: 'Thriller',
    cinema: 'Korean Cinema',
    director: 'Park Chan-wook',
    match: 88,
    why: "Korean thriller with the same genre DNA as Parasite — twisting, layered, unforgettable.",
    stream: 'MUBI',
    c1: '#100810', c2: '#3a1040',
  },
  {
    id: 4,
    title: 'Ex Machina',
    year: 2014,
    genre: 'Sci-Fi',
    cinema: 'Hollywood',
    director: 'Alex Garland',
    match: 86,
    why: "Close match to your Blade Runner pick — intimate sci-fi, deeply unsettling.",
    stream: 'Netflix',
    c1: '#0d1b2a', c2: '#1e4d7b',
  },
  {
    id: 5,
    title: 'Burning',
    year: 2018,
    genre: 'Mystery',
    cinema: 'Korean Cinema',
    director: 'Lee Chang-dong',
    match: 83,
    why: "Slow, quiet, devastating. Korean mystery that rewards patient viewers.",
    stream: 'MUBI',
    c1: '#0d1020', c2: '#2a2a5a',
  },
  {
    id: 6,
    title: 'The White Ribbon',
    year: 2009,
    genre: 'Drama',
    cinema: 'German Cinema',
    director: 'Michael Haneke',
    match: 79,
    why: "Dark, restrained European drama — for when you want something that stays with you.",
    stream: 'MUBI',
    c1: '#181010', c2: '#5a2828',
  },
  {
    id: 7,
    title: 'A Separation',
    year: 2011,
    genre: 'Drama',
    cinema: 'Iranian Cinema',
    director: 'Asghar Farhadi',
    match: 76,
    why: "Moral complexity and tension without a single action scene — pure character drama.",
    stream: 'MUBI',
    c1: '#0d1010', c2: '#1e4848',
  },
  {
    id: 8,
    title: 'Caché',
    year: 2005,
    genre: 'Thriller',
    cinema: 'French Cinema',
    director: 'Michael Haneke',
    match: 74,
    why: "Paranoid slow-burn thriller — nothing is what it seems.",
    stream: 'Prime Video',
    c1: '#080818', c2: '#202860',
  },
]

const FILTERS = [
  { id: 'all',            label: 'all'          },
  { id: 'Korean Cinema',  label: 'korean'       },
  { id: 'Hollywood',      label: 'hollywood'    },
  { id: 'French Cinema',  label: 'french'       },
  { id: 'Iranian Cinema', label: 'iranian'      },
  { id: 'Thriller',       label: 'thriller'     },
  { id: 'Sci-Fi',         label: 'sci-fi'       },
  { id: 'Drama',          label: 'drama'        },
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

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const WatchlistLink = styled(Link)`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #555;
  text-decoration: none;
  text-transform: lowercase;
  border-bottom: 1px solid #ccc;
  padding-bottom: 1px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.6; }
`

const RecalBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #555;
  background: transparent;
  border: 1.5px solid #ccc;
  border-radius: 4px;
  padding: 6px 14px;
  cursor: pointer;
  text-transform: lowercase;
  transition: all 0.2s;
  &:hover { border-color: #111; color: #111; }
`

const PageBody = styled.div`
  flex: 1;
  padding: 2.5rem 3rem 4rem;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 2rem 1.25rem 3rem; }
`

// Profile panel
const ProfilePanel = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  padding: 1.75rem 2rem;
  margin-bottom: 1.75rem;
`

const ProfileTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  @media (max-width: 580px) { flex-direction: column; }
`

const ProfileText = styled.div`flex: 1;`

const ProfileTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 3.5vw, 2.2rem);
  font-weight: 700;
  color: #111;
  margin: 0 0 0.4rem;
  letter-spacing: -0.01em;
  line-height: 1.1;
`

const ProfileSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #888;
  margin: 0 auto;
  line-height: 1.65;
  text-align: center;
`

// Favourites strip
const FavouritesRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
`

const FavLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 2px;
`

const FavTag = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  padding: 4px 11px;
  border-radius: 20px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #555;
  text-transform: lowercase;
  font-weight: 600;
`

// Stats
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 1.25rem;
  @media (max-width: 600px) { grid-template-columns: repeat(2, 1fr); }
`

const StatCard = styled.div`
  background: #f7f7f7;
  border-radius: 8px;
  padding: 10px 12px;
`

const StatLabel = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #bbb;
  text-transform: lowercase;
  margin-bottom: 3px;
  letter-spacing: 0.03em;
`

const StatValue = styled.div`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111;
`

// Taste tags
const TagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`

const TasteTag = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 13px;
  border-radius: 20px;
  border: 1.5px solid rgba(255,117,31,0.3);
  background: rgba(255,117,31,0.06);
  color: #c45a10;
  text-transform: lowercase;
`

// Legend strip
const LegendStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  margin-bottom: 1.5rem;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
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

// Filter bar
const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`

const FilterChip = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1.5px solid ${({ $active }) => ($active ? '#111' : '#ccc')};
  background: ${({ $active }) => ($active ? '#111' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#888')};
  cursor: pointer;
  text-transform: lowercase;
  transition: all 0.15s;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  &:hover { border-color: #111; color: ${({ $active }) => ($active ? '#fff' : '#111')}; }
`

const SurpriseBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1.5px solid rgba(255,117,31,0.4);
  background: rgba(255,117,31,0.07);
  color: #c45a10;
  cursor: pointer;
  text-transform: lowercase;
  transition: all 0.15s;
  margin-left: auto;
  font-weight: 600;
  &:hover { background: rgba(255,117,31,0.14); border-color: #ff751f; }
`

const SectionHeading = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 1rem;
  letter-spacing: -0.01em;
`

// Rec list
const RecList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const RecItem = styled.div`
  display: flex;
  gap: 14px;
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  padding: 14px 16px;
  align-items: flex-start;
  transition: border-color 0.2s;
  &:hover { border-color: #bbb; }
  @media (max-width: 480px) { gap: 10px; padding: 12px; }
`

const RecPoster = styled.div`
  width: 48px;
  height: 66px;
  border-radius: 6px;
  flex-shrink: 0;
  background: linear-gradient(180deg, ${({ $c1 }) => $c1}, ${({ $c2 }) => $c2});
`

const RecBody = styled.div`
  flex: 1;
  min-width: 0;
`

const RecTitle = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 2px;
  line-height: 1.2;
`

const RecMeta = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #bbb;
  margin: 0 0 6px;
  text-transform: lowercase;
`

const RecWhy = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #777;
  margin: 0 0 10px;
  line-height: 1.6;
`

const MatchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const MatchTrack = styled.div`
  flex: 1;
  height: 3px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
  max-width: 160px;
`

const MatchFill = styled.div`
  height: 100%;
  border-radius: 2px;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $pct }) =>
    $pct >= 80 ? '#3b8b4b' : $pct >= 65 ? '#c87c10' : '#aaa'};
`

const MatchPct = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ $pct }) =>
    $pct >= 80 ? '#3b8b4b' : $pct >= 65 ? '#c87c10' : '#aaa'};
  white-space: nowrap;
`

// Rec right actions
const RecRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
  @media (max-width: 480px) { display: none; }
`

const WatchlistBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 5px;
  text-transform: lowercase;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;

  border: 1.5px solid ${({ $state }) => {
    if ($state === 'watchlist') return '#3B8BD4'
    if ($state === 'watched')   return '#3b8b4b'
    return '#ddd'
  }};
  background: ${({ $state }) => {
    if ($state === 'watchlist') return 'rgba(59,139,212,0.08)'
    if ($state === 'watched')   return 'rgba(59,139,75,0.08)'
    return 'transparent'
  }};
  color: ${({ $state }) => {
    if ($state === 'watchlist') return '#3B8BD4'
    if ($state === 'watched')   return '#3b8b4b'
    return '#aaa'
  }};

  &:hover {
    border-color: ${({ $state }) => $state === 'watched' ? '#3b8b4b' : '#3B8BD4'};
    color: ${({ $state }) => $state === 'watched' ? '#3b8b4b' : '#3B8BD4'};
  }
`

const StreamLink = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  color: #bbb;
  cursor: pointer;
  text-transform: lowercase;
  transition: color 0.2s;
  &:hover { color: #555; }
`

const NotForMeBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  color: #ccc;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-transform: lowercase;
  transition: color 0.2s;
  &:hover { color: #888; }
`

const DidItLive = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  color: #3b8b4b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-transform: lowercase;
  transition: opacity 0.2s;
  &:hover { opacity: 0.7; }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #bbb;
`

// ─── Component ────────────────────────────────────────────────────────────────

function Recommendations() {
  const navigate = useNavigate()
  const { selectedFilms, ratings, selectedGenres, selectedCinemas } = useTasteProfile()

  const MOCK_FILMS_DICT = {
    1: 'Parasite',
    2: 'Oldboy',
    3: 'Burning',
    4: 'A Separation',
    5: 'Taste of Cherry',
    6: 'Blade Runner 2049',
    7: 'Annihilation',
    8: 'Interstellar',
    9: 'Hereditary',
    10: 'Midsommar',
    11: 'The Lighthouse',
    12: 'In the Mood for Love',
    13: 'Certified Copy',
    14: 'Caché',
    15: 'No Country for Old Men',
    16: 'There Will Be Blood',
    17: 'Rashomon',
    18: 'Spirited Away',
    19: 'Memories of Murder',
    20: 'The Handmaiden'
  }

  const userFavorites = selectedFilms.length > 0 
    ? selectedFilms.map(id => MOCK_FILMS_DICT[id]).filter(Boolean)
    : USER_FAVOURITES

  const totalRated = Object.keys(ratings).length
  const calculatedAccuracy = totalRated > 0 ? Math.min(Math.round((totalRated / 15) * 100), 91) : 91

  const favoriteGenre = selectedGenres.length > 0 ? selectedGenres[0] : 'Thriller'
  
  const MOCK_CINEMAS_DICT = {
    1: 'Hollywood',
    2: 'French',
    3: 'Iranian',
    4: 'Japanese',
    5: 'Korean',
    6: 'Italian',
    7: 'Indian',
    8: 'East European'
  }
  const favoriteCinema = selectedCinemas.length > 0 
    ? (MOCK_CINEMAS_DICT[selectedCinemas[0]] || selectedCinemas[0])
    : 'Korean'

  const calculatedStats = [
    { label: 'Favourite genre',  value: favoriteGenre },
    { label: 'Favourite cinema', value: favoriteCinema },
    { label: 'Taste accuracy',   value: `${calculatedAccuracy}%` },
    { label: 'Matches found',    value: '148' },
  ]

  const [activeFilter, setActiveFilter] = useState('all')
  const [dismissed, setDismissed]       = useState([])
  const [watchlistStates, setWatchlistStates] = useState({})

  const cycleWatchlist = (id) => {
    setWatchlistStates(prev => {
      const current = prev[id] || 'none'
      const next = current === 'none' ? 'watchlist' : current === 'watchlist' ? 'watched' : 'none'
      return { ...prev, [id]: next }
    })
  }

  const filteredRecs = ALL_RECS.filter(r => {
    if (dismissed.includes(r.id)) return false
    if (activeFilter === 'all') return true
    return r.cinema === activeFilter || r.genre === activeFilter
  })

  const watchlistCount = Object.values(watchlistStates).filter(s => s === 'watchlist').length
  const watchedCount   = Object.values(watchlistStates).filter(s => s === 'watched').length

  const surpriseMe = () => {
    setActiveFilter('all')
    const available = ALL_RECS.filter(r => !dismissed.includes(r.id))
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)]
      setTimeout(() => {
        document.getElementById(`rec-${random.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }


  return (
    <PageWrapper>
      <Topbar>
        <Logo to="/">Filmism</Logo>
        <TopbarRight>
          {watchlistCount > 0 && (
            <WatchlistLink to="/watchlist">
              watchlist ({watchlistCount})
            </WatchlistLink>
          )}
          <RecalBtn onClick={() => navigate('/taste')}>recalibrate →</RecalBtn>
        </TopbarRight>
      </Topbar>

      <PageBody>

        {/* Profile panel */}
        <ProfilePanel>
          <ProfileTop>
            <ProfileText>
              <ProfileTitle>Your matches<br />are ready.</ProfileTitle>
              <ProfileSub>
                Based on your favourites and 15 ratings across 5 rounds —
                here are the films most likely to feel like yours.
              </ProfileSub>
            </ProfileText>
          </ProfileTop>

          {/* Favourites */}
          <FavouritesRow>
            <FavLabel>based on</FavLabel>
            {userFavorites.map((f) => (
              <FavTag key={f}>{f.toLowerCase()}</FavTag>
            ))}
            <span style={{ fontFamily: 'Lexend Deca, sans-serif', fontSize: '0.72rem', color: '#bbb' }}>
              + your ratings
            </span>
          </FavouritesRow>

          {/* Stats */}
          <StatsRow>
            {calculatedStats.map((s) => (
              <StatCard key={s.label}>
                <StatLabel>{s.label}</StatLabel>
                <StatValue>{s.value}</StatValue>
              </StatCard>
            ))}
          </StatsRow>


          {/* Taste tags */}
          <TagsRow>
            {TASTE_TAGS.map((t) => (
              <TasteTag key={t}>{t}</TasteTag>
            ))}
          </TagsRow>
        </ProfilePanel>

        {/* Legend */}
        <LegendStrip>
          <LegendItem><LegendDot $color="#ddd" />not added</LegendItem>
          <LegendItem><LegendDot $color="#3B8BD4" />add to watchlist</LegendItem>
          <LegendItem>
            <LegendDot $color="#3b8b4b" />
            watched {watchedCount > 0 && `(${watchedCount})`}
          </LegendItem>
        </LegendStrip>

        {/* Filter bar */}
        <FilterBar>
          {FILTERS.map(f => (
            <FilterChip
              key={f.id}
              $active={activeFilter === f.id}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
          <SurpriseBtn onClick={surpriseMe}>surprise me</SurpriseBtn>
        </FilterBar>

        <SectionHeading>Films matched to your taste</SectionHeading>

        <RecList>
          {filteredRecs.length === 0 ? (
            <EmptyState>no matches for this filter — try another.</EmptyState>
          ) : (
            filteredRecs.map(rec => {
              const wState = watchlistStates[rec.id] || 'none'

              return (
                <RecItem key={rec.id} id={`rec-${rec.id}`}>
                  <RecPoster $c1={rec.c1} $c2={rec.c2} />

                  <RecBody>
                    <RecTitle>{rec.title}</RecTitle>
                    <RecMeta>
                      {rec.year} · {rec.cinema.toLowerCase()} · {rec.director.toLowerCase()}
                    </RecMeta>
                    <RecWhy>{rec.why}</RecWhy>
                    <MatchRow>
                      <MatchTrack>
                        <MatchFill $pct={rec.match} />
                      </MatchTrack>
                      <MatchPct $pct={rec.match}>{rec.match}% match</MatchPct>
                    </MatchRow>
                  </RecBody>

                  <RecRight>
                    <WatchlistBtn $state={wState} onClick={() => cycleWatchlist(rec.id)}>
                      {wState === 'none'      && <><span>◻</span> add to watchlist</>}
                      {wState === 'watchlist' && <><span>◼</span> add to watchlist</>}
                      {wState === 'watched'   && <><span>✓</span> watched</>}
                    </WatchlistBtn>

                    {wState !== 'watched' && (
                      <StreamLink>on {rec.stream} →</StreamLink>
                    )}
                    {wState === 'watched' && (
                      <DidItLive>did it live up? →</DidItLive>
                    )}
                    {wState !== 'watched' && (
                      <NotForMeBtn onClick={() => setDismissed(p => [...p, rec.id])}>
                        not for me
                      </NotForMeBtn>
                    )}
                  </RecRight>
                </RecItem>
              )
            })
          )}
        </RecList>

      </PageBody>
    </PageWrapper>
  )
}

export default Recommendations