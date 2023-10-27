require('dotenv').config();
//console.log(process.env);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_TOKEN = process.env.TMDB_API_TOKEN;
//console.log(BOT_TOKEN);

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');


const bot = new Telegraf(BOT_TOKEN);
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
let genres = []; // Easily scalable list of genres

async function fetchMovieGenres() {
  const url = `${TMDB_BASE_URL}/genre/movie/list?language=en`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_API_TOKEN}`
    }
  };

  try {
    const response = await axios.get(url, options);
    return response.data.genres.map(genre => genre.name);
  } catch (error) {
    console.error('Error fetching movie genres:', error);
    return [];
  }
}


bot.start(async (ctx) => {
  genres = await fetchMovieGenres();
  ctx.reply('Hello, choose what do you want', Markup.keyboard([
    ['Movie', 'Book']
  ]).resize());

bot.hears('Book', (ctx) => {
  console.log('we don\'t have books for now');
  ctx.reply('Sorry, we don\'t have books for now.');
});

bot.hears('Movie', (ctx) => {
  if (genres.length === 0) {
    ctx.reply('Sorry, I couldn\'t fetch the movie genres right now. Please try again later.');
    return;
  }
  ctx.reply('Choose a genre', Markup.keyboard(
    genres.map(genre => [genre])
  ).resize());
});

genres.forEach(genre => {
  bot.hears(genre, (ctx) => {
    ctx.reply(`Here's your random movie with chosen genre: ${genre}`);
  });
});
});

bot.launch();

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
