from typing import List, Dict, Optional

PREBUILT_SCENARIOS: List[Dict] = [
    {
        "id": "interview-tell-about",
        "category": "Interview",
        "title": "Tell Me About Yourself",
        "description": "Practice the classic interview opener",
        "role": "Friendly Recruiter",
        "difficulty": "Easy",
        "context": "You're interviewing for a product manager role at a tech startup.",
        "opening": "Thanks for coming in! So, tell me about yourself.",
        "evaluation_focus": "Clarity, structure, relevance",
    },
    {
        "id": "interview-failure",
        "category": "Interview",
        "title": "Explain a Failure",
        "description": "Discuss a past failure and what you learned",
        "role": "Senior Hiring Manager",
        "difficulty": "Medium",
        "context": "The interviewer is exploring your self-awareness.",
        "opening": "Everyone has failures. Tell me about one.",
        "evaluation_focus": "Honesty, growth mindset",
    },
    {
        "id": "interview-salary",
        "category": "Interview",
        "title": "Salary Negotiation",
        "description": "Negotiate your compensation",
        "role": "HR Director",
        "difficulty": "Hard",
        "context": "You have an offer and need to negotiate.",
        "opening": "We are thrilled to offer 5,000 base.",
        "evaluation_focus": "Confidence, value articulation",
    },
    {
        "id": "client-angry",
        "category": "Client Management",
        "title": "Handle Angry Client",
        "description": "De-escalate an upset customer",
        "role": "Furious CMO",
        "difficulty": "Medium",
        "context": "Campaign is 5 days late, client is furious.",
        "opening": "Five days late! What do you have to say?",
        "evaluation_focus": "Empathy, accountability",
    },
    {
        "id": "client-bad-news",
        "category": "Client Management",
        "title": "Deliver Bad News",
        "description": "Explain a project delay",
        "role": "Disappointed Client",
        "difficulty": "Medium",
        "context": "Project delayed by 2 weeks.",
        "opening": "I got your email about the delay.",
        "evaluation_focus": "Clarity, honesty",
    },
    {
        "id": "client-upsell",
        "category": "Client Management",
        "title": "Upsell a Service",
        "description": "Convince client to upgrade",
        "role": "Skeptical Client",
        "difficulty": "Hard",
        "context": "Client on basic, you recommend premium.",
        "opening": "You want me to pay double?",
        "evaluation_focus": "Value demonstration",
    },
    {
        "id": "pitch-elevator",
        "category": "Pitch and Persuasion",
        "title": "Elevator Pitch",
        "description": "60-second pitch",
        "role": "Curious Investor",
        "difficulty": "Medium",
        "context": "You have 60 seconds.",
        "opening": "What does your company do?",
        "evaluation_focus": "Brevity, impact",
    },
    {
        "id": "pitch-skeptical-cto",
        "category": "Pitch and Persuasion",
        "title": "Convince Skeptical CTO",
        "description": "Pitch to technical skeptic",
        "role": "Skeptical CTO",
        "difficulty": "Hard",
        "context": "15 years enterprise software experience.",
        "opening": "Another AI demo. Convince me.",
        "evaluation_focus": "Technical credibility",
    },
    {
        "id": "pitch-investors",
        "category": "Pitch and Persuasion",
        "title": "Pitch to Investors",
        "description": "Present to VCs",
        "role": "Venture Capitalist",
        "difficulty": "Hard",
        "context": "Series A, 10 minutes.",
        "opening": "You have 10 minutes.",
        "evaluation_focus": "Business model",
    },
    {
        "id": "debate-ai-education",
        "category": "Debate and Reasoning",
        "title": "Defend AI in Education",
        "description": "Argue for AI in learning",
        "role": "Skeptical Professor",
        "difficulty": "Hard",
        "context": "Professor skeptical about AI.",
        "opening": "AI does not belong in classroom.",
        "evaluation_focus": "Reasoning",
    },
    {
        "id": "drill-30sec",
        "category": "Quick Drills",
        "title": "30-Second Explanation",
        "description": "Explain blockchain briefly",
        "role": "Curious Layperson",
        "difficulty": "Easy",
        "context": "Explain blockchain simply.",
        "opening": "What is blockchain?",
        "evaluation_focus": "Simplicity",
    },
    {
        "id": "drill-reframe",
        "category": "Quick Drills",
        "title": "Reframe Negatively",
        "description": "Turn negative to positive",
        "role": "Critical Peer",
        "difficulty": "Easy",
        "context": "You got fired.",
        "opening": "You got fired?",
        "evaluation_focus": "Positivity",
    },
]

PERSONAS = {
    "naval": {
        "name": "Naval Ravikant",
        "style": "First principles, philosophical, concise",
        "vocabulary": ["leverage", "specific knowledge", "accountability"],
        "system_prompt": "Be concise, use first principles, ask why repeatedly.",
    },
    "hormozi": {
        "name": "Alex Hormozi",
        "style": "Direct, high-energy, metrics-driven",
        "vocabulary": ["ROI", "value", "numbers"],
        "system_prompt": "Be direct, use numbers, focus on ROI.",
    },
    "rogan": {
        "name": "Joe Rogan",
        "style": "Curious, conversational",
        "vocabulary": ["interesting", "tell me more"],
        "system_prompt": "Be curious, ask follow-up questions.",
    },
    "musk": {
        "name": "Elon Musk",
        "style": "Technical, ambitious",
        "vocabulary": ["physics", "first principles"],
        "system_prompt": "Be technical, think in probabilities.",
    },
}

# WARNING: CUSTOM_SCENARIOS is stored in-memory only and will be lost when the server restarts.
# For persistence, consider implementing file-based or database storage.
CUSTOM_SCENARIOS: Dict[str, Dict] = {}

REQUIRED_SCENARIO_FIELDS = [
    "id",
    "category",
    "title",
    "description",
    "role",
    "difficulty",
    "context",
    "opening",
    "evaluation_focus",
]


def add_custom_scenario(scenario: Dict) -> None:
    """Store a custom-generated scenario in memory."""
    for field in REQUIRED_SCENARIO_FIELDS:
        if field not in scenario:
            raise ValueError(f"Missing required field: {field}")
    CUSTOM_SCENARIOS[scenario["id"]] = scenario


def get_scenarios(
    category: Optional[str] = None, difficulty: Optional[str] = None
) -> List[Dict]:
    results = PREBUILT_SCENARIOS
    if category:
        results = [s for s in results if s["category"] == category]
    if difficulty:
        results = [s for s in results if s["difficulty"] == difficulty]
    return results


def get_scenario_by_id(scenario_id: str) -> Optional[Dict]:
    for s in PREBUILT_SCENARIOS:
        if s["id"] == scenario_id:
            return s
    return CUSTOM_SCENARIOS.get(scenario_id)


def get_personas() -> Dict:
    return PERSONAS


def get_persona(key: str) -> Optional[Dict]:
    return PERSONAS.get(key)
