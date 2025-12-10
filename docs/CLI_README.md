# KONTUR CLI System

**Unified configuration management for KONTUR system services**

## Quick Start

### Start Interactive Configuration
```bash
npm run cli
```

### Execute Direct Task
```bash
npm run cli "Open Calculator"
npm run cli "Відкрий Калькулятор"
```

## What is KONTUR CLI?

KONTUR CLI is a command-line interface for configuring and managing the KONTUR system. It provides:

- **Service Configuration**: Set up Brain, Vision, TTS, STT, Reasoning, and Execution
- **Secrets Management**: Manage API keys and authentication tokens
- **App Settings**: Configure language, theme, and logging
- **System Health**: Verify configuration status
- **Task Execution**: Run automation tasks directly

## Key Features

### 1. Unified Configuration
All services in one place with consistent interface:
- Provider selection
- Model selection
- Fallback configuration
- Status display

### 2. Secrets Management
Dedicated section for API keys:
- Gemini API Key
- GitHub Copilot Token
- OpenAI API Key
- Anthropic API Key
- Mistral API Key

### 3. Clean Design
- No emojis or decorative elements
- Minimal, professional appearance
- Color-coded status indicators
- Clear navigation

### 4. Easy Configuration
- Interactive menus
- Dynamic model fetching
- Validation and error handling
- Configuration persistence

## Menu Structure

```
Main Menu
├── Services
│   ├── Brain
│   ├── TTS
│   ├── STT
│   ├── Vision
│   ├── Reasoning
│   └── Execution
├── Management
│   ├── Secrets & Keys
│   ├── App Settings
│   └── System Health
├── Actions
│   ├── Run macOS Agent
│   └── Test Tetyana
└── Exit
```

## Configuration

### Services

Each service can be configured with:
- **Provider**: Which LLM provider to use
- **Model**: Which model from that provider
- **Fallback**: Secondary provider if primary fails

### Vision (Grisha)

Special configuration with two modes:
- **Live Stream**: Continuous video (Gemini Live)
- **On-Demand**: Screenshot analysis (Copilot/GPT-4o)

### Execution Engine

Choose between:
- **Python Bridge**: Advanced automation via Open Interpreter
- **Native (MCP)**: Standard Atlas MCP execution

## Configuration File

All settings are stored in `.env`:

```env
# Services
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
BRAIN_FALLBACK_PROVIDER=copilot

# Vision
VISION_MODE=live
VISION_LIVE_PROVIDER=gemini
VISION_ONDEMAND_PROVIDER=copilot

# Execution
EXECUTION_ENGINE=python-bridge

# API Keys
GEMINI_API_KEY=your-key
COPILOT_API_KEY=your-token
OPENAI_API_KEY=your-key

# App Settings
APP_LANGUAGE=uk
APP_THEME=dark
LOG_LEVEL=info
```

## Common Tasks

### Configure Brain Service
```
Main Menu → Brain → Provider → Select provider → Model → Select model → Back
```

### Add API Key
```
Main Menu → Secrets & Keys → Select key → Enter value → Back
```

### Switch Execution Engine
```
Main Menu → Execution → Engine → Select engine → Back
```

### Check System Health
```
Main Menu → System Health → Review status → Back
```

## Documentation

- **[CLI_SYSTEM_V2.md](CLI_SYSTEM_V2.md)** - System overview and features
- **[CLI_EXAMPLES.md](CLI_EXAMPLES.md)** - Usage examples and patterns
- **[CLI_ARCHITECTURE.md](CLI_ARCHITECTURE.md)** - Technical architecture
- **[CLI_V1_VS_V2.md](CLI_V1_VS_V2.md)** - Version comparison

## File Structure

```
src/cli/
├── index.ts                 # Entry point
├── managers/
│   ├── config-manager.ts   # .env management
│   └── model-registry.ts   # Model fetching
├── ui/
│   ├── menu-v2.ts          # Main menu
│   ├── config-list.ts      # Configuration UI
│   ├── prompts.ts          # Prompt utilities
│   └── menu.ts             # Legacy menu
└── utils/
    ├── display.ts          # Display utilities
    └── env.ts              # Environment utilities
```

## API Reference

### ConfigManager
```typescript
// Load configuration
configManager.load();

// Get value
const value = configManager.get('BRAIN_PROVIDER');

// Set value
configManager.set('BRAIN_PROVIDER', 'openai');

// Get all
const all = configManager.getAll();
```

### ModelRegistry
```typescript
// Get static models
const models = modelRegistry.getModels('gemini');

// Fetch from provider
const models = await modelRegistry.fetchModels('gemini', apiKey);
```

## Troubleshooting

### Models Not Showing
1. Check API key in Secrets & Keys
2. Verify internet connection
3. Try again

### Service Not Working
1. Run System Health check
2. Configure missing components
3. Verify API keys

### Configuration Not Saving
1. Check .env file permissions
2. Verify disk space
3. Check file is not locked

## Support

For detailed information:
- See documentation files in `/docs`
- Check `.env.example` for all options
- Review service documentation

## Version History

### v2 (Current)
- Clean design without emojis
- Unified configuration interface
- Separate secrets management
- Better code structure
- Comprehensive documentation

### v1 (Legacy)
- Emoji-based interface
- Mixed configuration
- Still available for compatibility

## Contributing

To add new services or features:
1. Update SERVICES array
2. Create configuration function
3. Add to main menu
4. Update documentation
5. Test thoroughly

## License

Part of KONTUR system - See main LICENSE file

## Quick Links

- [System Overview](CLI_SYSTEM_V2.md)
- [Usage Examples](CLI_EXAMPLES.md)
- [Architecture](CLI_ARCHITECTURE.md)
- [Version Comparison](CLI_V1_VS_V2.md)
- [Main README](../README.md)

---

**Start configuring**: `npm run cli`
