#!/bin/bash
# ============================================================
#   TAAL PATHAK CRM — Production Deploy Script (Linux/macOS)
#   Usage: bash deploy.sh
# ============================================================

set -e  # Exit immediately if any command fails

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    🚀  TAAL PATHAK CRM — PRODUCTION DEPLOY           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Pull latest code ──────────────────────────────
echo "📥 Step 1: Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated!"
echo ""

# ── Step 2: Install dependencies ─────────────────────────
echo "📦 Step 2: Installing npm dependencies..."
npm install
echo "✅ Dependencies installed!"
echo ""

# ── Step 3: Install PM2 globally (if not already) ────────
echo "⚙️  Step 3: Checking PM2..."
if ! command -v pm2 &> /dev/null; then
  echo "PM2 not found. Installing globally..."
  npm install -g pm2
  echo "✅ PM2 installed!"
else
  echo "✅ PM2 already installed: $(pm2 --version)"
fi
echo ""

# ── Step 4: Stop old PM2 processes (if any) ──────────────
echo "🛑 Step 4: Stopping any old PM2 taal processes..."
pm2 delete taal-whatsapp 2>/dev/null || true
pm2 delete taal-auto-reports 2>/dev/null || true
echo "✅ Old processes cleared!"
echo ""

# ── Step 5: Start PM2 services ───────────────────────────
echo "▶️  Step 5: Starting PM2 services..."
pm2 start ecosystem.config.cjs
echo "✅ PM2 services started!"
echo ""

# ── Step 6: Save PM2 config (survives reboot) ────────────
echo "💾 Step 6: Saving PM2 config..."
pm2 save
echo "✅ PM2 config saved!"
echo ""

# ── Step 7: Setup PM2 startup (auto-start on reboot) ─────
echo "🔁 Step 7: Setting up PM2 startup hook..."
echo "──────────────────────────────────────────────────────"
echo "⚠️  Run the command shown below (copy & paste it):"
echo "──────────────────────────────────────────────────────"
pm2 startup
echo ""

# ── Step 8: Show status ───────────────────────────────────
echo "📊 Step 8: Current PM2 Status:"
pm2 list
echo ""

# ── Step 9: Show logs briefly ────────────────────────────
echo "📋 Step 9: WhatsApp Server Logs (last 10 lines):"
sleep 3
pm2 logs taal-whatsapp --lines 10 --nostream
echo ""

# ── Done ─────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅  DEPLOY COMPLETE!                               ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  WhatsApp QR scan ke liye browser mein kholo:       ║"

# Get server IP automatically
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_SERVER_IP")
echo "║  👉 http://$SERVER_IP:5001/qr                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "📌 Useful commands:"
echo "   pm2 list                         → Sab processes dekho"
echo "   pm2 logs taal-whatsapp           → WhatsApp live logs"
echo "   pm2 logs taal-auto-reports       → Auto-reports live logs"
echo "   pm2 restart taal-whatsapp        → WhatsApp restart karo"
echo "   pm2 restart taal-auto-reports    → Auto-reports restart karo"
echo "   pm2 monit                        → CPU/Memory monitor"
echo ""
