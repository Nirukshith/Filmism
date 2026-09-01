const movieProfilingService = require('./movieProfilingService');
const vectorService = require('./vectorService');
const UserTasteProfile = require('../models/userTasteProfileModel');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();

let geminiClient = null;
let openaiClient = null;

if (GEMINI_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (err) {
    console.warn('Gemini client init warning:', err.message);
  }
}
if (OPENAI_KEY) {
  try {
    openaiClient = new OpenAI({ apiKey: OPENAI_KEY });
  } catch (err) {
    console.warn('OpenAI client init warning:', err.message);
  }
}

const RATING_MULTIPLIERS = {
  4: 1.4, // great
  3: 1.0, // good
  2: 0.6, // okay
  1: 0.2, // not for me
  0: 0.8, // haven't watched / default
};

/**
 * Derive accurate cluster title & description using frequency analysis across member films.
 */
function deriveClusterName(films) {
  if (!films || films.length === 0) {
    return {
      name: 'Cinematic Taste Persona',
      description: 'A distinct selection of cinematic favorites.',
    };
  }

  const genreCounts = {};
  const themeCounts = {};
  const moodCounts = {};

  films.forEach((f) => {
    (f.genres || []).forEach((g) => {
      const name = typeof g === 'string' ? g : g.name;
      if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
    });
    (f.profile?.themes || []).forEach((t) => {
      if (t) themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
    (f.profile?.mood || []).forEach((m) => {
      if (m) moodCounts[m] = (moodCounts[m] || 0) + 1;
    });
  });

  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
  const sortedThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]);

  // Derive dominant genre label based on shared consensus
  let genreLabel = 'Cinema';
  if (sortedGenres.length >= 2 && sortedGenres[1][1] >= Math.ceil(films.length * 0.35)) {
    genreLabel = `${sortedGenres[0][0]} & ${sortedGenres[1][0]}`;
  } else if (sortedGenres.length > 0) {
    genreLabel = sortedGenres[0][0];
  }

  const topMood = sortedMoods[0]?.[0] || 'Atmospheric';
  const topTheme = sortedThemes[0]?.[0] || 'Narrative';

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  return {
    name: `${cap(topMood)} & ${cap(topTheme)} ${genreLabel}`,
    description: `Centred around ${topMood} atmospheres with ${topTheme} storytelling and ${genreLabel} sensibilities.`,
  };
}

/**
 * Enhanced heuristic clustering algorithm using K-Means++ seed selection.
 * Dynamically produces 1 to 4 cohesive clusters based on semantic vector distance.
 */
function heuristicClusterFilms(profiledFilms) {
  if (!profiledFilms || profiledFilms.length === 0) return [];

  if (profiledFilms.length <= 3) {
    const singleName = deriveClusterName(profiledFilms);
    return [
      {
        clusterId: 'cluster_1',
        name: singleName.name,
        description: singleName.description,
        movieIds: profiledFilms.map((f) => f.tmdbId),
      },
    ];
  }

  // Determine ideal number of clusters K based on film count & vector spread
  let k = 2;
  if (profiledFilms.length >= 7) {
    k = Math.min(4, Math.floor(profiledFilms.length / 2));
  } else if (profiledFilms.length >= 5) {
    let maxDist = 0;
    for (let i = 0; i < profiledFilms.length; i++) {
      for (let j = i + 1; j < profiledFilms.length; j++) {
        const sim = vectorService.cosineSimilarity(profiledFilms[i].embedding, profiledFilms[j].embedding);
        if (1 - sim > maxDist) maxDist = 1 - sim;
      }
    }
    if (maxDist >= 0.45 && profiledFilms.length >= 6) {
      k = 3;
    }
  }

  // K-Means++ Seed Initialization
  const seedIndices = [0];

  while (seedIndices.length < k) {
    let bestNextIdx = -1;
    let maxMinDist = -1;

    for (let i = 0; i < profiledFilms.length; i++) {
      if (seedIndices.includes(i)) continue;
      let minDistToSeed = Infinity;
      for (const sIdx of seedIndices) {
        const sim = vectorService.cosineSimilarity(profiledFilms[i].embedding, profiledFilms[sIdx].embedding);
        const dist = 1 - sim;
        if (dist < minDistToSeed) minDistToSeed = dist;
      }
      if (minDistToSeed > maxMinDist) {
        maxMinDist = minDistToSeed;
        bestNextIdx = i;
      }
    }

    if (bestNextIdx !== -1) {
      seedIndices.push(bestNextIdx);
    } else {
      break;
    }
  }

  // Assign films to closest seed
  const clusterAssignments = Array.from({ length: seedIndices.length }, () => []);

  for (let i = 0; i < profiledFilms.length; i++) {
    let bestSeed = 0;
    let bestSim = -Infinity;

    seedIndices.forEach((sIdx, cIdx) => {
      const sim = vectorService.cosineSimilarity(profiledFilms[i].embedding, profiledFilms[sIdx].embedding);
      if (sim > bestSim) {
        bestSim = sim;
        bestSeed = cIdx;
      }
    });

    clusterAssignments[bestSeed].push(profiledFilms[i]);
  }

  // Format non-empty clusters
  const clusters = [];
  let clusterCount = 1;

  clusterAssignments.forEach((filmsInCluster) => {
    if (filmsInCluster.length === 0) return;
    const nameInfo = deriveClusterName(filmsInCluster);
    clusters.push({
      clusterId: `cluster_${clusterCount++}`,
      name: nameInfo.name,
      description: nameInfo.description,
      movieIds: filmsInCluster.map((f) => f.tmdbId),
    });
  });

  return clusters;
}

