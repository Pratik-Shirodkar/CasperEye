import time
import requests
import json
import logging

# --- CONFIGURATION ---
BABYLON_API = "https://babylon-testnet-api.polkachu.com"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabylonIndexer")

class SimpleBabylonIngestor:
    def __init__(self):
        self.data = {
            "providers": [],
            "chains": [],
            "delegations": [],
            "last_update": time.time()
        }
        
    def fetch_finality_providers(self):
        """Fetches REAL Finality Providers from Babylon Chain"""
        endpoint = f"{BABYLON_API}/babylon/btcstaking/v1/finality_providers"
        try:
            logger.info(f"📡 Fetching Finality Providers...")
            response = requests.get(endpoint, timeout=10)
            if response.status_code == 200:
                data = response.json()
                providers = data.get('finality_providers', [])
                
                self.data["providers"] = []
                for fp in providers:
                    btc_pk = fp.get('btc_pk_hex', 'unknown')
                    description = fp.get('description', {})
                    moniker = description.get('moniker', f"Validator-{btc_pk[:6]}")
                    
                    self.data["providers"].append({
                        "id": btc_pk,
                        "name": moniker,
                        "type": "FinalityProvider",
                        "commission": fp.get('commission', '0.05')
                    })
                    
                logger.info(f"✅ Found {len(providers)} Live Finality Providers")
            else:
                logger.warning(f"API returned {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Error fetching providers: {e}")

    def fetch_live_delegations(self):
        """Fetches REAL recent staking transactions"""
        endpoint = f"{BABYLON_API}/cosmos/tx/v1beta1/txs"
        params = {
            "events": "message.action='/babylon.btcstaking.v1.MsgCreateBTCDelegation'",
            "pagination.limit": 10,
            "order_by": "ORDER_BY_DESC"
        }
        
        try:
            logger.info(f"📡 Fetching Live BTC Delegations...")
            response = requests.get(endpoint, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                txs = data.get('tx_responses', [])
                
                logger.info(f"✅ Found {len(txs)} recent transactions")
                
                # Save to file for API to read
                with open('live_data.json', 'w') as f:
                    json.dump({
                        "providers": self.data["providers"],
                        "transactions": len(txs),
                        "last_update": time.time()
                    }, f)
            else:
                logger.warning(f"TX API returned {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Error fetching delegations: {e}")

    def run_forever(self):
        logger.info("🚀 Starting Babylon Live Ingester (Simple Mode)")
        while True:
            try:
                self.fetch_finality_providers()
                self.fetch_live_delegations()
                logger.info("💤 Sleeping 60s before next scan...")
                time.sleep(60)
            except KeyboardInterrupt:
                logger.info("👋 Shutting down ingester")
                break
            except Exception as e:
                logger.error(f"❌ Unexpected error: {e}")
                time.sleep(30)

if __name__ == "__main__":
    ingester = SimpleBabylonIngestor()
    ingester.run_forever()