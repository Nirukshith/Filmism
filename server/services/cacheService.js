const { LRUCache } = require('lru-cache');

/**
 * In-memory TTL Cache Service for high-frequency TMDB & static API responses.
 * Provides memory-bounded LRU eviction and automatic TTL expiration.
 */

// 1. Static Cache: Genres, origins, country mappings (TTL: 24 hours)
const staticCache = new LRUCache({
  max: 100,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
});

// 2. Discover Cache: Popular / filtered movie discovery pages (TTL: 2 hours)
const discoverCache = new LRUCache({
  max: 500,
  ttl: 2 * 60 * 60 * 1000, // 2 hours
});

// 3. Search Cache: Movie search query results (TTL: 30 minutes)
const searchCache = new LRUCache({
  max: 1000,
  ttl: 30 * 60 * 1000, // 30 minutes
});

// 4. Movie Details Cache: Raw TMDB movie metadata & credits (TTL: 6 hours)
const movieDetailCache = new LRUCache({
  max: 2000,
  ttl: 6 * 60 * 60 * 1000, // 6 hours
});

/**
 * Helper to get a value from cache or compute and cache it if absent.
 * @param {LRUCache} cache - LRU Cache instance to use
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to compute value on cache miss
 * @returns {Promise<any>}
 */
async function getOrSet(cache, key, fetchFn) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await fetchFn();
  if (result !== undefined && result !== null) {
    cache.set(key, result);
  }
  return result;
}

/**
 * Clear all in-memory caches.
 */
function flushAll() {
  staticCache.clear();
  discoverCache.clear();
  searchCache.clear();
  movieDetailCache.clear();
}

module.exports = {
  staticCache,
  discoverCache,
  searchCache,
  movieDetailCache,
  getOrSet,
  flushAll,
};
