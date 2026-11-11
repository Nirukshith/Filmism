const { z } = require('zod');

const ALLOWED_PACING = ['slow-burn', 'moderate', 'fast-paced', 'frenetic'];

/**
 * Preprocessor for string arrays:
 * Accepts arrays or comma/newline separated strings, strips empties, and lowercases.
 */
const stringArraySchema = z.preprocess((val) => {
  if (Array.isArray(val)) {
    return val
      .map((item) => (item != null ? String(item).trim().toLowerCase() : ''))
      .filter((item) => item.length > 0);
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return [val.trim().toLowerCase()];
  }
  return [];
}, z.array(z.string()).default([]));

/**
 * Schema for Film Aesthetic Analysis LLM output (aiService.js)
 */
const filmProfileLLMSchema = z
  .object({
    themes: stringArraySchema,
    mood: stringArraySchema,
    narrativeStyle: stringArraySchema,
    visualAesthetic: stringArraySchema,
    pacing: z
      .preprocess((val) => {
        const s = String(val || '').toLowerCase().trim();
        return ALLOWED_PACING.includes(s) ? s : 'moderate';
      }, z.enum(['slow-burn', 'moderate', 'fast-paced', 'frenetic']))
      .default('moderate'),
    emotionalTone: stringArraySchema,
    characterArchetypes: stringArraySchema,
    culturalTradition: z
      .preprocess((val) => {
        if (typeof val === 'string' && val.trim().length > 0) return val.trim();
        return '';
      }, z.string())
      .default(''),
    aiSummary: z
      .preprocess((val) => {
        if (typeof val === 'string' && val.trim().length > 0) return val.trim();
        return '';
      }, z.string())
      .default(''),
  })
  .refine(
    (data) => {
      // Must contain at least some minimal meaningful profile data
      return (
        data.themes.length > 0 ||
        data.mood.length > 0 ||
        data.visualAesthetic.length > 0 ||
        data.narrativeStyle.length > 0 ||
        data.aiSummary.length > 0
      );
    },
    {
      message: 'Repaired LLM profile has no valid themes, mood, aesthetic, or summary',
    }
  );

/**
 * Sub-schema for an individual taste cluster
 */
const clusterItemSchema = z.object({
  clusterId: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
      return `cluster_${Math.random().toString(36).substring(2, 9)}`;
    }, z.string())
    .default(() => `cluster_${Math.random().toString(36).substring(2, 9)}`),
  name: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
      return 'Cinematic Aesthetic Affinity';
    }, z.string())
    .default('Cinematic Aesthetic Affinity'),
  description: z
    .preprocess((val) => {
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
      return 'Films connected by shared narrative texture, visual atmosphere, and tone.';
    }, z.string())
    .default('Films connected by shared narrative texture, visual atmosphere, and tone.'),
  movieIds: z
    .preprocess((val) => {
      if (Array.isArray(val)) {
        return val.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
      }
      return [];
    }, z.array(z.number()))
    .default([]),
});

/**
 * Schema for Taste Clustering LLM output (tasteClusterService.js)
 */
const tasteClustersLLMSchema = z
  .object({
    clusters: z.array(clusterItemSchema).min(1, 'Clusters array must not be empty'),
    overallTasteSynthesis: z
      .preprocess((val) => {
        if (typeof val === 'string' && val.trim().length > 0) return val.trim();
        return 'A diverse cinematic taste spanning multiple aesthetic traditions and storytelling styles.';
      }, z.string())
      .default('A diverse cinematic taste spanning multiple aesthetic traditions and storytelling styles.'),
  })
  .refine(
    (data) => {
      // At least one cluster must contain assigned movie IDs
      return data.clusters.some((c) => Array.isArray(c.movieIds) && c.movieIds.length > 0);
    },
    {
      message: 'Clusters must contain at least one valid movie ID assignment',
    }
  );

module.exports = {
  filmProfileLLMSchema,
  clusterItemSchema,
  tasteClustersLLMSchema,
};
