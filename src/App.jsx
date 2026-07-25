import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import LoginPage from "./components/LoginPage";
import PublicRegistration from "./components/PublicRegistration";

// ── Lazy-loaded page components (load only when tab is visited) ──
const Shifting1         = lazy(() => import("./components/Shifting1"));
const DholPan           = lazy(() => import("./components/DholPan"));
const DholMaintenance   = lazy(() => import("./components/DholMaintenance"));
const NewMemberExam     = lazy(() => import("./components/NewMemberExam"));
const DailyReport       = lazy(() => import("./components/DailyReport"));
const OperationsDashboard = lazy(() => import("./components/OperationsDashboard"));
const ExpenseTracker    = lazy(() => import("./components/ExpenseTracker"));
const AttendanceManager = lazy(() => import("./components/AttendanceManager"));
const AdminPanel        = lazy(() => import("./components/AdminPanel"));
const WhatsAppCenter    = lazy(() => import("./components/WhatsAppCenter"));

// Bug fix: "Expences" → "Expenses" (standardized)
const PAGE_TO_HASH = {
  "Dashboard":        "#dashboard",
  "Attendance":       "#attendance",
  "Shifting 1":       "#shifting-1",
  "Dhol Pan":         "#dhol-pan",
  "Dhol Maintenance": "#dhol-maintenance",
  "Daily Report":     "#daily-report",
  "Expenses":         "#expenses",
  "New Member Exam":  "#new-member-exam",
  "WhatsApp":         "#whatsapp",
  "Admin Panel":      "#admin-panel",
};

const HASH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_HASH).map(([page, hash]) => [hash, page])
);

function getPageFromHash() {
  const hash = window.location.hash || "#dashboard";
  // Support legacy "#expenses" hash and old "Expences" key
  return HASH_TO_PAGE[hash] || "Dashboard";
}

// ── Loading spinner shown while lazy component loads ──
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-cream/50 text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/20 via-gold/20 to-brand/20 rounded-xl blur-2xl animate-breathe" />
        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-brand to-brand-300 animate-pulse shadow-lg shadow-brand/30" />
      </div>
    </div>
  );
}

function AppShell({ session, activePage, onNavigate, mobileMenuOpen, setMobileMenuOpen, onLogout }) {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(220,38,38,.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(245,158,11,.06),transparent)]" />
        <div
          className="absolute inset-0 opacity-[.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <Sidebar
        session={session}
        activePage={activePage}
        onNavigate={onNavigate}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={onLogout}
      />
      <div className="lg:pl-64">
        <Topbar activePage={activePage} onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-5 max-w-[1440px] mx-auto">
          <Suspense fallback={<PageLoader />}>
            {activePage === "Dashboard"        ? <OperationsDashboard onNavigate={onNavigate} />
            : activePage === "Attendance"       ? <AttendanceManager />
            : activePage === "Shifting 1"       ? <Shifting1 />
            : activePage === "Dhol Pan"         ? <DholPan />
            : activePage === "Dhol Maintenance" ? <DholMaintenance />
            : activePage === "Daily Report"     ? <DailyReport />
            : activePage === "New Member Exam"  ? <NewMemberExam />
            : activePage === "Expenses"         ? <ExpenseTracker />
            : activePage === "WhatsApp"         ? <WhatsAppCenter />
            : activePage === "Admin Panel"      ? <AdminPanel />
            : (
              // Bug fix: proper 404 fallback instead of random Shifting1
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="text-6xl">🔍</div>
                <h2 className="text-xl font-bold text-cream">Page Not Found</h2>
                <p className="text-cream/50 text-sm">The page you are looking for does not exist.</p>
                <button
                  onClick={() => onNavigate("Dashboard")}
                  className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/80"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePageRaw] = useState(() => getPageFromHash());
  const [mobileMenuOpen, setMobileMenuOpenRaw] = useState(false);

  // ── Supabase Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);

      if (session) {
        const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 120) : "Unknown Device";
        supabase
          .from("auth_activity_logs")
          .insert({
            user_name: session.user?.user_metadata?.full_name || session.user?.email?.split("@")[0] || "User",
            user_email: session.user?.email || null,
            event_type: "login",
            device_info: deviceInfo,
          })
          .then(({ error }) => {
            if (error) console.warn("Login log failed:", error.message);
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Logout handler ──
  const handleLogout = useCallback(async () => {
    try {
      if (session) {
        const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 120) : "Unknown Device";
        await Promise.race([
          supabase.from("auth_activity_logs").insert({
            user_name: session.user?.user_metadata?.full_name || session.user?.email?.split("@")[0] || "User",
            user_email: session.user?.email || null,
            event_type: "logout",
            device_info: deviceInfo,
          }),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]).catch(() => {});
      }
    } catch (_) {
      // swallow
    } finally {
      await supabase.auth.signOut();
      window.location.href = window.location.origin;
    }
  }, [session]);

  // ── Navigation ──
  const changePage = useCallback((newPage) => {
    setActivePageRaw(newPage);
    const hash = PAGE_TO_HASH[newPage] || "#dashboard";
    if (window.location.hash !== hash) {
      window.history.pushState({ page: newPage }, "", hash);
    }
  }, []);

  const handleMobileMenuToggle = useCallback((open) => {
    setMobileMenuOpenRaw(open);
    if (open) {
      window.history.pushState({ menuOpen: true }, "");
    }
  }, []);

  useEffect(() => {
    const initialHash = PAGE_TO_HASH[activePage] || "#dashboard";
    if (!window.history.state) {
      window.history.replaceState({ page: activePage }, "", initialHash);
    }

    const handlePopState = (e) => {
      if (mobileMenuOpen) {
        setMobileMenuOpenRaw(false);
        return;
      }
      const targetPage = e.state?.page || getPageFromHash();
      setActivePageRaw(targetPage);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activePage, mobileMenuOpen]);

  // Check for public registration route
  const currentHash = window.location.hash.toLowerCase();
  const isPublicRegister = currentHash === "#register" || currentHash === "#join" || currentHash === "#new-member-registration";

  if (isPublicRegister) {
    return <PublicRegistration />;
  }

  if (authLoading) return <LoginSkeleton />;

  if (!session) {
    return <LoginPage onLoginSuccess={(s) => setSession(s)} />;
  }

  return (
    <AppShell
      session={session}
      activePage={activePage}
      onNavigate={changePage}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={handleMobileMenuToggle}
      onLogout={handleLogout}
    />
  );
}
