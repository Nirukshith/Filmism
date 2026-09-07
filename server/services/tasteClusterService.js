const movieProfilingService = require('./movieProfilingService');
const vectorService = require('./vectorService');
const UserTasteProfile = require('../models/userTasteProfileModel');
const User = require('../models/userModel');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || '').trim();

const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS, 10) || 10000;

let geminiClient = null;
let openaiClient = null;
let openrouterClient = null;

if (OPENROUTER_KEY) {
  try {
    openrouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_KEY,
      timeout: AI_TIMEOUT_MS,
      maxRetries: 2,
      defaultHeaders: {
        'HTTP-Referer': 'https://filmism.app',
        'X-Title': 'Filmism',
      },
    });
  } catch (err) {
    console.warn('OpenRouter client init warning:', err.message);
  }
}

if (GEMINI_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (err) {
    console.warn('Gemini client init warning:', err.message);
  }
}
if (OPENAI_KEY) {
  try {
    openaiClient = new OpenAI({
      apiKey: OPENAI_KEY,
      timeout: AI_TIMEOUT_MS,
      maxRetries: 2,
    });
  } catch (err) {
    console.warn('OpenAI client init warning:', err.message);
  }
}

/**
 * Execute an async operation bounded by a strict timeout.
 */
async function executeWithTimeout(promiseFactory, timeoutMs = AI_TIMEOUT_MS, label = 'AI Clustering') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${timeoutMs}ms`);
      err.isTimeout = true;
      reject(err);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promiseFactory(), timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Retry helper for transient failures with exponential backoff.
 */
async function retryWithBackoff(fn, maxRetries = 1, baseDelayMs = 400, label = 'AI Clustering') {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[${label}] Transient failure (${err.message}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}


const RATING_MULTIPLIERS = {
  4: 1.4, // great
  3: 1.0, // good
  2: 0.6, // okay
  1: 0.2, // not for me
  0: 0.8, // haven't watched / default
};

/**
 * Synthesize distinct, evocative cinephile personas using a rich aesthetic taxonomy.
 * Disambiguates names to ensure every persona in a user's profile is uniquely identifiable.
 */
function deriveClusterName(films, existingNames = []) {
  if (!films || films.length === 0) {
    return {
      name: 'Eclectic Cinematic Taste',
      description: 'A rich and diverse selection across varied cinematic traditions.',
    };
  }

  const genreCounts = {};
  const themeCounts = {};
  const moodCounts = {};
  const visualCounts = {};
  const originCounts = {};

  films.forEach((f) => {
    (f.genres || []).forEach((g) => {
      const name = typeof g === 'string' ? g : g.name;
      if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
    });
    (f.profile?.themes || []).forEach((t) => {
      if (t) themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
    (f.profile?.mood || []).forEach((m) => {
      if (m) moodCounts[m] = (moodCounts[m] || 0) + 1;
    });
    (f.profile?.visualAesthetic || []).forEach((v) => {
      if (v) visualCounts[v] = (visualCounts[v] || 0) + 1;
    });
    (f.originCountries || []).forEach((c) => {
      if (c) originCounts[c] = (originCounts[c] || 0) + 1;
    });
  });

  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const sortedThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const sortedVisuals = Object.entries(visualCounts).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  const topGenre = sortedGenres[0] || 'Drama';
  const secondGenre = sortedGenres[1] || '';
  const topMood = sortedMoods[0] || 'Atmospheric';
  const topTheme = sortedThemes[0] || 'Human Condition';

  let name = '';
  let description = '';

  const hasG = (g) => sortedGenres.includes(g);
  const hasM = (m) => sortedMoods.some((item) => item.toLowerCase().includes(m.toLowerCase()));
  const hasT = (t) => sortedThemes.some((item) => item.toLowerCase().includes(t.toLowerCase()));

  // 1. Curated Aesthetic Combinations
  if (hasG('Science Fiction')) {
    if (hasM('dystopian') || hasT('cybernetic') || hasT('technological')) {
      name = 'Cyberpunk & Dystopian Futurism';
      description = 'Explores hyper-technological landscapes, neon-lit urban decay, and the blurred boundaries between human consciousness and synthetic machines.';
    } else if (hasM('contemplative') || hasT('existential') || hasT('cosmic')) {
      name = 'Cerebral Sci-Fi & Existential Inquiry';
      description = 'Anchored in profound philosophical questions, quiet cosmic scale, and speculative narratives about the fate of human existence.';
    } else if (hasG('Action') || hasG('Adventure')) {
      name = 'Visionary Sci-Fi Spectacle';
      description = 'High-concept speculative universe-building filled with kinetic momentum, epic stakes, and imaginative futurism.';
    } else {
      name = 'Speculative Worldbuilding & Mind-Bending Sci-Fi';
      description = 'Provocative concept-driven cinema that tests the boundaries of time, memory, and speculative futures.';
    }
  } else if (hasG('Romance') && hasG('Comedy')) {
    if (hasM('whimsical') || hasT('playful')) {
      name = 'Whimsical Romance & Witty Banter';
      description = 'Celebrates sparkling character chemistry, witty dialogue, and endearing misunderstandings wrapped in warm, uplifting storytelling.';
    } else {
      name = 'Bittersweet Romantic Dramedy';
      description = 'Balances playful wit with touching vulnerability, portraying the messy nuances and unexpected tenderness of modern romance.';
    }
  } else if (hasG('Romance') && (hasG('Drama') || hasM('melancholic') || hasM('bittersweet'))) {
    name = 'Poetic Melancholy & Intimate Longing';
    description = 'Gentle, emotionally luminous portraits of unspoken desire, fleeting connection, and the bittersweet passage of time.';
  } else if (hasG('Crime') || hasG('Mystery')) {
    if (hasM('tense') || hasM('cynical') || hasT('moral ambiguity')) {
      name = 'Gritty Neo-Noir & Moral Ambiguity';
      description = 'Defined by hard-boiled detectives, shadowy urban streets, moral compromise, and slow-burning investigative suspense.';
    } else if (hasG('Thriller')) {
      name = 'High-Stakes Psychological Crime';
      description = 'Taut, labyrinthine crime plots where psychological cat-and-mouse tension escalates with relentless precision.';
    } else {
      name = 'Atmospheric Whodunit & Unfolding Mystery';
      description = 'Intricate, puzzle-box investigations driven by methodical deduction, hidden motives, and atmospheric intrigue.';
    }
  } else if (hasG('Horror')) {
    if (hasM('unsettling') || hasM('haunting') || hasT('trauma') || hasT('dread')) {
      name = 'Atmospheric Dread & Psychological Horror';
      description = 'Creeping, slow-burn psychological tension and haunting imagery that unnerves through atmosphere rather than cheap shocks.';
    } else {
      name = 'Visceral Supernatural & Macabre Terror';
      description = 'High-octane gothic fear, sinister mythology, and visceral struggles against relentless supernatural forces.';
    }
  } else if (hasG('Comedy') && (hasG('Drama') || hasT('satire') || hasM('wry'))) {
    name = 'Satirical Character Dramedy & Social Irony';
    description = 'Sharp observations on human absurdity and social friction, blending deadpan humor with poignant emotional undercurrents.';
  } else if (hasG('Drama')) {
    if (hasT('coming of age') || hasT('innocence') || hasM('tender') || hasM('poignant')) {
      name = 'Poignant Coming-of-Age & Lyrical Realism';
      description = 'Intimate character journeys capturing the bittersweet ache of youth, memory, self-discovery, and formative change.';
    } else if (hasT('family') || hasT('interpersonal') || hasM('somber')) {
      name = 'Intimate Family Chronicles & Human Resilience';
      description = 'Grounded, deeply empathetic character studies examining the quiet strength, fragility, and bonds of human relationships.';
    } else {
      name = 'Grounded Humanism & Emotionally Raw Drama';
      description = 'Nuanced, naturalistic storytelling focused on complex moral choices, personal reckoning, and authentic human emotion.';
    }
  } else if (hasG('Action') || hasG('Thriller')) {
    name = 'High-Octane Kinetic Action & Visceral Thrills';
    description = 'Electrifying momentum, precision stuntcraft, and adrenaline-fueled set pieces designed for peak cinematic immersion.';
  } else if (hasG('Animation')) {
    name = 'Enchanting Animation & Visionary Worldcraft';
    description = 'Imaginative visual poetry and heartfelt allegorical wonder that transcends age and convention.';
  } else if (hasG('Documentary')) {
    name = 'Compelling Verite & Investigative Inquiries';
    description = 'Illuminating, uncompromising examinations of human truth, subcultures, and historical revelations.';
  } else {
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    name = `${cap(topMood)} ${topGenre} Sensibilities`;
    description = `An expressive cluster spotlighting ${topMood.toLowerCase()} atmospheres with rich ${topTheme.toLowerCase()} storytelling.`;
  }

  // Disambiguate if name already exists in this profile
  let disambiguatedName = name;
  let counter = 2;
  while (existingNames.includes(disambiguatedName)) {
    if (secondGenre) {
      disambiguatedName = `${name} (${secondGenre} Focus)`;
    } else {
      disambiguatedName = `${name} Vol. ${counter++}`;
    }
  }

  return {
    name: disambiguatedName,
    description,
  };
}

/**
 * Enhanced heuristic clustering algorithm using K-Means++ seed selection.
 * Dynamically produces 1 to 4 cohesive clusters based on semantic vector distance.
 */
function heuristicClusterFilms(profiledFilms) {
  if (!profiledFilms || profiledFilms.length === 0) return [];

  if (profiledFilms.length <= 3) {
    const singleName = deriveClusterName(profiledFilms);
    return [
      {
        clusterId: 'cluster_1',
        name: singleName.name,
        description: singleName.description,
        movieIds: profiledFilms.map((f) => f.tmdbId),
      },
    ];
  }

  // Determine ideal number of clusters K based on film count & vector spread
  let k = 2;
  if (profiledFilms.length >= 7) {
    k = Math.min(4, Math.floor(profiledFilms.length / 2));
  } else if (profiledFilms.length >= 5) {
    let maxDist = 0;
    for (let i = 0; i < profiledFilms.length; i++) {
      for (let j = i + 1; j < profiledFilms.length; j++) {
        const sim = vectorService.cosineSimilarity(profiledFilms[i].embedding, profiledFilms[j].embedding);
        if (1 - sim > maxDist) maxDist = 1 - sim;
      }
    }
    if (maxDist >= 0.45 && profiledFilms.length >= 6) {
      k = 3;
    }
  }

  // K-Means++ Seed Initialization
  const seedIndices = [0];

  while (seedIndices.length < k) {
    let bestNextIdx = -1;
    let maxMinDist = -1;

    for (let i = 0; i < profiledFilms.length; i++) {
      if (seedIndices.includes(i)) continue;
      let minDistToSeed = Infinity;
      for (const sIdx of seedIndices) {
        const sim = vectorService.cosineSimilarity(profiledFilms[i].embedding, profiledFilms[sIdx].embedding);
        const dist = 1 - sim;
        if (dist < minDistToSeed) minDistToSeed = dist;
      }
      if (minDistToSeed > maxMinDist) {
        maxMinDist = minDistToSeed;
        bestNextIdx = i;
      }
    }

    if (bestNextIdx !== -1) {
      seedIndices.push(bestNextIdx);
    } else {
      break;
    }
  }

  // Assign films to closest seed
  const clusterAssignments = Array.from({ length: seedIndices.length }, () => []);

  for (let i = 0; i < profiledFilms.length; i++) {
    let bestSeed = 0;
    let bestSim = -Infinity;

    seedIndices.forEach((sIdx, cIdx) => {
      const sim = vectorService.cosineSimilarity(profiledFilms[i].embedding, profiledFilms[sIdx].embedding);
      if (sim > bestSim) {
        bestSim = sim;
        bestSeed = cIdx;
      }
    });

    clusterAssignments[bestSeed].push(profiledFilms[i]);
  }

  // Format non-empty clusters with disambiguated names
  const clusters = [];
  const existingNames = [];
  let clusterCount = 1;

  clusterAssignments.forEach((filmsInCluster) => {
    if (filmsInCluster.length === 0) return;
    const nameInfo = deriveClusterName(filmsInCluster, existingNames);
    existingNames.push(nameInfo.name);
    clusters.push({
      clusterId: `cluster_${clusterCount++}`,
      name: nameInfo.name,
      description: nameInfo.description,
      movieIds: filmsInCluster.map((f) => f.tmdbId),
    });
  });

  return clusters;
}

/**
 * Cluster films using AI (Gemini or OpenAI) with heuristic fallback.
 */
async function clusterFilmsWithAI(profiledFilms) {
  const filmSummaries = profiledFilms.map((f) => ({
    id: f.tmdbId,
    title: f.title,
    genres: f.genres,
    themes: f.profile?.themes || [],
    mood: f.profile?.mood || [],
    narrativeStyle: f.profile?.narrativeStyle || [],
    visualAesthetic: f.profile?.visualAesthetic || [],
  }));

  const prompt = `You are an expert cinematic taste profiler.
