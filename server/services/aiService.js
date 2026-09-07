const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || '').trim();

const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS, 10) || 10000;

// Initialize clients if keys exist with timeout and retries
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
    console.warn('OpenRouter initialization warning:', err.message);
  }
}

if (GEMINI_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (err) {
    console.warn('Gemini initialization warning:', err.message);
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
    console.warn('OpenAI initialization warning:', err.message);
  }
}

/**
 * Execute an async operation bounded by a strict timeout.
 */
async function executeWithTimeout(promiseFactory, timeoutMs = AI_TIMEOUT_MS, label = 'AI Operation') {
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
async function retryWithBackoff(fn, maxRetries = 1, baseDelayMs = 400, label = 'AI Operation') {
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


/**
 * Fallback heuristic profiling for offline development or missing API keys.
 * Uses fine-grained cinematic taxonomy across genres, TMDB keywords, and directors.
 */
function generateHeuristicProfile(movieData) {
  const overview = (movieData.overview || '').toLowerCase();
  const title = (movieData.title || '').toLowerCase();
  const genres = (movieData.genres || []).map((g) => (typeof g === 'string' ? g : g.name || ''));
  const keywords = (movieData.keywords || []).map((k) => (typeof k === 'string' ? k.toLowerCase() : (k.name || '').toLowerCase()));
  const director = movieData.director || '';

  const themes = [];
  const mood = [];
  const narrativeStyle = [];
  const visualAesthetic = [];

  // 1. Genre-driven cinematic attributes
  if (genres.includes('Science Fiction')) {
    if (keywords.some((k) => k.includes('dystopi') || k.includes('cyberpunk') || k.includes('ai') || k.includes('robot'))) {
      themes.push('technological alienation', 'cybernetic identity', 'synthetic consciousness');
      mood.push('dystopian', 'cold', 'philosophical');
      visualAesthetic.push('neon-drenched cyberpunk', 'industrial brutalism');
    } else if (keywords.some((k) => k.includes('space') || k.includes('alien') || k.includes('cosmic') || k.includes('time travel'))) {
      themes.push('existential curiosity', 'cosmic insignificance', 'temporal paradox');
      mood.push('awe-inspiring', 'contemplative', 'mysterious');
      visualAesthetic.push('monumental scale', 'sterile retro-futurism');
    } else {
      themes.push('speculative ethics', 'existential inquiry');
      mood.push('contemplative', 'cerebral');
      visualAesthetic.push('clean futurism');
    }
    narrativeStyle.push('high-concept speculative');
  }

  if (genres.includes('Crime') || genres.includes('Mystery')) {
    themes.push('moral ambiguity', 'corruption & justice', 'obsessive investigation');
    mood.push('tense', 'suspenseful', 'cynical');
    narrativeStyle.push('slow-burn investigative', 'unfolding mystery');
    visualAesthetic.push('neo-noir shadowplay', 'atmospheric rain-slicked grain');
  }

  if (genres.includes('Thriller')) {
    themes.push('psychological paranoia', 'survival instinct', 'deception');
    mood.push('claustrophobic', 'pulse-pounding', 'foreboding');
    narrativeStyle.push('taut suspense', 'ticking-clock tension');
  }

  if (genres.includes('Horror')) {
    if (keywords.some((k) => k.includes('psychological') || k.includes('cult') || k.includes('grief') || k.includes('madness'))) {
      themes.push('psychological unraveling', 'generational trauma', 'existential dread');
      mood.push('unsettling', 'haunting', 'macabre');
      visualAesthetic.push('disturbing dreamscape', 'claustrophobic lighting');
    } else {
      themes.push('supernatural terror', 'survival against the unknown');
      mood.push('visceral', 'nightmarish', 'ominous');
      visualAesthetic.push('high-contrast shadows', 'gothic decay');
    }
    narrativeStyle.push('atmospheric slow-burn dread');
  }

  if (genres.includes('Romance')) {
    if (genres.includes('Comedy')) {
      themes.push('playful banter', 'serendipity & romantic chemistry', 'misunderstandings');
      mood.push('whimsical', 'warm', 'effervescent');
      narrativeStyle.push('witty dialogue-driven', 'charming ensemble');
      visualAesthetic.push('vibrant saturated palette', 'golden hour glow');
    } else {
      themes.push('intimate vulnerability', 'unspoken yearning', 'fleeting connection');
      mood.push('bittersweet', 'melancholic', 'poetic');
      narrativeStyle.push('intimate character study', 'lyrical pacing');
      visualAesthetic.push('soft focus naturalism', 'tactile warm light');
    }
  }

  if (genres.includes('Comedy') && !genres.includes('Romance')) {
    if (genres.includes('Drama') || keywords.some((k) => k.includes('satire') || k.includes('dark comedy') || k.includes('absurd'))) {
      themes.push('human folly', 'satirical social critique', 'existential irony');
      mood.push('wry', 'biting', 'subversive');
      narrativeStyle.push('deadpan pacing', 'ironic detachment');
    } else {
      themes.push('chaotic misadventures', 'eccentric camaraderie');
      mood.push('irreverent', 'playful', 'exuberant');
      narrativeStyle.push('punchy comedic timing');
    }
    visualAesthetic.push('vivid contemporary framing');
  }

  if (genres.includes('Drama') && !genres.includes('Romance')) {
    if (keywords.some((k) => k.includes('coming of age') || k.includes('adolescence') || k.includes('youth'))) {
      themes.push('loss of innocence', 'identity formation', 'nostalgic yearning');
      mood.push('poignant', 'tender', 'reflective');
      visualAesthetic.push('sun-drenched nostalgia', 'intimate handheld realism');
    } else if (keywords.some((k) => k.includes('family') || k.includes('grief') || k.includes('marriage'))) {
      themes.push('interpersonal friction', 'quiet endurance', 'familial reconciliation');
      mood.push('somber', 'deeply human', 'empathetic');
      visualAesthetic.push('muted earth tones', 'observational framing');
    } else {
      themes.push('moral reckoning', 'human frailty', 'societal friction');
      mood.push('poignant', 'meditative', 'emotionally raw');
      visualAesthetic.push('grounded naturalism');
    }
    narrativeStyle.push('nuanced character study');
  }

  if (genres.includes('Action') || genres.includes('Adventure')) {
    themes.push('heroic sacrifice', 'relentless momentum', 'high-stakes destiny');
    mood.push('kinetic', 'electrifying', 'adrenaline-fueled');
    narrativeStyle.push('dynamic set-piece escalation');
    visualAesthetic.push('dynamic camera choreography', 'sweeping anamorphic scope');
  }

  if (genres.includes('Animation')) {
    themes.push('boundless imagination', 'allegorical wonder', 'heartfelt empathy');
    mood.push('enchanting', 'evocative', 'magical');
    visualAesthetic.push('stylized artistic worldbuilding', 'expressive color theory');
  }

  if (genres.includes('Documentary')) {
    themes.push('unfiltered truth', 'sociopolitical inquiry', 'historical record');
    mood.push('illuminating', 'urgent', 'provocative');
    narrativeStyle.push('investigative journalism', 'firsthand testimony');
    visualAesthetic.push('verite realism', 'archival tapestry');
  }

  // Fallbacks if lists are empty
  if (themes.length === 0) themes.push('search for meaning', 'identity & human condition');
  if (mood.length === 0) mood.push('atmospheric', 'evocative', 'compelling');
  if (narrativeStyle.length === 0) narrativeStyle.push('focused storytelling');
  if (visualAesthetic.length === 0) visualAesthetic.push('cinematic framing');

  const cleanThemes = Array.from(new Set(themes)).slice(0, 5);
  const cleanMood = Array.from(new Set(mood)).slice(0, 4);

  return {
    themes: cleanThemes,
    mood: cleanMood,
    narrativeStyle: Array.from(new Set(narrativeStyle)).slice(0, 3),
    visualAesthetic: Array.from(new Set(visualAesthetic)).slice(0, 3),
    pacing: overview.length > 280 ? 'slow-burn' : (genres.includes('Action') || genres.includes('Thriller') ? 'fast-paced' : 'moderate'),
    emotionalTone: cleanMood.slice(0, 2),
    characterArchetypes: ['complex protagonist', 'flawed visionary'],
    culturalTradition: movieData.originCountries?.[0] ? `${movieData.originCountries[0]} Cinema` : 'Global Cinema',
    aiSummary: `An evocative cinematic vision characterized by ${cleanMood.slice(0, 2).join(' and ')} tones, exploring themes of ${cleanThemes.slice(0, 2).join(' and ')}.`,
  };
}

/**
 * Generate a deterministic pseudo-vector when no embedding API key is available.
 * Creates a normalized 768-dimensional float vector based on text token hashing.
 */
function generateHeuristicEmbedding(text, dimensions = 768) {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);

  words.forEach((word, idx) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const dimIndex = Math.abs(hash) % dimensions;
    const weight = 1.0 / Math.sqrt(idx + 1);
    vector[dimIndex] += weight;
  });

  // L2 Normalize
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((val) => Number((val / norm).toFixed(6)));
}

