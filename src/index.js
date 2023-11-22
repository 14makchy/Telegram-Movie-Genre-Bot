require("dotenv").config();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_TOKEN = process.env.TMDB_API_TOKEN;

const { Telegraf, Markup, Composer } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(BOT_TOKEN);
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
let genres = []; // [{name: 'Action', id: 28}, ...]

async function fetchMovieGenres() {
  const url = `${TMDB_BASE_URL}/genre/movie/list?language=en`;
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_API_TOKEN}`,
    },
  };

  try {
    const response = await axios.get(url, options);
    return response.data.genres;
  } catch (error) {
    console.error("Error fetching movie genres:", error);
    return [];
  }
}

async function getRandomMovieByGenre(genreId) {
  const url = `${TMDB_BASE_URL}/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=${genreId}`;
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_API_TOKEN}`,
    },
  };

  try {
    const response = await axios.get(url, options);
    const movies = response.data.results;
    return movies[Math.floor(Math.random() * movies.length)];
  } catch (error) {
    console.error("Error fetching random movie:", error);
    return null;
  }
}

bot.use(Telegraf.log()); // Log every request

bot.start(async (ctx) => {
  genres = await fetchMovieGenres(); // Directly assign the genreList to genres
  console.log("Fetched genres:", genres.map(g => g.name));

  return ctx.reply(
    "Hello, choose what do you want",
    Markup.keyboard([["Movie", "Book"]]).resize(),
  );
});

bot.hears("Book", (ctx) => {
  console.log("User selected 'Book'");
  return ctx.reply("Sorry, we don't have books for now.");
});

bot.hears("Movie", (ctx) => {
  console.log("User selected 'Movie'");
  if (genres.length === 0) {
    return ctx.reply(
      "Sorry, I couldn't fetch the movie genres right now. Please try again later."
    );
  }
  return ctx.reply(
    "Choose a genre",
    Markup.keyboard(genres.map((genre) => [genre.name])).resize(),
  );
});

const handleTextMessages = Composer.on("text", async (ctx) => {
  const genreName = ctx.message.text;
  console.log(`Received text message: ${genreName}`);

  // Check if the received text is not "Movie" or "Book"
  if (genreName !== "Movie" && genreName !== "Book") {
    const genre = genres.find((g) => g.name === genreName);
    if (genre) {
      const movie = await getRandomMovieByGenre(genre.id);
      if (movie) {
        return ctx.reply(
          `Here's your random ${genreName} movie: ${movie.title}\nOverview: ${movie.overview}`
        );
      } else {
        return ctx.reply(
          `Sorry, I couldn't find a movie in the ${genreName} genre right now.`
        );
      }
    }
  }
});

bot.use(handleTextMessages);  // Moved this outside of any specific handler

bot.catch((err, ctx) => {
  console.log(`Encountered an error for update ${ctx.updateType}`, err);
});

bot.launch();

// Handle graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
