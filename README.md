# 🔍 CasperEye - CSPR Staking Intelligence Platform

> Real-time staking analytics for Casper Network using graph-based analytics and AI.

**Casper Hackathon 2026 Submission** | [Liquid Staking Track](https://dorahacks.io/hackathon/casper2026)

![CasperEye Dashboard](https://img.shields.io/badge/Status-Hackathon%20Submission-red)
![Track](https://img.shields.io/badge/Track-Liquid%20Staking-purple)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 🎯 Project Overview

CasperEye is a **staking intelligence platform** for Casper Network that![CasperEye Dashboard](https://raw.githubusercontent.com/Pratik-Shirodkar/CasperEye/main/.gemini/antigravity/brain/a5daf151-ccc3-47c6-905f-bf030c8ab11b/caspereye_live_data_tab_1768035928970.png)

## 🚀 Features

*   **Live Validator Metrics**: Real-time tracking of stake, delegation rates, and performance from CSPR.cloud.
*   **Whale Alerts**: Automatic detection of large CSPR movements (>100k CSPR) using graph analysis.
*   **AI Staking Assistant**: Natural language queries about the network powered by AWS Bedrock.
*   **Risk Analysis**: Graph-based visualization of validator centralization and risks.
*   **Liquid Staking Ready**: Infrastructure prepared for future LSD protocols on Casper.lidator health
- **Interactive Graph Visualization** - Force-directed network showing staking relationships
- **On-chain Analytics Contract** - Odra-based StakingTracker for recording snapshots

### Key Differentiators

1. **Graph-Based Analytics**: Uses Apache TinkerPop Gremlin for relationship analysis between validators, delegators, and the network
2. **Smart Money Tracking**: Identifies institutional-sized delegations and tracks their validator preferences
3. **AI-Powered Insights**: Natural language queries about staking strategies and risk assessment

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 4: Presentation                     │
│              Next.js 14 + Tailwind CSS + React               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Layer 3: Intelligence                      │
│           FastAPI + AWS Bedrock (Claude 3 Haiku)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Layer 2: Graph Database                     │
│         Apache TinkerPop Gremlin (Local/Neptune)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Layer 1: Data Source                       │
│             CSPR.cloud API + Casper Testnet                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  On-Chain: StakingTracker                    │
│          Odra Smart Contract on Casper Testnet              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Graph Schema

### Nodes
- 🔴 **Chain** - Casper Network (central node)
- 🔵 **Validator** - Casper validators with stake data
- 🟢 **Address** - Delegators (Whales with >100K CSPR, Regular delegators)

### Edges
- `DELEGATED_TO` - Address → Validator (with stake_cspr property)
- `VALIDATES` - Validator → Chain

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Docker (for Gremlin server)
- CSPR.cloud API token (free at https://cspr.cloud)

### 1. Start Infrastructure

```bash
cd infra
docker compose up -d
```

### 2. Configure Environment

```bash
cp .env.casper .env
# Edit .env with your CSPR.cloud token
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
python casper_ingest.py &     # Starts Casper data ingester
python bedrock_server.py &    # Starts API server
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **Graph DB**: ws://localhost:8182

---

## 📦 Smart Contract (On-Chain Component)

The **StakingTracker** contract (built with Odra framework) records staking analytics on-chain:

```rust
#[odra::module]
pub struct StakingTracker {
    total_staked_k: Var<u64>,    // Total CSPR staked (thousands)
    whale_count: Var<u32>,       // Number of whale accounts
    risk_score: Var<u8>,         // Network risk score (0-100)
    validator_count: Var<u32>,   // Active validators
}
```

**Features:**
- Record staking snapshots
- Track whale count over time
- Query historical risk scores
- Emit events for off-chain indexers

**Deploy to Testnet:**
```bash
cd staking-tracker
cargo odra build -b casper
cargo odra deploy -b casper-testnet
```

---

## 🔑 Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `CSPR_CLOUD_TOKEN` | API token from cspr.cloud | Yes |
| `AWS_ACCESS_KEY_ID` | AWS credentials for Bedrock | For AI |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for Bedrock | For AI |
| `GREMLIN_ENDPOINT` | Graph database endpoint | Yes |

---

## 🧠 AI Analyst

Ask questions like:
- "What is the risk level of MAKE Software validator?"
- "How many whales are currently staking?"
- "Which validator should I delegate to for optimal returns?"

Powered by AWS Bedrock (Claude 3 Haiku).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, react-force-graph-2d |
| Backend | Python, FastAPI, Gremlin Python |
| AI | AWS Bedrock (Claude 3 Haiku) |
| Graph DB | Apache TinkerPop Gremlin |
| Smart Contract | Rust, Odra Framework |
| Data Source | CSPR.cloud REST API |

---

## 📁 Project Structure

```
CasperEye/
├── backend/
│   ├── casper_ingest.py      # Casper data ingester (Main!)
│   ├── bedrock_server.py     # API server with AI
│   ├── whale_alerts.py       # Whale detection
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/page.tsx      # Main dashboard
│   │   └── components/       # React components
│   └── package.json
├── staking-tracker/          # Odra smart contract
│   ├── src/staking_tracker.rs
│   └── Cargo.toml
├── infra/
│   └── docker-compose.yml    # Gremlin server
└── .env.casper               # Configuration template
```

---

## 🎥 Demo

[Demo Video Link - Coming Soon]

---

## 🏆 Hackathon Submission

**Track**: Liquid Staking  
**Prize**: $2,500

**Why CasperEye for Liquid Staking?**
- Provides critical intelligence for staking decisions
- Tracks whale movements that affect liquid staking token prices
- Risk analysis helps LST protocols manage validator selection
- On-chain contract enables transparent staking analytics

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- **Casper Network** - Enterprise-grade blockchain
- **CSPR.cloud** - Excellent middleware APIs
- **Odra Framework** - Developer-friendly smart contracts
- **Apache TinkerPop** - Graph computing framework

---

Built with ❤️ for the Casper Hackathon 2026