// src/utils/whatsapp.js
// Shared utility for sending WhatsApp messages via the local Baileys server

/**
 * Get dynamic WhatsApp Server URL
 */
export function getWaServerUrl() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('wa_server_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/$/, '');
    }
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WA_SERVER_URL) {
    return import.meta.env.VITE_WA_SERVER_URL.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    // If running locally or on network IP
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5001';
    }
    return `http://${window.location.hostname}:5001`;
  }
  return 'http://localhost:5001';
}

/**
 * Save custom WhatsApp server URL
 */
export function saveWaServerUrl(url) {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('wa_server_url');
    } else {
      localStorage.setItem('wa_server_url', url.trim());
    }
  }
}

/**
 * Send a single WhatsApp message
 * @param {string} phone - Phone number (10 or 12 digits)
 * @param {string} message - Message text
 * @returns {Promise<boolean>} - true if sent successfully
 */
export async function sendWhatsApp(phone, message) {
  const WA_SERVER = getWaServerUrl();
  try {
    const res = await fetch(`${WA_SERVER}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return res.ok && data.success === true;
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return false;
  }
}

/**
 * Send bulk WhatsApp messages with a template
 * @param {Array} recipients - Array of members
 * @param {string} messageTemplate - Template string
 * @returns {Promise<boolean>} - true if broadcast started
 */
export async function sendBulkWhatsApp(recipients, messageTemplate) {
  const WA_SERVER = getWaServerUrl();
  try {
    const res = await fetch(`${WA_SERVER}/api/whatsapp/send-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients, messageTemplate }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (err) {
    console.error('WhatsApp bulk error:', err);
    return false;
  }
}

/**
 * Check if the WhatsApp server is running and connected
 * @returns {Promise<{running: boolean, connected: boolean, isMixedContent?: boolean, url: string}>}
 */
export async function checkWhatsAppStatus() {
  const WA_SERVER = getWaServerUrl();
  const isHttpsSite = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpServer = WA_SERVER.startsWith('http://') && !WA_SERVER.includes('localhost') && !WA_SERVER.includes('127.0.0.1');
  const isMixedContent = isHttpsSite && isHttpServer;

  try {
    const res = await fetch(`${WA_SERVER}/api/whatsapp/status`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return { running: true, connected: data.connected === true, isMixedContent: false, url: WA_SERVER };
  } catch (err) {
    return { running: false, connected: false, isMixedContent, url: WA_SERVER, error: err.message };
  }
}

/**
 * Personalize a message template for a specific member
 */
export function personalizeMessage(template, member) {
  return template
    .replace(/\{name\}/gi, member.full_name || 'सदस्य')
    .replace(/\{status\}/gi, (member.exam_status || 'pending').toUpperCase())
    .replace(/\{score\}/gi, member.exam_score ? `${member.exam_score}/10` : '—')
    .replace(/\{instrument\}/gi, (member.instruments_played || 'ताल वाद्य').replace('कोणतेच नाही', 'None'))
    .replace(/\{phone\}/gi, member.whatsapp || '');
}

/**
 * Get all configured Admin WhatsApp numbers
 * @returns {Array<string>} - Array of clean phone strings
 */
export function getAdminPhones() {
  const raw = localStorage.getItem("wa_admin_phone") || "";
  return raw
    .split(",")
    .map(p => p.trim().replace(/\D/g, ""))
    .filter(p => p.length >= 10);
}

/**
 * Save Admin WhatsApp numbers string
 * @param {string} phoneString - Comma separated numbers
 */
export function saveAdminPhones(phoneString) {
  localStorage.setItem("wa_admin_phone", phoneString);
}

/**
 * Send auto-alert to all configured Admin WhatsApp numbers
 * @param {string} message - Alert message text
 * @returns {Promise<number>} - Count of successfully sent alerts
 */
export function sendAdminAlerts(message) {
  const phones = getAdminPhones();
  if (phones.length === 0) return Promise.resolve(0);
  
  return Promise.all(phones.map(phone => sendWhatsApp(phone, message)))
    .then(results => results.filter(Boolean).length);
}

