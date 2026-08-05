# ============================================================
#   TAAL PATHAK CRM - Production Deploy Script (PowerShell)
#   Usage: .\deploy.ps1
# ============================================================

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "    TAAL PATHAK CRM - PRODUCTION DEPLOY                " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Pull latest code
Write-Host "[1/7] Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: git pull failed!" -ForegroundColor Red; exit 1 }
Write-Host "OK: Code updated!" -ForegroundColor Green
Write-Host ""

# Step 2: Install dependencies
Write-Host "[2/7] Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install failed!" -ForegroundColor Red; exit 1 }
Write-Host "OK: Dependencies installed!" -ForegroundColor Green
Write-Host ""

# Step 3: Check/Install PM2
Write-Host "[3/7] Checking PM2..." -ForegroundColor Yellow
$pm2Check = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Check) {
    Write-Host "PM2 not found. Installing globally..." -ForegroundColor Yellow
    npm install -g pm2
    Write-Host "OK: PM2 installed!" -ForegroundColor Green
} else {
    Write-Host "OK: PM2 already installed." -ForegroundColor Green
}
Write-Host ""

# Step 4: Stop old PM2 processes
Write-Host "[4/7] Stopping old PM2 taal processes..." -ForegroundColor Yellow
pm2 delete taal-whatsapp 2>$null
pm2 delete taal-auto-reports 2>$null
Write-Host "OK: Old processes cleared!" -ForegroundColor Green
Write-Host ""

# Step 5: Start PM2 services
Write-Host "[5/7] Starting PM2 services..." -ForegroundColor Yellow
pm2 start ecosystem.config.cjs
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: PM2 start failed!" -ForegroundColor Red; exit 1 }
Write-Host "OK: PM2 services started!" -ForegroundColor Green
Write-Host ""

# Step 6: Save PM2 config
Write-Host "[6/7] Saving PM2 config..." -ForegroundColor Yellow
pm2 save
Write-Host "OK: PM2 config saved!" -ForegroundColor Green
Write-Host ""

# Step 7: Show status
Write-Host "[7/7] Current PM2 Status:" -ForegroundColor Yellow
pm2 list
Write-Host ""

# Wait for WhatsApp to initialize
Write-Host "Waiting 5 seconds for WhatsApp to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Show WhatsApp logs
Write-Host "WhatsApp Server Logs (last 10 lines):" -ForegroundColor Yellow
pm2 logs taal-whatsapp --lines 10 --nostream
Write-Host ""

# Done
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  WhatsApp QR scan ke liye browser mein kholo:" -ForegroundColor Green
Write-Host "  http://localhost:5001/qr" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "   pm2 list                        - Sab processes dekho"
Write-Host "   pm2 logs taal-whatsapp          - WhatsApp live logs"
Write-Host "   pm2 logs taal-auto-reports      - Auto-reports live logs"
Write-Host "   pm2 restart taal-whatsapp       - WhatsApp restart karo"
Write-Host "   pm2 restart taal-auto-reports   - Auto-reports restart karo"
Write-Host "   pm2 monit                       - CPU/Memory monitor"
Write-Host ""

# Open QR page in browser
Write-Host "Opening WhatsApp QR page in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5001/qr"
