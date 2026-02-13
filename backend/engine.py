"""
Gemini AI engine for generating responses and feedback.
Uses 3 separate API keys for different model types.
"""

import os
import json
import logging
import re
import random
from functools import wraps
from typing import Dict, Optional, List
from google import genai
from google.genai import types
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()

# Validate and load API keys
CHAT_API_KEY = os.getenv("GEMINI_API_KEY_CHAT")
ANALYSIS_API_KEY = os.getenv("GEMINI_API_KEY_ANALYSIS")
VOICE_API_KEY = os.getenv("GEMINI_API_KEY_VOICE")

# Simplified fallback logic
SINGLE_KEY = os.getenv("GEMINI_API_KEY")
if not CHAT_API_KEY:
    CHAT_API_KEY = SINGLE_KEY
if not ANALYSIS_API_KEY:
    ANALYSIS_API_KEY = SINGLE_KEY
if not VOICE_API_KEY:
    VOICE_API_KEY = SINGLE_KEY

# Validate at least one key exists
if not CHAT_API_KEY:
    logger.error("No Gemini API key found! Set GEMINI_API_KEY or all 3 keys in .env")
    raise ValueError(
        "At least one Gemini API key is required. Please set GEMINI_API_KEY or GEMINI_API_KEY_CHAT in backend/.env"
    )

# Lazy client initialization
_chat_client = None
_analysis_client = None
_voice_client = None


def get_chat_client():
    global _chat_client
    if _chat_client is None:
        _chat_client = genai.Client(api_key=CHAT_API_KEY)
    return _chat_client


def get_analysis_client():
    global _analysis_client
    if _analysis_client is None:
        _analysis_client = genai.Client(api_key=ANALYSIS_API_KEY)
    return _analysis_client


def get_voice_client():
    global _voice_client
    if _voice_client is None:
        _voice_client = genai.Client(api_key=VOICE_API_KEY)
    return _voice_client


logger.info("Gemini clients initialized (lazy loading)")

SCENARIO_SYSTEM_PROMPT = """You are a professional communication practice partner. Your role is to engage in realistic conversations based on the given scenario.

IMPORTANT: You must stay IN CHARACTER at all times. If the scenario says you're an angry client, be an angry client. If you're a skeptical investor, be skeptical. Push back, ask follow-up questions, and make it realistic.

While conversing, you must ALSO secretly analyze the user's communication and return your analysis hidden from them."""

ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "turn_number": {"type": "integer"},
        "clarity_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "structure_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "persuasiveness_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "vocabulary_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "filler_words": {"type": "array", "items": {"type": "string"}},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "areas_to_improve": {"type": "array", "items": {"type": "string"}},
        "tone_analysis": {"type": "string"},
        "sentiment": {"type": "string"},
    },
    "required": [
        "turn_number",
        "clarity_score",
        "structure_score",
        "persuasiveness_score",
        "vocabulary_score",
    ],
}

# Model configurations
CHAT_MODEL = "gemini-2.0-flash"
ANALYSIS_MODEL = "gemini-2.5-flash-lite"
VOICE_MODEL = "gemini-2.5-flash"

# Configuration
MAX_CONVERSATION_TURNS = 20  # Last 20 total messages
# Note: Using tenacity for retries. API timeouts are handled by the library's default timeout.
# To configure explicit timeout, pass client_options={"timeout": <seconds>} to Client() initialization.


# Retry decorator for API calls
def with_retry(func):
    @wraps(func)
    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper


def sanitize_user_input(user_message: str) -> str:
    """Sanitize user input to prevent prompt injection."""
    if not user_message:
        return ""

    sanitized = user_message

    # Escape markdown code blocks (handle nested blocks with loop)
    while "```" in sanitized:
        sanitized = re.sub(r"```[\s\S]*?```", "[code block removed]", sanitized)
    sanitized = re.sub(r"`[^`]+`", "[code removed]", sanitized)

    # Limit length (account for truncation message)
    max_length = 5000
    truncation_suffix = "... [truncated]"
    if len(sanitized) > max_length:
        sanitized = sanitized[: max_length - len(truncation_suffix)] + truncation_suffix

    return sanitized.strip()


