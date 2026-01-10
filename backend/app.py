from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import boto3
import os
from gremlin_python.process.graph_traversal import __
from gremlin_python.process.traversal import T
import threading
import base64
from dotenv import load_dotenv
import time
from datetime import datetime, timezone
import logging

# Load environment variables from .env
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

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


def get_gremlin_connection():
    """Get or create a reusable Gremlin connection with retry logic"""
    global _gremlin_conn
    with _gremlin_lock:
        if _gremlin_conn is None:
            from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
            gremlin_endpoint = os.getenv('GREMLIN_ENDPOINT', 'ws://gremlin-server:8182/gremlin')
            
            # Retry logic with exponential backoff
            max_retries = 3
            retry_delay = 1  # seconds
            
            for attempt in range(max_retries):
                try:
                    logger.info(f"Attempting Gremlin connection (attempt {attempt + 1}/{max_retries})...")
                    _gremlin_conn = DriverRemoteConnection(
                        gremlin_endpoint, 
                        'g',
                        max_workers=4
                    )
                    logger.info(f"✅ Successfully connected to Gremlin at {gremlin_endpoint}")
                    break
                except Exception as e:
                    logger.error(f"❌ Gremlin connection attempt {attempt + 1} failed: {e}")
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        logger.error(f"Failed to connect to Gremlin after {max_retries} attempts")
                        return None
        return _gremlin_conn


def check_wallet_auth():
    """Check JWT token from wallet authentication"""
    auth_header = request.headers.get('Authorization', '')
    token = extract_token_from_header(auth_header)
    
    if not token:
        return None
    
    payload = verify_jwt_token(token)
    return payload.get('wallet_address') if payload else None


