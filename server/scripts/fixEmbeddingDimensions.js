/**
 * fixEmbeddingDimensions.js
 *
 * One-off migration script to re-embed any movie profiles that were generated
 * by OpenAI's text-embedding-3-small at 1536 dimensions (the old default).
 * After the fix in aiService.js, new embeddings are 768-dim, but existing
 * documents need to be re-embedded to match the Atlas vector index.
 *
 * Usage:
 *   node server/scripts/fixEmbeddingDimensions.js           # dry-run (default)
 *   node server/scripts/fixEmbeddingDimensions.js --apply    # actually fix
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MovieProfile = require('../models/movieProfileModel');
const aiService = require('../services/aiService');

const DRY_RUN = !process.argv.includes('--apply');
const TARGET_DIMS = 768;

async function main() {
  await connectDB();
  console.log('Connected to database.\n');

  // Find all profiles with mismatched embedding dimensions.
  // This catches OpenAI 1536-dim vectors and any other dimension mismatches.
  const allMismatched = await MovieProfile.find({
    'embedding.0': { $exists: true },
    $expr: { $ne: [{ $size: '$embedding' }, TARGET_DIMS] },
  }).lean();

  if (allMismatched.length === 0) {
    console.log('✅ No mismatched embeddings found. All vectors are already 768-dim.');
    process.exit(0);
  }

  console.log(`Found ${allMismatched.length} profile(s) with non-${TARGET_DIMS} embeddings:\n`);

  for (const doc of allMismatched) {
    const dims = doc.embedding?.length || 0;
    console.log(
      `  • [tmdbId: ${doc.tmdbId}] "${doc.title}" — ${dims}-dim (model: ${doc.embeddingModel || 'unknown'})`
    );
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no changes made. Run with --apply to fix.\n');
    process.exit(0);
  }

  console.log('\n🔧 Applying fixes...\n');

  let fixed = 0;
  let failed = 0;

  for (const doc of allMismatched) {
    try {
      // Rebuild the embedding string from the stored profile data
      const enrichedData = {
        title: doc.title,
        overview: doc.overview,
        genres: doc.genres,
        keywords: doc.keywords,
        director: doc.director,
        cast: doc.cast,
        releaseYear: doc.releaseYear,
        originCountries: doc.originCountries,
        profile: doc.profile,
        aiSummary: doc.aiSummary || doc.profile?.aiSummary || doc.overview,
      };

      const embeddingString = aiService.buildEmbeddingString(enrichedData);
      const { embedding, model } = await aiService.createEmbedding(embeddingString);

      if (embedding.length !== TARGET_DIMS) {
        console.warn(
          `  ⚠ [tmdbId: ${doc.tmdbId}] New embedding is still ${embedding.length}-dim (model: ${model}). Skipping.`
        );
        failed++;
        continue;
      }

      await MovieProfile.updateOne(
        { _id: doc._id },
        { $set: { embedding, embeddingModel: model } }
      );

      console.log(`  ✅ [tmdbId: ${doc.tmdbId}] "${doc.title}" — re-embedded to ${TARGET_DIMS}-dim (${model})`);
      fixed++;
    } catch (err) {
      console.error(`  ❌ [tmdbId: ${doc.tmdbId}] "${doc.title}" — failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Failed: ${failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
}).finally(() => {
  mongoose.connection.close();
});
