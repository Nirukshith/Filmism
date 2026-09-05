import React from 'react';
import styled, { css } from 'styled-components';

const RATING_TIERS = [
  { value: 1, label: 'not for me', symbol: '✕', color: '#e05353', bg: 'rgba(224, 83, 83, 0.12)' },
  { value: 2, label: 'okay', symbol: '—', color: '#888', bg: 'rgba(136, 136, 136, 0.12)' },
  { value: 3, label: 'good', symbol: '★', color: '#ff9800', bg: 'rgba(255, 152, 0, 0.12)' },
  { value: 4, label: 'great', symbol: '♥', color: '#e05353', bg: 'rgba(224, 83, 83, 0.12)' },
];

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`;

const TierRow = styled.div`
  display: ${({ $compact }) => ($compact ? 'grid' : 'flex')};
  ${({ $compact }) =>
    $compact
      ? css`
          grid-template-columns: repeat(4, 1fr);
          width: 100%;
          box-sizing: border-box;
          gap: 2px;
          padding: 3px;
          border-radius: 8px;
        `
      : css`
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          border-radius: 999px;
          width: fit-content;
        `}
  background: ${({ $isDark, $compact }) =>
    $isDark ? 'rgba(0,0,0,0.35)' : $compact ? '#f5f5f5' : 'rgba(255,255,255,0.85)'};
  backdrop-filter: blur(8px);
  border: 1px solid ${({ $isDark }) => ($isDark ? 'rgba(255,255,255,0.08)' : '#e0e0e0')};
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
`;

const TierButton = styled.button`
  background: ${({ $active, $bg }) => ($active ? $bg : 'transparent')};
  border: 1.5px solid ${({ $active, $color }) => ($active ? $color : 'transparent')};
  color: ${({ $active, $color, $isDark }) => ($active ? $color : $isDark ? '#888' : '#666')};
  padding: ${({ $compact }) => ($compact ? '6px 0' : '3px 8px')};
  border-radius: ${({ $compact }) => ($compact ? '6px' : '999px')};
  font-family: 'Lexend Deca', sans-serif;
  font-size: ${({ $compact }) => ($compact ? '0.75rem' : '0.68rem')};
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  user-select: none;
  width: ${({ $compact }) => ($compact ? '100%' : 'auto')};

  &:hover {
    color: ${({ $color }) => $color};
    background: ${({ $bg }) => $bg};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const SymbolSpan = styled.span`
  font-size: ${({ $compact }) => ($compact ? '0.85rem' : '0.75rem')};
  line-height: 1;
`;

const ActiveLabel = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #777;
  text-align: center;
  margin-top: 1px;
  span {
    color: ${({ $color }) => $color || '#111'};
    font-weight: 700;
  }
`;

const HaventWatchedButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ $active }) => ($active ? '#777' : '#aaa')};
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  padding: 2px 4px;
  width: fit-content;
  transition: color 0.2s;

  &:hover {
    color: #444;
  }
`;

export default function RatingControl({
  value = 3,
  onChange,
  isDark = false,
  showHaventWatched = true,
  compact = false,
  className,
}) {
  const currentRating = value;
  const activeTier = RATING_TIERS.find((t) => t.value === currentRating) || RATING_TIERS[2];

  return (
    <Wrapper className={className} onClick={(e) => e.stopPropagation()}>
      <TierRow $isDark={isDark} $compact={compact}>
        {RATING_TIERS.map((tier) => {
          const isActive = currentRating === tier.value;
          return (
            <TierButton
              key={tier.value}
              type="button"
              $compact={compact}
              $active={isActive}
              $color={tier.color}
              $bg={tier.bg}
              $isDark={isDark}
              onClick={() => onChange && onChange(tier.value, tier.label)}
              title={`${tier.label} (${tier.symbol})`}
            >
              <SymbolSpan $compact={compact}>{tier.symbol}</SymbolSpan>
              {!compact && <span>{tier.label}</span>}
            </TierButton>
          );
        })}
      </TierRow>

      {compact && activeTier && (
        <ActiveLabel $color={activeTier.color}>
          <span>{activeTier.symbol} {activeTier.label}</span>
        </ActiveLabel>
      )}

      {showHaventWatched && (
        <HaventWatchedButton
          type="button"
          $active={currentRating === 0}
          onClick={() => onChange && onChange(0, 'haven\'t watched')}
        >
          {currentRating === 0 ? "✓ Marked haven't watched" : "haven't watched yet"}
        </HaventWatchedButton>
      )}
    </Wrapper>
  );
}
