import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import LoginPage from "./components/LoginPage";
import Shifting1 from "./components/Shifting1";
import DholPan from "./components/DholPan";
import DholMaintenance from "./components/DholMaintenance";
import NewMemberExam from "./components/NewMemberExam";
import DailyReport from "./components/DailyReport";
import OperationsDashboard from "./components/OperationsDashboard";
import ExpenseTracker from "./components/ExpenseTracker";
import AttendanceManager from "./components/AttendanceManager";
import AdminPanel from "./components/AdminPanel";
import WhatsAppCenter from "./components/WhatsAppCenter";
import { useAuthLogger } from "./hooks/useAuthLogger";

const PAGE_TO_HASH = {
  "Dashboard": "#dashboard",
  "Attendance": "#attendance",
  "Shifting 1": "#shifting-1",
  "Dhol Pan": "#dhol-pan",
  "Dhol Maintenance": "#dhol-maintenance",
  "Daily Report": "#daily-report",
  "Expences": "#expenses",
  "New Member Exam": "#new-member-exam",
  "WhatsApp": "#whatsapp",
  "Admin Panel": "#admin-panel",
};

const HASH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_HASH).map(([page, hash]) => [hash, page])
);

function getPageFromHash() {
  const hash = window.location.hash || "#dashboard";
  return HASH_TO_PAGE[hash] || "Dashboard";
}

function ClerkGate({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return <LoginSkeleton />;
  if (!isSignedIn) return <LoginPage />;
  return children;
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

/* Auth logger wrapper — only used inside ClerkProvider */
function AuthLoggerWrapper({ children }) {
  useAuthLogger();
  return children;
}

function AppShell({ clerkEnabled, activePage, onNavigate, mobileMenuOpen, setMobileMenuOpen }) {
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
        clerkEnabled={clerkEnabled}
        activePage={activePage}
        onNavigate={onNavigate}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="lg:pl-64">
        <Topbar activePage={activePage} onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-5 max-w-[1440px] mx-auto">
          {activePage === "Dashboard" ? (
            <OperationsDashboard onNavigate={onNavigate} />
          ) : activePage === "Attendance" ? (
            <AttendanceManager />
          ) : activePage === "Shifting 1" ? (
            <Shifting1 />
          ) : activePage === "Dhol Pan" ? (
            <DholPan />
          ) : activePage === "Dhol Maintenance" ? (
            <DholMaintenance />
          ) : activePage === "Daily Report" ? (
            <DailyReport />
          ) : activePage === "New Member Exam" ? (
            <NewMemberExam />
          ) : activePage === "Expences" ? (
            <ExpenseTracker />
          ) : activePage === "WhatsApp" ? (
            <WhatsAppCenter />
          ) : activePage === "Admin Panel" ? (
            <AdminPanel />
          ) : (
            <Shifting1 />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App({ clerkEnabled }) {
  const [activePage, setActivePageRaw] = useState(() => getPageFromHash());
  const [mobileMenuOpen, setMobileMenuOpenRaw] = useState(false);

  // Navigate to page & sync with browser history so mobile back button works like an app!
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

  // Listen to browser / mobile device BACK button press (popstate)
  useEffect(() => {
    const initialHash = PAGE_TO_HASH[activePage] || "#dashboard";
    if (!window.history.state) {
      window.history.replaceState({ page: activePage }, "", initialHash);
    }

    const handlePopState = (e) => {
      // If mobile menu is open, pressing back button closes the menu instead of exiting
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

  const shell = (
    <AppShell
      clerkEnabled={clerkEnabled}
      activePage={activePage}
      onNavigate={changePage}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={handleMobileMenuToggle}
    />
  );

  if (clerkEnabled) {
    return (
      <ClerkGate>
        <AuthLoggerWrapper>{shell}</AuthLoggerWrapper>
      </ClerkGate>
    );
  }
  return shell;
}
