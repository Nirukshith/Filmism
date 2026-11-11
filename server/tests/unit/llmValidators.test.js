const {
  filmProfileLLMSchema,
  clusterItemSchema,
  tasteClustersLLMSchema,
} = require('../../validators/llmValidators');

describe('LLM Zod Output Validators Unit Tests', () => {
  describe('filmProfileLLMSchema', () => {
    it('should validate a full, complete film profile', () => {
      const input = {
        themes: ['Alienation', 'MORAL AMBIGUITY'],
        mood: ['Somber', 'Atmospheric'],
        narrativeStyle: ['Non-linear'],
        visualAesthetic: ['Neo-noir'],
        pacing: 'SLOW-BURN',
        emotionalTone: ['haunting'],
        characterArchetypes: ['cynical detective'],
        culturalTradition: 'French New Wave',
        aiSummary: 'A stark, reflective exploration of memory.',
      };

      const result = filmProfileLLMSchema.parse(input);
      expect(result.themes).toEqual(['alienation', 'moral ambiguity']);
      expect(result.mood).toEqual(['somber', 'atmospheric']);
      expect(result.pacing).toBe('slow-burn');
      expect(result.culturalTradition).toBe('French New Wave');
    });

    it('should leniently salvage a truncated profile with sensible defaults', () => {
      // Repaired JSON where model cut off after themes and pacing
      const truncatedSalvaged = {
        themes: ['dystopia', 'survival'],
        pacing: 'fast-paced',
      };

      const result = filmProfileLLMSchema.parse(truncatedSalvaged);
      expect(result.themes).toEqual(['dystopia', 'survival']);
      expect(result.pacing).toBe('fast-paced');
      expect(result.mood).toEqual([]);
      expect(result.visualAesthetic).toEqual([]);
      expect(result.aiSummary).toBe('');
      expect(result.culturalTradition).toBe('');
    });

    it('should fallback invalid pacing to moderate', () => {
      const input = {
        themes: ['sci-fi'],
        pacing: 'ultra-speedy-lightning',
      };
      const result = filmProfileLLMSchema.parse(input);
      expect(result.pacing).toBe('moderate');
    });

    it('should reject an empty object with no thematic/stylistic content', () => {
      const emptyInput = {};
      expect(() => filmProfileLLMSchema.parse(emptyInput)).toThrow();
    });
  });

  describe('tasteClustersLLMSchema', () => {
    it('should validate complete taste cluster output', () => {
      const input = {
        clusters: [
          {
            clusterId: 'c1',
            name: 'Neon Cyberpunk',
            description: 'Futuristic aesthetic with synthetic tones.',
            movieIds: [100, 200, 300],
          },
        ],
        overallTasteSynthesis: 'Cohesive interest in speculative worlds.',
      };

      const result = tasteClustersLLMSchema.parse(input);
      expect(result.clusters).toHaveLength(1);
      expect(result.clusters[0].movieIds).toEqual([100, 200, 300]);
      expect(result.overallTasteSynthesis).toBe('Cohesive interest in speculative worlds.');
    });

    it('should coerce string movie IDs to numeric values', () => {
      const input = {
        clusters: [
          {
            name: 'Slow Cinema',
            movieIds: ['101', '202', 'invalid_id'],
          },
        ],
      };

      const result = tasteClustersLLMSchema.parse(input);
      expect(result.clusters[0].movieIds).toEqual([101, 202]);
      expect(result.clusters[0].description).toBeDefined();
      expect(result.clusters[0].clusterId).toBeDefined();
    });

    it('should reject clusters payload if clusters array is empty', () => {
      const input = {
        clusters: [],
      };
      expect(() => tasteClustersLLMSchema.parse(input)).toThrow();
    });

    it('should reject clusters payload if all clusters have empty movieIds', () => {
      const input = {
        clusters: [
          {
            name: 'Empty Cluster',
            movieIds: [],
          },
        ],
      };
      expect(() => tasteClustersLLMSchema.parse(input)).toThrow();
    });
  });
});
