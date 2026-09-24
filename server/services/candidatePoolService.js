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

// Active background replenishment jobs tracker to avoid duplicate calls
const activeReplenishmentJobs = new Set();

/**
 * Background worker to discover fresh TMDB movies and profile them into MongoDB
 * completely non-blocking without keeping the client waiting.
 */
async function replenishCandidatePoolBackground(cluster, userProfile) {
  const clusterKey = cluster.clusterId || cluster.name;
  if (activeReplenishmentJobs.has(clusterKey)) return;
  activeReplenishmentJobs.add(clusterKey);

  // Run asynchronously without blocking the event loop
  setImmediate(async () => {
    try {
      const sourceFavIds = (cluster.sourceFavoriteIds || []).slice(0, 2);
      const genreIds = (userProfile.selectedGenres || [])
        .map((g) => (typeof g === 'number' ? g : GENRE_NAME_TO_ID[g]))
        .filter(Boolean)
        .join('|');

      const countryCodes = (userProfile.selectedOrigins || [])
        .map((o) => (typeof o === 'string' ? (CINEMA_NAME_TO_COUNTRY_CODE[o] || o) : o))
        .filter(Boolean)
        .join('|');

      const tmdbCalls = [];
      if (sourceFavIds[0]) {
        tmdbCalls.push(tmdb.get(`/movie/${sourceFavIds[0]}/recommendations`, { params: { page: 1 } }));
      }
      tmdbCalls.push(
        tmdb.get('/discover/movie', {
          params: {
            with_genres: genreIds || undefined,
            with_origin_country: countryCodes || undefined,
            sort_by: 'popularity.desc',
            'vote_count.gte': 40,
            page: Math.floor(Math.random() * 3) + 1,
          },
        })
      );

      const results = await Promise.allSettled(tmdbCalls);
      const candidateTmdbIds = new Set();

      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.data?.results) {
          res.value.data.results.forEach((m) => {
            if (m.id && m.poster_path && (m.vote_count || 0) > 20) {
              candidateTmdbIds.add(m.id);
            }
          });
        }
      });

      if (candidateTmdbIds.size > 0) {
        // Find which ones are not yet in MovieProfile
        const existingDocs = await MovieProfile.find({
          tmdbId: { $in: Array.from(candidateTmdbIds) },
        }).select('tmdbId').lean();

        const existingIdSet = new Set(existingDocs.map((d) => d.tmdbId));
        const missingIds = Array.from(candidateTmdbIds).filter((id) => !existingIdSet.has(id));

        // Profile up to 3 missing movies quietly in the background
        const toProfile = missingIds.slice(0, 3);
        for (const mId of toProfile) {
          try {
            await movieProfilingService.getOrProfileMovie(mId, false, true);
          } catch (e) {
            // silent ignore in background
          }
        }
      }
    } catch (err) {
      // silent background failure
    } finally {
      activeReplenishmentJobs.delete(clusterKey);
    }
  });
}

/**
 * Discover candidate films for a specific taste cluster using:
 * 1. Hybrid Fast-Path: Query existing MongoDB profiled movies closest to the cluster's centroid embedding (<50ms)
 * 2. Background Replenishment: Asynchronously expand MongoDB candidate pool from TMDB
 * 3. Fallback: Direct TMDB discovery only if local database pool has insufficient matches
 */
