# Fingloss - Pronunciation Glossary

A React-based glossary application with pronunciation practice features, including speech recognition and text-to-speech capabilities.

## Features

- 📚 Create and manage glossary terms
- 🎤 Speech recognition for pronunciation practice
- 🔊 Text-to-speech with ElevenLabs integration for Australian English
- 🔍 Search functionality
- 📱 Mobile-responsive design
- 💾 Local storage persistence

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed on your system

### Running the Application

1. **Start the development server:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   Open your browser and go to `http://localhost:5173`

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Development Features

- **Hot Reloading**: Changes to your code will automatically reload in the browser
- **Volume Binding**: Your local files are mounted into the container for real-time development
- **Port Forwarding**: The app runs on port 5173 and is accessible from your host machine

## Manual Development Setup

If you prefer to run without Docker:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## ElevenLabs Integration

For natural Australian English pronunciation:

1. Get an API key from [ElevenLabs](https://elevenlabs.io/app/settings/api-keys)
2. Enter the key in the app when prompted
3. Enjoy high-quality Australian English text-to-speech

## Browser Compatibility

- Modern browsers with Web Speech API support
- Chrome/Edge recommended for best speech recognition experience
- HTTPS required for speech recognition in production

## Project Structure

```
fingloss/
├── src/
│   ├── components/ui/     # Reusable UI components
│   ├── lib/              # Utility functions
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Docker image definition
└── package.json         # Dependencies and scripts
```
