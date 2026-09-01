const vectorService = require('./vectorService');
const candidatePoolService = require('./candidatePoolService');
const MovieProfile = require('../models/movieProfileModel');
const { isMovieMatchingSelectedGenres } = require('../utils/genreMap');

/**
 * Generate a dynamic "Why You'll Like This" explanation for a recommended movie.
 */
function generateWhyRationale(movie, cluster, matchingTags) {
  const themes = movie.profile?.themes || [];
  const mood = movie.profile?.mood || [];
  const visual = movie.profile?.visualAesthetic || [];
  const pacing = movie.profile?.pacing || 'moderate';

  const descriptors = [];
  if (matchingTags.length > 0) {
    descriptors.push(...matchingTags.slice(0, 3));
  } else {
    if (themes[0]) descriptors.push(themes[0]);
    if (mood[0]) descriptors.push(`${mood[0]} atmosphere`);
    if (visual[0]) descriptors.push(visual[0]);
  }

  const descriptorString = descriptors.filter(Boolean).join(', ');

  return `Matches your "${cluster.name}" persona because of its ${pacing} storytelling, featuring ${descriptorString || 'compelling narrative craft'}.`;
}

/**
 * Score a single movie against a taste cluster.
 */
function scoreMovieAgainstCluster(movie, cluster) {
  if (!movie.embedding || movie.embedding.length === 0 || !cluster.centroidEmbedding || cluster.centroidEmbedding.length === 0) {
    return { score: 0.5, matchingTags: [] };
  }

  // 1. Semantic Cosine Similarity (0.0 to 1.0)
  const cosineSim = Math.max(0, vectorService.cosineSimilarity(movie.embedding, cluster.centroidEmbedding));

  // 2. Explicit Tag Overlap Score
  const clusterThemeMap = new Map((cluster.topThemes || []).map((t) => [t.tag?.toLowerCase(), t.weight || 1]));
  const clusterMoodMap = new Map((cluster.topMoods || []).map((m) => [m.tag?.toLowerCase(), m.weight || 1]));

  const movieTags = [
    ...(movie.profile?.themes || []),
    ...(movie.profile?.mood || []),
    ...(movie.profile?.visualAesthetic || []),
  ].map((t) => t.toLowerCase());

  let tagScoreSum = 0;
  const matchingTags = [];

  movieTags.forEach((tag) => {
    if (clusterThemeMap.has(tag)) {
      tagScoreSum += clusterThemeMap.get(tag);
      matchingTags.push(tag);
    }
    if (clusterMoodMap.has(tag)) {
      tagScoreSum += clusterMoodMap.get(tag);
      matchingTags.push(tag);
    }
  });

  const tagMatchNormalized = Math.min(1.0, tagScoreSum / 3.0);

  // 3. Composite Score: 65% Semantic Vector + 35% Exact Tag Match + Cluster Weight Bonus
  const compositeMatch = 0.65 * cosineSim + 0.35 * tagMatchNormalized;
  const clusterWeightBonus = (cluster.weight || 0.5) * 0.05;
  const finalScore = Math.min(1.0, compositeMatch + clusterWeightBonus);

  return {
    score: Number(finalScore.toFixed(4)),
    matchingTags: Array.from(new Set(matchingTags)),
  };
}

/**
 * Calibrate raw score (0.50 - 1.0) into an intuitive, well-distributed user-facing match percentage (68% - 98%).
 */
function calculateMatchPercentage(rawScore) {
  let pct;
  if (rawScore >= 0.85) {
    pct = 90 + ((rawScore - 0.85) / 0.15) * 8;
  } else if (rawScore >= 0.75) {
    pct = 82 + ((rawScore - 0.75) / 0.10) * 8;
  } else if (rawScore >= 0.65) {
    pct = 74 + ((rawScore - 0.65) / 0.10) * 8;
  } else {
    pct = 68 + Math.max(0, (rawScore - 0.50) / 0.15) * 6;
  }
  return Math.min(99, Math.max(68, Math.round(pct)));
}

/**
 * Generate ranked recommendations with diversity guardrails and explanations (Phases 9 & 10).
 */
