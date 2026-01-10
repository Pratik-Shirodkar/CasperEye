# SatoshisEye - Data Schema & Pipeline

## Graph Database Schema

### Nodes

#### 1. ConsumerChain
Represents a blockchain secured by Babylon finality providers.

```
ConsumerChain {
  id: String (unique)
  name: String (e.g., "Osmosis", "Neutron", "Stargaze")
  group: String = "Chain"
  val: Integer = 30 (visualization size)
}
```

**Example**:
```
ConsumerChain {
  id: "osmosis-1",
  name: "Osmosis",
  group: "Chain",
  val: 30
}
```

#### 2. FinalityProvider
Represents a Bitcoin staking validator on Babylon.

```
FinalityProvider {
  id: String (unique)
  pk: String (BTC public key hex)
  name: String (moniker/validator name)
  commission: String (commission rate)
  group: String = "Provider"
  val: Integer = 20 (visualization size)
}
```

**Example**:
```
FinalityProvider {
  id: "p2p-validator",
  pk: "a1b2c3d4e5f6...",
  name: "P2P Validator",
  commission: "0.05",
  group: "Provider",
  val: 20
}
```

#### 3. Address
Represents a Bitcoin address that stakes with finality providers.

```
Address {
  id: String (unique)
  address: String (Bitcoin address)
  label: String ("Whale" | "Retail" | "Validator")
  group: String ("Whale" | "Retail")
  val: Integer = 10 (visualization size)
  btc_amount: Float (optional, BTC staked)
  timestamp: String (ISO 8601)
}
```

**Example - Whale**:
```
Address {
  id: "whale-1",
  address: "bc1q7x2wqg...",
  label: "Whale",
  group: "Whale",
  val: 10,
  btc_amount: 5.2,
  timestamp: "2025-11-21T01:45:00Z"
}
```

**Example - Retail**:
```
Address {
  id: "retail-1",
  address: "bc1q2y3z4...",
  label: "Retail",
  group: "Retail",
  val: 10,
  btc_amount: 0.3,
  timestamp: "2025-11-21T01:45:00Z"
}
```

### Edges

#### 1. STAKED_WITH
Represents a staking relationship between an address and a finality provider.

```
STAKED_WITH {
  source: Address
  target: FinalityProvider
  properties: {
    btc_amount: Float
    timestamp: String
    tx_hash: String (optional)
  }
}
```

**Example**:
```
Address(bc1q7x2wqg...) --STAKED_WITH--> FinalityProvider(P2P Validator)
  btc_amount: 5.2
  timestamp: "2025-11-21T01:45:00Z"
```

#### 2. SECURES
Represents a security relationship between a finality provider and a consumer chain.

```
SECURES {
  source: FinalityProvider
  target: ConsumerChain
  properties: {
    active: Boolean
    timestamp: String
  }
}
```

**Example**:
```
FinalityProvider(P2P Validator) --SECURES--> ConsumerChain(Osmosis)
  active: true
  timestamp: "2025-11-21T01:45:00Z"
```

## Data Ingestion Pipeline

### Step 1: Fetch Raw Data

**Source**: Babylon Testnet API (Polkachu)

**Endpoints**:

1. **Finality Providers**
   ```
   GET https://babylon-testnet-api.polkachu.com/babylon/btcstaking/v1/finality_providers
   ```
   
   **Response**:
   ```json
   {
     "finality_providers": [
       {
         "btc_pk_hex": "a1b2c3d4e5f6...",
         "description": {
           "moniker": "P2P Validator",
           "identity": "...",
           "website": "...",
           "security_contact": "...",
           "details": "..."
         },
         "commission": "0.05"
       }
     ]
   }
   ```

2. **Live Delegations**
   ```
   GET https://babylon-testnet-api.polkachu.com/cosmos/tx/v1beta1/txs?events=message.action='/babylon.btcstaking.v1.MsgCreateBTCDelegation'&pagination.limit=20
   ```
   
   **Response**:
   ```json
   {
     "tx_responses": [
       {
         "txhash": "ABC123...",
         "logs": [
           {
             "events": [
               {
                 "type": "babylon.btcstaking.v1.EventBTCDelegationStateUpdate",
                 "attributes": [
                   {
                     "key": "staker_addr",
                     "value": "bc1q7x2wqg..."
                   },
                   {
                     "key": "active_sat",
                     "value": "520000000"
                   }
                 ]
               }
             ]
           }
         ]
       }
     ]
   }
   ```

### Step 2: Parse & Enrich

**Location**: `backend/ingest_live.py`

**Processing**:

1. **Extract Finality Providers**
   ```python
   for fp in providers:
       btc_pk = fp.get('btc_pk_hex')
       moniker = fp.get('description', {}).get('moniker')
       commission = fp.get('commission')
       # Create FinalityProvider node
   ```

