const express = require('express');
const router = express.Router();
const tmdb = require('../services/tmdbService');
const { CINEMA_NAME_TO_COUNTRY_CODE } = require('../utils/originMap');
const {
  getMovieProfile,
  profileMovie,
  batchProfileMovies,
  getSimilarProfiledMovies,
  getAtlasIndexDefinition,
} = require('../controllers/movieProfileController');

// Get cinema origins — used in TasteProfile
router.get('/origins', (req, res) => {
  try {
    res.json(CINEMA_NAME_TO_COUNTRY_CODE);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch origins', error: err.message });
  }
});

const { GENRE_ID_TO_NAME, GENRE_NAME_TO_ID } = require('../utils/genreMap');

// Get genre list — used in TasteProfile
router.get('/genres', async (req, res) => {
  try {
    const { data } = await tmdb.get('/genre/movie/list');
    const genreList = (data.genres || []).map((g) => ({
      id: g.id,
      name: GENRE_ID_TO_NAME[g.id] || g.name,
      tmdbName: g.name,
    }));
    res.json(genreList);
  } catch (err) {
    const fallbackList = Object.entries(GENRE_NAME_TO_ID).map(([name, id]) => ({ id, name }));
    res.json(fallbackList);
  }
});

// Discover movies by genre/origin — used in TasteProfile film picker
router.get('/discover', async (req, res) => {
  try {
    let { with_genres, with_origin_country } = req.query;
    const page = parseInt(req.query.page) || 1;

    if (with_genres) {
      // Map any genre names to IDs (e.g. "Musical|Sci-Fi" -> "10402|878")
      with_genres = with_genres
        .split('|')
        .map((g) => (isNaN(g) ? (GENRE_NAME_TO_ID[g] || g) : g))
        .filter(Boolean)
        .join('|');
    }

    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres: with_genres || undefined, with_origin_country, page, sort_by: 'popularity.desc' },
    });

    res.json({
      results:     data.results,
      page:        data.page,
      total_pages: Math.min(data.total_pages, 50), // TMDB caps at 500 pages; we cap at 50
      total_results: data.total_results,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to discover movies', error: err.message });
  }
});

// Search movies — used in favourite films picker
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const { data } = await tmdb.get('/search/movie', { params: { query } });
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to search movies', error: err.message });
  }
});

// Batch fetch movie details by IDs — ensures all selected film titles are displayed
router.post('/batch-details', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json([]);
    }

    const uniqueIds = Array.from(new Set(ids.map(Number))).filter(Boolean);
    const movieDetails = await Promise.allSettled(
      uniqueIds.map(async (id) => {
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
      })
    );

    const results = movieDetails
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);

    res.json(results);
  } catch (err) {
    console.error('Failed to fetch batch movie details:', err);
    res.status(500).json({ message: 'Failed to fetch batch movie details', error: err.message });
  }
});

// ── AI Movie Profiling & Caching Endpoints (Sprint 1) ──

// Retrieve Atlas Vector Search index definition helper
router.get('/atlas-vector-index-def', getAtlasIndexDefinition);

// Batch profile multiple movies (used when user selects 20-30 favorites)
router.post('/batch-profile', batchProfileMovies);

// Retrieve cached movie profile
router.get('/profile/:tmdbId', getMovieProfile);

// Profile a single movie (cached if already exists, or generated on-demand)
router.post('/profile/:tmdbId', profileMovie);

// Semantic similarity search for profiled movies
router.get('/similar-profiled/:tmdbId', getSimilarProfiledMovies);

module.exports = router;