import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin phone numbers (comma separated in .env)
// Example: ADMIN_PHONES=919876543210,919876543211,919876543212
const adminPhones = (process.env.ADMIN_PHONES || "")
  .split(",")
  .filter((p) => p.trim());

console.log("📱 Auto Daily Report System Started");
console.log(`👥 Admin phones configured: ${adminPhones.length}`);
adminPhones.forEach((phone, i) => console.log(`   ${i + 1}. ${phone}`));

// Helper: Format date
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Helper: Get today's date in ISO format
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Build WhatsApp report text
function buildWhatsAppReportText(data) {
  const { stats, panData, doriData, mainData, attendanceStats, dateStr } = data;

  const doriTotal =
    (Number(doriData['26"']) || 0) +
    (Number(doriData['28"']) || 0) +
    (Number(doriData['30"']) || 0);
  const mainTotal =
    (Number(mainData['26"']) || 0) +
    (Number(mainData['28"']) || 0) +
    (Number(mainData['30"']) || 0);
  const panTotal =
    (Number(panData['26"']) || 0) +
    (Number(panData['28"']) || 0) +
    (Number(panData['30"']) || 0);

  // Check for low stock items
  const lowItems = [];
  const SIZES = [26, 28, 30];
  const LOW_STOCK_THRESHOLD = 5;

  SIZES.forEach((s) => {
    const key = `${s}"`;
    if ((Number(doriData[key]) || 0) < LOW_STOCK_THRESHOLD)
      lowItems.push(`Dori ${key}: ${doriData[key] || 0}`);
    if ((Number(panData[key]) || 0) < LOW_STOCK_THRESHOLD)
      lowItems.push(`Pan ${key}: ${panData[key] || 0}`);
  });

  return `📊 *TAAL PATHAK — दैनिक अहवाल*
📅 *Date:* ${dateStr}

━━━━━━━━━━━━━━━━━━━━
🥁 *DHOL STATUS*
━━━━━━━━━━━━━━━━━━━━
✅ Ready Dhols: *${stats.readyCount}*
💥 Dhol Foda: *${stats.brokenCount}*
🔨 Dhol Banaya: *${stats.madeCount}*

━━━━━━━━━━━━━━━━━━━━
🎯 *PAN STOCK* (Total: ${panTotal})
━━━━━━━━━━━━━━━━━━━━
  30": *${panData['30"'] || 0}*
  28": *${panData['28"'] || 0}*
  26": *${panData['26"'] || 0}*

━━━━━━━━━━━━━━━━━━━━
🧵 *DORI STOCK* (Total: ${doriTotal})
━━━━━━━━━━━━━━━━━━━━
  30": *${doriData['30"'] || 0}*
  28": *${doriData['28"'] || 0}*
  26": *${doriData['26"'] || 0}*

━━━━━━━━━━━━━━━━━━━━
🔩 *MAIN STOCK* (Total: ${mainTotal})
━━━━━━━━━━━━━━━━━━━━
  30": *${mainData['30"'] || 0}*
  28": *${mainData['28"'] || 0}*
  26": *${mainData['26"'] || 0}*

━━━━━━━━━━━━━━━━━━━━
👥 *ATTENDANCE*
━━━━━━━━━━━━━━━━━━━━
Present: *${attendanceStats.present}* | Absent: *${attendanceStats.absent}*
Late: *${attendanceStats.late}* | Half Day: *${attendanceStats.halfDay}*
Total Members: *${attendanceStats.total}*

${lowItems.length > 0 ? `\n🚨 *LOW STOCK ALERT:*\n${lowItems.map((l) => `  ⚠️ ${l}`).join("\n")}\n` : ""}
━━━━━━━━━━━━━━━━━━━━
_TAAL Pathak CRM — Auto Daily Report_`;
}

