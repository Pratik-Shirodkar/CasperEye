from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
import os

class APIHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        if self.path == '/':
            response = {"message": "SatoshisEye API", "status": "running"}
        elif self.path == '/api/risk-analysis':
            response = [
                {
                    "chain": "Osmosis",
                    "smart_money_btc": 350,
                    "risk": "SAFE"
                },
                {
                    "chain": "Neutron", 
                    "smart_money_btc": 45,
                    "risk": "CRITICAL"
                },
                {
                    "chain": "Levana",
                    "smart_money_btc": 25,
                    "risk": "CRITICAL"
                }
            ]
        elif self.path.startswith('/risk/chain/'):
            chain_id = self.path.split('/')[-1]
            # Calculate smart money for the chain
            smart_money = 350 if chain_id == "osmosis" else 100  # Osmosis has both whales
            response = {
                "chain_id": chain_id,
                "total_smart_money_btc": smart_money,
                "risk_level": "SAFE" if smart_money >= 100 else "CRITICAL",
                "threshold": 100
            }
        elif self.path == '/api/graph-data':
            response = {
                "nodes": [
                    {"id": "osmosis", "type": "ConsumerChain", "name": "Osmosis", "val": 20},
                    {"id": "neutron", "type": "ConsumerChain", "name": "Neutron", "val": 15},
                    {"id": "levana", "type": "ConsumerChain", "name": "Levana", "val": 10},
                    {"id": "p2p", "type": "FinalityProvider", "name": "P2P Validator", "val": 12},
                    {"id": "chorus", "type": "FinalityProvider", "name": "Chorus One", "val": 10},
                    {"id": "whale_a", "type": "Address", "label": "Smart Money", "amount": 100, "val": 8},
                    {"id": "whale_b", "type": "Address", "label": "Smart Money", "amount": 250, "val": 10},
                    {"id": "retail_x", "type": "Address", "label": "Retail", "amount": 0.5, "val": 3}
                ],
                "links": [
                    {"source": "p2p", "target": "osmosis", "label": "SECURES"},
                    {"source": "p2p", "target": "neutron", "label": "SECURES"},
                    {"source": "chorus", "target": "osmosis", "label": "SECURES"},
                    {"source": "chorus", "target": "levana", "label": "SECURES"},
                    {"source": "whale_a", "target": "p2p", "label": "STAKED_WITH"},
                    {"source": "whale_b", "target": "chorus", "label": "STAKED_WITH"},
                    {"source": "retail_x", "target": "p2p", "label": "STAKED_WITH"}
                ]
            }
        elif self.path == '/api/ai-chat':
            # Handle POST request for AI chat
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                try:
                    data = json.loads(post_data.decode('utf-8'))
                    question = data.get('question', '')
                    
                    # Import AI analyst
                    from ai_analyst import get_mock_analysis, analyze_with_agentrouter
                    
                    # Get current risk data for context
                    risk_context = [
                        {"chain": "Osmosis", "smart_money_btc": 350, "risk": "SAFE"},
                        {"chain": "Neutron", "smart_money_btc": 45, "risk": "CRITICAL"},
                        {"chain": "Levana", "smart_money_btc": 25, "risk": "CRITICAL"}
                    ]
                    
                    # Try AgentRouter first, fallback to mock
                    try:
                        if os.getenv("AGENTROUTER_API_KEY") and os.getenv("AGENTROUTER_API_KEY") != "your-api-key-here":
                            analysis = analyze_with_agentrouter(question, risk_context)
                        else:
                            analysis = get_mock_analysis(question)
                    except Exception as e:
                        print(f"AI Error: {e}")
                        analysis = get_mock_analysis(question)
                    response = {"analysis": analysis}
                except Exception as e:
                    print(f"Request error: {e}")
                    # Fallback to mock response
                    from ai_analyst import get_mock_analysis
                    analysis = get_mock_analysis("general")
                    response = {"analysis": analysis}
            else:
                response = {"error": "No data provided"}
        else:
            response = {"error": "Not found"}
            
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        if self.path == '/api/ai-chat':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                question = data.get('question', 'general')
                
                from ai_analyst import get_mock_analysis
                analysis = get_mock_analysis(question)
                response = {"analysis": analysis}
                
            except Exception as e:
                print(f"POST Error: {e}")
                response = {"analysis": "I'm analyzing blockchain security patterns. Try asking about specific chains like Osmosis or Neutron."}
        else:
            response = {"error": "Invalid endpoint"}
            
        self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
    server = HTTPServer(('localhost', 8000), APIHandler)
    print("SatoshisEye API running on http://localhost:8000")
    print("AI Analyst ready - set AGENTROUTER_API_KEY environment variable for AgentRouter integration")
    server.serve_forever()