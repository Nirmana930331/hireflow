#!/bin/bash
# start.sh — run HireFlow backend + frontend in development
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Colours
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ██╗  ██╗██╗██████╗ ███████╗███████╗██╗      ██████╗ ██╗    ██╗"
echo "  ██║  ██║██║██╔══██╗██╔════╝██╔════╝██║     ██╔═══██╗██║    ██║"
echo "  ███████║██║██████╔╝█████╗  █████╗  ██║     ██║   ██║██║ █╗ ██║"
echo "  ██╔══██║██║██╔══██╗██╔══╝  ██╔══╝  ██║     ██║   ██║██║███╗██║"
echo "  ██║  ██║██║██║  ██║███████╗██║     ███████╗╚██████╔╝╚███╔███╔╝"
echo "  ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ "
echo -e "${NC}"

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "Error: python3 not found. Install Python 3.10+."
  exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "Error: node not found. Install Node.js 18+."
  exit 1
fi

# Create .env if missing
if [ ! -f "$ROOT/.env" ]; then
  echo -e "${YELLOW}Creating .env from .env.example...${NC}"
  cp "$ROOT/.env.example" "$ROOT/.env"
fi

# Install Python deps
echo -e "${GREEN}Installing Python dependencies...${NC}"
pip install -q -r "$ROOT/requirements.txt" --break-system-packages 2>/dev/null || \
  pip install -q -r "$ROOT/requirements.txt"

# Seed the database if it doesn't exist
if [ ! -f "$ROOT/hireflow.db" ]; then
  echo -e "${GREEN}Setting up database with demo data...${NC}"
  cd "$ROOT" && python3 seed.py
fi

# Install frontend deps
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo -e "${GREEN}Installing frontend dependencies...${NC}"
  cd "$ROOT/frontend" && npm install --silent
fi

# Start backend
echo -e "${GREEN}Starting backend on http://localhost:5000${NC}"
cd "$ROOT" && python3 run.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo -n "Waiting for backend..."
for i in $(seq 1 20); do
  if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e " ${GREEN}ready${NC}"
    break
  fi
  sleep 0.5
  echo -n "."
done

# Start frontend
echo -e "${GREEN}Starting frontend on http://localhost:5173${NC}"
cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${BLUE}HireFlow ATS is running${NC}"
echo -e "  App:     ${BLUE}http://localhost:5173${NC}"
echo -e "  API:     ${BLUE}http://localhost:5000/api${NC}"
echo ""
echo -e "  Login:   sarah@acme.com / password123"
echo -e "           admin@acme.com / password123"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Press Ctrl+C to stop."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM
wait
