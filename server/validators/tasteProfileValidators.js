const { z } = require('zod');

const favoriteItemSchema = z.preprocess(
  (val) => {
    if (typeof val === 'number') return { tmdbId: val, rating: 3 };
    if (typeof val === 'string' && !isNaN(Number(val))) return { tmdbId: Number(val), rating: 3 };
    if (typeof val === 'object' && val !== null) {
      const rawId = val.tmdbId || val.id;
      const numericId = Number(rawId);
      return {
        tmdbId: isNaN(numericId) ? undefined : numericId,
        rating: val.rating !== undefined && !isNaN(Number(val.rating)) ? Number(val.rating) : 3,
        title: val.title,
        ratingLabel: val.ratingLabel,
      };
    }
    return val;
  },
  z.object({
    tmdbId: z.number().int().positive('TMDB ID must be a positive integer'),
    rating: z.number().int().min(0).max(4).optional().default(3),
    title: z.string().optional(),
    ratingLabel: z.string().optional(),
  })
);

const initializeTasteProfileSchema = z.object({
  genres: z.array(z.union([z.string(), z.number()])).max(100).optional().default([]),
  origins: z.array(z.union([z.string(), z.number()])).max(100).optional().default([]),
  favorites: z
    .array(favoriteItemSchema)
    .min(1, 'Please select at least 1 favorite film to initialize your taste profile')
    .max(200, 'A maximum of 200 favorite films can be submitted at once'),
  sessionId: z.string().max(150).optional(),
});

const updateFavoriteRatingSchema = z.object({
  tmdbId: z.coerce.number().int().positive('TMDB ID must be a positive integer'),
  rating: z.coerce
    .number()
    .int('Rating must be an integer')
    .min(0, 'Rating must be between 0 and 4')
    .max(4, 'Rating must be between 0 and 4'),
  title: z.string().max(250).optional(),
  sessionId: z.string().max(150).optional(),
});

const appendFavoritesSchema = z.object({
  favorites: z
    .array(favoriteItemSchema)
    .min(1, 'Please provide at least 1 new favorite film to append')
    .max(100, 'A maximum of 100 favorite films can be appended at once'),
  sessionId: z.string().max(150).optional(),
});

module.exports = {
  initializeTasteProfileSchema,
  updateFavoriteRatingSchema,
  appendFavoritesSchema,
};

