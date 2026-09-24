import React from 'react'
import styled from 'styled-components'

const CardWrapper = styled.div`
  background: #ffffff;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Eyebrow = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #ff751f;
`

const Title = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111;
  margin: 0;
  line-height: 1.2;
`

const Subtitle = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #777;
  margin: 0;
`

const TotalBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fafafa;
  border: 1px solid #e2e2e2;
  border-radius: 999px;
  padding: 4px 12px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.74rem;
  color: #444;

  span {
    font-weight: 700;
    color: #111;
  }
`

const DistributionTrack = styled.div`
  width: 100%;
  height: 10px;
  background: #f0f0f0;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  margin-bottom: 1rem;
  border: 1px solid #e5e5e5;
`

const DistributionSegment = styled.div`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: ${({ $width }) => ($width > 0 ? '4px' : '0')};
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const MetricItem = styled.div`
  background: #fafafa;
  border: 1.5px solid ${({ $color }) => `${$color}2a`};
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $color }) => $color};
    box-shadow: 0 4px 14px ${({ $color }) => `${$color}18`};
    background: #fff;
  }
`

const MetricTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const TierBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  text-transform: lowercase;
`

const SymbolCircle = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  font-size: 0.7rem;
  line-height: 1;
`

const PctTag = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  color: #888;
`

const MetricValueRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const CountNumber = styled.span`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #111;
  line-height: 1;
`

const CountLabel = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  color: #888;
`

const MiniProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #ebebeb;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 2px;
`

const MiniProgressFill = styled.div`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 999px;
  transition: width 0.4s ease;
`

const TIERS = [
  {
    key: 'notForMe',
    ratingValue: 1,
    label: 'not for me',
    symbol: '✕',
    color: '#e05353',
    bg: 'rgba(224, 83, 83, 0.12)',
  },
  {
    key: 'okay',
    ratingValue: 2,
    label: 'okay',
    symbol: '—',
    color: '#718096',
    bg: 'rgba(113, 128, 150, 0.12)',
  },
  {
    key: 'good',
    ratingValue: 3,
    label: 'good',
    symbol: '★',
    color: '#ff9800',
    bg: 'rgba(255, 152, 0, 0.12)',
  },
  {
    key: 'great',
    ratingValue: 4,
    label: 'great',
    symbol: '✦',
    color: '#2e7d32',
    bg: 'rgba(46, 125, 50, 0.12)',
  },
]

export default function ReviewGraph({ ratings = {}, className }) {
  // ratings can be:
  // 1) An object { [tmdbId]: ratingNumber (1-4) }
  // 2) An array of ratings / objects with .rating or .outcomeRating
  // 3) Pre-aggregated counts { notForMe: X, okay: Y, good: Z, great: W }

  let counts = { notForMe: 0, okay: 0, good: 0, great: 0 }

  if (ratings && typeof ratings === 'object') {
    if (
      typeof ratings.notForMe === 'number' ||
      typeof ratings.okay === 'number' ||
      typeof ratings.good === 'number' ||
      typeof ratings.great === 'number'
    ) {
      counts = {
        notForMe: ratings.notForMe || 0,
        okay: ratings.okay || 0,
        good: ratings.good || 0,
        great: ratings.great || 0,
      }
    } else if (Array.isArray(ratings)) {
      ratings.forEach((item) => {
        const val = typeof item === 'number' ? item : Number(item.outcomeRating || item.rating || 0)
        if (val === 1) counts.notForMe++
        else if (val === 2) counts.okay++
        else if (val === 3) counts.good++
        else if (val === 4) counts.great++
      })
    } else {
      // Map of { [id]: ratingValue }
      Object.values(ratings).forEach((val) => {
        const num = Number(val)
        if (num === 1) counts.notForMe++
        else if (num === 2) counts.okay++
        else if (num === 3) counts.good++
        else if (num === 4) counts.great++
      })
    }
  }

  const totalReviews = counts.notForMe + counts.okay + counts.good + counts.great

  const getPct = (count) => {
    if (totalReviews === 0) return 0
    return Math.round((count / totalReviews) * 100)
  }

  return (
    <CardWrapper className={className} id="review-graph-card">
      <HeaderRow>
        <HeaderLeft>
          <Eyebrow>Review Analytics</Eyebrow>
          <Title>Review Distribution Graph</Title>
          <Subtitle>
            Aggregated breakdown of your post-watch verdicts and film ratings
          </Subtitle>
        </HeaderLeft>
        <TotalBadge>
          <span>{totalReviews}</span> {totalReviews === 1 ? 'film evaluated' : 'films evaluated'}
        </TotalBadge>
      </HeaderRow>

      {/* Multi-segment distribution gauge bar */}
      <DistributionTrack title={`${totalReviews} total reviews`}>
        {TIERS.map((tier) => {
          const count = counts[tier.key] || 0
          const pct = getPct(count)
          return (
            <DistributionSegment
              key={tier.key}
              $width={pct}
              $color={tier.color}
              title={`${tier.label}: ${count} (${pct}%)`}
            />
          )
        })}
      </DistributionTrack>

      {/* 4-tier interactive stats grid */}
      <MetricsGrid>
        {TIERS.map((tier) => {
          const count = counts[tier.key] || 0
          const pct = getPct(count)

          return (
            <MetricItem key={tier.key} $color={tier.color} id={`review-tier-${tier.key}`}>
              <MetricTop>
                <TierBadge $color={tier.color}>
                  <SymbolCircle $bg={tier.bg}>{tier.symbol}</SymbolCircle>
                  {tier.label}
                </TierBadge>
                <PctTag>{pct}%</PctTag>
              </MetricTop>

              <MetricValueRow>
                <CountNumber>{count}</CountNumber>
                <CountLabel>{count === 1 ? 'review' : 'reviews'}</CountLabel>
              </MetricValueRow>

              <MiniProgressBar>
                <MiniProgressFill $width={pct} $color={tier.color} />
              </MiniProgressBar>
            </MetricItem>
          )
        })}
      </MetricsGrid>
    </CardWrapper>
  )
}
