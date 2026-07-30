import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          onLoginSuccess?.(data.session);
        } else {
          setInfoMsg("खाते तयार झाले! ईमेल पडताळणी किंवा साईन इन करा.");
        }
      } else {
        // Sign In with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onLoginSuccess?.(data.session);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "लॉगिन अयशस्वी. ईमेल किंवा पासवर्ड तपासा.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg("Google Sign-In त्रुटी: " + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        html, body, #root {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          background: #f7f8fa;
        }

        .lp-bg-wrapper {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .lp-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: 0.12;
          filter: saturate(1.05) contrast(1.05);
          transform: scale(1.03);
          animation: lpZoom 20s ease-in-out infinite alternate;
        }

        @keyframes lpZoom {
          0% { transform: scale(1.02); }
          100% { transform: scale(1.08); }
        }

        .lp-bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 247, 247, 0.9) 45%, rgba(248, 250, 252, 0.96));
          backdrop-filter: blur(0.5px);
          -webkit-backdrop-filter: blur(0.5px);
        }

        .lp-ambient-glow-1 {
          position: absolute;
          top: -15%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(220, 38, 38, 0.25) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
          display: none;
        }

        .lp-ambient-glow-2 {
          position: absolute;
          bottom: -10%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
          display: none;
        }

        .lp-shell {
          position: fixed;
          inset: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          overflow-y: auto;
        }

        .lp-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          margin: auto;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(15, 23, 42, 0.1);
          border-radius: 24px;
          padding: 36px 32px;
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14),
                      inset 0 1px 0 rgba(255, 255, 255, 0.9),
                      0 0 0 1px rgba(227, 27, 35, 0.04);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-sizing: border-box !important;
          animation: lpCardRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes lpCardRise {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .lp-card-top-glow {
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.9), rgba(245, 158, 11, 0.8), transparent);
          border-radius: 2px;
        }

        .lp-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 24px;
        }

        .lp-logo-box {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffffff, #fff1f2);
          border: 1.5px solid rgba(227, 27, 35, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 16px 34px rgba(227, 27, 35, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .lp-logo-box img {
          width: 48px;
          height: 48px;
          object-fit: contain;
        }

        .lp-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #111827;
          margin: 0;
        }

        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: rgba(227, 27, 35, 0.08);
          border: 1px solid rgba(227, 27, 35, 0.18);
          color: #b91c1c;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .lp-subtitle {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
          margin-top: 10px;
          margin-bottom: 10px;
        }

        .lp-input-group {
          margin-bottom: 14px;
          text-align: left;
        }

        .lp-label {
          display: block;
          color: #334155;
          font-size: 12.5px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .lp-input {
          display: block;
          width: 100%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #111827;
          font-size: 14px;
          height: 44px;
          padding: 0 14px;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .lp-input:focus {
          border-color: rgba(220, 38, 38, 0.75);
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.22);
          background: #ffffff;
        }

        .lp-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: 12px;
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 700;
          height: 46px;
          margin-top: 18px;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.45);
          transition: all 0.2s ease;
        }

        .lp-btn-primary:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
          box-shadow: 0 10px 30px rgba(220, 38, 38, 0.6);
          transform: translateY(-1px);
        }

        .lp-btn-google {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #334155;
          height: 44px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 16px;
        }

        .lp-btn-google:hover {
          background: #f8fafc;
          border-color: rgba(227, 27, 35, 0.22);
        }

        .lp-divider {
          display: flex;
          align-items: center;
          margin: 16px 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .lp-divider::before, .lp-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .lp-divider span {
          padding: 0 10px;
        }

        .lp-alert {
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.22);
          border-radius: 10px;
          padding: 10px 14px;
          color: #b91c1c;
          font-size: 12.5px;
          margin-bottom: 14px;
          text-align: left;
        }

        .lp-info {
          background: rgba(5, 150, 105, 0.08);
          border: 1px solid rgba(5, 150, 105, 0.22);
          border-radius: 10px;
          padding: 10px 14px;
          color: #047857;
          font-size: 12.5px;
          margin-bottom: 14px;
          text-align: left;
        }

        .lp-toggle-text {
          margin-top: 18px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
        }

        .lp-toggle-btn {
          color: #b91c1c;
          font-weight: 700;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          margin-left: 4px;
        }
        .lp-toggle-btn:hover {
          text-decoration: underline;
        }

        .lp-footer-text {
          margin-top: 20px;
          text-align: center;
          font-size: 11.5px;
          color: #64748b;
        }
      `}</style>

      {/* ── Background Layer with taal.png & Black Overlay ── */}
      <div className="lp-bg-wrapper">
        <img src="/taal.png" alt="TAAL Pathak Background" className="lp-bg-img" />
        <div className="lp-bg-overlay" />
        <div className="lp-ambient-glow-1" />
        <div className="lp-ambient-glow-2" />
      </div>

      {/* ── Glassmorphism Login Form Shell ── */}
      <div className="lp-shell">
        <div className="lp-card">
          <div className="lp-card-top-glow" />

          {/* Header & Logo */}
          <div className="lp-header">
            <div className="lp-logo-box">
              <img src="/taal-pathak-logo-red.png" alt="TAAL Pathak Logo" />
            </div>
            <h1 className="lp-title">ताल वाद्यपथक</h1>
            <div className="lp-badge">
              <span>★ Operations CRM ★</span>
            </div>
            <p className="lp-subtitle">
              {isSignUp ? "नवीन खाते तयार करा (Sign Up)" : "CRM मध्ये प्रवेश करण्यासाठी लॉगिन करा"}
            </p>
          </div>

          {/* Error & Info Alerts */}
          {errorMsg && <div className="lp-alert">⚠️ {errorMsg}</div>}
          {infoMsg && <div className="lp-info">✅ {infoMsg}</div>}

          {/* Google OAuth Login Button */}
          <button type="button" onClick={handleGoogleLogin} className="lp-btn-google">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            Google द्वारे लॉगिन करा
          </button>

          <div className="lp-divider">
            <span>किंवा ईमेलने लॉगिन करा</span>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="lp-input-group">
                <label className="lp-label">पूर्ण नाव (Full Name)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. राहुल शिंदे"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="lp-input"
                />
              </div>
            )}

            <div className="lp-input-group">
              <label className="lp-label">ईमेल (Email Address)</label>
              <input
                type="email"
                required
                placeholder="उदा. user@taalpathak.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lp-input"
              />
            </div>

            <div className="lp-input-group">
              <label className="lp-label">पासवर्ड (Password)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lp-input"
              />
            </div>

            <button type="submit" disabled={loading} className="lp-btn-primary">
              {loading
                ? "कृपया थांबा..."
                : isSignUp
                ? "खाते तयार करा (Sign Up)"
                : "लॉगिन करा (Sign In)"}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="lp-toggle-text">
            {isSignUp ? "तुमचे आधीच खाते आहे का?" : "नवीन सदस्य आहात का?"}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
                setInfoMsg("");
              }}
              className="lp-toggle-btn"
            >
              {isSignUp ? "येथे साईन इन करा" : "नवीन खाते तयार करा"}
            </button>
          </div>

          <div className="lp-footer-text">
            🔒 Secure Supabase Authentication · TAAL Pathak Pune
          </div>
        </div>
      </div>
    </>
  );
}
