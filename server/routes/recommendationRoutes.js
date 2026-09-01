const express = require('express');
const router = express.Router();
const {
  getCandidatePool,
  rateCandidateFilm,
  getRankedRecommendations,
  recordAction,
  recordOutcome,
  getTelemetryStats,
} = require('../controllers/recommendationController');
const { optionalProtect } = require('../middleware/authMiddleware');

// POST /api/recommendations/candidates
router.post('/candidates', optionalProtect, getCandidatePool);

// POST /api/recommendations/rate-candidate
router.post('/rate-candidate', optionalProtect, rateCandidateFilm);

// GET /api/recommendations/ranked
router.get('/ranked', optionalProtect, getRankedRecommendations);

// POST /api/recommendations/action (log shown, watchlisted, dismissed)
router.post('/action', optionalProtect, recordAction);

// POST /api/recommendations/outcome (post-watch verdict rating)
router.post('/outcome', optionalProtect, recordOutcome);

// GET /api/recommendations/telemetry-stats (hit-rate quality metrics)
router.get('/telemetry-stats', optionalProtect, getTelemetryStats);

module.exports = router;
