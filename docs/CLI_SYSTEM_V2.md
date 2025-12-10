# KONTUR CLI System v2

## Overview

The new KONTUR CLI v2 is a unified configuration management system with a clean, minimal design. It provides structured access to all system services, secrets, and settings without emojis or decorative elements.

## Key Features

### 1. **Unified Configuration Structure**
- All services (Brain, Vision, TTS, STT, Reasoning, Execution) in one place
- Consistent interface for provider/model/fallback configuration
- Enable/disable/delete operations for all settings

### 2. **Secrets Management** (Separate Section)
- API keys isolated from service configuration
- Secure input for sensitive credentials
- Support for GitHub Copilot token import (future)

### 3. **Clean Design**
- No emojis or decorative elements
- Minimal aesthetic with clear hierarchy
- Readable status indicators using colors

### 4. **Service Configuration**
Each service supports:
- **Provider Selection**: Choose from available providers (Gemini, Copilot, OpenAI, etc.)
- **Model Selection**: Dynamic model fetching from providers
- **Fallback Provider**: Automatic switching if primary fails
- **Status Display**: Current configuration at a glance

## Menu Structure

```
Main Menu
├── Brain
├── TTS (Text-to-Speech)
├── STT (Speech-to-Text)
├── Vision (Grisha)
├── Reasoning
├── Execution Engine
├── Secrets & Keys
├── App Settings
├── System Health
├── Run macOS Agent
├── Test Tetyana
└── Exit
```

## Usage

### Start Interactive CLI
```bash
npm run cli
```

### Execute Direct Task
```bash
npm run cli "Open Calculator"
npm run cli "Відкрий Калькулятор"
```

## Configuration Sections

### 1. Service Configuration
Each service has:
- **Provider**: Which LLM provider to use
- **Model**: Which model from that provider
- **Fallback**: Secondary provider if primary fails

**Example**: Brain Service
```
Brain Configuration
  Provider         gemini
  Model            gemini-2.5-flash
  Fallback         copilot
```

### 2. Vision (Grisha)
Special configuration with two modes:
- **Live Stream**: Continuous video stream (Gemini Live)
- **On-Demand**: Screenshot after task (Copilot/GPT-4o)

Each mode has its own provider/model configuration.

### 3. Execution Engine
Choose between:
- **Python Bridge**: Advanced automation via Open Interpreter
- **Native (MCP)**: Standard Atlas MCP execution

### 4. Secrets & Keys
Manage API credentials:
- Gemini API Key
- GitHub Copilot Token
- OpenAI API Key
- Anthropic API Key
- Mistral API Key

### 5. App Settings
Configure application behavior:
- **Language**: Українська / English
- **Theme**: Dark / Light
- **Log Level**: Debug / Info / Warn / Error

## Configuration Management

### Enable/Disable Services
Each configuration item can be:
1. **Enabled** (default): Service is active
2. **Disabled**: Service is configured but not used
3. **Deleted**: Configuration removed entirely

### Fallback System
If primary provider fails:
1. System automatically switches to fallback provider
2. If no fallback, operation fails gracefully
3. Fallback can be configured per service

### Model Fetching
- Models are fetched dynamically from providers (if API key available)
- Falls back to static list if fetch fails
- Supports preview/experimental models

## File Structure

```
src/cli/
├── index.ts                 # Entry point
├── managers/
│   ├── config-manager.ts   # .env file management
│   └── model-registry.ts   # Model fetching & caching
├── ui/
│   ├── menu-v2.ts          # Main menu (new)
│   ├── config-list.ts      # Configuration list UI (new)
│   ├── prompts.ts          # Prompt utilities
│   └── menu.ts             # Legacy menu (deprecated)
└── utils/
    ├── display.ts          # Display utilities
    └── env.ts              # Environment utilities
```

## Configuration File (.env)

All settings are stored in `.env` file:

```env
# Brain Service
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
BRAIN_FALLBACK_PROVIDER=copilot

# Vision Service
VISION_MODE=live
VISION_LIVE_PROVIDER=gemini
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
VISION_ONDEMAND_PROVIDER=copilot
VISION_ONDEMAND_MODEL=gpt-4o

# Execution Engine
EXECUTION_ENGINE=python-bridge

# API Keys
GEMINI_API_KEY=your-key-here
COPILOT_API_KEY=your-token-here
OPENAI_API_KEY=your-key-here

# App Settings
APP_LANGUAGE=uk
APP_THEME=dark
LOG_LEVEL=info
```

## Design Principles

### 1. **Minimal Aesthetic**
- No emojis or decorative elements
- Clean typography with strategic use of color
- Whitespace for readability

### 2. **Consistent Interface**
- Same pattern for all services
- Predictable navigation
- Clear action labels

### 3. **Structured Information**
- Grouped by category (Services, Secrets, Settings)
- Status indicators (enabled/disabled/not set)
- Helpful descriptions for each option

### 4. **User-Friendly**
- No circular navigation (can't loop back to start)
- Clear "Back" options at each level
- Confirmation for destructive actions

## Advanced Features

### 1. **Health Check**
Verify system configuration:
```
System Health Check
  Brain Provider              OK
  Brain Model                 OK
  Vision Mode                 OK
  Execution Engine            OK
  Gemini API Key              OK
```

### 2. **Model Registry**
- Caches models from each provider
- Supports dynamic fetching with API key
- Falls back to static list if needed

### 3. **Fallback System**
- Primary provider fails → switches to fallback
- Configurable per service
- Automatic retry logic

## Future Enhancements

1. **Multi-select Configuration**
   - Enable/disable multiple items at once
   - Batch operations

2. **Configuration Profiles**
   - Save/load configuration sets
   - Quick switching between profiles

3. **Advanced Secrets Management**
   - Encryption for sensitive data
   - Secure credential storage
   - Token refresh automation

4. **Service Health Monitoring**
   - Real-time provider status
   - API quota tracking
   - Performance metrics

5. **Configuration Validation**
   - Test API keys before saving
   - Validate model availability
   - Check provider connectivity

## Troubleshooting

### Models Not Showing
- Ensure API key is set for the provider
- Check internet connection
- Verify API key has correct permissions

### Service Not Working
- Check "System Health" for missing configuration
- Verify API key is valid
- Try fallback provider if available

### Configuration Not Saving
- Ensure `.env` file is writable
- Check disk space
- Verify file permissions

## Migration from v1

Old menu (`menu.ts`) is deprecated but still available. To use new menu:
```bash
# Already using new menu by default
npm run cli
```

To revert to old menu temporarily:
```typescript
// In src/cli/index.ts
import { mainMenu } from './ui/menu.js';  // Old
// Change to:
import { mainMenuV2 } from './ui/menu-v2.js';  // New
```

## Contributing

When adding new services or configuration options:

1. Add to `SERVICES` array in `menu-v2.ts`
2. Create configuration function (e.g., `configureNewService()`)
3. Add to main menu choices
4. Update `.env.example` with new keys
5. Document in this file

## Support

For issues or questions:
1. Check "System Health" for configuration problems
2. Review `.env` file for syntax errors
3. Verify API keys and credentials
4. Check logs with `LOG_LEVEL=debug`
