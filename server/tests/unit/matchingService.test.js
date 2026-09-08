const mongoose = require('mongoose');
const {
  computeExplainability,
  formatMatchResponse,
  findCinephileTwin,
  getCurrentMatch,
} = require('../../services/matchingService');
const UserTasteProfile = require('../../models/userTasteProfileModel');
const User = require('../../models/userModel');
const Match = require('../../models/matchModel');
const Block = require('../../models/blockModel');
const vectorService = require('../../services/vectorService');

jest.mock('../../models/userTasteProfileModel');
jest.mock('../../models/userModel');
jest.mock('../../models/matchModel');
jest.mock('../../models/blockModel');

describe('Matching Service Unit Tests (Phase 3)', () => {
  beforeEach(() => {
    Block.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('computeExplainability', () => {
    it('should correctly calculate similarity, shared clusters, shared favorites, and recommendations', () => {
      const userAId = new mongoose.Types.ObjectId();
      const userBId = new mongoose.Types.ObjectId();

      const profileA = {
        userId: userAId,
        globalCentroid: [1.0, 0.0],
        tasteClusters: [
          {
            name: 'Neo-Noir & Crime',
            weight: 0.6,
            centroidEmbedding: [1.0, 0.0],
          },
          {
            name: 'Slow Cinema',
            weight: 0.4,
            centroidEmbedding: [0.0, 1.0],
          },
        ],
        favorites: [
          { tmdbId: 680, title: 'Pulp Fiction', posterPath: '/pulp.jpg', rating: 4 },
          { tmdbId: 77, title: 'Memento', posterPath: '/memento.jpg', rating: 4 },
        ],
      };

      const profileB = {
        userId: userBId,
        globalCentroid: [0.95, 0.05],
        tasteClusters: [
          {
            name: 'Neo-Noir Thrillers',
            weight: 0.7,
            centroidEmbedding: [1.0, 0.0], // Identical vector
          },
        ],
        favorites: [
          { tmdbId: 680, title: 'Pulp Fiction', posterPath: '/pulp.jpg', rating: 4 },
          { tmdbId: 550, title: 'Fight Club', posterPath: '/fight.jpg', rating: 4 },
        ],
      };

      const explainability = computeExplainability(profileA, profileB);

      expect(explainability.similarityScore).toBeGreaterThanOrEqual(90);
      expect(explainability.sharedClusters).toHaveLength(1);
      expect(explainability.sharedClusters[0].clusterName).toBe('Neo-Noir & Crime');
      expect(explainability.sharedClusters[0].overlapScore).toBe(100);

      // Shared favorite: Pulp Fiction (tmdbId 680)
      expect(explainability.sharedFavorites).toHaveLength(1);
      expect(explainability.sharedFavorites[0].tmdbId).toBe(680);
      expect(explainability.sharedFavorites[0].title).toBe('Pulp Fiction');

      // Recommended film: Fight Club (tmdbId 550) which B has but A doesn't
      expect(explainability.recommendedFilm).toBeDefined();
      expect(explainability.recommendedFilm.tmdbId).toBe(550);
      expect(explainability.recommendedFilm.title).toBe('Fight Club');
      expect(explainability.recommendedFilm.recommendedBy).toEqual(userBId);
    });
  });

  describe('findCinephileTwin eligibility and errors', () => {
    it('should throw 404 if user taste profile does not exist', async () => {
      UserTasteProfile.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const fakeUserId = new mongoose.Types.ObjectId();
      await expect(findCinephileTwin(fakeUserId)).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('not found'),
      });
    });

    it('should throw 403 if matching is not enabled for requesting user', async () => {
      UserTasteProfile.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          userId: new mongoose.Types.ObjectId(),
          matchingEnabled: false,
          onboardingStage: 'complete',
          globalCentroid: [1, 0],
        }),
      });

      const fakeUserId = new mongoose.Types.ObjectId();
      await expect(findCinephileTwin(fakeUserId)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('matching is disabled'),
      });
    });

    it('should throw 400 if onboarding stage is not complete or globalCentroid is empty', async () => {
      UserTasteProfile.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          userId: new mongoose.Types.ObjectId(),
          matchingEnabled: true,
          onboardingStage: 'favorites_selected',
          globalCentroid: [],
        }),
      });

      const fakeUserId = new mongoose.Types.ObjectId();
      await expect(findCinephileTwin(fakeUserId)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('taste centroid'),
      });
    });
  });

  describe('findCinephileTwin matching execution', () => {
    it('should find a candidate, compute explainability, save match, and return formatted response', async () => {
      const userAId = new mongoose.Types.ObjectId('111111111111111111111111');
      const userBId = new mongoose.Types.ObjectId('222222222222222222222222');

      const requestingProfile = {
        userId: userAId,
        matchingEnabled: true,
        onboardingStage: 'complete',
        globalCentroid: [1.0, 0.0],
        tasteClusters: [{ name: 'Sci-Fi', weight: 0.8, centroidEmbedding: [1.0, 0.0] }],
        favorites: [{ tmdbId: 603, title: 'The Matrix', rating: 4 }],
      };

      const twinProfile = {
        userId: userBId,
        matchingEnabled: true,
        onboardingStage: 'complete',
        globalCentroid: [0.98, 0.02],
        tasteClusters: [{ name: 'Cyberpunk Sci-Fi', weight: 0.9, centroidEmbedding: [1.0, 0.0] }],
        favorites: [
          { tmdbId: 603, title: 'The Matrix', rating: 4 },
          { tmdbId: 335984, title: 'Blade Runner 2049', rating: 4 },
        ],
      };

      UserTasteProfile.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(requestingProfile),
      });

      Match.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      // Mock vector search aggregate throwing/returning empty to test fallback
      UserTasteProfile.aggregate = jest.fn().mockResolvedValue([]);

      UserTasteProfile.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([twinProfile]),
      });

      const fakeMatchRecord = {
        _id: new mongoose.Types.ObjectId(),
        userA: userAId,
        userB: userBId,
        similarityScore: 98,
        sharedClusters: [
          {
            clusterName: 'Sci-Fi',
            userAWeight: 0.8,
            userBWeight: 0.9,
            overlapScore: 100,
          },
        ],
        sharedFavorites: [{ tmdbId: 603, title: 'The Matrix' }],
        recommendedFilm: { tmdbId: 335984, title: 'Blade Runner 2049' },
        createdAt: new Date(),
      };

      Match.create.mockResolvedValue(fakeMatchRecord);

      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: userBId,
            firstName: 'Sarah',
            profilePicture: 'https://example.com/sarah.jpg',
          }),
        }),
      });

      const result = await findCinephileTwin(userAId);

      expect(result).toBeDefined();
      expect(result.similarityScore).toBe(98);
      expect(result.twin.firstName).toBe('Sarah');
      expect(result.twin.profilePicture).toBe('https://example.com/sarah.jpg');
      expect(result.sharedFavorites).toHaveLength(1);
      expect(result.sharedFavorites[0].title).toBe('The Matrix');
      expect(Match.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentMatch', () => {
    it('should return null when no matches exist', async () => {
      Match.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await getCurrentMatch(new mongoose.Types.ObjectId());
      expect(result).toBeNull();
    });

    it('should return formatted match when match exists', async () => {
      const userAId = new mongoose.Types.ObjectId();
      const userBId = new mongoose.Types.ObjectId();

      const fakeMatch = {
        _id: new mongoose.Types.ObjectId(),
        userA: userAId,
        userB: userBId,
        similarityScore: 92,
        sharedClusters: [],
        sharedFavorites: [{ tmdbId: 680, title: 'Pulp Fiction' }],
        createdAt: new Date(),
      };

      Match.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(fakeMatch),
        }),
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: userBId,
            firstName: 'David',
            profilePicture: null,
          }),
        }),
      });

      const result = await getCurrentMatch(userAId);
      expect(result).toBeDefined();
      expect(result.similarityScore).toBe(92);
      expect(result.twin.firstName).toBe('David');
    });
  });

  describe('formatMatchResponse privacy safeguards', () => {
    it('should NOT leak sensitive fields (email, sessionId, password)', () => {
      const userAId = new mongoose.Types.ObjectId();
      const userBId = new mongoose.Types.ObjectId();

      const matchDoc = {
        _id: new mongoose.Types.ObjectId(),
        userA: userAId,
        userB: userBId,
        similarityScore: 95,
        createdAt: new Date(),
        sharedClusters: [],
        sharedFavorites: [],
      };

      const partnerUser = {
        _id: userBId,
        firstName: 'Elena',
        email: 'elena@secret.com',
        sessionId: 'session_sensitive_999',
        password: 'hashed_password',
      };

      const formatted = formatMatchResponse(matchDoc, userAId, partnerUser);

      expect(formatted.twin.firstName).toBe('Elena');
      expect(formatted.twin.email).toBeUndefined();
      expect(formatted.twin.sessionId).toBeUndefined();
      expect(formatted.twin.password).toBeUndefined();
    });
  });
});
