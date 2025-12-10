# KONTUR CLI - Quick Reference

## Commands

### Start Interactive CLI
```bash
npm run cli
```

### Execute Task Directly
```bash
npm run cli "Task description"
npm run cli "Відкрий Калькулятор"
```

## Main Menu Options

| Option | Purpose |
|--------|---------|
| **Brain** | Configure chat/planning service |
| **TTS** | Configure text-to-speech |
| **STT** | Configure speech-to-text |
| **Vision** | Configure visual monitoring (Grisha) |
| **Reasoning** | Configure deep thinking service |
| **Execution** | Choose execution engine (Python/Native) |
| **Secrets & Keys** | Manage API credentials |
| **App Settings** | Configure language, theme, logging |
| **System Health** | Verify configuration status |
| **Run macOS Agent** | Execute Python automation |
| **Test Tetyana** | Test natural language mode |

## Configuration Keys

### Brain Service
```env
BRAIN_PROVIDER=gemini|openai|anthropic|mistral|copilot
BRAIN_MODEL=model-name
BRAIN_FALLBACK_PROVIDER=provider-name
```

### Vision Service
```env
VISION_MODE=live|on-demand
VISION_LIVE_PROVIDER=gemini
VISION_LIVE_MODEL=model-name
VISION_LIVE_FALLBACK_PROVIDER=copilot
VISION_ONDEMAND_PROVIDER=copilot
VISION_ONDEMAND_MODEL=gpt-4o
```

### Voice Services
```env
TTS_PROVIDER=ukrainian|gemini|web
TTS_FALLBACK_PROVIDER=provider-name
TTS_FALLBACK2_PROVIDER=provider-name
STT_PROVIDER=gemini|web
STT_FALLBACK_PROVIDER=provider-name
```

### Reasoning Service
```env
REASONING_PROVIDER=gemini|openai|anthropic
REASONING_MODEL=model-name
REASONING_FALLBACK_PROVIDER=provider-name
```

### Execution Engine
```env
EXECUTION_ENGINE=python-bridge|native
```

### API Keys
```env
GEMINI_API_KEY=your-key
COPILOT_API_KEY=your-token
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
MISTRAL_API_KEY=your-key
```

### App Settings
```env
APP_LANGUAGE=uk|en
APP_THEME=dark|light
LOG_LEVEL=debug|info|warn|error
```

## Common Workflows

### Setup Brain Service
```
npm run cli
→ Brain
→ Provider: gemini
→ Model: gemini-2.5-flash
→ Fallback: openai
→ Back
```

### Add API Key
```
npm run cli
→ Secrets & Keys
→ Gemini API Key
→ Enter key
→ Back
```

### Configure Vision
```
npm run cli
→ Vision
→ Active Mode: live
→ Live Stream
→ Provider: gemini
→ Back
```

### Check System Health
```
npm run cli
→ System Health
→ Review status
→ Back
```

## Status Indicators

| Status | Meaning |
|--------|---------|
| `not set` | Configuration missing |
| `enabled` | Service is active |
| `disabled` | Service configured but inactive |
| `OK` | Component working |
| `MISSING` | Component not configured |

## Providers

| Provider | Models | API Key |
|----------|--------|---------|
| **Gemini** | gemini-2.5-flash, gemini-2.5-pro, gemini-3-pro-preview | GEMINI_API_KEY |
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo | OPENAI_API_KEY |
| **Anthropic** | claude-3-5-sonnet, claude-3-opus, claude-3-haiku | ANTHROPIC_API_KEY |
| **Mistral** | mistral-large, mistral-medium, mistral-small | MISTRAL_API_KEY |
| **Copilot** | gpt-4o, claude-sonnet-4, gemini-2.5-pro | COPILOT_API_KEY |
| **Ukrainian** | tetiana, lada, mykyta, dmytro, oleksa | None |
| **Web** | Browser native | None |

## Troubleshooting

### Models Not Showing
```
→ Secrets & Keys
→ Check API key for provider
→ Add key if missing
→ Try again
```

### Service Not Working
```
→ System Health
→ Check missing components
→ Configure missing items
→ Verify API keys
```

### Configuration Not Saving
```
Check .env file permissions
Verify disk space
Ensure file is not locked
```

## File Locations

| File | Purpose |
|------|---------|
| `.env` | Configuration storage |
| `.env.example` | Configuration template |
| `src/cli/index.ts` | CLI entry point |
| `src/cli/ui/menu-v2.ts` | Main menu |
| `src/cli/managers/config-manager.ts` | Config file management |

## Documentation

- **[CLI_README.md](docs/CLI_README.md)** - Overview
- **[CLI_SYSTEM_V2.md](docs/CLI_SYSTEM_V2.md)** - System details
- **[CLI_EXAMPLES.md](docs/CLI_EXAMPLES.md)** - Usage examples
- **[CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md)** - Technical details
- **[CLI_BEST_PRACTICES.md](docs/CLI_BEST_PRACTICES.md)** - Best practices
- **[CLI_V1_VS_V2.md](docs/CLI_V1_VS_V2.md)** - Version comparison

## Tips

1. **Start simple** - Configure only Brain + Execution first
2. **Test each service** - Use System Health to verify
3. **Set fallbacks** - Ensure reliability with backup providers
4. **Backup config** - `cp .env .env.backup`
5. **Check health regularly** - Verify configuration status

## Quick Setup

```bash
# 1. Start CLI
npm run cli

# 2. Configure Brain
→ Brain → Provider: gemini → Model: gemini-2.5-flash

# 3. Add API Key
→ Secrets & Keys → Gemini API Key → Enter key

# 4. Configure Vision
→ Vision → Mode: live → Provider: gemini

# 5. Check Health
→ System Health → Verify all OK

# 6. Test
npm run cli "Open Calculator"
```

## Support

For detailed help:
- Check documentation in `/docs`
- Review `.env.example` for all options
- Run System Health check
- Enable debug logging: `LOG_LEVEL=debug npm run cli`

---

**Start now**: `npm run cli`
