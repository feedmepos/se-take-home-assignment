# McDonald's Order Management System - Complete Deployment Guide

## 🚀 Quick Deployment Summary

This application is fully configured for production deployment on Render with automated CI/CD via GitHub Actions.

### What's Included
- ✅ Node.js server serving React frontend
- ✅ Automated GitHub Actions workflows
- ✅ Render deployment configuration
- ✅ Real-time updates via SSE
- ✅ Rate limiting and logging
- ✅ Comprehensive testing

## 📋 Files Added/Modified for Deployment

### New Files
1. **`.github/workflows/deploy.yaml`** - Main deployment workflow
2. **`render.yaml`** - Render service configuration
3. **`.renderignore`** - Files to exclude from Render
4. **`DEPLOYMENT.md`** - Detailed deployment guide
5. **`RENDER_SETUP.md`** - Step-by-step Render setup

### Modified Files
1. **`server/index.ts`** - Added static file serving for React
2. **`package.json`** - Updated main entry point and added Node version requirements

## 🔧 How It Works

### Architecture
```
GitHub Repository
    ↓
GitHub Actions (on push to main)
    ├─ Run Tests
    ├─ Build Server (TypeScript → JavaScript)
    ├─ Build Client (React → Static Files)
    └─ Trigger Render Deployment
        ↓
    Render Service
        ├─ Pull Latest Code
        ├─ Run Build Command
        ├─ Start Node.js Server
        └─ Serve on https://your-service.onrender.com
```

### Server Architecture
```
Node.js Express Server
├─ API Routes (/api/*)
│  ├─ /api/orders - Order management
│  ├─ /api/bots - Bot management
│  ├─ /api/state - System state
│  └─ /api/events - SSE real-time updates
├─ Static Files (React App)
│  ├─ /index.html
│  ├─ /assets/*
│  └─ /* (SPA fallback to index.html)
└─ Health Check (/health)
```

## 🚀 Deployment Steps

### 1. Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Create Render Service
1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Select this repository
5. Configure:
   - **Name**: `mcdonalds-order-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)
6. Click "Create Web Service"

### 3. Get Deploy Hook
1. In Render dashboard, go to your service
2. Scroll to "Deploy Hook" section
3. Copy the webhook URL

### 4. Add GitHub Secret
1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. **Name**: `RENDER_DEPLOY_HOOK`
5. **Value**: Paste the Render webhook URL
6. Click "Add secret"

### 5. Trigger Deployment
```bash
# Make a change and push
echo "# Deployment ready" >> README.md
git add README.md
git commit -m "Trigger deployment"
git push origin main
```

### 6. Monitor Deployment
- **GitHub Actions**: Repository → Actions tab
- **Render**: Service → Logs tab
- **Application**: https://your-service.onrender.com

## 📊 GitHub Actions Workflows

### 1. Deploy Workflow (`.github/workflows/deploy.yaml`)
**Triggers**: Push to main branch

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Build server
6. Build client
7. Verify build artifacts
8. Trigger Render deployment

### 2. Backend Verification Workflow (`.github/workflows/backend-verify-result.yaml`)
**Triggers**: Pull requests to main

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Build server and client
6. Verify build artifacts
7. Verify result.txt format

## 🔍 Monitoring & Troubleshooting

### Check Application Status
```bash
# Health check
curl https://your-service.onrender.com/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### View Logs
- **GitHub Actions**: Repository → Actions → Workflow run
- **Render**: Service → Logs
- **Local**: `npm start` (development)

### Common Issues

**Issue**: Deployment fails in GitHub Actions
- Check workflow logs for errors
- Verify all dependencies in package.json
- Run `npm test` locally to verify

**Issue**: Render build fails
- Check Render logs
- Verify render.yaml exists
- Ensure build command is correct

**Issue**: Application won't start
- Check Render logs for errors
- Verify PORT environment variable
- Test locally: `npm run build && npm start`

**Issue**: SSE not working
- Check browser console for errors
- Verify /api/events endpoint accessible
- Check CORS configuration

## 📦 Build & Deployment Process

### Local Development
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test
```

### GitHub Actions Build
```bash
# Install
npm ci
cd client && npm ci && cd ..

# Test
npm test

# Build
npm run server:build
npm run client:build

# Verify
ls -la dist/server/index.js
ls -la client/dist/index.html
```

### Render Build
```bash
# Render runs this build command
npm install && npm run build

# Then starts with
npm start
```

## 🌐 Accessing Your Application

Once deployed:
- **Frontend**: https://your-service.onrender.com
- **API**: https://your-service.onrender.com/api/orders
- **Health**: https://your-service.onrender.com/health
- **Real-time**: https://your-service.onrender.com/api/events (SSE)

## 🔐 Security

- ✅ Environment variables via GitHub Secrets
- ✅ HTTPS/SSL provided by Render
- ✅ Rate limiting on API endpoints
- ✅ CORS configured
- ✅ No secrets in code

## 📈 Performance

### Free Plan
- Cold starts after 15 min inactivity
- Limited resources
- Good for development/testing

### Starter Plan+
- Always running
- Better performance
- Auto-scaling available

## 🛠️ Maintenance

### Update Dependencies
```bash
npm update
cd client && npm update && cd ..
git add package*.json
git commit -m "Update dependencies"
git push origin main
```

### Check for Vulnerabilities
```bash
npm audit
npm audit fix
```

### Monitor Logs
- GitHub Actions: Check workflow runs
- Render: Monitor service logs
- Application: Check /health endpoint

## 📚 Documentation

- **`DEPLOYMENT.md`** - Detailed deployment guide
- **`RENDER_SETUP.md`** - Step-by-step Render setup
- **`SCRIPTS_GUIDE.md`** - Build scripts documentation
- **`README.md`** - Project overview

## 🎯 Next Steps

1. ✅ Review this guide
2. ✅ Create Render service
3. ✅ Get deploy hook
4. ✅ Add GitHub secret
5. ✅ Push to main
6. ✅ Monitor deployment
7. ✅ Access application
8. ✅ Set up monitoring (optional)

## 📞 Support

- **Render**: https://render.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions
- **Express**: https://expressjs.com
- **React**: https://react.dev

## ✨ Features

- 🍔 McDonald's Order Management System
- 🤖 Automated Cooking Bots
- 📊 Real-time Order Status
- 🔄 Server-Sent Events (SSE)
- 🛡️ Rate Limiting
- 📝 Comprehensive Logging
- ✅ Full Test Coverage
- 🚀 Production Ready

---

**Ready to deploy?** Follow the deployment steps above or see `RENDER_SETUP.md` for detailed instructions.