@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "SatoshisEye API", "status": "running"}), 200


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Docker health checks"""
    return jsonify({"status": "healthy"}), 200


@app.route('/api/auth/sign-message', methods=['POST', 'OPTIONS'])
def sign_message():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        timestamp = int(time.time())
        message = generate_sign_message(timestamp)
        return jsonify({
            "message": message,
            "timestamp": timestamp
        }), 200
    except Exception as e:
        print(f"Sign message error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/verify-signature', methods=['POST', 'OPTIONS'])
def verify_sig():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address', '')
        message = data.get('message', '')
        signature = data.get('signature', '')
        
        print(f"[AUTH] Verify request - wallet: {wallet_address[:10]}..., msg_len: {len(message)}, sig_len: {len(signature)}")
        
        if not all([wallet_address, message, signature]):
            return jsonify({"error": "Missing required fields"}), 400
        
        if verify_signature(wallet_address, message, signature):
            token = create_jwt_token(wallet_address)
            print(f"✅ Wallet authenticated: {wallet_address}")
            return jsonify({
                "success": True,
                "token": token,
                "wallet_address": wallet_address.lower()
            }), 200
        else:
            print(f"❌ Invalid signature for wallet: {wallet_address}")
            return jsonify({"error": "Invalid signature"}), 401
    except Exception as e:
        print(f"Signature verification error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/metrics', methods=['GET'])
def metrics():
    # Metrics are public network data, no auth required
    try:
        from gremlin_python.process.anonymous_traversal import traversal
        
        conn = get_gremlin_connection()
        if conn is None:
            raise Exception("No Gremlin connection available")
        
        g = traversal().withRemote(conn)
        
        try:
            all_nodes = g.V().valueMap(True).toList()
            
            whales = sum(1 for n in all_nodes if n.get('group', [''])[0] == 'Whale')
            providers = sum(1 for n in all_nodes if n.get('group', [''])[0] == 'Provider')
            chains = sum(1 for n in all_nodes if n.get('group', [''])[0] == 'Chain')
            
            print(f"DEBUG: Found {len(all_nodes)} total nodes: {whales} whales, {providers} providers, {chains} chains")
        except Exception as e:
            print(f"Error counting nodes: {e}")
            whales = 5
            providers = 8
            chains = 3
        
        whales = max(1, whales)
        providers = max(1, providers)
        chains = max(1, chains)
        
        total_btc = whales * 2.5
        concentration = min(1.0, max(0.0, 0.2 + (whales * 0.05)))
        
        concentration_risk = concentration * 4
        provider_risk = max(0, (1 - (providers / 15)) * 3)
        chain_risk = max(0, (1 - (chains / 5)) * 3)
        risk_score = max(0, min(10, concentration_risk + provider_risk + chain_risk))
        
        return jsonify({
            "total_staked_btc": round(total_btc, 2),
            "total_providers": int(providers),
            "total_chains": int(chains),
            "concentration_ratio": round(concentration, 2),
            "risk_score": round(risk_score, 1),
            "last_update": datetime.now(timezone.utc).isoformat()
        }), 200
    except Exception as e:
        print(f"Error calculating metrics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "total_staked_btc": 12.5,
            "total_providers": 8,
            "total_chains": 3,
            "concentration_ratio": 0.65,
            "risk_score": 5.2,
            "last_update": datetime.now(timezone.utc).isoformat()
        }), 200


@app.route('/api/risk-analysis', methods=['GET'])
def risk_analysis():
    try:
        return jsonify([
            {"chain": "Osmosis", "smart_money_btc": 12.5, "risk": "MODERATE"},
            {"chain": "Neutron", "smart_money_btc": 7.5, "risk": "CRITICAL"},
            {"chain": "Stargaze", "smart_money_btc": 5.0, "risk": "CRITICAL"}
        ]), 200
    except Exception as e:
        print(f"Error calculating risk analysis: {e}")
        return jsonify([
            {"chain": "Osmosis", "smart_money_btc": 12.5, "risk": "MODERATE"},
            {"chain": "Neutron", "smart_money_btc": 7.5, "risk": "CRITICAL"},
            {"chain": "Stargaze", "smart_money_btc": 5.0, "risk": "CRITICAL"}
        ]), 200


@app.route('/api/graph-data', methods=['GET'])
def graph_data():
    try:
        from gremlin_python.process.anonymous_traversal import traversal
        
        conn = get_gremlin_connection()
        if conn is None:
            raise Exception("No Gremlin connection available")
        
        g = traversal().withRemote(conn)
        
        vertices = g.V().limit(50).valueMap(True).toList()
        nodes = []
        id_to_name = {}
        
        for v in vertices:
            vid = v[T.id]
            name = v.get('name', v.get('pk', [f'Node-{vid}']))[0]
            name = str(name)[:30]
            
            id_to_name[vid] = name
            nodes.append({
                "id": name,
                "name": name,
                "group": v.get('group', ['Provider'])[0],
                "val": v.get('val', [10])[0]
            })
        
        edges_raw = g.E().limit(100).toList()
        links = []
        
        for e in edges_raw:
            try:
                source_id = e.outV.id
                target_id = e.inV.id
                
                source_name = id_to_name.get(source_id)
                target_name = id_to_name.get(target_id)
                
                if source_name and target_name:
                    links.append({
                        "source": source_name,
                        "target": target_name
                    })
            except Exception as e_err:
                print(f"Edge error: {e_err}")
                continue
        
        print(f"Live data: {len(nodes)} nodes, {len(links)} links")
        return jsonify({"nodes": nodes, "links": links}), 200
        
    except Exception as e:
        print(f"Gremlin error: {e}")
        return jsonify({
            "nodes": [
                {"id": "osmosis", "name": "Osmosis", "group": "Chain", "val": 25},
                {"id": "p2p", "name": "P2P Validator", "group": "Provider", "val": 18}
            ],
            "links": [{"source": "p2p", "target": "osmosis"}]
        }), 200


@app.route('/api/unbonding-forecast', methods=['GET'])
def unbonding_forecast():
    try:
        if unbonding_service:
            forecast_data = unbonding_service.calculate_forecast(days_ahead=90)
            return jsonify(forecast_data), 200
        else:
            raise Exception("Unbonding service not available")
    except Exception as e:
        print(f"Error calculating unbonding forecast: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "forecast": [
                {
                    "date": "2025-11-28",
                    "total_btc": 5000,
                    "risk_level": "CRITICAL",
                    "whale_count": 3,
                    "events": [
                        {"delegator": "0x123...", "amount_btc": 2000, "tx_hash": "abc..."},
                        {"delegator": "0x456...", "amount_btc": 3000, "tx_hash": "def..."}
                    ]
                }
            ],
            "supply_shock_dates": ["2025-11-28"],
            "statistics": {
                "total_btc_unlocking": 5000,
                "max_daily_unlock": 5000,
                "avg_daily_unlock": 500,
                "days_analyzed": 90,
                "shock_count": 1
            }
        }), 200


@app.route('/api/unbonding-heatmap', methods=['GET'])
def unbonding_heatmap():
    try:
        if unbonding_service:
            heatmap_data = unbonding_service.get_heatmap_data()
            return jsonify({"heatmap": heatmap_data}), 200
        else:
            return jsonify({"heatmap": []}), 200
    except Exception as e:
        print(f"Error getting heatmap data: {e}")
        return jsonify({"heatmap": []}), 200


@app.route('/api/restaking/opportunities', methods=['GET'])
def restaking_opportunities():
    try:
        if arbitrage_bot:
            opportunities = arbitrage_bot.detect_opportunities()
            top_opps = arbitrage_bot.get_top_opportunities(5)
            metrics = arbitrage_bot.get_performance_metrics()
            
            return jsonify({
                "opportunities": opportunities,
                "top_opportunities": top_opps,
                "metrics": metrics,
            }), 200
        else:
            return jsonify({"opportunities": [], "top_opportunities": [], "metrics": {}}), 200
    except Exception as e:
        print(f"Error detecting opportunities: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"opportunities": [], "top_opportunities": [], "metrics": {}}), 200


@app.route('/api/restaking/apy-history', methods=['GET'])
def restaking_apy_history():
    try:
        if arbitrage_bot:
            history = {}
            for protocol in ['lombard', 'solv', 'babylon']:
                history[protocol] = arbitrage_bot.get_apy_history(protocol, hours=24)
            return jsonify({"history": history}), 200
        else:
            return jsonify({"history": {}}), 200
    except Exception as e:
        print(f"Error getting APY history: {e}")
        return jsonify({"history": {}}), 200


@app.route('/api/restaking/performance', methods=['GET'])
def restaking_performance():
    try:
        if arbitrage_bot:
            return jsonify(arbitrage_bot.get_performance_metrics()), 200
        else:
            return jsonify({}), 200
    except Exception as e:
        print(f"Error getting performance: {e}")
        return jsonify({}), 200


@app.route('/api/restaking/simulate', methods=['POST', 'OPTIONS'])
def restaking_simulate():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        from_protocol = data.get('from_protocol', '')
        to_protocol = data.get('to_protocol', '')
        amount_btc = float(data.get('amount_btc', 1.0))
        
        print(f"Simulate rotation: {from_protocol} -> {to_protocol}, {amount_btc} BTC")
        
        if arbitrage_bot:
            response = arbitrage_bot.simulate_rotation(from_protocol, to_protocol, amount_btc)
            return jsonify(response), 200
        else:
            return jsonify({"success": False, "message": "Arbitrage bot not available"}), 500
        
    except Exception as e:
        print(f"Simulation error: {e}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


@app.route('/api/restaking/execute', methods=['POST', 'OPTIONS'])
def restaking_execute():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        
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
            print(f"   ❌ Missing fields")
            return jsonify({
                "success": False,
                "error": "Missing required fields",
                "message": "from_protocol, to_protocol, amount_btc, and wallet_address are required"
            }), 400
        
        if tx_executor:
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
            return jsonify(response), 200
        else:
            return jsonify({"success": False, "error": "Transaction executor not available"}), 500
        
    except Exception as e:
        print(f"Execution error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e), "message": "Failed to execute rotation"}), 500


@app.route('/api/restaking/history', methods=['POST', 'OPTIONS'])
def restaking_history():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json() or {}
        wallet_address = data.get('wallet_address', '')
        
        if tx_executor:
            history = tx_executor.get_transaction_history(wallet_address)
            total_profit = tx_executor.get_total_profit(wallet_address)
            
            return jsonify({
                "transactions": history,
                "total_profit_btc": total_profit,
                "transaction_count": len(history)
            }), 200
        else:
            return jsonify({"transactions": [], "total_profit_btc": 0, "transaction_count": 0}), 200
        
    except Exception as e:
        print(f"History error: {e}")
        return jsonify({"transactions": [], "total_profit_btc": 0, "transaction_count": 0}), 200


@app.route('/api/restaking/stats', methods=['GET'])
def restaking_stats():
    try:
        if tx_executor:
            stats = tx_executor.get_execution_stats()
            return jsonify(stats), 200
        else:
            return jsonify({
                "total_transactions": 0,
                "total_volume_btc": 0,
                "total_profit_btc": 0,
                "avg_roi_percent": 0,
            }), 200
    except Exception as e:
        print(f"Stats error: {e}")
        return jsonify({
            "total_transactions": 0,
            "total_volume_btc": 0,
            "total_profit_btc": 0,
            "avg_roi_percent": 0,
        }), 200


@app.route('/api/whale-alerts/subscribe', methods=['POST', 'OPTIONS'])
def whale_alerts_subscribe():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        email = data.get('email', '')
        
        print(f"Subscribe request for email: {email}")
        
        if not email:
            return jsonify({"success": False, "message": "Email required"}), 400
        
        if whale_service:
            response = whale_service.subscribe_email(email)
            print(f"Subscribe response: {response}")
            return jsonify(response), 200
        else:
            return jsonify({"success": False, "message": "Whale service not available"}), 500
            
    except Exception as e:
        print(f"Subscribe error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


@app.route('/api/whale-alerts/unsubscribe', methods=['POST', 'OPTIONS'])
def whale_alerts_unsubscribe():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        subscription_arn = data.get('subscription_arn', '')
        
        print(f"Unsubscribe request for: {subscription_arn}")
        
        if not subscription_arn:
            return jsonify({"success": False, "message": "Subscription ARN required"}), 400
        
        if whale_service:
            response = whale_service.unsubscribe(subscription_arn)
            print(f"Unsubscribe response: {response}")
            return jsonify(response), 200
        else:
            return jsonify({"success": False, "message": "Whale service not available"}), 500
            
    except Exception as e:
        print(f"Unsubscribe error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


@app.route('/api/ai-chat', methods=['POST', 'OPTIONS'])
def ai_chat():
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        question = data.get('question', '')
        
        # Try AWS Bedrock
        try:
            bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            
            context = """You are a blockchain security analyst for SatoshisEye. 
