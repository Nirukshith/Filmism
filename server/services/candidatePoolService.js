const tmdb = require('./tmdbService');
const movieProfilingService = require('./movieProfilingService');
const vectorService = require('./vectorService');
const UserTasteProfile = require('../models/userTasteProfileModel');
const MovieProfile = require('../models/movieProfileModel');
const { CINEMA_NAME_TO_COUNTRY_CODE } = require('../utils/originMap');
const { GENRE_NAME_TO_ID, isMovieMatchingSelectedGenres } = require('../utils/genreMap');

const RATING_WEIGHT_DELTAS = {
  4: 0.50,  // great
  3: 0.30,  // good
  2: 0.00,  // okay
  1: -0.40, // not for me
  0: 0.00,  // haven't watched
};

/**
 * Discover candidate films for a specific taste cluster using:
 * 1. TMDB recommendations & similar movies seeded from the cluster's favorites
 * 2. TMDB /discover/movie filtered by cluster genres & user origins
 * 3. Existing MongoDB profiled movies closest to the cluster's centroid embedding
 */
async function fetchCandidatesForCluster(cluster, userProfile, targetCount = 15) {
  const existingIds = new Set([
    ...(userProfile.favorites || []).map((f) => Number(f.tmdbId)),
  ]);

  const candidateIdSet = new Set();
  const sourceFavIds = cluster.sourceFavoriteIds || [];

  // 1. Fetch TMDB recommendations and similar movies for favorites in this cluster
  for (const favId of sourceFavIds.slice(0, 5)) {
    try {
      const [recsRes, simRes] = await Promise.allSettled([
        tmdb.get(`/movie/${favId}/recommendations`, { params: { page: 1 } }),
        tmdb.get(`/movie/${favId}/similar`, { params: { page: 1 } }),
      ]);

      if (recsRes.status === 'fulfilled') {
        (recsRes.value.data?.results || []).forEach((m) => {
          if (!existingIds.has(m.id) && m.poster_path && m.vote_count > 20) {
            candidateIdSet.add(m.id);
          }
        });
      }

      if (simRes.status === 'fulfilled') {
        (simRes.value.data?.results || []).forEach((m) => {
          if (!existingIds.has(m.id) && m.poster_path && m.vote_count > 20) {
            candidateIdSet.add(m.id);
          }
        });
      }
    } catch (e) {
      // Continue if TMDB query fails for a single ID
    }
  }

  // 2. Discover films matching user's selected genres & origins from TMDB
  try {
    const genreIds = (userProfile.selectedGenres || [])
      .map((g) => (typeof g === 'number' ? g : GENRE_NAME_TO_ID[g]))
      .filter(Boolean)
      .join('|');

    const countryCodes = (userProfile.selectedOrigins || [])
      .map((o) => (typeof o === 'string' ? (CINEMA_NAME_TO_COUNTRY_CODE[o] || o) : o))
      .filter(Boolean)
      .join('|');

    for (let p = 1; p <= 3; p++) {
      if (candidateIdSet.size >= targetCount * 2) break;
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          with_genres: genreIds || undefined,
          with_origin_country: countryCodes || undefined,
          sort_by: 'popularity.desc',
          'vote_count.gte': 40,
          page: p,
        },
      });

      (data.results || []).forEach((m) => {
        if (!existingIds.has(m.id) && m.poster_path) {
          candidateIdSet.add(m.id);
        }
      });
    }
  } catch (e) {}

  // 3. Query existing MongoDB profiled movies closest to this cluster's centroid
  if (cluster.centroidEmbedding?.length > 0) {
    try {
      const cachedCandidates = await MovieProfile.find({
        tmdbId: { $nin: Array.from(existingIds) },
        'embedding.0': { $exists: true },
      }).lean();

      if (cachedCandidates.length > 0) {
        const filteredCached = userProfile.selectedGenres?.length > 0
          ? cachedCandidates.filter((m) => isMovieMatchingSelectedGenres(m.genres, userProfile.selectedGenres))
          : cachedCandidates;

        const rankedCached = vectorService.rankByCosineSimilarity(
          cluster.centroidEmbedding,
          filteredCached,
          (m) => m.embedding
        );

        rankedCached.slice(0, 8).forEach((r) => {
          if (r.similarity > 0.35) {
            candidateIdSet.add(r.item.tmdbId);
          }
        });
      }
    } catch (e) {}
  }

  const selectedCandidateIds = Array.from(candidateIdSet).slice(0, targetCount * 2);

  // 4. Batch profile all candidate films with AI (cached if already profiled)
  const profiledCandidates = await movieProfilingService.batchGetOrProfileMovies(selectedCandidateIds);

  // Filter candidates to ensure selected genre adherence
  const genreAdherentCandidates = userProfile.selectedGenres?.length > 0
    ? profiledCandidates.filter((m) => isMovieMatchingSelectedGenres(m.genres, userProfile.selectedGenres))
    : profiledCandidates;

  const finalPool = (genreAdherentCandidates.length >= 4 ? genreAdherentCandidates : profiledCandidates).slice(0, targetCount);

  return finalPool.map((movie) => ({
    tmdbId: movie.tmdbId,
    title: movie.title,
    releaseYear: movie.releaseYear,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    overview: movie.overview,
    director: movie.director,
    genres: movie.genres,
    originCountries: movie.originCountries,
    profile: movie.profile,
    aiSummary: movie.aiSummary,
    embedding: movie.embedding,
    sourceClusterId: cluster.clusterId,
    sourceClusterName: cluster.name,
  }));
}

