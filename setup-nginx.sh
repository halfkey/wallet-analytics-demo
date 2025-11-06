#!/bin/bash

# ChainScope Nginx Setup Script
set -e

echo "🔧 Setting up Nginx for chain-scope.dev..."

# Install nginx and certbot if not present
echo "📦 Installing nginx and certbot..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Stop nginx temporarily
systemctl stop nginx

# Create nginx configuration
echo "📝 Creating nginx configuration..."
cat > /etc/nginx/sites-available/chainscope << 'EOF'
# API Backend - api.chain-scope.dev
server {
    listen 80;
    server_name api.chain-scope.dev;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend - chain-scope.dev and www.chain-scope.dev
server {
    listen 80;
    server_name chain-scope.dev www.chain-scope.dev;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/chainscope /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Start nginx
echo "🚀 Starting nginx..."
systemctl start nginx
systemctl enable nginx

echo "✅ Nginx configured successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure DNS is configured:"
echo "   - A record: @ -> 144.202.11.220"
echo "   - A record: www -> 144.202.11.220"
echo "   - A record: api -> 144.202.11.220"
echo ""
echo "2. Wait for DNS propagation (can take up to 24 hours, usually much faster)"
echo ""
echo "3. Once DNS is working, run SSL certificate setup:"
echo "   certbot --nginx -d chain-scope.dev -d www.chain-scope.dev -d api.chain-scope.dev"
echo ""
echo "🌐 Your sites will be available at:"
echo "   Frontend: http://chain-scope.dev"
echo "   API: http://api.chain-scope.dev"
