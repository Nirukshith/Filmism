const recommendationEngine = require('../../services/recommendationEngine');
const candidatePoolService = require('../../services/candidatePoolService');
const UserTasteProfile = require('../../models/userTasteProfileModel');
const RecommendationLog = require('../../models/recommendationLogModel');
const MovieProfile = require('../../models/movieProfileModel');

jest.mock('../../services/candidatePoolService');
jest.mock('../../models/userTasteProfileModel');
jest.mock('../../models/recommendationLogModel');
jest.mock('../../models/movieProfileModel');

describe('Recommendation Refresh Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RecommendationLog.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
    MovieProfile.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    UserTasteProfile.updateOne.mockReturnValue({
      catch: jest.fn(),
    });
  });

  test('should exclude previously cached recommendations when forceRefresh is true', async () => {
    const mockProfile = {
      _id: 'user_taste_1',
      userId: 'user_1',
      tasteClusters: [
        {
          clusterId: 'cluster_1',
          name: 'Sci-Fi & Thriller',
          centroidEmbedding: [0.1, 0.2],
          topThemes: [{ tag: 'space', weight: 1.0 }],
          topMoods: [],
          topVisuals: [],
        },
      ],
      favorites: [{ tmdbId: 101, title: 'Inception', rating: 4 }],
      cachedRecommendations: [
        { id: 201, tmdbId: 201, title: 'Interstellar' },
        { id: 202, tmdbId: 202, title: 'Tenet' },
      ],
      cachedRecommendationsAt: new Date(),
      seenRecommendationIds: [201, 202],
    };

    candidatePoolService.fetchCandidatesForCluster.mockImplementation(async (cluster, profile, count, options) => {
      expect(options.refresh).toBe(true);
      expect(options.excludedIds.has(201)).toBe(true);
      expect(options.excludedIds.has(202)).toBe(true);

      // Return candidate films that include a new film (301) and an old film (201)
      return [
        {
          tmdbId: 301,
          title: 'Blade Runner 2049',
          releaseYear: 2017,
          genres: ['Science Fiction'],
          originCountries: ['US'],
          embedding: [0.1, 0.2],
        },
        {
          tmdbId: 201,
          title: 'Interstellar',
          releaseYear: 2014,
          genres: ['Science Fiction'],
          originCountries: ['US'],
          embedding: [0.1, 0.2],
        },
      ];
    });

    const recommendations = await recommendationEngine.generateRankedRecommendations(mockProfile, {
      refresh: true,
      limit: 12,
    });

    // The refreshed recommendations should contain the new film and NOT the previous list film (201)
    const returnedIds = recommendations.map((r) => r.id || r.tmdbId);
    expect(returnedIds).toContain(301);
    expect(returnedIds).not.toContain(201);
  });
});
