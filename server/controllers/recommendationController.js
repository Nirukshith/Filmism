const candidatePoolService = require('../services/candidatePoolService');
const recommendationEngine = require('../services/recommendationEngine');
const feedbackService = require('../services/feedbackService');
const tasteClusterService = require('../services/tasteClusterService');
const UserTasteProfile = require('../models/userTasteProfileModel');
const RecommendationLog = require('../models/recommendationLogModel');
const tmdb = require('../services/tmdbService');

/**
 * POST /api/recommendations/candidates
 * Retrieve candidate pool rounds for user feedback (DeepDive page).
 */
const getCandidatePool = async (req, res, next) => {
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
    next(error);
  }
};

/**
 * POST /api/recommendations/rate-candidate
 * Submit user rating for a candidate film (updates cluster & profile weights).
 */
const rateCandidateFilm = async (req, res, next) => {
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
    next(error);
  }
};

/**
 * GET /api/recommendations/ranked
 * Fetch final ranked recommendations with "Why you'll like this" explanations and diversity guardrails.
 */
const getRankedRecommendations = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;

    const refresh =
      req.query.refresh === true ||
      req.query.refresh === 'true' ||
      req.query.forceRefresh === true ||
      req.query.forceRefresh === 'true';

    const rotate =
      req.query.rotate === true ||
      req.query.rotate === 'true';

    const query = userId ? { userId } : { sessionId };
    const profile = await UserTasteProfile.findOne(query).sort({ updatedAt: -1 });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No taste profile found. Complete onboarding first.',
      });
    }

    const recommendations = await recommendationEngine.generateRankedRecommendations(profile, { page, limit, refresh, rotate });

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
    next(error);
  }
};

/**
 * POST /api/recommendations/action
 * Log interaction action (shown, watchlisted, dismissed, watched) and update intent weights.
 */
const recordAction = async (req, res, next) => {
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
    next(error);
  }
};

/**
 * POST /api/recommendations/outcome
 * Record post-watch outcome verdict and apply high-signal profile learning.
 */
const recordOutcome = async (req, res, next) => {
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
    next(error);
  }
};

/**
 * GET /api/recommendations/telemetry-stats
 * Get recommendation quality metrics and hit-rate telemetry.
 */
const getTelemetryStats = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;

    const stats = await feedbackService.getRecommendationMetrics({ userId, sessionId });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/watchlist
 * Return all films the user has watchlisted, enriched with TMDB poster data.
 */
