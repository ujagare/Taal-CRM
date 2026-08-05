# 📱 TAAL Pathak CRM — Production Deploy Guide

## ✅ Services & Ports

| Service | Status | Port |
|---------|--------|------|
| taal-whatsapp | 🟢 ONLINE | 5001 |
| taal-auto-reports | 🟢 ONLINE | — |

---

## 🚀 Production Deploy Karne Ka Tarika

### ▶️ Option 1: Deploy Script (Recommended)

**Linux / macOS server par:**
```bash
bash deploy.sh
```

**Windows server / PC par:**
```powershell
# PowerShell mein:
.\deploy.ps1

# Ya CMD mein:
deploy.bat
```

---

### ▶️ Option 2: Manual Commands (Step by Step)

```bash
# ── Step 1: Latest code pull karo ───────────────────────
git pull origin main

# ── Step 2: Dependencies install karo ───────────────────
npm install

# ── Step 3: PM2 install karo (ek baar only) ─────────────
npm install -g pm2

# ── Step 4: Services start karo ─────────────────────────
pm2 start ecosystem.config.cjs

# ── Step 5: Config save karo (reboot ke baad bhi chale) ─
pm2 save

# ── Step 6: Startup hook (system boot par auto-start) ───
pm2 startup
# ⚠️  Ye command ek aur command output karega — use copy karke run karo

# ── Step 7: WhatsApp QR scan karo ───────────────────────
# Browser mein kholo: http://localhost:5001/qr
# WhatsApp → Settings → Linked Devices → Link a Device
```

---

## 🔍 Status Check Commands

```bash
pm2 list                              # Sab processes dekho
pm2 logs taal-whatsapp --lines 50     # WhatsApp live logs
pm2 logs taal-auto-reports --lines 50 # Auto-reports live logs
pm2 monit                             # CPU/Memory live monitor
```

**API se bhi check kar sakte ho:**
```bash
curl http://localhost:5001/api/whatsapp/status
# Response: {"connected":true,"hasQr":false}
```

---

## 🔧 Common Problems & Solutions

### ❌ Problem: WhatsApp disconnect ho gaya
```bash
pm2 restart taal-whatsapp
# Phir browser mein /qr kholo aur scan karo
```

### ❌ Problem: Auth session expire / QR scan nahi hua
```bash
# Auth folder delete karo (fresh start)
rm -rf baileys_auth_info          # Linux/Mac
rd /s /q baileys_auth_info        # Windows CMD
Remove-Item -Recurse baileys_auth_info  # Windows PowerShell

pm2 restart taal-whatsapp
# Browser mein kholo: http://localhost:5001/qr
```

### ❌ Problem: Port 5001 already in use
```bash
# Linux - check karo
lsof -i :5001

# Windows - check karo
netstat -ano | findstr 5001

# PM2 restart karo
pm2 restart taal-whatsapp
```

### ❌ Problem: PM2 startup ke baad service nahi chali
```bash
pm2 resurrect      # PM2 saved processes wapas start karo
pm2 save           # Current state save karo
```

---

## 📊 Monitoring

```bash
pm2 list                         # Quick status
pm2 monit                        # Real-time CPU/Memory
pm2 logs taal-whatsapp           # Live streaming logs
pm2 logs taal-whatsapp --lines 100 --nostream  # Last 100 lines
```

---

## 📁 Important File Locations

| File | Purpose |
|------|---------|
| `ecosystem.config.cjs` | PM2 configuration |
| `server/whatsapp_server.js` | WhatsApp server |
| `server/auto_daily_reports.js` | Auto daily reports |
| `baileys_auth_info/` | WhatsApp session (BACKUP KARO!) |
| `deploy.sh` | Linux deploy script |
| `deploy.bat` | Windows CMD deploy script |
| `deploy.ps1` | Windows PowerShell deploy script |

> ⚠️ **`baileys_auth_info/` folder backup rakho!**  
> Agar delete ho gaya toh phir se QR scan karna padega.

---

## 🌐 React App Ko WhatsApp Server Se Connect Karna

Frontend mein WhatsApp API URL:
- **Local:** `http://localhost:5001`
- **Production:** `http://YOUR_SERVER_IP:5001`

---

## 📋 Quick Reference Card

```
START:    pm2 start ecosystem.config.cjs
STOP:     pm2 stop all
RESTART:  pm2 restart taal-whatsapp
STATUS:   pm2 list
LOGS:     pm2 logs taal-whatsapp
QR PAGE:  http://localhost:5001/qr
API:      http://localhost:5001/api/whatsapp/status
```
