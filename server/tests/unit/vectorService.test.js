const {
  cosineSimilarity,
  calculateCentroid,
  rankByCosineSimilarity,
  buildAtlasVectorSearchPipeline,
  buildTasteProfileVectorSearchPipeline,
  MOVIE_VECTOR_INDEX_DEF,
  TASTE_PROFILE_VECTOR_INDEX_DEF,
} = require('../../services/vectorService');

describe('Vector Service Unit Tests', () => {
  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const vecA = [0.6, 0.8];
      const vecB = [0.6, 0.8];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
    });

    it('should return 0.0 for orthogonal vectors', () => {
      const vecA = [1.0, 0.0];
      const vecB = [0.0, 1.0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
    });

    it('should return -1.0 for opposite vectors', () => {
      const vecA = [1.0, 0.0];
      const vecB = [-1.0, 0.0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
    });

    it('should return 0 for empty or null vectors', () => {
      expect(cosineSimilarity([], [1, 2])).toBe(0);
      expect(cosineSimilarity(null, [1, 2])).toBe(0);
      expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    });

    it('should handle dimension truncation on vector length mismatch gracefully', () => {
      const vecA = [1.0, 0.0, 0.5];
      const vecB = [1.0, 0.0];
      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(1.0, 4);
    });
  });

  describe('calculateCentroid', () => {
    it('should calculate and normalize the average vector', () => {
      const vectors = [
        [1.0, 0.0],
        [0.0, 1.0],
      ];
      const centroid = calculateCentroid(vectors);
      expect(centroid).toHaveLength(2);
      // Normalized sum should equal 1
      const norm = Math.sqrt(centroid[0] ** 2 + centroid[1] ** 2);
      expect(norm).toBeCloseTo(1.0, 5);
      expect(centroid[0]).toBeCloseTo(centroid[1], 5);
    });

    it('should return empty array for empty inputs', () => {
      expect(calculateCentroid([])).toEqual([]);
      expect(calculateCentroid(null)).toEqual([]);
    });
  });

  describe('rankByCosineSimilarity', () => {
    it('should sort items in descending order of similarity', () => {
      const target = [1.0, 0.0];
      const items = [
        { id: 'film_orthogonal', embedding: [0.0, 1.0] },
        { id: 'film_identical', embedding: [1.0, 0.0] },
        { id: 'film_close', embedding: [0.9, 0.1] },
      ];

      const ranked = rankByCosineSimilarity(target, items);
      expect(ranked[0].item.id).toBe('film_identical');
      expect(ranked[1].item.id).toBe('film_close');
      expect(ranked[2].item.id).toBe('film_orthogonal');
    });
  });

  describe('buildAtlasVectorSearchPipeline', () => {
    it('should construct a valid MongoDB $vectorSearch aggregation pipeline', () => {
      const pipeline = buildAtlasVectorSearchPipeline({
        queryVector: [0.1, 0.2, 0.3],
        limit: 10,
        filter: { releaseYear: { $gte: 2000 } },
      });

      expect(pipeline).toHaveLength(2);
      expect(pipeline[0].$vectorSearch).toBeDefined();
      expect(pipeline[0].$vectorSearch.limit).toBe(10);
      expect(pipeline[0].$vectorSearch.filter).toEqual({ releaseYear: { $gte: 2000 } });
      expect(pipeline[1].$project.similarityScore).toBeDefined();
    });
  });

  describe('buildTasteProfileVectorSearchPipeline', () => {
    it('should construct a valid pipeline targeting taste_profile_vector_index with matchingEnabled filter', () => {
      const pipeline = buildTasteProfileVectorSearchPipeline({
        queryVector: [0.5, 0.5],
        excludeUserId: 'user_123',
        limit: 5,
      });

      expect(pipeline).toHaveLength(2);
      expect(pipeline[0].$vectorSearch.index).toBe('taste_profile_vector_index');
      expect(pipeline[0].$vectorSearch.path).toBe('globalCentroid');
      expect(pipeline[0].$vectorSearch.filter).toEqual({
        matchingEnabled: true,
        onboardingStage: 'complete',
        userId: { $ne: 'user_123' },
      });
      expect(pipeline[1].$project.userId).toBe(1);
      expect(pipeline[1].$project.tasteClusters).toBe(1);
      expect(pipeline[1].$project.similarityScore).toEqual({ $meta: 'vectorSearchScore' });
    });
  });

  describe('Atlas Index Definitions', () => {
    it('should provide valid MOVIE_VECTOR_INDEX_DEF and TASTE_PROFILE_VECTOR_INDEX_DEF structures', () => {
      expect(MOVIE_VECTOR_INDEX_DEF.name).toBe('movie_vector_index');
      expect(MOVIE_VECTOR_INDEX_DEF.definition.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'embedding', type: 'vector', similarity: 'cosine' }),
        ])
      );

      expect(TASTE_PROFILE_VECTOR_INDEX_DEF.name).toBe('taste_profile_vector_index');
      expect(TASTE_PROFILE_VECTOR_INDEX_DEF.collectionName).toBe('usertasteprofiles');
      expect(TASTE_PROFILE_VECTOR_INDEX_DEF.definition.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'globalCentroid', type: 'vector', similarity: 'cosine' }),
          expect.objectContaining({ path: 'matchingEnabled', type: 'filter' }),
          expect.objectContaining({ path: 'onboardingStage', type: 'filter' }),
        ])
      );
    });
  });
});

