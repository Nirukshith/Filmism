const mongoose = require('mongoose');
const UserTasteProfile = require('../models/userTasteProfileModel');
const User = require('../models/userModel');
const Match = require('../models/matchModel');
const Block = require('../models/blockModel');
const vectorService = require('./vectorService');

const DEFAULT_RECENT_MATCH_DAYS = 7;

/**
 * Compare two user taste profiles and calculate rich explainability metadata:
 * - Cosine similarity score (0-100)
 * - Overlapping taste clusters
 * - Overlapping favorite films ("You both loved X")
 * - Recommendation / cross-pollination film ("They might introduce you to...")
 */
function computeExplainability(profileA, profileB) {
  // 1. Calculate overall taste similarity score (0 - 100)
  const rawSimilarity = vectorService.cosineSimilarity(
    profileA.globalCentroid || [],
    profileB.globalCentroid || []
  );
  // Normalize cosine similarity (usually in [0.0, 1.0] for normalized embeddings) to percentage
  const similarityScore = Math.max(0, Math.min(100, Math.round(rawSimilarity * 100)));

  // 2. Compute overlapping taste clusters
  const clustersA = profileA.tasteClusters || [];
  const clustersB = profileB.tasteClusters || [];
  const sharedClusters = [];

  for (const cA of clustersA) {
    let bestMatchCluster = null;
    let highestSim = -1;

    for (const cB of clustersB) {
      if (cA.centroidEmbedding && cB.centroidEmbedding && cA.centroidEmbedding.length > 0 && cB.centroidEmbedding.length > 0) {
        const sim = vectorService.cosineSimilarity(cA.centroidEmbedding, cB.centroidEmbedding);
        if (sim > highestSim) {
          highestSim = sim;
          bestMatchCluster = cB;
        }
      } else if (cA.name && cB.name && cA.name.toLowerCase() === cB.name.toLowerCase()) {
        highestSim = 1.0;
        bestMatchCluster = cB;
      }
    }

    // Only include clusters that have meaningful overlap (>= 60% similarity)
    if (bestMatchCluster && highestSim >= 0.60) {
      sharedClusters.push({
        clusterName: cA.name,
        userAWeight: Number((cA.weight || 0).toFixed(2)),
        userBWeight: Number((bestMatchCluster.weight || 0).toFixed(2)),
        overlapScore: Math.round(highestSim * 100),
      });
    }
  }

  // Sort shared clusters by overlap score descending
  sharedClusters.sort((a, b) => b.overlapScore - a.overlapScore);

  // 3. Shared favorite films
  const favMapA = new Map(
    (profileA.favorites || []).map((f) => [Number(f.tmdbId), f])
  );
  const sharedFavorites = [];

  for (const favB of profileB.favorites || []) {
    const tmdbId = Number(favB.tmdbId);
    if (favMapA.has(tmdbId)) {
      const favA = favMapA.get(tmdbId);
      sharedFavorites.push({
        tmdbId,
        title: favB.title || favA.title,
        posterPath: favB.posterPath || favA.posterPath || null,
        year: favB.year || favA.year || null,
      });
    }
  }

  // 4. Recommendation film: High-rated film from User B that User A hasn't rated/favorited
  let recommendedFilm = null;
  const candidateFilms = (profileB.favorites || []).filter(
    (favB) => !favMapA.has(Number(favB.tmdbId)) && (favB.rating === undefined || favB.rating >= 3)
  );

  if (candidateFilms.length > 0) {
    // Pick the highest rated or first film
    const topPick = candidateFilms.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    recommendedFilm = {
      tmdbId: Number(topPick.tmdbId),
      title: topPick.title,
      posterPath: topPick.posterPath || null,
      year: topPick.year || null,
      recommendedBy: profileB.userId,
    };
  }

  return {
    similarityScore,
    sharedClusters,
    sharedFavorites,
    recommendedFilm,
  };
}

/**
 * Find and compute a Cinephile Twin match for the requesting user.
 *
 * @param {string|ObjectId} userId - Requesting user's ID
 * @param {Object} options - Configuration options
 * @param {number} [options.recentDays=7] - Number of days to exclude previous matches
 * @param {boolean} [options.allowRecentIfExhausted=true] - Fall back to past matches if pool exhausted
 * @returns {Promise<Object>} Computed match result with partner public info
 */
