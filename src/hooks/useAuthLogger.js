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
      const deviceInfo = navigator.userAgent.substring(0, 120);
      supabase
        .from("auth_activity_logs")
        .insert({
          user_name: user.fullName || user.firstName || "Unknown",
          user_email: user.primaryEmailAddress?.emailAddress || null,
          event_type: "login",
          device_info: deviceInfo,
        })
        .then(({ error }) => {
          if (error) console.warn("Login log failed:", error.message);
        });
    }
    if (!isSignedIn) {
      hasLoggedLogin.current = false;
    }
  }, [isSignedIn, user]);

  // Logout handler — log then sign out
  const handleLogout = async () => {
    if (user) {
      const deviceInfo = navigator.userAgent.substring(0, 120);
      await supabase.from("auth_activity_logs").insert({
        user_name: user.fullName || user.firstName || "Unknown",
        user_email: user.primaryEmailAddress?.emailAddress || null,
        event_type: "logout",
        device_info: deviceInfo,
      });
    }
    await signOut({ redirectUrl: window.location.origin });
  };

  return { handleLogout };
}
