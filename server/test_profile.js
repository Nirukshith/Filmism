const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const movieProfilingService = require('./services/movieProfilingService');
const aiService = require('./services/aiService');
const vectorService = require('./services/vectorService');

async function test() {
  console.log('\n======================================================');
  console.log('🎬 Testing Filmism AI Profiling & Caching Pipeline');
  console.log('======================================================\n');

  // Test Movie: Inception (TMDB ID: 27205)
  const movieId = 27205;
  console.log(`1. Fetching & Profiling Inception (TMDB ID: ${movieId})...`);
  
  const startTime = Date.now();
  let result;
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
      console.log('✓ Connected to MongoDB Atlas');
    }
  } catch (e) {
    console.log('⚠️ MongoDB Atlas not connected (using local test mode):', e.message);
  }

  // Fetch TMDB data directly
  const tmdbData = await movieProfilingService.fetchTmdbMovieDetails(movieId);
  console.log(`✓ Fetched TMDB Data: "${tmdbData.title}" (${tmdbData.releaseYear}) directed by ${tmdbData.director}`);
  console.log(`  Cast: ${tmdbData.cast.slice(0, 4).join(', ')}`);
  console.log(`  Keywords: ${tmdbData.keywords.slice(0, 5).join(', ')}`);

  // AI Extraction
  console.log('\n2. Extracting Cinematic Taste Descriptors...');
  const tasteProfile = await aiService.analyzeFilm(tmdbData);
  console.log('✓ AI Extracted Profile:');
  console.log('  Themes:           ', tasteProfile.themes);
  console.log('  Mood:             ', tasteProfile.mood);
  console.log('  Narrative Style:  ', tasteProfile.narrativeStyle);
  console.log('  Visual Aesthetic: ', tasteProfile.visualAesthetic);
  console.log('  Pacing:           ', tasteProfile.pacing);
  console.log('  AI Summary:       ', tasteProfile.aiSummary);

  // Vector Embedding
  console.log('\n3. Generating Semantic Vector Embedding...');
  const embeddingText = aiService.buildEmbeddingString({ ...tmdbData, profile: tasteProfile });
  const { embedding, model } = await aiService.createEmbedding(embeddingText);
  console.log(`✓ Generated ${embedding.length}-dimensional vector (Model: ${model})`);

  // Vector Similarity Test with Blade Runner 2049
  console.log('\n4. Testing Semantic Similarity against Blade Runner 2049 (335984)...');
  const brData = await movieProfilingService.fetchTmdbMovieDetails(335984);
  const brProfile = await aiService.analyzeFilm(brData);
  const { embedding: brVec } = await aiService.createEmbedding(aiService.buildEmbeddingString({ ...brData, profile: brProfile }));

  const sim = vectorService.cosineSimilarity(embedding, brVec);
  console.log(`✓ Cosine Similarity Score: ${sim.toFixed(4)}`);

  console.log('\n======================================================');
  console.log('✅ Pipeline works successfully!');
  console.log('======================================================\n');
  process.exit(0);
}

test().catch((err) => {
  console.error('❌ Error during test:', err);
  process.exit(1);
});
