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

  test('should return different cached recommendations when rotate is true without querying TMDB', async () => {
    const mockClusters = [
      { clusterId: 'cluster_1', name: 'Cluster 1' },
      { clusterId: 'cluster_2', name: 'Cluster 2' },
    ];

    const mockProfile = {
      _id: 'user_taste_rot',
      userId: 'user_rot',
      tasteClusters: mockClusters,
      favorites: [],
      cachedRecommendations: [
        { id: 1, sourceClusterId: 'cluster_1', title: 'Film 1' },
        { id: 2, sourceClusterId: 'cluster_2', title: 'Film 2' },
        { id: 3, sourceClusterId: 'cluster_1', title: 'Film 3' },
        { id: 4, sourceClusterId: 'cluster_2', title: 'Film 4' },
        { id: 5, sourceClusterId: 'cluster_1', title: 'Film 5' },
        { id: 6, sourceClusterId: 'cluster_2', title: 'Film 6' },
        { id: 7, sourceClusterId: 'cluster_1', title: 'Film 7' },
        { id: 8, sourceClusterId: 'cluster_2', title: 'Film 8' },
        { id: 9, sourceClusterId: 'cluster_1', title: 'Film 9' },
        { id: 10, sourceClusterId: 'cluster_2', title: 'Film 10' },
        { id: 11, sourceClusterId: 'cluster_1', title: 'Film 11' },
        { id: 12, sourceClusterId: 'cluster_2', title: 'Film 12' },
        { id: 13, sourceClusterId: 'cluster_1', title: 'Film 13' },
        { id: 14, sourceClusterId: 'cluster_2', title: 'Film 14' },
      ],
      cachedRecommendationsAt: new Date(),
      seenRecommendationIds: [],
    };

    // First: standard retrieval (login 1)
    const recs1 = await recommendationEngine.generateRankedRecommendations(mockProfile, {
      limit: 4,
      rotate: false,
    });
    expect(candidatePoolService.fetchCandidatesForCluster).not.toHaveBeenCalled();
    const ids1 = recs1.map((r) => r.id);
    expect(ids1).toEqual([1, 2, 3, 4]);

    // Second: login 2 with rotate: true
    const recs2 = await recommendationEngine.generateRankedRecommendations(mockProfile, {
      limit: 4,
      rotate: true,
    });
    expect(candidatePoolService.fetchCandidatesForCluster).not.toHaveBeenCalled();
    const ids2 = recs2.map((r) => r.id);
    
    // The top recommendations should be rotated/different
    expect(ids2).not.toEqual(ids1);
    expect(UserTasteProfile.updateOne).toHaveBeenCalledWith(
      { _id: 'user_taste_rot' },
      expect.objectContaining({
        $set: expect.objectContaining({
          needsCacheRotation: false,
        }),
      })
    );
  });
});
