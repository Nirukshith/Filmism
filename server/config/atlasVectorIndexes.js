/**
 * MongoDB Atlas Vector Search Index Definitions
 *
 * Atlas Free Tier (M0) & Shared Cluster Notes:
 * - Atlas M0, M2, and M5 tiers support up to 3 Vector Search indexes per cluster.
 * - Current setup utilizes 2 indexes (movie_vector_index and taste_profile_vector_index), safely within M0 limits.
 * - Filter fields in $vectorSearch MUST be declared in the index definition with type: "filter".
 */

const MOVIE_VECTOR_INDEX_DEF = {
  name: 'movie_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 768,
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'isProfiled',
      },
      {
        type: 'filter',
        path: 'genres',
      },
    ],
  },
  collectionName: 'movieprofiles',
};

const TASTE_PROFILE_VECTOR_INDEX_DEF = {
  name: 'taste_profile_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'globalCentroid',
        numDimensions: 768,
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'matchingEnabled',
      },
      {
        type: 'filter',
        path: 'onboardingStage',
      },
      {
        type: 'filter',
        path: 'userId',
      },
    ],
  },
  collectionName: 'usertasteprofiles',
};

module.exports = {
  MOVIE_VECTOR_INDEX_DEF,
  TASTE_PROFILE_VECTOR_INDEX_DEF,
};
