const express = require('express');
const router = express.Router();
const tmdb = require('../services/tmdbService');

// Get genre list — used in TasteProfile
router.get('/genres', async (req, res) => {
  try {
    const { data } = await tmdb.get('/genre/movie/list');
    res.json(data.genres);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch genres', error: err.message });
  }
});

// Discover movies by genre/origin — used in DeepDive
router.get('/discover', async (req, res) => {
  try {
    const { with_genres, with_origin_country, page } = req.query;
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres, with_origin_country, page: page || 1, sort_by: 'popularity.desc' }
    });
    res.json(data.results);
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

module.exports = router;