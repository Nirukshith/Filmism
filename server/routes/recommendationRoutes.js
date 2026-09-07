const express = require('express');
const router = express.Router();
const {
  getCandidatePool,
  rateCandidateFilm,
  getRankedRecommendations,
  recordAction,
  recordOutcome,
  getTelemetryStats,
  getWatchlist,
  getDiary,
} = require('../controllers/recommendationController');
const { optionalProtect } = require('../middleware/authMiddleware');

const { validateRequest } = require('../middleware/validateRequest');
const {
  rateCandidateSchema,
  rankedRecommendationsQuerySchema,
  recordActionSchema,
  recordOutcomeSchema,
} = require('../validators/recommendationValidators');

// POST /api/recommendations/candidates (Guest + Authenticated)
router.post('/candidates', optionalProtect, getCandidatePool);

// POST /api/recommendations/rate-candidate (Guest + Authenticated)
router.post('/rate-candidate', optionalProtect, validateRequest(rateCandidateSchema), rateCandidateFilm);

// GET /api/recommendations/ranked (Guest + Authenticated)
router.get('/ranked', optionalProtect, validateRequest(rankedRecommendationsQuerySchema, 'query'), getRankedRecommendations);

// POST /api/recommendations/action (log shown, watchlisted, dismissed)
router.post('/action', optionalProtect, validateRequest(recordActionSchema), recordAction);

// POST /api/recommendations/outcome (post-watch verdict rating)
router.post('/outcome', optionalProtect, validateRequest(recordOutcomeSchema), recordOutcome);

// GET /api/recommendations/telemetry-stats (hit-rate quality metrics)
router.get('/telemetry-stats', optionalProtect, getTelemetryStats);

// GET /api/recommendations/watchlist (Guest + Authenticated)
router.get('/watchlist', optionalProtect, getWatchlist);

// GET /api/recommendations/diary (Guest + Authenticated)
router.get('/diary', optionalProtect, getDiary);

module.exports = router;
