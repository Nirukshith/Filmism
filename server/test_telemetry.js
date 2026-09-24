const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const tasteClusterService = require('./services/tasteClusterService');
const feedbackService = require('./services/feedbackService');
const RecommendationLog = require('./models/recommendationLogModel');

async function testTelemetryAndOutcome() {
  console.log('\n======================================================');
  console.log('📊 Testing Filmism Post-Watch Outcome & Telemetry');
  console.log('======================================================\n');

  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 });
      console.log('✓ Connected to MongoDB Atlas');
    }
  } catch (e) {
    console.log('⚠️ MongoDB Atlas connection skipped:', e.message);
  }

  const testSessionId = `telemetry_test_${Date.now()}`;

  // 1. Setup sample taste profile
  console.log('1. Setting up User Taste Profile...');
  const sampleFavorites = [
    { tmdbId: 27205, rating: 4 },  // Inception
    { tmdbId: 335984, rating: 4 }, // Blade Runner 2049
    { tmdbId: 194, rating: 4 },    // Amélie
    { tmdbId: 76, rating: 4 },     // Before Sunrise
    { tmdbId: 807, rating: 3 },    // Se7en
  ];

  const profileResult = await tasteClusterService.buildTasteProfileFromFavorites({
    sessionId: testSessionId,
    genres: ['Sci-Fi', 'Thriller', 'Drama'],
    origins: ['US', 'FR'],
    favorites: sampleFavorites,
  });

  const cluster1 = profileResult.clusters[0];
  console.log(`✓ Initial Profile ready with Cluster: "${cluster1.name}" (Weight: ${cluster1.weight})`);

  // 2. Simulate User Intent Actions (Watchlist & Dismiss)
  console.log('\n2. Simulating User Intent Actions (Phase 11)...');
  await feedbackService.recordRecommendationAction({
    sessionId: testSessionId,
    tmdbId: 105,
    title: 'Back to the Future',
    sourceClusterId: cluster1.clusterId,
    sourceClusterName: cluster1.name,
    matchScore: 88,
    action: 'watchlisted',
  });
  console.log('✓ Logged "watchlisted" action for Back to the Future (+0.20 mild intent pull)');

  await feedbackService.recordRecommendationAction({
    sessionId: testSessionId,
    tmdbId: 500,
    title: 'Random Movie',
    sourceClusterId: cluster1.clusterId,
    sourceClusterName: cluster1.name,
    matchScore: 70,
    action: 'dismissed',
  });
  console.log('✓ Logged "dismissed" action for Random Movie (-0.15 disinterest penalty)');

  // 3. Simulate Post-Watch Verdict (High-Signal Phase 12 Outcome Rating)
  console.log('\n3. Simulating Post-Watch Outcome Verdict ("great" - 4)...');
  const outcomeResult = await feedbackService.recordPostWatchOutcome({
    sessionId: testSessionId,
    tmdbId: 105,
    outcomeRating: 4, // great
    sourceClusterId: cluster1.clusterId,
  });
  console.log('✓', outcomeResult.message);

  // 4. Compute Telemetry Hit-Rate Stats (Phase 13)
  console.log('\n4. Computing Telemetry & Recommendation Hit Rate...');
  const stats = await feedbackService.getRecommendationMetrics({ sessionId: testSessionId });
  console.log(`✓ Telemetry Calculated:`);
  console.log(`  - Total Recommendations Tracked: ${stats.totalShown}`);
  console.log(`  - Watchlisted Count:             ${stats.watchlisted}`);
  console.log(`  - Positive Watched Count:        ${stats.positiveOutcomes}`);
  console.log(`  - Dismissed Count:               ${stats.dismissed}`);
  console.log(`  - Overall Hit Rate:              ${stats.hitRate}%`);

  console.log('\n5. Cluster Performance Breakdown:');
  stats.clusterBreakdown.forEach((c) => {
    console.log(`  - [${c.clusterName}] Total: ${c.totalShown} | Hit Rate: ${c.clusterHitRate}%`);
  });

  console.log('\n======================================================');
  console.log('✅ Sprint 4 Telemetry & Outcome Pipeline Complete!');
  console.log('======================================================\n');
  process.exit(0);
}

testTelemetryAndOutcome().catch((err) => {
  console.error('❌ Error during telemetry test:', err);
  process.exit(1);
});
