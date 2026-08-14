const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
    accept: 'application/json'
  }
});

module.exports = tmdb;