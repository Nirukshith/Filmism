import React from 'react'
import styled, { keyframes } from 'styled-components'
import { useNavigate } from 'react-router-dom'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideUp = keyframes`
  from { transform: translateY(20px) scale(0.97); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.72);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.25rem;
  animation: ${fadeIn} 0.2s ease-out;
`

const ModalBox = styled.div`
  background: #ffffff;
  border-radius: 24px;
  max-width: 480px;
  width: 100%;
  padding: 2.5rem 2.2rem;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: ${slideUp} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
`

const CloseBtn = styled.button`
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: #888;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  border-radius: 6px;
  transition: all 0.2s;
  &:hover {
    color: #111;
    background: #f0f0f0;
  }
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: center;
`

const ModalBadge = styled.div`
  align-self: center;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: #fff4ec;
  color: #ff751f;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  border: 1px solid #ffd8bf;
`

const ModalTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.7rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.15;
  letter-spacing: -0.01em;
`

const ModalSubtitle = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.88rem;
  color: #666;
  margin: 0;
  line-height: 1.5;
`

const SummaryPills = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.85rem 1rem;
  background: #f8f8f8;
  border-radius: 14px;
  border: 1px solid #eaeaea;
`

const Pill = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #444;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  strong {
    color: #111;
    font-weight: 600;
  }
`

const ActionStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const PrimaryBtn = styled.button`
  width: 100%;
  padding: 0.95rem 1.5rem;
  background: #ff751f;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #e6600e;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(255, 117, 31, 0.3);
  }
`

const SecondaryBtn = styled.button`
  width: 100%;
  padding: 0.9rem 1.5rem;
  background: transparent;
  color: #111111;
  border: 1.5px solid #dcdcdc;
  border-radius: 12px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
    border-color: #111111;
  }
`

const DismissLink = styled.button`
  background: transparent;
  border: none;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #888;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  align-self: center;
  transition: color 0.2s;

  &:hover {
    color: #111;
  }
`

export default function AuthPromptModal({
  isOpen,
  onClose,
  genresCount = 0,
  originsCount = 0,
  filmsCount = 0,
}) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleRegister = () => {
    navigate('/register?returnTo=/taste')
  }

  const handleLogin = () => {
    navigate('/login?returnTo=/taste')
  }

  return (
    <Overlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="Close modal">×</CloseBtn>

        <Header>
          <ModalBadge>Save & Unlock AI Profile</ModalBadge>
          <ModalTitle>Almost there.</ModalTitle>
          <ModalSubtitle>
            Create an account or log in to synthesize your personalized AI taste clusters and discover film recommendations tailored to your curation.
          </ModalSubtitle>
        </Header>

        <SummaryPills>
          <Pill>
            <span>🎭</span>
            <span><strong>{genresCount}</strong> genres</span>
          </Pill>
          <Pill>•</Pill>
          <Pill>
            <span>🌍</span>
            <span><strong>{originsCount}</strong> origins</span>
          </Pill>
          <Pill>•</Pill>
          <Pill>
            <span>🎬</span>
            <span><strong>{filmsCount}</strong> films saved</span>
          </Pill>
        </SummaryPills>

        <ActionStack>
          <PrimaryBtn onClick={handleRegister}>
            create account to build profile →
          </PrimaryBtn>
          <SecondaryBtn onClick={handleLogin}>
            log in to existing account
          </SecondaryBtn>
          <DismissLink onClick={onClose}>
            ← back to selecting films
          </DismissLink>
        </ActionStack>
      </ModalBox>
    </Overlay>
  )
}
