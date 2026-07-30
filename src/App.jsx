import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
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
  "Expences":         "#expenses",
  "Expense Tracker":  "#expenses",
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
        <span className="text-mist text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/16 via-gold/16 to-brand/16 rounded-xl blur-2xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-xl bg-white border border-slate-200 animate-pulse shadow-lg shadow-brand/15" />
      </div>
    </div>
  );
}

function AppShell({ session, activePage, onNavigate, mobileMenuOpen, setMobileMenuOpen, onLogout }) {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-10%,rgba(227,27,35,.10),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_38%_at_88%_96%,rgba(200,135,25,.10),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff7f7_0%,#f8fafc_30%,#f7f8fa_100%)]" />
        <div
          className="absolute inset-0 opacity-[.28]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.18) 1px,transparent 1px)",
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
            : (activePage === "Expenses" || activePage === "Expences" || activePage === "Expense Tracker") ? <ExpenseTracker />
            : activePage === "WhatsApp"         ? <WhatsAppCenter />
            : activePage === "Admin Panel"      ? <AdminPanel />
            : (
              // Bug fix: proper 404 fallback instead of random Shifting1
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="text-6xl">?</div>
                <h2 className="text-xl font-bold text-cream">Page Not Found</h2>
                <p className="text-mist text-sm">The page you are looking for does not exist.</p>
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

  const isDev = import.meta.env.DEV;

  // Fallback dev session when running locally in development mode
  const devSession = useMemo(() => ({
    user: {
      id: "dev-admin",
      email: "dev@ddtech.in",
      user_metadata: { full_name: "Developer (Dev Mode)" },
    },
  }), []);

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

  if (authLoading && !isDev) return <LoginSkeleton />;

  // Effective session: real session if logged in, or fallback dev session if in DEV mode
  const effectiveSession = session || (isDev ? devSession : null);

  // In production mode, require authentic user session. In DEV mode, bypass login screen!
  if (!effectiveSession) {
    return <LoginPage onLoginSuccess={(s) => setSession(s)} />;
  }

  return (
    <AppShell
      session={effectiveSession}
      activePage={activePage}
      onNavigate={changePage}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={handleMobileMenuToggle}
      onLogout={handleLogout}
    />
  );
}
