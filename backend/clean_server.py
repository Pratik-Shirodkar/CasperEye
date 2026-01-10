from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import requests
import os
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class CleanAPIHandler(BaseHTTPRequestHandler):
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
                
                # Try AgentRouter
                agentrouter_key = os.getenv('AGENTROUTER_API_KEY')
                if agentrouter_key:
                    try:
                        # Create session with SSL disabled
                        session = requests.Session()
                        session.verify = False
                        
                        # Try different endpoints
                        endpoints = [
                            'https://agentrouter.com/v1/chat/completions',
                            'https://api.agentrouter.ai/v1/chat/completions',
                            'http://api.agentrouter.com/v1/chat/completions'
                        ]
                        
                        response_ai = None
                        for endpoint in endpoints:
                            try:
                                print(f"Trying endpoint: {endpoint}")
                                response_ai = session.post(
                                    endpoint,
                                    headers={'Authorization': f'Bearer {agentrouter_key}', 'Content-Type': 'application/json'},
                                    json={
                                        'model': 'gpt-3.5-turbo',
                                        'messages': [
                                            {'role': 'system', 'content': 'You are a blockchain security analyst for SatoshisEye. Current data: Osmosis (350 BTC, SAFE), Neutron (45 BTC, CRITICAL), Levana (25 BTC, CRITICAL). Keep responses under 2 sentences.'},
                                            {'role': 'user', 'content': question}
                                        ],
                                        'max_tokens': 100
                                    },
                                    timeout=10
                                )
                                if response_ai.status_code == 200:
                                    break
                            except Exception as e:
                                print(f"Failed {endpoint}: {e}")
                                continue
                        
                        print(f"AgentRouter Status: {response_ai.status_code}")
                        print(f"AgentRouter Response: {response_ai.text[:200]}...")
                        
                        if response_ai.status_code == 200:
                            ai_data = response_ai.json()
                            analysis = ai_data['choices'][0]['message']['content']
                        else:
                            raise Exception(f"API failed with status {response_ai.status_code}")
                            
                    except Exception as e:
                        print(f"AgentRouter Error: {e}")
                        analysis = self.get_mock_response(question)
                else:
                    print("No AGENTROUTER_API_KEY found")
                    analysis = self.get_mock_response(question)
                
                response = {"analysis": analysis}
                
            except Exception as e:
                print(f"POST Error: {e}")
                response = {"analysis": "Error processing request. Try asking about Osmosis, Neutron, or Levana."}
        else:
            response = {"error": "Invalid endpoint"}
            
        self.wfile.write(json.dumps(response).encode())
    
    def get_mock_response(self, question):
        question_lower = question.lower()
        if 'osmosis' in question_lower:
            return "Osmosis shows strong smart money backing (350 BTC) indicating institutional confidence. Low risk."
        elif 'neutron' in question_lower:
            return "Neutron is under-secured with only 45 BTC smart money. Consider reducing exposure."
        elif 'levana' in question_lower:
            return "Levana Protocol shows critical risk - only 25 BTC institutional backing. High volatility expected."
        else:
            return "Based on current data, focus on chains with >100 BTC smart money backing for lower risk exposure."

if __name__ == "__main__":
    server = HTTPServer(('localhost', 8000), CleanAPIHandler)
    print("SatoshisEye API running on http://localhost:8000")
    print("Set AGENTROUTER_API_KEY for real AI responses")
    server.serve_forever()