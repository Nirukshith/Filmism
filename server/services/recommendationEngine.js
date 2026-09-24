const vectorService = require('./vectorService');
const candidatePoolService = require('./candidatePoolService');
const MovieProfile = require('../models/movieProfileModel');
const UserTasteProfile = require('../models/userTasteProfileModel');
const RecommendationLog = require('../models/recommendationLogModel');
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
 * Rotates cached recommendations across clusters so returning users immediately see
 * different, fresh recommendations from their pre-calculated personalized cache.
 */
function rotateCachedRecommendations(cachedList, clusters, seenIds = []) {
  if (!Array.isArray(cachedList) || cachedList.length <= 12) {
    return cachedList;
  }

  // For each of the user's taste personas (clusters), creates an empty list to store movies belonging to that persona.
  const clusterBuckets = {};
  clusters.forEach((c) => {
    clusterBuckets[c.clusterId] = [];
  });

  const fallbackClusterId = clusters[0]?.clusterId || 'default';
  clusterBuckets[fallbackClusterId] = clusterBuckets[fallbackClusterId] || [];

  // Loops through all the cached movies and places each film into its corresponding persona bucket based on item.sourceClusterId.
  cachedList.forEach((item) => {
    const bucket = clusterBuckets[item.sourceClusterId] || clusterBuckets[fallbackClusterId];
    bucket.push(item);
  });

  // Rotate each cluster bucket so previously top items shift to the back
  const perClusterRotate = Math.max(2, Math.min(10, Math.ceil(12 / Math.max(1, clusters.length))));
  Object.keys(clusterBuckets).forEach((cId) => {
    const bucket = clusterBuckets[cId];
    if (bucket.length > 4) {
      const rotateBy = Math.min(perClusterRotate, Math.floor(bucket.length / 2));
      const head = bucket.slice(0, rotateBy);
      const tail = bucket.slice(rotateBy);
      clusterBuckets[cId] = [...tail, ...head];
    }
  });

  // Re-weave items using round-robin diversity across all clusters
  const rotatedList = [];
  let round = 0;
  let addedAny = true;

  while (addedAny && rotatedList.length < cachedList.length) {
    addedAny = false;
    for (const cluster of clusters) {
      const bucket = clusterBuckets[cluster.clusterId];
      if (bucket && bucket[round]) {
        rotatedList.push(bucket[round]);
        addedAny = true;
      }
    }
    if (clusterBuckets[fallbackClusterId] && !clusters.find((c) => c.clusterId === fallbackClusterId)) {
      const fallbackBucket = clusterBuckets[fallbackClusterId];
      if (fallbackBucket && fallbackBucket[round]) {
        rotatedList.push(fallbackBucket[round]);
        addedAny = true;
      }
    }
    round++;
  }

  return rotatedList.length > 0 ? rotatedList : cachedList;
}

/**
 * Generate ranked recommendations with diversity guardrails and explanations (Phases 9 & 10).
 */
