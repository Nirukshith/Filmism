/**
 * Calculate Cosine Similarity between two numeric vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized embeddings).
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) {
    // If dimension mismatch, truncate to smaller or return 0
    const minLen = Math.min(vecA.length, vecB.length);
    vecA = vecA.slice(0, minLen);
    vecB = vecB.slice(0, minLen);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compute the average centroid vector for a list of vectors.
 */
function calculateCentroid(vectors) {
  if (!vectors || vectors.length === 0) return [];
  const validVectors = vectors.filter((v) => Array.isArray(v) && v.length > 0);
  if (validVectors.length === 0) return [];

  const dim = validVectors[0].length;
  const centroid = new Array(dim).fill(0);

  validVectors.forEach((vec) => {
    for (let i = 0; i < dim; i++) {
      centroid[i] += vec[i] || 0;
    }
  });

  const count = validVectors.length;
  const averaged = centroid.map((val) => val / count);

  // Normalize centroid vector
  const norm = Math.sqrt(averaged.reduce((sum, val) => sum + val * val, 0)) || 1;
  return averaged.map((val) => val / norm);
}

/**
 * Rank an array of items by cosine similarity to a target vector.
 */
function rankByCosineSimilarity(targetVector, items, getVectorFn = (item) => item.embedding) {
  if (!targetVector || !items || items.length === 0) return [];

  return items
    .map((item) => {
      const vec = getVectorFn(item);
      const similarity = cosineSimilarity(targetVector, vec);
      return { item, similarity: Number(similarity.toFixed(4)) };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Build MongoDB Atlas $vectorSearch aggregation pipeline stage.
 * Index name in Atlas: "movie_vector_index"
 */
function buildAtlasVectorSearchPipeline({
  queryVector,
  path = 'embedding',
  index = 'movie_vector_index',
  numCandidates = 100,
  limit = 20,
  filter = null,
}) {
  const vectorSearchStage = {
    $vectorSearch: {
      index,
      path,
      queryVector,
      numCandidates,
      limit,
    },
  };

  if (filter) {
    vectorSearchStage.$vectorSearch.filter = filter;
  }

  return [
    vectorSearchStage,
    {
      $project: {
        tmdbId: 1,
        title: 1,
        releaseYear: 1,
        posterPath: 1,
        backdropPath: 1,
        overview: 1,
        genres: 1,
        originCountries: 1,
        director: 1,
        cast: 1,
        profile: 1,
        aiSummary: 1,
        similarityScore: { $meta: 'vectorSearchScore' },
      },
    },
  ];
}

module.exports = {
  cosineSimilarity,
  calculateCentroid,
  rankByCosineSimilarity,
  buildAtlasVectorSearchPipeline,
};
