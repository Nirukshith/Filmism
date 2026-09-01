const candidatePoolService = require('../services/candidatePoolService');
const recommendationEngine = require('../services/recommendationEngine');
const feedbackService = require('../services/feedbackService');
const UserTasteProfile = require('../models/userTasteProfileModel');

/**
 * POST /api/recommendations/candidates
 * Retrieve candidate pool rounds for user feedback (DeepDive page).
 */
const getCandidatePool = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { sessionId } = req.body;

    const query = userId ? { userId } : { sessionId };
    const profile = await UserTasteProfile.findOne(query).sort({ updatedAt: -1 });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No taste profile found. Complete onboarding first.',
      });
    }

    const rounds = await candidatePoolService.generateCandidatePool(profile);

    res.json({
      success: true,
      rounds,
      clusters: profile.tasteClusters,
    });
  } catch (error) {
    console.error('Error generating candidate pool:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/recommendations/rate-candidate
 * Submit user rating for a candidate film (updates cluster & profile weights).
 */
const rateCandidateFilm = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { sessionId, tmdbId, rating, sourceClusterId } = req.body;

    if (!tmdbId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'tmdbId and rating (0-4) are required.',
      });
    }

    const result = await candidatePoolService.recordCandidateRating({
      userId,
      sessionId,
      tmdbId,
      rating,
      sourceClusterId,
    });

    res.json(result);
  } catch (error) {
    console.error('Error rating candidate:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/recommendations/ranked
 * Fetch final ranked recommendations with "Why you'll like this" explanations and diversity guardrails.
 */
const getRankedRecommendations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;

    const query = userId ? { userId } : { sessionId };
    const profile = await UserTasteProfile.findOne(query).sort({ updatedAt: -1 });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No taste profile found. Complete onboarding first.',
      });
    }

    const recommendations = await recommendationEngine.generateRankedRecommendations(profile, { page, limit });

    res.json({
      success: true,
      count: recommendations.length,
      page: recommendations.page || page,
      limit: recommendations.limit || limit,
      total: recommendations.total || recommendations.length,
      hasMore: recommendations.hasMore !== undefined ? recommendations.hasMore : false,
      recommendations,
      tasteClusters: profile.tasteClusters,
      aiSynthesis: profile.aiSynthesis,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/recommendations/action
 * Log interaction action (shown, watchlisted, dismissed, watched) and update intent weights.
 */
const recordAction = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { sessionId, tmdbId, title, sourceClusterId, sourceClusterName, matchScore, action } = req.body;

    if (!tmdbId || !action) {
      return res.status(400).json({ success: false, message: 'tmdbId and action are required.' });
    }

    const result = await feedbackService.recordRecommendationAction({
      userId,
      sessionId,
      tmdbId,
      title,
      sourceClusterId,
      sourceClusterName,
      matchScore,
      action,
    });

    res.json(result);
  } catch (error) {
    console.error('Error recording action:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/recommendations/outcome
 * Record post-watch outcome verdict and apply high-signal profile learning.
 */
const recordOutcome = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { sessionId, tmdbId, outcomeRating, sourceClusterId } = req.body;

    if (!tmdbId || outcomeRating === undefined) {
      return res.status(400).json({ success: false, message: 'tmdbId and outcomeRating (1-4) are required.' });
    }

    const result = await feedbackService.recordPostWatchOutcome({
      userId,
      sessionId,
      tmdbId,
      outcomeRating,
      sourceClusterId,
    });

    res.json(result);
  } catch (error) {
    console.error('Error recording outcome:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/recommendations/telemetry-stats
 * Get recommendation quality metrics and hit-rate telemetry.
 */
const getTelemetryStats = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;

    const stats = await feedbackService.getRecommendationMetrics({ userId, sessionId });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching telemetry stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCandidatePool,
  rateCandidateFilm,
  getRankedRecommendations,
  recordAction,
  recordOutcome,
  getTelemetryStats,
};
