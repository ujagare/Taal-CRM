// src/utils/whatsapp.js
// Shared utility for sending WhatsApp messages via the local Baileys server

const getWaServerUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WA_SERVER_URL) {
    return import.meta.env.VITE_WA_SERVER_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:5001`;
  }
  return 'http://localhost:5001';
};

const WA_SERVER = getWaServerUrl();

/**
 * Send a single WhatsApp message
 * @param {string} phone - Phone number (10 or 12 digits)
 * @param {string} message - Message text
 * @returns {Promise<boolean>} - true if sent successfully
 */
export async function sendWhatsApp(phone, message) {
  try {
    const res = await fetch(`${WA_SERVER}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return res.ok && data.success === true;
  } catch {
    return false;
  }
}

/**
 * Send bulk WhatsApp messages with a template
 * @param {Array} recipients - Array of { full_name, whatsapp, exam_status, exam_score, instruments_played }
 * @param {string} messageTemplate - Template with {name}, {status}, {score}, {instrument}
 * @returns {Promise<boolean>} - true if broadcast started
 */
export async function sendBulkWhatsApp(recipients, messageTemplate) {
  try {
    const res = await fetch(`${WA_SERVER}/api/whatsapp/send-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients, messageTemplate }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if the WhatsApp server is running and connected
 * @returns {Promise<{running: boolean, connected: boolean}>}
 */
export async function checkWhatsAppStatus() {
  try {
    const res = await fetch(`${WA_SERVER}/api/whatsapp/status`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    return { running: true, connected: data.connected === true };
  } catch {
    return { running: false, connected: false };
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

