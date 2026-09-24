const candidatePoolService = require('../../services/candidatePoolService');
const MovieProfile = require('../../models/movieProfileModel');
const tmdb = require('../../services/tmdbService');

jest.mock('../../models/movieProfileModel');
jest.mock('../../services/tmdbService');

describe('Hybrid Candidate Pool Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return local MongoDB candidates via vector similarity without calling TMDB when pool is sufficient', async () => {
    const mockCluster = {
      clusterId: 'cluster_cinema_1',
      name: 'Neo-Noir & Mystery',
      centroidEmbedding: [0.5, 0.5],
      sourceFavoriteIds: [100],
    };

    const mockUserProfile = {
      selectedGenres: ['Mystery'],
      selectedOrigins: ['US'],
      favorites: [{ tmdbId: 100 }],
      seenRecommendationIds: [],
    };

    // Mock 5 local movies in MovieProfile
    const mockDbMovies = [
      {
        tmdbId: 101,
        title: 'Chinatown',
        genres: ['Mystery', 'Drama'],
        embedding: [0.5, 0.5], // similarity = 1.0
        posterPath: '/chinatown.jpg',
      },
      {
        tmdbId: 102,
        title: 'Memento',
        genres: ['Mystery', 'Thriller'],
        embedding: [0.48, 0.52], // high similarity
        posterPath: '/memento.jpg',
      },
      {
        tmdbId: 103,
        title: 'Se7en',
        genres: ['Mystery', 'Crime'],
        embedding: [0.49, 0.51], // high similarity
        posterPath: '/se7en.jpg',
      },
      {
        tmdbId: 104,
        title: 'Zodiac',
        genres: ['Mystery', 'Drama'],
        embedding: [0.51, 0.49], // high similarity
        posterPath: '/zodiac.jpg',
      },
    ];

    MovieProfile.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDbMovies),
    });

    const candidates = await candidatePoolService.fetchCandidatesForCluster(
      mockCluster,
      mockUserProfile,
      4,
      { refresh: false }
    );

    expect(candidates).toHaveLength(4);
    expect(candidates[0].title).toBe('Chinatown');
    expect(candidates[0].sourceClusterId).toBe('cluster_cinema_1');
    // TMDB should NOT have been queried for candidates synchronously
    expect(tmdb.get).not.toHaveBeenCalled();
  });

  test('should exclude seen and currently displayed IDs on refresh', async () => {
    const mockCluster = {
      clusterId: 'cluster_1',
      name: 'Sci-Fi',
      centroidEmbedding: [1.0, 0.0],
      sourceFavoriteIds: [],
    };

    const mockUserProfile = {
      selectedGenres: [],
      favorites: [],
      seenRecommendationIds: [201],
    };

    const mockDbMovies = [
      { tmdbId: 202, title: 'Arrival', genres: ['Sci-Fi'], embedding: [0.9, 0.1], posterPath: '/arr.jpg' },
      { tmdbId: 203, title: 'Solaris', genres: ['Sci-Fi'], embedding: [0.85, 0.15], posterPath: '/sol.jpg' },
    ];

    MovieProfile.find.mockImplementation((query) => {
      // Expect excluded tmdbIds to contain 201 (seen) and 205 (currently on screen)
      const nin = query.tmdbId.$nin;
      expect(nin).toContain(201);
      expect(nin).toContain(205);

      return {
        lean: jest.fn().mockResolvedValue(mockDbMovies),
      };
    });

    const candidates = await candidatePoolService.fetchCandidatesForCluster(
      mockCluster,
      mockUserProfile,
      2,
      { refresh: true, excludedIds: new Set([205]) }
    );

    expect(candidates.map((c) => c.tmdbId)).toEqual(expect.arrayContaining([202, 203]));
    expect(candidates.map((c) => c.tmdbId)).not.toContain(201);
    expect(candidates.map((c) => c.tmdbId)).not.toContain(205);
  });
});