/**
 * Generate multi-round candidate pool for user feedback (Phase 6).
 */
async function generateCandidatePool(userProfile) {
  const clusters = userProfile.tasteClusters || [];
  if (clusters.length === 0) {
    clusters.push({
      clusterId: 'cluster_1',
      name: 'Your Cinematic Favorites',
      description: 'Films matching your curated favorites.',
      sourceFavoriteIds: (userProfile.favorites || []).map((f) => f.tmdbId),
    });
  }

  const rounds = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const movies = await fetchCandidatesForCluster(cluster, userProfile, 8);

    rounds.push({
      id: i + 1,
      clusterId: cluster.clusterId,
      label: `Based on your ${cluster.name}`,
      reason: cluster.description || 'Curated to explore this cinematic dimension of your taste.',
      movies: movies.map((m) => ({
        id: m.tmdbId,
        tmdbId: m.tmdbId,
        title: m.title,
        year: m.releaseYear,
        genre: m.genres?.[0] || 'Drama',
        genres: m.genres,
        director: m.director,
        cinema: m.originCountries?.[0] ? `${m.originCountries[0]} Cinema` : 'Global',
        posterPath: m.posterPath,
        aiSummary: m.aiSummary,
        c1: '#0d1b2a',
        c2: '#1e4d7b',
      })),
    });
  }

  return rounds;
}

/**
 * Record user feedback on a candidate film and dynamically update taste profile (Phase 8 & 12).
 */
async function recordCandidateRating({ userId, sessionId, tmdbId, rating, sourceClusterId }) {
  const query = userId ? { userId } : { sessionId };
  const profile = await UserTasteProfile.findOne(query).sort({ updatedAt: -1 });

  if (!profile) {
    throw new Error('User taste profile not found.');
  }

  const numericRating = Number(rating);
  const numericId = Number(tmdbId);
  const delta = RATING_WEIGHT_DELTAS[numericRating] || 0;

  // Retrieve candidate movie profile
  const { profile: movieDoc } = await movieProfilingService.getOrProfileMovie(numericId);

  // Find matching cluster to update
  const cluster = profile.tasteClusters.find((c) => c.clusterId === sourceClusterId) || profile.tasteClusters[0];

  if (cluster && delta !== 0 && movieDoc) {
    if (cluster.centroidEmbedding?.length > 0 && movieDoc.embedding?.length > 0) {
      const alpha = delta * 0.15;
      const updatedVector = cluster.centroidEmbedding.map((val, idx) => {
        return val + alpha * (movieDoc.embedding[idx] || 0);
      });
      const norm = Math.sqrt(updatedVector.reduce((sum, v) => sum + v * v, 0)) || 1;
      cluster.centroidEmbedding = updatedVector.map((v) => Number((v / norm).toFixed(6)));
    }

    const movieThemes = movieDoc.profile?.themes || [];
    movieThemes.forEach((t) => {
      const existingTag = cluster.topThemes.find((theme) => theme.tag === t);
      if (existingTag) {
        existingTag.weight = Math.max(0.1, Number((existingTag.weight + delta * 0.1).toFixed(2)));
      } else if (delta > 0) {
        cluster.topThemes.push({ tag: t, weight: 0.5 });
      }
    });

    profile.onboardingStage = 'candidates_rated';
    await profile.save();
  }

  return {
    success: true,
    message: 'Candidate rating recorded and profile updated.',
    tasteProfile: profile,
  };
}

module.exports = {
  fetchCandidatesForCluster,
  generateCandidatePool,
  recordCandidateRating,
  RATING_WEIGHT_DELTAS,
};
