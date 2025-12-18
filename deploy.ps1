# Quick Deploy Script for Smart Sanitation Platform
# This script helps you deploy to production quickly

Write-Host "🚀 Smart Sanitation Platform - Quick Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "📝 Please copy .env.example to .env and fill in your values" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run: Copy-Item .env.example .env" -ForegroundColor Green
    exit 1
}

# Menu
Write-Host "Choose deployment option:" -ForegroundColor Yellow
Write-Host "1. Deploy to Vercel + Railway (Recommended)"
Write-Host "2. Deploy to Render (All-in-One)"
Write-Host "3. Build for production (local)"
Write-Host "4. Run database backup"
Write-Host "5. Test deployment readiness"
Write-Host "6. Exit"
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📦 Deploying to Vercel + Railway..." -ForegroundColor Cyan
        Write-Host ""
        
        # Check if Vercel CLI is installed
        $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
        if (-not $vercelInstalled) {
            Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
            npm install -g vercel
        }
        
        Write-Host "Step 1: Building frontend..." -ForegroundColor Green
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Frontend build successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Step 2: Deploy to Vercel..." -ForegroundColor Green
            Write-Host "Run: vercel --prod" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Step 3: Deploy backend to Railway:" -ForegroundColor Green
            Write-Host "1. Go to https://railway.app" -ForegroundColor Yellow
            Write-Host "2. Create new project from GitHub" -ForegroundColor Yellow
            Write-Host "3. Add PostgreSQL database" -ForegroundColor Yellow
            Write-Host "4. Configure environment variables" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "📖 See DEPLOY.md for detailed instructions" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Build failed! Check errors above." -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "📦 Deploying to Render..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Step 1: Building frontend..." -ForegroundColor Green
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Frontend build successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Step 2: Deploy to Render:" -ForegroundColor Green
            Write-Host "1. Go to https://render.com" -ForegroundColor Yellow
            Write-Host "2. Create new Blueprint" -ForegroundColor Yellow
            Write-Host "3. Connect your GitHub repository" -ForegroundColor Yellow
            Write-Host "4. Render will detect render.yaml automatically" -ForegroundColor Yellow
            Write-Host "5. Configure environment variables" -ForegroundColor Yellow
            Write-Host "6. Click 'Apply'" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "📖 See DEPLOY.md for detailed instructions" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Build failed! Check errors above." -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔨 Building for production..." -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Building frontend..." -ForegroundColor Green
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Frontend build successful!" -ForegroundColor Green
            Write-Host "📁 Output: ./dist" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Frontend build failed!" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Building backend..." -ForegroundColor Green
        Set-Location server
        npm install
        npx prisma generate
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backend build successful!" -ForegroundColor Green
        } else {
            Write-Host "❌ Backend build failed!" -ForegroundColor Red
        }
        
        Set-Location ..
    }
    
    "4" {
        Write-Host ""
        Write-Host "💾 Running database backup..." -ForegroundColor Cyan
        Write-Host ""
        
        Set-Location server
        node backup.js create
        Set-Location ..
        
        Write-Host ""
        Write-Host "To list backups: node server/backup.js list" -ForegroundColor Yellow
        Write-Host "To restore: node server/backup.js restore <filename>" -ForegroundColor Yellow
    }
    
    "5" {
        Write-Host ""
        Write-Host "🔍 Testing deployment readiness..." -ForegroundColor Cyan
        Write-Host ""
        
        $allGood = $true
        
        # Check .env
        Write-Host "Checking .env file..." -ForegroundColor Yellow
        if (Test-Path ".env") {
            Write-Host "✅ .env exists" -ForegroundColor Green
        } else {
            Write-Host "❌ .env missing" -ForegroundColor Red
            $allGood = $false
        }
        
        # Check node_modules
        Write-Host "Checking dependencies..." -ForegroundColor Yellow
        if (Test-Path "node_modules") {
            Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "❌ Run: npm install" -ForegroundColor Red
            $allGood = $false
        }
        
        if (Test-Path "server/node_modules") {
            Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "❌ Run: cd server && npm install" -ForegroundColor Red
            $allGood = $false
        }
        
        # Test build
        Write-Host "Testing build..." -ForegroundColor Yellow
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build successful" -ForegroundColor Green
        } else {
            Write-Host "❌ Build failed" -ForegroundColor Red
            $allGood = $false
        }
        
        # Check Prisma
        Write-Host "Checking Prisma..." -ForegroundColor Yellow
        Set-Location server
        npx prisma validate 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Prisma schema valid" -ForegroundColor Green
        } else {
            Write-Host "❌ Prisma schema invalid" -ForegroundColor Red
            $allGood = $false
        }
        Set-Location ..
        
        Write-Host ""
        if ($allGood) {
            Write-Host "🎉 All checks passed! Ready to deploy!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Some checks failed. Fix issues before deploying." -ForegroundColor Yellow
        }
    }
    
    "6" {
        Write-Host "Goodbye! 👋" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📖 For detailed instructions, see DEPLOY.md" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
