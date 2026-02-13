"""
Session management with SQLite persistence.
"""

import sqlite3
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from contextlib import contextmanager
import os
import time

logger = logging.getLogger(__name__)

DATABASE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "articulotor.db"
)

# Retry settings for database locked errors
DB_MAX_RETRIES = 3
DB_RETRY_DELAY = 0.1


def init_db():
    """Initialize the database with required tables."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL,
                mode TEXT NOT NULL,
                persona TEXT,
                created_at TEXT NOT NULL,
                ended_at TEXT,
                status TEXT DEFAULT 'active',
                messages TEXT DEFAULT '[]',
                analyses TEXT DEFAULT '[]'
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)
        """)
        conn.commit()
    logger.info("Database initialized successfully")


@contextmanager
def get_db():
    """Context manager for database connections with retry logic for locked database."""
    retries = 0
    last_error: Exception | None = None

    while retries < DB_MAX_RETRIES:
        try:
            conn = sqlite3.connect(DATABASE_PATH, timeout=10.0)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
            return
        except sqlite3.OperationalError as e:
            last_error = e
            if "database is locked" in str(e).lower():
                retries += 1
                logger.warning(f"Database locked, retry {retries}/{DB_MAX_RETRIES}")
                time.sleep(DB_RETRY_DELAY * retries)
            else:
                raise
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise

    logger.error(f"Database locked after {DB_MAX_RETRIES} retries: {last_error}")
    raise RuntimeError("Database locked after retries")


def safe_json_loads(value: str, default: Any = None) -> Any:
    """Safely parse JSON with fallback to default."""
    try:
        return json.loads(value) if value else default
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(
            f"JSON parse error for value (truncated): {str(value)[:100] if value else 'None'}: {e}"
        )
        return default


def create_session(scenario_id: str, mode: str, persona: Optional[str] = None) -> str:
    """Create a new session and return its ID."""
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (id, scenario_id, mode, persona, created_at, status, messages, analyses)
            VALUES (?, ?, ?, ?, ?, 'active', '[]', '[]')
        """,
            (session_id, scenario_id, mode, persona, now),
        )
        conn.commit()

    logger.info(f"Session created: {session_id}, scenario: {scenario_id}, mode: {mode}")
    return session_id


def get_session(session_id: str) -> Optional[Dict]:
    """Retrieve a session by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()

        if row:
            return {
                "id": row["id"],
                "scenario_id": row["scenario_id"],
                "mode": row["mode"],
                "persona": row["persona"],
                "created_at": row["created_at"],
                "ended_at": row["ended_at"],
                "status": row["status"],
                "messages": safe_json_loads(row["messages"], []),
                "analyses": safe_json_loads(row["analyses"], []),
            }
    return None


def add_message(
    session_id: str, role: str, content: str, analysis: Optional[Dict] = None
) -> bool:
    """Add a message to the session history.
    Uses atomic transaction to prevent TOCTOU race condition."""

    new_message = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute("BEGIN IMMEDIATE")

            cursor.execute(
                "SELECT messages, analyses FROM sessions WHERE id = ? AND status = 'active' FOR UPDATE",
                (session_id,),
            )
            row = cursor.fetchone()

            if not row:
                logger.warning(
                    f"Cannot add message - session {session_id} not active or not found"
                )
                return False

            messages = safe_json_loads(row["messages"], [])
            analyses = safe_json_loads(row["analyses"], [])

            messages.append(new_message)
            if analysis:
                analysis_copy = analysis.copy()
                analysis_copy["turn_number"] = len(analyses) + 1
                analyses.append(analysis_copy)

            cursor.execute(
                """
                UPDATE sessions
                SET messages = ?, analyses = ?
                WHERE id = ? AND status = 'active'
            """,
                (json.dumps(messages), json.dumps(analyses), session_id),
            )
            conn.commit()

            if cursor.rowcount > 0:
                logger.debug(f"Message added to session {session_id}, role: {role}")
                return True
            else:
                logger.warning(
                    f"Failed to add message - session {session_id} ended during operation"
                )
                return False

        except Exception as e:
            conn.rollback()
            logger.error(f"Error adding message to session {session_id}: {e}")
            return False


def end_session(session_id: str) -> bool:
    """Mark a session as ended. Idempotent - only ends if active."""
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE sessions
            SET status = 'ended', ended_at = ?
            WHERE id = ? AND status = 'active'
        """,
            (now, session_id),
        )
        conn.commit()

        if cursor.rowcount > 0:
            logger.info(f"Session ended: {session_id}")
            return True
        else:
            logger.info(f"Session {session_id} was already ended or not found")
            return False


def get_session_analyses(session_id: str) -> List[Dict]:
    """Get all analyses for a session."""
    session = get_session(session_id)
    if session:
        return session.get("analyses", [])
    return []


def get_all_sessions() -> List[Dict]:
    """Get all sessions."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions ORDER BY created_at DESC")
        rows = cursor.fetchall()

        return [
            {
                "id": row["id"],
                "scenario_id": row["scenario_id"],
                "mode": row["mode"],
                "persona": row["persona"],
                "created_at": row["created_at"],
                "ended_at": row["ended_at"],
                "status": row["status"],
                "messages": safe_json_loads(row["messages"], []),
                "analyses": safe_json_loads(row["analyses"], []),
            }
            for row in rows
        ]


def get_active_session_count() -> int:
    """Get count of active sessions."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM sessions WHERE status = 'active'")
        return cursor.fetchone()["count"]
