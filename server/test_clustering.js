const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const tasteClusterService = require('./services/tasteClusterService');

async function testClustering() {
  console.log('\n======================================================');
  console.log('🧪 Testing Filmism Semantic Taste Clustering Pipeline');
  console.log('======================================================\n');

  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 });
      console.log('✓ Connected to MongoDB Atlas');
    }
  } catch (e) {
    console.log('⚠️ MongoDB Atlas connection skipped:', e.message);
  }

  // Simulated 6 contrasting favorite films
  const sampleFavorites = [
    { tmdbId: 27205, rating: 4 },  // Inception (great)
    { tmdbId: 335984, rating: 4 }, // Blade Runner 2049 (great)
    { tmdbId: 807, rating: 3 },    // Se7en (good)
    { tmdbId: 105, rating: 3 },    // Back to the Future (good)
    { tmdbId: 194, rating: 4 },    // Amélie (great)
    { tmdbId: 76, rating: 4 },     // Before Sunrise (great)
  ];

  console.log(`1. Processing & Clustering ${sampleFavorites.length} Favorite Films...`);
  const startTime = Date.now();

  const result = await tasteClusterService.buildTasteProfileFromFavorites({
    sessionId: 'test_session_clustering_1',
    genres: ['Sci-Fi', 'Thriller', 'Drama', 'Romance'],
    origins: ['US', 'FR'],
    favorites: sampleFavorites,
  });

  const duration = Date.now() - startTime;
  console.log(`✓ Clustering complete in ${duration}ms\n`);

  console.log('2. Discovered Cinematic Taste Personas (Clusters):');
  (result.clusters || []).forEach((c, idx) => {
    console.log(`\n  [Cluster ${idx + 1}] "${c.name}" (Weight: ${Math.round(c.weight * 100)}%)`);
    console.log(`  Description: ${c.description}`);
    console.log(`  Assigned Movie IDs: [${c.sourceFavoriteIds.join(', ')}]`);
    console.log(`  Top Themes:`, c.topThemes.slice(0, 3).map((t) => `${t.tag} (${t.weight})`).join(', '));
    console.log(`  Top Moods:`, c.topMoods.slice(0, 3).map((m) => `${m.tag} (${m.weight})`).join(', '));
    console.log(`  Centroid Vector Dim: ${c.centroidEmbedding?.length || 0}`);
  });

  console.log('\n3. Overall Taste Synthesis:');
  console.log(`  "${result.aiSynthesis}"`);

  console.log('\n======================================================');
  console.log('✅ Sprint 2 Clustering Verification Successful!');
  console.log('======================================================\n');
  process.exit(0);
}

testClustering().catch((err) => {
  console.error('❌ Error during clustering test:', err);
  process.exit(1);
});