/**
 * Cluster films using AI (Gemini or OpenAI) with heuristic fallback.
 */
async function clusterFilmsWithAI(profiledFilms) {
  const filmSummaries = profiledFilms.map((f) => ({
    id: f.tmdbId,
    title: f.title,
    genres: f.genres,
    themes: f.profile?.themes || [],
    mood: f.profile?.mood || [],
    narrativeStyle: f.profile?.narrativeStyle || [],
    visualAesthetic: f.profile?.visualAesthetic || [],
  }));

  const prompt = `You are an expert cinematic taste profiler.
Below is a user's collection of favorite films with their extracted themes, moods, and styles.

Your task:
Analyze these films and group them into 2 to 4 distinct "Cinematic Taste Personas / Clusters".
Do NOT lump disparate films into one generic category. Preserve aesthetic distinctions (e.g., separate dark psychological slow-burns from witty character dramedies).
Every film ID must be assigned to exactly one cluster.

User Films:
${JSON.stringify(filmSummaries, null, 2)}

Respond ONLY with a valid JSON object strictly matching this schema (no markdown, no other text):
{
  "clusters": [
    {
      "clusterId": "cluster_1",
      "name": "Distinctive descriptive title (e.g., Atmospheric Neo-Noir & Psychological Tension)",
      "description": "1-2 sentences capturing why these films form a cohesive cinematic aesthetic.",
      "movieIds": [105, 807]
    }
  ],
  "overallTasteSynthesis": "1-2 sentences synthesizing the overall spectrum of the user's cinema taste."
}`;

  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text().trim());
      if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
        return parsed;
      }
    } catch (err) {
      // Fallback silently
    }
  }

  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert film analyst providing structured taste clustering.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      const parsed = JSON.parse(completion.choices[0].message.content.trim());
      if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('OpenAI clustering failed:', err.message);
    }
  }

  // Fallback
  const fallbackClusters = heuristicClusterFilms(profiledFilms);
  return {
    clusters: fallbackClusters,
    overallTasteSynthesis: 'A diverse cinematic taste spanning multiple aesthetic traditions and storytelling styles.',
  };
}

/**
 * Build rich multi-cluster taste profile from user favorites and ratings.
 */