// Fetch today's data from database
async function fetchTodayData() {
  const today = todayISO();

  try {
    // Fetch all required data
    const [reportsRes, panRes, doriRes, mainRes, attendanceRes] =
      await Promise.all([
        supabase.from("daily_reports").select("*").eq("report_date", today),
        supabase.from("dhol_pan").select("*").eq("pane_type", "old"),
        supabase.from("dori_size_inventory").select("*"),
        supabase.from("main_inventory").select("*"),
        supabase.from("attendance").select("*").eq("attendance_date", today),
      ]);

    // Process reports
    const reports = reportsRes.data || [];
    const brokenCount = reports.filter(
      (r) => r.broken_by?.trim() || r.report_type === "Dhol Fodne",
    ).length;
    const madeCount = reports.filter(
      (r) => r.made_by?.trim() || r.report_type === "Dhol Banaye",
    ).length;
    const readyCount = reports.filter(
      (r) => r.repair_status === "Ready",
    ).length;

    // Process pan data
    const panData = { '26"': 0, '28"': 0, '30"': 0 };
    if (panRes.data) {
      panRes.data.forEach((row) => {
        const size = normalizeSize(row.size);
        panData[size] = (Number(row.thapi) || 0) + (Number(row.dhoom) || 0);
      });
    }

    // Process dori data
    const doriData = { '26"': 0, '28"': 0, '30"': 0 };
    if (doriRes.data) {
      doriRes.data.forEach((row) => {
        const size = row.size?.includes("26")
          ? '26"'
          : row.size?.includes("28")
            ? '28"'
            : '30"';
        doriData[size] = Number(row.current_count) || 0;
      });
    }

    // Process main data
    const mainData = { '26"': 0, '28"': 0, '30"': 0 };
    if (mainRes.data) {
      mainRes.data.forEach((row) => {
        const size = row.size?.includes("26")
          ? '26"'
          : row.size?.includes("28")
            ? '28"'
            : '30"';
        mainData[size] = Number(row.current_count) || 0;
      });
    }

    // Process attendance
    const attendance = attendanceRes.data || [];
    const attendanceStats = {
      present: attendance.filter((a) => a.status === "Present").length,
      absent: attendance.filter((a) => a.status === "Absent").length,
      late: attendance.filter((a) => a.status === "Late").length,
      halfDay: attendance.filter((a) => a.status === "Half Day").length,
      total: attendance.length,
    };

    return {
      stats: { readyCount, brokenCount, madeCount },
      panData,
      doriData,
      mainData,
      attendanceStats,
      dateStr: formatDate(today),
    };
  } catch (error) {
    console.error("❌ Error fetching data:", error.message);
    return null;
  }
}

// Normalize size helper
function normalizeSize(size) {
  const raw = String(size || "");
  const normalized = raw
    .replace(/[\u0966-\u096F]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0966),
    )
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
  if (normalized.includes("26")) return '26"';
  if (normalized.includes("28")) return '28"';
  if (normalized.includes("30")) return '30"';
  return normalized || '28"';
}

// Send WhatsApp message to all admins
async function sendToAllAdmins(message) {
  if (adminPhones.length === 0) {
    console.error("❌ No admin phones configured in .env (ADMIN_PHONES)");
    return false;
  }

  const whatsappServerUrl =
    process.env.WHATSAPP_SERVER_URL || "http://localhost:5001";
  let successCount = 0;

  for (const phone of adminPhones) {
    try {
      const response = await fetch(`${whatsappServerUrl}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), message }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Sent to ${phone}`);
        successCount++;
      } else {
        console.error(`❌ Failed to send to ${phone}:`, result.error);
      }

      // Wait 2 seconds between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error sending to ${phone}:`, error.message);
    }
  }

  return successCount > 0;
}

// Generate and send daily report
async function generateAndSendDailyReport() {
  console.log("\n🔄 Generating daily report...");
  console.log(`⏰ Time: ${new Date().toLocaleString("en-IN")}`);

  const data = await fetchTodayData();

  if (!data) {
    console.error("❌ Failed to fetch data from database");
    return;
  }

  const message = buildWhatsAppReportText(data);
  console.log("\n📝 Report generated:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(message);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📤 Sending to all admins...");
  const sent = await sendToAllAdmins(message);

  if (sent) {
    console.log("✅ Daily report sent successfully!");

    // Update database to mark WhatsApp as sent
    try {
      await supabase.from("daily_summary_reports").upsert(
        {
          report_date: todayISO(),
          whatsapp_sent: true,
          ...data.stats,
          pan_26_count: data.panData['26"'],
          pan_28_count: data.panData['28"'],
          pan_30_count: data.panData['30"'],
          dori_26_count: data.doriData['26"'],
          dori_28_count: data.doriData['28"'],
          dori_30_count: data.doriData['30"'],
          main_26_count: data.mainData['26"'],
          main_28_count: data.mainData['28"'],
          main_30_count: data.mainData['30"'],
          present_count: data.attendanceStats.present,
          absent_count: data.attendanceStats.absent,
          total_members: data.attendanceStats.total,
        },
        {
          onConflict: "report_date",
        },
      );
      console.log("✅ Database updated");
    } catch (err) {
      console.error("⚠️ Database update failed:", err.message);
    }
  } else {
    console.error("❌ Failed to send daily report");
  }
}

// Schedule daily reports
// Default: Every day at 6:00 PM IST
const scheduleTime = process.env.REPORT_TIME || "0 18 * * *"; // Cron format: minute hour day month weekday

console.log(`\n⏰ Scheduled daily reports at: ${scheduleTime}`);
console.log("   (Default: 6:00 PM IST every day)");
console.log("   To change, set REPORT_TIME in .env (cron format)\n");

cron.schedule(
  scheduleTime,
  () => {
    console.log("\n🔔 Daily report schedule triggered!");
    generateAndSendDailyReport();
  },
  {
    timezone: "Asia/Kolkata",
  },
);

// Optional: Send test report on startup (comment out in production)
// setTimeout(() => {
//   console.log('\n🧪 Sending test report...');
//   generateAndSendDailyReport();
// }, 5000);

console.log("✅ Auto Daily Report System Running");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