2. **Extract Delegations**
   ```python
   for tx in txs:
       staker_addr = extract_from_logs(tx, 'staker_addr')
       btc_amount = int(extract_from_logs(tx, 'active_sat')) / 100000000
       # Create Address node with label
   ```

3. **Label Addresses**
   ```python
   if btc_amount > 1:
       label = "Whale"      # Smart Money
       group = "Whale"
   else:
       label = "Retail"     # Individual
       group = "Retail"
   ```

### Step 3: Store in Graph Database

**Technology**: Apache TinkerPop Gremlin

**Operations**:

1. **Create Nodes**
   ```python
   # Create FinalityProvider
   g.addV('FinalityProvider')
     .property('pk', btc_pk)
     .property('name', moniker)
     .property('commission', commission)
     .property('group', 'Provider')
     .property('val', 20)
     .next()
   
   # Create Address
   g.addV('Address')
     .property('address', staker_addr)
     .property('label', label)
     .property('group', group)
     .property('val', 10)
     .next()
   ```

2. **Create Edges**
   ```python
   # Link Address -> FinalityProvider
   g.V(address_id).addE('STAKED_WITH').to(provider_id).next()
   
   # Link FinalityProvider -> ConsumerChain
   g.V(provider_id).addE('SECURES').to(chain_id).next()
   ```

### Step 4: Query & Analyze

**Location**: `backend/bedrock_server.py`

**Queries**:

1. **Get All Nodes**
   ```python
   vertices = g.V().limit(50).valueMap(True).toList()
   ```

2. **Get All Edges**
   ```python
   edges = g.E().limit(100).toList()
   ```

3. **Find Whales**
   ```python
   whales = g.V().has('label', 'Whale').toList()
   ```

4. **Calculate Smart Money Score**
   ```python
   smart_money = g.V().has('label', 'Whale').values('btc_amount').sum()
   ```

### Step 5: Expose via API

**Location**: `backend/bedrock_server.py`

**Endpoints**:

1. **Risk Analysis**
   ```
   GET /api/risk-analysis
   ```
   Returns risk data for all chains

2. **Graph Data**
   ```
   GET /api/graph-data
   ```
   Returns nodes and edges for visualization

3. **Metrics** (Protected)
   ```
   GET /api/metrics
   Authorization: Basic admin:babylon2024
   ```
   Returns on-demand analytics

## Address Labeling Heuristics

### Current Implementation

| Criteria | Label | Group | Rationale |
|----------|-------|-------|-----------|
| BTC > 1 | Whale | Whale | Institutional/large holder |
| BTC ≤ 1 | Retail | Retail | Individual staker |
| Finality Provider | Validator | Provider | Node operator |

### Threshold Justification

- **1 BTC Threshold**: Approximately $40,000 USD at current prices
  - Represents institutional minimum
  - Distinguishes retail from professional stakers
  - Aligns with exchange minimum deposit requirements

### Future Enhancements

1. **Behavioral Analysis**
   - Staking frequency
   - Provider switching patterns
   - Reward claiming behavior

2. **ML-Based Classification**
   - Cluster analysis on staking patterns
   - Anomaly detection
   - Risk scoring

3. **On-Chain Heuristics**
   - Address age
   - Transaction history
   - Associated addresses

## Risk Scoring Algorithm

### Smart Money Score

```
Smart Money Score = Σ(BTC staked by addresses with label='Whale')
```

### Risk Level

```
if Smart Money Score < 100 BTC:
    Risk Level = "CRITICAL"
else:
    Risk Level = "SAFE"
```

### Concentration Ratio

```
Concentration Ratio = (Top 3 Providers BTC) / (Total BTC)

Interpretation:
- < 0.5: Well distributed
- 0.5-0.8: Moderate concentration
- > 0.8: High concentration (risk)
```

## Data Freshness

| Component | Update Frequency | Latency |
|-----------|------------------|---------|
| Finality Providers | Every 30 seconds | < 1 minute |
| Live Delegations | Every 30 seconds | < 1 minute |
| Graph Database | Real-time | < 100ms |
| API Response | On-demand | < 500ms |
| Dashboard | Every 5 seconds | < 1 second |

## Storage Requirements

### Local Development
- **Gremlin Server**: ~500MB RAM
- **Graph Data**: ~100MB (1400+ nodes/edges)
- **Total**: ~1GB

### Production (AWS Neptune)
- **Managed service**: Auto-scaling
- **Backup**: Automated daily
- **Retention**: 30 days

## Query Performance

### Typical Query Times

| Query | Time |
|-------|------|
| Get all nodes | 50ms |
| Get all edges | 100ms |
| Find whales | 30ms |
| Calculate smart money | 200ms |
| Full graph export | 500ms |

---

**Last Updated**: 2025-11-21
