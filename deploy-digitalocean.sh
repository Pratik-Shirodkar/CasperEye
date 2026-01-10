#!/bin/bash
# SatoshisEye Production Deployment Script for DigitalOcean

echo "🚀 Deploying SatoshisEye to Production..."

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get update
apt-get install -y docker-compose

# Start Gremlin Server
cd infra
docker-compose up -d
cd ..

# Install Python dependencies
apt-get install -y python3-pip
cd backend
pip3 install -r requirements.txt

# Setup systemd services
cat > /etc/systemd/system/satoshis-api.service << EOF
[Unit]
Description=SatoshisEye API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/SatoshisEye/backend
ExecStart=/usr/bin/python3 main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/satoshis-ingester.service << EOF
[Unit]
Description=SatoshisEye Blockchain Ingester
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/SatoshisEye/backend
ExecStart=/usr/bin/python3 ingest_live.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start services
systemctl daemon-reload
systemctl enable satoshis-api
systemctl enable satoshis-ingester
systemctl start satoshis-api
systemctl start satoshis-ingester

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Build and start frontend
cd ../frontend
npm install
npm run build
npm install -g pm2
pm2 start npm --name "satoshis-frontend" -- start
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "API: http://your-ip:8000"
echo "Frontend: http://your-ip:3000"