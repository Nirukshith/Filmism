const GENRE_NAME_TO_ID = {
  'Thriller': 53,
  'Sci-Fi': 878,
  'Drama': 18,
  'Horror': 27,
  'Romance': 10749,
  'Comedy': 35,
  'Crime': 80,
  'Animation': 16,
  'Documentary': 99,
  'Action': 28,
  'Mystery': 9648,
  'War': 10752,
  'Historical': 36,
  'Fantasy': 14,
  'Adventure': 12,
  'Musical': 10402
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
  10402: 'Musical'
};

const mapNamesToIds = (names) => {
  if (!Array.isArray(names)) return [];
  return names.map(name => GENRE_NAME_TO_ID[name] || name);
};

const mapIdsToNames = (ids) => {
  if (!Array.isArray(ids)) return [];
  return ids.map(id => GENRE_ID_TO_NAME[id] || id);
};

module.exports = {
  GENRE_NAME_TO_ID,
  GENRE_ID_TO_NAME,
  mapNamesToIds,
  mapIdsToNames
};
