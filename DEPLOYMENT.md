# Deployment Guide - McDonald's Order Management System

## Overview
This application is configured for production deployment on Render with automated CI/CD via GitHub Actions.

## Architecture
- **Frontend**: React 18 + TypeScript + Tailwind CSS (built to `client/dist`)
- **Backend**: Node.js + Express (compiled to `dist/server`)
- **Deployment**: Single Node.js server serves both API and static React files
- **Real-time Updates**: Server-Sent Events (SSE) for live order/bot status

## Prerequisites
- GitHub repository with this code
- Render account (https://render.com)
- Node.js 20+ and npm 9+

## Deployment Steps

### 1. Create Render Service
1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `mcdonalds-order-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

### 2. Get Deploy Hook
1. In your Render service settings, scroll to "Deploy Hook"
2. Copy the webhook URL

### 3. Configure GitHub Secret
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `RENDER_DEPLOY_HOOK`
5. Value: Paste the Render deploy hook URL
6. Click "Add secret"

### 4. Automatic Deployment
Once configured, the GitHub Actions workflow will:
- Run on every push to `main` branch
- Execute tests
- Build server and client
- Verify build artifacts
- Trigger Render deployment automatically

## Manual Deployment
If you need to deploy manually:
1. Push to `main` branch
2. GitHub Actions will automatically trigger
3. Or manually trigger deployment from Render dashboard

## Environment Variables
The following environment variables are set in `render.yaml`:
- `NODE_ENV`: `production`
- `PORT`: `3001`

Add additional environment variables in Render dashboard if needed.

## Monitoring
- Check GitHub Actions: Repository → Actions tab
- Check Render logs: Service → Logs tab
- Health check endpoint: `https://your-service.onrender.com/health`

## File Structure for Deployment
```
.
├── dist/server/          # Compiled server code
├── client/dist/          # Built React app (served as static files)
├── server/               # TypeScript server source
├── client/               # React source
├── package.json          # Root dependencies
├── render.yaml           # Render configuration
├── .renderignore         # Files to exclude from Render
└── .github/workflows/    # GitHub Actions workflows
```

## How It Works
1. **Build Phase** (GitHub Actions):
   - Install root dependencies
   - Install client dependencies
   - Run tests
   - Compile TypeScript server to `dist/server`
   - Build React app to `client/dist`

2. **Deploy Phase** (Render):
   - Render pulls the repository
   - Runs build command: `npm install && npm run build`
   - Starts server with: `npm start`

3. **Runtime** (Node.js Server):
   - Serves API routes at `/api/*`
   - Serves React static files from `client/dist`
   - Falls back to `index.html` for SPA routing
   - Handles SSE connections for real-time updates

## Troubleshooting

### Build Fails
- Check GitHub Actions logs for errors
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation: `npm run server:build`

### Deployment Fails
- Check Render logs for errors
- Verify `render.yaml` configuration
- Ensure `RENDER_DEPLOY_HOOK` secret is set correctly

### Application Not Loading
- Check health endpoint: `https://your-service.onrender.com/health`
- Verify React app built correctly: `npm run client:build`
- Check browser console for API errors

### SSE Connection Issues
- Ensure `/api/events` endpoint is accessible
- Check CORS configuration in `server/index.ts`
- Verify EventSource connection in `client/src/hooks/useSSE.ts`

## Performance Tips
- Use Render's paid plans for better performance
- Enable auto-scaling if available
- Monitor response times in Render dashboard
- Consider caching strategies for static assets

## Security
- Never commit `.env` files
- Use GitHub Secrets for sensitive data
- Keep dependencies updated
- Monitor Render security advisories

## Local Development
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Development mode (both server and client)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test
```

## Support
For issues with:
- **Render**: https://render.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions
- **Express**: https://expressjs.com
- **React**: https://react.dev
