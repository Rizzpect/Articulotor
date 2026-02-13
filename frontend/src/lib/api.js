const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const DEFAULT_TIMEOUT = 10000;

function createTimeoutSignal(timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return { signal: controller.signal, timeoutId };
}

function validateString(value, fieldName, required = false, maxLength = null) {
  if (required && (value === undefined || value === null || value === '')) {
    throw new Error(`${fieldName} is required`);
  }
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (maxLength && value && value.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }
}

function validateNumber(value, fieldName, required = false) {
  if (required && (value === undefined || value === null || value === '')) {
    throw new Error(`${fieldName} is required`);
  }
  if (value !== undefined && value !== null && typeof value !== 'number' && isNaN(Number(value))) {
    throw new Error(`${fieldName} must be a number`);
  }
}

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const { signal: timeoutSignal, timeoutId } = createTimeoutSignal(timeout);
  const controller = new AbortController();
  const combinedSignal = AbortSignal.any([timeoutSignal, controller.signal]);
  
  try {
    const res = await fetch(url, { ...options, signal: combinedSignal });
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

function createErrorMessage(res, defaultMessage) {
  return `${defaultMessage} (status: ${res.status})`;
}

export async function fetchScenarios(category, difficulty) {
  validateString(category, 'category', false, 100);
  validateString(difficulty, 'difficulty', false, 50);
  
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (difficulty) params.set('difficulty', difficulty);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/scenarios?${params}`);
  if (!res.ok) throw new Error(createErrorMessage(res, 'Failed to fetch scenarios'));
  return res.json();
}

export async function fetchScenario(scenarioId) {
  validateString(scenarioId, 'scenario_id', true);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/scenarios/${encodeURIComponent(scenarioId)}`);
  if (!res.ok) throw new Error(createErrorMessage(res, 'Scenario not found'));
  return res.json();
}

export async function generateCustomScenario(prompt) {
  validateString(prompt, 'prompt', true, 2000);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/scenarios/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(createErrorMessage(res, 'Failed to generate scenario'));
  return res.json();
}

export async function createSession(scenarioId, mode = 'chat', persona = null) {
  validateString(scenarioId, 'scenario_id', true);
  validateString(mode, 'mode', false, 50);
  
  const body = { scenario_id: scenarioId, mode };
  if (persona !== undefined && persona !== null) {
    validateString(persona, 'persona', false, 100);
    body.persona = persona;
  }
  
  const res = await fetchWithTimeout(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(createErrorMessage(res, 'Failed to create session'));
  return res.json();
}

export async function sendMessage(sessionId, message) {
  validateString(sessionId, 'session_id', true);
  validateString(message, 'message', true, 5000);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) throw new Error(createErrorMessage(res, 'Failed to send message'));
  return res.json();
}

export async function endSession(sessionId) {
  validateString(sessionId, 'session_id', true);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/end`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(createErrorMessage(res, 'Failed to end session'));
  return res.json();
}

export async function getFeedback(sessionId) {
  validateString(sessionId, 'session_id', true);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/feedback`);
  if (!res.ok) throw new Error(createErrorMessage(res, 'Failed to get feedback'));
  return res.json();
}

export async function getSession(sessionId) {
  validateString(sessionId, 'session_id', true);
  
  const res = await fetchWithTimeout(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(createErrorMessage(res, 'Session not found'));
  return res.json();
}

export async function getDashboard() {
  const res = await fetchWithTimeout(`${API_BASE}/api/dashboard`);
  if (!res.ok) throw new Error(createErrorMessage(res, 'Failed to fetch dashboard'));
  return res.json();
}

export function createVoiceWebSocket(sessionId) {
  validateString(sessionId, 'session_id', true);
  
  const wsUrl = `${API_BASE.replace(/^http/, 'ws')}/ws/voice/${encodeURIComponent(sessionId)}`;
  return new WebSocket(wsUrl);
}
