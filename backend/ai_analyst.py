import requests
import json
import os

AGENTROUTER_API_KEY = os.getenv("AGENTROUTER_API_KEY", "your-api-key-here")
AGENTROUTER_API_URL = "https://api.agentrouter.com/v1/chat/completions"

def analyze_with_agentrouter(question, risk_data):
    """Send question to AgentRouter with context about current risk data"""
    
    context = f"""
    You are a blockchain security analyst for SatoshisEye, analyzing Bitcoin staking risks on Babylon network.
    
    Current Risk Data:
    {json.dumps(risk_data, indent=2)}
    
    Answer the user's question about blockchain security, smart money flows, and risk analysis.
    Keep responses concise and actionable.
    """
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AGENTROUTER_API_KEY}"
    }
    
    payload = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 300,
        "messages": [
            {
                "role": "system",
                "content": context
            },
            {
                "role": "user", 
                "content": question
            }
        ]
    }
    
    try:
        response = requests.post(AGENTROUTER_API_URL, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            return f"API Error: {response.status_code}"
    except Exception as e:
        return f"Error connecting to AgentRouter: {str(e)}"

def get_mock_analysis(question):
    """Fallback mock responses when Claude API isn't available"""
    responses = {
        "osmosis": "Osmosis shows strong smart money backing (350 BTC) indicating institutional confidence. Low risk.",
        "neutron": "Neutron is under-secured with only 45 BTC smart money. Consider reducing exposure.",
        "levana": "Levana Protocol shows critical risk - only 25 BTC institutional backing. High volatility expected.",
        "risk": "Current market shows flight to quality - institutions moving to Osmosis from smaller chains.",
        "default": "Based on current data, focus on chains with >100 BTC smart money backing for lower risk exposure."
    }
    
    question_lower = question.lower()
    for key, response in responses.items():
        if key in question_lower:
            return response
    
    return responses["default"]