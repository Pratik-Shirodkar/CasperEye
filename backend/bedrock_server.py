from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import boto3
import os
from gremlin_python.process.graph_traversal import __
from gremlin_python.process.traversal import T
import threading
import base64
from dotenv import load_dotenv
import time

# Load environment variables from .env
load_dotenv()

# Import local modules with error handling
try:
    from whale_subscription import WhaleSubscriptionService
except Exception as e:
    print(f"Warning: Failed to import WhaleSubscriptionService: {e}")
    WhaleSubscriptionService = None

try:
    from unbonding_forecast import UnbondingForecastService
except Exception as e:
    print(f"Warning: Failed to import UnbondingForecastService: {e}")
    UnbondingForecastService = None

try:
    from restaking_arbitrage import RestakingArbitrageBot
except Exception as e:
    print(f"Warning: Failed to import RestakingArbitrageBot: {e}")
    RestakingArbitrageBot = None

try:
    from transaction_executor import TransactionExecutor
except Exception as e:
    print(f"Warning: Failed to import TransactionExecutor: {e}")
    TransactionExecutor = None

try:
    from wallet_auth import (
        create_jwt_token, verify_jwt_token, verify_signature,
        generate_sign_message, extract_token_from_header
    )
except Exception as e:
    print(f"Warning: Failed to import wallet_auth: {e}")
    # Provide dummy implementations
    def create_jwt_token(addr): return "dummy_token"
    def verify_jwt_token(token): return {"wallet_address": "0x0"}
    def verify_signature(addr, msg, sig): return False
    def generate_sign_message(ts): return f"Sign this message: {ts}"
    def extract_token_from_header(h): return None

# Global connection pool
_gremlin_conn = None
_gremlin_lock = threading.Lock()

# Initialize services with fallbacks
try:
    whale_service = WhaleSubscriptionService() if WhaleSubscriptionService else None
except Exception as e:
    print(f"Warning: Failed to initialize WhaleSubscriptionService: {e}")
    whale_service = None

try:
    unbonding_service = UnbondingForecastService() if UnbondingForecastService else None
except Exception as e:
    print(f"Warning: Failed to initialize UnbondingForecastService: {e}")
    unbonding_service = None

try:
    arbitrage_bot = RestakingArbitrageBot() if RestakingArbitrageBot else None
except Exception as e:
    print(f"Warning: Failed to initialize RestakingArbitrageBot: {e}")
    arbitrage_bot = None

try:
    tx_executor = TransactionExecutor() if TransactionExecutor else None
except Exception as e:
    print(f"Warning: Failed to initialize TransactionExecutor: {e}")
    tx_executor = None

# Simple auth credentials (in production, use proper auth)
VALID_CREDENTIALS = {
    "admin": "casper2026"  # Change this in production
}



def get_gremlin_connection():
    """Get or create a reusable Gremlin connection"""
    global _gremlin_conn
    with _gremlin_lock:
        if _gremlin_conn is None:
            try:
                from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
                # Use environment variable or default to gremlin-server service name
                gremlin_endpoint = os.getenv('GREMLIN_ENDPOINT', 'ws://gremlin-server:8182/gremlin')
                _gremlin_conn = DriverRemoteConnection(gremlin_endpoint, 'g')
            except Exception as e:
                print(f"Failed to connect to Gremlin: {e}")
                return None
        return _gremlin_conn

def check_auth(handler):
    """Check Basic Auth header. Returns True if valid, False otherwise"""
    auth_header = handler.headers.get('Authorization', '')
    if not auth_header.startswith('Basic '):
        return False
    
    try:
        encoded = auth_header.split(' ')[1]
        decoded = base64.b64decode(encoded).decode('utf-8')
        username, password = decoded.split(':', 1)
        return VALID_CREDENTIALS.get(username) == password
    except:
        return False


def check_wallet_auth(handler):
    """Check JWT token from wallet authentication"""
    auth_header = handler.headers.get('Authorization', '')
    token = extract_token_from_header(auth_header)
    
    if not token:
        return None
    
    payload = verify_jwt_token(token)
    return payload.get('wallet_address') if payload else None

