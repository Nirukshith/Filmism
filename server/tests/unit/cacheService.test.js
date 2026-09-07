const {
  staticCache,
  discoverCache,
  searchCache,
  movieDetailCache,
  getOrSet,
  flushAll,
} = require('../../services/cacheService');

describe('Cache Service Unit Tests', () => {
  beforeEach(() => {
    flushAll();
  });

  it('should store and retrieve values in staticCache', () => {
    staticCache.set('test_genre', { id: 18, name: 'Drama' });
    expect(staticCache.has('test_genre')).toBe(true);
    expect(staticCache.get('test_genre')).toEqual({ id: 18, name: 'Drama' });
  });

  it('should fetch from compute function on cache miss in getOrSet', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ id: 603, title: 'The Matrix' });
    const key = 'movie_603';

    const result = await getOrSet(movieDetailCache, key, fetchMock);
    expect(result).toEqual({ id: 603, title: 'The Matrix' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call should hit the cache and NOT invoke fetchMock again
    const cachedResult = await getOrSet(movieDetailCache, key, fetchMock);
    expect(cachedResult).toEqual({ id: 603, title: 'The Matrix' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should clear all caches on flushAll', () => {
    staticCache.set('k1', 'v1');
    discoverCache.set('k2', 'v2');
    searchCache.set('k3', 'v3');
    movieDetailCache.set('k4', 'v4');

    flushAll();

    expect(staticCache.size).toBe(0);
    expect(discoverCache.size).toBe(0);
    expect(searchCache.size).toBe(0);
    expect(movieDetailCache.size).toBe(0);
  });
});
