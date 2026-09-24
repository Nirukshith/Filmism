import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'

// ─── Keyframe Animations ──────────────────────────────────────────────────────

const clapHinge = keyframes`
  0%, 100% {
    transform: rotate(0deg);
  }
  15% {
    transform: rotate(-28deg);
  }
  30% {
    transform: rotate(-32deg);
  }
  42% {
    transform: rotate(0deg);
  }
  46% {
    transform: rotate(-4deg);
  }
  50% {
    transform: rotate(0deg);
  }
`

const boardBounce = keyframes`
  0%, 41%, 100% {
    transform: translateY(0);
  }
  43% {
    transform: translateY(3px) scale(0.99);
  }
  48% {
    transform: translateY(-1px) scale(1.005);
  }
  54% {
    transform: translateY(0) scale(1);
  }
`

const clapShockwave = keyframes`
  0%, 40% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  43% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(0.85);
  }
  70% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
`

const pulseDot = keyframes`
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.25);
    opacity: 1;
  }
`

// ─── Styled Components ────────────────────────────────────────────────────────

const LoaderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1rem 4rem;
  width: 100%;
  user-select: none;
`

const Stage = styled.div`
  position: relative;
  width: 180px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Shockwave = styled.div`
  position: absolute;
  top: 36px;
  left: 28px;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 2px solid #ff751f;
  pointer-events: none;
  animation: ${clapShockwave} 2.1s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
`

const ClapperSvg = styled.svg`
  overflow: visible;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.12));
`

const BoardBody = styled.g`
  animation: ${boardBounce} 2.1s cubic-bezier(0.25, 1, 0.5, 1) infinite;
`

const ClapperArm = styled.g`
  transform-origin: 18px 36px;
  animation: ${clapHinge} 2.1s cubic-bezier(0.25, 1, 0.5, 1) infinite;
`

const Caption = styled.div`
  margin-top: 1.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
`

const MainStatus = styled.p`
  margin: 0;
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #18181b;
  display: flex;
  align-items: center;
  gap: 7px;

  span.dot {
    width: 6px;
    height: 6px;
    background: #ff751f;
    border-radius: 50%;
    animation: ${pulseDot} 1.2s ease-in-out infinite;
  }
`

const SubStatus = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  color: #888;
  letter-spacing: 0.04em;
