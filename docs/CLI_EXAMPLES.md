# KONTUR CLI v2 - Usage Examples

## Quick Start

### Start Interactive Configuration
```bash
npm run cli
```

This opens the main menu where you can navigate through all services and settings.

### Execute Direct Task
```bash
# English
npm run cli "Open Calculator"

# Ukrainian
npm run cli "Відкрий Калькулятор"
```

## Common Tasks

### 1. Configure Brain Service

**Scenario**: You want to use OpenAI instead of Gemini

```
Main Menu
  → Brain
    → Provider: gemini → openai
    → Model: (auto-fetches GPT models)
    → Select: gpt-4o
    → Back to Main Menu
```

**Result**: Brain now uses OpenAI's GPT-4o model

### 2. Set Up Vision with Fallback

**Scenario**: Use Gemini Live as primary, Copilot as fallback

```
Main Menu
  → Vision (Grisha)
    → Active Mode: live (already selected)
    → Live Stream
      → Provider: gemini
      → Model: gemini-2.5-flash-native-audio-preview-09-2025
      → Fallback: copilot
      → Back
    → Back to Main Menu
```

**Result**: Vision uses Gemini Live with Copilot fallback

### 3. Add API Key

**Scenario**: You got a new OpenAI API key

```
Main Menu
  → Secrets & Keys
    → OpenAI API Key (not set)
    → Enter your key
    → Saved!
    → Back to Main Menu
```

**Result**: OpenAI provider is now available for all services

### 4. Switch Execution Engine

**Scenario**: Enable Python Bridge for advanced automation

```
Main Menu
  → Execution
    → Engine: native → python-bridge
    → Back to Main Menu
```

**Result**: Agent now uses Open Interpreter for task execution

### 5. Configure Multiple Services

**Scenario**: Set up complete system with different providers

```
Main Menu
  → Brain
    → Provider: gemini
    → Model: gemini-2.5-pro
    → Fallback: openai
    → Back
  
  → Vision (Grisha)
    → Active Mode: live
    → Live Stream → Provider: gemini
    → Back
  
  → TTS
    → Provider: ukrainian
    → Back
  
  → Execution
    → Engine: python-bridge
    → Back
  
  → Secrets & Keys
    → Add GEMINI_API_KEY
    → Add OPENAI_API_KEY
    → Back
  
  → Exit
```

**Result**: Full system configured with:
- Gemini for Brain (fallback: OpenAI)
- Gemini Live for Vision
- Ukrainian TTS
- Python Bridge execution

## Configuration Patterns

### Pattern 1: Single Provider Setup
Use one provider for everything

```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
VISION_LIVE_PROVIDER=gemini
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
TTS_PROVIDER=gemini
STT_PROVIDER=gemini
REASONING_PROVIDER=gemini
GEMINI_API_KEY=your-key
```

### Pattern 2: Multi-Provider Setup
Different providers for different services

```env
BRAIN_PROVIDER=openai
BRAIN_MODEL=gpt-4o
VISION_LIVE_PROVIDER=gemini
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
TTS_PROVIDER=ukrainian
STT_PROVIDER=gemini
REASONING_PROVIDER=anthropic
REASONING_MODEL=claude-3-opus

GEMINI_API_KEY=gemini-key
OPENAI_API_KEY=openai-key
ANTHROPIC_API_KEY=anthropic-key
```

### Pattern 3: Fallback Setup
Primary + fallback for reliability

```env
BRAIN_PROVIDER=gemini
BRAIN_FALLBACK_PROVIDER=openai

VISION_LIVE_PROVIDER=gemini
VISION_LIVE_FALLBACK_PROVIDER=copilot

TTS_PROVIDER=ukrainian
TTS_FALLBACK_PROVIDER=gemini
TTS_FALLBACK2_PROVIDER=web
```

### Pattern 4: Development Setup
Minimal configuration for testing

```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
VISION_MODE=on-demand
VISION_ONDEMAND_PROVIDER=copilot
EXECUTION_ENGINE=native
GEMINI_API_KEY=test-key
```

## Troubleshooting Examples

### Problem: "Models not showing"

**Solution**:
```
Main Menu
  → Secrets & Keys
    → Check if API key is set for the provider
    → If not, add the key
    → Try again
```

### Problem: "Service not working"

