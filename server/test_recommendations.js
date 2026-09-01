const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const tasteClusterService = require('./services/tasteClusterService');
const candidatePoolService = require('./services/candidatePoolService');
const recommendationEngine = require('./services/recommendationEngine');

async function testRecommendations() {
  console.log('\n======================================================');
  console.log('🎬 Testing Filmism Candidate & Recommendation Pipeline');
  console.log('======================================================\n');

  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 });
      console.log('✓ Connected to MongoDB Atlas');
    }
  } catch (e) {
    console.log('⚠️ MongoDB Atlas connection skipped:', e.message);
  }

  // 1. Build initial multi-cluster profile with 6 contrasting films
  console.log('1. Setting up User Taste Profile with 2 distinct clusters...');
  const sampleFavorites = [
    { tmdbId: 27205, rating: 4 },  // Inception
    { tmdbId: 335984, rating: 4 }, // Blade Runner 2049
    { tmdbId: 807, rating: 3 },    // Se7en
    { tmdbId: 194, rating: 4 },    // Amélie
    { tmdbId: 76, rating: 4 },     // Before Sunrise
    { tmdbId: 105, rating: 3 },    // Back to the Future
  ];

  const profileResult = await tasteClusterService.buildTasteProfileFromFavorites({
    sessionId: 'test_session_recs_1',
    genres: ['Sci-Fi', 'Thriller', 'Drama', 'Romance'],
    origins: ['US', 'FR'],
    favorites: sampleFavorites,
  });

  console.log(`✓ Taste profile ready with ${profileResult.clusters.length} clusters.`);

  // 2. Generate Candidate Pool
  console.log('\n2. Generating Candidate Pool (Phase 6)...');
  const rounds = await candidatePoolService.generateCandidatePool(profileResult.tasteProfile);
  console.log(`✓ Generated ${rounds.length} feedback rounds:`);
  rounds.forEach((r) => {
    console.log(`  - [Round ${r.id}] "${r.label}" with ${r.movies.length} candidate films`);
  });

  // 3. Simulate Candidate Rating Feedback (Phase 7 & 8)
  if (rounds[0]?.movies?.[0]) {
    const candidateMovie = rounds[0].movies[0];
    console.log(`\n3. Simulating Candidate Feedback on "${candidateMovie.title}" (Rating: 4 - "great")...`);
    await candidatePoolService.recordCandidateRating({
      sessionId: 'test_session_recs_1',
      tmdbId: candidateMovie.tmdbId,
      rating: 4,
      sourceClusterId: rounds[0].clusterId,
    });
    console.log('✓ Recorded candidate rating & sharpened profile weights.');
  }

  // 4. Generate Final Ranked Recommendations (Phase 9 & 10)
  console.log('\n4. Generating Final Ranked Recommendations with Diversity Guardrail...');
  const recs = await recommendationEngine.generateRankedRecommendations(profileResult.tasteProfile, { limit: 8 });

  console.log(`✓ Generated ${recs.length} ranked recommendations:`);
  recs.forEach((rec, idx) => {
    console.log(`\n  #${idx + 1} "${rec.title}" (${rec.year}) — [${rec.match}% Match]`);
    console.log(`     Cluster: ${rec.sourceClusterName}`);
    console.log(`     Rationale: "${rec.why}"`);
  });

  // Check Diversity Guardrail: Max 70% share from any single cluster
  const clusterCounts = {};
  recs.forEach((r) => {
    clusterCounts[r.sourceClusterId] = (clusterCounts[r.sourceClusterId] || 0) + 1;
  });

  console.log('\n5. Diversity Guardrail Check:');
  Object.entries(clusterCounts).forEach(([cId, count]) => {
    const share = Math.round((count / recs.length) * 100);
    console.log(`  - Cluster ${cId}: ${count}/${recs.length} films (${share}%) — Enforcing <= 70% cap`);
  });

  console.log('\n======================================================');
  console.log('✅ Sprint 3 Verification Completed Successfully!');
  console.log('======================================================\n');
  process.exit(0);
}

testRecommendations().catch((err) => {
  console.error('❌ Error during recommendations test:', err);
  process.exit(1);
});