class BedrockAPIHandler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        self._set_headers()
    def do_POST(self):
        self._set_headers()
        response = {"error": "Invalid endpoint"}
        
        # Extract path without query parameters
        path = self.path.split('?')[0] if '?' in self.path else self.path
        
        if path == '/api/auth/sign-message':
            # Get message for user to sign
            try:
                timestamp = int(time.time())
                message = generate_sign_message(timestamp)
                response = {
                    "message": message,
                    "timestamp": timestamp
                }
            except Exception as e:
                print(f"Sign message error: {e}")
                response = {"error": str(e)}
        
        elif path == '/api/auth/verify-signature':
            # Verify signature and issue JWT token
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                wallet_address = data.get('wallet_address', '')
                message = data.get('message', '')
                signature = data.get('signature', '')
                
                print(f"[AUTH] Verify request - wallet: {wallet_address[:10]}..., msg_len: {len(message)}, sig_len: {len(signature)}")
                
                if not all([wallet_address, message, signature]):
                    response = {"error": "Missing required fields"}
                    print(f"[AUTH] Missing fields - wallet: {bool(wallet_address)}, msg: {bool(message)}, sig: {bool(signature)}")
                elif verify_signature(wallet_address, message, signature):
                    token = create_jwt_token(wallet_address)
                    response = {"success": True, "token": token, "wallet_address": wallet_address}
                    print(f"[AUTH] Success - token issued for {wallet_address[:10]}...")
                else:
                    response = {"error": "Invalid signature"}
                    print(f"[AUTH] Invalid signature")
            except Exception as e:
                print(f"Verify error: {e}")
                response = {"error": str(e)}
        
        elif path == '/api/restaking/simulate':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                from_protocol = data.get('from_protocol', '')
                to_protocol = data.get('to_protocol', '')
                amount_btc = float(data.get('amount_btc', 1.0))
                
                print(f"Simulate rotation: {from_protocol} -> {to_protocol}, {amount_btc} BTC")
                
                response = arbitrage_bot.simulate_rotation(from_protocol, to_protocol, amount_btc)
                
            except Exception as e:
                print(f"Simulation error: {e}")
                response = {"success": False, "message": f"Error: {str(e)}"}
        
        elif path == '/api/whale-alerts/subscribe':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                email = data.get('email', '')
                
                print(f"Subscribe request for email: {email}")
                
                if not email:
                    response = {"success": False, "message": "Email required"}
                else:
                    response = whale_service.subscribe_email(email)
                    print(f"Subscribe response: {response}")
                    
            except Exception as e:
                print(f"Subscribe error: {e}")
                import traceback
                traceback.print_exc()
                response = {"success": False, "message": f"Error: {str(e)}"}
                
        elif path == '/api/whale-alerts/unsubscribe':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                subscription_arn = data.get('subscription_arn', '')
                
                print(f"Unsubscribe request for: {subscription_arn}")
                
                if not subscription_arn:
                    response = {"success": False, "message": "Subscription ARN required"}
                else:
                    response = whale_service.unsubscribe(subscription_arn)
                    print(f"Unsubscribe response: {response}")
                    
            except Exception as e:
                print(f"Unsubscribe error: {e}")
                import traceback
                traceback.print_exc()
                response = {"success": False, "message": f"Error: {str(e)}"}
        
        elif path == '/api/restaking/execute':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                from_protocol = data.get('from_protocol', '')
                to_protocol = data.get('to_protocol', '')
                amount_btc = float(data.get('amount_btc', 1.0))
                wallet_address = data.get('wallet_address', '')
                
                print(f"\n🚀 EXECUTE ROTATION REQUEST")
                print(f"   From: {from_protocol}")
                print(f"   To: {to_protocol}")
                print(f"   Amount: {amount_btc} BTC")
                print(f"   Wallet: {wallet_address[:10]}...")
                
                if not all([from_protocol, to_protocol, amount_btc, wallet_address]):
                    response = {
                        "success": False,
                        "error": "Missing required fields",
                        "message": "from_protocol, to_protocol, amount_btc, and wallet_address are required"
                    }
                    print(f"   ❌ Missing fields")
                else:
                    response = tx_executor.execute_rotation(
                        from_protocol,
                        to_protocol,
                        amount_btc,
                        wallet_address
                    )
                    if response.get('success'):
                        print(f"   ✅ Execution successful: {response.get('tx_hash', 'N/A')[:20]}...")
                    else:
                        print(f"   ❌ Execution failed: {response.get('error', 'Unknown error')}")
                
            except Exception as e:
                print(f"Execution error: {e}")
                import traceback
                traceback.print_exc()
                response = {"success": False, "error": str(e), "message": "Failed to execute rotation"}
        
        elif path == '/api/restaking/history':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
                data = json.loads(post_data.decode('utf-8')) if post_data else {}
                wallet_address = data.get('wallet_address', '')
                
                history = tx_executor.get_transaction_history(wallet_address)
                total_profit = tx_executor.get_total_profit(wallet_address)
                
                response = {
                    "transactions": history,
                    "total_profit_btc": total_profit,
                    "transaction_count": len(history)
                }
                
            except Exception as e:
                print(f"History error: {e}")
                response = {"transactions": [], "total_profit_btc": 0, "transaction_count": 0}
        
        elif path == '/api/restaking/stats':
            try:
                stats = tx_executor.get_execution_stats()
                response = stats
            except Exception as e:
                print(f"Stats error: {e}")
                response = {
                    "total_transactions": 0,
                    "total_volume_btc": 0,
                    "total_profit_btc": 0,
                    "avg_roi_percent": 0,
                }
        
        elif path == '/api/ai-chat':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                question = data.get('question', '')
                
                # Try AWS Bedrock
                try:
                    bedrock = boto3.client(
                        service_name='bedrock-runtime',
                        region_name=os.getenv('AWS_REGION', 'us-east-1')
                    )
                    
                    context = """You are a blockchain security analyst for CasperEye, analyzing CSPR staking on Casper Network.
Current data: Top validators by stake - MAKE Software (15M CSPR, SAFE), HashQuark (12M CSPR, SAFE), Figment (10M CSPR, SAFE).
Whale threshold: 100,000 CSPR. Keep responses under 2 sentences."""
                    
                    prompt = f"{context}\n\nUser: {question}\n\nAssistant:"
                    
                    # Using Claude 3 Haiku (cheapest, fastest)
                    body = json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 150,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ]
                    })
                    
                    response_ai = bedrock.invoke_model(
                        modelId='anthropic.claude-3-haiku-20240307-v1:0',
                        body=body
                    )
                    
                    response_body = json.loads(response_ai['body'].read())
                    analysis = response_body['content'][0]['text']
                    print(f"Bedrock response: {analysis}")
                    
                except Exception as e:
                    print(f"Bedrock Error: {e}")
                    # Fallback to mock
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
        if 'make' in question_lower or 'software' in question_lower:
            return "MAKE Software validator shows strong institutional stake (15M CSPR) with low delegation rate. Recommended for large delegators."
        elif 'hashquark' in question_lower:
            return "HashQuark is a reliable validator with 12M CSPR stake. Good track record for consistent rewards."
        elif 'whale' in question_lower:
            return "Current whale activity: 3 accounts with >100K CSPR detected. Monitor for large delegation movements."
        elif 'risk' in question_lower:
            return "Overall network health: SAFE. Top 5 validators control 45% of stake - reasonable decentralization."
        else:
            return "Based on current data, focus on validators with >10M CSPR stake and <10% delegation rate for optimal returns."

if __name__ == "__main__":
    try:
        print("="*50)
        print("🔍 CasperEye - CSPR Staking Intelligence API")
        print("="*50)
        print(f"Gremlin endpoint: {os.getenv('GREMLIN_ENDPOINT', 'ws://gremlin-server:8182/gremlin')}")
        sns_arn = os.getenv('SNS_TOPIC_ARN')
        print(f"SNS Topic ARN: {'✅ Configured' if sns_arn else '❌ Not Configured (Check .env)'}")
        cspr_token = os.getenv('CSPR_CLOUD_TOKEN')
        print(f"CSPR.cloud Token: {'✅ Configured' if cspr_token else '⚠️ Not Configured (Demo mode)'}")
        
        server = HTTPServer(('0.0.0.0', 8000), BedrockAPIHandler)
        print("✅ CasperEye API running on http://0.0.0.0:8000")
        print("Using AWS Bedrock for AI responses")
        print("Configure AWS credentials: aws configure")
        server.serve_forever()
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        exit(1)