**Solution**:
```
Main Menu
  → System Health
    → Check which components are missing
    → Configure missing components
    → Verify API keys are set
```

### Problem: "Want to disable a service temporarily"

**Solution**:
```
Main Menu
  → [Service Name]
    → Status: enabled → disabled
    → Back
```

### Problem: "Need to reset configuration"

**Solution**:
```
Main Menu
  → [Service Name]
    → Delete each configuration item
    → Or manually edit .env file
    → Or delete .env and start fresh
```

## Advanced Usage

### 1. Direct Environment Variable Access

You can also edit `.env` directly:

```bash
# View current configuration
cat .env

# Edit with your editor
nano .env
vim .env

# Reload CLI to see changes
npm run cli
```

### 2. Batch Configuration

Create a script to set multiple values:

```bash
#!/bin/bash
# setup.sh

npm run cli "Configure Brain to gemini"
npm run cli "Configure Vision to live"
npm run cli "Set Execution to python-bridge"
```

### 3. Configuration Validation

Check system health before running tasks:

```bash
npm run cli
# → System Health
# → Review all components
# → Fix any missing configuration
```

### 4. Testing Provider Configuration

Test if a provider works:

```bash
npm run cli
# → [Service Name]
# → Set provider and model
# → Run test task to verify
```

## Configuration File Examples

### Minimal Configuration
```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
VISION_MODE=on-demand
EXECUTION_ENGINE=native
GEMINI_API_KEY=your-key
```

### Production Configuration
```env
# Brain
BRAIN_PROVIDER=openai
BRAIN_MODEL=gpt-4o
BRAIN_FALLBACK_PROVIDER=gemini

# Vision
VISION_MODE=live
VISION_LIVE_PROVIDER=gemini
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
VISION_LIVE_FALLBACK_PROVIDER=copilot
VISION_ONDEMAND_PROVIDER=copilot
VISION_ONDEMAND_MODEL=gpt-4o

# Voice
TTS_PROVIDER=ukrainian
TTS_FALLBACK_PROVIDER=gemini
STT_PROVIDER=gemini
STT_FALLBACK_PROVIDER=web

# Reasoning
REASONING_PROVIDER=anthropic
REASONING_MODEL=claude-3-opus
REASONING_FALLBACK_PROVIDER=gemini

# Execution
EXECUTION_ENGINE=python-bridge

# API Keys
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
COPILOT_API_KEY=your-copilot-token
ANTHROPIC_API_KEY=your-anthropic-key

# App Settings
APP_LANGUAGE=uk
APP_THEME=dark
LOG_LEVEL=info
```

### Development Configuration
```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
VISION_MODE=on-demand
VISION_ONDEMAND_PROVIDER=copilot
TTS_PROVIDER=web
STT_PROVIDER=web
EXECUTION_ENGINE=native
GEMINI_API_KEY=test-key
APP_LANGUAGE=uk
LOG_LEVEL=debug
```

## Tips & Tricks

### 1. Quick Model Switching
Need to test different models quickly?
```
Main Menu → [Service] → Model → Select new model → Back
```

### 2. Provider Comparison
Test different providers for same service:
```
Main Menu → [Service] → Provider → Switch → Test
```

### 3. Fallback Testing
Verify fallback works:
1. Set primary provider
2. Set fallback provider
3. Run task
4. Disable primary provider
5. Run task again (should use fallback)

### 4. Configuration Backup
Save your configuration:
```bash
cp .env .env.backup
```

### 5. Reset to Defaults
Start fresh:
```bash
rm .env
npm run cli
# Configure from scratch
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Models not loading | Check API key in Secrets & Keys |
| Service not responding | Check System Health |
| Configuration not saving | Verify .env file permissions |
| Provider not available | Add API key for that provider |
| Task execution fails | Check Execution Engine setting |
| Vision not working | Verify Vision Mode and provider |

## Next Steps

1. **Start with minimal configuration** - Just Brain + Execution
2. **Add Vision** - Configure Grisha for task monitoring
3. **Add Voice** - Set up TTS/STT for voice interaction
4. **Add Fallbacks** - Ensure reliability with fallback providers
5. **Optimize** - Fine-tune models and settings based on usage

## Support

For detailed information:
- See `CLI_SYSTEM_V2.md` for system overview
- Check `.env.example` for all available options
- Review service documentation for specific providers
