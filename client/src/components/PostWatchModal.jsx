import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1.25rem;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalBox = styled.div`
  background: #ffffff;
  border-radius: 20px;
  max-width: 480px;
  width: 100%;
  padding: 2.2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  background: transparent;
  border: none;
  font-size: 1.3rem;
  color: #888;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  &:hover { color: #111; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PosterThumb = styled.div`
  width: 60px;
  height: 85px;
  border-radius: 6px;
  background: ${({ $posterPath }) =>
    $posterPath
      ? `url(https://image.tmdb.org/t/p/w200${$posterPath}) center / cover no-repeat`
      : '#222'};
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TagBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  color: #ff751f;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Title = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.15rem;
  color: #111;
  margin: 0;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #666;
  margin: 0;
  line-height: 1.4;
`;

const TierGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`;

const TierOption = styled.button`
  background: ${({ $selected, $bg }) => ($selected ? $bg : '#f7f7f7')};
  border: 1.5px solid ${({ $selected, $color }) => ($selected ? $color : '#e5e5e5')};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: ${({ $color }) => $color};
    background: ${({ $bg }) => $bg};
    transform: translateY(-2px);
  }
`;

const TierSymbol = styled.span`
  font-size: 1.3rem;
  color: ${({ $color }) => $color};
`;

const TierLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #222;
  text-transform: lowercase;
`;

const TierDesc = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  color: #888;
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const CancelBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  padding: 0.65rem 1.2rem;
  border: 1.5px solid #ccc;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  &:hover { border-color: #111; color: #111; }
`;

const SubmitBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.65rem 1.4rem;
  border: 2px solid #111;
  background: #111;
  color: #fff;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  &:hover:not(:disabled) { background: transparent; color: #111; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const OUTCOME_TIERS = [
  { value: 4, label: 'great', symbol: '♥', desc: 'Loved it, peak cinema', color: '#e05353', bg: 'rgba(224,83,83,0.1)' },
  { value: 3, label: 'good', symbol: '★', desc: 'Enjoyable, worth the time', color: '#ff9800', bg: 'rgba(255,152,0,0.1)' },
  { value: 2, label: 'okay', symbol: '—', desc: 'Mixed feelings, passable', color: '#757575', bg: 'rgba(117,117,117,0.1)' },
  { value: 1, label: 'not for me', symbol: '✕', desc: 'Did not click at all', color: '#888', bg: 'rgba(136,136,136,0.1)' },
];

export default function PostWatchModal({ movie, onClose, onSubmit }) {
  const [selectedRating, setSelectedRating] = useState(4); // Default to 'great'

  if (!movie) return null;

  const handleSubmit = () => {
    if (onSubmit && selectedRating) {
      onSubmit(movie, selectedRating);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose}>×</CloseBtn>
        <Header>
          <PosterThumb $posterPath={movie.posterPath} />
          <HeaderInfo>
            <TagBadge>Post-Watch Verdict</TagBadge>
            <Title>{movie.title}</Title>
            <Subtitle>How did the recommendation hold up? Your verdict permanently sharpens your taste profile.</Subtitle>
          </HeaderInfo>
        </Header>

        <TierGrid>
          {OUTCOME_TIERS.map((tier) => (
            <TierOption
              key={tier.value}
              $selected={selectedRating === tier.value}
              $color={tier.color}
              $bg={tier.bg}
              onClick={() => setSelectedRating(tier.value)}
            >
              <TierSymbol $color={tier.color}>{tier.symbol}</TierSymbol>
              <TierLabel>{tier.label}</TierLabel>
              <TierDesc>{tier.desc}</TierDesc>
            </TierOption>
          ))}
        </TierGrid>

        <ActionRow>
          <CancelBtn onClick={onClose}>Skip for now</CancelBtn>
          <SubmitBtn onClick={handleSubmit}>Submit Verdict →</SubmitBtn>
        </ActionRow>
      </ModalBox>
    </Overlay>
  );
}