def validate_analysis(analysis: Optional[dict]) -> dict:
    """Validate analysis against schema."""
    if not analysis:
        return {
            "turn_number": 0,
            "clarity_score": 0,
            "structure_score": 0,
            "persuasiveness_score": 0,
            "vocabulary_score": 0,
            "filler_words": [],
            "strengths": [],
            "areas_to_improve": [],
            "tone_analysis": "",
            "sentiment": "",
        }

    validated = {}
    validated["turn_number"] = analysis.get("turn_number", 0)

    # Validate scores (0-100)
    for score_field in [
        "clarity_score",
        "structure_score",
        "persuasiveness_score",
        "vocabulary_score",
    ]:
        value = analysis.get(score_field, 0)
        try:
            validated[score_field] = max(0, min(100, int(value)))
        except (ValueError, TypeError):
            validated[score_field] = 0

    # Validate lists
    filler_words = analysis.get("filler_words", [])
    validated["filler_words"] = filler_words if isinstance(filler_words, list) else []

    strengths = analysis.get("strengths", [])
    validated["strengths"] = strengths if isinstance(strengths, list) else []

    areas = analysis.get("areas_to_improve", [])
    validated["areas_to_improve"] = areas if isinstance(areas, list) else []

    # String fields
    validated["tone_analysis"] = (
        str(analysis.get("tone_analysis", "")) if analysis.get("tone_analysis") else ""
    )
    validated["sentiment"] = (
        str(analysis.get("sentiment", "")) if analysis.get("sentiment") else ""
    )

    return validated


def truncate_conversation_history(conversation_history: list) -> list:
    """Limit conversation history to prevent token limit issues."""
    if len(conversation_history) <= MAX_CONVERSATION_TURNS:
        return conversation_history
    return conversation_history[-MAX_CONVERSATION_TURNS:]


def get_persona_context(persona_key: str, persona_data: dict) -> str:
    """Build persona context from persona data."""
    if not persona_key or not persona_data:
        return ""

    style = persona_data.get("style", "")
    vocabulary_list = persona_data.get("vocabulary", [])
    if not isinstance(vocabulary_list, list):
        vocabulary_list = []
    vocabulary = ", ".join(vocabulary_list)
    system_prompt = persona_data.get("system_prompt", "")

    return f"""
PERSONA OVERLAY: {persona_data.get("name", persona_key)}
- Communication Style: {style}
- Characteristic Vocabulary: {vocabulary}
- Guidance: {system_prompt}
"""


def parse_api_error(error: Exception) -> tuple:
    """Parse API error and return (error_type, message)."""
    error_str = str(error).lower()

    if "429" in error_str or "rate limit" in error_str:
        return "rate_limit", "API rate limit exceeded. Please wait a moment."
    elif "503" in error_str or "unavailable" in error_str:
        return "service_unavailable", "Service temporarily unavailable. Retrying..."
    elif "timeout" in error_str:
        return "timeout", "Request timed out. Please try again."
    elif "quota" in error_str:
        return "quota_exceeded", "API quota exceeded."
    else:
        return "unknown", str(error)


