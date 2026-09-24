const mongoose = require('mongoose');
const Match = require('../../models/matchModel');
const UserTasteProfile = require('../../models/userTasteProfileModel');

describe('Match & TasteProfile Schema Unit Tests (Phase 1)', () => {
  describe('UserTasteProfile matching fields', () => {
    it('should have matchingEnabled default to false and matchingOptedInAt to null', () => {
      const profile = new UserTasteProfile({
        sessionId: 'test_session_123',
      });

      expect(profile.matchingEnabled).toBe(false);
      expect(profile.matchingOptedInAt).toBeNull();
    });

    it('should allow setting matchingEnabled to true with a timestamp', () => {
      const optInDate = new Date();
      const profile = new UserTasteProfile({
        userId: new mongoose.Types.ObjectId(),
        matchingEnabled: true,
        matchingOptedInAt: optInDate,
      });

      expect(profile.matchingEnabled).toBe(true);
      expect(profile.matchingOptedInAt).toEqual(optInDate);
    });
  });

  describe('Match model schema and validation', () => {
    it('should create a valid Match document with required and nested fields', () => {
      const userA = new mongoose.Types.ObjectId();
      const userB = new mongoose.Types.ObjectId();

      const matchDoc = new Match({
        userA,
        userB,
        similarityScore: 94.5,
        sharedClusters: [
          {
            clusterName: 'Neo-Noir & Crime Thrillers',
            userAWeight: 0.85,
            userBWeight: 0.90,
            overlapScore: 0.88,
          },
        ],
        sharedFavorites: [
          {
            tmdbId: 680,
            title: 'Pulp Fiction',
            posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
            year: 1994,
          },
        ],
        recommendedFilm: {
          tmdbId: 77,
          title: 'Memento',
          posterPath: '/yuWy09jhR0Xv60iN32v483n.jpg',
          year: 2000,
          recommendedBy: userA,
        },
      });

      const err = matchDoc.validateSync();
      expect(err).toBeUndefined();
      expect(matchDoc.userA).toEqual(userA);
      expect(matchDoc.userB).toEqual(userB);
      expect(matchDoc.similarityScore).toBe(94.5);
      expect(matchDoc.sharedClusters).toHaveLength(1);
      expect(matchDoc.sharedFavorites).toHaveLength(1);
      expect(matchDoc.recommendedFilm.tmdbId).toBe(77);
    });

    it('should fail validation when required fields (userA, userB, similarityScore) are missing', () => {
      const emptyMatch = new Match({});
      const err = emptyMatch.validateSync();

      expect(err).toBeDefined();
      expect(err.errors.userA).toBeDefined();
      expect(err.errors.userB).toBeDefined();
      expect(err.errors.similarityScore).toBeDefined();
    });

    it('should fail validation when sharedCluster or sharedFavorite missing required properties', () => {
      const invalidMatch = new Match({
        userA: new mongoose.Types.ObjectId(),
        userB: new mongoose.Types.ObjectId(),
        similarityScore: 80,
        sharedClusters: [{ userAWeight: 0.5 }], // missing clusterName
        sharedFavorites: [{ posterPath: '/path.jpg' }], // missing tmdbId and title
      });

      const err = invalidMatch.validateSync();
      expect(err).toBeDefined();
      expect(err.errors['sharedClusters.0.clusterName']).toBeDefined();
      expect(err.errors['sharedFavorites.0.tmdbId']).toBeDefined();
      expect(err.errors['sharedFavorites.0.title']).toBeDefined();
    });
  });
});
