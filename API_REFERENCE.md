# SatoshisEye - API Reference

## Base URL

```
http://localhost:8000
```

## Authentication

### Basic Auth

Protected endpoints require HTTP Basic Authentication.

**Credentials**:
```
Username: admin
Password: babylon2024
```

**Usage**:
```bash
curl -u admin:babylon2024 http://localhost:8000/api/metrics
```

**Header Format**:
```
Authorization: Basic YWRtaW46YmFieWxvbjIwMjQ=
```

---

## Endpoints

### 1. Health Check

**Endpoint**: `GET /`

**Description**: Check API status

**Authentication**: None

**Response**:
```json
{
  "message": "SatoshisEye API",
  "status": "running"
}
```

**Example**:
```bash
curl http://localhost:8000/
```

---

### 2. Risk Analysis

**Endpoint**: `GET /api/risk-analysis`

**Description**: Get risk analysis for all consumer chains

**Authentication**: None

**Response**:
```json
[
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
```

**Example**:
```bash
curl http://localhost:8000/api/risk-analysis
```

**Response Fields**:
- `chain` (string): Consumer chain name
- `smart_money_btc` (number): Total BTC from whale addresses
- `risk` (string): Risk level ("SAFE" or "CRITICAL")

---

### 3. Graph Data

**Endpoint**: `GET /api/graph-data`

**Description**: Get graph nodes and edges for visualization

**Authentication**: None

**Response**:
```json
{
  "nodes": [
    {
      "id": "osmosis",
      "name": "Osmosis",
      "group": "Chain",
      "val": 25
    },
    {
      "id": "p2p",
      "name": "P2P Validator",
      "group": "Provider",
      "val": 18
    }
  ],
  "links": [
    {
      "source": "p2p",
      "target": "osmosis"
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:8000/api/graph-data
```

**Response Fields**:
- `nodes` (array): Graph nodes
  - `id` (string): Unique identifier
  - `name` (string): Display name
  - `group` (string): Node type (Chain, Provider, Whale, Retail)
  - `val` (number): Visualization size
- `links` (array): Graph edges
  - `source` (string): Source node ID
  - `target` (string): Target node ID

---

### 4. Metrics (Protected)

**Endpoint**: `GET /api/metrics`

**Description**: Get on-demand analytics and metrics

**Authentication**: Required (Basic Auth)

**Response**:
```json
{
  "total_staked_btc": 420,
  "total_providers": 36,
  "total_chains": 3,
  "concentration_ratio": 0.83,
  "risk_score": 6.2,
  "last_update": "2025-11-21T01:45:00Z"
}
```

**Example**:
```bash
curl -u admin:babylon2024 http://localhost:8000/api/metrics
```

**Response Fields**:
- `total_staked_btc` (number): Total BTC staked across all chains
- `total_providers` (number): Number of finality providers
- `total_chains` (number): Number of consumer chains
- `concentration_ratio` (number): Top 3 providers concentration (0-1)
- `risk_score` (number): Overall risk score (0-10)
- `last_update` (string): ISO 8601 timestamp

---

### 5. AI Chat

**Endpoint**: `POST /api/ai-chat`

**Description**: Ask AI analyst questions about chain security

**Authentication**: None

**Request Body**:
```json
{
  "question": "Is Osmosis secure?"
}
```

**Response**:
```json
{
  "analysis": "Osmosis shows strong smart money backing (350 BTC) indicating institutional confidence. Low risk."
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Is Osmosis secure?"}'
```

**Request Fields**:
- `question` (string): Question for AI analyst

**Response Fields**:
- `analysis` (string): AI-generated response

**Example Questions**:
- "Is Osmosis secure?"
- "What about Neutron?"
- "Which chain has the most smart money?"
- "Explain the risk levels"

---

## Error Responses

### 401 Unauthorized

**Status**: 401

**Response**:
```json
{
  "error": "Unauthorized"
}
```

**Cause**: Missing or invalid authentication credentials

**Solution**: Add valid Basic Auth header

---

### 404 Not Found

**Status**: 404

**Response**:
```json
{
  "error": "Not found"
}
```

**Cause**: Invalid endpoint path

**Solution**: Check endpoint URL

---

### 500 Internal Server Error

**Status**: 500

**Response**:
```json
{
  "error": "Internal server error"
}
```

**Cause**: Server error (e.g., database connection failure)

**Solution**: Check server logs and restart if needed

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider:
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user
- Exponential backoff for retries

---

## CORS Headers

All endpoints include CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Response Formats

### Success Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": "..."
}
```

### Error Response

```
HTTP/1.1 4xx/5xx
Content-Type: application/json

{
  "error": "Error message"
}
```

---

## Examples

### JavaScript/Fetch

```javascript
// Get risk analysis
fetch('http://localhost:8000/api/risk-analysis')
  .then(res => res.json())
  .then(data => console.log(data));

// Get metrics with auth
fetch('http://localhost:8000/api/metrics', {
  headers: {
    'Authorization': 'Basic ' + btoa('admin:babylon2024')
  }
})
  .then(res => res.json())
  .then(data => console.log(data));

// Ask AI
fetch('http://localhost:8000/api/ai-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'Is Osmosis secure?'
  })
})
  .then(res => res.json())
  .then(data => console.log(data.analysis));
```

### Python/Requests

```python
import requests
from requests.auth import HTTPBasicAuth

# Get risk analysis
response = requests.get('http://localhost:8000/api/risk-analysis')
print(response.json())

# Get metrics with auth
response = requests.get(
    'http://localhost:8000/api/metrics',
    auth=HTTPBasicAuth('admin', 'babylon2024')
)
print(response.json())

# Ask AI
response = requests.post(
    'http://localhost:8000/api/ai-chat',
    json={'question': 'Is Osmosis secure?'}
)
print(response.json()['analysis'])
```

### cURL

```bash
# Get risk analysis
curl http://localhost:8000/api/risk-analysis

# Get metrics with auth
curl -u admin:babylon2024 http://localhost:8000/api/metrics

# Ask AI
curl -X POST http://localhost:8000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Is Osmosis secure?"}'
```

### Postman

1. **Create new request**
2. **Set method**: GET or POST
3. **Set URL**: `http://localhost:8000/api/...`
4. **For protected endpoints**:
   - Go to "Authorization" tab
   - Select "Basic Auth"
   - Username: `admin`
   - Password: `babylon2024`
5. **Send request**

---

## Webhooks (Future)

Planned for future versions:
- Risk level change notifications
- New whale detection alerts
- Provider concentration warnings
- Chain security updates

---

## Versioning

Current API version: `v1`

Future versions will use URL prefix: `/api/v2/...`

---

## Support

For API issues:
1. Check server logs: `python bedrock_server.py`
2. Verify Gremlin connection: `docker ps`
3. Test connectivity: `curl http://localhost:8000/`
4. Check authentication: `curl -u admin:babylon2024 http://localhost:8000/api/metrics`

---

**Last Updated**: 2025-11-21
