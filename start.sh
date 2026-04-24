#!/bin/bash

# ============================================
# AuditPro AI - Startup Script
# AI-Powered Audit Workpaper Automation
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${PURPLE}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}${BOLD}║       AuditPro AI - Workpaper Automation     ║${NC}"
echo -e "${PURPLE}${BOLD}║       AI-Powered Audit Platform              ║${NC}"
echo -e "${PURPLE}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
  echo -e "${RED}✗ .env file not found! Creating default...${NC}"
  cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=audit_workpaper
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
API_PORT=4001
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
JWT_SECRET=audit-workpaper-secret-key-2024
EOF
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Default .env created${NC}"
fi

API_PORT=${API_PORT:-4001}
CLIENT_PORT=${PORT:-3001}

# ============================================
# Step 1: Clean up used ports
# ============================================
echo ""
echo -e "${CYAN}${BOLD}[1/6] Cleaning up ports...${NC}"

cleanup_port() {
  local port=$1
  local pid=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}  Killing process on port $port (PID: $pid)${NC}"
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

cleanup_port $API_PORT
cleanup_port $CLIENT_PORT
echo -e "${GREEN}  ✓ Ports $API_PORT and $CLIENT_PORT are clean${NC}"

# ============================================
# Step 2: Check PostgreSQL
# ============================================
echo ""
echo -e "${CYAN}${BOLD}[2/6] Checking PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
  echo -e "${RED}  ✗ PostgreSQL not found. Please install PostgreSQL first.${NC}"
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo -e "${RED}  ✗ Could not start PostgreSQL. Please start it manually.${NC}"
    exit 1
  }
  sleep 2
fi
echo -e "${GREEN}  ✓ PostgreSQL is running${NC}"

# ============================================
# Step 3: Setup Database & Seed Data
# ============================================
echo ""
echo -e "${CYAN}${BOLD}[3/6] Setting up database...${NC}"

# Create database if not exists
psql -U ${DB_USER:-postgres} -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME:-audit_workpaper}'" 2>/dev/null | grep -q 1 || {
  psql -U ${DB_USER:-postgres} -c "CREATE DATABASE ${DB_NAME:-audit_workpaper}" 2>/dev/null
  echo -e "${GREEN}  ✓ Database '${DB_NAME:-audit_workpaper}' created${NC}"
}

# Run seed SQL
echo -e "${YELLOW}  Seeding database with audit data...${NC}"
psql -U ${DB_USER:-postgres} -d ${DB_NAME:-audit_workpaper} -f server/seed/init.sql -q 2>/dev/null
echo -e "${GREEN}  ✓ Database seeded successfully${NC}"
echo -e "${GREEN}    - 3 Users (admin, senior auditor, auditor)${NC}"
echo -e "${GREEN}    - 15 Audit Evidence items${NC}"
echo -e "${GREEN}    - 15 Statistical Sampling plans${NC}"
echo -e "${GREEN}    - 15 Workpapers${NC}"
echo -e "${GREEN}    - 15 Audit Findings${NC}"
echo -e "${GREEN}    - 15 Compliance Checklist items${NC}"
echo -e "${GREEN}    - 18 Audit Trail entries${NC}"

# ============================================
# Step 4: Install dependencies
# ============================================
echo ""
echo -e "${CYAN}${BOLD}[4/6] Installing dependencies...${NC}"

cd server
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo -e "${YELLOW}  Installing server dependencies...${NC}"
  npm install --silent 2>/dev/null
fi
echo -e "${GREEN}  ✓ Server dependencies ready${NC}"
cd ..

cd client
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo -e "${YELLOW}  Installing client dependencies...${NC}"
  npm install --silent 2>/dev/null
fi
echo -e "${GREEN}  ✓ Client dependencies ready${NC}"
cd ..

# ============================================
# Step 5: Start Backend with hot-reload
# ============================================
echo ""
echo -e "${CYAN}${BOLD}[5/6] Starting backend server...${NC}"

cd server
npx nodemon index.js &
SERVER_PID=$!
cd ..
sleep 2
echo -e "${GREEN}  ✓ API server running on http://localhost:${API_PORT} (with hot-reload)${NC}"

# ============================================
# Step 6: Start Frontend with hot-reload
# ============================================
echo ""
echo -e "${CYAN}${BOLD}[6/6] Starting frontend...${NC}"

cd client
BROWSER=none PORT=$CLIENT_PORT npm start &
CLIENT_PID=$!
cd ..

echo ""
echo -e "${PURPLE}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}${BOLD}║          AuditPro AI is Starting!            ║${NC}"
echo -e "${PURPLE}${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}${BOLD}║                                              ║${NC}"
echo -e "${PURPLE}${BOLD}║  Frontend:  ${GREEN}http://localhost:${CLIENT_PORT}${PURPLE}            ║${NC}"
echo -e "${PURPLE}${BOLD}║  API:       ${GREEN}http://localhost:${API_PORT}${PURPLE}             ║${NC}"
echo -e "${PURPLE}${BOLD}║                                              ║${NC}"
echo -e "${PURPLE}${BOLD}║  ${YELLOW}Login Credentials:${PURPLE}                         ║${NC}"
echo -e "${PURPLE}${BOLD}║  Email: ${CYAN}admin@auditpro.com${PURPLE}                  ║${NC}"
echo -e "${PURPLE}${BOLD}║  Pass:  ${CYAN}password123${PURPLE}                          ║${NC}"
echo -e "${PURPLE}${BOLD}║                                              ║${NC}"
echo -e "${PURPLE}${BOLD}║  ${YELLOW}Hot-reload enabled for both servers${PURPLE}        ║${NC}"
echo -e "${PURPLE}${BOLD}║  ${NC}Press Ctrl+C to stop all services${PURPLE}           ║${NC}"
echo -e "${PURPLE}${BOLD}║                                              ║${NC}"
echo -e "${PURPLE}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down AuditPro AI...${NC}"
  kill $SERVER_PID 2>/dev/null || true
  kill $CLIENT_PID 2>/dev/null || true
  cleanup_port $API_PORT
  cleanup_port $CLIENT_PORT
  echo -e "${GREEN}✓ All services stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
