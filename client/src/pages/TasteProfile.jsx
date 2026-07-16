import { useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'


// ─── Mock Data ────────────────────────────────────────────────────────────────

const GENRES = [
  'Thriller', 'Sci-Fi', 'Drama', 'Horror',
  'Romance', 'Comedy', 'Crime', 'Animation',
  'Documentary', 'Action', 'Mystery', 'War',
  'Historical', 'Fantasy', 'Adventure', 'Musical',
]

const CINEMAS = [
  { id: 1, name: 'Hollywood',       count: '4,200+', c1: '#0a0f1e', c2: '#1a3a6e' },
  { id: 2, name: 'French Cinema',   count: '1,800+', c1: '#1e0a08', c2: '#6e1a10' },
  { id: 3, name: 'Iranian Cinema',  count: '620+',   c1: '#0a1a10', c2: '#1e4d2a' },
  { id: 4, name: 'Japanese Cinema', count: '2,100+', c1: '#1a1408', c2: '#5e4010' },
  { id: 5, name: 'Korean Cinema',   count: '940+',   c1: '#1a0a18', c2: '#5a1a58' },
  { id: 6, name: 'Italian Cinema',  count: '1,100+', c1: '#0a1818', c2: '#1a4a4a' },
  { id: 7, name: 'Indian Cinema',   count: '1,500+', c1: '#18120e', c2: '#4a3020' },
  { id: 8, name: 'East European',   count: '780+',   c1: '#08081a', c2: '#1a1a4a' },
]

const MOCK_FILMS = [
  { id: 1,  title: 'Parasite',               year: 2019, genre: 'Thriller',  cinema: 'Korean Cinema',   director: 'Bong Joon-ho',     c1: '#0a1a0a', c2: '#2d5c2d' },
  { id: 2,  title: 'Oldboy',                 year: 2003, genre: 'Thriller',  cinema: 'Korean Cinema',   director: 'Park Chan-wook',   c1: '#180808', c2: '#5a1818' },
  { id: 3,  title: 'Burning',                year: 2018, genre: 'Mystery',   cinema: 'Korean Cinema',   director: 'Lee Chang-dong',   c1: '#0d1020', c2: '#2a2a5a' },
  { id: 4,  title: 'A Separation',           year: 2011, genre: 'Drama',     cinema: 'Iranian Cinema',  director: 'Asghar Farhadi',   c1: '#0d1010', c2: '#1e4848' },
  { id: 5,  title: 'Taste of Cherry',        year: 1997, genre: 'Drama',     cinema: 'Iranian Cinema',  director: 'Abbas Kiarostami', c1: '#181010', c2: '#5a2828' },
  { id: 6,  title: 'Blade Runner 2049',      year: 2017, genre: 'Sci-Fi',    cinema: 'Hollywood',       director: 'Denis Villeneuve', c1: '#0d1b2a', c2: '#1e4d7b' },
  { id: 7,  title: 'Annihilation',           year: 2018, genre: 'Sci-Fi',    cinema: 'Hollywood',       director: 'Alex Garland',     c1: '#100a1a', c2: '#4a1a6a' },
  { id: 8,  title: 'Interstellar',           year: 2014, genre: 'Sci-Fi',    cinema: 'Hollywood',       director: 'Christopher Nolan',c1: '#080a18', c2: '#202860' },
  { id: 9,  title: 'Hereditary',             year: 2018, genre: 'Horror',    cinema: 'Hollywood',       director: 'Ari Aster',        c1: '#1a0a0a', c2: '#8b2020' },
  { id: 10, title: 'Midsommar',              year: 2019, genre: 'Horror',    cinema: 'Hollywood',       director: 'Ari Aster',        c1: '#180808', c2: '#5a1818' },
  { id: 11, title: 'The Lighthouse',         year: 2019, genre: 'Horror',    cinema: 'Hollywood',       director: 'Robert Eggers',    c1: '#181010', c2: '#5a2828' },
  { id: 12, title: 'In the Mood for Love',   year: 2000, genre: 'Romance',   cinema: 'French Cinema',   director: 'Wong Kar-wai',     c1: '#100810', c2: '#3a1040' },
  { id: 13, title: 'Certified Copy',         year: 2010, genre: 'Drama',     cinema: 'French Cinema',   director: 'Abbas Kiarostami', c1: '#0a1010', c2: '#1a4040' },
  { id: 14, title: 'Caché',                  year: 2005, genre: 'Thriller',  cinema: 'French Cinema',   director: 'Michael Haneke',   c1: '#080818', c2: '#202860' },
  { id: 15, title: 'No Country for Old Men', year: 2007, genre: 'Crime',     cinema: 'Hollywood',       director: 'Coen Brothers',    c1: '#1a0808', c2: '#8b2020' },
  { id: 16, title: 'There Will Be Blood',    year: 2007, genre: 'Drama',     cinema: 'Hollywood',       director: 'P.T. Anderson',    c1: '#1a1408', c2: '#6e4810' },
  { id: 17, title: 'Rashomon',               year: 1950, genre: 'Drama',     cinema: 'Japanese Cinema', director: 'Akira Kurosawa',   c1: '#1a1408', c2: '#5e4010' },
  { id: 18, title: 'Spirited Away',          year: 2001, genre: 'Animation', cinema: 'Japanese Cinema', director: 'Hayao Miyazaki',   c1: '#081020', c2: '#183060' },
  { id: 19, title: 'Memories of Murder',     year: 2003, genre: 'Crime',     cinema: 'Korean Cinema',   director: 'Bong Joon-ho',     c1: '#0a0a18', c2: '#1a1a4a' },
  { id: 20, title: 'The Handmaiden',         year: 2016, genre: 'Thriller',  cinema: 'Korean Cinema',   director: 'Park Chan-wook',   c1: '#100810', c2: '#3a1040' },
]

const MIN_FILMS = 3

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

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  @media (max-width: 480px) { display: none; }
`

const StepItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const StepDot = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  border: 1.5px solid ${({ $active, $done }) => $done ? '#3b8b4b' : $active ? '#ff751f' : '#ccc'};
  background: ${({ $active, $done }) => $done ? '#3b8b4b' : $active ? '#ff751f' : 'transparent'};
  color: ${({ $active, $done }) => ($done || $active) ? '#fff' : '#ccc'};
  transition: all 0.3s;
`

const StepLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: ${({ $active, $done }) => $done ? '#3b8b4b' : $active ? '#111' : '#bbb'};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  text-transform: lowercase;
`

const StepLine = styled.div`
  width: 24px;
  height: 1.5px;
  background: ${({ $done }) => ($done ? '#3b8b4b' : '#ddd')};
  transition: background 0.3s;
`

const PageBody = styled.div`
  flex: 1;
  padding: 2.5rem 3rem 8rem;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: 2rem 1.25rem 8rem; }
