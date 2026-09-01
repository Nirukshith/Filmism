import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  animation: fadeIn 0.4s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const HeaderBox = styled.div`
  text-align: center;
  max-width: 680px;
  margin: 0 auto;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: #ff751f;
  color: #fff;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
`;

const Title = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  color: #111;
  margin: 0 0 0.5rem;
`;

const Subtitle = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.92rem;
  color: #666;
  line-height: 1.6;
  margin: 0;
`;

const SynthesisCard = styled.div`
  background: #111;
  color: #fff;
  border-radius: 16px;
  padding: 1.5rem 2rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.95rem;
  line-height: 1.6;
  border-left: 4px solid #ff751f;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);

  span {
    color: #ff751f;
    font-weight: 700;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const ClusterCard = styled.div`
  background: #ffffff;
  border: 1.5px solid #e5e5e5;
  border-radius: 20px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);

  &:hover {
    transform: translateY(-3px);
    border-color: #ff751f;
    box-shadow: 0 12px 28px rgba(255, 117, 31, 0.12);
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const ClusterName = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1.25rem;
  color: #111;
  margin: 0;
  line-height: 1.3;
`;

const WeightPill = styled.div`
  background: rgba(255, 117, 31, 0.12);
  color: #ff751f;
  border: 1px solid rgba(255, 117, 31, 0.3);
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
`;

const ClusterDesc = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.85rem;
  color: #555;
  line-height: 1.5;
  margin: 0;
`;

const SectionLabel = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  margin-bottom: 6px;
`;

const TagGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ThemeChip = styled.span`
  background: #f4f4f4;
  color: #222;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
`;

const MoodChip = styled(ThemeChip)`
  background: rgba(0, 0, 0, 0.04);
  color: #444;
  font-style: italic;
`;

const FilmRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid #eee;
`;

const FilmBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.7rem;
  color: #333;
  background: #f8f8f8;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
`;

export default function TasteClustersView({ clusters = [], aiSynthesis = '', favorites = [] }) {
  const filmMap = new Map();
  favorites.forEach((f) => {
    if (f.id && f.title && !String(f.title).startsWith('Film #')) filmMap.set(Number(f.id), f);
    if (f.tmdbId && f.title && !String(f.title).startsWith('Film #')) filmMap.set(Number(f.tmdbId), f);
  });

  return (
    <Container>
      <HeaderBox>
        <Badge>Taste Profile Generated</Badge>
        <Title>Your Cinematic Personas</Title>
        <Subtitle>
          We clustered your favorite cinema into distinct aesthetic dimensions rather than averaging them together.
        </Subtitle>
      </HeaderBox>

      {aiSynthesis && (
        <SynthesisCard>
          <span>Aesthetic Synthesis: </span>
          {aiSynthesis}
        </SynthesisCard>
      )}

      <Grid>
        {clusters.map((cluster, idx) => {
          const contributingFilms = (cluster.sourceFavorites && cluster.sourceFavorites.length > 0)
            ? cluster.sourceFavorites
            : (cluster.sourceFavoriteIds || [])
                .map((id) => filmMap.get(Number(id)))
                .filter((f) => f && f.title && !String(f.title).startsWith('Film #'));

          const weightPercent = Math.round((cluster.weight || 0.5) * 100);

          return (
            <ClusterCard key={cluster.clusterId || idx}>
              <div>
                <CardTop>
                  <ClusterName>{cluster.name}</ClusterName>
                  <WeightPill>{weightPercent}% share</WeightPill>
                </CardTop>
                <ClusterDesc style={{ marginTop: '0.75rem' }}>
                  {cluster.description}
                </ClusterDesc>
              </div>

              {cluster.topThemes?.length > 0 && (
                <div>
                  <SectionLabel>Dominant Themes</SectionLabel>
                  <TagGroup>
                    {cluster.topThemes.map((t, i) => (
                      <ThemeChip key={i}>{t.tag}</ThemeChip>
                    ))}
                  </TagGroup>
                </div>
              )}

              {cluster.topMoods?.length > 0 && (
                <div>
                  <SectionLabel>Atmosphere & Mood</SectionLabel>
                  <TagGroup>
                    {cluster.topMoods.map((m, i) => (
                      <MoodChip key={i}>{m.tag}</MoodChip>
                    ))}
                  </TagGroup>
                </div>
              )}

              {contributingFilms.length > 0 && (
                <div>
                  <SectionLabel>Contributing Favorites</SectionLabel>
                  <FilmRow>
                    {contributingFilms.slice(0, 4).map((film) => (
                      <FilmBadge key={film.tmdbId || film.id}>{film.title}</FilmBadge>
                    ))}
                    {contributingFilms.length > 4 && (
                      <FilmBadge>+{contributingFilms.length - 4} more</FilmBadge>
                    )}
                  </FilmRow>
                </div>
              )}
            </ClusterCard>
          );
        })}
      </Grid>
    </Container>
  );
}
