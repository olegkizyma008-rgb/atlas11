#!/bin/bash
# =============================================================================
# ATLAS v12 + TETYANA v12 — Setup & Installation Script
# Автор: Кізима Олег Миколайович
# Україна, 2025 | Всі права захищені ©
# =============================================================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ATLAS v12 + TETYANA v12 — Setup & Installation               ║"
echo "║  LangGraph + Redis + Vision + Self-healing                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check OS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script is for macOS only${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Checking system requirements...${NC}"
echo ""

# =============================================================================
# 1. Check & Install Homebrew
# =============================================================================
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}⚠️  Homebrew not found. Installing...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}✅ Homebrew found${NC}"
fi

# =============================================================================
# 2. Install Chrome (REQUIRED)
# =============================================================================
echo ""
echo -e "${BLUE}📦 Installing Chrome...${NC}"
if ! command -v google-chrome &> /dev/null; then
    echo -e "${YELLOW}⚠️  Chrome not found. Installing...${NC}"
    brew install google-chrome
    echo -e "${GREEN}✅ Chrome installed${NC}"
else
    echo -e "${GREEN}✅ Chrome already installed${NC}"
    google-chrome --version
fi

# =============================================================================
# 3. Install Redis (REQUIRED)
# =============================================================================
echo ""
echo -e "${BLUE}📦 Installing Redis...${NC}"
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not found. Installing...${NC}"
    brew install redis
    echo -e "${GREEN}✅ Redis installed${NC}"
else
    echo -e "${GREEN}✅ Redis already installed${NC}"
    redis-server --version
fi

# =============================================================================
# 4. Install Node.js (if needed)
# =============================================================================
echo ""
echo -e "${BLUE}📦 Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing...${NC}"
    brew install node
    echo -e "${GREEN}✅ Node.js installed${NC}"
else
    echo -e "${GREEN}✅ Node.js found${NC}"
    node --version
fi

# =============================================================================
# 5. Install Python 3 (if needed)
# =============================================================================
echo ""
echo -e "${BLUE}📦 Checking Python 3...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python 3 not found. Installing...${NC}"
    brew install python@3.11
    echo -e "${GREEN}✅ Python 3 installed${NC}"
else
    echo -e "${GREEN}✅ Python 3 found${NC}"
    python3 --version
fi

# =============================================================================
# 6. Install Node dependencies
# =============================================================================
echo ""
echo -e "${BLUE}📦 Installing Node dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Node dependencies installed${NC}"

# =============================================================================
# 7. Install Python dependencies
# =============================================================================
echo ""
echo -e "${BLUE}📦 Installing Python dependencies...${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "python/venv" ]; then
    echo -e "${YELLOW}⚠️  Creating Python virtual environment...${NC}"
    python3 -m venv python/venv
fi

# Activate virtual environment
source python/venv/bin/activate

# Install requirements
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✅ Python dependencies installed${NC}"

# =============================================================================
# 8. Create .env file if it doesn't exist
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
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
COPILOT_API_KEY=your_copilot_key_here

# Redis
REDIS_URL=redis://localhost:6379/0

# RAG
RAG_PATH=./rag/chroma_mac

# Execution
EXECUTION_ENGINE=python-bridge
EOF
        echo -e "${YELLOW}⚠️  Please edit .env with your API keys${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# =============================================================================
# 9. Start Redis (optional - for development)
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
# 10. Build project
# =============================================================================
echo ""
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build
echo -e "${GREEN}✅ Project built${NC}"

# =============================================================================
# 11. Final checks
# =============================================================================
echo ""
echo -e "${BLUE}✅ Final System Check${NC}"
echo ""

echo -n "Chrome: "
if command -v google-chrome &> /dev/null; then
    echo -e "${GREEN}✅$(NC)"
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

echo -n ".env: "
if [ -f ".env" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# =============================================================================
# 12. Summary
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
echo "2. Start Redis (if using state management):"
echo "   brew services start redis"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "4. Or run the agent directly:"
echo "   ./bin/tetyana \"твоє завдання\""
echo ""
echo "5. Or use CLI menu:"
echo "   npm run cli"
echo ""
echo -e "${GREEN}📖 Documentation:${NC}"
echo "   - README.md"
echo "   - ARCHITECTURE_ATLAS_V12.md"
echo "   - docs/TETYANA_EXECUTION_WORKFLOW.md"
echo ""
echo -e "${GREEN}🚀 You're ready to go!${NC}"
echo ""
