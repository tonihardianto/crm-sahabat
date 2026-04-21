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

PROJECT_ROOT="/var/www/html/crm"
PM2_APP="crm-backend"

cd $PROJECT_ROOT

# --- 1. Check perubahan git ---
log "Checking update dari Git..."
git fetch

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$(git rev-parse --abbrev-ref HEAD))

if [ "$LOCAL" = "$REMOTE" ]; then
  warn "Tidak ada perubahan. Skip deploy."
  exit 0
fi

# --- 2. Git Pull ---
log "Pulling latest code..."
git pull --rebase || err "Git pull failed"

# --- 3. Install backend dependencies ---
log "Installing backend dependencies..."
npm ci || err "Backend npm install failed"

# --- 4. Build backend ---
log "Building backend..."
npm run build || err "Backend build failed"

# --- 5. Install & build frontend ---
log "Installing frontend dependencies..."
cd client
npm ci || err "Frontend npm install failed"

log "Building frontend..."
npm run build || err "Frontend build failed"
cd ..

# --- 6. Restart PM2 ---
log "Reloading PM2..."
pm2 reload $PM2_APP || warn "PM2 reload failed — fallback restart"
pm2 restart $PM2_APP || warn "PM2 restart gagal"

log ""
log "Deploy selesai!"
pm2 status