`

const SectionTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 700;
  color: #111;
  line-height: 1.1;
  margin: 0 0 0.5rem;
`

const SectionSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.9rem;
  color: #777;
  margin: 0 auto 2rem;
  line-height: 1.6;
  max-width: 520px;
  text-align: center;
`

const ColTitle = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ColCount = styled.span`
  color: #ff751f;
  font-weight: 700;
  text-transform: lowercase;
  letter-spacing: 0;
`

// Genre pills
const GenreGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const GenrePill = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  padding: 7px 18px;
  border-radius: 20px;
  border: 1.5px solid ${({ $active }) => ($active ? '#ff751f' : '#ccc')};
  background: ${({ $active }) => ($active ? '#ff751f' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#666')};
  cursor: pointer;
  transition: all 0.15s;
  text-transform: lowercase;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  &:hover { border-color: #ff751f; color: ${({ $active }) => ($active ? '#fff' : '#ff751f')}; }
`

// Cinema grid
const CinemaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  @media (max-width: 700px) { grid-template-columns: repeat(2, 1fr); }
`

const CinemaCard = styled.div`
  border: 1.5px solid ${({ $active }) => ($active ? '#ff751f' : '#ddd')};
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  background: #fff;
  outline: ${({ $active }) => ($active ? '1.5px solid #ff751f' : 'none')};
  &:hover { border-color: #ff751f; transform: translateY(-2px); }
`

const CinemaImg = styled.div`
  height: 56px;
  width: 100%;
  background: linear-gradient(160deg, ${({ $c1 }) => $c1}, ${({ $c2 }) => $c2});
`

const CinemaLabel = styled.div`
  padding: 7px 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const CinemaName = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: #111;
`

const CinemaCount = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #bbb;
`

const CinemaCheck = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #ff751f;
  display: ${({ $active }) => ($active ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: #fff;
  font-weight: 700;
`

// Film search
const SearchWrap = styled.div`
  position: relative;
  margin-bottom: 1.25rem;
`

const SearchInput = styled.input`
  width: 100%;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.95rem;
  color: #111;
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: #bbb; }
  &:focus { border-color: #ff751f; }
`

const SearchIcon = styled.span`
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  color: #bbb;
  pointer-events: none;
`

const FiltersActive = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const FilterLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #aaa;
`

const FilterTag = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(255,117,31,0.08);
  border: 1px solid rgba(255,117,31,0.25);
  color: #c45a10;
  text-transform: lowercase;
`

// Film grid
const FilmGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 1.5rem;
  @media (max-width: 800px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 540px) { grid-template-columns: repeat(2, 1fr); }
`

const FilmCard = styled.div`
  background: #fff;
  border: 1.5px solid ${({ $selected }) => ($selected ? '#ff751f' : '#ddd')};
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  outline: ${({ $selected }) => ($selected ? '1.5px solid #ff751f' : 'none')};
  &:hover { border-color: #ff751f; transform: translateY(-2px); }
`

const FilmPoster = styled.div`
  width: 100%;
  height: 90px;
  background: linear-gradient(180deg, ${({ $c1 }) => $c1}, ${({ $c2 }) => $c2});
  position: relative;
  opacity: ${({ $selected }) => ($selected ? 0.75 : 1)};
  transition: opacity 0.15s;
`

const FilmOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ $selected }) => ($selected ? 1 : 0)};
  transition: opacity 0.15s;
`

const FilmCheck = styled.div`
  width: 26px;
  height: 26px;
  background: #ff751f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  font-weight: 700;
`

const FilmInfo = styled.div`
  padding: 9px 10px 10px;
`

const FilmTitle = styled.div`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 2px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FilmMeta = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #aaa;
  text-transform: lowercase;
`

const FilmDirector = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #bbb;
  margin-top: 1px;
  text-transform: lowercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NoResults = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem 1rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #bbb;
`

// Selected films strip
const SelectedStrip = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 0.5rem;
`

const StripTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

const StripLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #555;
  span { color: #ff751f; font-weight: 700; }
`

const ClearAll = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #bbb;
  background: none;
  border: none;
  cursor: pointer;
  text-transform: lowercase;
  transition: color 0.2s;
  padding: 0;
  &:hover { color: #888; }
`

const SelectedFilms = styled.div`
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
`

const SelectedTag = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(255,117,31,0.07);
  border: 1px solid rgba(255,117,31,0.25);
  border-radius: 20px;
`

const SelectedName = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #c45a10;
  font-weight: 600;
  text-transform: lowercase;
`

const RemoveBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #ff9555;
  font-size: 0.8rem;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
  &:hover { color: #c45a10; }
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

function TasteProfile() {
  const navigate = useNavigate()
  const {
    selectedGenres,
    setSelectedGenres,
    selectedCinemas,
    setSelectedCinemas,
    selectedFilms,
    setSelectedFilms,
    syncTasteProfile,
  } = useTasteProfile()

  const [step, setStep]     = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleGenre  = (g)  => setSelectedGenres((p)  => p.includes(g)   ? p.filter(x => x !== g)  : [...p, g])
  const toggleCinema = (id) => setSelectedCinemas((p) => p.includes(id)  ? p.filter(x => x !== id) : [...p, id])
  const toggleFilm   = (id) => setSelectedFilms((p)   => p.includes(id)  ? p.filter(x => x !== id) : [...p, id])

  const filteredFilms = MOCK_FILMS.filter((f) => {
    const matchGenre  = selectedGenres.length  === 0 || selectedGenres.includes(f.genre)
    const matchCinema = selectedCinemas.length === 0 || selectedCinemas.includes(
      CINEMAS.find(c => c.name === f.cinema)?.id
    )
    const matchSearch = search.trim() === '' ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.director.toLowerCase().includes(search.toLowerCase())
    return matchGenre && matchCinema && matchSearch
  })

  const selectedFilmObjs = MOCK_FILMS.filter(f => selectedFilms.includes(f.id))

  const canStep2  = selectedGenres.length  > 0
  const canStep3  = selectedCinemas.length > 0
  const canFinish = selectedFilms.length  >= MIN_FILMS

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      setLoading(true)
      try {
        await syncTasteProfile({
          selectedGenres,
          selectedCinemas,
          selectedFilms,
        })
        navigate('/deepdive')
      } catch (err) {
        console.error('Failed to sync taste profile:', err)
        navigate('/deepdive')
      } finally {
        setLoading(false)
      }
    }
  }


  const STEPS = [
    { num: 1, label: 'genres'  },
    { num: 2, label: 'cinemas' },
    { num: 3, label: 'films'   },
  ]

  return (
    <>
      <PageWrapper>
        <Topbar>
          <Logo to="/">Filmism</Logo>
          <StepIndicator>
            {STEPS.map((s, i) => (
              <StepItem key={s.num}>
                {i > 0 && <StepLine $done={step > s.num} />}
                <StepDot $active={step === s.num} $done={step > s.num}>
                  {step > s.num ? '✓' : s.num}
                </StepDot>
                <StepLabel $active={step === s.num} $done={step > s.num}>
                  {s.label}
                </StepLabel>
              </StepItem>
            ))}
          </StepIndicator>
        </Topbar>

        <PageBody>

          {/* ══ STEP 1: Genres ══ */}
          {step === 1 && (
            <>
              <SectionTitle>What genres do<br />you love?</SectionTitle>
              <SectionSub>
                Pick all the genres that excite you. We'll use these to find
                films you actually care about.
              </SectionSub>
              <ColTitle>
                Select genres
                <ColCount>
                  {selectedGenres.length > 0 ? `${selectedGenres.length} selected` : 'none yet'}
                </ColCount>
              </ColTitle>
              <GenreGrid>
                {GENRES.map((g) => (
                  <GenrePill key={g} $active={selectedGenres.includes(g)} onClick={() => toggleGenre(g)}>
                    {g.toLowerCase()}
                  </GenrePill>
                ))}
              </GenreGrid>
            </>
          )}

          {/* ══ STEP 2: Cinemas ══ */}
          {step === 2 && (
            <>
              <SectionTitle>Which cinema worlds<br />interest you?</SectionTitle>
              <SectionSub>
                Pick the film traditions you're drawn to. We'll find films from
                these origins that match your taste.
              </SectionSub>
              <ColTitle>
                Cinema origins
                <ColCount>
                  {selectedCinemas.length > 0 ? `${selectedCinemas.length} selected` : 'none yet'}
                </ColCount>
              </ColTitle>
              <CinemaGrid>
                {CINEMAS.map((c) => (
                  <CinemaCard
                    key={c.id}
                    $active={selectedCinemas.includes(c.id)}
                    onClick={() => toggleCinema(c.id)}
                  >
                    <CinemaImg $c1={c.c1} $c2={c.c2} />
                    <CinemaLabel>
                      <CinemaName>{c.name}</CinemaName>
                      <CinemaCount>{c.count}</CinemaCount>
                    </CinemaLabel>
                    <CinemaCheck $active={selectedCinemas.includes(c.id)}>✓</CinemaCheck>
                  </CinemaCard>
                ))}
              </CinemaGrid>
            </>
          )}

          {/* ══ STEP 3: Film Selection ══ */}
          {step === 3 && (
            <>
              <SectionTitle>Pick your<br />favourite films.</SectionTitle>
              <SectionSub>
                Choose at least {MIN_FILMS} films you love. These become the
                foundation of your taste profile — the more you pick, the better your matches.
              </SectionSub>

              {/* Active filters hint */}
              {(selectedGenres.length > 0 || selectedCinemas.length > 0) && (
                <FiltersActive>
                  <FilterLabel>showing:</FilterLabel>
                  {selectedGenres.map((g) => <FilterTag key={g}>{g.toLowerCase()}</FilterTag>)}
                  {selectedCinemas.map((id) => {
                    const c = CINEMAS.find(c => c.id === id)
                    return <FilterTag key={id}>{c?.name.toLowerCase()}</FilterTag>
                  })}
                </FiltersActive>
              )}

              <SearchWrap>
                <SearchIcon>⌕</SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="search by title or director..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </SearchWrap>

              <ColTitle>
                Films
                <ColCount>
                  {selectedFilms.length > 0 ? `${selectedFilms.length} selected` : 'none yet'}
                </ColCount>
              </ColTitle>

              <FilmGrid>
                {filteredFilms.length === 0 ? (
                  <NoResults>no films match — try adjusting your search.</NoResults>
                ) : (
                  filteredFilms.map((f) => (
                    <FilmCard
                      key={f.id}
                      $selected={selectedFilms.includes(f.id)}
                      onClick={() => toggleFilm(f.id)}
                    >
                      <FilmPoster $c1={f.c1} $c2={f.c2} $selected={selectedFilms.includes(f.id)}>
                        <FilmOverlay $selected={selectedFilms.includes(f.id)}>
                          <FilmCheck>✓</FilmCheck>
                        </FilmOverlay>
                      </FilmPoster>
                      <FilmInfo>
                        <FilmTitle>{f.title}</FilmTitle>
                        <FilmMeta>{f.year} · {f.genre.toLowerCase()}</FilmMeta>
                        <FilmDirector>{f.director.toLowerCase()}</FilmDirector>
                      </FilmInfo>
                    </FilmCard>
                  ))
                )}
              </FilmGrid>

              {/* Selected strip */}
              {selectedFilms.length > 0 && (
                <SelectedStrip>
                  <StripTop>
                    <StripLabel>
                      your favourites — <span>{selectedFilms.length} films</span> selected
                    </StripLabel>
                    <ClearAll onClick={() => setSelectedFilms([])}>clear all</ClearAll>
                  </StripTop>
                  <SelectedFilms>
                    {selectedFilmObjs.map((f) => (
                      <SelectedTag key={f.id}>
                        <SelectedName>{f.title.toLowerCase()}</SelectedName>
                        <RemoveBtn
                          onClick={(e) => { e.stopPropagation(); toggleFilm(f.id) }}
                        >×</RemoveBtn>
                      </SelectedTag>
                    ))}
                  </SelectedFilms>
                </SelectedStrip>
              )}
            </>
          )}

        </PageBody>
      </PageWrapper>

      {/* ── Sticky Bottom Bar ── */}
      <BottomBar>
        <BottomHint>
          {step === 1 && (
            selectedGenres.length > 0
              ? <><span>{selectedGenres.length} genres</span> selected</>
              : 'select at least one genre to continue'
          )}
          {step === 2 && (
            selectedCinemas.length > 0
              ? <><span>{selectedCinemas.length} cinemas</span> selected</>
              : 'select at least one cinema to continue'
          )}
          {step === 3 && (
            canFinish
              ? <>profile ready — <span>{selectedFilms.length} films</span> selected</>
              : <>select <span>{MIN_FILMS - selectedFilms.length} more</span> film{MIN_FILMS - selectedFilms.length !== 1 ? 's' : ''} to continue</>
          )}
        </BottomHint>
        <BtnRow>
          {step > 1 && <BackBtn onClick={() => setStep(step - 1)}>← back</BackBtn>}
          <NextBtn
            disabled={
              (step === 1 && !canStep2) ||
              (step === 2 && !canStep3) ||
              (step === 3 && !canFinish) ||
              loading
            }
            onClick={handleNext}
          >
            {loading ? 'building...' : step === 3 ? 'build my profile →' : 'continue →'}
          </NextBtn>
        </BtnRow>
      </BottomBar>
    </>
  )
}


export default TasteProfile