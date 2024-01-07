// Importing the necessary modules
import dotenv from 'dotenv'; // dotenv for loading environment variables
import { Telegraf, Markup } from 'telegraf'; // Telegraf for Telegram bot development
import TelegrafGA4 from 'telegraf-ga4'; // TelegrafGA4 for Google Analytics
import axios from 'axios'; // axios for making HTTP requests
import { PythonShell } from 'python-shell'; // PythonShell for running Python scripts

// Load environment variables from .env file
dotenv.config();

// Environment variables and constants
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Telegram bot token
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID; // Google Analytics measurement ID
const GA_API_SECRET = process.env.GA_API_SECRET; // Google Analytics API secret
const TMDB_API_TOKEN = process.env.TMDB_API_TOKEN; // The Movie Database API token
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'; // Base URL for The Movie Database API

// Initialize the Telegram bot
const bot = new Telegraf(BOT_TOKEN);
let genres = []; // Array to hold movie genres
let currentGenreId = null; // ID of the current genre selected by the user
let isUserChattingWithAI = false; // Flag to check if user is chatting with AI

// Configuration for Axios requests
const axiosConfig = {
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_API_TOKEN}`,
  },
};

// Generic error message function
// @param ctx - The context of the Telegram message
// @param message - The error message to be sent
const sendErrorMessage = (ctx, message) => {
  ctx.reply(message); // Send the error message to the user
  console.error(message); // Log the error message
};

// Function to make Axios requests
// @param url - The URL for the Axios request
// @returns - The data from the response
const makeAxiosRequest = async (url) => {
  try {
    const response = await axios.get(url, axiosConfig);
    return response.data;
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
};

// Function to fetch movie genres from The Movie Database API
const fetchMovieGenres = async () => {
  const url = `${TMDB_BASE_URL}/genre/movie/list?language=en`;
  const data = await makeAxiosRequest(url);
  genres = data.genres;
};

// Function to fetch a random movie by genre
// @param genreId - The ID of the genre to fetch the movie for
// @returns - An object containing movie details, including poster URL
const getRandomMovieByGenre = async (genreId) => {
  const url = `${TMDB_BASE_URL}/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=${genreId}`;
  const data = await makeAxiosRequest(url);
  const movies = data.results;
  const movie = movies[Math.floor(Math.random() * movies.length)];
  if (movie) {
    const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
    const posterUrl = movie.poster_path
      ? `${posterBaseUrl}${movie.poster_path}`
      : null;
    return { ...movie, posterUrl };
  }
  return null;
};

// Function to create a reply message for the movie
// @param movie - The movie object to create a reply for
// @returns - An array containing the message and keyboard markup
const createMovieReply = (movie) => {
  if (!movie) {
    return [
      'Sorry, no movie found in this genre.',
      Markup.keyboard([['Next Movie', 'Menu']]).resize(),
    ];
  }
  const message = `*${movie.title}*\n\n*Overview:* ${movie.overview}\n`;
  const posterMessage = movie.posterUrl
    ? `\n*Poster:* [🎬](${movie.posterUrl})`
    : '';
  return [
    `${message}${posterMessage}`,
    Markup.keyboard([['Next Movie', 'Menu']]).resize(),
  ];
};

// Function to handle AI conversation using GPT-2
// @param message - The user's message to send to the AI
// @param ctx - The context of the Telegram message
// @returns - The AI's response as a string
const handleAIConversation = async (message, ctx) => {
  const options = {
    mode: 'text',
    pythonOptions: ['-u'], // unbuffered, real-time stdout
    args: [message], // arguments to pass to the Python script
  };

  if (!ctx || !ctx.ga4) {
    console.error('GA4 context is undefined. Cannot track the event.');
    return 'GA4 context is undefined. Cannot track the event.';
  } else {
    trackEvent(ctx, 'use_ai', { ai_query: message }); // Track the AI usage event
  }

  try {
    const results = await PythonShell.run('src/gpt2_inference.py', options); // Run the Python script
    return results.join(' '); // Join the results if they're returned as an array
  } catch (err) {
    console.error('Error talking to AI:', err);
    trackEvent(ctx, 'error_ai', { error_message: err.message }); // Track the AI error event
    throw new Error(
      "I'm having trouble connecting to my brain right now, try again later!",
    );
  }
};

// Function to track events via Google Analytics
// @param ctx - The context of the Telegram message
// @param eventName - The name of the event to track
// @param params - Additional parameters to send with the event
const trackEvent = (ctx, eventName, params = {}) => {
  if (!ctx || !ctx.ga4) {
    console.error('Cannot track event. GA4 context is undefined.');
    return;
  }
  ctx.ga4.event(eventName, {
    username: ctx.from.username, // Include the username in the event
    ...params, // Spread any additional parameters
  });
};

// Middleware for logging and Google Analytics
bot.use(Telegraf.log()); // Log every update
bot.use((ctx, next) => {
  const gaMiddleware = new TelegrafGA4({
    measurement_id: GA_MEASUREMENT_ID,
    api_secret: GA_API_SECRET,
    client_id: ctx.from.id.toString(), // Set the client ID for Google Analytics
  });
  return gaMiddleware.middleware()(ctx, next);
});

// Start command handler
bot.start(async (ctx) => {
  try {
    await fetchMovieGenres(); // Fetch movie genres at start
    trackEvent(ctx, 'start'); // Track the start event
    console.log(
      'Fetched genres:',
      genres.map((g) => g.name),
    ); // Log the fetched genres
    ctx.reply(
      'Hello, choose what you want',
      Markup.keyboard([['Movie', 'Try AI']]).resize(),
    ); // Send a reply with options
    isUserChattingWithAI = false; // Reset AI chat flag when /start is used
  } catch (error) {
    sendErrorMessage(
      ctx,
      'Error fetching movie genres. Please try again later.',
    ); // Send error message if fetching genres fails
  }
});

// Handlers for 'Movie' and 'Try AI' commands
// Handler for 'Movie' command
bot.hears('Movie', async (ctx) => {
  console.log("User selected 'Movie'");
  trackEvent(ctx, 'movie'); // Tracks the 'Movie' command usage in Google Analytics

  // Check if the genres list has been successfully fetched
  if (genres.length === 0) {
    // If genres haven't been fetched, send an error message to the user
    sendErrorMessage(
      ctx,
      "Sorry, I couldn't fetch the movie genres right now. Please try again later.",
    );
  } else {
    // If genres have been fetched, prompt the user to select a genre
    ctx.reply(
      'Choose a genre',
      Markup.keyboard(genres.map((genre) => [genre.name])).resize(),
    );
  }
});

// Handler for 'Try AI' command
bot.hears('Try AI', (ctx) => {
  console.log('User wants to chat with AI');
  trackEvent(ctx, 'try_ai'); // Tracks the 'Try AI' command usage in Google Analytics

  // Notify the user that they can start chatting with the AI
  ctx.reply('Sure, start chatting with AI! Type something...');

  // Set a flag indicating the user is now chatting with AI
  isUserChattingWithAI = true;
});

// General text handler
bot.on('text', async (ctx) => {
  // Extracts the text from the user's message
  const text = ctx.message.text;
  console.log(`Received text message: ${text}`);

  // Checks if the text matches any of the genre names
  const isGenre = genres.some((g) => g.name === text);

  // Checks if the text is a 'Menu' command
  const isMenuCommand = text === 'Menu';

  // Checks if the text is a 'Next Movie' command
  const isNextMovieCommand = text === 'Next Movie';

  // List of commands that the bot recognizes
  const isCommand = ['Movie', 'Try AI', 'Next Movie', 'Menu'].includes(text);

  // If the user selects 'Menu', reset the chat state and offer main options
  if (isMenuCommand) {
    trackEvent(ctx, text); // Tracks the 'Menu' command usage
    isUserChattingWithAI = false; // Resets the AI chat flag
    currentGenreId = null; // Clears any selected genre
    ctx.reply(
      'Choose what you want',
      Markup.keyboard([['Movie', 'Try AI']]).resize(),
    );
  }
  // If the user selects a genre and isn't chatting with AI, fetch and send a movie from that genre
  else if (isGenre && !isUserChattingWithAI) {
    trackEvent(ctx, text); // Tracks the genre selection
    const genre = genres.find((g) => g.name === text); // Finds the selected genre object
    currentGenreId = genre.id; // Sets the current genre ID
    try {
      const movie = await getRandomMovieByGenre(genre.id); // Fetches a random movie from the genre
      ctx.replyWithMarkdown(...createMovieReply(movie)); // Sends the movie information to the user
    } catch (error) {
      sendErrorMessage(ctx, 'Error fetching movie. Please try again later.'); // Handles errors in movie fetching
    }
  }
  // If the user requests the next movie in the same genre, fetch and send another movie
  else if (isNextMovieCommand && currentGenreId) {
    try {
      const movie = await getRandomMovieByGenre(currentGenreId); // Fetches a new random movie from the same genre
      ctx.replyWithMarkdown(...createMovieReply(movie)); // Sends the new movie information to the user
    } catch (error) {
      sendErrorMessage(
        ctx,
        'Error fetching next movie. Please try again later.',
      ); // Handles errors in fetching the next movie
    }
  }
  // If the user is chatting with AI and sends a text that's not a command, process and respond with AI
  else if (isUserChattingWithAI && !isCommand) {
    try {
      const aiReply = await handleAIConversation(text, ctx); // Sends the user's message to the AI and gets a response
      ctx.reply(aiReply); // Sends the AI's response to the user
    } catch (error) {
      sendErrorMessage(ctx, error.message); // Handles errors in AI conversation
    }
  }
  // If the received text doesn't match any recognized commands or genres, guide the user on what to do next
  else if (!isCommand) {
    ctx.reply(
      "Please select an option from the menu or start a chat with AI by typing 'Try AI'.",
    );
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(
    `Encountered an error for update ${ctx.updateType}:`,
    err.message,
  );
  sendErrorMessage(ctx, 'An error occurred. Please try again later.');
});

// Bot launch
bot.launch(); // Launch the bot
process.once('SIGINT', () => bot.stop('SIGINT')); // Stop the bot gracefully on SIGINT
process.once('SIGTERM', () => bot.stop('SIGTERM')); // Stop the bot gracefully on SIGTERM
