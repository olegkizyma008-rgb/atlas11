---
description: Execution Engine Configuration - Python Bridge vs Native MCP
---

# Execution Engine

TETYANA supports two execution engines, configurable via `EXECUTION_ENGINE` in `.env`.

## Native (MCP)

Standard KONTUR protocol-based execution.

*   **Config**: `EXECUTION_ENGINE=native`
*   **Flow**: Atlas Plan → Tetyana → MCP Server → Tool Execution
*   **Use Case**: Structured tasks, file operations, terminal commands.

## Python Bridge (Open Interpreter)

Advanced automation using Open Interpreter with RAG and macOS Accessibility.

*   **Config**: `EXECUTION_ENGINE=python-bridge`
*   **Location**: `~/mac_assistant/`
*   **Components**:
    *   `mac_master_agent.py` - Main agent script
    *   `mac_accessibility.py` - Quartz/AppleScript driver
    *   `index_rag.py` - RAG knowledge indexer
*   **Capabilities**:
    *   Natural language commands
    *   Screen control via Accessibility API
    *   RAG-enhanced macOS knowledge
*   **Use Case**: Complex GUI automation, web interactions, testing.

## CLI Testing

Use **Test Tetyana (NL Mode)** from CLI main menu to send natural language commands directly to the execution engine for rapid testing.
