require("dotenv").config();
const { Telegraf, Markup, Composer } = require("telegraf");
const TelegrafGA4 = require('telegraf-ga4');
const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
const GA_API_SECRET = process.env.GA_API_SECRET;
const TMDB_API_TOKEN = process.env.TMDB_API_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const bot = new Telegraf(BOT_TOKEN);
let genres = [];
let currentGenreId = null;

const axiosConfig = {
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${TMDB_API_TOKEN}`,
  },
};

const makeAxiosRequest = async (url) => {
  try {
    const response = await axios.get(url, axiosConfig);
    return response.data;
  } catch (error) {
    console.error("Error in Axios Request:", error.message);
    throw new Error('Network error');
  }
};

const fetchMovieGenres = async () => {
  const url = `${TMDB_BASE_URL}/genre/movie/list?language=en`;
  try {
    const data = await makeAxiosRequest(url);
    return data.genres;
  } catch (error) {
    console.error("Error fetching movie genres:", error.message);
    throw new Error('Failed to fetch genres');
  }
};

const getRandomMovieByGenre = async (genreId) => {
  const url = `${TMDB_BASE_URL}/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=${genreId}`;
  try {
    const data = await makeAxiosRequest(url);
    const movies = data.results;
    const movie = movies[Math.floor(Math.random() * movies.length)];
    if (movie) {
      const posterBaseUrl = "https://image.tmdb.org/t/p/w500";
      const posterUrl = movie.poster_path ? `${posterBaseUrl}${movie.poster_path}` : null;
      return { ...movie, posterUrl };
    }
    return null;
  } catch (error) {
    console.error("Error fetching random movie:", error.message);
    throw new Error('Failed to fetch movie');
  }
};

const createMovieReply = (movie) => {
  if (!movie) {
    return ["Sorry, no movie found in this genre.", Markup.keyboard([["Next Movie", "Menu"]]).resize()];
  }
  const message = `*${movie.title}*\n\n*Overview:* ${movie.overview}\n`;
  const posterMessage = movie.posterUrl ? `\n*Poster:* [🎬](${movie.posterUrl})` : "";
  return [`${message}${posterMessage}`, Markup.keyboard([["Next Movie", "Menu"]]).resize()];
};

const trackEvent = (ctx, eventName) => {
  ctx.ga4.event('click_bot', {
    username: ctx.from.username,
    clicked_button: eventName
  });
};

bot.use(Telegraf.log());
bot.use((ctx, next) => {
  const gaMiddleware = new TelegrafGA4({
    measurement_id: GA_MEASUREMENT_ID,
    api_secret: GA_API_SECRET,
    client_id: ctx.from.id.toString()
  });
  return gaMiddleware.middleware()(ctx, next);
});

bot.start(async (ctx) => {
  try {
    genres = await fetchMovieGenres();
    trackEvent(ctx, 'start');
    console.log("Fetched genres:", genres.map((g) => g.name));
    ctx.reply("Hello, choose what you want", Markup.keyboard([["Movie", "Book"]]).resize());
  } catch (error) {
    ctx.reply("Error fetching movie genres. Please try again later.");
  }
});

bot.hears("Book", (ctx) => {
  console.log("User selected 'Book'");
  trackEvent(ctx, 'book');
  ctx.reply("Sorry, we don't have books for now.");
});

bot.hears("Movie", (ctx) => {
  console.log("User selected 'Movie'");
  trackEvent(ctx, 'movie');
  if (genres.length === 0) {
    ctx.reply("Sorry, I couldn't fetch the movie genres right now. Please try again later.");
  } else {
    ctx.reply("Choose a genre", Markup.keyboard(genres.map((genre) => [genre.name])).resize());
  }
});

const handleTextMessages = Composer.on("text", async (ctx) => {
  const genreName = ctx.message.text;
  console.log(`Received text message: ${genreName}`);
  const isGenre = genres.map(g => g.name).includes(genreName);
  const isMenuButton = ['Next Movie', 'Menu'].includes(genreName);

  if (isGenre || isMenuButton) {
    trackEvent(ctx, genreName);
  }

  if (!["Movie", "Book", "Next Movie", "Menu"].includes(genreName)) {
    const genre = genres.find((g) => g.name === genreName);
    if (genre) {
      currentGenreId = genre.id;
      try {
        const movie = await getRandomMovieByGenre(genre.id);
        ctx.replyWithMarkdown(...createMovieReply(movie));
      } catch (error) {
        ctx.reply("Error fetching movie. Please try again later.");
      }
    }
  } else if (genreName === "Next Movie" && currentGenreId) {
    try {
      const movie = await getRandomMovieByGenre(currentGenreId);
      ctx.replyWithMarkdown(...createMovieReply(movie));
    } catch (error) {
      ctx.reply("Error fetching next movie. Please try again later.");
    }
  } else if (genreName === "Menu") {
    ctx.reply("Choose what you want", Markup.keyboard([["Movie", "Book"]]).resize());
  }
});

bot.use(handleTextMessages);

bot.catch((err, ctx) => {
  console.log(`Encountered an error for update ${ctx.updateType}`, err.message);
  ctx.reply("An error occurred. Please try again later.");
});

bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
