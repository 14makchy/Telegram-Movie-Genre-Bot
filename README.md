# Telegram Movie Genre Bot

## Overview
The Telegram Movie Genre Bot is an interactive chatbot designed to enhance your movie-watching experience. This project consists of two main components: a JavaScript script for the Telegram bot, which handles user interactions and movie recommendations, and a Python script for AI conversations, which allows users to chat with an AI.

## Features
- **Movie Recommendations**: Users can get movie suggestions by selecting a genre from the provided list. The bot fetches random movie details from The Movie Database (TMDb) API, ensuring users get varied content each time.
- **Interactive AI Conversations**: The bot includes an AI-powered conversation feature. Users can have casual chats or ask questions, and the bot, powered by GPT-2, will respond accordingly.
- **Google Analytics Integration**: Usage of the bot is tracked via Google Analytics, providing insights into the most popular commands and user engagement.

## Code Features and Functionalities

### JavaScript Telegram Bot Script

**Environment Setup and Bot Initialization:**
- **dotenv**: Used for loading environment variables from a `.env` file.
- **Telegraf**: A modern library for Telegram Bot API used to create and manage the bot.
- **axios**: For making HTTP requests to external APIs like The Movie Database (TMDb) API.
- **PythonShell**: For running Python scripts, specifically to interact with the GPT-2 AI.

**Core Functionalities:**
- **Fetching Movie Genres**: The bot fetches a list of movie genres from TMDb API and stores them for future reference.
- **Movie Recommendation**: Upon a user's request, the bot fetches a random movie from a selected genre and provides details like title, overview, and poster.
- **AI Conversation**: The bot can engage in a text-based conversation with users by sending user input to the Python AI script and returning the AI's response.
- **Error Handling**: The bot provides informative error messages if something goes wrong during the process.
- **Google Analytics Tracking**: The bot tracks user interactions using Google Analytics for insights and analysis.

### Python AI Script

**GPT-2 Model and Tokenizer:**
- **Transformers**: Leveraging the transformers library to use GPT-2 for text generation.
- **torch**: PyTorch is used as the underlying framework for model manipulation.

**Text Generation Function:**
- **generate_text**: This function takes a user's prompt and generates a continuation of text based on it. It allows parameters to control the length and randomness of the generated text.

**Command Line Interface:**
- The script is designed to be run from the command line, taking the user's prompt as an argument and printing the generated text to stdout.

## How it Works
1. **Starting the Bot**: Users start the bot by sending the `/start` command, which prompts them with options to either get a movie recommendation or start an AI conversation.
2. **Selecting a Genre**: If the user chooses the movie option, they can select from a variety of genres. The bot then fetches a random movie from the selected genre and provides details including the title, overview, and poster image.
3. **Chatting with AI**: Users can switch to AI chat mode anytime by selecting the 'Try AI' option. They can then type in anything to have a conversational exchange with the bot.
4. **Navigating Options**: Users can navigate back to the main menu at any point to switch between chatting with AI and getting movie recommendations.

## Technologies Used
- **Node.js**: For the bot's backend logic and server.
- **Telegraf**: A modern library for Telegram Bot API.
- **Axios**: For making HTTP requests to external APIs.
- **Python-Shell**: For running Python scripts (GPT-2) from Node.js.
- **Google Analytics (GA4)**: For tracking and analyzing bot usage.
- **The Movie Database (TMDb) API**: For fetching movie details.

## Setup and Installation
1. **Clone the Repository**: `git clone https://github.com/14makchy/Telegram-Movie-Genre-Bot.git`
2. **Install Dependencies**: Navigate to the project directory and run `npm install`.
3. **Set Up Environment Variables**: Create a `.env` file and provide your Telegram Bot Token, Google Analytics Measurement ID, Google Analytics API Secret, and TMDb API Token.
4. **Run the Bot**: Execute `node index.js` to start the bot.
5. **Interact with the Bot**: Find your bot in Telegram and start interacting!

## Contributing
This is an open-source project and contributions are welcome. Feel free to fork the repository, make changes, and submit a pull request.

## License
This project is licensed under the MIT License - see the LICENSE.md file for details.

---

Thank you for checking out the Telegram Movie Genre Bot. Enjoy exploring movies in a fun and interactive way!