async function generateRankedRecommendations(userProfile, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.max(1, parseInt(options.limit, 10) || 12);
  const clusters = userProfile.tasteClusters || [];

  if (clusters.length === 0) {
    const empty = [];
    empty.page = page;
    empty.limit = limit;
    empty.total = 0;
    empty.hasMore = false;
    return empty;
  }

  const existingFavoriteIds = new Set((userProfile.favorites || []).map((f) => Number(f.tmdbId)));
  const totalTargetNeeded = Math.max(36, page * limit + 20);
  const perClusterTarget = Math.ceil(totalTargetNeeded / clusters.length) + 10;

  // 1. Collect candidate pool seeded from all current clusters & favorites
  const candidateLists = await Promise.all(
    clusters.map((c) => candidatePoolService.fetchCandidatesForCluster(c, userProfile, perClusterTarget))
  );

  const allCandidates = candidateLists.flat();

  // Deduplicate candidates and ensure none of the user's selected favorites are included
  const uniqueCandidateMap = new Map();
  allCandidates.forEach((m) => {
    if (!existingFavoriteIds.has(Number(m.tmdbId))) {
      uniqueCandidateMap.set(Number(m.tmdbId), m);
    }
  });

  // Also include top semantic matches from MongoDB MovieProfile collection
  try {
    const cachedCandidates = await MovieProfile.find({
      tmdbId: { $nin: Array.from(existingFavoriteIds) },
      'embedding.0': { $exists: true },
    }).lean();

    cachedCandidates.forEach((m) => {
      if (!uniqueCandidateMap.has(m.tmdbId)) {
        if (isMovieMatchingSelectedGenres(m.genres, userProfile.selectedGenres)) {
          uniqueCandidateMap.set(m.tmdbId, m);
        }
      }
    });
  } catch (e) {}

  // 2. Score each candidate against its best matching cluster
  const scoredList = [];

  uniqueCandidateMap.forEach((movie) => {
    let bestCluster = clusters[0];
    let maxScore = -1;
    let bestMatchingTags = [];

    clusters.forEach((cluster) => {
      const { score, matchingTags } = scoreMovieAgainstCluster(movie, cluster);
      if (score > maxScore) {
        maxScore = score;
        bestCluster = cluster;
        bestMatchingTags = matchingTags;
      }
    });

    const matchPct = calculateMatchPercentage(maxScore);
    const whyExplanation = generateWhyRationale(movie, bestCluster, bestMatchingTags);

    scoredList.push({
      id: movie.tmdbId,
      tmdbId: movie.tmdbId,
      title: movie.title,
      year: movie.releaseYear,
      genre: movie.genres?.[0] || 'Drama',
      genres: movie.genres,
      director: movie.director,
      cinema: movie.originCountries?.[0] ? `${movie.originCountries[0]} Cinema` : 'Global',
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      match: matchPct,
      score: maxScore,
      why: whyExplanation,
      sourceClusterId: bestCluster.clusterId,
      sourceClusterName: bestCluster.name,
      aiSummary: movie.aiSummary,
      stream: 'Available on Stream',
      c1: '#0d1b2a',
      c2: '#1e4d7b',
    });
  });

  // Sort overall by genre match priority first, then match score descending
  scoredList.sort((a, b) => {
    const aGenreMatch = isMovieMatchingSelectedGenres(a.genres, userProfile.selectedGenres);
    const bGenreMatch = isMovieMatchingSelectedGenres(b.genres, userProfile.selectedGenres);
    if (aGenreMatch && !bGenreMatch) return -1;
    if (!aGenreMatch && bGenreMatch) return 1;
    return b.score - a.score;
  });

  // 3. Apply Diversity Guardrail: Balance representation across all clusters
  const clusterCounts = {};
  const diverseRecommendations = [];
  const deferred = [];
  const totalSlotsToFill = Math.max(scoredList.length, page * limit + 10);
  const maxSingleClusterCount = Math.max(2, Math.floor(totalSlotsToFill * 0.70));

  for (const item of scoredList) {
    const cId = item.sourceClusterId;
    clusterCounts[cId] = clusterCounts[cId] || 0;

    if (clusterCounts[cId] < maxSingleClusterCount) {
      clusterCounts[cId]++;
      diverseRecommendations.push(item);
    } else {
      deferred.push(item);
    }
  }

  // Prioritize deferred from least represented clusters first
  deferred.sort((a, b) => (clusterCounts[a.sourceClusterId] || 0) - (clusterCounts[b.sourceClusterId] || 0));

  while (deferred.length > 0) {
    const item = deferred.shift();
    clusterCounts[item.sourceClusterId] = (clusterCounts[item.sourceClusterId] || 0) + 1;
    diverseRecommendations.push(item);
  }

  // 4. Slice for the requested page
  const startIndex = (page - 1) * limit;
  const pagedList = diverseRecommendations.slice(startIndex, startIndex + limit);

  pagedList.page = page;
  pagedList.limit = limit;
  pagedList.total = diverseRecommendations.length;
  pagedList.hasMore = startIndex + pagedList.length < diverseRecommendations.length;

  return pagedList;
}

module.exports = {
  generateRankedRecommendations,
  generateWhyRationale,
  scoreMovieAgainstCluster,
};
