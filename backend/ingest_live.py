import time
import requests
import logging
from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.anonymous_traversal import traversal
from gremlin_python.process.graph_traversal import __
from whale_alerts import WhaleAlertService

# --- CONFIGURATION ---
# Official Babylon Testnet API (Polkachu or similar)
BABYLON_API = "https://babylon-testnet-api.polkachu.com"
NEPTUNE_URI = 'ws://gremlin-server:8182/gremlin'  # Use service name for Docker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabylonIndexer")

class BabylonIngestor:
    def __init__(self):
        self.conn = None
        self.g = None
        self.whale_alerts = WhaleAlertService()
        self.connect_with_retry()

    def connect_with_retry(self):
        """Connect to Gremlin with exponential backoff"""
        max_retries = 30
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                logger.info(f"🔌 Connecting to Gremlin at {NEPTUNE_URI} (Attempt {attempt+1}/{max_retries})...")
                self.conn = DriverRemoteConnection(NEPTUNE_URI, 'g')
                self.g = traversal().withRemote(self.conn)
                # Test connection
                self.g.V().limit(1).toList()
                logger.info("✅ Connected to Gremlin successfully!")
                return
            except Exception as e:
                logger.warning(f"⚠️  Connection failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    retry_delay = min(retry_delay * 1.5, 30)  # Cap delay at 30s
        
        logger.error("❌ Could not connect to Gremlin after multiple attempts.")
        raise Exception("Gremlin connection failed")
        
    def clean_graph(self):
        """Only run this on first startup to clear old data"""
        logger.info("🧹 Cleaning old graph data...")
        try:
            self.g.V().drop().toList()  # Use toList() instead of iterate()
            logger.info("✅ Graph cleaned successfully")
        except Exception as e:
            logger.warning(f"Could not clear graph (may be empty): {e}")
            # Try alternative method
            try:
                self.conn.close()
                self.conn = DriverRemoteConnection(NEPTUNE_URI, 'g')
                self.g = traversal().withRemote(self.conn)
            except:
                pass
    
    def seed_demo_data(self):
        """Add demo whales and retail stakers for visualization"""
        logger.info("🌱 Seeding demo address data...")
        try:
            # Create demo whales (>1 BTC)
            whales = [
                {"addr": "bc1q_whale_1", "btc": 5.2, "name": "Whale 1"},
                {"addr": "bc1q_whale_2", "btc": 3.8, "name": "Whale 2"},
                {"addr": "bc1q_whale_3", "btc": 2.1, "name": "Whale 3"},
                {"addr": "bc1q_whale_4", "btc": 1.5, "name": "Whale 4"},
                {"addr": "bc1q_whale_5", "btc": 1.2, "name": "Whale 5"},
            ]
            
            for whale in whales:
                try:
                    self.g.addV('Address') \
                        .property('address', whale['addr']) \
                        .property('label', 'Whale') \
                        .property('group', 'Whale') \
                        .property('btc_amount', whale['btc']) \
                        .property('val', 10) \
                        .next()
                except:
                    pass
            
            # Create demo retail stakers (≤1 BTC)
            retail = [
                {"addr": "bc1q_retail_1", "btc": 0.8, "name": "Retail 1"},
                {"addr": "bc1q_retail_2", "btc": 0.5, "name": "Retail 2"},
                {"addr": "bc1q_retail_3", "btc": 0.3, "name": "Retail 3"},
            ]
            
            for ret in retail:
                try:
                    self.g.addV('Address') \
                        .property('address', ret['addr']) \
                        .property('label', 'Retail') \
                        .property('group', 'Retail') \
                        .property('btc_amount', ret['btc']) \
                        .property('val', 10) \
                        .next()
                except:
                    pass
            
            logger.info(f"✅ Seeded {len(whales)} whales and {len(retail)} retail stakers")
        except Exception as e:
            logger.warning(f"Could not seed demo data: {e}")

    def fetch_finality_providers(self):
        """Fetches REAL Finality Providers from Babylon Chain"""
        endpoint = f"{BABYLON_API}/babylon/btcstaking/v1/finality_providers"
        try:
            logger.info(f"📡 Fetching Finality Providers from {endpoint}...")
            response = requests.get(endpoint, timeout=10).json()
            providers = response.get('finality_providers', [])
            
            count = 0
            for fp in providers[:10]:  # Limit to first 10 providers
                # Extract Real Data
                btc_pk = fp.get('btc_pk_hex', 'unknown')
                description = fp.get('description', {})
                moniker = description.get('moniker', f"Validator-{btc_pk[:6]}")
                commission = fp.get('commission', '0.05')
                
                # Check if provider already exists by name
                try:
                    existing = self.g.V().has('FinalityProvider', 'name', moniker).toList()
                    if existing:
                        logger.debug(f"Provider {moniker} already exists")
                        continue
                except:
                    pass
                
                # Create provider node
                try:
                    v = self.g.addV('FinalityProvider') \
                        .property('pk', btc_pk) \
                        .property('name', moniker) \
                        .property('commission', commission) \
                        .property('group', 'Provider') \
                        .property('val', 20) \
                        .next()
                    count += 1
                    logger.info(f"✅ Created provider: {moniker}")
                except Exception as create_err:
                    logger.debug(f"Provider creation note: {create_err}")
                
                # Link to chains
                self._link_to_chains(v)
                
            logger.info(f"✅ Indexed {count} new Finality Providers.")
            
        except Exception as e:
            logger.error(f"❌ Error fetching providers: {e}")

    def _link_to_chains(self, provider_vertex):
        """
        Links providers to Consumer Chains. 
        Note: On Testnet, we infer this based on standard active chains.
        """
        chains = ['Osmosis', 'Neutron', 'Stargaze']
        import random
        # Randomly assign real providers to chains to visualize the security mesh
        secured_chain = random.choice(chains)
        
        # Find or create chain node
        try:
            chain_v = self.g.V().has('ConsumerChain', 'name', secured_chain).next()
        except:
            # Create if doesn't exist
            chain_v = self.g.addV('ConsumerChain').property('name', secured_chain).property('group', 'Chain').property('val', 30).next()
            
        self.g.V(provider_vertex).addE('SECURES').to(chain_v).next()

    def fetch_live_delegations(self):
        """
        Fetches REAL recent staking transactions.
        """
        # Query for MsgCreateBTCDelegation transactions
        endpoint = f"{BABYLON_API}/cosmos/tx/v1beta1/txs"
        params = {
            "events": "message.action='/babylon.btcstaking.v1.MsgCreateBTCDelegation'",
            "pagination.limit": 20,
            "order_by": "ORDER_BY_DESC"
        }
        
        try:
            logger.info(f"📡 Fetching Live BTC Delegations...")
            response = requests.get(endpoint, params=params, timeout=10).json()
            txs = response.get('tx_responses', [])

            for tx in txs:
                tx_hash = tx['txhash']
                # Parse logs to find the staker and amount
                # This is complex parsing of Cosmos logs, simplified here:
                logs = tx.get('logs', [])
                if not logs: continue
                
                events = logs[0].get('events', [])
                staker_addr = "unknown"
                btc_amount = 0
                
                for e in events:
                    if e['type'] == 'babylon.btcstaking.v1.EventBTCDelegationStateUpdate':
                        attrs = {kv['key']: kv['value'] for kv in e['attributes']}
                        staker_addr = attrs.get('staker_addr', 'unknown')
                        # Convert satoshis to BTC
                        btc_amount = int(attrs.get('active_sat', 0)) / 100000000 

                if btc_amount > 0:
                    logger.info(f"💰 FOUND REAL STAKE: {btc_amount} BTC from {staker_addr}")
                    
                    # Determine label based on amount
                    label = 'Whale' if btc_amount > 1 else 'Retail'
                    group = 'Whale' if btc_amount > 1 else 'Retail'
                    
                    # Send whale alert if threshold exceeded
                    self.whale_alerts.send_alert(btc_amount, staker_addr)
                    
                    # Add Staker to Graph
                    staker_v = self.g.addV('Address') \
                        .property('address', staker_addr) \
                        .property('label', label) \
                        .property('group', group) \
                        .property('btc_amount', btc_amount) \
                        .property('val', 10) \
                        .next()
                    
                    # Link Staker to a random provider
                    try:
                        providers = self.g.V().has('FinalityProvider').toList()
                        if providers:
                            import random
                            provider_v = random.choice(providers)
                            self.g.V(staker_v).addE('STAKED_WITH').to(provider_v).next()
                            logger.info(f"✅ Linked {label} to provider")
                    except Exception as link_err:
                        logger.warning(f"Could not link staker to provider: {link_err}")
                    
            logger.info(f"✅ Processed {len(txs)} Live Transactions.")

        except Exception as e:
            logger.error(f"❌ Error fetching delegations: {e}")

    def run_forever(self):
        """Main loop"""
        logger.info("🚀 Starting Babylon Ingester...")
        
        # Initial cleanup and seed
        self.clean_graph()
        self.seed_demo_data()
        
        while True:
            try:
                self.fetch_finality_providers()
                self.fetch_live_delegations()
                
                # Safety check: if graph is empty, re-seed demo data
                # This ensures the frontend always has something to show
                try:
                    count = self.g.V().count().next()
                    if count == 0:
                        logger.warning("⚠️ Graph is empty! Re-seeding demo data...")
                        self.seed_demo_data()
                except Exception as e:
                    logger.warning(f"⚠️ Could not check graph count: {e}")
                    # Try to reconnect if connection lost
                    try:
                        self.connect_with_retry()
                    except:
                        pass

                logger.info("Sleeping for 60s...")
                time.sleep(60)
            except KeyboardInterrupt:
                logger.info("🛑 Stopping ingester...")
                break
            except Exception as e:
                logger.error(f"❌ Error in main loop: {e}")
                time.sleep(10)
        
        # Cleanup
        try:
            self.conn.close()
        except:
            pass

if __name__ == "__main__":
    indexer = BabylonIngestor()
    try:
        indexer.run_forever()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        try:
            indexer.conn.close()
        except:
            pass