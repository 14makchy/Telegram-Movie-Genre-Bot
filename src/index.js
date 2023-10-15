require('dotenv').config();
//console.log(process.env);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
//console.log(BOT_TOKEN);

const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(BOT_TOKEN);
const genres = ['Horror', 'Drama', 'Action']; // Easily scalable list of genres

bot.start((ctx) => {
  ctx.reply('Hello, choose what do you want', Markup.keyboard([
    ['Movie', 'Book']
  ]).resize());
});

bot.hears('Book', (ctx) => {
  console.log('we don\'t have books for now');
  ctx.reply('Sorry, we don\'t have books for now.');
});

bot.hears('Movie', (ctx) => {
  ctx.reply('Choose a genre', Markup.keyboard(
    genres.map(genre => [genre])
  ).resize());
});

genres.forEach(genre => {
  bot.hears(genre, (ctx) => {
    ctx.reply(`Here's your random movie with chosen genre: ${genre}`);
  });
});

bot.launch();

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
