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
const { protect } = require('../middleware/authMiddleware');

const { validateRequest } = require('../middleware/validateRequest');
const {
  rateCandidateSchema,
  rankedRecommendationsQuerySchema,
  recordActionSchema,
  recordOutcomeSchema,
} = require('../validators/recommendationValidators');

// POST /api/recommendations/candidates
router.post('/candidates', protect, getCandidatePool);

// POST /api/recommendations/rate-candidate
router.post('/rate-candidate', protect, validateRequest(rateCandidateSchema), rateCandidateFilm);

// GET /api/recommendations/ranked
router.get('/ranked', protect, validateRequest(rankedRecommendationsQuerySchema, 'query'), getRankedRecommendations);

// POST /api/recommendations/action (log shown, watchlisted, dismissed)
router.post('/action', protect, validateRequest(recordActionSchema), recordAction);

// POST /api/recommendations/outcome (post-watch verdict rating)
router.post('/outcome', protect, validateRequest(recordOutcomeSchema), recordOutcome);

// GET /api/recommendations/telemetry-stats (hit-rate quality metrics)
router.get('/telemetry-stats', protect, getTelemetryStats);

// GET /api/recommendations/watchlist
router.get('/watchlist', protect, getWatchlist);

// GET /api/recommendations/diary
router.get('/diary', protect, getDiary);

module.exports = router;
