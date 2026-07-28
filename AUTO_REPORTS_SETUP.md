# 📱 Automatic Daily WhatsApp Reports - Setup Guide

## ✨ Features

✅ **Automatic Daily Reports** - Har roz automatically WhatsApp report bhejta hai  
✅ **Multiple Admins** - Ek saath sabhi admins ko message jayega  
✅ **Scheduled Time** - Aap time set kar sakte ho (default: 6 PM)  
✅ **Complete Report** - Dhol status, inventory, attendance sab kuch  
✅ **Low Stock Alerts** - Agar stock kam ho to automatic warning  
✅ **Database Sync** - Report database mein bhi save hoti hai

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Dependencies

```bash
cd meridian-crm
npm install node-cron concurrently
```

### Step 2: Configure Admin Phone Numbers

`.env` file mein ye add karo:

```env
# Admin phone numbers (comma separated, with country code)
ADMIN_PHONES=919876543210,919876543211,919876543212

# Report send time (cron format)
# Default: 0 18 * * * = Every day at 6:00 PM IST
REPORT_TIME=0 18 * * *

# WhatsApp server URL
WHATSAPP_SERVER_URL=http://localhost:5001
```

**Important:**

- Phone numbers mein **country code** zaroori hai (91 for India)
- Comma se separate karo multiple numbers
- Spaces mat do

### Step 3: Start Auto Report System

**Option A: Only Auto Reports**

```bash
npm run auto-reports
```

**Option B: WhatsApp + Auto Reports (Recommended)**

```bash
npm run start-all
```

---

## ⏰ Time Schedule Examples

Cron format: `minute hour day month weekday`

```env
# Every day at 6:00 PM IST
REPORT_TIME=0 18 * * *

# Every day at 9:00 AM IST
REPORT_TIME=0 9 * * *

# Every day at 8:00 PM IST
REPORT_TIME=0 20 * * *

# Twice daily: 9 AM and 6 PM (requires code modification)
# For multiple times, run multiple instances
```

**Cron Format Explained:**

```
0 18 * * *
│ │  │ │ │
│ │  │ │ └─── Day of week (0-7, 0 and 7 = Sunday)
│ │  │ └───── Month (1-12)
│ │  └─────── Day of month (1-31)
│ └────────── Hour (0-23)
└──────────── Minute (0-59)
```

---

## 📝 Report Format

Report mein ye sab information hogi:

```
📊 TAAL PATHAK — दैनिक अहवाल
📅 Date: 28 Jul, 2026

━━━━━━━━━━━━━━━━━━━━
🥁 DHOL STATUS
━━━━━━━━━━━━━━━━━━━━
✅ Ready Dhols: 42
💥 Dhol Foda: 5
🔨 Dhol Banaya: 8

━━━━━━━━━━━━━━━━━━━━
🎯 PAN STOCK (Total: 100)
━━━━━━━━━━━━━━━━━━━━
  30": 20
  28": 50
  26": 30

━━━━━━━━━━━━━━━━━━━━
🧵 DORI STOCK (Total: 47)
━━━━━━━━━━━━━━━━━━━━
  30": 12
  28": 25
  26": 10

━━━━━━━━━━━━━━━━━━━━
🔩 MAIN STOCK (Total: 150)
━━━━━━━━━━━━━━━━━━━━
  30": 50
  28": 70
  26": 30

━━━━━━━━━━━━━━━━━━━━
👥 ATTENDANCE
━━━━━━━━━━━━━━━━━━━━
Present: 45 | Absent: 3
Late: 2 | Half Day: 1
Total Members: 51

🚨 LOW STOCK ALERT:
  ⚠️ Dori 26": 3
  ⚠️ Pan 30": 4

━━━━━━━━━━━━━━━━━━━━
TAAL Pathak CRM — Auto Report
```

---

## 🧪 Test Report (Manual Send)

Code mein test line uncomment karo (line 240-243 in `auto_daily_reports.js`):

```javascript
// Optional: Send test report on startup
setTimeout(() => {
  console.log("\n🧪 Sending test report...");
  generateAndSendDailyReport();
}, 5000);
```

Phir run karo:

```bash
npm run auto-reports
```

5 seconds baad test report automatically bhej dega!

---

## 📊 Console Output

Jab system running hoga:

