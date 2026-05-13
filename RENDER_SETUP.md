# Render Deployment Setup Guide

## Quick Start

### Step 1: Prepare Your GitHub Repository
Ensure your repository has:
- ✅ `render.yaml` - Render configuration
- ✅ `.github/workflows/deploy.yaml` - GitHub Actions workflow
- ✅ `.renderignore` - Files to exclude from deployment
- ✅ All source code committed to `main` branch

### Step 2: Create Render Service

1. **Sign up/Login to Render**
   - Go to https://render.com
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this code

3. **Configure Service**
   - **Name**: `mcdonalds-order-system`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)

4. **Environment Variables** (Optional)
   - `NODE_ENV`: `production` (already set in render.yaml)
   - `PORT`: `3001` (already set in render.yaml)

5. **Click "Create Web Service"**

### Step 3: Get Deploy Hook

1. Go to your Render service dashboard
2. Scroll down to "Deploy Hook" section
3. Copy the webhook URL (looks like: `https://api.render.com/deploy/srv-...`)

### Step 4: Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. **Name**: `RENDER_DEPLOY_HOOK`
5. **Value**: Paste the Render deploy hook URL
6. Click **"Add secret"**

### Step 5: Test Deployment

1. Make a small change to your code
2. Commit and push to `main` branch
3. Go to GitHub repository → **Actions** tab
4. Watch the workflow run:
   - ✅ Test job runs tests
   - ✅ Deploy job triggers Render deployment
5. Go to Render dashboard and watch the build/deploy logs

## Workflow Overview

### GitHub Actions Workflow (`.github/workflows/deploy.yaml`)

**On Push to Main:**
1. **Test Job** (runs on every push)
   - Checkout code
   - Setup Node.js 20
   - Install dependencies
   - Run tests
   - Build server
   - Build client
   - Verify build artifacts

2. **Deploy Job** (runs only after test succeeds)
   - Checkout code
   - Trigger Render deployment via webhook
   - Render pulls latest code and builds

### Render Build Process

1. **Install Dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Build**
   ```bash
   npm run server:build
   npm run client:build
   ```

3. **Start**
   ```bash
   npm start
   ```

## Application Structure

```
Root Server (Node.js + Express)
├── API Routes (/api/*)
│   ├── /api/orders - Order management
│   ├── /api/bots - Bot management
│   ├── /api/state - System state
│   └── /api/events - SSE real-time updates
├── Static Files (React App)
│   ├── /index.html
│   ├── /assets/*
│   └── /* (SPA fallback)
└── Health Check (/health)
```

## Accessing Your Application

Once deployed:
- **URL**: `https://mcdonalds-order-system.onrender.com`
- **Health Check**: `https://mcdonalds-order-system.onrender.com/health`
- **API**: `https://mcdonalds-order-system.onrender.com/api/*`
- **Frontend**: `https://mcdonalds-order-system.onrender.com/`

## Monitoring

### GitHub Actions
- Repository → **Actions** tab
- View workflow runs and logs
- Check test results before deployment

### Render Dashboard
- Service → **Logs** tab
- View build and runtime logs
- Monitor resource usage
- Check deployment history

### Application Health
```bash
# Check if service is running
curl https://mcdonalds-order-system.onrender.com/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

## Troubleshooting

### Deployment Fails in GitHub Actions
**Problem**: Test job fails
- Check the workflow logs in GitHub Actions
- Common issues:
  - Missing dependencies in `package.json`
  - TypeScript compilation errors
  - Test failures

**Solution**:
1. Fix the issue locally
2. Run `npm test` and `npm run build` to verify
3. Commit and push to trigger workflow again

### Render Build Fails
**Problem**: Build fails on Render
- Check Render logs: Service → Logs
- Common issues:
  - Missing `render.yaml`
  - Incorrect build/start commands
  - Missing environment variables

**Solution**:
1. Verify `render.yaml` exists and is correct
2. Check build command: `npm install && npm run build`
3. Check start command: `npm start`

### Application Won't Start
**Problem**: Service crashes after deployment
- Check Render logs for error messages
- Common issues:
  - Port already in use
  - Missing dependencies
  - Environment variables not set

**Solution**:
1. Check logs: `npm start` should output "Server running on port 3001"
2. Verify all dependencies installed: `npm install`
3. Test locally: `npm run build && npm start`

### SSE Connection Issues
**Problem**: Real-time updates not working
- Check browser console for errors
- Common issues:
  - CORS not configured
  - EventSource connection failing
  - API endpoint not accessible

**Solution**:
1. Verify `/api/events` endpoint is accessible
2. Check CORS headers in server response
3. Check browser network tab for connection status

## Manual Deployment

If automatic deployment doesn't work:

1. **Push to Main**
   ```bash
   git push origin main
   ```

2. **Manual Trigger in Render**
   - Go to Render dashboard
   - Click "Manual Deploy" button
   - Select branch: `main`
   - Click "Deploy"

3. **Or Trigger via Webhook**
   ```bash
   curl -X POST "https://api.render.com/deploy/srv-..."
   ```

## Updating Application

1. **Make changes locally**
   ```bash
   # Test locally
   npm run build
   npm start
   ```

2. **Commit and push**
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

3. **GitHub Actions automatically**
   - Runs tests
   - Builds application
   - Deploys to Render

4. **Monitor deployment**
   - GitHub Actions: Check workflow status
   - Render: Check build/deploy logs
   - Application: Verify at https://mcdonalds-order-system.onrender.com

## Performance Optimization

### For Free Plan
- Cold starts expected (service spins down after 15 min inactivity)
- Limited resources
- Good for development/testing

### For Production
- Upgrade to Starter or higher plan
- Enable auto-scaling
- Use CDN for static assets
- Monitor performance metrics

## Security Best Practices

1. **Never commit secrets**
   - Use GitHub Secrets for sensitive data
   - Use Render environment variables

2. **Keep dependencies updated**
   - Regularly run `npm update`
   - Check for security vulnerabilities: `npm audit`

3. **Monitor logs**
   - Check for errors and warnings
   - Monitor rate limiting

4. **Use HTTPS**
   - Render provides free SSL/TLS
   - All traffic is encrypted

## Support Resources

- **Render Docs**: https://render.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions
- **Express.js**: https://expressjs.com
- **React**: https://react.dev
- **Node.js**: https://nodejs.org

## Next Steps

1. ✅ Create Render service
2. ✅ Get deploy hook
3. ✅ Add GitHub secret
4. ✅ Push to main branch
5. ✅ Monitor deployment
6. ✅ Access application
7. ✅ Set up monitoring/alerts (optional)
