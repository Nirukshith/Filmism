import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { CINEMAS } from '../constants/data'
import api from '../services/api'
import RatingControl from '../components/RatingControl'
import TasteClustersView from '../components/TasteClustersView'
import OriginLandmarkIcon from '../components/OriginLandmarkIcon'
import AuthPromptModal from '../components/AuthPromptModal'
import { getAuthStatus } from '../utils/auth'

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRES = [
  'Thriller', 'Sci-Fi', 'Drama', 'Horror',
  'Romance', 'Comedy', 'Crime', 'Animation',
  'Documentary', 'Action', 'Mystery', 'War',
  'Historical', 'Fantasy', 'Adventure', 'Musical',
  'Family', 'Western',
]

const MIN_FILMS = 5
const TARGET_FILMS = 20

const DECADES = [
  { id: 'all', label: 'All' },
  { id: '2020s', label: '2020s' },
  { id: '2010s', label: '2010s' },
  { id: '2000s', label: '2000s' },
  { id: '1990s', label: '1990s' },
  { id: '1980s', label: '1980s' },
  { id: 'classic', label: 'Classic (Pre-1980)' },
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
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: opacity 0.2s;
  &:hover {
    opacity: ${({ $clickable }) => ($clickable ? '0.8' : '1')};
  }
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
  display: flex;
  flex-direction: column;
  justify-content: ${({ $step }) => ($step === 4 ? 'flex-start' : 'center')};
  padding: ${({ $step }) => ($step === 4 ? '1.5rem 1.75rem 6.5rem' : '1rem 1.75rem 4.5rem')};
  max-width: 1380px;
  width: 100%;
  margin: 0 auto;
  @media (max-width: 768px) { padding: ${({ $step }) => ($step === 4 ? '1rem 1rem 6.5rem' : '0.85rem 1rem 4.5rem')}; }
`

const StepContentWrapper = styled.div`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? '1020px' : '780px')};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const SectionTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.75rem, 3.5vw, 2.35rem);
  font-weight: 700;
  color: #111;
  line-height: 1.15;
  margin: 0 auto 0.35rem;
  text-align: center;
  max-width: 680px;
`

const SectionSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #666;
  margin: 0 auto 1.1rem;
  line-height: 1.5;
  max-width: 540px;
  text-align: center;
`

const ColTitle = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: #888;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.65rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ColCount = styled.span`
  font-weight: 600;
  color: #ff751f;
  text-transform: lowercase;
`

// ── Step 1: Genres ──
const GenreGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 0.85rem;
  width: 100%;
  margin-bottom: 2rem;
`

const GenrePill = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  padding: 0.65rem 1.45rem;
  border-radius: 999px;
  border: 1.5px solid ${({ $active }) => ($active ? '#ff751f' : '#ccc')};
  background: ${({ $active }) => ($active ? '#ff751f' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#333')};
  cursor: pointer;
  text-transform: lowercase;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: ${({ $active }) => ($active ? '0 4px 14px rgba(255, 117, 31, 0.25)' : '0 2px 6px rgba(0,0,0,0.02)')};

  &:hover {
    border-color: #ff751f;
    color: ${({ $active }) => ($active ? '#fff' : '#ff751f')};
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 117, 31, 0.15);
  }
`

// ── Step 2: Cinemas ──
const CinemaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem 0.9rem;
  width: 100%;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const CinemaCard = styled.div`
  border: 1.5px solid ${({ $active }) => ($active ? '#ff751f' : '#ddd')};
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.75rem 0.95rem;
  gap: 0.75rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ $active }) => ($active ? '0 4px 14px rgba(255, 117, 31, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)')};

  &:hover {
    border-color: #ff751f;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.06);
  }
`

const CinemaIconBadge = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: ${({ $tint, $activeBg, $selected }) =>
    $selected ? ($activeBg || 'rgba(255, 117, 31, 0.18)') : ($tint || 'rgba(0, 0, 0, 0.05)')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $accent }) => $accent || '#111'};
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
`

const CinemaLabel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
`

const CinemaName = styled.div`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #111;
  line-height: 1.2;
`

const CinemaCheck = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid ${({ $active }) => ($active ? '#ff751f' : '#ccc')};
  background: ${({ $active }) => ($active ? '#ff751f' : 'transparent')};
  color: #fff;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`

