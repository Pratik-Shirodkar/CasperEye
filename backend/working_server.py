from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import requests
import os

class WorkingAPIHandler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        self._set_headers()
        
        if self.path == '/':
            response = {"message": "SatoshisEye API", "status": "running"}
        elif self.path == '/api/risk-analysis':
            response = [
                {"chain": "Osmosis", "smart_money_btc": 350, "risk": "SAFE"},
                {"chain": "Neutron", "smart_money_btc": 45, "risk": "CRITICAL"},
                {"chain": "Levana", "smart_money_btc": 25, "risk": "CRITICAL"}
            ]
        elif self.path == '/api/graph-data':
            response = {
                "nodes": [
                    {"id": "osmosis", "name": "Osmosis", "group": "Chain", "val": 20},
                    {"id": "p2p", "name": "P2P Validator", "group": "Provider", "val": 15},
                    {"id": "whale", "name": "Whale Address", "group": "Whale", "val": 10}
                ],
                "links": [
                    {"source": "p2p", "target": "osmosis"},
                    {"source": "whale", "target": "p2p"}
                ]
            }
        else:
            response = {"error": "Not found"}
            
        self.wfile.write(json.dumps(response).encode())

    def do_POST(self):
        self._set_headers()
        
        if self.path == '/api/ai-chat':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                question = data.get('question', '')
                
                # Try OpenAI API first (more reliable)
                openai_key = os.getenv('OPENAI_API_KEY')
                agentrouter_key = os.getenv('AGENTROUTER_API_KEY')
                
                if openai_key and openai_key != 'your-api-key-here':
                    try:
                        context = """
                        You are a blockchain security analyst for SatoshisEye, analyzing Bitcoin staking risks on Babylon network.
                        
                        Current Risk Data:
                        - Osmosis: 350 BTC smart money backing (SAFE)
                        - Neutron: 45 BTC smart money backing (CRITICAL) 
                        - Levana: 25 BTC smart money backing (CRITICAL)
                        
                        Answer questions about blockchain security, smart money flows, and risk analysis.
                        Keep responses concise and actionable (max 2 sentences).
                        """
                        
                        response_ai = requests.post(
                            'https://api.openai.com/v1/chat/completions',
                            headers={
                                'Authorization': f'Bearer {openai_key}',
                                'Content-Type': 'application/json'
                            },
                            json={
                                'model': 'gpt-3.5-turbo',
                                'messages': [
                                    {'role': 'system', 'content': context},
                                    {'role': 'user', 'content': question}
                                ],
                                'max_tokens': 150
                            },
                            timeout=10
                        )
                        
                        if response_ai.status_code == 200:
                            ai_data = response_ai.json()
                            analysis = ai_data['choices'][0]['message']['content']
                        else:
                            raise Exception(f"OpenAI API Error: {response_ai.status_code}")
                            
                    except Exception as e:
                        print(f"OpenAI Error: {e}")
                        # Try AgentRouter as fallback
                        if agentrouter_key and agentrouter_key != 'your-api-key-here':
                    try:
                        context = """
                        You are a blockchain security analyst for SatoshisEye, analyzing Bitcoin staking risks on Babylon network.
                        
                        Current Risk Data:
                        - Osmosis: 350 BTC smart money backing (SAFE)
                        - Neutron: 45 BTC smart money backing (CRITICAL) 
                        - Levana: 25 BTC smart money backing (CRITICAL)
                        
                        Answer questions about blockchain security, smart money flows, and risk analysis.
                        Keep responses concise and actionable (max 2 sentences).
                        """
                        
                        response_ai = requests.post(
                            'https://api.agentrouter.com/v1/chat/completions',
                            headers={
                                'Authorization': f'Bearer {api_key}',
                                'Content-Type': 'application/json'
                            },
                            json={
                                'model': 'claude-3-sonnet-20240229',
                                'messages': [
                                    {'role': 'system', 'content': context},
                                    {'role': 'user', 'content': question}
                                ],
                                'max_tokens': 150
                            },
                            timeout=10,
                            verify=False  # Skip SSL verification
                        )
                        
                        if response_ai.status_code == 200:
                            ai_data = response_ai.json()
                            analysis = ai_data['choices'][0]['message']['content']
                        else:
                            raise Exception(f"API Error: {response_ai.status_code}")
                            
                    except Exception as e:
                        print(f"AgentRouter Error: {e}")
                        print(f"API Response: {response_ai.text if 'response_ai' in locals() else 'No response'}")
                        print(f"Status Code: {response_ai.status_code if 'response_ai' in locals() else 'No status'}")
                        # Fallback to mock
                        question_lower = question.lower()
                        if 'osmosis' in question_lower:
                            analysis = "Osmosis shows strong smart money backing (350 BTC) indicating institutional confidence. Low risk."
                        elif 'neutron' in question_lower:
                            analysis = "Neutron is under-secured with only 45 BTC smart money. Consider reducing exposure."
                        elif 'levana' in question_lower:
                            analysis = "Levana Protocol shows critical risk - only 25 BTC institutional backing. High volatility expected."
                        else:
                            analysis = "Based on current data, focus on chains with >100 BTC smart money backing for lower risk exposure."
                else:
                    # Mock responses when no API key
                    question_lower = question.lower()
                    if 'osmosis' in question_lower:
                        analysis = "Osmosis shows strong smart money backing (350 BTC) indicating institutional confidence. Low risk."
                    elif 'neutron' in question_lower:
                        analysis = "Neutron is under-secured with only 45 BTC smart money. Consider reducing exposure."
                    elif 'levana' in question_lower:
                        analysis = "Levana Protocol shows critical risk - only 25 BTC institutional backing. High volatility expected."
                    else:
                        analysis = "Based on current data, focus on chains with >100 BTC smart money backing for lower risk exposure."
                
                response = {"analysis": analysis}
                
            except Exception as e:
                print(f"POST Error: {e}")
                response = {"analysis": "I'm analyzing blockchain security patterns. Try asking about Osmosis, Neutron, or Levana."}
        else:
            response = {"error": "Invalid endpoint"}
            
        self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
    server = HTTPServer(('localhost', 8000), WorkingAPIHandler)
    print("SatoshisEye API running on http://localhost:8000")
    print("AI Analyst ready with mock responses")
    server.serve_forever()