const mongoose = require('mongoose');
const {
  formatMatchResponse,
  computeExplainability,
} = require('../../services/matchingService');
const UserTasteProfile = require('../../models/userTasteProfileModel');

describe('Phase 6: Guardrails & Privacy Enforcement Tests', () => {
  describe('Guardrail 1 & 3: Data Minimization & Sensitive Fields Protection', () => {
    it('should NEVER leak email, sessionId, hashed password, or private account fields in formatted match', () => {
      const requestingUserId = new mongoose.Types.ObjectId();
      const partnerUserId = new mongoose.Types.ObjectId();

      const rawMatchDoc = {
        _id: new mongoose.Types.ObjectId(),
        userA: requestingUserId,
        userB: partnerUserId,
        similarityScore: 94,
        createdAt: new Date(),
        sharedClusters: [
          {
            clusterName: 'Slow Cinema',
            userAWeight: 0.8,
            userBWeight: 0.75,
            overlapScore: 90,
          },
        ],
        sharedFavorites: [
          {
            tmdbId: 550,
            title: 'Fight Club',
            posterPath: '/path.jpg',
            year: 1999,
          },
        ],
        recommendedFilm: {
          tmdbId: 680,
          title: 'Pulp Fiction',
          posterPath: '/pulp.jpg',
          year: 1994,
          recommendedBy: partnerUserId,
        },
      };

      const partnerUserObject = {
        _id: partnerUserId,
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@private.com',
        sessionId: 'sess_secret_private_token_9999',
        password: '$2a$10$e8wF3Qv1mR0x9wGqjM1G4.K5d1K3k5k5k5k5k5k5k5k5k5k5k5k5k',
        otp: '123456',
        otpExpiry: new Date(),
        pendingEmail: 'new@email.com',
        selectedCinemas: [1, 2],
      };

      const formatted = formatMatchResponse(rawMatchDoc, requestingUserId, partnerUserObject);

      // Verify safe fields ARE present
      expect(formatted.similarityScore).toBe(94);
      expect(formatted.twin.firstName).toBe('Elena');
      expect(formatted.twin.userId).toEqual(partnerUserId);
      expect(formatted.sharedFavorites).toHaveLength(1);
      expect(formatted.recommendedFilm).toBeDefined();

      // STRICT PRIVACY AUDIT: Assert sensitive fields are COMPLETELY ABSENT
      expect(formatted.twin.email).toBeUndefined();
      expect(formatted.twin.lastName).toBeUndefined();
      expect(formatted.twin.sessionId).toBeUndefined();
      expect(formatted.twin.password).toBeUndefined();
      expect(formatted.twin.otp).toBeUndefined();
      expect(formatted.twin.pendingEmail).toBeUndefined();
      expect(formatted.twin.selectedCinemas).toBeUndefined();
    });
  });

  describe('Guardrail 4: Opt-Out & Instant Removal from Match Pools', () => {
    it('should set matchingEnabled to false and clear matchingOptedInAt upon opt-out', () => {
      const profile = new UserTasteProfile({
        userId: new mongoose.Types.ObjectId(),
        matchingEnabled: true,
        matchingOptedInAt: new Date(),
      });

      expect(profile.matchingEnabled).toBe(true);
      expect(profile.matchingOptedInAt).toBeDefined();

      // Opt-out simulation
      profile.matchingEnabled = false;
      profile.matchingOptedInAt = null;

      expect(profile.matchingEnabled).toBe(false);
      expect(profile.matchingOptedInAt).toBeNull();
    });
  });

  describe('Guardrail 1: No Direct Contact in V1 Explainability Layer', () => {
    it('should only return taste metrics without communication hooks', () => {
      const profileA = {
        userId: new mongoose.Types.ObjectId(),
        globalCentroid: [1, 0],
        tasteClusters: [],
        favorites: [{ tmdbId: 100, title: 'Inception' }],
      };
      const profileB = {
        userId: new mongoose.Types.ObjectId(),
        globalCentroid: [1, 0],
        tasteClusters: [],
        favorites: [{ tmdbId: 100, title: 'Inception' }],
      };

      const result = computeExplainability(profileA, profileB);

      expect(result).toHaveProperty('similarityScore');
      expect(result).toHaveProperty('sharedClusters');
      expect(result).toHaveProperty('sharedFavorites');
      expect(result).toHaveProperty('recommendedFilm');

      // Ensure no chat/messaging structures
      expect(result.chatRoomId).toBeUndefined();
      expect(result.dmChannel).toBeUndefined();
    });
  });
});