@with_retry
def generate_response(
    scenario: Optional[dict],
    conversation_history: list,
    user_message: str,
    persona_key: Optional[str] = None,
    persona_data: Optional[dict] = None,
) -> Dict:
    """Generate response with hidden analysis using structured output."""

    sanitized_message = sanitize_user_input(user_message)
    truncated_history = truncate_conversation_history(conversation_history)

    # Build persona context
    persona_context = ""
    if persona_key and persona_data:
        persona_context = get_persona_context(persona_key, persona_data)
    elif persona_key:
        persona_context = f"\n\nPERSONA OVERLAY: {persona_key}"

    # Default scenario if None
    if not scenario:
        scenario = {
            "category": "General",
            "role": "Interviewer",
            "difficulty": "Medium",
            "context": "General conversation",
            "opening": "Let's talk.",
        }

    # Safely format conversation history with structure checks
    history_lines = []
    for msg in truncated_history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            if msg["role"] == "user":
                history_lines.append(f"User: {msg['content']}")
            else:
                history_lines.append(f"AI: {msg['content']}")

    full_prompt = f"""{SCENARIO_SYSTEM_PROMPT}{persona_context}

SCENARIO:
- Category: {scenario.get("category", "General")}
- Role: {scenario.get("role", "Interviewer")}
- Difficulty: {scenario.get("difficulty", "Medium")}
- Context: {scenario.get("context", "")}
- Opening: {scenario.get("opening", "")}

CONVERSATION HISTORY:
{chr(10).join(history_lines)}

Current User Message: {sanitized_message}

Your response should be natural and stay in character. Also provide hidden analysis of the user's message.

Return JSON with two fields:
1. "response" - your in-character response
2. "analysis" - your hidden analysis

Response format:
{{
    "response": "...",
    "analysis": {json.dumps(ANALYSIS_SCHEMA)}
}}"""

    try:
        logger.info(
            f"Generating response for scenario: {scenario.get('id', 'unknown')}"
        )
        chat_client = get_chat_client()
        response = chat_client.models.generate_content(
            model=CHAT_MODEL,
            contents=full_prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "response": {"type": "string"},
                        "analysis": ANALYSIS_SCHEMA,
                    },
                },
            },
        )

        try:
            text = response.text if response.text else ""
            result = json.loads(text) if text else {}
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            raise

        if result.get("analysis"):
            result["analysis"] = validate_analysis(result["analysis"])

        logger.info("Response generated successfully")
        return result

    except Exception as e:
        error_type, error_msg = parse_api_error(e)
        logger.error(f"Gemini API error ({error_type}): {str(e)}")
        # Return error flag to prevent polluting conversation history
        return {
            "response": error_msg,
            "analysis": None,
            "error_type": error_type,
            "is_error": True,
        }


@with_retry
def generate_feedback(session_data: dict) -> Dict:
    """Generate final feedback report from all turn analyses."""

    analyses = session_data.get("analyses", [])
    if not analyses:
        return {"error": "No analysis data available"}

    # Filter and validate analyses
    valid_analyses = []
    for a in analyses:
        if a is not None:
            validated = validate_analysis(a)
            if validated:
                valid_analyses.append(validated)

    if not valid_analyses:
        return {"error": "No valid analysis data available"}

    # Single loop aggregation
    total = len(valid_analyses)
    avg_clarity = avg_structure = avg_persuasiveness = avg_vocabulary = 0
    all_filler_words = []
    all_strengths = []
    all_improvements = []

    for a in valid_analyses:
        avg_clarity += a.get("clarity_score", 0)
        avg_structure += a.get("structure_score", 0)
        avg_persuasiveness += a.get("persuasiveness_score", 0)
        avg_vocabulary += a.get("vocabulary_score", 0)
        all_filler_words.extend(a.get("filler_words", []))
        all_strengths.extend(a.get("strengths", []))
        all_improvements.extend(a.get("areas_to_improve", []))

    avg_clarity /= total
    avg_structure /= total
    avg_persuasiveness /= total
    avg_vocabulary /= total
    overall_score = (
        avg_clarity + avg_structure + avg_persuasiveness + avg_vocabulary
    ) / 4

    # Preserve order when removing duplicates
    seen_strengths = set()
    unique_strengths = []
    for s in all_strengths:
        if s not in seen_strengths:
            seen_strengths.add(s)
            unique_strengths.append(s)

    seen_improvements = set()
    unique_improvements = []
    for i in all_improvements:
        if i not in seen_improvements:
            seen_improvements.add(i)
            unique_improvements.append(i)

    prompt = f"""Generate a comprehensive feedback report based on the following session data:

Overall Scores:
- Clarity: {avg_clarity:.0f}/100
- Structure: {avg_structure:.0f}/100
- Persuasiveness: {avg_persuasiveness:.0f}/100
- Vocabulary: {avg_vocabulary:.0f}/100

Filler words used: {all_filler_words}
Strengths identified: {all_strengths}
Areas to improve: {all_improvements}

Provide a motivational closing message and specific actionable advice based on the data."""

    try:
        analysis_client = get_analysis_client()
        feedback_response = analysis_client.models.generate_content(
            model=ANALYSIS_MODEL,
            contents=prompt,
            config={"response_mime_type": "text/plain"},
        )
        closing_message = feedback_response.text
    except Exception as e:
        logger.error(f"Error generating feedback text: {e}")
        closing_message = (
            "Great effort! Keep practicing to improve your communication skills."
        )

    return {
        "overall_score": round(overall_score),
        "sub_scores": {
            "clarity": round(avg_clarity),
            "structure": round(avg_structure),
            "persuasiveness": round(avg_persuasiveness),
            "vocabulary": round(avg_vocabulary),
        },
        "filler_words": all_filler_words,
        "strengths": unique_strengths,
        "improvements": unique_improvements,
        "turn_count": len(valid_analyses),
        "closing_message": closing_message,
    }


