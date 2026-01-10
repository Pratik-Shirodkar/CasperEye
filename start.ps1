# SatoshisEye Startup Script for Windows PowerShell

Write-Host "Starting SatoshisEye..." -ForegroundColor Green

# 1. Start infrastructure
Write-Host "Starting infrastructure..." -ForegroundColor Yellow
cd infra
docker-compose up -d
cd ..

# 2. Start backend
Write-Host "Starting backend..." -ForegroundColor Yellow
cd backend
pip install -r requirements.txt

# Start API server in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python bedrock_server.py"

# Start ingester in background  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python ingest_live.py"

cd ..

# 3. Start frontend
Write-Host "Starting frontend..." -ForegroundColor Yellow
cd frontend
npm install
npm run dev