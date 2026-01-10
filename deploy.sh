#!/bin/bash

# SatoshisEye DigitalOcean Deployment Script
# This script automates the deployment process

set -e

echo "🚀 SatoshisEye DigitalOcean Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install Docker
echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Step 3: Install Docker Compose
echo -e "${YELLOW}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Step 4: Clone repository
echo -e "${YELLOW}Step 4: Cloning repository...${NC}"
if [ ! -d "SatoshisEye" ]; then
    read -p "Enter your GitHub username: " GITHUB_USER
    git clone https://github.com/$GITHUB_USER/SatoshisEye.git
    cd SatoshisEye
else
    cd SatoshisEye
    git pull origin main
fi

# Step 5: Create environment file
echo -e "${YELLOW}Step 5: Creating environment file...${NC}"
if [ ! -f ".env" ]; then
    read -p "Enter JWT Secret (min 32 chars): " JWT_SECRET
    read -p "Enter AWS Region (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    read -p "Enter AWS Access Key ID: " AWS_ACCESS_KEY_ID
    read -p "Enter AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    read -p "Enter your domain (or press Enter for localhost): " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
    
    cat > .env << EOF
GREMLIN_ENDPOINT=ws://gremlin-server:8182/gremlin
JWT_SECRET=$JWT_SECRET
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
NEXT_PUBLIC_API_URL=https://$DOMAIN
EOF
    echo -e "${GREEN}✓ Environment file created${NC}"
else
    echo "Environment file already exists"
fi

# Step 6: Create SSL directory
echo -e "${YELLOW}Step 6: Setting up SSL...${NC}"
mkdir -p ssl

# Step 7: Set up firewall
echo -e "${YELLOW}Step 7: Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo -e "${GREEN}✓ Firewall configured${NC}"

# Step 8: Start services
echo -e "${YELLOW}Step 8: Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Step 9: Wait for services to start
echo -e "${YELLOW}Step 9: Waiting for services to start...${NC}"
sleep 10

# Step 10: Check status
echo -e "${YELLOW}Step 10: Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Final message
echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Services running:"
echo "  - Frontend: http://localhost:3000"
echo "  - API: http://localhost:8000"
echo "  - Gremlin: ws://localhost:8182"
echo ""
echo "Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL certificates with Let's Encrypt"
echo "3. Configure monitoring and backups"
echo ""
echo "Useful commands:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo "  docker-compose -f docker-compose.prod.yml ps"
echo "  docker-compose -f docker-compose.prod.yml restart"
echo ""