@with_retry
def generate_custom_scenario(user_prompt: str) -> Dict:
    """Generate a custom scenario from user's description."""

    # Sanitize user input
    sanitized_prompt = sanitize_user_input(user_prompt)

    # Generate random_id BEFORE prompt template
    random_id = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=8))

    prompt = f"""Generate a detailed communication practice scenario based on this description:

{sanitized_prompt}

Return a JSON object with:
{{
    "id": "custom-{random_id}",
    "title": "Brief title",
    "description": "Brief description",
    "category": "Interview/Client Management/Pitch/Debate/Quick Drill",
    "role": "The character they'll interact with",
    "difficulty": "Easy/Medium/Hard",
    "context": "Detailed scenario context",
    "opening": "The opening line/question from the AI",
    "evaluation_focus": "What aspects of communication to evaluate"
}}"""

    try:
        logger.info(
            f"Generating custom scenario from prompt: {sanitized_prompt[:50]}..."
        )
        chat_client = get_chat_client()
        response = chat_client.models.generate_content(
            model=CHAT_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        result = json.loads(response.text) if response.text else {}

        # Ensure all required fields exist
        required_fields = {
            "id": f"custom-{random_id}",
            "title": "Custom Scenario",
            "description": "User-generated scenario",
            "category": "Custom",
            "role": "Interviewer",
            "difficulty": "Medium",
            "context": sanitized_prompt,
            "opening": "Let's discuss your experience.",
            "evaluation_focus": "General communication skills",
        }

        for field, default in required_fields.items():
            if field not in result or result[field] is None:
                result[field] = default

        logger.info("Custom scenario generated successfully")
        return result

    except Exception as e:
        logger.error(f"Error generating custom scenario: {e}")
        return {
            "error": str(e),
            "id": f"custom-{random_id}",
            "category": "Custom",
            "title": "Custom Scenario",
            "description": "User-generated scenario",
            "role": "Interviewer",
            "difficulty": "Medium",
            "context": sanitized_prompt,
            "opening": "Let's discuss your experience.",
            "evaluation_focus": "General communication skills",
        }


@with_retry
def generate_voice_response(
    audio_data: bytes,
    scenario: Optional[dict],
    conversation_history: list,
    persona_key: Optional[str] = None,
    persona_data: Optional[dict] = None,
) -> Dict:
    """Generate response from voice/audio input with conversation history."""

    # Audio data validation
    if not audio_data or not isinstance(audio_data, bytes):
        logger.error("Invalid audio data provided")
        return {
            "response": "I didn't catch that. Could you please repeat?",
            "analysis": None,
            "error": "Invalid audio data",
        }

    # Default scenario if None (like generate_response does)
    if not scenario:
        scenario = {"role": "Interviewer", "context": "General conversation"}

    # Build persona context
    persona_context = ""
    if persona_key and persona_data:
        persona_context = get_persona_context(persona_key, persona_data)
    elif persona_key:
        persona_context = f"\n\nPERSONA OVERLAY: {persona_key}"

    # Truncate and format conversation history
    truncated_history = truncate_conversation_history(conversation_history)
    history_text = chr(10).join(
        [
            f"User: {msg['content']}"
            if msg.get("role") == "user"
            else f"AI: {msg['content']}"
            for msg in truncated_history
            if isinstance(msg, dict) and "role" in msg and "content" in msg
        ]
    )

    prompt = f"""You are in a voice conversation. Process the user's audio and respond as the character.

SCENARIO: {scenario.get("role", "Interviewer")} - {scenario.get("context", "General conversation")}
{persona_context}

CONVERSATION HISTORY:
{history_text}

Provide your response and analysis."""

    try:
        voice_client = get_voice_client()
        response = voice_client.models.generate_content(
            model=VOICE_MODEL,
            contents=[
                prompt,
                types.Part(inline_data=audio_data, mime_type="audio/wav"),
            ],
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "response": {"type": "string"},
                        "analysis": ANALYSIS_SCHEMA,
                    },
                },
            },
        )
        result = json.loads(response.text) if response.text else {}

        if result.get("analysis"):
            result["analysis"] = validate_analysis(result["analysis"])

        return result

    except Exception as e:
        logger.error(f"Error in voice processing: {e}")
        return {
            "response": "I didn't catch that. Could you please repeat?",
            "analysis": None,
            "error": str(e),
        }


