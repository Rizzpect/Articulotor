import requests
import json

base_url = "http://localhost:8000"

print("=" * 50)
print("TESTING ALL API ENDPOINTS")
print("=" * 50)

# Test 1: Health check
print("\n[TEST 1] Health Check")
r = requests.get(f"{base_url}/")
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")

# Test 2: Get scenarios
print("\n[TEST 2] GET /api/scenarios")
r = requests.get(f"{base_url}/api/scenarios")
print(f"Status: {r.status_code}")
scenarios = r.json()
print(f"Scenarios count: {len(scenarios)}")

# Test 3: Get single scenario
print("\n[TEST 3] GET /api/scenarios/interview-tell-about")
r = requests.get(f"{base_url}/api/scenarios/interview-tell-about")
print(f"Status: {r.status_code}")
print(f"Scenario: {r.json()['title']}")

# Test 4: Get personas
print("\n[TEST 4] GET /api/personas")
r = requests.get(f"{base_url}/api/personas")
print(f"Status: {r.status_code}")
personas = r.json()
print(f"Personas: {list(personas.keys())}")

# Test 5: Create session
print("\n[TEST 5] POST /api/sessions")
session_data = {
    "scenario_id": "interview-tell-about",
    "mode": "chat",
    "persona": "naval"
}
r = requests.post(f"{base_url}/api/sessions", json=session_data)
print(f"Status: {r.status_code}")
result = r.json()
session_id = result.get("session_id")
print(f"Session ID: {session_id}")
print(f"Scenario: {result.get('scenario', {}).get('title')}")

# Test 6: Send chat message
print("\n[TEST 6] POST /api/chat")
chat_data = {
    "session_id": session_id,
    "message": "Hello, I am excited to be here today."
}
r = requests.post(f"{base_url}/api/chat", json=chat_data)
print(f"Status: {r.status_code}")
chat_result = r.json()
print(f"AI Response: {chat_result.get('response', 'N/A')[:100]}...")
print(f"Analysis: {chat_result.get('analysis') is not None}")

# Test 7: End session
print("\n[TEST 7] POST /api/sessions/{id}/end")
r = requests.post(f"{base_url}/api/sessions/{session_id}/end")
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")

# Test 8: Get feedback
print("\n[TEST 8] GET /api/sessions/{id}/feedback")
r = requests.get(f"{base_url}/api/sessions/{session_id}/feedback")
print(f"Status: {r.status_code}")
feedback = r.json()
if "overall_score" in feedback:
    print(f"Overall Score: {feedback.get('overall_score')}")
    print(f"Sub-scores: {feedback.get('sub_scores')}")
else:
    print(f"Feedback: {feedback}")

# Test 9: Get dashboard
print("\n[TEST 9] GET /api/dashboard")
r = requests.get(f"{base_url}/api/dashboard")
print(f"Status: {r.status_code}")
dashboard = r.json()
print(f"Total Sessions: {dashboard.get('total_sessions')}")
print(f"Avg Score: {dashboard.get('avg_score')}")

# Test 10: Test invalid session (should return 404)
print("\n[TEST 10] GET /api/sessions/invalid-id")
r = requests.get(f"{base_url}/api/sessions/invalid-id")
print(f"Status: {r.status_code} (expected 404)")

# Test 11: Test whitespace message (should fail validation)
print("\n[TEST 11] POST /api/chat with whitespace")
r = requests.post(f"{base_url}/api/chat", json={"session_id": session_id, "message": "   "})
print(f"Status: {r.status_code} (expected 422)")

# Test 12: Get session info
print("\n[TEST 12] GET /api/sessions/{id}")
r = requests.get(f"{base_url}/api/sessions/{session_id}")
print(f"Status: {r.status_code}")
print(f"Status: {r.json().get('status')}")

print("\n" + "=" * 50)
print("ALL TESTS COMPLETED!")
print("=" * 50)