Below is a user's collection of favorite films with their extracted themes, moods, and styles.

Your task:
Analyze these films and group them into 2 to 4 distinct "Cinematic Taste Personas / Clusters".
Do NOT lump disparate films into one generic category. Preserve aesthetic distinctions (e.g., separate dark psychological slow-burns from witty character dramedies).
Every film ID must be assigned to exactly one cluster.

User Films:
${JSON.stringify(filmSummaries, null, 2)}

Respond ONLY with a valid JSON object strictly matching this schema (no markdown, no other text):
{
  "clusters": [
    {
      "clusterId": "cluster_1",
      "name": "Distinctive descriptive title (e.g., Atmospheric Neo-Noir & Psychological Tension)",
      "description": "1-2 sentences capturing why these films form a cohesive cinematic aesthetic.",
      "movieIds": [105, 807]
    }
  ],
  "overallTasteSynthesis": "1-2 sentences synthesizing the overall spectrum of the user's cinema taste."
}`;

  if (openrouterClient) {
    try {
      const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
      const completion = await executeWithTimeout(
        () =>
          retryWithBackoff(
            () =>
              openrouterClient.chat.completions.create({
                model: modelName,
                max_tokens: 1200,
                messages: [
                  { role: 'system', content: 'You are an expert film analyst providing structured taste clustering.' },
                  { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
              }),
            1,
            500,
            'OpenRouter Taste Clustering'
          ),
        AI_TIMEOUT_MS,
        'OpenRouter Taste Clustering'
      );
      const parsed = JSON.parse(completion.choices[0].message.content.trim());
      if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('OpenRouter clustering warning:', err.message);
    }
  }

  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      });
      const result = await executeWithTimeout(
        () =>
          retryWithBackoff(
            () => model.generateContent(prompt),
            1,
            500,
            'Gemini Taste Clustering'
          ),
        AI_TIMEOUT_MS,
        'Gemini Taste Clustering'
      );
      const parsed = JSON.parse(result.response.text().trim());
      if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini clustering warning:', err.message);
    }
  }

  if (openaiClient) {
    try {
      const completion = await executeWithTimeout(
        () =>
          retryWithBackoff(
            () =>
              openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 1200,
                messages: [
                  { role: 'system', content: 'You are an expert film analyst providing structured taste clustering.' },
                  { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
              }),
            1,
            500,
            'OpenAI Taste Clustering'
          ),
        AI_TIMEOUT_MS,
        'OpenAI Taste Clustering'
      );
      const parsed = JSON.parse(completion.choices[0].message.content.trim());
      if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('OpenAI clustering failed:', err.message);
    }
  }

  // Fallback
  const fallbackClusters = heuristicClusterFilms(profiledFilms);
  return {
    clusters: fallbackClusters,
    overallTasteSynthesis: 'A diverse cinematic taste spanning multiple aesthetic traditions and storytelling styles.',
  };
}

/**
 * Build rich multi-cluster taste profile from user favorites and ratings.
 */
async function buildTasteProfileFromFavorites({
  userId,
  sessionId,
  genres = [],
  origins = [],
  favorites = [], // Array of { tmdbId, rating } or array of numbers
}) {
  if (!Array.isArray(favorites) || favorites.length === 0) {
    throw new Error('At least one favorite film is required to build a taste profile.');
  }

  // Standardize favorites format
  const normalizedFavorites = favorites.map((f) => {
    if (typeof f === 'number' || typeof f === 'string') {
      return { tmdbId: Number(f), rating: 3, ratingLabel: 'good' };
    }
    const r = f.rating !== undefined ? Number(f.rating) : 3;
    const labels = { 1: 'not for me', 2: 'okay', 3: 'good', 4: 'great', 0: 'haven\'t watched' };
    return {
      tmdbId: Number(f.tmdbId || f.id),
      rating: r,
      ratingLabel: labels[r] || 'good',
    };
  });

  const tmdbIds = normalizedFavorites.map((f) => f.tmdbId);

  // 1. Batch profile all favorite films (ensures AI metadata + vector embeddings exist)
  const profiledFilms = await movieProfilingService.batchGetOrProfileMovies(tmdbIds);

  const filmMap = new Map();
  profiledFilms.forEach((f) => filmMap.set(f.tmdbId, f));

  // Attach metadata to favorites
  const enrichedFavorites = normalizedFavorites
    .map((fav) => {
      const doc = filmMap.get(fav.tmdbId);
      if (!doc) return null;
      return {
        ...fav,
        title: doc.title,
        year: doc.releaseYear,
        posterPath: doc.posterPath,
      };
    })
    .filter(Boolean);

  // 2. Discover semantic taste clusters
  const validProfiledDocs = enrichedFavorites
    .map((fav) => filmMap.get(fav.tmdbId))
    .filter((doc) => doc && doc.embedding && doc.embedding.length > 0);

  const { clusters: rawClusters, overallTasteSynthesis } = await clusterFilmsWithAI(validProfiledDocs);

  // 3. Compute cluster centroids, tag distributions, and weights
  let totalClusterScore = 0;
  const processedClusters = rawClusters.map((c) => {
    const clusterFilms = c.movieIds
      .map((id) => filmMap.get(id))
      .filter((doc) => doc && doc.embedding && doc.embedding.length > 0);

    const vectors = clusterFilms.map((f) => f.embedding);
    const centroidEmbedding = vectorService.calculateCentroid(vectors);

    // Aggregate tags with rating weight multipliers
    const themeScores = {};
    const moodScores = {};
    const visualScores = {};
    let clusterRatingSum = 0;

    clusterFilms.forEach((film) => {
      const userRating = enrichedFavorites.find((fav) => fav.tmdbId === film.tmdbId)?.rating ?? 3;
      const mult = RATING_MULTIPLIERS[userRating] || 1.0;
      clusterRatingSum += mult;

      (film.profile?.themes || []).forEach((t) => {
        themeScores[t] = (themeScores[t] || 0) + mult;
      });
      (film.profile?.mood || []).forEach((m) => {
        moodScores[m] = (moodScores[m] || 0) + mult;
      });
      (film.profile?.visualAesthetic || []).forEach((v) => {
        visualScores[v] = (visualScores[v] || 0) + mult;
      });
    });

    totalClusterScore += clusterRatingSum;

    const toSortedArray = (scores) =>
      Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, score]) => ({
          tag,
          weight: Number((score / (clusterRatingSum || 1)).toFixed(2)),
        }));

    const sourceFavs = c.movieIds
      .map((id) => {
        const film = filmMap.get(id);
        if (!film) return null;
        return {
          tmdbId: film.tmdbId,
          title: film.title,
          year: film.releaseYear,
          posterPath: film.posterPath,
        };
      })
      .filter(Boolean);

    return {
      clusterId: c.clusterId || `cluster_${Date.now()}`,
      name: c.name,
      description: c.description,
      rawRatingSum: clusterRatingSum,
      centroidEmbedding,
      topThemes: toSortedArray(themeScores),
      topMoods: toSortedArray(moodScores),
      topVisuals: toSortedArray(visualScores),
      sourceFavoriteIds: c.movieIds,
      sourceFavorites: sourceFavs,
    };
  });

  // Normalize cluster weights (sum to 1.0)
  const finalClusters = processedClusters.map((c) => ({
    ...c,
    weight: totalClusterScore > 0 ? Number((c.rawRatingSum / totalClusterScore).toFixed(2)) : 1.0 / processedClusters.length,
  }));

  // Global centroid across all favorites
  const globalCentroid = vectorService.calculateCentroid(validProfiledDocs.map((d) => d.embedding));

  // 4. Upsert UserTasteProfile in MongoDB
  const query = userId ? { userId } : { sessionId };
  const updateData = {
    ...(userId && { userId }),
    ...(sessionId && { sessionId }),
    selectedGenres: genres,
    selectedOrigins: origins,
    favorites: enrichedFavorites,
    tasteClusters: finalClusters,
    globalCentroid,
    onboardingStage: 'favorites_selected',
    aiSynthesis: overallTasteSynthesis,
  };

  let savedProfile;
  if (userId || sessionId) {
    savedProfile = await UserTasteProfile.findOneAndUpdate(query, updateData, {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    });

    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { tasteProfileComplete: true });
      } catch (e) {
        console.warn('Failed to update User.tasteProfileComplete:', e.message);
      }
    }
  } else {
    savedProfile = updateData;
  }

  return {
    success: true,
    tasteProfile: savedProfile,
    clusters: finalClusters,
    aiSynthesis: overallTasteSynthesis,
  };
}

/**
 * Incrementally append new favorite films & ratings to an existing taste profile without rebuilding or resetting.
 */
async function appendFavoritesToTasteProfile({
  userId,
  sessionId,
  newFavorites = [],
}) {
  if (!Array.isArray(newFavorites) || newFavorites.length === 0) {
    throw new Error('At least one new favorite film is required to append.');
  }

  const query = userId ? { userId } : { sessionId };
  const profile = await UserTasteProfile.findOne(query);

  if (!profile) {
    return buildTasteProfileFromFavorites({
      userId,
      sessionId,
      favorites: newFavorites,
    });
  }

  const existingIds = new Set((profile.favorites || []).map((f) => Number(f.tmdbId)));
  const labels = { 1: 'not for me', 2: 'okay', 3: 'good', 4: 'great', 0: 'haven\'t watched' };
  const normalizedNew = [];

  newFavorites.forEach((f) => {
    let id, rating;
    if (typeof f === 'number' || typeof f === 'string') {
      id = Number(f);
      rating = 3;
    } else {
      id = Number(f.tmdbId || f.id);
      rating = f.rating !== undefined ? Number(f.rating) : 3;
    }

    if (!isNaN(id) && !existingIds.has(id)) {
      normalizedNew.push({
        tmdbId: id,
        rating,
        ratingLabel: labels[rating] || 'good',
      });
      existingIds.add(id);
    }
  });

  if (normalizedNew.length === 0) {
    return {
      success: true,
      tasteProfile: profile,
      clusters: profile.tasteClusters,
      aiSynthesis: profile.aiSynthesis,
    };
  }

  // 1. Batch profile the new films
  const newTmdbIds = normalizedNew.map((f) => f.tmdbId);
  const profiledFilms = await movieProfilingService.batchGetOrProfileMovies(newTmdbIds);

  const filmMap = new Map();
  profiledFilms.forEach((f) => filmMap.set(f.tmdbId, f));

  const enrichedNewFavorites = normalizedNew
    .map((fav) => {
      const doc = filmMap.get(fav.tmdbId);
      if (!doc) return null;
      return {
        ...fav,
        title: doc.title,
        year: doc.releaseYear,
        posterPath: doc.posterPath,
      };
    })
    .filter(Boolean);

  // 2. Incremental update across existing clusters
  const clusters = profile.tasteClusters || [];

  enrichedNewFavorites.forEach((fav) => {
    const movieDoc = filmMap.get(fav.tmdbId);
    if (!movieDoc) return;

    const ratingMultiplier = RATING_MULTIPLIERS[fav.rating] !== undefined ? RATING_MULTIPLIERS[fav.rating] : 1.0;

    let bestCluster = clusters[0];
    let maxSim = -1;

    clusters.forEach((c) => {
      if (c.centroidEmbedding?.length > 0 && movieDoc.embedding?.length > 0) {
        const sim = vectorService.cosineSimilarity(c.centroidEmbedding, movieDoc.embedding);
        if (sim > maxSim) {
          maxSim = sim;
          bestCluster = c;
        }
      }
    });

    if (bestCluster) {
      if (bestCluster.centroidEmbedding?.length > 0 && movieDoc.embedding?.length > 0) {
        const alpha = 0.20 * ratingMultiplier;
        const updatedVector = bestCluster.centroidEmbedding.map((val, idx) => {
          return val + alpha * (movieDoc.embedding[idx] || 0);
        });
        const norm = Math.sqrt(updatedVector.reduce((sum, v) => sum + v * v, 0)) || 1;
        bestCluster.centroidEmbedding = updatedVector.map((v) => Number((v / norm).toFixed(6)));
      }

      if (!bestCluster.sourceFavoriteIds.includes(fav.tmdbId)) {
        bestCluster.sourceFavoriteIds.push(fav.tmdbId);
        bestCluster.sourceFavorites.push({
          tmdbId: fav.tmdbId,
          title: fav.title,
          year: fav.year,
          posterPath: fav.posterPath,
        });
      }

      const themes = movieDoc.profile?.themes || [];
      const moods = movieDoc.profile?.mood || [];
      const visuals = movieDoc.profile?.visualAesthetic || [];

      const updateTags = (clusterTags, movieTags) => {
        movieTags.forEach((t) => {
          const existing = clusterTags.find((item) => item.tag === t);
          if (existing) {
            existing.weight = Number((existing.weight + 0.15 * ratingMultiplier).toFixed(2));
          } else {
            clusterTags.push({ tag: t, weight: Number((0.5 * ratingMultiplier).toFixed(2)) });
          }
        });
        clusterTags.sort((a, b) => b.weight - a.weight);
      };

      updateTags(bestCluster.topThemes, themes);
      updateTags(bestCluster.topMoods, moods);
      updateTags(bestCluster.topVisuals, visuals);

      bestCluster.rawRatingSum = (bestCluster.rawRatingSum || 0) + (fav.rating || 3);
    }
  });

  // Re-normalize cluster weights
  const totalScore = clusters.reduce((sum, c) => sum + (c.rawRatingSum || 1), 0);
  clusters.forEach((c) => {
    c.weight = totalScore > 0 ? Number(((c.rawRatingSum || 1) / totalScore).toFixed(2)) : Number((1 / clusters.length).toFixed(2));
  });

  profile.favorites.push(...enrichedNewFavorites);
  profile.tasteClusters = clusters;

  // Invalidate recommendation feed cache to recalculate with fresh weights
  profile.cachedRecommendations = [];
  profile.cachedRecommendationsAt = null;

  await profile.save();

  return {
    success: true,
    tasteProfile: profile,
    clusters: profile.tasteClusters,
    aiSynthesis: profile.aiSynthesis,
  };
}

module.exports = {
  buildTasteProfileFromFavorites,
  appendFavoritesToTasteProfile,
  clusterFilmsWithAI,
  RATING_MULTIPLIERS,
};
