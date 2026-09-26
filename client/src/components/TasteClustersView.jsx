import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
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
  padding-bottom: 0.2rem;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: #ff751f;
  color: #fff;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
`;

const Title = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.35rem, 2.5vw, 1.8rem);
  color: #111;
  margin: 0 0 0.35rem;
`;

const Subtitle = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #666;
  line-height: 1.45;
  margin: 0;
`;

const SynthesisCard = styled.div`
  background: #111;
  color: #fff;
  border-radius: 12px;
  padding: 0.9rem 1.25rem;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  line-height: 1.45;
  border-left: 3.5px solid #ff751f;
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);

  span {
    color: #ff751f;
    font-weight: 700;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
  gap: 0.85rem;
  align-items: start;
`;

const ClusterCard = styled.div`
  background: #ffffff;
  border: 1.5px solid #e5e5e5;
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.65rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);

  &:hover {
    transform: translateY(-2px);
    border-color: #ff751f;
    box-shadow: 0 8px 20px rgba(255, 117, 31, 0.1);
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
`;

const ClusterName = styled.h3`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: 1rem;
  color: #111;
  margin: 0;
  line-height: 1.25;
`;

const WeightPill = styled.div`
  background: rgba(255, 117, 31, 0.12);
  color: #ff751f;
  border: 1px solid rgba(255, 117, 31, 0.3);
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
`;

const ClusterDesc = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.76rem;
  color: #555;
  line-height: 1.4;
  margin: 0;
`;

const SectionLabel = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  margin-bottom: 4px;
`;

const TagGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const ThemeChip = styled.span`
  background: #f4f4f4;
  color: #222;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.66rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
`;

const MoodChip = styled(ThemeChip)`
  background: rgba(0, 0, 0, 0.04);
  color: #444;
  font-style: italic;
`;

const MoreChip = styled.button`
  background: transparent;
  color: #ff751f;
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(255, 117, 31, 0.35);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 117, 31, 0.08);
  }
`;

const FilmRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
`;

const FilmBadge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.65rem;
  color: #333;
  background: #f8f8f8;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ddd;
  white-space: nowrap;
`;

const THEME_LIMIT = 4;
const MOOD_LIMIT  = 3;
const FILM_LIMIT  = 5;

export default function TasteClustersView({ clusters = [], aiSynthesis = '', favorites = [] }) {
  const filmMap = new Map();
  favorites.forEach((f) => {
    if (f.id    && f.title && !String(f.title).startsWith('Film #')) filmMap.set(Number(f.id), f);
    if (f.tmdbId && f.title && !String(f.title).startsWith('Film #')) filmMap.set(Number(f.tmdbId), f);
  });

  // Track expanded state per card per section: { `${idx}-themes`: bool, `${idx}-moods`: bool, `${idx}-films`: bool }
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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

          const themesExpanded = expanded[`${idx}-themes`];
          const moodsExpanded  = expanded[`${idx}-moods`];
          const filmsExpanded  = expanded[`${idx}-films`];

          const themes = cluster.topThemes || [];
          const moods  = cluster.topMoods  || [];

          const visibleThemes = themesExpanded ? themes : themes.slice(0, THEME_LIMIT);
          const hiddenThemes  = themes.length - THEME_LIMIT;

          const visibleMoods  = moodsExpanded  ? moods  : moods.slice(0, MOOD_LIMIT);
          const hiddenMoods   = moods.length - MOOD_LIMIT;

          const visibleFilms  = filmsExpanded  ? contributingFilms : contributingFilms.slice(0, FILM_LIMIT);
          const hiddenFilms   = contributingFilms.length - FILM_LIMIT;

          return (
            <ClusterCard key={cluster.clusterId || idx}>
              <div>
                <CardTop>
                  <ClusterName>{cluster.name}</ClusterName>
                  <WeightPill>{weightPercent}% share</WeightPill>
                </CardTop>
                <ClusterDesc>{cluster.description}</ClusterDesc>
              </div>

              {themes.length > 0 && (
                <div>
                  <SectionLabel>Dominant Themes</SectionLabel>
                  <TagGroup>
                    {visibleThemes.map((t, i) => (
                      <ThemeChip key={i}>{t.tag}</ThemeChip>
                    ))}
                    {!themesExpanded && hiddenThemes > 0 && (
                      <MoreChip onClick={() => toggle(`${idx}-themes`)}>+{hiddenThemes} more</MoreChip>
                    )}
                    {themesExpanded && themes.length > THEME_LIMIT && (
                      <MoreChip onClick={() => toggle(`${idx}-themes`)}>show less</MoreChip>
                    )}
                  </TagGroup>
                </div>
              )}

              {moods.length > 0 && (
                <div>
                  <SectionLabel>Atmosphere &amp; Mood</SectionLabel>
                  <TagGroup>
                    {visibleMoods.map((m, i) => (
                      <MoodChip key={i}>{m.tag}</MoodChip>
                    ))}
                    {!moodsExpanded && hiddenMoods > 0 && (
                      <MoreChip onClick={() => toggle(`${idx}-moods`)}>+{hiddenMoods} more</MoreChip>
                    )}
                    {moodsExpanded && moods.length > MOOD_LIMIT && (
                      <MoreChip onClick={() => toggle(`${idx}-moods`)}>show less</MoreChip>
                    )}
                  </TagGroup>
                </div>
              )}

              {contributingFilms.length > 0 && (
                <div>
                  <SectionLabel>Contributing Favorites</SectionLabel>
                  <FilmRow>
                    {visibleFilms.map((film, fIdx) => (
                      <FilmBadge key={film.tmdbId || film.id || fIdx}>{film.title}</FilmBadge>
                    ))}
                    {!filmsExpanded && hiddenFilms > 0 && (
                      <MoreChip onClick={() => toggle(`${idx}-films`)}>+{hiddenFilms} more</MoreChip>
                    )}
                    {filmsExpanded && contributingFilms.length > FILM_LIMIT && (
                      <MoreChip onClick={() => toggle(`${idx}-films`)}>show less</MoreChip>
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
