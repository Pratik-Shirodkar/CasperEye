import os
import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SatoshisEye API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/satoshis_eye")

@app.get("/api/risk-analysis")
async def get_risk_analysis():
    # Mock data for DigitalOcean deployment
    return [
        {"chain": "Osmosis", "smart_money_btc": 350, "risk": "SAFE"},
        {"chain": "Neutron", "smart_money_btc": 45, "risk": "CRITICAL"},
        {"chain": "Levana", "smart_money_btc": 25, "risk": "CRITICAL"}
    ]

@app.get("/api/graph-data")
async def get_graph_data():
    return {
        "nodes": [
            {"id": "osmosis", "type": "ConsumerChain", "name": "Osmosis", "val": 20, "group": "Chain"},
            {"id": "p2p", "type": "FinalityProvider", "name": "P2P Validator", "val": 12, "group": "Provider"},
            {"id": "whale_a", "type": "Address", "label": "Smart Money", "val": 8, "group": "Whale"}
        ],
        "links": [
            {"source": "p2p", "target": "osmosis", "label": "SECURES"},
            {"source": "whale_a", "target": "p2p", "label": "STAKED_WITH"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))