Current data: Osmosis (350 BTC, SAFE), Neutron (45 BTC, CRITICAL), Levana (25 BTC, CRITICAL). 
Keep responses under 2 sentences."""
            
            prompt = f"{context}\n\nUser: {question}\n\nAssistant:"
            
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
            analysis = get_mock_response(question)
        
        return jsonify({"analysis": analysis}), 200
        
    except Exception as e:
        print(f"AI Chat Error: {e}")
        return jsonify({"analysis": "Error processing request. Try asking about Osmosis, Neutron, or Levana."}), 500


def get_mock_response(question):
    question_lower = question.lower()
    if 'osmosis' in question_lower:
        return "Osmosis shows strong smart money backing (350 BTC) indicating institutional confidence. Low risk."
    elif 'neutron' in question_lower:
        return "Neutron is under-secured with only 45 BTC smart money. Consider reducing exposure."
    elif 'levana' in question_lower:
        return "Levana Protocol shows critical risk - only 25 BTC institutional backing. High volatility expected."
    else:
        return "Based on current data, focus on chains with >100 BTC smart money backing for lower risk exposure."


if __name__ == '__main__':
    logger.info("🚀 Starting SatoshisEye API on 0.0.0.0:8000")
    app.run(host='0.0.0.0', port=8000, debug=False)
