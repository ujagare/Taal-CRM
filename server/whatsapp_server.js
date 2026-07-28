import express from 'express';
import cors from 'cors';
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

const app = express();
app.use(cors());
app.use(express.json());

let waSock = null;
let isConnected = false;
let qrCodeData = null;

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    
    waSock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['TAAL Pathak CRM', 'Chrome', '1.0.0'],
    });

    waSock.ev.on('creds.update', saveCreds);

    waSock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        qrCodeData = qr;
        console.log('\n======================================================');
        console.log('📱 SCAN THIS QR CODE IN YOUR WHATSAPP -> LINKED DEVICES:');
        console.log('======================================================\n');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        isConnected = false;
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('⚠️ Connection closed due to ', lastDisconnect?.error, ', reconnecting: ', shouldReconnect);
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      } else if (connection === 'open') {
        isConnected = true;
        qrCodeData = null;
        console.log('\n======================================================');
        console.log('✅ WHATSAPP CONNECTED SUCCESSFULLY TO TAAL PATHAK CRM!');
        console.log('======================================================\n');
      }
    });
  } catch (err) {
    console.error('WhatsApp Connection Error:', err);
  }
}

// ─── API ENDPOINTS ─── //

// Status check
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    connected: isConnected,
    hasQr: !!qrCodeData,
  });
});

// Single Message Endpoint
app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required' });
  }

  if (!isConnected || !waSock) {
    return res.status(503).json({ error: 'WhatsApp is not connected yet. Please scan the QR code first.' });
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedJid = cleanPhone.startsWith('91') ? `${cleanPhone}@s.whatsapp.net` : `91${cleanPhone}@s.whatsapp.net`;

    await waSock.sendMessage(formattedJid, { text: message });
    console.log(`📩 WhatsApp sent to: ${cleanPhone}`);
    return res.json({ success: true, message: 'WhatsApp message sent successfully!' });
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err);
    return res.status(500).json({ error: err.message || 'Failed to send WhatsApp message' });
  }
});

// Bulk Broadcast Endpoint
app.post('/api/whatsapp/send-bulk', async (req, res) => {
  const { recipients, messageTemplate } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !messageTemplate) {
    return res.status(400).json({ error: 'Recipients array and message template are required' });
  }

  if (!isConnected || !waSock) {
    return res.status(503).json({ error: 'WhatsApp is not connected yet. Please scan the QR code first.' });
  }

  // Respond immediately that broadcast has started
  res.json({ success: true, message: `Bulk broadcast started for ${recipients.length} recipients.` });

  // Process asynchronously with a 1.5 second safety delay between messages
  (async () => {
    let sentCount = 0;
    for (const r of recipients) {
      if (!r.whatsapp) continue;
      try {
        const cleanPhone = String(r.whatsapp).replace(/\D/g, '');
        if (!cleanPhone) continue;

        const formattedJid = cleanPhone.startsWith('91') ? `${cleanPhone}@s.whatsapp.net` : `91${cleanPhone}@s.whatsapp.net`;
        
        // Personalize template placeholders: {name}, {status}, {score}, {instrument}
        const personalizedMsg = messageTemplate
          .replace(/\{name\}/gi, r.full_name || 'सदस्य')
          .replace(/\{status\}/gi, (r.exam_status || 'pending').toUpperCase())
          .replace(/\{score\}/gi, r.exam_score ? `${r.exam_score}/10` : '—')
          .replace(/\{instrument\}/gi, (r.instruments_played || '—').replace('कोणतेच नाही', 'None'));

        await waSock.sendMessage(formattedJid, { text: personalizedMsg });
        sentCount++;
        console.log(`📲 [Bulk ${sentCount}/${recipients.length}] Sent to ${r.full_name} (${cleanPhone})`);

        // 1.5s delay to be friendly
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`❌ Failed bulk message to ${r.full_name}:`, err.message);
      }
    }
    console.log(`\n✅ Bulk Broadcast Finished! Successfully sent ${sentCount} messages.\n`);
  })();
});

// Start Server & Connect WhatsApp
const PORT = 5001;

// Daily Report WhatsApp Endpoint — send structured report as formatted message
app.post('/api/whatsapp/send-report', async (req, res) => {
  const { phone, reportData } = req.body;

  if (!phone || !reportData) {
    return res.status(400).json({ error: 'Phone and reportData are required' });
  }

  if (!isConnected || !waSock) {
    return res.status(503).json({ error: 'WhatsApp is not connected yet. Please scan the QR code first.' });
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedJid = cleanPhone.startsWith('91') ? `${cleanPhone}@s.whatsapp.net` : `91${cleanPhone}@s.whatsapp.net`;

    // Build formatted message from report data
    const d = reportData;
    const msg = `📊 *TAAL PATHAK — दैनिक अहवाल*
📅 *Date:* ${d.date || new Date().toLocaleDateString('en-IN')}

━━━━━━━━━━━━━━━━━━━━
🥁 *DHOL STATUS*
━━━━━━━━━━━━━━━━━━━━
✅ Ready: *${d.readyCount || 0}*
💥 Broken: *${d.brokenCount || 0}*
🔨 Made: *${d.madeCount || 0}*

━━━━━━━━━━━━━━━━━━━━
🎯 *PAN STOCK*
━━━━━━━━━━━━━━━━━━━━
30": *${d.pan30 || 0}* | 28": *${d.pan28 || 0}* | 26": *${d.pan26 || 0}*

━━━━━━━━━━━━━━━━━━━━
🧵 *DORI STOCK*
━━━━━━━━━━━━━━━━━━━━
30": *${d.dori30 || 0}* | 28": *${d.dori28 || 0}* | 26": *${d.dori26 || 0}*

━━━━━━━━━━━━━━━━━━━━
🔩 *MAIN STOCK*
━━━━━━━━━━━━━━━━━━━━
30": *${d.main30 || 0}* | 28": *${d.main28 || 0}* | 26": *${d.main26 || 0}*

━━━━━━━━━━━━━━━━━━━━
👥 *ATTENDANCE*
━━━━━━━━━━━━━━━━━━━━
Present: *${d.present || 0}* | Absent: *${d.absent || 0}*

${d.lowStockItems?.length > 0 ? `\n🚨 *LOW STOCK ALERT:*\n${d.lowStockItems.map(l => `  ⚠️ ${l}`).join('\n')}\n` : ''}
━━━━━━━━━━━━━━━━━━━━
_TAAL Pathak CRM — Auto Report_`;

    await waSock.sendMessage(formattedJid, { text: msg });
    console.log(`📊 Daily report sent to: ${cleanPhone}`);
    return res.json({ success: true, message: 'Daily report sent successfully!' });
  } catch (err) {
    console.error('Failed to send daily report:', err);
    return res.status(500).json({ error: err.message || 'Failed to send report' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 TAAL WhatsApp Automation Server running on http://localhost:${PORT}`);
  connectToWhatsApp();
});
