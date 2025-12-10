.PHONY: help setup install build dev test clean redis-start redis-stop

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║  ATLAS v12 + TETYANA v12 — Makefile Commands                  ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Setup & Installation:$(NC)"
	@echo "  make setup          - Full setup (install all dependencies)"
	@echo "  make install        - Install Node & Python dependencies"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev            - Start development server (npm run dev)"
	@echo "  make build          - Build project (npm run build)"
	@echo "  make cli            - Run CLI menu (npm run cli)"
	@echo ""
	@echo "$(GREEN)Agent:$(NC)"
	@echo "  make agent          - Run agent with test task"
	@echo "  make agent-task     - Run agent (use: make agent-task TASK=\"your task\")"
	@echo ""
	@echo "$(GREEN)Redis:$(NC)"
	@echo "  make redis-start    - Start Redis service"
	@echo "  make redis-stop     - Stop Redis service"
	@echo "  make redis-status   - Check Redis status"
	@echo ""
	@echo "$(GREEN)Testing & Cleanup:$(NC)"
	@echo "  make test           - Run tests"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make clean-all      - Clean everything (including node_modules)"
	@echo ""

# =============================================================================
# Setup & Installation
# =============================================================================

setup:
	@echo "$(BLUE)🚀 Running full setup...$(NC)"
	@chmod +x setup.sh
	@./setup.sh

install:
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@npm install
	@python3 -m venv python/venv || true
	@. python/venv/bin/activate && pip install -r requirements.txt

# =============================================================================
# Development
# =============================================================================

dev:
	@echo "$(BLUE)🚀 Starting development server...$(NC)"
	@npm run dev

build:
	@echo "$(BLUE)🔨 Building project...$(NC)"
	@npm run build

cli:
	@echo "$(BLUE)📋 Starting CLI menu...$(NC)"
	@npm run cli

# =============================================================================
# Agent
# =============================================================================

agent:
	@echo "$(BLUE)🤖 Running agent with test task...$(NC)"
	@./bin/tetyana "система готова"

agent-task:
	@echo "$(BLUE)🤖 Running agent: $(TASK)$(NC)"
	@./bin/tetyana "$(TASK)"

# =============================================================================
# Redis
# =============================================================================

redis-start:
	@echo "$(BLUE)🚀 Starting Redis...$(NC)"
	@brew services start redis
	@echo "$(GREEN)✅ Redis started$(NC)"

redis-stop:
	@echo "$(BLUE)⛔ Stopping Redis...$(NC)"
	@brew services stop redis
	@echo "$(GREEN)✅ Redis stopped$(NC)"

redis-status:
	@echo "$(BLUE)📊 Redis status:$(NC)"
	@redis-cli ping || echo "$(RED)Redis not running$(NC)"

# =============================================================================
# Testing & Cleanup
# =============================================================================

test:
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	@npm test

clean:
	@echo "$(BLUE)🧹 Cleaning build artifacts...$(NC)"
	@rm -rf out/
	@rm -rf dist/
	@echo "$(GREEN)✅ Cleaned$(NC)"

clean-all: clean
	@echo "$(BLUE)🧹 Cleaning everything...$(NC)"
	@rm -rf node_modules/
	@rm -rf python/venv/
	@echo "$(GREEN)✅ Cleaned all$(NC)"

# =============================================================================
# Status
# =============================================================================

status:
	@echo "$(BLUE)📊 System Status:$(NC)"
	@echo ""
	@echo -n "Node.js: "
	@node --version || echo "$(RED)Not found$(NC)"
	@echo -n "Python: "
	@python3 --version || echo "$(RED)Not found$(NC)"
	@echo -n "Chrome: "
	@google-chrome --version || echo "$(RED)Not found$(NC)"
	@echo -n "Redis: "
	@redis-server --version || echo "$(RED)Not found$(NC)"
	@echo ""
	@echo -n "RAG database: "
	@test -f rag/chroma_mac/chroma.sqlite3 && echo "$(GREEN)✅$(NC)" || echo "$(RED)❌$(NC)"
	@echo -n ".env file: "
	@test -f .env && echo "$(GREEN)✅$(NC)" || echo "$(RED)❌$(NC)"
	@echo ""

# =============================================================================
# Info
# =============================================================================

info:
	@echo "$(BLUE)ℹ️  Project Information:$(NC)"
	@echo ""
	@echo "Project: ATLAS v12 + TETYANA v12"
	@echo "Description: LangGraph + Redis + Vision + Self-healing"
	@echo "Author: Кізима Олег Миколайович"
	@echo "License: All rights reserved © 2025"
	@echo ""
	@echo "$(GREEN)Documentation:$(NC)"
	@echo "  - README.md"
	@echo "  - ARCHITECTURE_ATLAS_V12.md"
	@echo "  - FINAL_SUMMARY.md"
	@echo "  - docs/TETYANA_EXECUTION_WORKFLOW.md"
	@echo ""
