import requests
import json

# Test with a specific question
try:
    response = requests.post('http://localhost:8000/api/ai-chat', 
                           json={'question': 'What is the risk with Osmosis chain?'}, 
                           timeout=15)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")