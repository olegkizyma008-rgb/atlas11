#!/bin/bash
# =============================================================================
# ATLAS v12 + TETYANA v12 — Complete Setup & Installation Script
# Автор: Кізима Олег Миколайович
# Україна, 2025 | Всі права захищені ©
# =============================================================================
# This script sets up the COMPLETE environment:
# - System dependencies (Homebrew, Chrome, Redis, Node.js, Python)
# - Node.js dependencies
# - Unified Python venv in project root
# - Vision dependencies (pyautogui, PIL)
# - Copilot CLI verification
# - RAG database indexing
# - Accessibility permissions
# - Project build
# =============================================================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ATLAS v12 + TETYANA v12 — Complete Setup & Installation      ║"
echo "║  LangGraph + Redis + Vision + Self-healing + RAG              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Check OS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script is for macOS only${NC}"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# =============================================================================
# 1. Check and install Homebrew
# =============================================================================
echo ""
echo -e "${BLUE}🍺 Checking Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
echo -e "${GREEN}✅ Homebrew ready${NC}"

# =============================================================================
# 2. Check and install Chrome
# =============================================================================
echo ""
echo -e "${BLUE}🌐 Checking Chrome...${NC}"
if ! command -v google-chrome &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing Chrome...${NC}"
    brew install --cask google-chrome
fi
echo -e "${GREEN}✅ Chrome ready${NC}"

# =============================================================================
# 3. Check and install Redis
# =============================================================================
echo ""
echo -e "${BLUE}🔴 Checking Redis...${NC}"
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing Redis...${NC}"
    brew install redis
fi
echo -e "${GREEN}✅ Redis ready${NC}"

# =============================================================================
# 4. Check and install Node.js
# =============================================================================
echo ""
echo -e "${BLUE}⬢ Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installing Node.js...${NC}"
    brew install node
fi
echo -e "${GREEN}✅ Node.js ready${NC}"

