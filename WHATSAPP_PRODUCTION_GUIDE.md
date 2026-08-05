# 📱 WhatsApp Server — Production Setup Guide

## ✅ Current Status (Local Machine)

| Service | Status | Port |
|---------|--------|------|
| taal-whatsapp | 🟢 ONLINE | 5001 |
| taal-auto-reports | 🟢 ONLINE | — |

---

## 🚀 Production Deploy Karne Ka Tarika

### 1. Server Par Code Upload Karo

```bash
git pull origin main
npm install
```

### 2. PM2 Install Karo (ek baar)

```bash
npm install -g pm2
```

### 3. Services Start Karo

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

> ⚠️ `pm2 startup` command ek aur command output karega — use **copy karke run karo**

### 4. WhatsApp QR Scan Karo (pehli baar)

Browser mein kholo:
```
http://localhost:5001/qr
```

QR code scan karo WhatsApp se:
- WhatsApp → Settings → Linked Devices → Link a Device

---

## 🔧 Common Problems & Solutions

### Problem: WhatsApp disconnect ho gaya
```bash
pm2 restart taal-whatsapp
# Phir browser mein /qr kholo aur scan karo
```

### Problem: Auth session expire ho gaya
```bash
# Pehle auth folder delete karo
rm -rf baileys_auth_info
pm2 restart taal-whatsapp
# Phir /qr se fresh scan karo
```

### Problem: Port 5001 already in use
```bash
# Check karo kaun use kar raha hai
netstat -ano | findstr 5001
# PM2 restart karo
pm2 restart taal-whatsapp
```

---

## 📊 Monitoring Commands

```bash
pm2 list                              # Sab processes dekho
pm2 logs taal-whatsapp --lines 50     # Live logs dekho
pm2 monit                             # CPU/Memory monitor
```

---

## 🌐 React App Ko WhatsApp Se Connect Karna

`src/lib/supabase.js` ya jahan bhi API URL define hain, wahan:

```
VITE_WA_SERVER=http://your-server-ip:5001
```

Default locally: `http://localhost:5001`

---

## 📋 Current PM2 Auth Session Location

```
C:\Users\ujaga\OneDrive\Desktop\Dashboard\meridian-crm\baileys_auth_info\
```

> ⚠️ **Is folder ko backup rakho!** Agar delete ho gaya toh phir se QR scan karna padega.