```
📱 Auto Daily Report System Started
👥 Admin phones configured: 3
   1. 919876543210
   2. 919876543211
   3. 919876543212

⏰ Scheduled daily reports at: 0 18 * * *
   (Default: 6:00 PM IST every day)

✅ Auto Daily Report System Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[At scheduled time...]

🔔 Daily report schedule triggered!
🔄 Generating daily report...
⏰ Time: 28/07/2026, 6:00:00 PM

📝 Report generated:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Report content...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📤 Sending to all admins...
✅ Sent to 919876543210
✅ Sent to 919876543211
✅ Sent to 919876543212
✅ Daily report sent successfully!
✅ Database updated
```

---

## 🔧 Troubleshooting

### Problem 1: "No admin phones configured"

**Fix:** `.env` file mein `ADMIN_PHONES` add karo:

```env
ADMIN_PHONES=919876543210,919876543211
```

### Problem 2: "WhatsApp server not connected"

**Fix:** Pehle WhatsApp server start karo:

```bash
npm run whatsapp
```

QR code scan karo, phir auto-reports start karo.

### Problem 3: Messages nahi jaa rahe

**Check:**

1. WhatsApp server running hai?
2. QR code scan kiya?
3. Phone numbers sahi hain (with country code)?
4. Internet connection stable hai?

### Problem 4: Wrong time zone

**Fix:** Code mein timezone already `Asia/Kolkata` set hai. Agar change karna ho:

```javascript
cron.schedule(
  scheduleTime,
  () => {
    generateAndSendDailyReport();
  },
  {
    timezone: "Asia/Kolkata", // Change this
  },
);
```

---

## 🎯 Production Deployment

### Option 1: PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server/auto_daily_reports.js --name "daily-reports"
pm2 start server/whatsapp_server.js --name "whatsapp"

# Save PM2 process list
pm2 save

# Auto-start on system reboot
pm2 startup
```

### Option 2: Docker

Create `docker-compose.yml`:

```yaml
services:
  whatsapp:
    build: .
    command: npm run whatsapp
    volumes:
      - ./baileys_auth_info:/app/baileys_auth_info
    ports:
      - "5001:5001"

  auto-reports:
    build: .
    command: npm run auto-reports
    depends_on:
      - whatsapp
    environment:
      - ADMIN_PHONES=${ADMIN_PHONES}
      - REPORT_TIME=${REPORT_TIME}
```

Run:

```bash
docker-compose up -d
```

### Option 3: Systemd Service (Linux)

Create `/etc/systemd/system/taal-reports.service`:

```ini
[Unit]
Description=TAAL Pathak Auto Daily Reports
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/meridian-crm
ExecStart=/usr/bin/npm run start-all
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl enable taal-reports
sudo systemctl start taal-reports
```

---

## 📱 Multiple Time Schedules

Agar multiple times par report bhejna hai (e.g., 9 AM aur 6 PM):

**Option 1:** Two separate instances run karo:

Terminal 1:

```bash
REPORT_TIME="0 9 * * *" npm run auto-reports
```

Terminal 2:

```bash
REPORT_TIME="0 18 * * *" npm run auto-reports
```

**Option 2:** Code mein multiple schedules add karo:

```javascript
// Morning report - 9 AM
cron.schedule(
  "0 9 * * *",
  () => {
    console.log("\n🌅 Morning Report");
    generateAndSendDailyReport();
  },
  { timezone: "Asia/Kolkata" },
);

// Evening report - 6 PM
cron.schedule(
  "0 18 * * *",
  () => {
    console.log("\n🌆 Evening Report");
    generateAndSendDailyReport();
  },
  { timezone: "Asia/Kolkata" },
);
```

---

## 🎉 Success Checklist

- [ ] `node-cron` aur `concurrently` install kiya
- [ ] `.env` mein admin phone numbers add kiye
- [ ] Report time configure kiya
- [ ] WhatsApp server QR scan kiya
- [ ] Test report successfully bheja
- [ ] Console output sahi dikh raha hai
- [ ] Scheduled time par automatic report aayi
- [ ] Sabhi admins ko message mila
- [ ] Database mein summary save hui

---

## 📞 Support

Agar koi problem ho to:

1. Console logs check karo
2. WhatsApp server status verify karo
3. Phone numbers aur time format check karo
4. Database connectivity test karo

**Auto Daily Reports ab fully functional hai! 🚀**
