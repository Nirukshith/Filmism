const { z } = require('zod');

const batchDetailsSchema = z.object({
  ids: z
    .array(z.coerce.number().int().positive('Movie ID must be a positive integer'))
    .min(1, 'Please provide at least 1 movie ID')
    .max(100, 'Batch requests are limited to a maximum of 100 movie IDs at once'),
});

const batchProfileSchema = z.object({
  tmdbIds: z
    .array(z.coerce.number().int().positive('TMDB ID must be a positive integer'))
    .min(1, 'Please provide at least 1 movie ID')
    .max(50, 'Batch AI profiling is limited to a maximum of 50 movie IDs per request'),
});

const movieParamSchema = z.object({
  tmdbId: z.coerce.number().int().positive('TMDB ID must be a positive integer'),
});

module.exports = {
  batchDetailsSchema,
  batchProfileSchema,
  movieParamSchema,
};
