const CINEMA_NAME_TO_COUNTRY_CODE = {
  'Hollywood': 'US',
  'French Cinema': 'FR',
  'Japanese Cinema': 'JP',
  'British Cinema': 'GB',
  'German Cinema': 'DE',
  'Italian Cinema': 'IT',
  'Russian Cinema': 'RU',
  'Korean Cinema': 'KR',
  'Indian Cinema': 'IN',
  'Chinese Cinema': 'CN',
  'Spanish Cinema': 'ES',
  'Scandinavian Cinema': 'SE',
  'Brazilian Cinema': 'BR',
  'Mexican Cinema': 'MX'
};

const COUNTRY_CODE_TO_CINEMA_NAME = {
  'US': 'Hollywood',
  'FR': 'French Cinema',
  'JP': 'Japanese Cinema',
  'GB': 'British Cinema',
  'DE': 'German Cinema',
  'IT': 'Italian Cinema',
  'RU': 'Russian Cinema',
  'KR': 'Korean Cinema',
  'IN': 'Indian Cinema',
  'CN': 'Chinese Cinema',
  'ES': 'Spanish Cinema',
  'SE': 'Scandinavian Cinema',
  'BR': 'Brazilian Cinema',
  'MX': 'Mexican Cinema'
};

const mapNamesToCountryCodes = (names) => {
  if (!Array.isArray(names)) return [];
  return names.map(name => CINEMA_NAME_TO_COUNTRY_CODE[name] || name);
};

const mapCountryCodesToNames = (codes) => {
  if (!Array.isArray(codes)) return [];
  return codes.map(code => COUNTRY_CODE_TO_CINEMA_NAME[code] || code);
};

module.exports = {
  CINEMA_NAME_TO_COUNTRY_CODE,
  COUNTRY_CODE_TO_CINEMA_NAME,
  mapNamesToCountryCodes,
  mapCountryCodesToNames
};
