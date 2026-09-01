const GENRE_NAME_TO_ID = {
  // Thriller
  'Thriller': 53,
  'thriller': 53,
  // Sci-Fi
  'Sci-Fi': 878,
  'sci-fi': 878,
  'Sci-fi': 878,
  'Science Fiction': 878,
  'science fiction': 878,
  // Drama
  'Drama': 18,
  'drama': 18,
  // Horror
  'Horror': 27,
  'horror': 27,
  // Romance
  'Romance': 10749,
  'romance': 10749,
  // Comedy
  'Comedy': 35,
  'comedy': 35,
  // Crime
  'Crime': 80,
  'crime': 80,
  // Animation
  'Animation': 16,
  'animation': 16,
  // Documentary
  'Documentary': 99,
  'documentary': 99,
  // Action
  'Action': 28,
  'action': 28,
  // Mystery
  'Mystery': 9648,
  'mystery': 9648,
  // War
  'War': 10752,
  'war': 10752,
  // Historical / History
  'Historical': 36,
  'historical': 36,
  'History': 36,
  'history': 36,
  // Fantasy
  'Fantasy': 14,
  'fantasy': 14,
  // Adventure
  'Adventure': 12,
  'adventure': 12,
  // Musical / Music
  'Musical': 10402,
  'musical': 10402,
  'Music': 10402,
  'music': 10402,
  // Others
  'Family': 10751,
  'family': 10751,
  'Western': 37,
  'western': 37,
  'TV Movie': 10770,
  'tv movie': 10770,
};

const GENRE_ID_TO_NAME = {
  53: 'Thriller',
  878: 'Sci-Fi',
  18: 'Drama',
  27: 'Horror',
  10749: 'Romance',
  35: 'Comedy',
  80: 'Crime',
  16: 'Animation',
  99: 'Documentary',
  28: 'Action',
  9648: 'Mystery',
  10752: 'War',
  36: 'Historical',
  14: 'Fantasy',
  12: 'Adventure',
  10402: 'Musical',
  10751: 'Family',
  37: 'Western',
  10770: 'TV Movie'
};

const mapNamesToIds = (names) => {
  if (!Array.isArray(names)) return [];
  return names.map((name) => {
    if (typeof name === 'number') return name;
    if (GENRE_NAME_TO_ID[name]) return GENRE_NAME_TO_ID[name];
    const capitalized = String(name).charAt(0).toUpperCase() + String(name).slice(1);
    return GENRE_NAME_TO_ID[capitalized] || name;
  });
};

const mapIdsToNames = (ids) => {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => GENRE_ID_TO_NAME[id] || id);
};

const isMovieMatchingSelectedGenres = (movieGenres, selectedGenres) => {
  if (!Array.isArray(selectedGenres) || selectedGenres.length === 0) return true;
  if (!Array.isArray(movieGenres) || movieGenres.length === 0) return false;

  const targetIds = new Set();
  selectedGenres.forEach((g) => {
    if (typeof g === 'number') targetIds.add(g);
    else if (GENRE_NAME_TO_ID[g]) targetIds.add(GENRE_NAME_TO_ID[g]);
    else if (typeof g === 'string') {
      const cap = g.charAt(0).toUpperCase() + g.slice(1);
      if (GENRE_NAME_TO_ID[cap]) targetIds.add(GENRE_NAME_TO_ID[cap]);
      else if (!isNaN(g)) targetIds.add(Number(g));
    }
  });

  if (targetIds.size === 0) return true;

  return movieGenres.some((mg) => {
    if (typeof mg === 'number') return targetIds.has(mg);
    const mgId = GENRE_NAME_TO_ID[mg];
    if (mgId && targetIds.has(mgId)) return true;

    const mgLower = String(mg).toLowerCase();
    for (const tid of targetIds) {
      const canonicalName = (GENRE_ID_TO_NAME[tid] || '').toLowerCase();
      if (canonicalName && canonicalName === mgLower) return true;
      if ((canonicalName === 'musical' || canonicalName === 'music') && (mgLower === 'music' || mgLower === 'musical')) return true;
      if ((canonicalName === 'sci-fi' || canonicalName === 'science fiction') && (mgLower === 'science fiction' || mgLower === 'sci-fi')) return true;
      if ((canonicalName === 'historical' || canonicalName === 'history') && (mgLower === 'history' || mgLower === 'historical')) return true;
    }
    return false;
  });
};

module.exports = {
  GENRE_NAME_TO_ID,
  GENRE_ID_TO_NAME,
  mapNamesToIds,
  mapIdsToNames,
  isMovieMatchingSelectedGenres,
};
