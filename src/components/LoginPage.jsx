import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
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
          background: #000000;
        }

        /* ── Fullscreen Background Container ── */
        .lp-bg-wrapper {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        /* Background Image */
        .lp-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transform: scale(1.03);
          animation: lpZoom 20s ease-in-out infinite alternate;
        }

        @keyframes lpZoom {
          0% { transform: scale(1.02); }
          100% { transform: scale(1.08); }
        }

        /* Black Overlay (Lighter & Subtle so taal.png is clearly visible) */
        .lp-bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.55)),
                      radial-gradient(circle at center, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.6) 100%);
          backdrop-filter: blur(1px);
          -webkit-backdrop-filter: blur(1px);
        }

        /* Red Ambient Spotlights */
        .lp-ambient-glow-1 {
          position: absolute;
          top: -15%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(220, 38, 38, 0.22) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
        }

        .lp-ambient-glow-2 {
          position: absolute;
          bottom: -10%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
        }

        /* Main Center Shell */
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

        /* Glassmorphism Card Container */
        .lp-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          margin: auto;
          background: rgba(8, 8, 12, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 28px;
          padding: 36px 32px;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.95),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2),
                      0 0 40px rgba(220, 38, 38, 0.2);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
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

        /* Top Glowing Line */
        .lp-card-top-glow {
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.9), rgba(245, 158, 11, 0.8), transparent);
          border-radius: 2px;
        }

        /* Header & Logo */
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
          background: linear-gradient(135deg, rgba(35, 8, 8, 0.9), rgba(15, 4, 4, 0.95));
          border: 1.5px solid rgba(220, 38, 38, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
          color: #FFFFFF;
          margin: 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #f87171;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .lp-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
          margin-top: 10px;
          margin-bottom: 20px;
        }

        /* ── CLERK STYLING OVERRIDES (CLEAN & NON-CLIPPED) ── */
        .cl-rootBox, .cl-card, .cl-cardBox, .cl-main, .cl-form, .cl-socialButtons {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .cl-card, .cl-cardBox {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          overflow: visible !important;
        }

        .cl-header, .cl-headerTitle, .cl-headerSubtitle {
          display: none !important;
        }

        .cl-socialButtons {
          width: 100% !important;
          margin-top: 4px !important;
          margin-bottom: 20px !important;
        }

        /* Completely hide "Last used" badges & tags from Clerk */
        .cl-badge,
        .cl-socialButtonsBlockButtonBadge,
        .cl-socialButtonsBlockButtonBadgeText,
        .cl-socialButtonsBlockButton__googleBadge,
        .cl-tag,
        [class*="Badge"],
        [class*="badge"],
        [class*="Tag"],
        [class*="tag"],
        [class*="socialButtonsBlockButtonBadge"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          position: absolute !important;
          top: -9999px !important;
          left: -9999px !important;
          pointer-events: none !important;
        }

        /* Social Button (Google) */
        .cl-socialButtonsBlockButton {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          border-radius: 14px !important;
          color: #F3F4F6 !important;
          height: 48px !important;
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 16px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          cursor: pointer !important;
        }
        .cl-socialButtonsBlockButton:hover {
          background: rgba(255, 255, 255, 0.14) !important;
          border-color: rgba(255, 255, 255, 0.28) !important;
          transform: translateY(-1px) !important;
        }
        .cl-socialButtonsBlockButtonText {
          color: #F3F4F6 !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .cl-socialButtonsBlockButtonIcon {
          margin-right: 10px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Divider */
        .cl-dividerRow {
          margin: 20px 0 !important;
          display: flex !important;
          align-items: center !important;
        }
        .cl-dividerLine {
          background: rgba(255, 255, 255, 0.14) !important;
          height: 1px !important;
        }
        .cl-dividerText {
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          padding: 0 12px !important;
        }

        /* Form Labels */
        .cl-formFieldLabel {
          display: block !important;
          color: rgba(255, 255, 255, 0.88) !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          margin-bottom: 6px !important;
        }

        /* Input Fields */
        .cl-formFieldInput {
          display: block !important;
          width: 100% !important;
          background: rgba(0, 0, 0, 0.5) !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          border-radius: 12px !important;
          color: #FFFFFF !important;
          font-size: 14px !important;
          height: 46px !important;
          padding: 0 16px !important;
          outline: none !important;
          transition: all 0.2s ease !important;
          box-sizing: border-box !important;
        }
        .cl-formFieldInput::placeholder {
          color: rgba(255, 255, 255, 0.35) !important;
        }
        .cl-formFieldInput:focus {
          border-color: rgba(220, 38, 38, 0.75) !important;
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.22) !important;
          background: rgba(0, 0, 0, 0.65) !important;
        }

        /* Password Toggle */
        .cl-formFieldInputShowPasswordButton {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        /* Primary Submit Button */
        .cl-formButtonPrimary {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
          border: 1px solid rgba(248, 113, 113, 0.3) !important;
          border-radius: 12px !important;
          color: #FFFFFF !important;
          font-size: 15px !important;
          font-weight: 700 !important;
          height: 48px !important;
          margin-top: 16px !important;
          cursor: pointer !important;
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.45) !important;
          transition: all 0.2s ease !important;
          letter-spacing: 0.02em !important;
          box-sizing: border-box !important;
        }
        .cl-formButtonPrimary:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%) !important;
          box-shadow: 0 10px 30px rgba(220, 38, 38, 0.6) !important;
          transform: translateY(-1px) !important;
        }

        /* Footer Action Links */
        .cl-footer {
          margin-top: 14px !important;
        }
        .cl-footerActionText {
          color: rgba(255, 255, 255, 0.6) !important;
          font-size: 13px !important;
        }
        .cl-footerActionLink {
          color: #f87171 !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          text-decoration: none !important;
        }
        .cl-footerActionLink:hover {
          color: #fca5a5 !important;
          text-decoration: underline !important;
        }

        /* Alerts & Errors */
        .cl-formFieldErrorText {
          color: #fca5a5 !important;
          font-size: 12px !important;
          margin-top: 4px !important;
        }
        .cl-alert {
          background: rgba(220, 38, 38, 0.15) !important;
          border: 1px solid rgba(220, 38, 38, 0.3) !important;
          border-radius: 10px !important;
        }
        .cl-alertText {
          color: #fca5a5 !important;
          font-size: 13px !important;
        }

        /* Footer Note */
        .lp-footer-text {
          margin-top: 24px;
          text-align: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 0.03em;
        }

        /* Further Compacted Mobile View */
        @media (max-width: 640px) {
          .lp-shell {
            padding: 8px !important;
          }
          .lp-card {
            padding: 16px 14px !important;
            border-radius: 18px !important;
          }
          .lp-header {
            margin-bottom: 10px !important;
          }
          .lp-logo-box {
            width: 44px !important;
            height: 44px !important;
            border-radius: 12px !important;
            margin-bottom: 6px !important;
          }
          .lp-logo-box img {
            width: 28px !important;
            height: 28px !important;
          }
          .lp-title {
            font-size: 18px !important;
          }
          .lp-badge {
            margin-top: 2px !important;
            padding: 1px 6px !important;
            font-size: 9.5px !important;
          }
          .lp-subtitle {
            display: none !important;
          }
          .cl-socialButtons {
            margin-top: 0 !important;
            margin-bottom: 8px !important;
          }
          .cl-socialButtonsBlockButton {
            height: 38px !important;
            border-radius: 9px !important;
            font-size: 13px !important;
          }
          .cl-dividerRow {
            margin: 8px 0 !important;
          }
          .cl-formFieldLabel {
            font-size: 11.5px !important;
            margin-bottom: 3px !important;
          }
          .cl-formFieldInput {
            height: 38px !important;
            border-radius: 9px !important;
            font-size: 13px !important;
            padding: 0 12px !important;
          }
          .cl-formButtonPrimary {
            height: 38px !important;
            border-radius: 9px !important;
            font-size: 13.5px !important;
            margin-top: 8px !important;
          }
          .cl-footer {
            margin-top: 6px !important;
          }
          .lp-footer-text {
            margin-top: 8px !important;
            font-size: 10px !important;
          }
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
            <p className="lp-subtitle">Sign in to access your CRM control center</p>
          </div>

          {/* Clerk Auth Component */}
          <SignIn
            routing="hash"
            appearance={{
              variables: {
                colorPrimary: "#dc2626",
                colorBackground: "transparent",
                colorText: "#FFFFFF",
                colorTextSecondary: "rgba(255,255,255,0.7)",
                colorInputBackground: "rgba(0,0,0,0.5)",
                colorInputText: "#FFFFFF",
                colorNeutral: "#FFFFFF",
                borderRadius: "14px",
                fontFamily: "Outfit, system-ui, sans-serif",
                fontSize: "14px",
              },
              elements: {
                rootBox: { width: "100%" },
                card: { background: "transparent", boxShadow: "none", border: "none", padding: 0, width: "100%" },
                header: { display: "none" },
                headerTitle: { display: "none" },
                headerSubtitle: { display: "none" },
                socialButtonsBlockButtonBadge: { display: "none !important" },
                socialButtonsBlockButtonBadgeText: { display: "none !important" },
                badge: { display: "none !important" },
              },
            }}
          />

          <div className="lp-footer-text">
            🔒 Secure System · TAAL Pathak Pune
          </div>
        </div>
      </div>
    </>
  );
}
