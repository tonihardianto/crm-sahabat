#!/bin/bash
set -e

echo "=============================="
echo "  CRM Deploy Script"
echo "=============================="

# Warna output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# --- 1. Git Pull ---
log "Pulling latest code..."
git pull || err "Git pull failed"

# --- 2. Install backend dependencies ---
log "Installing backend dependencies..."
npm install || err "Backend npm install failed"

# --- 3. Build backend (TypeScript) ---
log "Building backend..."
npm run build || err "Backend build failed"

# --- 4. Install & build frontend ---
log "Installing frontend dependencies..."
cd client
npm install || err "Frontend npm install failed"

log "Building frontend..."
npm run build || err "Frontend build failed"
cd ..

# --- 5. Restart PM2 ---
log "Restarting PM2..."
pm2 restart crm-backend || warn "PM2 restart failed — mungkin belum berjalan, coba: pm2 start"

log ""
log "Deploy selesai!"
pm2 status