@with_retry
def extract_persona_style(transcript: str) -> Dict:
    """Extract communication style from uploaded transcript."""

    response_schema = {
        "type": "object",
        "properties": {
            "communication_style": {"type": "string"},
            "vocabulary_patterns": {"type": "array", "items": {"type": "string"}},
            "thinking_patterns": {"type": "array", "items": {"type": "string"}},
            "common_phrases": {"type": "array", "items": {"type": "string"}},
            "tone": {"type": "string"},
        },
        "required": [
            "communication_style",
            "vocabulary_patterns",
            "thinking_patterns",
            "common_phrases",
            "tone",
        ],
    }

    prompt = f"""Analyze this transcript and extract the communication style, vocabulary patterns, and thinking patterns:

{transcript}

Return a JSON describing:
{{
    "communication_style": "description of how they communicate",
    "vocabulary_patterns": ["list of characteristic words/phrases"],
    "thinking_patterns": ["how they approach problems"],
    "common_phrases": ["characteristic phrases they use"],
    "tone": "overall tone description"
}}"""

    try:
        analysis_client = get_analysis_client()
        response = analysis_client.models.generate_content(
            model=ANALYSIS_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": response_schema,
            },
        )
        text = response.text if response.text else ""
        return (
            json.loads(text)
            if text
            else {
                "error": "Failed to extract persona style",
                "error_details": "Empty response",
                "communication_style": "Unknown",
                "vocabulary_patterns": [],
                "thinking_patterns": [],
                "common_phrases": [],
                "tone": "Neutral",
            }
        )
    except Exception as e:
        logger.error(f"Error extracting persona style: {e}")
        return {
            "error": "Failed to extract persona style",
            "error_details": str(e),
            "communication_style": "Unknown",
            "vocabulary_patterns": [],
            "thinking_patterns": [],
            "common_phrases": [],
            "tone": "Neutral",
        }