async function findCinephileTwin(userId, options = {}) {
  const recentDays = options.recentDays !== undefined ? options.recentDays : DEFAULT_RECENT_MATCH_DAYS;
  const allowRecentIfExhausted = options.allowRecentIfExhausted !== false;

  const requestingUserId = new mongoose.Types.ObjectId(userId);

  // 1. Fetch requesting user taste profile & verify eligibility
  const userProfile = await UserTasteProfile.findOne({ userId: requestingUserId }).lean();
  if (!userProfile) {
    const err = new Error('User taste profile not found. Please complete taste profile onboarding.');
    err.statusCode = 404;
    throw err;
  }

  if (!userProfile.matchingEnabled) {
    const err = new Error('Cinephile Twin matching is disabled. Please opt in through settings.');
    err.statusCode = 403;
    throw err;
  }

  if (!userProfile.globalCentroid || userProfile.globalCentroid.length === 0) {
    const err = new Error('Taste profile must have a calculated taste centroid to find matches. Please select your favorite films in Taste Profile.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Identify recently matched users and blocked users to avoid duplicates/unwanted contact
  const cutoffDate = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
  const [recentMatches, blocks] = await Promise.all([
    Match.find({
      $or: [{ userA: requestingUserId }, { userB: requestingUserId }],
      createdAt: { $gte: cutoffDate },
    }).lean(),
    Block.find({
      $or: [{ blocker: requestingUserId }, { blocked: requestingUserId }],
    }).lean(),
  ]);

  const excludedUserIds = recentMatches.map((m) =>
    m.userA.toString() === requestingUserId.toString() ? m.userB : m.userA
  );
  blocks.forEach((b) => {
    const blockedPartner =
      b.blocker.toString() === requestingUserId.toString() ? b.blocked : b.blocker;
    excludedUserIds.push(blockedPartner);
  });
  excludedUserIds.push(requestingUserId);

  let candidate = null;

  // 3. Attempt Atlas Vector Search
  try {
    const pipeline = vectorService.buildTasteProfileVectorSearchPipeline({
      queryVector: userProfile.globalCentroid,
      excludeUserId: requestingUserId,
      limit: 10,
      filter: {
        userId: { $nin: excludedUserIds },
      },
    });

    const vectorResults = await UserTasteProfile.aggregate(pipeline);
    if (vectorResults && vectorResults.length > 0) {
      candidate = vectorResults[0];
    }
  } catch (vectorErr) {
    // Fallback if Atlas Vector Search is not active or in test/local environment
  }

  // 4. In-Memory Cosine Similarity Fallback
  if (!candidate) {
    let poolQuery = {
      userId: { $nin: excludedUserIds },
      matchingEnabled: true,
      'globalCentroid.0': { $exists: true },
    };

    let eligibleProfiles = await UserTasteProfile.find(poolQuery).lean();

    // If pool exhausted with recent filter and fallback allowed, broaden search to all eligible users except self
    if (eligibleProfiles.length === 0 && allowRecentIfExhausted && excludedUserIds.length > 1) {
      eligibleProfiles = await UserTasteProfile.find({
        userId: { $ne: requestingUserId },
        matchingEnabled: true,
        'globalCentroid.0': { $exists: true },
      }).lean();
    }

    if (eligibleProfiles.length > 0) {
      const ranked = vectorService.rankByCosineSimilarity(
        userProfile.globalCentroid,
        eligibleProfiles,
        (p) => p.globalCentroid
      );
      if (ranked.length > 0) {
        candidate = ranked[0].item;
      }
    }
  }

  if (!candidate) {
    const err = new Error('No eligible cinephile twins found at this moment. More cinephiles are joining soon!');
    err.statusCode = 404;
    throw err;
  }

  // 5. Compute Explainability Layer
  const explainability = computeExplainability(userProfile, candidate);

  // 6. Ensure deterministic ordering of userA and userB for storage
  const isUserALess = requestingUserId.toString() < candidate.userId.toString();
  const userAId = isUserALess ? requestingUserId : candidate.userId;
  const userBId = isUserALess ? candidate.userId : requestingUserId;

  // Map shared cluster weights relative to userA and userB
  const mappedSharedClusters = explainability.sharedClusters.map((sc) => ({
    clusterName: sc.clusterName,
    userAWeight: isUserALess ? sc.userAWeight : sc.userBWeight,
    userBWeight: isUserALess ? sc.userBWeight : sc.userAWeight,
    overlapScore: sc.overlapScore,
  }));

  const matchRecord = await Match.create({
    userA: userAId,
    userB: userBId,
    similarityScore: explainability.similarityScore,
    sharedClusters: mappedSharedClusters,
    sharedFavorites: explainability.sharedFavorites,
    recommendedFilm: explainability.recommendedFilm,
  });

  // 7. Fetch partner's safe public profile info
  const partnerUser = await User.findById(candidate.userId)
    .select('firstName lastName profilePicture')
    .lean();

  return formatMatchResponse(matchRecord, requestingUserId, partnerUser);
}

/**
 * Retrieve the user's most recent active match.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<Object|null>}
 */
async function getCurrentMatch(userId) {
  const requestingUserId = new mongoose.Types.ObjectId(userId);

  const blocks = await Block.find({
    $or: [{ blocker: requestingUserId }, { blocked: requestingUserId }],
  }).lean();
  const blockedUserIds = blocks.map((b) =>
    b.blocker.toString() === requestingUserId.toString() ? b.blocked : b.blocker
  );

  const match = await Match.findOne({
    $or: [{ userA: requestingUserId }, { userB: requestingUserId }],
    userA: { $nin: blockedUserIds },
    userB: { $nin: blockedUserIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!match) return null;

  const partnerUserId =
    match.userA.toString() === requestingUserId.toString() ? match.userB : match.userA;

  const partnerUser = await User.findById(partnerUserId)
    .select('firstName lastName profilePicture')
    .lean();

  return formatMatchResponse(match, requestingUserId, partnerUser);
}

/**
 * Format match document into safe, frontend-ready representation.
 */
function formatMatchResponse(matchDoc, requestingUserId, partnerUser) {
  const isUserA = matchDoc.userA.toString() === requestingUserId.toString();

  const formattedClusters = (matchDoc.sharedClusters || []).map((sc) => ({
    clusterName: sc.clusterName,
    myWeight: isUserA ? sc.userAWeight : sc.userBWeight,
    twinWeight: isUserA ? sc.userBWeight : sc.userAWeight,
    overlapScore: sc.overlapScore,
  }));

  return {
    matchId: matchDoc._id,
    similarityScore: matchDoc.similarityScore,
    matchedAt: matchDoc.createdAt,
    twin: {
      userId: partnerUser?._id || (isUserA ? matchDoc.userB : matchDoc.userA),
      firstName: partnerUser?.firstName || 'Fellow Cinephile',
      profilePicture: partnerUser?.profilePicture || null,
    },
    sharedClusters: formattedClusters,
    sharedFavorites: matchDoc.sharedFavorites || [],
    recommendedFilm: matchDoc.recommendedFilm || null,
  };
}

/**
 * Retrieve the next recommended film from a Cinephile Twin, excluding films already seen or watched.
 *
 * @param {string|ObjectId} userId - Current requesting user ID
 * @param {string|ObjectId} twinUserId - Matched twin user ID
 * @param {number[]} [excludedTmdbIds=[]] - Array of tmdbIds to exclude
 * @returns {Promise<Object|null>} Next recommended film or null if exhausted
 */
async function getNextTwinRecommendation(userId, twinUserId, excludedTmdbIds = []) {
  const requestingUserId = new mongoose.Types.ObjectId(userId);
  const twinUserObjId = new mongoose.Types.ObjectId(twinUserId);

  const [userProfile, twinProfile] = await Promise.all([
    UserTasteProfile.findOne({ userId: requestingUserId }).lean(),
    UserTasteProfile.findOne({ userId: twinUserObjId }).lean(),
  ]);

  if (!twinProfile) {
    const err = new Error('Twin taste profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const userFavSet = new Set((userProfile?.favorites || []).map((f) => Number(f.tmdbId)));
  const excludeSet = new Set((excludedTmdbIds || []).map(Number));

  // Find candidate films from twin's favorites
  const candidateFilms = (twinProfile.favorites || []).filter(
    (favB) =>
      !userFavSet.has(Number(favB.tmdbId)) &&
      !excludeSet.has(Number(favB.tmdbId)) &&
      (favB.rating === undefined || favB.rating >= 3)
  );

  if (candidateFilms.length === 0) {
    // Check remaining favorites as fallback
    const fallbackFilms = (twinProfile.favorites || []).filter(
      (favB) =>
        !userFavSet.has(Number(favB.tmdbId)) &&
        !excludeSet.has(Number(favB.tmdbId))
    );

    if (fallbackFilms.length === 0) {
      return null;
    }

    const pick = fallbackFilms[0];
    return {
      tmdbId: Number(pick.tmdbId),
      title: pick.title,
      posterPath: pick.posterPath || null,
      year: pick.year || null,
      recommendedBy: twinProfile.userId,
    };
  }

  const topPick = candidateFilms.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  return {
    tmdbId: Number(topPick.tmdbId),
    title: topPick.title,
    posterPath: topPick.posterPath || null,
    year: topPick.year || null,
    recommendedBy: twinProfile.userId,
  };
}

module.exports = {
  findCinephileTwin,
  getCurrentMatch,
  computeExplainability,
  formatMatchResponse,
  getNextTwinRecommendation,
};
