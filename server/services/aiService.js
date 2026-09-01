const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();

// Initialize clients if keys exist
let geminiClient = null;
let openaiClient = null;

if (GEMINI_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (err) {
    console.warn('Gemini initialization warning:', err.message);
  }
}

if (OPENAI_KEY) {
  try {
    openaiClient = new OpenAI({ apiKey: OPENAI_KEY });
  } catch (err) {
    console.warn('OpenAI initialization warning:', err.message);
  }
}

/**
 * Fallback heuristic profiling for offline development or missing API keys.
 */
function generateHeuristicProfile(movieData) {
  const overview = (movieData.overview || '').toLowerCase();
  const title = movieData.title || '';
  const genres = (movieData.genres || []).map((g) => (typeof g === 'string' ? g : g.name || ''));
  const keywords = (movieData.keywords || []).map((k) => (typeof k === 'string' ? k : k.name || ''));

  const themes = [];
  const mood = [];
  const narrativeStyle = [];
  const visualAesthetic = [];

  if (overview.includes('kill') || overview.includes('murder') || overview.includes('detective') || genres.includes('Crime')) {
    themes.push('moral ambiguity', 'crime & justice');
    mood.push('tense', 'suspenseful');
    narrativeStyle.push('investigative');
    visualAesthetic.push('neo-noir shadowplay');
  }
  if (genres.includes('Science Fiction') || overview.includes('future') || overview.includes('alien')) {
    themes.push('existential curiosity', 'technological impact');
    mood.push('contemplative', 'mysterious');
    visualAesthetic.push('speculative worldbuilding');
  }
  if (genres.includes('Drama') || overview.includes('family') || overview.includes('relationship')) {
    themes.push('human connection', 'identity & loss');
    mood.push('melancholic', 'empathetic');
  }
  if (genres.includes('Comedy') || overview.includes('humor')) {
    mood.push('playful', 'witty');
    narrativeStyle.push('character-driven');
  }

  // Ensure non-empty arrays
  if (themes.length === 0) themes.push('identity & human condition', 'struggle for meaning');
  if (mood.length === 0) mood.push('atmospheric', 'engaging');
  if (narrativeStyle.length === 0) narrativeStyle.push('linear progression', 'focused perspective');
  if (visualAesthetic.length === 0) visualAesthetic.push('grounded naturalism');

  return {
    themes: Array.from(new Set(themes)).slice(0, 5),
    mood: Array.from(new Set(mood)).slice(0, 4),
    narrativeStyle: Array.from(new Set(narrativeStyle)).slice(0, 3),
    visualAesthetic: Array.from(new Set(visualAesthetic)).slice(0, 3),
    pacing: overview.length > 250 ? 'slow-burn' : 'moderate',
    emotionalTone: mood.slice(0, 2),
    characterArchetypes: ['complex protagonist'],
    culturalTradition: movieData.originCountries?.[0] ? `${movieData.originCountries[0]} Cinema` : 'Global Cinema',
    aiSummary: `A cinematic exploration of ${themes.join(' and ')}, marked by a ${mood.join(', ')} atmosphere.`,
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

  // 1. Try Gemini
  if (geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const parsed = JSON.parse(responseText);
      return sanitizeProfile(parsed, movieData);
    } catch (err) {
      // Gemini API error or invalid key, fallback silently
    }
  }

  // 2. Try OpenAI
  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert film analyst providing structured JSON cinematic profiles.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const responseText = completion.choices[0].message.content.trim();
      const parsed = JSON.parse(responseText);
      return sanitizeProfile(parsed, movieData);
    } catch (err) {
      console.warn('OpenAI analysis failed:', err.message);
    }
  }

  // 3. Fallback Heuristic Profile
  console.info(`Using heuristic cinematic profiling for "${movieData.title}" (no active AI API key)`);
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
      const result = await model.embedContent(profileText);
      if (result?.embedding?.values) {
        return {
          embedding: result.embedding.values,
          model: 'gemini-text-embedding-004',
        };
      }
    } catch (err) {
      try {
        const modelFallback = geminiClient.getGenerativeModel({ model: 'embedding-001' });
        const resultFallback = await modelFallback.embedContent(profileText);
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
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: profileText,
      });
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
};
