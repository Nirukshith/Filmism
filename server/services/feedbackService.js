const RecommendationLog = require('../models/recommendationLogModel');
const UserTasteProfile = require('../models/userTasteProfileModel');
const movieProfilingService = require('./movieProfilingService');
const vectorService = require('./vectorService');

// Phase 12 Signal Weights
const OUTCOME_LEARNING_RATES = {
  4: { centroidPull: 1.00, tagBoost: 0.35, label: 'great' },
  3: { centroidPull: 0.65, tagBoost: 0.20, label: 'good' },
  2: { centroidPull: 0.10, tagBoost: 0.05, label: 'okay' },
  1: { centroidPull: -0.85, tagBoost: -0.40, label: 'not for me' },
  0: { centroidPull: 0.00, tagBoost: 0.00, label: 'none' },
};

const ACTION_LEARNING_RATES = {
  watchlisted: { centroidPull: 0.20, tagBoost: 0.10 },
  dismissed: { centroidPull: -0.15, tagBoost: -0.10 },
  watched: { centroidPull: 0.40, tagBoost: 0.15 },
  shown: { centroidPull: 0.00, tagBoost: 0.00 },
};

/**
 * Remove an interacted or watched film from the user's cached recommendation array.
 */
function purgeFromRecommendationCache(profile, numericTmdbId) {
  if (profile && Array.isArray(profile.cachedRecommendations)) {
    profile.cachedRecommendations = profile.cachedRecommendations.filter(
      (r) => Number(r.id || r.tmdbId) !== numericTmdbId
    );
  }
}

/**
 * Shifts and normalizes a cluster's centroid embedding towards a film's embedding.
 */
