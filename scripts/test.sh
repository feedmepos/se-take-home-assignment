#!/bin/bash
set -e
cd backend && npm ci && npm run typecheck && npm test && npm run test:e2e
