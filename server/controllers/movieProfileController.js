const movieProfilingService = require('../services/movieProfilingService');
const MovieProfile = require('../models/movieProfileModel');

/**
 * GET /api/movies/profile/:tmdbId
 * Retrieve a cached movie profile or return 404 if not yet profiled.
 */
const getMovieProfile = async (req, res) => {
  try {
    const { tmdbId } = req.params;
    const profile = await MovieProfile.findOne({ tmdbId: Number(tmdbId) });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `Movie profile for TMDB ID ${tmdbId} not found in cache. Call POST /api/movies/profile/${tmdbId} to profile it.`,
      });
    }

    res.json({
      success: true,
      profile,
      fromCache: true,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/movies/profile/:tmdbId
 * Profile a single movie (fetch from cache if exists, otherwise generate & persist).
 */
const profileMovie = async (req, res) => {
  try {
    const { tmdbId } = req.params;
    const forceReProfile = req.query.force === 'true';

    const { profile, fromCache } = await movieProfilingService.getOrProfileMovie(tmdbId, forceReProfile);

    res.json({
      success: true,
      fromCache,
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/movies/batch-profile
 * Body: { tmdbIds: [105, 807, 335984] }
 * Profile multiple movies with caching and concurrency control.
 */
const batchProfileMovies = async (req, res) => {
  try {
    const { tmdbIds } = req.body;

    if (!Array.isArray(tmdbIds) || tmdbIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: tmdbIds must be a non-empty array of movie IDs.',
      });
    }

    const profiles = await movieProfilingService.batchGetOrProfileMovies(tmdbIds);

    res.json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/movies/similar-profiled/:tmdbId
 * Returns top semantically similar movies from the profiled database.
 */
const getSimilarProfiledMovies = async (req, res) => {
  try {
    const { tmdbId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    const similar = await movieProfilingService.findSimilarProfiledMovies(tmdbId, limit);

    res.json({
      success: true,
      count: similar.length,
      results: similar,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/movies/atlas-vector-index-def
 * Return MongoDB Atlas Vector Search configuration JSON.
 */
const getAtlasIndexDefinition = (req, res) => {
  const indexDefinition = {
    name: 'movie_vector_index',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: 768, // or 1536 depending on model
          similarity: 'cosine',
        },
        {
          type: 'filter',
          path: 'isProfiled',
        },
        {
          type: 'filter',
          path: 'genres',
        },
      ],
    },
  };

  res.json({
    instructions: 'Create this Vector Search index on the "movieprofiles" collection in MongoDB Atlas under the Search / Vector Search tab.',
    indexDefinition,
  });
};

module.exports = {
  getMovieProfile,
  profileMovie,
  batchProfileMovies,
  getSimilarProfiledMovies,
  getAtlasIndexDefinition,
};
