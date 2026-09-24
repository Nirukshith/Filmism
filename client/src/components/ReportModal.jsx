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
  max-width: 480px;
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
  color: #c0392b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const ModalBody = styled.form`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const Label = styled.label`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: #222;
`

const Select = styled.select`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  color: #111;
  outline: none;
  &:focus {
    border-color: #ff751f;
    background: #fff;
  }
`

const Textarea = styled.textarea`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  color: #111;
  min-height: 90px;
  resize: vertical;
  outline: none;
  &:focus {
    border-color: #ff751f;
    background: #fff;
  }
`

const Notice = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #777;
  line-height: 1.4;
  margin: 0;
  background: #fdf5f5;
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  border-left: 3px solid #c0392b;
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

const SubmitBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.6rem 1.25rem;
  background: #c0392b;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: #a93226;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const REASONS = [
  { value: 'harassment', label: 'Harassment / Abusive behavior' },
  { value: 'inappropriate_content', label: 'Inappropriate / Explicit content' },
  { value: 'spam', label: 'Spam or unsolicited advertising' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'other', label: 'Other violation' },
]

export default function ReportModal({
  targetUser,
  conversationId = null,
  onClose,
  onReportSubmitted,
}) {
  const [reason, setReason] = useState('harassment')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!targetUser?.userId) return

    setLoading(true)
    setError(null)

    try {
      await safetyAPI.reportUser(targetUser.userId, {
        conversationId,
        reason,
        details: details.trim() || undefined,
      })
      if (onReportSubmitted) onReportSubmitted()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <Title>Report User</Title>
          <CloseBtn onClick={onClose} aria-label="Close modal">✕</CloseBtn>
        </ModalHeader>

        <ModalBody onSubmit={handleSubmit}>
          <Notice>
            Reporting <strong>{targetUser?.firstName || 'this user'}</strong> will securely snapshot recent conversation context for moderator review.
          </Notice>

          {error && (
            <div style={{ color: '#c0392b', fontSize: '0.8rem', fontFamily: 'Lexend Deca, sans-serif' }}>
              {error}
            </div>
          )}

          <FieldGroup>
            <Label htmlFor="report-reason">Reason for Report</Label>
            <Select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="report-details">Additional Details (optional)</Label>
            <Textarea
              id="report-details"
              placeholder="Provide any additional context for the moderation team..."
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
            />
          </FieldGroup>

          <ButtonRow>
            <CancelBtn type="button" onClick={onClose} disabled={loading}>
              Cancel
            </CancelBtn>
            <SubmitBtn type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </SubmitBtn>
          </ButtonRow>
        </ModalBody>
      </ModalCard>
    </Overlay>
  )
}
