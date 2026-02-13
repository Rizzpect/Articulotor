# Articulotor

An AI-powered communication practice platform designed to help users improve their speaking and conversational skills through immersive, real-time practice sessions.

## About

Articulotor was developed for **IEEE NEXUS 2026 VASAVI HACKATHON**. The platform leverages artificial intelligence to create realistic communication scenarios where users can practice presentations, interviews, negotiations, and everyday conversations with AI-powered personas that provide real-time feedback and detailed performance analysis.

## Features

- **Multiple Practice Modes**: Choose from chat, voice, and camera-based practice sessions
- **AI-Powered Personas**: Practice with various character types including interviewers, customers, managers, and peers
- **Real-Time Feedback**: Receive instant analysis on clarity, structure, persuasiveness, and vocabulary
- **Custom Scenarios**: Generate tailored practice scenarios based on your specific needs
- **Performance Dashboard**: Track your progress over time with detailed metrics and trends
- **Filler Word Detection**: Identify and reduce verbal crutches like "um," "uh," and "like"

## Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Zustand** - State management
- **Framer Motion** - Animations
- **Three.js / React Three Fiber** - 3D graphics
- **MediaPipe** - Computer vision

### Backend
- **FastAPI** - Python web framework
- **Google Gemini AI** - Generative AI for responses and feedback
- **WebSockets** - Real-time voice communication
- **Python** - Backend runtime

## Project Structure

```
VSHACKATHON/
├── frontend/           # React frontend application
│   ├── src/           # Source code
│   ├── dist/          # Production build
│   └── package.json   # Frontend dependencies
├── backend/           # FastAPI backend
│   ├── main.py        # API endpoints
│   ├── engine.py      # AI processing logic
│   ├── scenarios.py   # Scenario management
│   ├── sessions.py    # Session handling
│   └── requirements.txt
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.10+
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Configure environment variables:
   
   Create a `.env` file in the backend directory with the following:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

6. Start the backend server:
   ```bash
   python main.py
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   
   Create a `.env` file in the frontend directory with the following:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

### Production Build

For the frontend:
```bash
cd frontend
npm run build
```

The production build will be generated in `frontend/dist/`

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for the interactive API documentation.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/scenarios` | GET | List all scenarios |
| `/api/scenarios/generate` | POST | Generate custom scenario |
| `/api/personas` | GET | List available personas |
| `/api/sessions` | POST | Start a new session |
| `/api/chat` | POST | Send chat message |
| `/api/sessions/{id}/end` | POST | End a session |
| `/api/sessions/{id}/feedback` | GET | Get session feedback |
| `/api/dashboard` | GET | Get dashboard metrics |
| `/ws/voice/{id}` | WS | Real-time voice session |

## License

This project was developed for the IEEE NEXUS 2026 VASAVI HACKATHON.
