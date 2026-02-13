"""
Articulotor Backend - FastAPI Application
"""

import os
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
import json
import logging

from engine import generate_response, generate_feedback, generate_custom_scenario
from scenarios import (
    get_scenarios,
    get_scenario_by_id,
    get_personas,
    get_persona,
    add_custom_scenario,
)
from sessions import (
    create_session,
    get_session,
    add_message,
    end_session,
    get_all_sessions,
    get_active_session_count,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Articulotor API", version="1.0.0")

# CORS configuration - allow localhost + production
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Add production origins from environment variable if set
prod_origins = os.getenv("ALLOWED_ORIGINS", "")
if prod_origins:
    ALLOWED_ORIGINS.extend(
        [origin.strip() for origin in prod_origins.split(",") if origin.strip()]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Models


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="The session ID")
    message: str = Field(..., min_length=1, description="User message")

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty or whitespace")
        return v.strip()


class CustomScenarioRequest(BaseModel):
    prompt: str = Field(
        ..., min_length=10, description="Description for custom scenario"
    )


class SessionRequest(BaseModel):
    scenario_id: str = Field(..., description="Scenario ID to use")
    mode: Literal["chat", "voice", "camera"] = Field(
        default="chat", description="Session mode: chat, voice, or camera"
    )
    persona: Optional[str] = Field(default=None, description="Persona to use")


# Health Check
@app.get("/")
def root():
    active_sessions = get_active_session_count()
    if active_sessions is None:
        active_sessions = 0
    return {
        "status": "online",
        "service": "Articulotor Backend",
        "version": "1.0.0",
        "active_sessions": active_sessions,
    }


# Scenario Endpoints


@app.get("/api/scenarios")
def list_scenarios(category: Optional[str] = None, difficulty: Optional[str] = None):
    """List all scenarios, optionally filtered by category and/or difficulty."""
    logger.info(f"Listing scenarios - category: {category}, difficulty: {difficulty}")
    return get_scenarios(category=category, difficulty=difficulty)


@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    """Get a specific scenario by ID."""
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        logger.warning(f"Scenario not found: {scenario_id}")
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@app.post("/api/scenarios/generate")
def generate_new_scenario(req: CustomScenarioRequest):
    """Generate a custom scenario from user's description."""
    logger.info(f"Generating custom scenario from prompt: {req.prompt[:50]}...")
    result = generate_custom_scenario(req.prompt)
    if "error" not in result:
        add_custom_scenario(result)
    return result


# Persona Endpoints


@app.get("/api/personas")
def list_personas():
    """List all available personas."""
    return get_personas()


@app.get("/api/personas/{persona_key}")
def get_persona_info(persona_key: str):
    """Get a specific persona by key."""
    persona = get_persona(persona_key)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


# Session Endpoints


@app.post("/api/sessions")
def start_session(req: SessionRequest):
    """Start a new practice session."""
    logger.info(
        f"Starting session - scenario: {req.scenario_id}, mode: {req.mode}, persona: {req.persona}"
    )

    scenario = get_scenario_by_id(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Validate persona exists if provided
    if req.persona:
        persona_data = get_persona(req.persona)
        if not persona_data:
            raise HTTPException(status_code=404, detail="Persona not found")

    session_id = create_session(req.scenario_id, req.mode, req.persona)
    session = get_session(session_id)

    logger.info(f"Session created: {session_id}")
    return {"session_id": session_id, "scenario": scenario, "session": session}


@app.post("/api/chat")
def chat(req: ChatRequest):
    """Send a chat message and get AI response."""
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_status = session.get("status")
    if session_status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")

    scenario = get_scenario_by_id(session.get("scenario_id"))
    persona_key = session.get("persona")
    persona_data = get_persona(persona_key) if persona_key else None

    result = generate_response(
        scenario=scenario,
        conversation_history=session.get("messages", []),
        user_message=req.message,
        persona_key=persona_key,
        persona_data=persona_data,
    )

    # Check if message was added successfully
    user_added = add_message(
        req.session_id, "user", req.message, result.get("analysis")
    )

    # Don't return response if user message failed to add
    if not user_added:
        logger.warning(
            f"Failed to add message - session {req.session_id} may have ended"
        )
        raise HTTPException(
            status_code=400, detail="Session ended during message processing"
        )

    # Only add assistant response if response exists
    if result.get("response"):
        add_message(req.session_id, "assistant", result.get("response"))

    logger.info(f"Chat message processed - session: {req.session_id}")

    return {"response": result.get("response"), "analysis": result.get("analysis")}


@app.post("/api/sessions/{session_id}/end")
def finish_session(session_id: str):
    """End a practice session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ended = end_session(session_id)
    if not ended:
        logger.info(f"Session {session_id} was already ended")

    logger.info(f"Session ended: {session_id}")
    return {"status": "ended", "session_id": session_id}


@app.get("/api/sessions/{session_id}/feedback")
def get_feedback(session_id: str):
    """Get feedback report for a completed session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get("status") != "ended":
        raise HTTPException(status_code=400, detail="Session must be ended first")

    logger.info(f"Generating feedback for session: {session_id}")
    return generate_feedback(session)


@app.get("/api/sessions/{session_id}")
def get_session_info(session_id: str):
    """Get session information."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# Dashboard Endpoint
@app.get("/api/dashboard")
def get_dashboard():
    """Get aggregated dashboard data for the frontend."""
    all_sessions = get_all_sessions()

    # Filter completed sessions
    completed_sessions = [s for s in all_sessions if s.get("status") == "ended"]

    if not completed_sessions:
        return {
            "current_streak": 0,
            "avg_score": 0,
            "total_sessions": 0,
            "total_hours_spoken": 0,
            "filler_word_trend": 0,
            "skill_progression": {
                "clarity": 0,
                "structure": 0,
                "persuasiveness": 0,
                "vocabulary": 0,
            },
            "crutch_words": {},
            "recent_sessions": [],
        }

    # Calculate aggregate metrics
    total_score = 0
    total_clarity = 0
    total_structure = 0
    total_persuasiveness = 0
    total_vocabulary = 0
    total_turns = 0
    all_filler_words = []

    recent_sessions_data = []
    session_filler_counts = []  # Track filler words per session for trend

    for session in completed_sessions:
        analyses = session.get("analyses", [])
        avg_session = 0  # Initialize to avoid scope issues
        session_filler_count = 0

        if analyses:
            # Get session score
            session_scores = []
            for a in analyses:
                if a and isinstance(a, dict):
                    session_scores.append(
                        {
                            "clarity": a.get("clarity_score", 0),
                            "structure": a.get("structure_score", 0),
                            "persuasiveness": a.get("persuasiveness_score", 0),
                            "vocabulary": a.get("vocabulary_score", 0),
                        }
                    )
                    filler_words = a.get("filler_words", [])
                    all_filler_words.extend(filler_words)
                    session_filler_count += len(filler_words)

            session_filler_counts.append(session_filler_count)

            if session_scores:
                avg_session = sum(
                    s["clarity"]
                    + s["structure"]
                    + s["persuasiveness"]
                    + s["vocabulary"]
                    for s in session_scores
                ) / (4 * len(session_scores))
                total_score += avg_session

                # Get latest scores for skill progression
                latest = session_scores[-1]
                total_clarity += latest["clarity"]
                total_structure += latest["structure"]
                total_persuasiveness += latest["persuasiveness"]
                total_vocabulary += latest["vocabulary"]

            total_turns += len(analyses)

            # Calculate session duration (estimate)
            created = session.get("created_at", "")
            ended = session.get("ended_at", "")
            duration_minutes = 0
            if created and ended:
                try:
                    start = datetime.fromisoformat(created)
                    end = datetime.fromisoformat(ended)
                    duration_minutes = (end - start).total_seconds() / 60
                except (ValueError, OSError) as e:
                    logger.warning(f"Could not parse dates for session duration: {e}")

            recent_sessions_data.append(
                {
                    "id": session.get("id"),
                    "scenario_id": session.get("scenario_id"),
                    "mode": session.get("mode"),
                    "score": round(avg_session) if session_scores else 0,
                    "turns": len(analyses),
                    "duration_minutes": round(duration_minutes, 1),
                    "created_at": created,
                }
            )

    num_sessions = len(completed_sessions)
    avg_score = total_score / num_sessions if num_sessions > 0 else 0
    avg_clarity = total_clarity / num_sessions if num_sessions > 0 else 0
    avg_structure = total_structure / num_sessions if num_sessions > 0 else 0
    avg_persuasiveness = total_persuasiveness / num_sessions if num_sessions > 0 else 0
    avg_vocabulary = total_vocabulary / num_sessions if num_sessions > 0 else 0

    # Count crutch words
    crutch_counts = {}
    for word in all_filler_words:
        word_lower = word.lower()
        crutch_counts[word_lower] = crutch_counts.get(word_lower, 0) + 1

    # Estimate hours spoken (rough estimate based on turns)
    total_minutes = total_turns * 2  # ~2 min per turn
    total_hours = total_minutes / 60

    # Calculate actual streak (consecutive days with sessions)
    current_streak = calculate_streak(completed_sessions)

    # Calculate filler word trend (average change per session)
    filler_word_trend = calculate_filler_trend(session_filler_counts)

    return {
        "current_streak": current_streak,
        "avg_score": round(avg_score),
        "total_sessions": num_sessions,
        "total_hours_spoken": round(total_hours, 1),
        "filler_word_trend": filler_word_trend,
        "skill_progression": {
            "clarity": round(avg_clarity),
            "structure": round(avg_structure),
            "persuasiveness": round(avg_persuasiveness),
            "vocabulary": round(avg_vocabulary),
        },
        "crutch_words": crutch_counts,
        "recent_sessions": recent_sessions_data[:10],  # Last 10 sessions
    }


def calculate_streak(completed_sessions: list) -> int:
    """Calculate consecutive days streak from session dates."""
    if not completed_sessions:
        return 0

    try:
        # Extract unique dates from sessions
        session_dates = set()
        for session in completed_sessions:
            created = session.get("created_at", "")
            if created:
                try:
                    dt = datetime.fromisoformat(created)
                    session_dates.add(dt.date())
                except (ValueError, OSError) as e:
                    logger.warning(f"Could not parse session date: {e}")

        if not session_dates:
            return 0

        # Sort dates descending
        sorted_dates = sorted(session_dates, reverse=True)
        today = datetime.now(timezone.utc).date()

        # Check if there's a session today or yesterday
        if sorted_dates[0] < today - timedelta(days=1):
            return 0  # Streak broken

        # Count consecutive days
        streak = 1
        for i in range(len(sorted_dates) - 1):
            diff = sorted_dates[i] - sorted_dates[i + 1]
            if diff == timedelta(days=1):
                streak += 1
            else:
                break

        return streak
    except Exception as e:
        logger.error(f"Error calculating streak: {e}")
        return 0


def calculate_filler_trend(session_filler_counts: list) -> int:
    """Calculate filler word trend (positive = increasing, negative = decreasing)."""
    if len(session_filler_counts) < 2:
        return 0

    try:
        # Simple linear trend: compare recent half to older half
        mid = len(session_filler_counts) // 2
        older_avg = sum(session_filler_counts[:mid]) / mid if mid > 0 else 0
        recent_avg = (
            sum(session_filler_counts[mid:]) / len(session_filler_counts[mid:])
            if mid > 0
            else session_filler_counts[0]
        )

        if older_avg == 0:
            return 0

        trend = round(((recent_avg - older_avg) / older_avg) * 100)
        return trend
    except Exception as e:
        logger.error(f"Error calculating filler trend: {e}")
        return 0


# WebSocket for Voice Mode


@app.websocket("/ws/voice/{session_id}")
async def voice_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time voice conversations."""
    await websocket.accept()
    session = get_session(session_id)

    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        logger.warning(
            f"WebSocket connection rejected - session not found: {session_id}"
        )
        return

    # Check if session is active
    if session.get("status") != "active":
        await websocket.send_json({"type": "error", "message": "Session is not active"})
        await websocket.close()
        logger.warning(
            f"WebSocket connection rejected - session not active: {session_id}"
        )
        return

    scenario = get_scenario_by_id(session.get("scenario_id"))
    persona_key = session.get("persona")
    persona_data = get_persona(persona_key) if persona_key else None

    logger.info(f"WebSocket connected - session: {session_id}")

    try:
        # Send welcome message
        await websocket.send_json(
            {
                "type": "welcome",
                "scenario": scenario,
                "message": scenario.get("opening", "Hello. Let's begin.")
                if scenario
                else "Hello. Let's begin.",
            }
        )

        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            msg_type = message_data.get("type")

            if msg_type == "user_audio_transcript":
                user_text = message_data.get("text", "")

                # Check session is still active
                current_session = get_session(session_id)
                if not current_session or current_session.get("status") != "active":
                    await websocket.send_json(
                        {"type": "error", "message": "Session has ended"}
                    )
                    break

                # Run blocking Gemini API call in a thread to avoid blocking the event loop
                result = await asyncio.to_thread(
                    generate_response,
                    scenario=scenario,
                    conversation_history=current_session.get("messages", []),
                    user_message=user_text,
                    persona_key=persona_key,
                    persona_data=persona_data,
                )

                user_added = add_message(
                    session_id, "user", user_text, result.get("analysis")
                )

                # Don't send response if user message failed to add
                if not user_added:
                    await websocket.send_json(
                        {"type": "error", "message": "Session ended during processing"}
                    )
                    break

                # Only add assistant response if response exists
                if result.get("response"):
                    add_message(session_id, "assistant", result.get("response"))
                    await websocket.send_json(
                        {
                            "type": "ai_response",
                            "text": result.get("response"),
                            "analysis": result.get("analysis"),
                        }
                    )

            elif msg_type == "end_session":
                end_session(session_id)
                await websocket.send_json({"type": "session_ended"})
                logger.info(f"Session ended via WebSocket: {session_id}")
                break

            else:
                # Unknown message type — just ignore, don't crash
                logger.warning(f"Unknown WS message type: {msg_type}")

    except WebSocketDisconnect:
        # Do NOT end the session — allow reconnection
        logger.info(
            f"WebSocket disconnected - session: {session_id} (session kept active for reconnect)"
        )
    except json.JSONDecodeError as e:
        logger.error(
            f"Invalid JSON received for session: {session_id}, error: {str(e)}"
        )
        try:
            await websocket.send_json(
                {"type": "error", "message": "Invalid JSON message"}
            )
            await websocket.close()
        except Exception as e:
            logger.warning(f"Failed to close websocket after JSON error: {e}")
        return
    except Exception as e:
        logger.error(f"WebSocket error - session: {session_id}, error: {str(e)}")
        try:
            await websocket.send_json(
                {"type": "error", "message": "Something went wrong. Please try again."}
            )
            await websocket.close()
        except Exception as e:
            logger.warning(f"Failed to close websocket after error: {e}")
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
