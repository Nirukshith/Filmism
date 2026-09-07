const {
  initializeTasteProfileSchema,
  updateFavoriteRatingSchema,
  appendFavoritesSchema,
} = require('../../validators/tasteProfileValidators');
const {
  registerSchema,
  loginSchema,
} = require('../../validators/authValidators');
const {
  batchDetailsSchema,
} = require('../../validators/movieValidators');
const {
  rateCandidateSchema,
  rankedRecommendationsQuerySchema,
  recordActionSchema,
} = require('../../validators/recommendationValidators');

describe('Taste Profile Validators', () => {
  describe('initializeTasteProfileSchema', () => {
    it('should validate a complete onboarding payload with numeric origins', () => {
      const payload = {
        genres: ['Sci-Fi', 'Thriller'],
        origins: [1, 2],
        favorites: [
          { tmdbId: 603, rating: 4 },
          { tmdbId: 157336, rating: 3, title: 'Interstellar' },
        ],
        sessionId: 'session_test_123',
      };
      const parsed = initializeTasteProfileSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      expect(parsed.data.favorites).toHaveLength(2);
      expect(parsed.data.favorites[0].tmdbId).toBe(603);
      expect(parsed.data.favorites[0].rating).toBe(4);
    });

    it('should preprocess raw numeric ID or object with { id } in favorites', () => {
      const payload = {
        genres: ['Drama'],
        origins: ['Hollywood'],
        favorites: [550, { id: 27205, rating: 4 }],
      };
      const parsed = initializeTasteProfileSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      expect(parsed.data.favorites[0].tmdbId).toBe(550);
      expect(parsed.data.favorites[0].rating).toBe(3); // default rating
      expect(parsed.data.favorites[1].tmdbId).toBe(27205);
      expect(parsed.data.favorites[1].rating).toBe(4);
    });

    it('should reject an empty favorites array', () => {
      const payload = {
        genres: ['Action'],
        origins: [1],
        favorites: [],
      };
      const parsed = initializeTasteProfileSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      const issues = parsed.error?.issues || [];
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain('Please select at least 1 favorite film');
    });

    it('should reject invalid rating values outside 0-4 range', () => {
      const payload = {
        genres: ['Action'],
        origins: [1],
        favorites: [{ tmdbId: 100, rating: 10 }],
      };
      const parsed = initializeTasteProfileSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe('updateFavoriteRatingSchema', () => {
    it('should accept valid rating updates and coerce string IDs', () => {
      const payload = { tmdbId: '603', rating: '4', title: 'The Matrix' };
      const parsed = updateFavoriteRatingSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      expect(parsed.data.tmdbId).toBe(603);
      expect(parsed.data.rating).toBe(4);
    });

    it('should reject ratings greater than 4', () => {
      const payload = { tmdbId: 603, rating: 5 };
      const parsed = updateFavoriteRatingSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe('appendFavoritesSchema', () => {
    it('should validate new favorites to append', () => {
      const payload = {
        favorites: [{ tmdbId: 807, rating: 4 }],
        sessionId: 'session_abc',
      };
      const parsed = appendFavoritesSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      expect(parsed.data.favorites[0].tmdbId).toBe(807);
    });
  });
});

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('should accept valid registration data with first and last name', () => {
      const payload = {
        firstName: 'Cinephile',
        lastName: 'Watcher',
        email: 'user@filmism.app',
        password: 'Password123!',
      };
      const parsed = registerSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const payload = {
        firstName: 'First',
        lastName: 'Last',
        email: 'invalid-email-address',
        password: 'Password123!',
      };
      const parsed = registerSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      const issues = parsed.error?.issues || [];
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain('valid email');
    });

    it('should reject short passwords', () => {
      const payload = {
        firstName: 'First',
        lastName: 'Last',
        email: 'valid@filmism.app',
        password: '123',
      };
      const parsed = registerSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const payload = { email: 'test@filmism.app', password: 'secretpassword' };
      const parsed = loginSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('should reject missing password', () => {
      const payload = { email: 'test@filmism.app' };
      const parsed = loginSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });
});

describe('Movie Validators', () => {
  it('should validate batchDetailsSchema and coerce numeric string IDs', () => {
    const payload = { ids: ['603', 157336, 27205] };
    const parsed = batchDetailsSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    expect(parsed.data.ids).toEqual([603, 157336, 27205]);
  });

  it('should reject empty batch request', () => {
    const payload = { ids: [] };
    const parsed = batchDetailsSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});

describe('Recommendation Validators', () => {
  it('should validate rateCandidateSchema', () => {
    const payload = {
      tmdbId: 603,
      rating: 4,
      sourceClusterId: 'cluster_neo_noir',
    };
    const parsed = rateCandidateSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    expect(parsed.data.rating).toBe(4);
  });

  it('should validate recordActionSchema and enforce valid action types', () => {
    const valid = { tmdbId: 603, action: 'watchlisted', matchScore: 0.92 };
    expect(recordActionSchema.safeParse(valid).success).toBe(true);

    const invalid = { tmdbId: 603, action: 'invalid_action_type' };
    expect(recordActionSchema.safeParse(invalid).success).toBe(false);
  });

  it('should coerce boolean and numbers in rankedRecommendationsQuerySchema', () => {
    const query = { page: '2', limit: '20', refresh: 'true' };
    const parsed = rankedRecommendationsQuerySchema.safeParse(query);
    expect(parsed.success).toBe(true);
    expect(parsed.data.page).toBe(2);
    expect(parsed.data.limit).toBe(20);
    expect(parsed.data.refresh).toBe(true);
  });
});