# =============================================================================
# 5. Install Python 3.12 (REQUIRED for LangChain + LangGraph)
# =============================================================================
echo ""
echo -e "${BLUE}🐍 Installing Python 3.12...${NC}"
brew install python@3.12 2>&1 | grep -E "already|installed|Downloading" | tail -1
PYTHON_BIN="/opt/homebrew/opt/python@3.12/bin/python3.12"
PYTHON_VERSION=$($PYTHON_BIN --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✅ Python ${PYTHON_VERSION} ready${NC}"

# =============================================================================
# 6. Install Node dependencies
# =============================================================================
echo ""
echo -e "${BLUE}📦 Installing Node dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Node dependencies installed${NC}"

# =============================================================================
# 7. Install Python dependencies (Unified venv - Python 3.12)
# =============================================================================
echo ""
echo -e "${BLUE}📦 Installing Python dependencies (Python 3.12)...${NC}"
echo -e "${BLUE}   Location: ./venv (unified for entire project)${NC}"
echo ""

# Видаляємо старі venv якщо існують
if [ -d "venv" ] || [ -d ".venv" ] || [ -d "python/venv" ]; then
    echo -e "${YELLOW}⚠️  Removing old venv directories...${NC}"
    rm -rf venv .venv python/venv 2>/dev/null || true
    echo -e "${GREEN}✅ Old venv removed${NC}"
fi

# Створюємо новий venv з Python 3.12
echo -e "${YELLOW}⚠️  Creating unified Python 3.12 virtual environment...${NC}"
$PYTHON_BIN -m venv venv
echo -e "${GREEN}✅ Virtual environment created at ./venv${NC}"

# Активуємо venv
source venv/bin/activate

# Оновлюємо pip, setuptools, wheel
echo -e "${BLUE}📦 Upgrading pip, setuptools, wheel...${NC}"
pip install --upgrade pip setuptools wheel

# Встановлюємо всі залежності з requirements.txt
echo -e "${BLUE}📦 Installing all dependencies from requirements.txt...${NC}"
pip install -r requirements.txt

echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo -e "${BLUE}   venv location: $(pwd)/venv${NC}"
echo -e "${BLUE}   Python: $(python3 --version)${NC}"
echo -e "${BLUE}   Pip: $(pip --version)${NC}"

# =============================================================================
# 8. Verify Copilot CLI (optional but recommended)
# =============================================================================
echo ""
echo -e "${BLUE}🔍 Checking GitHub Copilot CLI...${NC}"
if command -v copilot &> /dev/null; then
    echo -e "${GREEN}✅ GitHub Copilot CLI found${NC}"
    copilot --version
else
    echo -e "${YELLOW} GitHub Copilot CLI not found (optional)${NC}"
    echo "   Install with: npm install -g @github/copilot-cli"
fi

# =============================================================================
# 9. Install Vision dependencies (pyautogui, PIL)
# =============================================================================
echo ""
echo -e "${BLUE} Installing Vision dependencies...${NC}"
source venv/bin/activate
pip install --upgrade pillow pyautogui
echo -e "${GREEN} Vision dependencies installed${NC}"

# =============================================================================
# 10. Index RAG database (if knowledge base exists)
# =============================================================================
echo ""
echo -e "${BLUE} Indexing RAG database...${NC}"
echo -e "${BLUE}📚 Indexing RAG database...${NC}"

# Перевіряємо наявність RAG скрипту
if [ -f "rag/index_rag.py" ]; then
    echo -e "${YELLOW}⚠️  Found RAG indexer. Indexing knowledge base...${NC}"
    
    # Активуємо venv для запуску скрипту
    source venv/bin/activate
    
    # Запускаємо індексацію
    python3 rag/index_rag.py 2>&1 || true
    
    echo -e "${GREEN}✅ RAG database indexed${NC}"
else
    echo -e "${YELLOW}⚠️  rag/index_rag.py not found${NC}"
fi

# Перевіряємо результат
if [ -d "rag/chroma_mac" ] && [ "$(ls -A rag/chroma_mac 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ RAG database populated at rag/chroma_mac${NC}"
else
    echo -e "${YELLOW}⚠️  RAG database empty or not created${NC}"
fi

# =============================================================================
# 11. Setup Accessibility Permissions
# =============================================================================
echo ""
echo -e "${BLUE}🔐 Setting up Accessibility Permissions...${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: You need to manually grant Accessibility permissions:${NC}"
echo ""
echo "1. Open System Settings → Privacy & Security → Accessibility"
echo "2. Click the lock icon to unlock"
echo "3. Add these applications:"
echo "   - Terminal (or your terminal app)"
echo "   - Google Chrome"
echo "   - Any other apps you want to automate"
echo ""
echo "4. For Electron app (if running):"
echo "   - Add the built app from /Applications or ./out/"
echo ""
echo -e "${YELLOW}Press ENTER when you've completed the permissions setup...${NC}"
read -r

# =============================================================================
# 12. Create .env file if it doesn't exist
# =============================================================================
echo ""
echo -e "${BLUE}📝 Checking .env configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env with your API keys:${NC}"
        echo "   - GEMINI_API_KEY"
        echo "   - OPENAI_API_KEY"
        echo "   - COPILOT_API_KEY (optional)"
    else
        echo -e "${YELLOW}⚠️  Creating new .env file...${NC}"
        cat > .env << 'EOF'
# ATLAS v12 Configuration
NODE_ENV=development
AG=true

# AI Providers
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
BRAIN_API_KEY=your_gemini_key_here

VISION_PROVIDER=copilot
VISION_MODEL=gpt-4o
VISION_API_KEY=your_copilot_key_here

REASONING_PROVIDER=copilot
REASONING_MODEL=gpt-4o
REASONING_API_KEY=your_copilot_key_here

# Redis
REDIS_URL=redis://localhost:6379/0

# RAG
RAG_ENABLED=true
RAG_PATH=./rag/chroma_mac
RAG_EMBEDDING_MODEL=BAAI/bge-m3

# Execution
EXECUTION_ENGINE=python-bridge

# Vision
VISION_DISABLE=0
VISION_MODE=live

# TTS & STT
TTS_PROVIDER=openai
STT_PROVIDER=gemini
EOF
        echo -e "${YELLOW}⚠️  Please edit .env with your API keys${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# =============================================================================
# 13. Verify and fix python/mac_master_agent.py wrapper
# =============================================================================
echo ""
echo -e "${BLUE}🔧 Verifying python/mac_master_agent.py wrapper...${NC}"
if [ -f "python/mac_master_agent.py" ]; then
    # Перевіряємо, чи файл не порожній
    if [ ! -s "python/mac_master_agent.py" ] || [ $(wc -l < "python/mac_master_agent.py") -lt 5 ]; then
        echo -e "${YELLOW}⚠️  python/mac_master_agent.py is empty or incomplete. Recreating...${NC}"
        cat > python/mac_master_agent.py << 'WRAPPER_EOF'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Wrapper для mac_master_agent
# Перенаправляє на основний агент у src/kontur/organs/

import sys
import os
from pathlib import Path

# Додати src до path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

# Імпортуємо основний агент
from kontur.organs.tetyana_agent import main

if __name__ == "__main__":
    main()
WRAPPER_EOF
        chmod +x python/mac_master_agent.py
        echo -e "${GREEN}✅ python/mac_master_agent.py recreated${NC}"
    else
        echo -e "${GREEN}✅ python/mac_master_agent.py is valid${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  python/mac_master_agent.py not found${NC}"
fi

# =============================================================================
# 14. Update tetyana binary to use unified venv
# =============================================================================
echo ""
echo -e "${BLUE}🔧 Updating tetyana binary for unified venv...${NC}"
if [ -f "bin/tetyana" ]; then
    sed -i '' 's|PYTHON_VENV="$PROJECT_ROOT/python/venv/bin/python3"|PYTHON_VENV="$PROJECT_ROOT/venv/bin/python3"|g' bin/tetyana
    echo -e "${GREEN}✅ tetyana binary updated${NC}"
else
    echo -e "${YELLOW}⚠️  bin/tetyana not found${NC}"
fi

# =============================================================================
# 15. Clean up old symlinks and create backward compatibility
# =============================================================================
echo ""
echo -e "${BLUE}🔗 Cleaning up old symlinks...${NC}"

# Видаляємо старі symlink якщо існують
if [ -L "python/venv" ]; then
    rm -f python/venv
    echo -e "${GREEN}✅ Old symlink removed${NC}"
fi

# Створюємо новий symlink для зворотної сумісності
if [ ! -d "python/venv" ] && [ -d "venv" ]; then
    mkdir -p python
    ln -sf ../venv python/venv 2>/dev/null || true
    echo -e "${GREEN}✅ Symlink created: python/venv -> ../venv${NC}"
fi

# =============================================================================
# 16. Verify RAG structure and knowledge sources
# =============================================================================
echo ""
echo -e "${BLUE}📂 Verifying RAG structure...${NC}"

# Перевіряємо наявність knowledge sources
APPLESCRIPT_COUNT=$(find rag/knowledge_sources -type f -name "*.applescript" 2>/dev/null | wc -l)
echo -e "${BLUE}   AppleScript files: ${APPLESCRIPT_COUNT}${NC}"

# Перевіряємо наявність basics.md
if [ -f "rag/macOS-automation-knowledge-base/basics.md" ]; then
    echo -e "${GREEN}✅ Knowledge base found${NC}"
else
    echo -e "${YELLOW}⚠️  Knowledge base incomplete${NC}"
fi

# Перевіряємо наявність index_rag.py
if [ -f "rag/index_rag.py" ]; then
    echo -e "${GREEN}✅ RAG indexer found${NC}"
else
    echo -e "${RED}❌ RAG indexer not found${NC}"
fi

# =============================================================================
# 17. Start Redis (optional - for development)
# =============================================================================
echo ""
echo -e "${BLUE}🚀 Redis Setup${NC}"
if command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}⚠️  To start Redis in background:${NC}"
    echo "   brew services start redis"
    echo ""
    echo -e "${YELLOW}⚠️  To check Redis status:${NC}"
    echo "   redis-cli ping"
fi

# =============================================================================
# 18. Build project
# =============================================================================
echo ""
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build
echo -e "${GREEN}✅ Project built${NC}"

# =============================================================================
# 19. Final System Check
# =============================================================================
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}✅ Final System Check${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -n "Chrome: "
if command -v google-chrome &> /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "Redis: "
if command -v redis-server &> /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "Node.js: "
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "Python 3: "
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "Python venv: "
if [ -d "venv" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "Vision (pyautogui): "
if python3 -c "import pyautogui" 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "Vision (PIL): "
if python3 -c "from PIL import Image" 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "RAG (chromadb): "
if python3 -c "import chromadb" 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n "LangGraph: "
if python3 -c "import langgraph" 2>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

echo -n ".env: "
if [ -f ".env" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# =============================================================================
# 18. Summary & Next Steps
# =============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📚 Next Steps:${NC}"
echo ""
echo "1. Edit .env with your API keys:"
echo "   vim .env"
echo ""
echo "2. Verify Vision is working:"
echo "   python3 -c \"from PIL import Image; import pyautogui; print('Vision OK')\""
echo ""
echo "3. Verify RAG database:"
echo "   ls -la rag/chroma_mac/"
echo ""
echo "4. Start Redis (if using state management):"
echo "   brew services start redis"
echo ""
echo "5. Run the agent directly:"
echo "   ./bin/tetyana \"Відкрий Калькулятор\""
echo ""
echo "6. Or use CLI menu:"
echo "   npm run cli"
echo ""
echo "7. Or start development server:"
echo "   npm run dev"
echo ""
echo -e "${GREEN}📖 Documentation:${NC}"
echo "   - README.md - Main documentation"
echo "   - ARCHITECTURE_ATLAS_V12.md - System architecture"
echo "   - docs/UNIFIED_ENVIRONMENT_SETUP.md - Python environment"
echo "   - docs/ - Full documentation"
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 You're ready to go!${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""
