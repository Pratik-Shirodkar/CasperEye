#!/bin/bash

# SatoshisEye - DigitalOcean Deployment Script
# Copy and paste this entire script into your DigitalOcean console

set -e

echo "🚀 SatoshisEye - DigitalOcean Deployment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Update system
echo -e "${BLUE}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install Docker
echo -e "${BLUE}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 3: Install Docker Compose
echo -e "${BLUE}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Step 4: Verify installations
echo -e "${BLUE}Step 4: Verifying installations...${NC}"
docker --version
docker-compose --version

# Step 5: Clone repository
echo -e "${BLUE}Step 5: Cloning repository...${NC}"
if [ ! -d "SatoshisEye" ]; then
    git clone https://github.com/yourusername/SatoshisEye.git
    cd SatoshisEye
else
    cd SatoshisEye
    git pull origin main
fi

# Step 6: Create .env file
echo -e "${BLUE}Step 6: Creating .env file...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Graph Database
GREMLIN_ENDPOINT=ws://gremlin-server:8182/gremlin

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# AWS Configuration (for Bedrock AI)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key-here
AWS_SECRET_ACCESS_KEY=your-aws-secret-here

# JWT Secret
JWT_SECRET=your-secret-key-here-change-this

# SNS Whale Alerts
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:your-account:WhaleAlerts

# Frontend API URL
NEXT_PUBLIC_API_URL=/api
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${RED}⚠️  Please edit .env with your AWS credentials:${NC}"
    echo "   nano .env"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

# Step 7: Create SSL directory
echo -e "${BLUE}Step 7: Creating SSL directory...${NC}"
mkdir -p ssl

# Step 8: Generate self-signed certificate (if not exists)
echo -e "${BLUE}Step 8: Checking SSL certificates...${NC}"
if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
    echo -e "${BLUE}Generating self-signed certificate...${NC}"
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo -e "${GREEN}✓ Self-signed certificate generated${NC}"
    echo -e "${BLUE}For production, use Let's Encrypt:${NC}"
    echo "   certbot certonly --standalone -d yourdomain.com"
    echo "   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem"
    echo "   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem"
else
    echo -e "${GREEN}✓ SSL certificates found${NC}"
fi

# Step 9: Build services
echo -e "${BLUE}Step 9: Building Docker services...${NC}"
docker-compose -f docker-compose.prod.yml build

# Step 10: Start services
echo -e "${BLUE}Step 10: Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Step 11: Wait for services
echo -e "${BLUE}Step 11: Waiting for services to start...${NC}"
sleep 15

# Step 12: Check services
echo -e "${BLUE}Step 12: Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Step 13: Test API
echo -e "${BLUE}Step 13: Testing API...${NC}"
if curl -s http://localhost:8000/ > /dev/null; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${RED}✗ API is not responding${NC}"
fi

# Step 14: Configure firewall
echo -e "${BLUE}Step 14: Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo -e "${GREEN}✓ Firewall configured${NC}"
fi

# Step 15: Display summary
echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}Access your application:${NC}"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  API: http://$(hostname -I | awk '{print $1}'):8000"
echo "  Nginx: http://$(hostname -I | awk '{print $1}')"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Restart: docker-compose -f docker-compose.prod.yml restart"
echo "  Stop: docker-compose -f docker-compose.prod.yml down"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Edit .env with your AWS credentials (if using AI chat)"
echo "  2. Configure your domain in DigitalOcean console"
echo "  3. Update nginx.prod.conf with your domain"
echo "  4. Use Let's Encrypt for production SSL certificates"
echo ""
echo -e "${GREEN}Status: ✅ Ready for Production${NC}"
