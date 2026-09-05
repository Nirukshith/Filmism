const tmdb = require('./tmdbService');
const MovieProfile = require('../models/movieProfileModel');
const aiService = require('./aiService');
const vectorService = require('./vectorService');

/**
 * Fetch rich metadata from TMDB for a given movie ID (including director, cast, keywords).
 */
async function fetchTmdbMovieDetails(tmdbId) {
  const { data } = await tmdb.get(`/movie/${tmdbId}`, {
    params: { append_to_response: 'credits,keywords' },
  });

  const director =
    data.credits?.crew?.find((c) => c.job === 'Director')?.name ||
    data.credits?.crew?.find((c) => c.department === 'Directing')?.name ||
    'Unknown';

  const cast = (data.credits?.cast || []).slice(0, 8).map((c) => c.name);

  // TMDB keywords may come in `keywords.keywords` or `keywords.results`
  const rawKeywords = data.keywords?.keywords || data.keywords?.results || [];
  const keywords = rawKeywords.map((k) => k.name);

  const releaseYear = data.release_date ? parseInt(data.release_date.split('-')[0], 10) : undefined;
  const genres = (data.genres || []).map((g) => g.name);
  const originCountries = data.origin_country || (data.production_countries || []).map((c) => c.iso_3166_1);

  return {
    tmdbId: data.id,
    title: data.title,
    releaseYear,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    overview: data.overview,
    genres,
    originCountries,
    director,
    cast,
    keywords,
  };
}

/**
 * Asynchronously enrich a movie profile with deep LLM analysis in the background.
 */
async function enrichMovieWithAiBackground(numericId, rawData) {
  try {
    const profileOutput = await aiService.analyzeFilm(rawData);
    const enrichedData = {
      ...rawData,
      profile: profileOutput,
      aiSummary: profileOutput.aiSummary || rawData.overview,
    };
    const embeddingString = aiService.buildEmbeddingString(enrichedData);
    const { embedding, model } = await aiService.createEmbedding(embeddingString);

    await MovieProfile.findOneAndUpdate(
      { tmdbId: numericId },
      {
        ...enrichedData,
        embedding,
        embeddingModel: model,
        isProfiled: true,
      },
      { upsert: true }
    );
  } catch (err) {
    // Fail silently in background
  }
}

/**
 * Retrieve an existing profiled movie from MongoDB cache, or profile it and cache it.
 * FastMode generates instant heuristic profiles (<10ms) and enriches via AI in the background.
 */