async function generateRankedRecommendations(userProfile, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.max(1, parseInt(options.limit, 10) || 12);
  const clusters = userProfile.tasteClusters || [];
  const forceRefresh = options.refresh === true || options.forceRefresh === true;

  if (clusters.length === 0) {
    const empty = [];
    empty.page = page;
    empty.limit = limit;
    empty.total = 0;
    empty.hasMore = false;
    return empty;
  }

  // Fetch logged actions (watched, watchlisted, dismissed) for this user/session so they aren't re-recommended
  let loggedTmdbIds = [];
  try {
    const logQuery = userProfile.userId
      ? { userId: userProfile.userId, action: { $in: ['watched', 'watchlisted', 'dismissed'] } }
      : { sessionId: userProfile.sessionId, action: { $in: ['watched', 'watchlisted', 'dismissed'] } };
    const logs = await RecommendationLog.find(logQuery).select('tmdbId').lean();
    loggedTmdbIds = logs.map((l) => Number(l.tmdbId)).filter(Boolean);
  } catch (err) {
    console.warn('Failed to query RecommendationLog for candidate exclusion:', err.message);
  }

  const baseExcludedIds = new Set([
    ...(userProfile.favorites || []).map((f) => Number(f.tmdbId)),
    ...loggedTmdbIds,
  ]);

  // Identifying Movies Currently on Screen (To avoid recommending them again)
  const previousListIds = new Set(
    (userProfile.cachedRecommendations || []).map((r) => Number(r.id || r.tmdbId)).filter(Boolean)
  );
  // Also block movies that were recommended in the previous session
  const seenIds = new Set(
    (userProfile.seenRecommendationIds || []).map(Number).filter(Boolean)
  );

  // Refresh is true only when the user explicitly clicks "See More" or "Retry"
  const activeExcludedIds = forceRefresh
    ? new Set([...baseExcludedIds, ...previousListIds, ...seenIds])
    : baseExcludedIds;

  // 0. Cache Hit Check: Return cached recommendations filtered against excluded items
  const shouldRotate = options.rotate === true || userProfile.needsCacheRotation === true;
  const hasCachedRecs = Array.isArray(userProfile.cachedRecommendations) && userProfile.cachedRecommendations.length > 0;

  if (!forceRefresh && hasCachedRecs) {
    let candidatePool = userProfile.cachedRecommendations;

    if (shouldRotate && page === 1) {
      candidatePool = rotateCachedRecommendations(candidatePool, clusters, userProfile.seenRecommendationIds);

      // Persist the rotated order and clear the rotation flag asynchronously
      if (userProfile._id) {
        UserTasteProfile.updateOne(
          { _id: userProfile._id },
          {
            $set: {
              cachedRecommendations: candidatePool,
              needsCacheRotation: false,
              cachedRecommendationsAt: new Date(),
            },
          }
        ).catch(() => { });
      }
    }

    const filteredCached = candidatePool.filter((r) => !baseExcludedIds.has(Number(r.id || r.tmdbId)));
    const startIndex = (page - 1) * limit;
    const pagedList = filteredCached.slice(startIndex, startIndex + limit);
    pagedList.page = page;
    pagedList.limit = limit;
    pagedList.total = filteredCached.length;
    pagedList.hasMore = startIndex + pagedList.length < filteredCached.length;

    // Track newly shown IDs into seenRecommendationIds asynchronously
    if (userProfile._id && pagedList.length > 0) {
      const newlyShownIds = pagedList.map((r) => Number(r.id || r.tmdbId)).filter(Boolean);
      const updatedSeen = Array.from(new Set([...Array.from(seenIds), ...newlyShownIds])).slice(-200);
      UserTasteProfile.updateOne(
        { _id: userProfile._id },
        { $set: { seenRecommendationIds: updatedSeen } }
      ).catch(() => { });
    }

    return pagedList;
  }

  // 1. Fetch Candidate Pool proportionally across ALL clusters
  const perClusterTarget = Math.max(10, Math.ceil(limit / clusters.length) + 4);
  const candidateLists = await Promise.all(
    clusters.map((c) =>
      candidatePoolService.fetchCandidatesForCluster(c, userProfile, perClusterTarget, {
        refresh: forceRefresh,
        excludedIds: activeExcludedIds,
      })
    )
  );

  const allCandidates = candidateLists.flat();

  // Deduplicate candidates and ensure none of the excluded (favorites, watched, watchlisted, previous list) are included
  const uniqueCandidateMap = new Map();
  allCandidates.forEach((m) => {
    if (!activeExcludedIds.has(Number(m.tmdbId))) {
      uniqueCandidateMap.set(Number(m.tmdbId), m);
    }
  });

  // Fallback: If strict exclusion left too few candidates, allow seen items but strictly exclude base (favorites, watched, watchlisted) and previous list
  if (uniqueCandidateMap.size < limit) {
    allCandidates.forEach((m) => {
      if (!baseExcludedIds.has(Number(m.tmdbId)) && !previousListIds.has(Number(m.tmdbId))) {
        uniqueCandidateMap.set(Number(m.tmdbId), m);
      }
    });
  }

  // Also include top semantic matches from MongoDB MovieProfile collection
  try {
    const cachedCandidates = await MovieProfile.find({
      tmdbId: { $nin: Array.from(activeExcludedIds) },
      'embedding.0': { $exists: true },
    }).lean();

    cachedCandidates.forEach((m) => {
      if (!uniqueCandidateMap.has(m.tmdbId)) {
        if (isMovieMatchingSelectedGenres(m.genres, userProfile.selectedGenres)) {
          uniqueCandidateMap.set(m.tmdbId, m);
        }
      }
    });
  } catch (e) { }

  // 2. Score each candidate against its best matching cluster and record all matching personas
  const scoredList = [];

  uniqueCandidateMap.forEach((movie) => {
    let bestCluster = clusters[0];
    let maxScore = -1;
    let bestMatchingTags = [];
    const matchingClusters = [];

    clusters.forEach((cluster) => {
      const { score, matchingTags } = scoreMovieAgainstCluster(movie, cluster);
      if (score >= 0.60) {
        matchingClusters.push(cluster.name);
      }
      if (score > maxScore) {
        maxScore = score;
        bestCluster = cluster;
        bestMatchingTags = matchingTags;
      }
    });

    if (!matchingClusters.includes(bestCluster.name)) {
      matchingClusters.push(bestCluster.name);
    }

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
      matchingClusters,
      aiSummary: movie.aiSummary,
      stream: 'Available on Stream',
      c1: '#0d1b2a',
      c2: '#1e4d7b',
    });
  });

  // Sort candidate list by score descending within each cluster
  scoredList.sort((a, b) => b.score - a.score);

  // 3. Apply Round-Robin Diversity across ALL clusters to guarantee balanced persona representation
  const clusterBuckets = {};
  clusters.forEach((c) => {
    clusterBuckets[c.clusterId] = [];
  });

  scoredList.forEach((item) => {
    if (clusterBuckets[item.sourceClusterId]) {
      clusterBuckets[item.sourceClusterId].push(item);
    } else {
      const firstClusterId = clusters[0].clusterId;
      clusterBuckets[firstClusterId] = clusterBuckets[firstClusterId] || [];
      clusterBuckets[firstClusterId].push(item);
    }
  });

  // Helper: Fisher-Yates shuffle
  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const diverseRecommendations = [];
  let addedAny = true;
  let round = 0;

  // On forceRefresh: shuffle candidate buckets so all new recommendations have fresh variety
  if (forceRefresh) {
    Object.keys(clusterBuckets).forEach((cId) => {
      clusterBuckets[cId] = shuffleArray(clusterBuckets[cId]);
    });
  }

  while (addedAny && diverseRecommendations.length < scoredList.length) {
    addedAny = false;
    for (const cluster of clusters) {
      const bucket = clusterBuckets[cluster.clusterId];
      if (bucket && bucket[round]) {
        diverseRecommendations.push(bucket[round]);
        addedAny = true;
      }
    }
    round++;
  }

  // Save generated recommendations to userProfile cache & update seen list asynchronously
  if (userProfile._id && diverseRecommendations.length > 0) {
    const newlyShownIds = diverseRecommendations.map((r) => Number(r.id || r.tmdbId)).filter(Boolean);
    const updatedSeen = Array.from(new Set([...Array.from(seenIds), ...newlyShownIds])).slice(-150);

    UserTasteProfile.updateOne(
      { _id: userProfile._id },
      {
        cachedRecommendations: diverseRecommendations,
        cachedRecommendationsAt: new Date(),
        seenRecommendationIds: updatedSeen,
      }
    ).catch(() => { });
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
  rotateCachedRecommendations,
};