async function buildTasteProfileFromFavorites({
  userId,
  sessionId,
  genres = [],
  origins = [],
  favorites = [], // Array of { tmdbId, rating } or array of numbers
}) {
  if (!Array.isArray(favorites) || favorites.length === 0) {
    throw new Error('At least one favorite film is required to build a taste profile.');
  }

  // Standardize favorites format
  const normalizedFavorites = favorites.map((f) => {
    if (typeof f === 'number' || typeof f === 'string') {
      return { tmdbId: Number(f), rating: 3, ratingLabel: 'good' };
    }
    const r = f.rating !== undefined ? Number(f.rating) : 3;
    const labels = { 1: 'not for me', 2: 'okay', 3: 'good', 4: 'great', 0: 'haven\'t watched' };
    return {
      tmdbId: Number(f.tmdbId || f.id),
      rating: r,
      ratingLabel: labels[r] || 'good',
    };
  });

  const tmdbIds = normalizedFavorites.map((f) => f.tmdbId);

  // 1. Batch profile all favorite films (ensures AI metadata + vector embeddings exist)
  const profiledFilms = await movieProfilingService.batchGetOrProfileMovies(tmdbIds);

  const filmMap = new Map();
  profiledFilms.forEach((f) => filmMap.set(f.tmdbId, f));

  // Attach metadata to favorites
  const enrichedFavorites = normalizedFavorites
    .map((fav) => {
      const doc = filmMap.get(fav.tmdbId);
      if (!doc) return null;
      return {
        ...fav,
        title: doc.title,
        year: doc.releaseYear,
        posterPath: doc.posterPath,
      };
    })
    .filter(Boolean);

  // 2. Discover semantic taste clusters
  const validProfiledDocs = enrichedFavorites
    .map((fav) => filmMap.get(fav.tmdbId))
    .filter((doc) => doc && doc.embedding && doc.embedding.length > 0);

  const { clusters: rawClusters, overallTasteSynthesis } = await clusterFilmsWithAI(validProfiledDocs);

  // 3. Compute cluster centroids, tag distributions, and weights
  let totalClusterScore = 0;
  const processedClusters = rawClusters.map((c) => {
    const clusterFilms = c.movieIds
      .map((id) => filmMap.get(id))
      .filter((doc) => doc && doc.embedding && doc.embedding.length > 0);

    const vectors = clusterFilms.map((f) => f.embedding);
    const centroidEmbedding = vectorService.calculateCentroid(vectors);

    // Aggregate tags with rating weight multipliers
    const themeScores = {};
    const moodScores = {};
    const visualScores = {};
    let clusterRatingSum = 0;

    clusterFilms.forEach((film) => {
      const userRating = enrichedFavorites.find((fav) => fav.tmdbId === film.tmdbId)?.rating ?? 3;
      const mult = RATING_MULTIPLIERS[userRating] || 1.0;
      clusterRatingSum += mult;

      (film.profile?.themes || []).forEach((t) => {
        themeScores[t] = (themeScores[t] || 0) + mult;
      });
      (film.profile?.mood || []).forEach((m) => {
        moodScores[m] = (moodScores[m] || 0) + mult;
      });
      (film.profile?.visualAesthetic || []).forEach((v) => {
        visualScores[v] = (visualScores[v] || 0) + mult;
      });
    });

    totalClusterScore += clusterRatingSum;

    const toSortedArray = (scores) =>
      Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, score]) => ({
          tag,
          weight: Number((score / (clusterRatingSum || 1)).toFixed(2)),
        }));

    const sourceFavs = c.movieIds
      .map((id) => {
        const film = filmMap.get(id);
        if (!film) return null;
        return {
          tmdbId: film.tmdbId,
          title: film.title,
          year: film.releaseYear,
          posterPath: film.posterPath,
        };
      })
      .filter(Boolean);

    return {
      clusterId: c.clusterId || `cluster_${Date.now()}`,
      name: c.name,
      description: c.description,
      rawRatingSum: clusterRatingSum,
      centroidEmbedding,
      topThemes: toSortedArray(themeScores),
      topMoods: toSortedArray(moodScores),
      topVisuals: toSortedArray(visualScores),
      sourceFavoriteIds: c.movieIds,
      sourceFavorites: sourceFavs,
    };
  });

  // Normalize cluster weights (sum to 1.0)
  const finalClusters = processedClusters.map((c) => ({
    ...c,
    weight: totalClusterScore > 0 ? Number((c.rawRatingSum / totalClusterScore).toFixed(2)) : 1.0 / processedClusters.length,
  }));

  // Global centroid across all favorites
  const globalCentroid = vectorService.calculateCentroid(validProfiledDocs.map((d) => d.embedding));

  // 4. Upsert UserTasteProfile in MongoDB
  const query = userId ? { userId } : { sessionId };
  const updateData = {
    ...(userId && { userId }),
    ...(sessionId && { sessionId }),
    selectedGenres: genres,
    selectedOrigins: origins,
    favorites: enrichedFavorites,
    tasteClusters: finalClusters,
    globalCentroid,
    onboardingStage: 'favorites_selected',
    aiSynthesis: overallTasteSynthesis,
  };

  let savedProfile;
  if (userId || sessionId) {
    savedProfile = await UserTasteProfile.findOneAndUpdate(query, updateData, {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    });
  } else {
    savedProfile = updateData;
  }

  return {
    success: true,
    tasteProfile: savedProfile,
    clusters: finalClusters,
    aiSynthesis: overallTasteSynthesis,
  };
}

module.exports = {
  buildTasteProfileFromFavorites,
  clusterFilmsWithAI,
  RATING_MULTIPLIERS,
};