async function getOrProfileMovie(tmdbId, forceReProfile = false, fastMode = true) {
  const numericId = Number(tmdbId);
  if (isNaN(numericId)) {
    throw new Error(`Invalid TMDB ID: ${tmdbId}`);
  }

  // 1. Check MongoDB Cache
  if (!forceReProfile) {
    const cached = await MovieProfile.findOne({ tmdbId: numericId });
    if (cached && cached.profile && cached.embedding && cached.embedding.length > 0) {
      return { profile: cached, fromCache: true };
    }
  }

  // 2. Fetch raw details from TMDB
  const rawData = await fetchTmdbMovieDetails(numericId);

  if (fastMode) {
    // Fast synchronous heuristic profiling for instant response
    const profileOutput = aiService.generateHeuristicProfile(rawData);
    const enrichedData = {
      ...rawData,
      profile: profileOutput,
      aiSummary: profileOutput.aiSummary || rawData.overview,
    };
    const embeddingString = aiService.buildEmbeddingString(enrichedData);
    const embedding = aiService.generateHeuristicEmbedding(embeddingString, 768);

    const savedProfile = await MovieProfile.findOneAndUpdate(
      { tmdbId: numericId },
      {
        ...enrichedData,
        embedding,
        embeddingModel: 'heuristic-token-hash-768',
        isProfiled: false, // will be enriched in background
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Queue deep AI enrichment in background without blocking
    enrichMovieWithAiBackground(numericId, rawData);

    return { profile: savedProfile, fromCache: false };
  }

  // 3. Deep AI profiling (when fastMode is false)
  const profileOutput = await aiService.analyzeFilm(rawData);

  // 4. Construct embedding string & generate dense vector
  const enrichedData = {
    ...rawData,
    profile: profileOutput,
    aiSummary: profileOutput.aiSummary || rawData.overview,
  };

  const embeddingString = aiService.buildEmbeddingString(enrichedData);
  const { embedding, model } = await aiService.createEmbedding(embeddingString);

  // 5. Persist to MongoDB (Upsert)
  const savedProfile = await MovieProfile.findOneAndUpdate(
    { tmdbId: numericId },
    {
      ...enrichedData,
      embedding,
      embeddingModel: model,
      isProfiled: true,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return { profile: savedProfile, fromCache: false };
}

/**
 * Batch profile a list of TMDB movie IDs with parallel concurrency.
 */
async function batchGetOrProfileMovies(tmdbIds, concurrency = 8) {
  if (!Array.isArray(tmdbIds) || tmdbIds.length === 0) {
    return [];
  }

  const numericIds = tmdbIds.map((id) => Number(id)).filter((id) => !isNaN(id));
  const uniqueIds = Array.from(new Set(numericIds));

  // 1. Fetch already cached profiles in a single query
  const cachedProfiles = await MovieProfile.find({
    tmdbId: { $in: uniqueIds },
    'embedding.0': { $exists: true },
  });

  const profileMap = new Map();
  cachedProfiles.forEach((doc) => profileMap.set(doc.tmdbId, doc));

  const missingIds = uniqueIds.filter((id) => !profileMap.has(id));

  // 2. Profile missing films concurrently in fast mode
  if (missingIds.length > 0) {
    for (let i = 0; i < missingIds.length; i += concurrency) {
      const chunk = missingIds.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        chunk.map((id) => getOrProfileMovie(id, false, true))
      );

      results.forEach((res, index) => {
        const id = chunk[index];
        if (res.status === 'fulfilled' && res.value?.profile) {
          profileMap.set(id, res.value.profile);
        } else {
          console.error(`Failed to profile movie ${id}:`, res.reason?.message || res.reason);
        }
      });
    }
  }

  // Return in original requested order
  return numericIds.map((id) => profileMap.get(id)).filter(Boolean);
}

/**
 * Find similar profiled movies using semantic vector similarity.
 */
async function findSimilarProfiledMovies(tmdbId, limit = 10) {
  const { profile: target } = await getOrProfileMovie(tmdbId);
  if (!target || !target.embedding || target.embedding.length === 0) {
    throw new Error('Target movie has no embedding vector.');
  }

  // Try Atlas Vector Search if available, otherwise in-memory ranking over existing collection
  try {
    const pipeline = vectorService.buildAtlasVectorSearchPipeline({
      queryVector: target.embedding,
      limit: limit + 1,
    });
    const atlasResults = await MovieProfile.aggregate(pipeline);
    if (atlasResults && atlasResults.length > 0) {
      return atlasResults.filter((m) => m.tmdbId !== target.tmdbId).slice(0, limit);
    }
  } catch (atlasErr) {
    // Expected fallback if Vector Search index is not yet configured in Atlas UI
  }

  // Fallback: In-memory cosine similarity ranking over profiled movies
  const allProfiles = await MovieProfile.find({
    tmdbId: { $ne: target.tmdbId },
    'embedding.0': { $exists: true },
  }).lean();

  const ranked = vectorService.rankByCosineSimilarity(target.embedding, allProfiles, (m) => m.embedding);

  return ranked.slice(0, limit).map((r) => ({
    ...r.item,
    similarityScore: r.similarity,
  }));
}

module.exports = {
  fetchTmdbMovieDetails,
  getOrProfileMovie,
  batchGetOrProfileMovies,
  findSimilarProfiledMovies,
};
