@echo off
REM ============================================================
REM   TAAL PATHAK CRM — Production Deploy Script (Windows)
REM   Usage: Double-click deploy.bat OR run in CMD
REM ============================================================

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║    TAAL PATHAK CRM — PRODUCTION DEPLOY (Windows)    ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM ── Step 1: Pull latest code ─────────────────────────────
echo [1/7] Pulling latest code from GitHub...
git pull origin main
if %ERRORLEVEL% neq 0 ( echo ERROR: git pull failed! & pause & exit /b 1 )
echo [OK] Code updated!
echo.

REM ── Step 2: Install dependencies ────────────────────────
echo [2/7] Installing npm dependencies...
npm install
if %ERRORLEVEL% neq 0 ( echo ERROR: npm install failed! & pause & exit /b 1 )
echo [OK] Dependencies installed!
echo.

REM ── Step 3: Install PM2 (if not present) ────────────────
echo [3/7] Checking PM2...
pm2 --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo PM2 not found. Installing...
  npm install -g pm2
  echo [OK] PM2 installed!
) else (
  echo [OK] PM2 already installed.
)
echo.

REM ── Step 4: Stop old PM2 processes ──────────────────────
echo [4/7] Stopping old PM2 taal processes...
pm2 delete taal-whatsapp >nul 2>&1
pm2 delete taal-auto-reports >nul 2>&1
echo [OK] Old processes cleared!
echo.

REM ── Step 5: Start PM2 services ──────────────────────────
echo [5/7] Starting PM2 services...
pm2 start ecosystem.config.cjs
if %ERRORLEVEL% neq 0 ( echo ERROR: PM2 start failed! & pause & exit /b 1 )
echo [OK] PM2 services started!
echo.

REM ── Step 6: Save PM2 config ─────────────────────────────
echo [6/7] Saving PM2 config...
pm2 save
echo [OK] PM2 config saved!
echo.

REM ── Step 7: Show Status ──────────────────────────────────
echo [7/7] Current PM2 Status:
pm2 list
echo.

REM ── Wait for WhatsApp to connect ─────────────────────────
echo Waiting 5 seconds for WhatsApp to initialize...
timeout /t 5 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   DEPLOY COMPLETE!                                   ║
echo ╠══════════════════════════════════════════════════════╣
echo ║  WhatsApp QR scan ke liye browser mein kholo:       ║
echo ║  http://localhost:5001/qr                           ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Useful Commands:
echo   pm2 list                      - Sab processes dekho
echo   pm2 logs taal-whatsapp        - WhatsApp live logs
echo   pm2 logs taal-auto-reports    - Auto-reports live logs
echo   pm2 restart taal-whatsapp     - WhatsApp restart karo
echo   pm2 monit                     - CPU/Memory monitor
echo.

REM Open QR page in browser automatically
echo Opening WhatsApp QR page in browser...
start http://localhost:5001/qr

pause