function shiftClusterCentroid(cluster, movieEmbedding, alpha) {
  if (!cluster?.centroidEmbedding?.length || !movieEmbedding?.length) return;
  const updatedVec = cluster.centroidEmbedding.map((val, idx) => {
    return val + alpha * (movieEmbedding[idx] || 0);
  });
  const norm = Math.sqrt(updatedVec.reduce((sum, v) => sum + v * v, 0)) || 1;
  cluster.centroidEmbedding = updatedVec.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Adjust theme tag weights in a cluster based on movie themes and learning rate.
 */
function adjustClusterThemeTags(cluster, themes, boost, { minWeight = 0.05, addNew = false } = {}) {
  (themes || []).forEach((t) => {
    const tag = cluster.topThemes.find((theme) => theme.tag === t);
    if (tag) {
      tag.weight = Math.max(minWeight, Number((tag.weight + boost).toFixed(2)));
    } else if (addNew && boost > 0) {
      cluster.topThemes.push({ tag: t, weight: 0.6 });
    }
  });
}

/**
 * Log user action on a recommendation (shown, watchlisted, dismissed, watched).
 */
async function recordRecommendationAction({
  userId,
  sessionId,
  tmdbId,
  title = 'Movie',
  sourceClusterId = 'cluster_1',
  sourceClusterName = '',
  matchScore = 80,
  action = 'shown',
}) {
  const numericId = Number(tmdbId);
  const query = userId ? { userId } : { sessionId };

  // 1. Persist Log Event in MongoDB
  const logEntry = await RecommendationLog.create({
    userId,
    sessionId,
    tmdbId: numericId,
    title,
    sourceClusterId,
    sourceClusterName,
    matchScore,
    action,
  });

  // 2. Adjust taste profile weights and purge film from cached recommendations
  const profile = await UserTasteProfile.findOne(query);
  const actionRate = ACTION_LEARNING_RATES[action];

  if (profile) {
    // Immediately remove from cached recommendations if watchlisted, watched, or dismissed
    if (['watchlisted', 'watched', 'dismissed'].includes(action)) {
      purgeFromRecommendationCache(profile, numericId);
    }

    if (actionRate && actionRate.centroidPull !== 0) {
      const cluster = profile.tasteClusters.find((c) => c.clusterId === sourceClusterId) || profile.tasteClusters[0];

      if (cluster) {
        // Retrieve movie profile embedding
        try {
          const { profile: movieDoc } = await movieProfilingService.getOrProfileMovie(numericId);
          shiftClusterCentroid(cluster, movieDoc?.embedding, actionRate.centroidPull * 0.08);
          adjustClusterThemeTags(cluster, movieDoc?.profile?.themes, actionRate.tagBoost * 0.1, {
            minWeight: 0.1,
            addNew: false,
          });
        } catch (e) {
          console.warn('Profile update on action warning:', e.message);
        }
      }
    }

    try {
      await profile.save();
    } catch (e) {
      console.warn('Failed to save profile after action:', e.message);
    }
  }

  return { success: true, log: logEntry };
}

/**
 * Record post-watch outcome verdict (Phase 11 & 12 - Maximum Signal Weight).
 */
async function recordPostWatchOutcome({
  userId,
  sessionId,
  tmdbId,
  outcomeRating, // 1: not for me, 2: okay, 3: good, 4: great
  sourceClusterId,
}) {
  const numericId = Number(tmdbId);
  const numericRating = Number(outcomeRating);
  const learningRule = OUTCOME_LEARNING_RATES[numericRating] || OUTCOME_LEARNING_RATES[3];
  const query = userId ? { userId } : { sessionId };

  // 1. Update or create log entry
  const logEntry = await RecommendationLog.findOneAndUpdate(
    {
      ...(userId ? { userId } : { sessionId }),
      tmdbId: numericId,
    },
    {
      action: 'watched',
      outcomeRating: numericRating,
      outcomeLabel: learningRule.label,
      timestamp: new Date(),
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // 2. High-impact taste profile update and cache purge
  const profile = await UserTasteProfile.findOne(query);

  if (profile) {
    purgeFromRecommendationCache(profile, numericId);

    const cluster = profile.tasteClusters.find((c) => c.clusterId === sourceClusterId) || profile.tasteClusters[0];

    if (cluster) {
      try {
        const { profile: movieDoc } = await movieProfilingService.getOrProfileMovie(numericId);

        // Shift cluster centroid vector with strong outcome weight
        shiftClusterCentroid(cluster, movieDoc?.embedding, learningRule.centroidPull * 0.25);

        // Adjust cluster tags
        adjustClusterThemeTags(cluster, movieDoc?.profile?.themes, learningRule.tagBoost * 0.25, {
          minWeight: 0.05,
          addNew: true,
        });

        // If outcome is great (4) or good (3), boost cluster share weight
        if (numericRating >= 3) {
          cluster.weight = Math.min(1.0, Number((cluster.weight + 0.08).toFixed(2)));
        } else if (numericRating === 1) {
          cluster.weight = Math.max(0.1, Number((cluster.weight - 0.10).toFixed(2)));
        }

        // Re-normalize cluster weights to sum to 1.0
        const totalW = profile.tasteClusters.reduce((sum, c) => sum + (c.weight || 0.5), 0) || 1;
        profile.tasteClusters.forEach((c) => {
          c.weight = Number(((c.weight || 0.5) / totalW).toFixed(2));
        });

        await profile.save();
      } catch (e) {
        console.warn('Profile update on outcome error:', e.message);
      }
    }
  }

  return {
    success: true,
    message: `Post-watch outcome (${learningRule.label}) recorded. Profile updated with high-signal learning.`,
    log: logEntry,
    tasteProfile: profile,
  };
}

/**
 * Compute recommendation telemetry & hit-rate metrics (Phase 13).
 */
async function getRecommendationMetrics({ userId, sessionId }) {
  const query = userId ? { userId } : { sessionId };
  const logs = await RecommendationLog.find(query).sort({ createdAt: -1 }).lean();

  const totalShown = logs.length;
  const watchlisted = logs.filter((l) => l.action === 'watchlisted').length;
  const watched = logs.filter((l) => l.action === 'watched').length;
  const positiveOutcomes = logs.filter((l) => l.outcomeRating >= 3 || (l.action === 'watched' && l.outcomeRating === 0)).length;
  const negativeOutcomes = logs.filter((l) => l.outcomeRating === 1).length;
  const dismissed = logs.filter((l) => l.action === 'dismissed').length;

  const successfulInteractions = watchlisted + positiveOutcomes;
  const hitRate = totalShown > 0 ? Math.round((successfulInteractions / totalShown) * 100) : 85;

  // Sliced by taste cluster
  const clusterMetrics = {};
  logs.forEach((log) => {
    const cId = log.sourceClusterId || 'cluster_1';
    if (!clusterMetrics[cId]) {
      clusterMetrics[cId] = {
        clusterId: cId,
        clusterName: log.sourceClusterName || cId,
        totalShown: 0,
        watchlisted: 0,
        positiveWatched: 0,
        negativeOutcomes: 0,
      };
    }
    clusterMetrics[cId].totalShown++;
    if (log.action === 'watchlisted') clusterMetrics[cId].watchlisted++;
    if (log.outcomeRating >= 3 || log.action === 'watched') clusterMetrics[cId].positiveWatched++;
    if (log.outcomeRating === 1) clusterMetrics[cId].negativeOutcomes++;
  });

  const clusterBreakdown = Object.values(clusterMetrics).map((c) => ({
    ...c,
    clusterHitRate: c.totalShown > 0 ? Math.round(((c.watchlisted + c.positiveWatched) / c.totalShown) * 100) : 0,
  }));

  return {
    totalShown,
    watchlisted,
    watched,
    positiveOutcomes,
    negativeOutcomes,
    dismissed,
    hitRate,
    clusterBreakdown,
  };
}

module.exports = {
  recordRecommendationAction,
  recordPostWatchOutcome,
  getRecommendationMetrics,
  OUTCOME_LEARNING_RATES,
  ACTION_LEARNING_RATES,
};
