import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import ryanImage from '../assets/ryan.png'
import emmaImage from '../assets/emma.png'

const PageWrapper = styled.main`
  width: 100%;
  min-height: 100vh;
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
    gap: 1.25rem;
    flex-wrap: wrap;
    padding: 0 1rem;
  }
`

const NavLink = styled(Link)`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  color: #111;
  text-decoration: none;
  text-transform: lowercase;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }
`

const HeroSplit = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr;
  width: 100%;
  min-height: 100vh;
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
  height: 100%; /* Increased from 90% to span the whole height if needed */
  z-index: 5;
  background-repeat: no-repeat;
  /* Changed from contain to cover to ensure they fill the width/height of their box */
  background-size: cover; 
  pointer-events: none;

  @media (max-width: 900px) {
    height: 80%;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const RyanPortrait = styled(BasePortrait)`
  left: 0;
  width: 40vw; /* Takes up 45% of the viewport width */
  background-image: url(${ryanImage});
  background-position: left bottom; /* Anchors Ryan to the far left corner */
`;

const EmmaPortrait = styled(BasePortrait)`
  right: 0;
  width: 40vw; /* Takes up 45% of the viewport width */
  background-image: url(${emmaImage});
  background-position: right bottom; /* Anchors Emma to the far right corner */
`;

const CentralContent = styled.section`
  position: absolute;
  top: 57%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
  width: min(90vw, 720px);
`

const MainLogo = styled.h1`
  font-family: 'Kare', 'Playfair Display', Georgia, serif;
  font-size: clamp(3rem, 10vw, 6rem);
  font-weight: 700;
  line-height: 1;
  margin-top: 0;
  letter-spacing: -0.01em;
  color: #111;
`

const Subtitle = styled.p`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  margin-top: 0.4rem;
  margin-bottom: 1.6rem;
  font-size: clamp(1rem, 2.4vw, 1.2rem);
  font-weight: 600;
  letter-spacing: 0.19em;
  color: #222;
  transform: translate(0.12rem, -3.3rem);

`

const Cta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border: 2px solid #111;
  color: #111;
  text-decoration: none;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transform: translateY(-2.2rem);
  transition: all 0.2s ease;

  &:hover {
    background: #111;
    color: #fff;
    transform: translateY(-2.35rem) scale(1.03);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
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
        <Subtitle>Discover films that feel like you</Subtitle>
      </CentralContent>
    </PageWrapper>
  )
}

export default LandingPage