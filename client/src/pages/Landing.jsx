import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import ryanImage from '../assets/ryan.webp'
import emmaImage from '../assets/emma.webp'

const PageWrapper = styled.main`
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`

const Nav = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2.5rem;
  width: 100%;
  margin: 2rem auto 0;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;

  @media (max-width: 640px) {
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0 0.75rem;
    margin: 1.25rem auto 0;
  }
`

const NavLink = styled(Link)`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  color: #111;
  text-decoration: none;
  text-transform: lowercase;
  transition: opacity 0.2s;
  padding: 4px;

  @media (max-width: 640px) {
    font-size: 0.84rem;
  }

  &:hover {
    opacity: 0.7;
  }
`

const HeroSplit = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
`

const TopPanel = styled.div`
  background: #efefef;
`

const BottomPanel = styled.div`
  background: #ff751f;
`

const BasePortrait = styled.div`
  position: absolute;
  bottom: 0;
  height: 100%;
  z-index: 5;
  background-repeat: no-repeat;
  background-size: cover; 
  pointer-events: none;

  @media (max-width: 900px) {
    height: 75%;
    width: 35vw;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const RyanPortrait = styled(BasePortrait)`
  left: 0;
  width: 40vw;
  background-image: url(${ryanImage});
  background-position: left bottom;
`;

const EmmaPortrait = styled(BasePortrait)`
  right: -3vw;
  width: 40vw;
  background-image: url(${emmaImage});
  background-position: right bottom;

  @media (max-width: 1200px) {
    right: -2vw;
  }
`;

const CentralContent = styled.section`
  position: absolute;
  top: calc(50% + 0.75rem);
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
  width: fit-content;
  max-width: 94vw;
  padding: 0;

  @media (max-width: 640px) {
    top: calc(50% + 0.45rem);
  }
`

const MainLogo = styled.h1`
  font-family: 'Kare', 'Playfair Display', Georgia, serif;
  font-size: clamp(3.2rem, 12vw, 6.8rem);
  font-weight: 700;
  line-height: 1;
  margin: 0;
  padding: 0;
  letter-spacing: -0.01em;
  color: #111;
  text-transform: uppercase;
  white-space: nowrap;
`

const Subtitle = styled.p`
  position: absolute;
  top: calc(100% - 1.05rem);
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: clamp(0.85rem, 2.7vw, 1.35rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #111;
  margin: 0;
  padding: 0;
  box-sizing: border-box;

  @media (max-width: 640px) {
    font-size: clamp(0.76rem, 2.8vw, 1.05rem);
    top: calc(100% - 0.75rem);
  }
`

function LandingPage() {
  const navigate = useNavigate()

  const handleTryAsGuest = (e) => {
    e.preventDefault()
    // Reset guest session, log out existing user if any, and clean taste state
    const newGuestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.setItem('filmism_session_id', newGuestId)
    localStorage.removeItem('filmism_taste_clusters')
    localStorage.removeItem('filmism_ai_synthesis')
    localStorage.removeItem('filmism_film_cache')
    localStorage.removeItem('filmism_is_returning_user')
    navigate('/taste?mode=new_guest')
  }

  return (
    <PageWrapper>
      <Nav aria-label="Main navigation">
        <NavLink to="/taste?mode=new_guest" onClick={handleTryAsGuest}>try as guest</NavLink>
        <NavLink to="/login">log in</NavLink>
        <NavLink to="/register">create account</NavLink>
      </Nav>

      <HeroSplit>
        <TopPanel />
        <BottomPanel />
      </HeroSplit>

      <RyanPortrait aria-hidden="true" />
      <EmmaPortrait aria-hidden="true" />

      <CentralContent>
        <MainLogo>Filmism</MainLogo>
        <Subtitle>
          <span>Discover</span>
          <span>films</span>
          <span>that</span>
          <span>feel</span>
          <span>like</span>
          <span>you</span>
        </Subtitle>
      </CentralContent>
    </PageWrapper>
  )
}

export default LandingPage