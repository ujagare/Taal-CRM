# 🚀 Quick Start: Automatic Daily WhatsApp Reports

## ✅ Setup Complete - Ab Ye Karo:

### Step 1: Admin Phone Numbers Add Karo (2 min)

`.env` file kholo aur ye line edit karo:

```env
# Apne actual admin phone numbers dal do
ADMIN_PHONES=919876543210,919876543211,919876543212
```

**Important:**

- Country code (91) zaroori hai
- Comma se separate karo
- Spaces mat do
- Jitne chahiye utne numbers add karo

### Step 2: Time Set Karo (Optional)

Default: Har roz 6:00 PM IST

Agar change karna ho:

```env
# Morning 9 AM
REPORT_TIME=0 9 * * *

# Evening 8 PM
REPORT_TIME=0 20 * * *

# Afternoon 2:30 PM
REPORT_TIME=30 14 * * *
```

### Step 3: WhatsApp Server Start Karo

**Terminal 1:**

```bash
npm run whatsapp
```

QR code scan karo apne WhatsApp se (Linked Devices)

### Step 4: Auto Reports System Start Karo

**Terminal 2:**

```bash
npm run auto-reports
```

**Ya dono ek saath:**

```bash
npm run start-all
```

### Step 5: Test Karo (Optional)

`server/auto_daily_reports.js` file mein line 240-243 uncomment karo:

```javascript
// Optional: Send test report on startup
setTimeout(() => {
  console.log("\n🧪 Sending test report...");
  generateAndSendDailyReport();
}, 5000);
```

Phir restart karo - 5 seconds mein test report bhej dega!

---

## 🎯 Ho Gaya! Ab Kya Hoga:

✅ Har roz scheduled time par automatically report bhejega  
✅ Sabhi admin phones par message jayega  
✅ Complete report: dhol status, inventory, attendance  
✅ Low stock alerts automatic  
✅ Database mein summary save hogi  
✅ Console mein logs dikhenge

---

## 📊 Console Output Aisa Dikhega:

```
📱 Auto Daily Report System Started
👥 Admin phones configured: 3
   1. 919876543210
   2. 919876543211
   3. 919876543212

⏰ Scheduled daily reports at: 0 18 * * *
   (Default: 6:00 PM IST every day)

✅ Auto Daily Report System Running

[6 PM par...]

🔔 Daily report schedule triggered!
🔄 Generating daily report...
📤 Sending to all admins...
✅ Sent to 919876543210
✅ Sent to 919876543211
✅ Sent to 919876543212
✅ Daily report sent successfully!
```

---

## ❓ FAQs

**Q: Phone numbers kahan se milenge?**  
A: Jinko daily reports chahiye unke WhatsApp numbers (with 91)

**Q: Kya manual bhi bhej sakte hain?**  
A: Haan! Daily Report page par "Send via WhatsApp" button hai

**Q: Multiple times par bhej sakte hain?**  
A: Haan! Multiple REPORT_TIME instances run karo ya code mein add karo

**Q: Server band ho jaye to?**  
A: PM2 use karo auto-restart ke liye (AUTO_REPORTS_SETUP.md dekho)

**Q: Messages nahi aa rahe?**  
A: WhatsApp server connected hai check karo, QR scan kiya check karo

---

## 📚 Complete Guide

Detailed setup aur troubleshooting ke liye dekho:
**AUTO_REPORTS_SETUP.md**

---

**System ready hai! Bas phone numbers add karo aur start karo! 🎉**