// ── Step 3: Signal Meter & Search ──
const SignalMeterWrap = styled.div`
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  padding: 0.75rem 1.1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
`

const SignalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
  gap: 1rem;
`

const SignalTitle = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: #222;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const SignalStatus = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ $level }) => ($level === 'high' ? '#2e7d32' : $level === 'good' ? '#ff751f' : '#888')};
`

const SignalTrack = styled.div`
  width: 100%;
  height: 6px;
  background: #eee;
  border-radius: 999px;
  overflow: hidden;
  position: relative;
`

const SignalFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => `${$pct}%`};
  background: linear-gradient(90deg, #ff751f, #3b8b4b);
  border-radius: 999px;
  transition: width 0.3s ease;
`

const SignalLegend = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.3rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  color: #999;
`

const FiltersActive = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
`

const FilterLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #999;
`

const FilterTag = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  background: #e4e4e4;
  color: #333;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
`

const DecadeFilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
`

const DecadeLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #888;
  font-weight: 500;
  margin-right: 0.2rem;
`

const DecadePill = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1.5px solid ${({ $active }) => ($active ? '#ff751f' : '#ddd')};
  background: ${({ $active }) => ($active ? '#ff751f' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#444')};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);

  &:hover {
    border-color: #ff751f;
    color: ${({ $active }) => ($active ? '#fff' : '#ff751f')};
    background: ${({ $active }) => ($active ? '#ff751f' : '#fff9f5')};
  }
`

const SearchWrap = styled.div`
  position: relative;
  margin-bottom: 0.9rem;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #888;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 0.65rem 0.9rem 0.65rem 2.5rem;
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #111;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  &:focus { border-color: #ff751f; }
`

const ClearSearchBtn = styled.button`
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  background: #eee;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #ddd; color: #111; }
`

const FilmGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.85rem;
  margin-bottom: 2rem;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(5, 1fr);
  }
  @media (max-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const FilmCard = styled.div`
  background: #fff;
  border: 1.5px solid ${({ $selected }) => ($selected ? '#ff751f' : '#ddd')};
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  &:hover {
    border-color: #ff751f;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  }
`

const FilmPoster = styled.div`
  width: 100%;
  aspect-ratio: 2 / 3;
  background: ${({ $posterPath, $c1, $c2 }) =>
    $posterPath
      ? `url(https://image.tmdb.org/t/p/w500${$posterPath}) center / cover no-repeat`
      : `linear-gradient(180deg, ${$c1 || '#0d1b2a'}, ${$c2 || '#1e4d7b'})`};
  position: relative;
  opacity: ${({ $selected }) => ($selected ? 0.9 : 1)};
`

const FilmOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.25);
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
  padding: 6px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
`

const FilmTitle = styled.div`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: #111;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FilmMeta = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RatingWrap = styled.div`
  padding-top: 6px;
  border-top: 1px solid #eee;
`

const NoResults = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem 1rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #999;
`

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin: 1.5rem 0 2rem;
`

const PageBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border-radius: 4px;
  border: 1.5px solid ${({ $active }) => ($active ? '#111' : '#ddd')};
  background: ${({ $active }) => ($active ? '#111' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#444')};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? '700' : '400')};
  &:hover:not(:disabled) { border-color: #111; }
`

const PageArrow = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  height: 32px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1.5px solid #ddd;
  background: #fff;
  color: #444;
  cursor: pointer;
  &:hover:not(:disabled) { border-color: #111; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`

const PageEllipsis = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #999;
  padding: 0 4px;
`

const SelectedStrip = styled.div`
  background: #fff;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
`

const StripTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`

const StripLabel = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #777;
  span { color: #ff751f; font-weight: 700; }
`

const ClearAll = styled.button`
  background: none;
  border: none;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  color: #999;
  cursor: pointer;
  &:hover { color: #e05353; }
`

const SelectedFilms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`

const SelectedTag = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f3f3f3;
  border: 1px solid #ddd;
  border-radius: 999px;
  padding: 3px 10px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
`

const SelectedName = styled.span`
  color: #222;
`

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0;
  &:hover { color: #e05353; }
`

// ── Loading Modal ──
const spinAnim = keyframes`
  to { transform: rotate(360deg); }
`

const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.75);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`

const LoadingBox = styled.div`
  background: #fff;
  border-radius: 20px;
  padding: 2.5rem 3rem;
  text-align: center;
  max-width: 440px;
  width: 90%;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
`

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #eee;
  border-top-color: #ff751f;
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  animation: ${spinAnim} 0.8s linear infinite;
`

const LoadingTitle = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.25rem;
  color: #111;
  margin: 0 0 0.5rem;
`

const LoadingSub = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.5;
  margin: 0;
`

// ── Bottom Bar ──
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
  z-index: 30;
  @media (max-width: 640px) { padding: 0.85rem 1.25rem; }
`

const BottomHint = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #777;
  span { color: #111; font-weight: 700; }
  @media (max-width: 520px) { display: none; }
`

const BtnRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
`

const BackBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.7rem 1.4rem;
  border: 1.5px solid #ccc;
  background: transparent;
  color: #444;
  cursor: pointer;
  text-transform: lowercase;
  border-radius: 4px;
  transition: all 0.2s;
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
  &:hover:not(:disabled) { background: transparent; color: #111; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_GENRE_MAP = {
  'Thriller': 53,
  'Sci-Fi': 878,
  'Science Fiction': 878,
  'Drama': 18,
  'Horror': 27,
  'Romance': 10749,
  'Comedy': 35,
  'Crime': 80,
  'Animation': 16,
  'Documentary': 99,
  'Action': 28,
  'Mystery': 9648,
  'War': 10752,
  'Historical': 36,
  'History': 36,
  'Fantasy': 14,
  'Adventure': 12,
  'Musical': 10402,
  'Music': 10402,
  'Family': 10751,
  'Western': 37,
}

function TasteProfile() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    selectedGenres,
    setSelectedGenres,
    selectedCinemas,
    setSelectedCinemas,
    selectedFilms,
    setSelectedFilms,
    favoriteRatings,
    setFavoriteRatings,
    setFilmRating,
    initializeProfile,
    appendProfileFavorites,
    tasteClusters,
    aiSynthesis,
    userTasteProfile,
    clearProfile,
  } = useTasteProfile()

  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [filmCache, setFilmCache] = useState(() => {
    try {
      const stored = localStorage.getItem('filmism_film_cache')
      return stored ? JSON.parse(stored) : {}
    } catch (e) {
      return {}
    }
  })
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Analyzing cinema choices...')
  const [filteredFilms, setFilteredFilms] = useState([])
  const [genreMap, setGenreMap] = useState(DEFAULT_GENRE_MAP)
  const [originsMap, setOriginsMap] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedDecade, setSelectedDecade] = useState('all')
  const [profileError, setProfileError] = useState('')

  // Auto-restore pending guest onboarding selections upon login/register
  useEffect(() => {
    const pending = localStorage.getItem('filmism_pending_onboarding')
    const { isAuthenticated } = getAuthStatus()
    if (pending && isAuthenticated) {
      try {
        const parsed = JSON.parse(pending)
        if (Array.isArray(parsed.genres) && parsed.genres.length > 0) setSelectedGenres(parsed.genres)
        if (Array.isArray(parsed.origins) && parsed.origins.length > 0) setSelectedCinemas(parsed.origins)
        if (Array.isArray(parsed.films) && parsed.films.length > 0) setSelectedFilms(parsed.films)
        if (parsed.ratingsMap && Object.keys(parsed.ratingsMap).length > 0) setFavoriteRatings(parsed.ratingsMap)
        if (parsed.filmCache && Object.keys(parsed.filmCache).length > 0) {
          setFilmCache((prev) => ({ ...prev, ...parsed.filmCache }))
        }
        localStorage.removeItem('filmism_pending_onboarding')

        if (Array.isArray(parsed.films) && parsed.films.length >= MIN_FILMS) {
          setLoading(true)
          setLoadingText('Synthesizing your saved taste curation with AI...')
          initializeProfile({
            genres: parsed.genres,
            origins: parsed.origins,
            films: parsed.films,
            ratingsMap: parsed.ratingsMap || {},
          })
            .then(() => setStep(4))
            .catch((err) => {
              console.error('Failed to auto-initialize pending profile:', err)
              setStep(3)
            })
            .finally(() => setLoading(false))
        } else {
          setStep(3)
        }
      } catch (e) {
        localStorage.removeItem('filmism_pending_onboarding')
      }
    }
  }, [])

  // Persist filmCache to localStorage
  useEffect(() => {
    if (filmCache && Object.keys(filmCache).length > 0) {
      try {
        localStorage.setItem('filmism_film_cache', JSON.stringify(filmCache))
      } catch (e) { }
    }
  }, [filmCache])

  // Seed filmCache from user's saved taste profile favorites
  useEffect(() => {
    if (userTasteProfile?.favorites?.length > 0) {
      setFilmCache((prev) => {
        const next = { ...prev }
        userTasteProfile.favorites.forEach((fav) => {
          const id = fav.tmdbId || fav.id
          if (id && (!next[id] || next[id].title.startsWith('Film #'))) {
            next[id] = {
              id,
              title: fav.title || `Film #${id}`,
              year: fav.year,
              poster_path: fav.posterPath,
              genres: fav.genres || [],
            }
          }
        })
        return next
      })
    }
  }, [userTasteProfile])

  // Auto-resolve real movie details and titles for any selected films not in cache
  useEffect(() => {
    const missingIds = selectedFilms.filter(
      (id) => !filmCache[id] || !filmCache[id].title || filmCache[id].title.startsWith('Film #')
    )
    if (missingIds.length > 0) {
      api.post('/movies/batch-details', { ids: missingIds })
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setFilmCache((prev) => {
              const next = { ...prev }
              res.data.forEach((f) => {
                if (f && f.id) next[f.id] = f
              })
              return next
            })
          }
        })
        .catch((err) => {
          console.warn('Failed to batch resolve film names:', err.message)
        })
    }
  }, [selectedFilms])

  // Handle continue entry point from query parameters
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'continue') {
      setStep(3)
    } else if (mode === 'new_guest') {
      clearProfile()
      setFilmCache({})
      setStep(1)
    }
  }, [searchParams])

  // Fetch genre list and cinema origins on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get('/movies/genres')
        const map = { ...DEFAULT_GENRE_MAP }
        response.data.forEach(g => {
          map[g.name] = g.id
          if (g.tmdbName) map[g.tmdbName] = g.id
        })
        if (map['Music']) map['Musical'] = map['Music']
        if (map['History']) map['Historical'] = map['History']
        if (map['Science Fiction']) map['Sci-Fi'] = map['Science Fiction']
        setGenreMap(map)
      } catch (err) {
        console.error('Failed to fetch genres:', err)
      }
    }

    const fetchOrigins = async () => {
      try {
        const response = await api.get('/movies/origins')
        setOriginsMap(response.data)
      } catch (err) {
        console.error('Failed to fetch cinema origins:', err)
      }
    }

    fetchGenres()
    fetchOrigins()
  }, [])

  // Live TMDB search across all films regardless of genre/cinema page content
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await api.get('/movies/search', {
          params: { query: search.trim() },
        })

        const codeToId = {}
        CINEMAS.forEach(c => {
          const code = originsMap[c.name]
          if (code) codeToId[code] = c.id
        })

        const idToGenreName = Object.fromEntries(
          Object.entries(genreMap).map(([name, id]) => [id, name])
        )

        const transformed = (response.data || []).map((film) => ({
          id: film.id,
          title: film.title,
          year: film.release_date ? parseInt(film.release_date.split('-')[0]) : 'N/A',
          genres: (() => {
            const allGenres = (film.genre_ids || [])
              .map(id => idToGenreName[id])
              .filter(Boolean)
            return allGenres.length > 0 ? allGenres.slice(0, 3) : ['Film']
          })(),
          cinema: (() => {
            const filmCountryCode = film.origin_country?.[0]
            const cinemaId = codeToId[filmCountryCode] || 1
            return CINEMAS.find(c => c.id === cinemaId)?.name || 'Global'
          })(),
          director: 'Director',
          poster_path: film.poster_path,
          c1: '#0d1b2a',
          c2: '#1e4d7b',
        }))

        setSearchResults(transformed)
        setFilmCache(prev => {
          const next = { ...prev }
          transformed.forEach(f => { next[f.id] = f })
          return next
        })
      } catch (err) {
        console.error('Failed to search movies:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [search, genreMap, originsMap])

  // Fetch movies when genres, cinemas, or page changes
  useEffect(() => {
    const fetchMovies = async () => {
      if (selectedGenres.length === 0 && selectedCinemas.length === 0) {
        setFilteredFilms([])
        setTotalPages(1)
        return
      }

      setLoading(true)
      try {
        const genreIds = selectedGenres
          .map(name => genreMap[name])
          .filter(id => id !== undefined)
          .join('|')

        const idToCode = {}
        CINEMAS.forEach(c => {
          const code = originsMap[c.name]
          if (code) idToCode[c.id] = code
        })

        const countryCodes = selectedCinemas
          .map(id => idToCode[id])
          .filter(code => code !== undefined)
          .join('|')

        const response = await api.get('/movies/discover', {
          params: {
            with_genres: genreIds || undefined,
            with_origin_country: countryCodes || undefined,
            decade: selectedDecade !== 'all' ? selectedDecade : undefined,
            page: currentPage,
          },
        })

        const { results, total_pages } = response.data
        setTotalPages(total_pages || 1)

        const codeToId = {}
        CINEMAS.forEach(c => {
          const code = originsMap[c.name]
          if (code) codeToId[code] = c.id
        })

        const idToGenreName = Object.fromEntries(
          Object.entries(genreMap).map(([name, id]) => [id, name])
        )

        const transformedFilms = (results || []).map((film) => ({
          id: film.id,
          title: film.title,
          year: film.release_date ? parseInt(film.release_date.split('-')[0]) : 'N/A',
          genres: (() => {
            const allGenres = (film.genre_ids || [])
              .map(id => idToGenreName[id])
              .filter(Boolean)
            return allGenres.length > 0 ? allGenres.slice(0, 3) : [selectedGenres[0] || 'Unknown']
          })(),
          cinema: (() => {
            const filmCountryCode = film.origin_country?.[0]
            const cinemaId = codeToId[filmCountryCode] || 1
            return CINEMAS.find(c => c.id === cinemaId)?.name || 'Hollywood'
          })(),
          director: 'Director',
          poster_path: film.poster_path,
          c1: '#0d1b2a',
          c2: '#1e4d7b',
        }))

        setFilteredFilms(transformedFilms)
        setFilmCache(prev => {
          const next = { ...prev }
          transformedFilms.forEach(f => { next[f.id] = f })
          return next
        })
      } catch (err) {
        console.error('Failed to fetch movies:', err)
        setFilteredFilms([])
      } finally {
        setLoading(false)
      }
    }

    if (selectedGenres.length > 0 || selectedCinemas.length > 0) {
      fetchMovies()
    }
  }, [selectedGenres, selectedCinemas, genreMap, originsMap, currentPage, selectedDecade])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedGenres, selectedCinemas, selectedDecade])

  const toggleGenre = (g) => {
    // If genres are changed: already selected origins and favourite films will be reset
    setSelectedCinemas([])
    setSelectedFilms([])
    setFavoriteRatings({})
    setSelectedGenres((p) => p.includes(g) ? p.filter(x => x !== g) : [...p, g])
  }

  const toggleCinema = (id) => {
    // If origins are changed: genres not changed, already selected favourite films will be reset
    setSelectedFilms([])
    setFavoriteRatings({})
    setSelectedCinemas((p) => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const toggleFilm = (filmOrId) => {
    const id = typeof filmOrId === 'object' ? filmOrId.id : filmOrId
    if (typeof filmOrId === 'object') {
      setFilmCache(prev => ({ ...prev, [filmOrId.id]: filmOrId }))
    }

    setSelectedFilms((prev) => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id)
      } else {
        if (!favoriteRatings[id]) {
          setFilmRating(id, 3) // Default to 'good' (3)
        }
        return [...prev, id]
      }
    })
  }

  const selectedFilmObjs = selectedFilms.map(id => filmCache[id] || { id, title: `Film #${id}`, genres: [] })

  const isContinueMode = searchParams.get('mode') === 'continue'
  const canStep2 = selectedGenres.length > 0
  const canStep3 = selectedCinemas.length > 0
  const canFinish = selectedFilms.length >= MIN_FILMS || (isContinueMode && selectedFilms.length > 0)

  const handleStepClick = (targetStep) => {
    if (targetStep === 1) {
      setStep(1)
    } else if (targetStep === 2 && canStep2) {
      setStep(2)
    } else if (targetStep === 3 && canStep2 && canStep3) {
      setStep(3)
    } else if (targetStep === 4 && tasteClusters && tasteClusters.length > 0) {
      setStep(4)
    }
  }

  const handleNext = async () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      const { isAuthenticated } = getAuthStatus()
      if (!isAuthenticated) {
        // Persist selections so nothing is lost during account creation/login
        try {
          localStorage.setItem(
            'filmism_pending_onboarding',
            JSON.stringify({
              genres: selectedGenres,
              origins: selectedCinemas,
              films: selectedFilms,
              ratingsMap: favoriteRatings,
              filmCache,
            })
          )
        } catch (e) {}
        setAuthModalOpen(true)
        return
      }

      setLoading(true)
      setProfileError('')
      if (isContinueMode && typeof appendProfileFavorites === 'function') {
        setLoadingText('Incorporating new films into your taste clusters...')
        try {
          await appendProfileFavorites({
            films: selectedFilms,
            ratingsMap: favoriteRatings,
          })
          setStep(4)
        } catch (err) {
          console.error('Failed to append taste profile:', err)
          setProfileError(err.response?.data?.message || 'Failed to update taste clusters. Please try again.')
        } finally {
          setLoading(false)
        }
      } else {
        setLoadingText('Profiling cinema craftsmanship & discovering taste clusters with AI...')
        try {
          await initializeProfile({
            genres: selectedGenres,
            origins: selectedCinemas,
            films: selectedFilms,
            ratingsMap: favoriteRatings,
          })
          setStep(4)
        } catch (err) {
          console.error('Failed to build taste profile:', err)
          setProfileError(err.response?.data?.message || 'Failed to discover taste personas. Please check your selections and try again.')
        } finally {
          setLoading(false)
        }
      }
    } else if (step === 4) {
      navigate('/recommend')
    }
  }

  const STEPS = [
    { num: 1, label: 'genres' },
    { num: 2, label: 'origins' },
    { num: 3, label: 'films' },
    { num: 4, label: 'clusters' },
  ]

  const isStepClickable = (num) => {
    if (num === 1) return true
    if (num === 2) return canStep2
    if (num === 3) return canStep2 && canStep3
    if (num === 4) return tasteClusters && tasteClusters.length > 0
    return false
  }

  const signalLevel = selectedFilms.length >= 15 ? 'high' : selectedFilms.length >= 5 ? 'good' : 'initial'
  const signalPct = Math.min(100, Math.round((selectedFilms.length / TARGET_FILMS) * 100))

  return (
    <>
      {loading && step === 3 && (
        <LoadingOverlay>
          <LoadingBox>
            <Spinner />
            <LoadingTitle>Building Taste Profile</LoadingTitle>
            <LoadingSub>{loadingText}</LoadingSub>
          </LoadingBox>
        </LoadingOverlay>
      )}

      <PageWrapper>
        <Topbar>
          <Logo>Filmism</Logo>
          <StepIndicator>
            {STEPS.map((s, i) => {
              const clickable = isStepClickable(s.num)
              return (
                <StepItem
                  key={s.num}
                  $clickable={clickable}
                  onClick={() => clickable && handleStepClick(s.num)}
                >
                  {i > 0 && <StepLine $done={step > s.num} />}
                  <StepDot $active={step === s.num} $done={step > s.num}>
                    {step > s.num ? '✓' : s.num}
                  </StepDot>
                  <StepLabel $active={step === s.num} $done={step > s.num}>
                    {s.label}
                  </StepLabel>
                </StepItem>
              )
            })}
          </StepIndicator>
        </Topbar>

        <PageBody $step={step}>

          {/* ══ STEP 1: Genres ══ */}
          {step === 1 && (
            <StepContentWrapper>
              <SectionTitle>What genres do<br />you love?</SectionTitle>
              <SectionSub>
                Pick the genres that excite you. We'll use these to uncover
                films tailored to your cinematic sensibility.
              </SectionSub>
              <ColTitle>
                <span>Select genres</span>
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
            </StepContentWrapper>
          )}

          {/* ══ STEP 2: Origins ══ */}
          {step === 2 && (
            <StepContentWrapper $wide>
              <SectionTitle>Which cinema origins<br />interest you?</SectionTitle>
              <SectionSub>
                Pick the film traditions you're drawn to. We'll find cinema from
                these origins that matches your taste.
              </SectionSub>
              <ColTitle>
                <span>Cinema origins</span>
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
                    <CinemaIconBadge
                      $tint={c.tint}
                      $activeBg={c.activeBg}
                      $accent={c.accent}
                      $selected={selectedCinemas.includes(c.id)}
                    >
                      <OriginLandmarkIcon id={c.id} name={c.name} color={c.accent} size={20} />
                    </CinemaIconBadge>
                    <CinemaLabel>
                      <CinemaName>{c.name}</CinemaName>
                    </CinemaLabel>
                    <CinemaCheck $active={selectedCinemas.includes(c.id)}>✓</CinemaCheck>
                  </CinemaCard>
                ))}
              </CinemaGrid>
            </StepContentWrapper>
          )}

          {/* ══ STEP 3: Film Selection ══ */}
          {step === 3 && (
            <>
              {isContinueMode && (
                <div style={{
                  background: 'rgba(255, 117, 31, 0.08)',
                  border: '1.5px solid rgba(255, 117, 31, 0.3)',
                  borderRadius: '10px',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1.25rem',
                  fontFamily: 'Lexend Deca, sans-serif',
                  fontSize: '0.85rem',
                  color: '#333',
                  lineHeight: '1.5'
                }}>
                  <strong style={{ color: '#ff751f' }}>✦ Deepen Your Taste Profile:</strong> Select and rate additional favorite films below. They will be incrementally merged into your active taste personas without resetting your genres, origins, or existing favorites.
                </div>
              )}
              <SectionTitle>Pick your<br />favourite films.</SectionTitle>
              <SectionSub>
                Select films you love and rate how much they represent your taste.
                We need at least {MIN_FILMS} to discover your taste clusters, with {TARGET_FILMS} recommended.
              </SectionSub>

              {profileError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1.5px solid #f87171',
                  borderRadius: '10px',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1.25rem',
                  fontFamily: 'Lexend Deca, sans-serif',
                  fontSize: '0.85rem',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}>
                  <span>⚠ {profileError}</span>
                  <button
                    onClick={() => setProfileError('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#991b1b',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      lineHeight: '1'
                    }}
                  >×</button>
                </div>
              )}

              {/* Taste Signal Meter */}
              <SignalMeterWrap>
                <SignalHeader>
                  <SignalTitle>Cinematic Taste Signal</SignalTitle>
                  <SignalStatus $level={signalLevel}>
                    {signalLevel === 'high'
                      ? '✦ High Precision Taste Signal'
                      : signalLevel === 'good'
                        ? `✓ Initial Signal Ready (${selectedFilms.length} films selected)`
                        : `${selectedFilms.length}/${MIN_FILMS} minimum to unlock profile`}
                  </SignalStatus>
                </SignalHeader>
                <SignalTrack>
                  <SignalFill $pct={signalPct} />
                </SignalTrack>
                <SignalLegend>
                  <span>0</span>
                  <span>5 (Minimum)</span>
                  <span>15 (Multi-Cluster)</span>
                  <span>20–30 (Optimal)</span>
                </SignalLegend>
              </SignalMeterWrap>

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

              {/* Decade / Era Filter */}
              {!search.trim() && (
                <DecadeFilterRow>
                  <DecadeLabel>era:</DecadeLabel>
                  {DECADES.map((d) => (
                    <DecadePill
                      key={d.id}
                      $active={selectedDecade === d.id}
                      onClick={() => setSelectedDecade(d.id)}
                    >
                      {d.label}
                    </DecadePill>
                  ))}
                </DecadeFilterRow>
              )}

              <SearchWrap>
                <SearchIcon>⌕</SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="search any film in your favourite genre and origin.."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search.trim() && (
                  <ClearSearchBtn onClick={() => setSearch('')} title="Clear search">
                    ✕
                  </ClearSearchBtn>
                )}
              </SearchWrap>

              <ColTitle>
                {search.trim() ? (
                  <>
                    Search Results
                    <ColCount>
                      {isSearching ? 'searching database...' : `${searchResults.length} films found`}
                    </ColCount>
                  </>
                ) : (
                  <>
                    Films
                    <ColCount>
                      {selectedFilms.length > 0 ? `${selectedFilms.length} selected` : 'none yet'}
                    </ColCount>
                  </>
                )}
              </ColTitle>

              <FilmGrid>
                {(() => {
                  const displayFilms = search.trim() ? searchResults : filteredFilms
                  const isLoadingNow = search.trim() ? isSearching : loading

                  if (isLoadingNow) {
                    return <NoResults>{search.trim() ? 'searching all films in database...' : 'loading films...'}</NoResults>
                  }

                  if (displayFilms.length === 0) {
                    return (
                      <NoResults>
                        {search.trim()
                          ? `no films found for "${search}". try another title or keyword.`
                          : 'no films match — try adjusting your genre/cinema selection.'}
                      </NoResults>
                    )
                  }

                  return displayFilms.map((f) => {
                    const isSelected = selectedFilms.includes(f.id)
                    const ratingVal = favoriteRatings[f.id] !== undefined ? favoriteRatings[f.id] : 3

                    return (
                      <FilmCard
                        key={f.id}
                        $selected={isSelected}
                        onClick={() => toggleFilm(f)}
                      >
                        <FilmPoster
                          $posterPath={f.poster_path}
                          $c1={f.c1}
                          $c2={f.c2}
                          $selected={isSelected}
                        >
                          <FilmOverlay $selected={isSelected}>
                            <FilmCheck>✓</FilmCheck>
                          </FilmOverlay>
                        </FilmPoster>
                        <FilmInfo>
                          <div>
                            <FilmTitle>{f.title}</FilmTitle>
                            <FilmMeta>{f.year} · {(f.genres || []).map(g => g.toLowerCase()).join(' · ')}</FilmMeta>
                          </div>

                          {isSelected && (
                            <RatingWrap onClick={(e) => e.stopPropagation()}>
                              <RatingControl
                                value={ratingVal}
                                onChange={(val) => setFilmRating(f.id, val)}
                                showHaventWatched={false}
                                compact={true}
                              />
                            </RatingWrap>
                          )}
                        </FilmInfo>
                      </FilmCard>
                    )
                  })
                })()}
              </FilmGrid>

              {/* Pagination */}
              {!search.trim() && totalPages > 1 && (
                <PaginationBar>
                  <PageArrow
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                  >← prev</PageArrow>

                  {(() => {
                    const pages = []
                    const addPage = (n) => !pages.includes(n) && n >= 1 && n <= totalPages && pages.push(n)
                    addPage(1)
                    addPage(currentPage - 1)
                    addPage(currentPage)
                    addPage(currentPage + 1)
                    addPage(totalPages)
                    pages.sort((a, b) => a - b)

                    const items = []
                    pages.forEach((p, i) => {
                      if (i > 0 && p - pages[i - 1] > 1) {
                        items.push(<PageEllipsis key={`ellipsis-${p}`}>…</PageEllipsis>)
                      }
                      items.push(
                        <PageBtn
                          key={p}
                          $active={p === currentPage}
                          onClick={() => setCurrentPage(p)}
                          disabled={loading}
                        >{p}</PageBtn>
                      )
                    })
                    return items
                  })()}

                  <PageArrow
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                  >next →</PageArrow>
                </PaginationBar>
              )}

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

          {/* ══ STEP 4: Taste Clusters ══ */}
          {step === 4 && (
            <TasteClustersView
              clusters={tasteClusters}
              aiSynthesis={aiSynthesis}
              favorites={[...(userTasteProfile?.favorites || []), ...selectedFilmObjs.map(f => ({ ...f, tmdbId: f.id }))]}
            />
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
              ? <><span>{selectedCinemas.length} origins</span> selected</>
              : 'select at least one origin to continue'
          )}
          {step === 3 && (
            canFinish
              ? <>taste profile ready — <span>{selectedFilms.length} films</span> selected</>
              : <>select <span>{MIN_FILMS - selectedFilms.length} more</span> film{MIN_FILMS - selectedFilms.length !== 1 ? 's' : ''} to continue</>
          )}
          {step === 4 && (
            <><span>{tasteClusters.length} taste personas</span> discovered</>
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
            {loading ? 'building...' : step === 3 ? (isContinueMode ? 'update taste clusters →' : 'build taste clusters →') : step === 4 ? 'explore candidates →' : 'continue →'}
          </NextBtn>
        </BtnRow>
      </BottomBar>

      <AuthPromptModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        genresCount={selectedGenres.length}
        originsCount={selectedCinemas.length}
        filmsCount={selectedFilms.length}
      />
    </>
  )
}

export default TasteProfile