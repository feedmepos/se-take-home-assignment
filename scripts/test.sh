#!/bin/bash
set -e
cd backend && npm ci && npm test && npm run test:e2e
