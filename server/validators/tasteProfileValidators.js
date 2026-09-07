const { z } = require('zod');

const favoriteItemSchema = z.union([
  z.coerce.number().int().positive('TMDB ID must be a positive integer'),
  z.object({
    tmdbId: z.coerce.number().int().positive('TMDB ID must be a positive integer'),
    rating: z.coerce.number().int().min(0).max(4).optional().default(3),
    title: z.string().optional(),
    ratingLabel: z.string().optional(),
  }),
]);

const initializeTasteProfileSchema = z.object({
  genres: z.array(z.union([z.string(), z.number()])).max(30).optional().default([]),
  origins: z.array(z.string()).max(30).optional().default([]),
  favorites: z
    .array(favoriteItemSchema)
    .min(1, 'Please select at least 1 favorite film to initialize your taste profile')
    .max(50, 'A maximum of 50 favorite films can be submitted at once'),
  sessionId: z.string().max(100).optional(),
});

const updateFavoriteRatingSchema = z.object({
  tmdbId: z.coerce.number().int().positive('TMDB ID must be a positive integer'),
  rating: z.coerce
    .number()
    .int('Rating must be an integer')
    .min(0, 'Rating must be between 0 and 4')
    .max(4, 'Rating must be between 0 and 4'),
  title: z.string().max(200).optional(),
  sessionId: z.string().max(100).optional(),
});

const appendFavoritesSchema = z.object({
  favorites: z
    .array(favoriteItemSchema)
    .min(1, 'Please provide at least 1 new favorite film to append')
    .max(30, 'A maximum of 30 favorite films can be appended at once'),
  sessionId: z.string().max(100).optional(),
});

module.exports = {
  initializeTasteProfileSchema,
  updateFavoriteRatingSchema,
  appendFavoritesSchema,
};
