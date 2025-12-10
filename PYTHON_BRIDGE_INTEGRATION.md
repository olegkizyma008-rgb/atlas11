# Python Bridge Integration - Complete Guide

## Overview

The KONTUR system has a complete **Python Bridge** integration that allows advanced automation via Open Interpreter.

## Architecture

### Components

1. **OpenInterpreterBridge** (`src/modules/tetyana/open_interpreter_bridge.ts`)
   - Spawns Python subprocess with `mac_master_agent.py`
   - Passes environment variables and prompts
   - Handles stdout/stderr communication
   - Manages process lifecycle

2. **TetyanaExecutor** (`src/modules/tetyana/executor.ts`)
   - Orchestrates plan execution
   - Routes to Python Bridge when `EXECUTION_ENGINE=python-bridge`
   - Integrates with Vision feedback loop
   - Handles retries and verification

3. **Python Agent** (`~/mac_assistant/mac_master_agent.py`)
   - Runs Open Interpreter with GitHub Copilot
   - Handles task execution
   - Provides RAG integration
   - Supports auto-execution (with limitations)

## Configuration

### Environment Variables

```env
# Execution Engine
EXECUTION_ENGINE=python-bridge  # or 'native'

# Brain (LLM)
BRAIN_PROVIDER=copilot
BRAIN_MODEL=gpt-4o
BRAIN_API_KEY=ghu_...

# Vision
VISION_PROVIDER=copilot
VISION_MODEL=gpt-4o
VISION_API_KEY=ghu_...

# Reasoning
REASONING_PROVIDER=copilot
REASONING_MODEL=gpt-4o
REASONING_API_KEY=ghu_...
```

### Execution Config

```typescript
// From src/kontur/providers/config.ts
export function getExecutionConfig(): ExecutionConfig {
    return {
        engine: (process.env.EXECUTION_ENGINE as 'python-bridge' | 'native') || 'native'
    };
}
```

## How It Works

### 1. Plan Execution Flow

```
CLI/UI Request
    ↓
TetyanaExecutor.execute(plan)
    ↓
Check EXECUTION_ENGINE config
    ↓
If 'python-bridge':
    OpenInterpreterBridge.executeWithVisionFeedback()
    ↓
    Spawn Python subprocess
    ↓
    Pass prompt + environment variables
    ↓
    mac_master_agent.py runs
    ↓
    Open Interpreter processes task
    ↓
    Returns result
    ↓
Else 'native':
    Execute using native tools (MCP, AppleScript)
```

### 2. Python Bridge Execution

```typescript
// From open_interpreter_bridge.ts
async executeWithVisionFeedback(prompt: string, maxRetries: number = 1): Promise<void> {
    // 1. Load environment variables from .env
    const envFileVars = loadEnvFile();
    
    // 2. Prepare environment
    const env = {
        ...process.env,
        ...envFileVars,
        GEMINI_API_KEY: ...,
        COPILOT_API_KEY: ...,
        PYTHONUNBUFFERED: '1'
    };
    
    // 3. Spawn Python process
    this.process = spawn(PYTHON_PATH, [AGENT_SCRIPT_PATH, prompt], { env });
    
    // 4. Handle stdout/stderr
    this.process.stdout?.on('data', (data) => {
        console.log(`[OpenInterpreter:STDOUT] ${data}`);
    });
    
    // 5. Wait for completion
    return new Promise((resolve, reject) => {
        this.process?.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Process exited with code ${code}`));
        });
    });
}
```

## Features

### ✅ Implemented

- **GitHub Copilot Integration**: Full support with token management
- **UTF-8 Encoding**: Proper handling of Ukrainian and other languages
- **RAG Integration**: Knowledge base search and self-healing
- **Vision Feedback**: Integration with Grisha Vision Service
- **Error Handling**: Retry logic with verification
- **Environment Management**: Automatic .env loading
- **Process Management**: Proper subprocess lifecycle

### ⚠️ Known Limitations

- **Auto-execution**: open-interpreter v0.4.3 requires user confirmation
- **Streaming**: Limited streaming support in subprocess communication
- **Timeout**: Long-running tasks may timeout

## Usage Examples

### 1. Enable Python Bridge in CLI

```bash
# Option A: Via CLI Menu
npm run cli
# Select "Execution" → Set to "Python Bridge"

# Option B: Via .env file
EXECUTION_ENGINE=python-bridge

