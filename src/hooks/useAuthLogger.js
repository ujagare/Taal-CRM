import { useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

/**
 * useAuthLogger
 * - Auto-logs "login" to Supabase when Clerk user signs in
 * - Provides handleLogout() that logs "logout" then signs out
 * - MUST be used inside ClerkProvider
 */
export function useAuthLogger() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const hasLoggedLogin = useRef(false);

  // Detect login — log it once per session
  useEffect(() => {
    if (isSignedIn && user && !hasLoggedLogin.current) {
      hasLoggedLogin.current = true;
      const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 120) : "Unknown Device";
      
      supabase
        .from("auth_activity_logs")
        .insert({
          user_name: user.fullName || user.firstName || user.username || "User",
          user_email: user.primaryEmailAddress?.emailAddress || null,
          event_type: "login",
          device_info: deviceInfo,
        })
        .then(({ error }) => {
          if (error) console.warn("Login log failed:", error.message);
        })
        .catch((err) => console.warn("Login log exception:", err));
    }
    if (!isSignedIn) {
      hasLoggedLogin.current = false;
    }
  }, [isSignedIn, user]);

  // Fail-safe Logout handler — logs event then ALWAYS signs out
  const handleLogout = async () => {
    try {
      if (user) {
        const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 120) : "Unknown Device";
        // Fire and forget log entry or wait up to 800ms
        await Promise.race([
          supabase.from("auth_activity_logs").insert({
            user_name: user.fullName || user.firstName || user.username || "User",
            user_email: user.primaryEmailAddress?.emailAddress || null,
            event_type: "logout",
            device_info: deviceInfo,
          }),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]).catch((err) => console.warn("Logout log warning:", err));
      }
    } catch (err) {
      console.warn("Pre-logout logging exception:", err);
    } finally {
      try {
        await signOut();
      } catch (err) {
        console.error("Clerk signOut exception:", err);
      }
      // Force clean redirect to login page
      window.location.href = window.location.origin;
    }
  };

  return { handleLogout };
}