async function fetchCandidatesForCluster(cluster, userProfile, targetCount = 12, options = {}) {
  const isRefresh = options.refresh === true;
  const excludedSet = options.excludedIds instanceof Set
    ? options.excludedIds
    : new Set(Array.isArray(options.excludedIds) ? options.excludedIds : []);

  // existingIds = Favorites + Watched/Interacted Films + Currently Displayed Films on the screen.
  const existingIds = new Set([
    ...(userProfile.favorites || []).map((f) => Number(f.tmdbId)),
    ...(userProfile.seenRecommendationIds || []).map(Number),
    ...Array.from(excludedSet).map(Number),
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FAST-PATH: Local MongoDB Vector Match (< 50ms, mathematical accuracy)
  // ──────────────────────────────────────────────────────────────────────────
  if (cluster.centroidEmbedding?.length > 0) {
    try {
      const cachedCandidates = await MovieProfile.find({
        tmdbId: { $nin: Array.from(existingIds) },
        'embedding.0': { $exists: true },
      }).lean();

      if (cachedCandidates.length > 0) {
        // Filter candidates by user selected genres if available
        const genreFiltered = userProfile.selectedGenres?.length > 0
          ? cachedCandidates.filter((m) => isMovieMatchingSelectedGenres(m.genres, userProfile.selectedGenres))
          : cachedCandidates;

        const candidatePool = genreFiltered.length >= targetCount ? genreFiltered : cachedCandidates;

        // Rank by cosine similarity to cluster centroid
        const rankedCandidates = vectorService.rankByCosineSimilarity(
          cluster.centroidEmbedding,
          candidatePool,
          (m) => m.embedding
        );

        // Filter reasonable similarity threshold
        const viableCandidates = rankedCandidates.filter((r) => r.similarity > 0.25);

        if (viableCandidates.length >= targetCount) {
          let chosenCandidates = [];

          if (isRefresh) {
            // On refresh: sample from top candidates pool so user gets fresh variety without losing accuracy
            const poolSlice = viableCandidates.slice(0, Math.max(targetCount * 3, 24));
            // Fisher-Yates shuffle slice
            const shuffled = [...poolSlice];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            chosenCandidates = shuffled.slice(0, targetCount).map((r) => r.item);
          } else {
            // Top match rank
            chosenCandidates = viableCandidates.slice(0, targetCount).map((r) => r.item);
          }

          // Trigger background replenishment to asynchronously keep DB fresh for future refreshes
          replenishCandidatePoolBackground(cluster, userProfile);

          return chosenCandidates.map((movie) => ({
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
      }
    } catch (e) {
      console.warn('MongoDB fast-path vector search fallback:', e.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. FALLBACK PATH: TMDB Discovery (Only if MongoDB has insufficient matches)
  // ──────────────────────────────────────────────────────────────────────────
  const candidateIdSet = new Set();
  const sourceFavIds = (cluster.sourceFavoriteIds || []).slice(0, 2);

  if (sourceFavIds.length > 0) {
    const pageNum = isRefresh ? 2 : 1;
    const promises = sourceFavIds.flatMap((favId) => [
      tmdb.get(`/movie/${favId}/recommendations`, { params: { page: pageNum } }),
      tmdb.get(`/movie/${favId}/similar`, { params: { page: pageNum } }),
    ]);

    const results = await Promise.allSettled(promises);
    results.forEach((res) => {
      if (res.status === 'fulfilled' && res.value?.data?.results) {
        res.value.data.results.forEach((m) => {
          if (!existingIds.has(Number(m.id)) && m.poster_path && (m.vote_count || 0) > 15) {
            candidateIdSet.add(m.id);
          }
        });
      }
    });
  }

  try {
    const genreIds = (userProfile.selectedGenres || [])
      .map((g) => (typeof g === 'number' ? g : GENRE_NAME_TO_ID[g]))
      .filter(Boolean)
      .join('|');

    const countryCodes = (userProfile.selectedOrigins || [])
      .map((o) => (typeof o === 'string' ? (CINEMA_NAME_TO_COUNTRY_CODE[o] || o) : o))
      .filter(Boolean)
      .join('|');

    const discoverRes = await tmdb.get('/discover/movie', {
      params: {
        with_genres: genreIds || undefined,
        with_origin_country: countryCodes || undefined,
        sort_by: 'popularity.desc',
        'vote_count.gte': 30,
        page: isRefresh ? 2 : 1,
      },
    });

    if (discoverRes.data?.results) {
      discoverRes.data.results.forEach((m) => {
        if (!existingIds.has(Number(m.id)) && m.poster_path) {
          candidateIdSet.add(m.id);
        }
      });
    }
  } catch (e) { }

  let selectedCandidateIds = Array.from(candidateIdSet).slice(0, targetCount + 2);
  const profiledCandidates = await movieProfilingService.batchGetOrProfileMovies(selectedCandidateIds, 4);

  const filteredProfiled = profiledCandidates.filter((m) => !existingIds.has(Number(m.tmdbId)));
  const genreAdherentCandidates = userProfile.selectedGenres?.length > 0
    ? filteredProfiled.filter((m) => isMovieMatchingSelectedGenres(m.genres, userProfile.selectedGenres))
    : filteredProfiled;

  const finalPool = (genreAdherentCandidates.length >= 4 ? genreAdherentCandidates : filteredProfiled).slice(0, targetCount);

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
    profile.cachedRecommendations = [];
    profile.cachedRecommendationsAt = null;
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
