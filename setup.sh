#!/bin/bash
# Lumina Prompt Engine - Environment Setup Script (Bash)
# Run from project root: ./setup.sh

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=== Lumina Prompt Engine - Environment Setup ==="
echo ""

# Check prerequisites
echo "[0/5] Checking prerequisites..."
if ! command -v python3 &> /dev/null; then
    echo "  ERROR: Python 3 not found. Please install Python 3.10+ from https://www.python.org/"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "  Python: $PYTHON_VERSION"

if ! command -v node &> /dev/null; then
    echo "  ERROR: Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    echo "  ERROR: npm not found. Please install npm"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "  npm: $NPM_VERSION"
echo ""

# 1. Python virtual environment
echo "[1/5] Creating Python virtual environment..."
if [ ! -d "$PROJECT_ROOT/.venv" ]; then
    python3 -m venv "$PROJECT_ROOT/.venv"
    echo "  Created .venv"
else
    echo "  .venv already exists"
fi

# 2. Upgrade pip
echo ""
echo "[2/5] Upgrading pip..."
"$PROJECT_ROOT/.venv/bin/pip" install --upgrade pip -q
echo "  pip upgraded"

# 3. Install backend deps
echo ""
echo "[3/5] Installing backend dependencies..."
"$PROJECT_ROOT/.venv/bin/pip" install -r "$PROJECT_ROOT/backend/requirements.txt" -q
"$PROJECT_ROOT/.venv/bin/pip" install -e ".[dev]" -q
echo "  Backend packages installed"

# 4. Ensure .env exists
echo ""
echo "[4/5] Checking .env..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    if [ -f "$PROJECT_ROOT/backend/.env.example" ]; then
        cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/.env"
        echo "  Created .env from backend/.env.example"
        echo "  ⚠️  IMPORTANT: Edit .env and add your API keys!"
    else
        echo "  No .env found. Create .env with your API keys"
    fi
else
    echo "  .env exists"
fi

# 5. Frontend dependencies
echo ""
echo "[5/5] Installing frontend dependencies..."
(cd "$PROJECT_ROOT/frontend" && npm install)
echo "  Frontend packages installed"

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your API keys (see backend/.env.example for reference)"
echo "  2. Run the application:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    source .venv/bin/activate"
echo "    uvicorn backend.main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "  Then open:"
echo "    Frontend: http://localhost:3000"
echo "    API docs:  http://localhost:8000/docs"
echo ""