const getWatchlist = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;
    const query = userId ? { userId } : { sessionId };

    // Fetch interaction logs to determine current status (excluding watched or dismissed films)
    const logs = await RecommendationLog.find({
      ...query,
      action: { $in: ['watchlisted', 'watched', 'dismissed'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Deduplicate — keep only the most recent entry per tmdbId and include only if active
    const seen = new Set();
    const unique = [];
    logs.forEach((l) => {
      if (!seen.has(l.tmdbId)) {
        seen.add(l.tmdbId);
        if (l.action === 'watchlisted') {
          unique.push(l);
        }
      }
    });

    if (unique.length === 0) {
      return res.json({ success: true, watchlist: [] });
    }

    // Enrich with TMDB poster + year via batch fetch
    const enriched = await Promise.allSettled(
      unique.map(async (log) => {
        try {
          const { data } = await tmdb.get(`/movie/${log.tmdbId}`);
          return {
            tmdbId: log.tmdbId,
            title: data.title || log.title,
            year: data.release_date ? parseInt(data.release_date.split('-')[0]) : null,
            genres: (data.genres || []).map((g) => g.name).slice(0, 3),
            poster_path: data.poster_path || null,
            matchScore: log.matchScore,
            sourceClusterName: log.sourceClusterName,
            addedAt: log.createdAt,
          };
        } catch {
          return {
            tmdbId: log.tmdbId,
            title: log.title,
            year: null,
            genres: [],
            poster_path: null,
            matchScore: log.matchScore,
            sourceClusterName: log.sourceClusterName,
            addedAt: log.createdAt,
          };
        }
      })
    );

    const watchlist = enriched
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    res.json({ success: true, watchlist });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/diary
 * Return all films the user has marked as watched AND their foundational taste profile favorites,
 * with rating + TMDB poster data.
 */
const getDiary = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;
    const query = userId ? { userId } : { sessionId };

    // 1. Fetch watched recommendation logs
    const logs = await RecommendationLog.find({ ...query, action: 'watched' })
      .sort({ createdAt: -1 })
      .lean();

    // 2. Fetch taste profile favorites
    const profile = await UserTasteProfile.findOne(query).sort({ updatedAt: -1 }).lean();
    const favorites = Array.isArray(profile?.favorites) ? profile.favorites : [];

    const mapByTmdbId = new Map();

    // Process logs first
    logs.forEach((log) => {
      mapByTmdbId.set(Number(log.tmdbId), {
        tmdbId: Number(log.tmdbId),
        title: log.title,
        year: null,
        genres: [],
        poster_path: null,
        outcomeRating: log.outcomeRating,
        outcomeLabel: log.outcomeLabel || 'good',
        matchScore: log.matchScore,
        sourceClusterName: log.sourceClusterName,
        watchedAt: log.createdAt,
        isFavorite: false,
        source: 'watched',
      });
    });

    // Process favorites (mark existing or add new)
    favorites.forEach((fav) => {
      const id = Number(fav.tmdbId || fav.id);
      if (!id) return;

      const favRatingLabel =
        fav.ratingLabel ||
        (fav.rating === 4 ? 'great' : fav.rating === 3 ? 'good' : fav.rating === 2 ? 'okay' : fav.rating === 1 ? 'not for me' : 'good');

      if (mapByTmdbId.has(id)) {
        const existing = mapByTmdbId.get(id);
        existing.isFavorite = true;
        existing.favoriteRating = fav.rating;
        if (!existing.title && fav.title) existing.title = fav.title;
        if (!existing.year && fav.year) existing.year = fav.year;
        if (!existing.poster_path && fav.posterPath) existing.poster_path = fav.posterPath;
      } else {
        mapByTmdbId.set(id, {
          tmdbId: id,
          title: fav.title || `Film #${id}`,
          year: fav.year || null,
          genres: [],
          poster_path: fav.posterPath || null,
          outcomeRating: fav.rating !== undefined ? fav.rating : 3,
          outcomeLabel: favRatingLabel,
          matchScore: null,
          sourceClusterName: null,
          watchedAt: fav.addedAt || profile?.updatedAt || profile?.createdAt || new Date(),
          isFavorite: true,
          source: 'favorite',
        });
      }
    });

    const combinedList = Array.from(mapByTmdbId.values());

    if (combinedList.length === 0) return res.json({ success: true, diary: [] });

    // Enrich missing posters/titles/years via TMDB
    const enriched = await Promise.allSettled(
      combinedList.map(async (item) => {
        if (item.poster_path && item.title && !item.title.startsWith('Film #') && item.year) {
          return item;
        }
        try {
          const { data } = await tmdb.get(`/movie/${item.tmdbId}`);
          return {
            ...item,
            title: data.title || item.title,
            year: data.release_date ? parseInt(data.release_date.split('-')[0]) : item.year,
            genres: (data.genres || []).map((g) => g.name).slice(0, 3),
            poster_path: data.poster_path || item.poster_path,
          };
        } catch {
          return item;
        }
      })
    );

    const diary = enriched
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value)
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());

    res.json({ success: true, diary });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/recommendations/diary/:tmdbId
 * Remove a film from the user's diary / film logs and mark it as unwatched.
 */
const removeFromDiary = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId || req.body?.sessionId;
    const query = userId ? { userId } : { sessionId };
    const tmdbId = Number(req.params.tmdbId);

    if (!tmdbId || isNaN(tmdbId)) {
      return res.status(400).json({ success: false, message: 'Valid tmdbId parameter is required.' });
    }

    // 1. Delete all watched logs for this film
    await RecommendationLog.deleteMany({
      ...query,
      tmdbId,
      action: 'watched',
    });

    let clusters = null;
    let aiSynthesis = null;

    // 2. Fetch the user's taste profile
    const profile = await UserTasteProfile.findOne(query).sort({ updatedAt: -1 });

    if (profile) {
      const initialFavCount = (profile.favorites || []).length;
      const remainingFavorites = (profile.favorites || []).filter(
        (f) => Number(f.tmdbId || f.id) !== tmdbId
      );

      const wasFavorite = remainingFavorites.length !== initialFavCount;

      if (wasFavorite) {
        if (remainingFavorites.length > 0) {
          // Re-calculate clusters, centroid vectors, and globalCentroid with remaining favorites
          const rebuilt = await tasteClusterService.buildTasteProfileFromFavorites({
            userId,
            sessionId,
            genres: profile.selectedGenres,
            origins: profile.selectedOrigins,
            favorites: remainingFavorites,
          });
          clusters = rebuilt.clusters;
          aiSynthesis = rebuilt.aiSynthesis;
        } else {
          // User removed their last favorite
          profile.favorites = [];
          profile.tasteClusters = [];
          profile.globalCentroid = [];
          profile.cachedRecommendations = [];
          profile.cachedRecommendationsAt = null;
          await profile.save();
        }
      }

      // Remove only the deleted film from cached recommendations so remaining cached recommendations load instantly (<20ms)
      if (profile && Array.isArray(profile.cachedRecommendations)) {
        profile.cachedRecommendations = profile.cachedRecommendations.filter(
          (r) => Number(r.id || r.tmdbId) !== tmdbId
        );
        await profile.save();
      }
    }

    res.json({
      success: true,
      message: 'Film removed from film logs and marked as unwatched.',
      tmdbId,
      clusters,
      aiSynthesis,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCandidatePool,
  rateCandidateFilm,
  getRankedRecommendations,
  recordAction,
  recordOutcome,
  getTelemetryStats,
  getWatchlist,
  getDiary,
  removeFromDiary,
};