/**
 * Analyze a movie using Gemini or OpenAI to extract deep taste descriptors.
 */
async function analyzeFilm(movieData) {
  const prompt = `You are an expert film scholar and cinematic taste analyst.
Analyze the following film and extract nuanced aesthetic, thematic, and stylistic characteristics.
Avoid generic descriptions. Focus on the storytelling craftsmanship, visual style, emotional resonance, and narrative pacing.

Film Data:
- Title: ${movieData.title} (${movieData.releaseYear || 'Unknown Year'})
- Director: ${movieData.director || 'Unknown'}
- Primary Cast: ${(movieData.cast || []).slice(0, 5).join(', ')}
- Overview: ${movieData.overview || 'No overview available.'}
- TMDB Genres: ${(movieData.genres || []).join(', ')}
- Keywords/Tags: ${(movieData.keywords || []).slice(0, 10).join(', ')}
- Origin: ${(movieData.originCountries || []).join(', ')}

Respond ONLY with a valid JSON object strictly conforming to this structure (no markdown fences, no extra text):
{
  "themes": ["3-5 deep thematic motifs, e.g., moral ambiguity, alienation, search for truth, existential grief"],
  "mood": ["3-4 atmospheric descriptors, e.g., melancholic, claustrophobic, contemplative, electrifying"],
  "narrativeStyle": ["2-3 narrative craft tags, e.g., slow-burn, non-linear, unreliable narrator, elliptical"],
  "visualAesthetic": ["2-3 visual/cinematographic tags, e.g., neo-noir high-contrast, tactile grain, wide minimalist framing"],
  "pacing": "One of: slow-burn, moderate, fast-paced, frenetic",
  "emotionalTone": ["2-3 emotional impact tags, e.g., bleak, haunting, cathartic, playful"],
  "characterArchetypes": ["2-3 character types, e.g., disillusioned investigator, obsessive artist"],
  "culturalTradition": "e.g., French New Wave, Hollywood Neo-Noir, Korean Revenge Thriller, Nordic Slow-Cinema",
  "aiSummary": "A concise 1-2 sentence aesthetic distillation capturing the cinematic essence of this film."
}`;

  // 1. Try OpenRouter (if configured)
  if (openrouterClient) {
    try {
      const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
      const completion = await executeWithTimeout(
        () =>
          retryWithBackoff(
            () =>
              openrouterClient.chat.completions.create({
                model: modelName,
                max_tokens: 1000,
                messages: [
                  { role: 'system', content: 'You are an expert film analyst providing structured JSON cinematic profiles.' },
                  { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
              }),
            1,
            500,
            'OpenRouter Film Analysis'
          ),
        AI_TIMEOUT_MS,
        'OpenRouter Film Analysis'
      );

      const responseText = completion.choices[0].message.content.trim();
      const parsed = JSON.parse(responseText);
      return sanitizeProfile(parsed, movieData);
    } catch (err) {
      console.warn('OpenRouter analysis warning:', err.message);
    }
  }

  // 2. Try Gemini
  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      });

      const result = await executeWithTimeout(
        () =>
          retryWithBackoff(
            () => model.generateContent(prompt),
            1,
            500,
            'Gemini Film Analysis'
          ),
        AI_TIMEOUT_MS,
        'Gemini Film Analysis'
      );

      const responseText = result.response.text().trim();
      const parsed = JSON.parse(responseText);
      return sanitizeProfile(parsed, movieData);
    } catch (err) {
      console.warn('Gemini analysis warning:', err.message);
    }
  }

  // 3. Try OpenAI
  if (openaiClient) {
    try {
      const completion = await executeWithTimeout(
        () =>
          retryWithBackoff(
            () =>
              openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 1000,
                messages: [
                  { role: 'system', content: 'You are an expert film analyst providing structured JSON cinematic profiles.' },
                  { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
              }),
            1,
            500,
            'OpenAI Film Analysis'
          ),
        AI_TIMEOUT_MS,
        'OpenAI Film Analysis'
      );

      const responseText = completion.choices[0].message.content.trim();
      const parsed = JSON.parse(responseText);
      return sanitizeProfile(parsed, movieData);
    } catch (err) {
      console.warn('OpenAI analysis failed:', err.message);
    }
  }

  // 4. Fallback to rich heuristic profiling
  console.info(`Using heuristic cinematic profiling for "${movieData.title}" (AI providers unavailable/timed out)`);
  return generateHeuristicProfile(movieData);
}

