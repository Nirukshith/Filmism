const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const tmdb = require('../services/tmdbService');
const { CINEMA_NAME_TO_COUNTRY_CODE } = require('../utils/originMap');
const { protect } = require('../middleware/authMiddleware');
const {
  getMovieProfile,
  profileMovie,
  batchProfileMovies,
  getSimilarProfiledMovies,
  getAtlasIndexDefinition,
} = require('../controllers/movieProfileController');

// Rate limiter for TMDB proxy endpoints (search, discover, batch details)
const tmdbProxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // max 150 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search/discover requests. Please try again in a few minutes.',
  },
});

// Rate limiter for AI batch profiling
const aiProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 profiling triggers per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI profiling requests. Please try again in a few minutes.',
  },
});

// Get cinema origins — used in TasteProfile
router.get('/origins', (req, res) => {
  try {
    res.json(CINEMA_NAME_TO_COUNTRY_CODE);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch origins', error: err.message });
  }
});

const { GENRE_ID_TO_NAME, GENRE_NAME_TO_ID } = require('../utils/genreMap');
const {
  staticCache,
  discoverCache,
  searchCache,
  movieDetailCache,
  getOrSet,
} = require('../services/cacheService');

// Get genre list — cached in memory for 24 hours
router.get('/genres', async (req, res) => {
  try {
    const genreList = await getOrSet(staticCache, 'tmdb:genres', async () => {
      const { data } = await tmdb.get('/genre/movie/list');
      return (data.genres || []).map((g) => ({
        id: g.id,
        name: GENRE_ID_TO_NAME[g.id] || g.name,
        tmdbName: g.name,
      }));
    });
    res.json(genreList);
  } catch (err) {
    const fallbackList = Object.entries(GENRE_NAME_TO_ID).map(([name, id]) => ({ id, name }));
    res.json(fallbackList);
  }
});

// Discover movies by genre/origin/decade — cached in memory for 2 hours
router.get('/discover', tmdbProxyLimiter, async (req, res) => {
  try {
    let { with_genres, with_origin_country, release_date_gte, release_date_lte, decade } = req.query;
    const page = parseInt(req.query.page) || 1;

    if (with_genres) {
      // Map any genre names to IDs (e.g. "Musical|Sci-Fi" -> "10402|878")
      with_genres = with_genres
        .split('|')
        .map((g) => (isNaN(g) ? (GENRE_NAME_TO_ID[g] || g) : g))
        .filter(Boolean)
        .join('|');
    }

    let gte = release_date_gte;
    let lte = release_date_lte;

    if (decade) {
      if (decade === '2020s') {
        gte = '2020-01-01';
        lte = '2029-12-31';
      } else if (decade === '2010s') {
        gte = '2010-01-01';
        lte = '2019-12-31';
      } else if (decade === '2000s') {
        gte = '2000-01-01';
        lte = '2009-12-31';
      } else if (decade === '1990s') {
        gte = '1990-01-01';
        lte = '1999-12-31';
      } else if (decade === '1980s') {
        gte = '1980-01-01';
        lte = '1989-12-31';
      } else if (decade === 'classic') {
        lte = '1979-12-31';
      }
    }

    const cacheKey = `discover:${with_genres || 'all'}:${with_origin_country || 'all'}:${gte || 'none'}:${lte || 'none'}:${page}`;

    const data = await getOrSet(discoverCache, cacheKey, async () => {
      const response = await tmdb.get('/discover/movie', {
        params: {
          with_genres: with_genres || undefined,
          with_origin_country,
          'primary_release_date.gte': gte || undefined,
          'primary_release_date.lte': lte || undefined,
          page,
          sort_by: 'popularity.desc',
        },
      });
      return response.data;
    });

    res.json({
      results:     data.results,
      page:        data.page,
      total_pages: Math.min(data.total_pages, 50), // TMDB caps at 500 pages; we cap at 50
      total_results: data.total_results,
    });
  } catch (err) {
    const statusCode = err.isTimeout ? 504 : (err.response?.status && err.response.status < 500 ? err.response.status : 503);
    res.status(statusCode).json({
      success: false,
      message: err.isTimeout
        ? 'Movie discovery timed out. Please try again.'
        : 'Movie discovery service is currently unavailable. Please try again shortly.',
      error: err.message,
      results: [],
    });
  }
});

// Search movies — cached in memory for 30 minutes
router.get('/search', tmdbProxyLimiter, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.json([]);
    }

    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const results = await getOrSet(searchCache, cacheKey, async () => {
      const { data } = await tmdb.get('/search/movie', { params: { query } });
      return data.results || [];
    });

    res.json(results);
  } catch (err) {
    const statusCode = err.isTimeout ? 504 : (err.response?.status && err.response.status < 500 ? err.response.status : 503);
    res.status(statusCode).json({
      success: false,
      message: err.isTimeout
        ? 'Movie search timed out. Please try again.'
        : 'Movie search service is temporarily unreachable. Please try again.',
      error: err.message,
      results: [],
    });
  }
});

const { validateRequest } = require('../middleware/validateRequest');
const {
  batchDetailsSchema,
  batchProfileSchema,
  movieParamSchema,
} = require('../validators/movieValidators');

// Batch fetch movie details by IDs — cached in memory for 6 hours
router.post('/batch-details', tmdbProxyLimiter, validateRequest(batchDetailsSchema), async (req, res) => {
  try {
    const { ids } = req.body;

    const uniqueIds = Array.from(new Set(ids.map(Number))).filter(Boolean);
    const movieDetails = await Promise.allSettled(
      uniqueIds.map(async (id) => {
        return getOrSet(movieDetailCache, `movie:details:${id}`, async () => {
          const { data } = await tmdb.get(`/movie/${id}`);
          return {
            id: data.id,
            title: data.title,
            year: data.release_date ? parseInt(data.release_date.split('-')[0]) : 'N/A',
            genres: (data.genres || []).map((g) => g.name),
            cinema: data.origin_country?.[0] || 'Global',
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            c1: '#0d1b2a',
            c2: '#1e4d7b',
          };
        });
      })
    );

    const results = movieDetails
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);

    res.json(results);
  } catch (err) {
    console.error('Failed to fetch batch movie details:', err);
    res.status(503).json({
      success: false,
      message: 'Failed to fetch batch movie details from external service.',
      error: err.message,
      results: [],
    });
  }
});

// ── AI Movie Profiling & Caching Endpoints (Sprint 1) ──

// Retrieve Atlas Vector Search index definition helper
router.get('/atlas-vector-index-def', getAtlasIndexDefinition);

// Batch profile multiple movies (requires valid JWT auth + rate limited)
router.post('/batch-profile', protect, aiProfileLimiter, validateRequest(batchProfileSchema), batchProfileMovies);

// Retrieve cached movie profile
router.get('/profile/:tmdbId', validateRequest(movieParamSchema, 'params'), getMovieProfile);

// Profile a single movie (requires valid JWT auth + rate limited)
router.post('/profile/:tmdbId', protect, aiProfileLimiter, validateRequest(movieParamSchema, 'params'), profileMovie);

// Semantic similarity search for profiled movies
router.get('/similar-profiled/:tmdbId', validateRequest(movieParamSchema, 'params'), getSimilarProfiledMovies);

module.exports = router;