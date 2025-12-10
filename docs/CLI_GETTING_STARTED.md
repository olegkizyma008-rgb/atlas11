# KONTUR CLI v2 - Getting Started Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- `.env` file in project root (or use `.env.example` as template)

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Project
```bash
npm run build
```

### 3. Verify Installation
```bash
npm run cli
# Should show main menu
```

## First Time Setup

### Step 1: Start CLI
```bash
npm run cli
```

You should see:
```
KONTUR SYSTEM CONFIGURATOR
──────────────────────────────────────────────────

Brain            not set / not set
TTS              not set / not set
STT              not set / not set
Vision           not set / not set
Reasoning        not set / not set
Execution        not set
──────────────────────────────────────────────────
Secrets & Keys
App Settings
System Health
──────────────────────────────────────────────────
Run macOS Agent
Test Tetyana
Exit
```

### Step 2: Add API Key
```
Main Menu
→ Secrets & Keys
→ Gemini API Key
→ Enter your key (get from https://ai.google.dev)
→ Back
```

### Step 3: Configure Brain Service
```
Main Menu
→ Brain
→ Provider: gemini
→ Model: gemini-2.5-flash
→ Fallback: (optional)
→ Back
```

### Step 4: Configure Execution Engine
```
Main Menu
→ Execution
→ Engine: native (or python-bridge if available)
→ Back
```

### Step 5: Verify Configuration
```
Main Menu
→ System Health
→ Check all components show OK
→ Back
```

### Step 6: Test
```bash
npm run cli "Open Calculator"
```

## Common Setup Scenarios

### Scenario 1: Minimal Setup (Brain Only)

**Time**: ~5 minutes

```bash
npm run cli
# 1. Secrets & Keys → Add GEMINI_API_KEY
# 2. Brain → Provider: gemini, Model: gemini-2.5-flash
# 3. Execution → Engine: native
# 4. System Health → Verify
```

**Result**: Basic chat and task execution

### Scenario 2: Full Setup (All Services)

**Time**: ~15 minutes

```bash
npm run cli
# 1. Secrets & Keys → Add all API keys
# 2. Brain → Configure with fallback
# 3. Vision → Configure Live Stream
# 4. TTS → Configure Ukrainian
# 5. STT → Configure Gemini
# 6. Reasoning → Configure
# 7. Execution → Configure Python Bridge
# 8. System Health → Verify all
```

**Result**: Complete system with all features

### Scenario 3: Development Setup

**Time**: ~10 minutes

```bash
npm run cli
# 1. Secrets & Keys → Add GEMINI_API_KEY
# 2. Brain → Provider: gemini, Model: gemini-2.5-flash
# 3. Vision → Mode: on-demand, Provider: copilot
# 4. Execution → Engine: native
# 5. App Settings → LOG_LEVEL: debug
# 6. System Health → Verify
```

**Result**: Development environment with debugging

## Configuration Walkthrough

### Adding API Key

1. Start CLI: `npm run cli`
2. Select: `Secrets & Keys`
3. Choose: `Gemini API Key`
4. Enter: Your API key from https://ai.google.dev
5. Confirm: "Saved!"

### Configuring Service

1. Start CLI: `npm run cli`
2. Select: `Brain` (or any service)
3. Choose: `Provider`
4. Select: `gemini`
5. Choose: `Model`
6. Select: `gemini-2.5-flash`
7. Back to main menu

### Setting Fallback

1. In service menu
2. Choose: `Fallback`
3. Select: `openai` (or another provider)
4. Back to main menu

### Checking Status

1. Start CLI: `npm run cli`
2. Select: `System Health`
3. Review status of all components
4. Back to main menu

## Troubleshooting

### Issue: "Models not showing"

**Cause**: API key not set or invalid

**Solution**:
```bash
npm run cli
→ Secrets & Keys
→ Verify API key is set
→ Try again
```

### Issue: "Provider not available"

**Cause**: API key not set for that provider

**Solution**:
```bash
npm run cli
→ Secrets & Keys
→ Add API key for provider
→ Try again
```

### Issue: "Configuration not saving"

**Cause**: .env file permissions or disk space

**Solution**:
```bash
# Check permissions
ls -la .env

# Check disk space
df -h

# Try again
npm run cli
```

### Issue: "Service not working"

**Cause**: Missing configuration

**Solution**:
```bash
npm run cli
→ System Health
→ Check missing components
→ Configure missing items
```

## Environment Variables

### Required
```env
GEMINI_API_KEY=your-key
```

### Optional
```env
COPILOT_API_KEY=your-token
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
MISTRAL_API_KEY=your-key
```

