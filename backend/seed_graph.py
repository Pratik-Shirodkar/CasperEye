from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.anonymous_traversal import traversal

def seed_data():
    # Connect to local Gremlin Server
    connection = DriverRemoteConnection('ws://localhost:8182/gremlin', 'g')
    g = traversal().withRemote(connection)

    print("🧹 Clearing old data...")
    g.V().drop().iterate()

    print("🌱 Seeding Babylon Security Graph...")

    # 1. Create Consumer Chains (The entities being secured)
    chain_osmosis = g.addV('ConsumerChain').property('name', 'Osmosis').property('tvl', 5000000).next()
    chain_neutron = g.addV('ConsumerChain').property('name', 'Neutron').property('tvl', 1200000).next()
    chain_levana = g.addV('ConsumerChain').property('name', 'Levana').property('tvl', 800000).next()

    # 2. Create Finality Providers (Validators)
    provider_p2p = g.addV('FinalityProvider').property('name', 'P2P Validator').property('uptime', 99.9).next()
    provider_chorus = g.addV('FinalityProvider').property('name', 'Chorus One').property('uptime', 98.5).next()

    # 3. Create Investors (Smart Money vs Retail)
    # "Smart Money" = Institutional Whales
    whale_1 = g.addV('Address').property('address', 'bc1q_whale_A').property('label', 'Smart Money').next()
    whale_2 = g.addV('Address').property('address', 'bc1q_whale_B').property('label', 'Smart Money').next()
    
    # "Retail" = Regular users
    retail_1 = g.addV('Address').property('address', 'bc1q_retail_X').property('label', 'Retail').next()

    # 4. Create Relationships (The MAGIC Part)
    
    # Whales stake HUGE amounts
    g.V(whale_1).addE('STAKED_WITH').to(provider_p2p).property('amount_btc', 100).iterate()
    g.V(whale_2).addE('STAKED_WITH').to(provider_chorus).property('amount_btc', 250).iterate()
    
    # Retail stakes small amounts
    g.V(retail_1).addE('STAKED_WITH').to(provider_p2p).property('amount_btc', 0.5).iterate()

    # Providers secure chains
    # P2P secures Osmosis and Neutron
    g.V(provider_p2p).addE('SECURES').to(chain_osmosis).iterate()
    g.V(provider_p2p).addE('SECURES').to(chain_neutron).iterate()
    
    # Chorus One secures Osmosis and Levana
    g.V(provider_chorus).addE('SECURES').to(chain_osmosis).iterate()
    g.V(provider_chorus).addE('SECURES').to(chain_levana).iterate()

    print("✅ Graph seeded! Ready for analytics.")
    connection.close()

if __name__ == "__main__":
    seed_data()