// Importing the necessary modules
import dotenv from 'dotenv';
import { Telegraf, Markup } from 'telegraf';
import TelegrafGA4 from 'telegraf-ga4';
import axios from 'axios';
import { PythonShell } from 'python-shell';

// Load environment variables
dotenv.config();

// Environment variables and constants
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
const GA_API_SECRET = process.env.GA_API_SECRET;
const TMDB_API_TOKEN = process.env.TMDB_API_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Initialize the Telegram bot
const bot = new Telegraf(BOT_TOKEN);
let genres = [];
let currentGenreId = null;
let isUserChattingWithAI = false;

// Configuration for Axios requests
const axiosConfig = {
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_API_TOKEN}`,
  },
};

// Generic error message function
const sendErrorMessage = (ctx, message) => {
  ctx.reply(message);
  console.error(message);
};

// Function to make Axios requests
const makeAxiosRequest = async (url) => {
  try {
    const response = await axios.get(url, axiosConfig);
    return response.data;
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
};

// Function to fetch movie genres
const fetchMovieGenres = async () => {
  const url = `${TMDB_BASE_URL}/genre/movie/list?language=en`;
  const data = await makeAxiosRequest(url);
  genres = data.genres;
};

// Function to fetch a random movie by genre
const getRandomMovieByGenre = async (genreId) => {
  const url = `${TMDB_BASE_URL}/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=${genreId}`;
  const data = await makeAxiosRequest(url);
  const movies = data.results;
  const movie = movies[Math.floor(Math.random() * movies.length)];
  if (movie) {
    const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
    const posterUrl = movie.poster_path ? `${posterBaseUrl}${movie.poster_path}` : null;
    return { ...movie, posterUrl };
  }
  return null;
};

// Function to create a reply for the movie
const createMovieReply = (movie) => {
  if (!movie) {
    return ['Sorry, no movie found in this genre.', Markup.keyboard([['Next Movie', 'Menu']]).resize()];
  }
  const message = `*${movie.title}*\n\n*Overview:* ${movie.overview}\n`;
  const posterMessage = movie.posterUrl ? `\n*Poster:* [🎬](${movie.posterUrl})` : '';
  return [`${message}${posterMessage}`, Markup.keyboard([['Next Movie', 'Menu']]).resize()];
};

// Function to handle AI conversation using GPT-2
const handleAIConversation = async (message, ctx) => {
  const options = {
    mode: 'text',
    pythonOptions: ['-u'], // unbuffered, real-time stdout
    args: [message]
  };

  if (!ctx || !ctx.ga4) {
    console.error('GA4 context is undefined. Cannot track the event.');
    return 'GA4 context is undefined. Cannot track the event.';
  } else {
    trackEvent(ctx, 'use_ai', { ai_query: message });
  }

  try {
    const results = await PythonShell.run('src/gpt2_inference.py', options);
    return results.join(' '); // Join the results if they're returned as an array
  } catch (err) {
    console.error('Error talking to AI:', err);
    trackEvent(ctx, 'error_ai', { error_message: err.message });
    throw new Error("I'm having trouble connecting to my brain right now, try again later!");
  }
};

// Function to track events via Google Analytics
const trackEvent = (ctx, eventName, params = {}) => {
  if (!ctx || !ctx.ga4) {
    console.error('Cannot track event. GA4 context is undefined.');
    return;
  }
  ctx.ga4.event(eventName, {
    username: ctx.from.username,
    ...params
  });
};

// Middleware for logging and Google Analytics
bot.use(Telegraf.log());
bot.use((ctx, next) => {
  const gaMiddleware = new TelegrafGA4({
    measurement_id: GA_MEASUREMENT_ID,
    api_secret: GA_API_SECRET,
    client_id: ctx.from.id.toString()
  });
  return gaMiddleware.middleware()(ctx, next);
});

// Start command
bot.start(async (ctx) => {
  try {
    await fetchMovieGenres();
    trackEvent(ctx, 'start');
    console.log('Fetched genres:', genres.map((g) => g.name));
    ctx.reply('Hello, choose what you want', Markup.keyboard([['Movie', 'Try AI']]).resize());
    isUserChattingWithAI = false; // Reset AI chat flag when /start is used
  } catch (error) {
    sendErrorMessage(ctx, 'Error fetching movie genres. Please try again later.');
  }
});

// Handlers for 'Movie' and 'Try AI' commands
bot.hears('Movie', async (ctx) => {
  console.log('User selected \'Movie\'');
  trackEvent(ctx, 'movie');
  if (genres.length === 0) {
    sendErrorMessage(ctx, 'Sorry, I couldn\'t fetch the movie genres right now. Please try again later.');
  } else {
    ctx.reply('Choose a genre', Markup.keyboard(genres.map((genre) => [genre.name])).resize());
  }
});

bot.hears('Try AI', (ctx) => {
  console.log('User wants to chat with AI');
  trackEvent(ctx, 'try_ai');
  ctx.reply('Sure, start chatting with AI! Type something...');
  isUserChattingWithAI = true;
});

// General text handler
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  console.log(`Received text message: ${text}`);
  const isGenre = genres.some(g => g.name === text);
  const isMenuCommand = text === 'Menu';
  const isNextMovieCommand = text === 'Next Movie';
  const isCommand = ['Movie', 'Try AI', 'Next Movie', 'Menu'].includes(text);

  if (isMenuCommand) {
    trackEvent(ctx, text);
    isUserChattingWithAI = false;
    currentGenreId = null;
    ctx.reply('Choose what you want', Markup.keyboard([['Movie', 'Try AI']]).resize());
  } else if (isGenre && !isUserChattingWithAI) {
    trackEvent(ctx, text);
    const genre = genres.find(g => g.name === text);
    currentGenreId = genre.id;
    try {
      const movie = await getRandomMovieByGenre(genre.id);
      ctx.replyWithMarkdown(...createMovieReply(movie));
    } catch (error) {
      sendErrorMessage(ctx, 'Error fetching movie. Please try again later.');
    }
  } else if (isNextMovieCommand && currentGenreId) {
    try {
      const movie = await getRandomMovieByGenre(currentGenreId);
      ctx.replyWithMarkdown(...createMovieReply(movie));
    } catch (error) {
      sendErrorMessage(ctx, 'Error fetching next movie. Please try again later.');
    }
  } else if (isUserChattingWithAI && !isCommand) {
    try {
      const aiReply = await handleAIConversation(text, ctx);
      ctx.reply(aiReply);
    } catch (error) {
      sendErrorMessage(ctx, error.message);
    }
  } else if (!isCommand) {
    ctx.reply('Please select an option from the menu or start a chat with AI by typing \'Try AI\'.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Encountered an error for update ${ctx.updateType}:`, err.message);
  sendErrorMessage(ctx, 'An error occurred. Please try again later.');
});

// Bot launch
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