`

// ─── Snapping Cinema Clapperboard Component ───────────────────────────────────

export default function ClapperLoader({ label = 'Cueing Next Scene...', subLabel = 'Rolling Filmism recommendations' }) {
  const [takeNumber, setTakeNumber] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setTakeNumber((prev) => (prev % 99) + 1)
    }, 2100)
    return () => clearInterval(interval)
  }, [])

  return (
    <LoaderWrapper role="status" aria-label="Loading recommendations">
      <Stage>
        <Shockwave />

        <ClapperSvg width="160" height="135" viewBox="0 0 160 135" fill="none">
          <defs>
            {/* Diagonal Stripes Pattern for the Clapper Arm */}
            <pattern id="clapperStripes" width="22" height="22" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="11" height="22" fill="#18181b" />
              <rect x="11" y="0" width="11" height="22" fill="#ff751f" />
            </pattern>
            {/* Top Fixed Bar Pattern */}
            <pattern id="fixedStripes" width="22" height="22" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="11" height="22" fill="#ffffff" />
              <rect x="11" y="0" width="11" height="22" fill="#18181b" />
            </pattern>
          </defs>

          {/* ── Main Slate Board Body (Bounces subtly on clap impact) ── */}
          <BoardBody>
            {/* Slate Body Background */}
            <rect x="12" y="36" width="136" height="90" rx="6" fill="#18181b" stroke="#27272a" strokeWidth="1.5" />

            {/* Top Fixed Chevron Guide Bar */}
            <rect x="12" y="36" width="136" height="14" rx="2" fill="url(#fixedStripes)" />
            <line x1="12" y1="50" x2="148" y2="50" stroke="#3f3f46" strokeWidth="1.2" />

            {/* Slate Information Grid Lines */}
            <line x1="12" y1="72" x2="148" y2="72" stroke="#333338" strokeWidth="1" />
            <line x1="12" y1="94" x2="148" y2="94" stroke="#333338" strokeWidth="1" />
            <line x1="56" y1="72" x2="56" y2="94" stroke="#333338" strokeWidth="1" />
            <line x1="104" y1="72" x2="104" y2="94" stroke="#333338" strokeWidth="1" />

            {/* Brand Title on Slate */}
            <text x="20" y="64" fill="#ff751f" fontFamily="'Lemon Milk', sans-serif" fontSize="8.5" fontWeight="700" letterSpacing="0.08em">
              FILMISM
            </text>
            <text x="80" y="64" fill="#a1a1aa" fontFamily="'Lexend Deca', sans-serif" fontSize="6.2" fontWeight="500">
              PRODUCTION: TASTE
            </text>

            {/* Field Headers */}
            <text x="20" y="80" fill="#71717a" fontFamily="'Lexend Deca', sans-serif" fontSize="5.5" fontWeight="600">
              ROLL
            </text>
            <text x="64" y="80" fill="#71717a" fontFamily="'Lexend Deca', sans-serif" fontSize="5.5" fontWeight="600">
              SCENE
            </text>
            <text x="112" y="80" fill="#71717a" fontFamily="'Lexend Deca', sans-serif" fontSize="5.5" fontWeight="600">
              TAKE
            </text>

            {/* Dynamic Values */}
            <text x="20" y="90" fill="#ffffff" fontFamily="'Lexend Deca', sans-serif" fontSize="7.5" fontWeight="700">
              01
            </text>
            <text x="64" y="90" fill="#ffffff" fontFamily="'Lexend Deca', sans-serif" fontSize="7.5" fontWeight="700">
              MATCH
            </text>
            <text x="112" y="90" fill="#ff751f" fontFamily="'Lexend Deca', sans-serif" fontSize="7.5" fontWeight="700">
              {String(takeNumber).padStart(2, '0')}
            </text>

            {/* Director & Cam Metadata */}
            <text x="20" y="106" fill="#a1a1aa" fontFamily="'Lexend Deca', sans-serif" fontSize="5.8">
              DIRECTOR: AI CURATOR
            </text>
            <text x="20" y="117" fill="#71717a" fontFamily="'Lexend Deca', sans-serif" fontSize="5.5">
              FPS: 24.00 · SYNC OK
            </text>

            {/* Right Side Sound Waves Accent */}
            <rect x="134" y="104" width="2" height="12" rx="1" fill="#ff751f" />
            <rect x="138" y="107" width="2" height="6" rx="1" fill="#ff751f" opacity="0.6" />
            <rect x="130" y="108" width="2" height="5" rx="1" fill="#ff751f" opacity="0.6" />
          </BoardBody>

          {/* ── Hinged Clapper Arm (Snaps Open and Claps Shut) ── */}
          <ClapperArm>
            {/* The Top Diagonal-Striped Slap Stick */}
            <rect x="12" y="22" width="136" height="14" rx="3" fill="url(#clapperStripes)" stroke="#27272a" strokeWidth="1" />

            {/* Steel Hinge Pin */}
            <circle cx="18" cy="36" r="4.5" fill="#52525b" stroke="#71717a" strokeWidth="1" />
            <circle cx="18" cy="36" r="1.8" fill="#ff751f" />

            {/* Right Magnetic Fastener Pin */}
            <circle cx="140" cy="29" r="2.2" fill="#71717a" />
          </ClapperArm>
        </ClapperSvg>
      </Stage>

      <Caption>
        <MainStatus>
          <span className="dot" />
          {label}
        </MainStatus>
        {subLabel && <SubStatus>{subLabel}</SubStatus>}
      </Caption>
    </LoaderWrapper>
  )
}