### Service Configuration
```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
VISION_MODE=live
EXECUTION_ENGINE=native
```

### App Settings
```env
APP_LANGUAGE=uk
APP_THEME=dark
LOG_LEVEL=info
```

## File Structure

```
atlas/
├── .env                          # Configuration file
├── .env.example                  # Configuration template
├── src/cli/
│   ├── index.ts                 # Entry point
│   ├── ui/
│   │   ├── menu-v2.ts          # Main menu
│   │   ├── config-list.ts       # Configuration UI
│   │   └── prompts.ts           # Prompt utilities
│   └── managers/
│       ├── config-manager.ts    # Config management
│       └── model-registry.ts    # Model fetching
└── docs/
    ├── CLI_README.md
    ├── CLI_SYSTEM_V2.md
    ├── CLI_EXAMPLES.md
    ├── CLI_ARCHITECTURE.md
    ├── CLI_BEST_PRACTICES.md
    └── CLI_V1_VS_V2.md
```

## Next Steps

### After Basic Setup
1. ✅ Configure Brain service
2. ✅ Add API key
3. ✅ Test basic task
4. → Read [CLI_EXAMPLES.md](CLI_EXAMPLES.md) for more patterns

### After Full Setup
1. ✅ Configure all services
2. ✅ Set fallback providers
3. ✅ Test all features
4. → Read [CLI_BEST_PRACTICES.md](CLI_BEST_PRACTICES.md) for optimization

### For Development
1. ✅ Review [CLI_ARCHITECTURE.md](CLI_ARCHITECTURE.md)
2. ✅ Study code patterns in menu-v2.ts
3. ✅ Follow guidelines in [CLI_BEST_PRACTICES.md](CLI_BEST_PRACTICES.md)
4. → Contribute improvements

## Quick Reference

| Task | Command |
|------|---------|
| Start CLI | `npm run cli` |
| Execute task | `npm run cli "Task"` |
| Check health | `npm run cli` → System Health |
| Add API key | `npm run cli` → Secrets & Keys |
| Configure service | `npm run cli` → [Service] |
| View config | `cat .env` |
| Backup config | `cp .env .env.backup` |

## Getting Help

### Documentation
- **Quick Start**: This file
- **Overview**: [CLI_README.md](CLI_README.md)
- **Examples**: [CLI_EXAMPLES.md](CLI_EXAMPLES.md)
- **Architecture**: [CLI_ARCHITECTURE.md](CLI_ARCHITECTURE.md)
- **Best Practices**: [CLI_BEST_PRACTICES.md](CLI_BEST_PRACTICES.md)

### Debugging
```bash
# Enable debug logging
LOG_LEVEL=debug npm run cli

# Check configuration
cat .env

# Verify API keys
npm run cli → Secrets & Keys

# Check system health
npm run cli → System Health
```

## Support Resources

1. **Check System Health** - Identifies missing configuration
2. **Review Examples** - See common patterns
3. **Read Architecture** - Understand how it works
4. **Follow Best Practices** - Optimize your setup

## Success Indicators

✅ You're ready when:
- [ ] CLI starts without errors
- [ ] Can navigate menus
- [ ] Can add API keys
- [ ] Can configure services
- [ ] System Health shows all OK
- [ ] Can execute a test task

## Common Commands

```bash
# Start interactive CLI
npm run cli

# Execute task directly
npm run cli "Open Calculator"

# Execute in Ukrainian
npm run cli "Відкрий Калькулятор"

# Build project
npm run build

# Run tests
npm test

# Check configuration
cat .env
```

## Tips for Success

1. **Start simple** - Configure only what you need
2. **Test each step** - Verify after each change
3. **Use System Health** - Check status regularly
4. **Set fallbacks** - Ensure reliability
5. **Backup config** - Save working configuration
6. **Read examples** - Learn from patterns
7. **Check docs** - Find answers in documentation

## Estimated Time

| Setup | Time |
|-------|------|
| Minimal (Brain only) | 5 min |
| Standard (Brain + Vision) | 10 min |
| Full (All services) | 15 min |
| Development | 10 min |

## Next: Learn More

After completing setup:
1. Read [CLI_EXAMPLES.md](CLI_EXAMPLES.md) for usage patterns
2. Review [CLI_ARCHITECTURE.md](CLI_ARCHITECTURE.md) for technical details
3. Check [CLI_BEST_PRACTICES.md](CLI_BEST_PRACTICES.md) for optimization
4. Explore [CLI_SYSTEM_V2.md](CLI_SYSTEM_V2.md) for full feature list

---

**Ready to start?** Run: `npm run cli`
