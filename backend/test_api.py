import requests
import json

# Test the AI endpoint
try:
    response = requests.post('http://localhost:8000/api/ai-chat', 
                           json={'question': 'test'}, 
                           timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test if server is running at all
try:
    response = requests.get('http://localhost:8000/')
    print(f"Server status: {response.status_code}")
except Exception as e:
    print(f"Server not running: {e}")