/**
 * Generate semantic text embedding vector.
 */
async function createEmbedding(profileText) {
  // 1. Try Gemini embedding
  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await executeWithTimeout(
        () => retryWithBackoff(() => model.embedContent(profileText), 1, 400, 'Gemini Embedding'),
        AI_TIMEOUT_MS,
        'Gemini Embedding'
      );
      if (result?.embedding?.values) {
        return {
          embedding: result.embedding.values,
          model: 'gemini-text-embedding-004',
        };
      }
    } catch (err) {
      try {
        const modelFallback = geminiClient.getGenerativeModel({ model: 'embedding-001' });
        const resultFallback = await executeWithTimeout(
          () => retryWithBackoff(() => modelFallback.embedContent(profileText), 1, 400, 'Gemini Embedding Fallback'),
          AI_TIMEOUT_MS,
          'Gemini Embedding Fallback'
        );
        if (resultFallback?.embedding?.values) {
          return {
            embedding: resultFallback.embedding.values,
            model: 'gemini-embedding-001',
          };
        }
      } catch (e) {
        // Fallback to OpenAI / heuristic
      }
    }
  }

  // 2. Try OpenAI text-embedding-3-small
  if (openaiClient) {
    try {
      const response = await executeWithTimeout(
        () =>
          retryWithBackoff(
            () =>
              openaiClient.embeddings.create({
                model: 'text-embedding-3-small',
                input: profileText,
              }),
            1,
            400,
            'OpenAI Embedding'
          ),
        AI_TIMEOUT_MS,
        'OpenAI Embedding'
      );
      if (response?.data?.[0]?.embedding) {
        return {
          embedding: response.data[0].embedding,
          model: 'text-embedding-3-small',
        };
      }
    } catch (err) {
      console.warn('OpenAI embedding failed:', err.message);
    }
  }

  // 3. Fallback Heuristic Embedding (768-dim normalized vector)
  return {
    embedding: generateHeuristicEmbedding(profileText, 768),
    model: 'heuristic-token-hash-768',
  };
}

