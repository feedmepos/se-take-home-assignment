# Environment Variables Setup Guide

This guide explains how to set up environment variables for both backend and frontend applications.

## Backend (.env)

Create a `.env` file in the `feedme-backend` directory:

```bash
cd feedme-backend
cp .env.example .env
```

Then edit `.env` with the following variables:

```env
# Server Port
PORT=3000

# JWT Secret Key for authentication
# Generate a secure random string for production:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-secret-key-change-in-production

# Database URL (optional - not used since we're using in-memory storage)
# DATABASE_URL=postgresql://user:password@localhost:5432/mcdonalds_orders?schema=public
```

### Generating a Secure JWT Secret

To generate a secure JWT secret, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET` value.

## Frontend (.env.local)

Create a `.env.local` file in the `feedme-frontend` directory:

```bash
cd feedme-frontend
cp .env.example .env.local
```

Then edit `.env.local` with:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**Note:** Next.js uses `.env.local` for local development. The `.env.example` file is provided as a template.

## Quick Setup Script

You can run these commands to set up both environments:

```bash
# Backend
cd feedme-backend
cp .env.example .env
# Edit .env with your values

# Frontend
cd ../feedme-frontend
cp .env.example .env.local
# Edit .env.local with your values
```

## Environment Variables Reference

### Backend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port number | `3000` | No |
| `JWT_SECRET` | Secret key for JWT token signing | `your-secret-key-change-in-production` | No (but should be changed) |
| `DATABASE_URL` | PostgreSQL connection string | - | No (not used) |

### Frontend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3000/api` | No |

## Security Notes

- **Never commit `.env` or `.env.local` files to version control**
- Always use `.env.example` files as templates
- Generate strong, random secrets for production
- Use different secrets for development and production environments

## GitHub Actions

For CI/CD, set environment variables in GitHub Actions secrets or use the workflow's environment configuration. The CLI application doesn't require environment variables as it runs in-memory.

