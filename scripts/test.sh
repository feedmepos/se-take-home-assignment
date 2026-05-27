#!/bin/bash
set -e
cd backend && npm ci && npm test