/**
 * Clean & validate AI output fields
 */
function sanitizeProfile(parsed, movieData) {
  const allowedPacing = ['slow-burn', 'moderate', 'fast-paced', 'frenetic'];
  const pacingVal = (parsed.pacing || '').toLowerCase();

  return {
    themes: Array.isArray(parsed.themes) ? parsed.themes.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : [],
    mood: Array.isArray(parsed.mood) ? parsed.mood.map((m) => String(m).trim().toLowerCase()).filter(Boolean) : [],
    narrativeStyle: Array.isArray(parsed.narrativeStyle) ? parsed.narrativeStyle.map((s) => String(s).trim().toLowerCase()).filter(Boolean) : [],
    visualAesthetic: Array.isArray(parsed.visualAesthetic) ? parsed.visualAesthetic.map((v) => String(v).trim().toLowerCase()).filter(Boolean) : [],
    pacing: allowedPacing.includes(pacingVal) ? pacingVal : 'moderate',
    emotionalTone: Array.isArray(parsed.emotionalTone) ? parsed.emotionalTone.map((e) => String(e).trim().toLowerCase()).filter(Boolean) : [],
    characterArchetypes: Array.isArray(parsed.characterArchetypes) ? parsed.characterArchetypes.map((c) => String(c).trim().toLowerCase()).filter(Boolean) : [],
    culturalTradition: typeof parsed.culturalTradition === 'string' ? parsed.culturalTradition.trim() : (movieData.originCountries?.[0] || 'Global'),
    aiSummary: typeof parsed.aiSummary === 'string' ? parsed.aiSummary.trim() : '',
  };
}

/**
 * Build rich descriptive text representation for embedding generation.
 */
function buildEmbeddingString(movieDoc) {
  const p = movieDoc.profile || {};
  return [
    `Title: ${movieDoc.title}`,
    `Director: ${movieDoc.director || 'Unknown'}`,
    `Genres: ${(movieDoc.genres || []).join(', ')}`,
    `Themes: ${(p.themes || []).join(', ')}`,
    `Mood: ${(p.mood || []).join(', ')}`,
    `Narrative Style: ${(p.narrativeStyle || []).join(', ')}`,
    `Visual Aesthetic: ${(p.visualAesthetic || []).join(', ')}`,
    `Pacing: ${p.pacing || 'moderate'}`,
    `Emotional Tone: ${(p.emotionalTone || []).join(', ')}`,
    `Cultural Tradition: ${p.culturalTradition || 'Global'}`,
    `Summary: ${movieDoc.aiSummary || movieDoc.overview || ''}`,
  ].join(' | ');
}

module.exports = {
  analyzeFilm,
  createEmbedding,
  buildEmbeddingString,
  generateHeuristicProfile,
  generateHeuristicEmbedding,
};
