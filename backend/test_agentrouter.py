import requests
import os

api_key = os.getenv('AGENTROUTER_API_KEY')
print(f"API Key: {api_key[:10]}..." if api_key else "No API key found")

if api_key:
    try:
        response = requests.post(
            'https://api.agentrouter.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'claude-3-sonnet-20240229',
                'messages': [
                    {'role': 'user', 'content': 'Hello, test message'}
                ],
                'max_tokens': 50
            },
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Direct API Error: {e}")
else:
    print("Set AGENTROUTER_API_KEY environment variable")