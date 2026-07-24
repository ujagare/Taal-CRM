import { useState } from "react";
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

function AppShell({ clerkEnabled, activePage, setActivePage, mobileMenuOpen, setMobileMenuOpen }) {
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
        onNavigate={setActivePage}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="lg:pl-64">
        <Topbar activePage={activePage} onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-5 max-w-[1440px] mx-auto">
          {activePage === "Dashboard" ? (
            <OperationsDashboard onNavigate={setActivePage} />
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
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const shell = (
    <AppShell
      clerkEnabled={clerkEnabled}
      activePage={activePage}
      setActivePage={setActivePage}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
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
