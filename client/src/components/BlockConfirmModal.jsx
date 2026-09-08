import { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { safetyAPI } from '../services/api'

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const scaleUp = keyframes`
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: ${fadeIn} 0.2s ease;
`

const ModalCard = styled.div`
  background: #ffffff;
  width: 100%;
  max-width: 440px;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: ${scaleUp} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1.5px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1rem;
  color: #111;
  margin: 0;
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #888;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  border-radius: 4px;
  &:hover {
    color: #111;
    background: #f5f5f5;
  }
`

const ModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const WarningText = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #555;
  line-height: 1.5;
  margin: 0;
`

const HighlightBox = styled.div`
  background: #fff8f5;
  border-left: 3px solid #ff751f;
  padding: 0.75rem 0.9rem;
  border-radius: 6px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #666;
  line-height: 1.4;
`

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const CancelBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.6rem 1.1rem;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  color: #444;
  cursor: pointer;
  &:hover {
    background: #e4e4e4;
  }
`

const BlockBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.6rem 1.25rem;
  background: #111;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: #c0392b;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export default function BlockConfirmModal({
  targetUser,
  onClose,
  onBlocked,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleBlock = async () => {
    if (!targetUser?.userId) return

    setLoading(true)
    setError(null)

    try {
      await safetyAPI.blockUser(targetUser.userId)
      if (onBlocked) onBlocked()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to block user.')
      setLoading(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <Title>Block {targetUser?.firstName || 'User'}</Title>
          <CloseBtn onClick={onClose} aria-label="Close modal">✕</CloseBtn>
        </ModalHeader>

        <ModalBody>
          <WarningText>
            Are you sure you want to block <strong>{targetUser?.firstName || 'this user'}</strong>?
          </WarningText>

          <HighlightBox>
            Blocking will instantly end your conversation, hide both of you from future Cinephile Twin matching, and cancel any pending requests.
          </HighlightBox>

          {error && (
            <div style={{ color: '#c0392b', fontSize: '0.8rem', fontFamily: 'Lexend Deca, sans-serif' }}>
              {error}
            </div>
          )}

          <ButtonRow>
            <CancelBtn onClick={onClose} disabled={loading}>
              Cancel
            </CancelBtn>
            <BlockBtn onClick={handleBlock} disabled={loading} id="confirm-block-btn">
              {loading ? 'Blocking...' : 'Block User'}
            </BlockBtn>
          </ButtonRow>
        </ModalBody>
      </ModalCard>
    </Overlay>
  )
}