# Option C: Via environment variable
export EXECUTION_ENGINE=python-bridge
```

### 2. Execute Task via CLI - Interactive

```bash
npm run cli
# Main Menu appears
# Select "Run macOS Agent"
# Enter task: "відкрий калькулятор і перемнож 44 на 22"
# Agent executes and shows result
```

### 3. Execute Task via CLI - Direct Command

```bash
npm run cli "відкрий калькулятор і перемнож 44 на 22"
# Directly executes task without menu
```

### 4. Direct Python Execution

```bash
python3 ~/mac_assistant/mac_master_agent.py "відкрий калькулятор і перемнож 44 на 22"
```

### 5. Programmatic Usage

```typescript
import { OpenInterpreterBridge } from './src/modules/tetyana/open_interpreter_bridge';

const bridge = new OpenInterpreterBridge();

// Check environment
if (OpenInterpreterBridge.checkEnvironment()) {
    // Execute task
    const result = await bridge.execute("відкрий калькулятор");
    console.log(result);
}
```

### 6. With Vision Feedback (Full Plan Execution)

```typescript
import { TetyanaExecutor } from './src/modules/tetyana/executor';
import { Core } from './src/kontur/core/dispatcher';

const executor = new TetyanaExecutor(core);
const plan = {
    goal: "відкрий калькулятор і перемнож 44 на 22",
    steps: [
        { instruction: "Open Calculator", description: "Launch the Calculator app" },
        { instruction: "Multiply 44 by 22", description: "Enter 44 * 22 =" }
    ]
};

await executor.execute(plan, inputPacket);
```

## CLI Integration

The Python Bridge is fully integrated into the KONTUR CLI:

### Main Menu Options

```
Main Menu
├── Brain           (copilot / gpt-4o)
├── TTS             (openai / gemini-2.5-flash-preview-tts)
├── STT             (gemini / gemini-2.5-flash)
├── Vision          (copilot / gpt-4o)
├── Reasoning       (copilot / gpt-4o)
├── Execution       (Python Bridge)  ← Select this to configure
├── ─────────────────────────────────
├── Secrets & Keys  (API key management)
├── App Settings    (General configuration)
├── System Health   (Diagnostics)
├── RAG Status      (Knowledge base)
├── ─────────────────────────────────
├── Run macOS Agent ← Execute tasks with Python Bridge
├── Test Tetyana    (Test natural language mode)
└── Exit
```

### Execution Engine Options

When you select "Execution":
- **Python Bridge**: Advanced automation via Open Interpreter (recommended)
- **Native (MCP)**: Native tools and AppleScript

### Run macOS Agent Flow

1. Select "Run macOS Agent" from main menu
2. Enter task in natural language (e.g., "відкрий калькулятор")
3. Agent executes via Python Bridge
4. Results displayed in terminal

## File Locations

| Component | Location |
|-----------|----------|
| CLI Entry Point | `src/cli/index.ts` |
| CLI Menu v2 | `src/cli/ui/menu-v2.ts` |
| OpenInterpreterBridge | `src/modules/tetyana/open_interpreter_bridge.ts` |
| TetyanaExecutor | `src/modules/tetyana/executor.ts` |
| Python Agent | `~/mac_assistant/mac_master_agent.py` |
| Config | `src/kontur/providers/config.ts` |
| Types | `src/kontur/providers/types.ts` |

## Troubleshooting

### Issue: Python Bridge not executing

**Solution**: Check if `EXECUTION_ENGINE=python-bridge` is set in `.env`

### Issue: Code requires user confirmation

**Solution**: This is a limitation of open-interpreter v0.4.3. Consider:
1. Upgrading open-interpreter
2. Using native execution engine
3. Using Goose framework instead

### Issue: UTF-8 encoding issues

**Solution**: Already fixed in the system. Ensure `utf8_stream_wrapper.py` is imported.

### Issue: Environment variables not loaded

**Solution**: Check that `.env` file exists at `/Users/dev/Documents/GitHub/atlas/.env`

## Performance

- **Startup**: ~2-3 seconds (Python venv initialization)
- **Token Refresh**: ~0.5 seconds (cached)
- **Task Execution**: Depends on task complexity
- **Vision Feedback**: ~1-2 seconds per verification

## Security Considerations

- ✅ API keys loaded from `.env` (not hardcoded)
- ✅ Subprocess isolation
- ✅ Token caching with expiration
- ⚠️ Requires Accessibility permissions for macOS automation
- ⚠️ Code execution requires careful validation

## Future Improvements

1. **Streaming Support**: Implement proper streaming for long-running tasks
2. **Auto-execution**: Upgrade open-interpreter or patch for auto-execution
3. **Timeout Management**: Add configurable timeouts
4. **Caching**: Cache task results for repeated operations
5. **Logging**: Enhanced logging for debugging

## Related Documentation

- [GitHub Copilot Integration](./COPILOT_INTEGRATION_REPORT.md)
- [UTF-8 Encoding Solution](../mac_assistant/ENCODING_SOLUTION.md)
- [Task Execution Limitations](../mac_assistant/SOLUTION_FOUND.md)
