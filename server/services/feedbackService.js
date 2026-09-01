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

  // 2. Adjust taste profile weights for intent signals (Phase 12)
  const profile = await UserTasteProfile.findOne(query);
  const actionRate = ACTION_LEARNING_RATES[action];

  if (profile && actionRate && actionRate.centroidPull !== 0) {
    const cluster = profile.tasteClusters.find((c) => c.clusterId === sourceClusterId) || profile.tasteClusters[0];

    if (cluster) {
      // Retrieve movie profile embedding
      try {
        const { profile: movieDoc } = await movieProfilingService.getOrProfileMovie(numericId);
        if (movieDoc?.embedding?.length > 0 && cluster.centroidEmbedding?.length > 0) {
          const alpha = actionRate.centroidPull * 0.08; // Mild intent learning rate
          const updatedVec = cluster.centroidEmbedding.map((val, idx) => {
            return val + alpha * (movieDoc.embedding[idx] || 0);
          });
          const norm = Math.sqrt(updatedVec.reduce((sum, v) => sum + v * v, 0)) || 1;
          cluster.centroidEmbedding = updatedVec.map((v) => Number((v / norm).toFixed(6)));
        }

        // Adjust tag weights
        const themes = movieDoc?.profile?.themes || [];
        themes.forEach((t) => {
          const tag = cluster.topThemes.find((theme) => theme.tag === t);
          if (tag) {
            tag.weight = Math.max(0.1, Number((tag.weight + actionRate.tagBoost * 0.1).toFixed(2)));
          }
        });

        await profile.save();
      } catch (e) {
        console.warn('Profile update on action warning:', e.message);
      }
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

  // 2. High-impact taste profile update
  const profile = await UserTasteProfile.findOne(query);

  if (profile) {
    const cluster = profile.tasteClusters.find((c) => c.clusterId === sourceClusterId) || profile.tasteClusters[0];

    if (cluster) {
      try {
        const { profile: movieDoc } = await movieProfilingService.getOrProfileMovie(numericId);

        // Shift cluster centroid vector with strong outcome weight
        if (movieDoc?.embedding?.length > 0 && cluster.centroidEmbedding?.length > 0) {
          const alpha = learningRule.centroidPull * 0.25; // Strong outcome learning rate
          const updatedVec = cluster.centroidEmbedding.map((val, idx) => {
            return val + alpha * (movieDoc.embedding[idx] || 0);
          });
          const norm = Math.sqrt(updatedVec.reduce((sum, v) => sum + v * v, 0)) || 1;
          cluster.centroidEmbedding = updatedVec.map((v) => Number((v / norm).toFixed(6)));
        }

        // Adjust cluster tags
        const themes = movieDoc?.profile?.themes || [];
        themes.forEach((t) => {
          const tag = cluster.topThemes.find((theme) => theme.tag === t);
          if (tag) {
            tag.weight = Math.max(0.05, Number((tag.weight + learningRule.tagBoost * 0.25).toFixed(2)));
          } else if (learningRule.tagBoost > 0) {
            cluster.topThemes.push({ tag: t, weight: 0.6 });
          }
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
