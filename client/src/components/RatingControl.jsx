import React from 'react';
import styled, { css } from 'styled-components';

const RATING_TIERS = [
  { value: 1, label: 'not for me', symbol: '✕', color: '#e05353', bg: 'rgba(224, 83, 83, 0.12)' },
  { value: 2, label: 'okay', symbol: '∼', color: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.12)' },
  { value: 3, label: 'good', symbol: '★', color: '#ff9800', bg: 'rgba(255, 152, 0, 0.12)' },
  { value: 4, label: 'great', symbol: '✦', color: '#2e7d32', bg: 'rgba(46, 125, 50, 0.15)' },
];

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

const TierRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ $isDark }) => ($isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.85)')};
  backdrop-filter: blur(8px);
  padding: 4px 6px;
  border-radius: 999px;
  border: 1px solid ${({ $isDark }) => ($isDark ? 'rgba(255,255,255,0.08)' : '#e0e0e0')};
  width: fit-content;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
`;

const TierButton = styled.button`
  background: ${({ $active, $color, $bg }) => ($active ? $bg : 'transparent')};
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'transparent')};
  color: ${({ $active, $color, $isDark }) => ($active ? $color : $isDark ? '#888' : '#777')};
  padding: 3px 8px;
  border-radius: 999px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  user-select: none;

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
  font-size: 0.75rem;
  line-height: 1;
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
  className,
}) {
  const currentRating = value;

  return (
    <Wrapper className={className} onClick={(e) => e.stopPropagation()}>
      <TierRow $isDark={isDark}>
        {RATING_TIERS.map((tier) => {
          const isActive = currentRating === tier.value;
          return (
            <TierButton
              key={tier.value}
              type="button"
              $active={isActive}
              $color={tier.color}
              $bg={tier.bg}
              $isDark={isDark}
              onClick={() => onChange && onChange(tier.value, tier.label)}
              title={`Rate as ${tier.label}`}
            >
              <SymbolSpan>{tier.symbol}</SymbolSpan>
              <span>{tier.label}</span>
            </TierButton>
          );
        })}
      </TierRow>

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
