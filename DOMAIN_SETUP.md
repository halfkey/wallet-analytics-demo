# ChainScope Domain Setup Guide

This guide will help you configure chain-scope.dev with SSL certificates.

## Step 1: Configure DNS Records

Go to your domain registrar (where you bought chain-scope.dev) and add these DNS records:

```
Type: A
Name: @
Value: 144.202.11.220
TTL: 300 (or Auto)

Type: A
Name: www
Value: 144.202.11.220
TTL: 300 (or Auto)

Type: A
Name: api
Value: 144.202.11.220
TTL: 300 (or Auto)
```

This will set up:
- `chain-scope.dev` → Frontend
- `www.chain-scope.dev` → Frontend
- `api.chain-scope.dev` → API Backend

**Note**: DNS propagation can take anywhere from 5 minutes to 24 hours. Usually it's fast (under 30 minutes).

## Step 2: Verify DNS Propagation

Check if DNS is working by running:

```bash
# Check from your local machine
dig chain-scope.dev
dig www.chain-scope.dev
dig api.chain-scope.dev

# Or use online tools like:
# https://dnschecker.org
```

Wait until all domains resolve to `144.202.11.220` before proceeding.

## Step 3: Set Up Nginx on VPS

Once DNS is propagating, upload and run the nginx setup script:

```bash
# Copy the setup script to VPS
scp setup-nginx.sh root@144.202.11.220:/root/

# SSH into VPS
ssh root@144.202.11.220

# Run the setup script
chmod +x /root/setup-nginx.sh
/root/setup-nginx.sh
```

This will:
- Install nginx and certbot
- Configure reverse proxy for frontend (port 3001) and API (port 3000)
- Set up proper routing for all three domains

## Step 4: Install SSL Certificates

After nginx is set up and DNS is fully propagated, run this command on the VPS:

```bash
certbot --nginx -d chain-scope.dev -d www.chain-scope.dev -d api.chain-scope.dev
```

Follow the prompts:
1. Enter your email address (for renewal notifications)
2. Agree to terms of service
3. Choose whether to share your email with EFF (optional)
4. Select option 2 to redirect HTTP to HTTPS

Certbot will automatically:
- Obtain SSL certificates from Let's Encrypt
- Configure nginx to use HTTPS
- Set up automatic certificate renewal

## Step 5: Redeploy Frontend with New API URL

Now that the domain is configured, redeploy the frontend to use the proper API URL:

```bash
# From your local machine
cd /home/trap/code/wallet-analytics-demo
./deploy.sh
```

The frontend will now use `https://api.chain-scope.dev` instead of the IP address.

## Step 6: Verify Everything Works

Visit your sites:
- **Frontend**: https://chain-scope.dev
- **API Health Check**: https://api.chain-scope.dev/health

Both should load with valid SSL certificates (🔒 in browser).

## Troubleshooting

### DNS not resolving
- Wait longer (DNS can take up to 24 hours)
- Clear your local DNS cache: `sudo systemd-resolve --flush-caches`
- Check with multiple DNS checkers

### Certbot fails with "connection refused"
- Make sure DNS is fully propagated first
- Check nginx is running: `systemctl status nginx`
- Check firewall allows HTTP/HTTPS: `ufw status`

### Frontend can't connect to API
- Check API is running: `docker ps`
- Check API logs: `cd /root/wallet-analytics-api && docker compose logs`
- Verify nginx config: `nginx -t`

## Certificate Renewal

Let's Encrypt certificates expire after 90 days. Certbot automatically sets up a cron job to renew them. You can test renewal with:

```bash
certbot renew --dry-run
```

## Architecture

```
                                    VPS (144.202.11.220)
                                    ┌─────────────────────┐
chain-scope.dev ─────────────────> │  Nginx (Port 80/443)│
www.chain-scope.dev ──────────────>│         │           │
                                    │         ├─> Frontend (Port 3001)
api.chain-scope.dev ──────────────>│         │           │
                                    │         └─> API (Port 3000)
                                    └─────────────────────┘
```

All traffic goes through nginx which:
- Handles SSL termination
- Routes frontend domains to port 3001
- Routes API domain to port 3000
- Redirects HTTP to HTTPS
