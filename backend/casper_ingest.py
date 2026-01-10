"""
Casper Network Staking Ingester for CasperEye
Fetches validators and delegations from CSPR.cloud API and stores in Gremlin graph.
"""
import time
import requests
import logging
import os
from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.anonymous_traversal import traversal
from gremlin_python.process.graph_traversal import __

# Try to import whale alerts service
try:
    from whale_alerts import WhaleAlertService
except ImportError:
    WhaleAlertService = None

# --- CONFIGURATION ---
CASPER_CLOUD_API = "https://api.testnet.cspr.cloud"
CSPR_CLOUD_TOKEN = os.getenv("CSPR_CLOUD_TOKEN", "")
NEPTUNE_URI = os.getenv("GREMLIN_ENDPOINT", 'ws://gremlin-server:8182/gremlin')

# Whale threshold: 100,000 CSPR (in motes, 1 CSPR = 10^9 motes)
WHALE_THRESHOLD_MOTES = 100_000 * 10**9  # 100,000 CSPR
WHALE_THRESHOLD_CSPR = 100_000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CasperIngester")


class CasperIngestor:
    def __init__(self):
        self.conn = None
        self.g = None
        self.whale_alerts = WhaleAlertService() if WhaleAlertService else None
        self.headers = {
            "Accept": "application/json",
            "Authorization": CSPR_CLOUD_TOKEN
        }
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
                    retry_delay = min(retry_delay * 1.5, 30)
        
        logger.error("❌ Could not connect to Gremlin after multiple attempts.")
        raise Exception("Gremlin connection failed")

    def clean_graph(self):
        """Only run this on first startup to clear old data"""
        logger.info("🧹 Cleaning old graph data...")
        try:
            self.g.V().drop().toList()
            logger.info("✅ Graph cleaned successfully")
        except Exception as e:
            logger.warning(f"Could not clear graph (may be empty): {e}")
            try:
                self.conn.close()
                self.conn = DriverRemoteConnection(NEPTUNE_URI, 'g')
                self.g = traversal().withRemote(self.conn)
            except:
                pass

    def seed_casper_network(self):
        """Create the Casper Network node as the central chain"""
        logger.info("🌱 Seeding Casper Network node...")
        try:
            existing = self.g.V().has('Chain', 'name', 'Casper Network').toList()
            if not existing:
                self.g.addV('Chain') \
                    .property('name', 'Casper Network') \
                    .property('group', 'Chain') \
                    .property('val', 40) \
                    .property('network', 'testnet') \
                    .next()
                logger.info("✅ Created Casper Network node")
            else:
                logger.info("ℹ️  Casper Network node already exists")
        except Exception as e:
            logger.warning(f"Could not seed Casper Network: {e}")

    def fetch_validators(self):
        """Fetches validators from CSPR.cloud API"""
        endpoint = f"{CASPER_CLOUD_API}/validators"
        try:
            logger.info(f"📡 Fetching Validators from {endpoint}...")
            
            if not CSPR_CLOUD_TOKEN:
                logger.warning("⚠️  CSPR_CLOUD_TOKEN not set! Using demo data.")
                self._seed_demo_validators()
                return
            
            response = requests.get(
                endpoint, 
                headers=self.headers,
                params={"limit": 50, "is_active": True},
                timeout=15
            )
            
            if response.status_code != 200:
                logger.warning(f"API returned {response.status_code}, using demo data")
                self._seed_demo_validators()
                return
                
            data = response.json()
            validators = data.get('data', [])
            
            count = 0
            for validator in validators[:20]:  # Limit to top 20 validators
                public_key = validator.get('public_key', 'unknown')
                # Try to get account info for moniker
                account_info = validator.get('account_info', {}) or {}
                info_data = account_info.get('info', {}) or {}
                moniker = info_data.get('owner', {}).get('name', f"Validator-{public_key[:8]}")
                
                stake = int(validator.get('total_stake', 0))
                stake_cspr = stake / 10**9  # Convert motes to CSPR
                delegation_rate = validator.get('delegation_rate', 0)
                
                # Check if validator already exists
                try:
                    existing = self.g.V().has('Validator', 'public_key', public_key).toList()
                    if existing:
                        # Update stake
                        self.g.V().has('Validator', 'public_key', public_key) \
                            .property('stake_cspr', stake_cspr) \
                            .next()
                        continue
                except:
                    pass
                
                # Create validator node
                try:
                    v = self.g.addV('Validator') \
                        .property('public_key', public_key) \
                        .property('name', moniker) \
                        .property('stake_cspr', stake_cspr) \
                        .property('delegation_rate', delegation_rate) \
                        .property('group', 'Validator') \
                        .property('val', 20) \
                        .next()
                    count += 1
                    logger.info(f"✅ Created validator: {moniker} ({stake_cspr:,.0f} CSPR)")
                    
                    # Link to Casper Network
                    self._link_to_casper(v)
                except Exception as create_err:
                    logger.debug(f"Validator creation note: {create_err}")
            
            logger.info(f"✅ Indexed {count} new Validators.")
            
        except Exception as e:
            logger.error(f"❌ Error fetching validators: {e}")
            self._seed_demo_validators()

    def _seed_demo_validators(self):
        """Seed demo validators when API is unavailable"""
        logger.info("🌱 Seeding demo validators...")
        demo_validators = [
            {"name": "MAKE Software", "stake": 15000000, "pk": "01make..."},
            {"name": "HashQuark", "stake": 12000000, "pk": "01hash..."},
            {"name": "Figment", "stake": 10000000, "pk": "01figm..."},
            {"name": "Everstake", "stake": 8000000, "pk": "01ever..."},
            {"name": "BitMax Staking", "stake": 6000000, "pk": "01bitm..."},
        ]
        
        for val in demo_validators:
            try:
                existing = self.g.V().has('Validator', 'name', val['name']).toList()
                if existing:
                    continue
                    
                v = self.g.addV('Validator') \
                    .property('public_key', val['pk']) \
                    .property('name', val['name']) \
                    .property('stake_cspr', val['stake']) \
                    .property('delegation_rate', 10) \
                    .property('group', 'Validator') \
                    .property('val', 20) \
                    .next()
                self._link_to_casper(v)
                logger.info(f"✅ Created demo validator: {val['name']}")
            except Exception as e:
                logger.debug(f"Demo validator creation note: {e}")

    def _link_to_casper(self, validator_vertex):
        """Links validator to Casper Network node"""
        try:
            chain_v = self.g.V().has('Chain', 'name', 'Casper Network').next()
            self.g.V(validator_vertex).addE('VALIDATES').to(chain_v).next()
        except Exception as e:
            logger.debug(f"Could not link to Casper: {e}")

    def fetch_delegations(self):
        """Fetches delegations for all validators"""
        try:
            logger.info("📡 Fetching Delegations...")
            
            # Get all validators from graph
            validators = self.g.V().hasLabel('Validator').valueMap('public_key', 'name').toList()
            
            if not CSPR_CLOUD_TOKEN or not validators:
                logger.warning("⚠️  No token or validators, seeding demo delegators")
                self._seed_demo_delegators()
                return
            
            total_delegations = 0
            for val in validators[:5]:  # Limit to first 5 validators
                pk = val.get('public_key', [''])[0]
                name = val.get('name', ['Unknown'])[0]
                
                if not pk or pk.endswith('...'):  # Skip demo validators
                    continue
                
                endpoint = f"{CASPER_CLOUD_API}/validators/{pk}/delegations"
                try:
                    response = requests.get(
                        endpoint,
                        headers=self.headers,
                        params={"limit": 20},
                        timeout=10
                    )
                    
                    if response.status_code != 200:
                        continue
                    
                    data = response.json()
                    delegations = data.get('data', [])
                    
                    for delegation in delegations[:10]:  # Top 10 delegators per validator
                        delegator_pk = delegation.get('public_key', 'unknown')
                        stake_motes = int(delegation.get('stake', 0))
                        stake_cspr = stake_motes / 10**9
                        
                        if stake_cspr < 100:  # Skip very small delegations
                            continue
                        
                        # Determine if whale
                        is_whale = stake_cspr >= WHALE_THRESHOLD_CSPR
                        label = 'Whale' if is_whale else 'Delegator'
                        
                        # Send whale alert if applicable
                        if is_whale and self.whale_alerts:
                            self.whale_alerts.send_alert(stake_cspr, delegator_pk)
                        
                        # Create or update delegator
                        try:
                            existing = self.g.V().has('Address', 'public_key', delegator_pk).toList()
                            if existing:
                                self.g.V().has('Address', 'public_key', delegator_pk) \
                                    .property('stake_cspr', stake_cspr) \
                                    .next()
                            else:
                                delegator_v = self.g.addV('Address') \
                                    .property('public_key', delegator_pk) \
                                    .property('label', label) \
                                    .property('group', label) \
                                    .property('stake_cspr', stake_cspr) \
                                    .property('val', 10) \
                                    .next()
                                
                                # Link to validator
                                validator_v = self.g.V().has('Validator', 'public_key', pk).next()
                                self.g.V(delegator_v).addE('DELEGATED_TO') \
                                    .to(validator_v) \
                                    .property('stake_cspr', stake_cspr) \
                                    .next()
                                
                                total_delegations += 1
                                logger.info(f"  💰 {label}: {stake_cspr:,.0f} CSPR → {name}")
                        except Exception as e:
                            logger.debug(f"Delegation error: {e}")
                    
                except Exception as e:
                    logger.debug(f"Could not fetch delegations for {name}: {e}")
            
            logger.info(f"✅ Processed {total_delegations} delegations.")
            
        except Exception as e:
            logger.error(f"❌ Error fetching delegations: {e}")
            self._seed_demo_delegators()

    def _seed_demo_delegators(self):
        """Seed demo delegators when API is unavailable"""
        logger.info("🌱 Seeding demo delegators...")
        
        # Get validators
        try:
            validators = self.g.V().hasLabel('Validator').toList()
            if not validators:
                logger.warning("No validators to link delegators to")
                return
        except:
            return
        
        import random
        
        # Demo whales (>100,000 CSPR)
        whales = [
            {"pk": "01whale1...", "stake": 500000, "name": "Whale 1"},
            {"pk": "01whale2...", "stake": 250000, "name": "Whale 2"},
            {"pk": "01whale3...", "stake": 150000, "name": "Whale 3"},
        ]
        
        # Demo retail (<100,000 CSPR)
        retail = [
            {"pk": "01retail1...", "stake": 50000, "name": "Retail 1"},
            {"pk": "01retail2...", "stake": 25000, "name": "Retail 2"},
            {"pk": "01retail3...", "stake": 10000, "name": "Retail 3"},
            {"pk": "01retail4...", "stake": 5000, "name": "Retail 4"},
        ]
        
        for delegator in whales + retail:
            try:
                is_whale = delegator['stake'] >= WHALE_THRESHOLD_CSPR
                label = 'Whale' if is_whale else 'Delegator'
                
                existing = self.g.V().has('Address', 'public_key', delegator['pk']).toList()
                if existing:
                    continue
                
                v = self.g.addV('Address') \
                    .property('public_key', delegator['pk']) \
                    .property('label', label) \
                    .property('group', label) \
                    .property('stake_cspr', delegator['stake']) \
                    .property('val', 10) \
                    .next()
                
                # Link to random validator
                validator_v = random.choice(validators)
                self.g.V(v).addE('DELEGATED_TO') \
                    .to(validator_v) \
                    .property('stake_cspr', delegator['stake']) \
                    .next()
                
                logger.info(f"✅ Created demo {label}: {delegator['name']} ({delegator['stake']:,} CSPR)")
            except Exception as e:
                logger.debug(f"Demo delegator creation note: {e}")

    def run_forever(self):
        """Main loop"""
        logger.info("🚀 Starting Casper Ingester...")
        
        # Initial cleanup and seed
        self.clean_graph()
        self.seed_casper_network()
        
        while True:
            try:
                self.fetch_validators()
                self.fetch_delegations()
                
                # Safety check: if graph is empty, re-seed
                try:
                    count = self.g.V().count().next()
                    if count == 0:
                        logger.warning("⚠️ Graph is empty! Re-seeding...")
                        self.seed_casper_network()
                        self._seed_demo_validators()
                except Exception as e:
                    logger.warning(f"⚠️ Could not check graph count: {e}")
                    try:
                        self.connect_with_retry()
                    except:
                        pass

                logger.info("💤 Sleeping for 60s...")
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
    logger.info("=" * 50)
    logger.info("🔍 CasperEye - CSPR Staking Intelligence")
    logger.info("=" * 50)
    
    if not CSPR_CLOUD_TOKEN:
        logger.warning("⚠️  CSPR_CLOUD_TOKEN environment variable not set!")
        logger.warning("   Will use demo data. Get a free token at: https://cspr.cloud")
    
    indexer = CasperIngestor()
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
