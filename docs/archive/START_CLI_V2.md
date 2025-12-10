# KONTUR CLI v2 - Start Here

## 🚀 Quick Start (5 minutes)

### 1. Start the CLI
```bash
npm run cli
```

You should see the main menu with services listed.

### 2. Add API Key
```
Main Menu
→ Secrets & Keys
→ Gemini API Key
→ Enter your key (get from https://ai.google.dev)
→ Back
```

### 3. Configure Brain
```
Main Menu
→ Brain
→ Provider: gemini
→ Model: gemini-2.5-flash
→ Back
```

### 4. Check Health
```
Main Menu
→ System Health
→ Verify all components show OK
→ Back
```

### 5. Test
```bash
npm run cli "Open Calculator"
```

## 📚 Documentation

### For Quick Reference
- **[CLI_QUICK_REFERENCE.md](CLI_QUICK_REFERENCE.md)** - Commands and config keys (1 min)

### For Setup
- **[docs/CLI_GETTING_STARTED.md](docs/CLI_GETTING_STARTED.md)** - Complete setup guide (15 min)

### For Learning
- **[docs/CLI_README.md](docs/CLI_README.md)** - System overview (5 min)
- **[docs/CLI_EXAMPLES.md](docs/CLI_EXAMPLES.md)** - Usage examples (30 min)

### For Understanding
- **[docs/CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md)** - How it works (45 min)
- **[docs/CLI_BEST_PRACTICES.md](docs/CLI_BEST_PRACTICES.md)** - Best practices (30 min)

### For Migration
- **[docs/CLI_V1_VS_V2.md](docs/CLI_V1_VS_V2.md)** - What changed (15 min)

### For Navigation
- **[docs/CLI_INDEX.md](docs/CLI_INDEX.md)** - Documentation index

## 🎯 What's New in v2

✅ **Clean Design**
- No emojis
- Professional appearance
- Better spacing

✅ **Better Organization**
- Unified service configuration
- Separate "Secrets & Keys" section
- Clearer menu structure

✅ **New Features**
- Enable/disable operations
- Delete configurations
- Fallback system
- Health checking

✅ **Comprehensive Docs**
- 10 documentation files
- 3900+ lines of guides
- Examples and best practices

## 🔧 Common Tasks

### Add API Key
```
npm run cli
→ Secrets & Keys
→ Select key type
→ Enter value
→ Back
```

### Configure Service
```
npm run cli
→ [Service Name]
→ Provider: [select]
→ Model: [select]
→ Fallback: [optional]
→ Back
```

### Check System
```
npm run cli
→ System Health
→ Review status
→ Back
```

### Execute Task
```bash
npm run cli "Your task here"
```

## 📖 Learning Paths

### Path 1: Just Get Started (30 min)
1. This file (5 min)
2. [CLI_QUICK_REFERENCE.md](CLI_QUICK_REFERENCE.md) (5 min)
3. Try it: `npm run cli` (20 min)

### Path 2: Complete Learning (2 hours)
1. [docs/CLI_GETTING_STARTED.md](docs/CLI_GETTING_STARTED.md) (15 min)
2. [docs/CLI_README.md](docs/CLI_README.md) (10 min)
3. [docs/CLI_EXAMPLES.md](docs/CLI_EXAMPLES.md) (30 min)
4. [docs/CLI_SYSTEM_V2.md](docs/CLI_SYSTEM_V2.md) (30 min)
5. [docs/CLI_BEST_PRACTICES.md](docs/CLI_BEST_PRACTICES.md) (20 min)
6. Try it: `npm run cli` (15 min)

### Path 3: Developer Deep Dive (3 hours)
1. [docs/CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md) (60 min)
2. [docs/CLI_SYSTEM_V2.md](docs/CLI_SYSTEM_V2.md) (30 min)
3. Study code: `src/cli/ui/menu-v2.ts` (30 min)
4. [docs/CLI_BEST_PRACTICES.md](docs/CLI_BEST_PRACTICES.md) (30 min)
5. Try it: `npm run cli` (30 min)

## ✅ Success Checklist

After setup, you should be able to:
- [ ] Start CLI with `npm run cli`
- [ ] Navigate menus
- [ ] Add API keys
- [ ] Configure services
- [ ] Check system health
- [ ] Execute tasks

## 🆘 Troubleshooting

### CLI won't start
```bash
# Check Node.js version
node --version  # Should be 18+

# Install dependencies
npm install

# Build project
npm run build

# Try again
npm run cli
```

### Models not showing
```
npm run cli
→ Secrets & Keys
→ Verify API key is set
→ Try again
```

### Service not working
```
npm run cli
→ System Health
→ Check missing components
→ Configure missing items
```

## 📋 Configuration

### Minimal Setup
```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
EXECUTION_ENGINE=native
GEMINI_API_KEY=your-key
```

### Full Setup
```env
# Brain
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
BRAIN_FALLBACK_PROVIDER=openai

# Vision
VISION_MODE=live
VISION_LIVE_PROVIDER=gemini

# Execution
EXECUTION_ENGINE=python-bridge

# API Keys
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key

# Settings
APP_LANGUAGE=uk
LOG_LEVEL=info
```

## 🎓 Key Concepts

### Services
- **Brain**: Chat and planning
- **Vision**: Visual monitoring
- **TTS**: Text-to-speech
- **STT**: Speech-to-text
- **Reasoning**: Deep thinking
- **Execution**: Task runner

### Providers
- Gemini (Google)
- OpenAI (ChatGPT)
- Anthropic (Claude)
- Mistral
- Copilot (GitHub)
- Ukrainian (local)
- Web (browser)

### Features
- Multi-provider support
- Fallback system
- Dynamic model fetching
- Configuration persistence
- System health check

## 🔗 Quick Links

| Purpose | Link | Time |
|---------|------|------|
| Quick ref | [CLI_QUICK_REFERENCE.md](CLI_QUICK_REFERENCE.md) | 1 min |
| Setup | [docs/CLI_GETTING_STARTED.md](docs/CLI_GETTING_STARTED.md) | 15 min |
| Overview | [docs/CLI_README.md](docs/CLI_README.md) | 5 min |
| Examples | [docs/CLI_EXAMPLES.md](docs/CLI_EXAMPLES.md) | 30 min |
| Architecture | [docs/CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md) | 45 min |
| Practices | [docs/CLI_BEST_PRACTICES.md](docs/CLI_BEST_PRACTICES.md) | 30 min |
| Comparison | [docs/CLI_V1_VS_V2.md](docs/CLI_V1_VS_V2.md) | 15 min |
| Index | [docs/CLI_INDEX.md](docs/CLI_INDEX.md) | 5 min |

## 💡 Tips

1. **Start simple** - Configure only Brain first
2. **Test each step** - Verify after each change
3. **Use System Health** - Check status regularly
4. **Set fallbacks** - Ensure reliability
5. **Read examples** - Learn from patterns
6. **Backup config** - Save working setup

## 🚀 Next Steps

1. **Run CLI**: `npm run cli`
2. **Add API key**: Secrets & Keys section
3. **Configure Brain**: Brain section
4. **Check health**: System Health option
5. **Test task**: `npm run cli "test task"`
6. **Read docs**: Start with [CLI_GETTING_STARTED.md](docs/CLI_GETTING_STARTED.md)

## 📞 Support

- **Quick lookup**: [CLI_QUICK_REFERENCE.md](CLI_QUICK_REFERENCE.md)
- **Setup help**: [docs/CLI_GETTING_STARTED.md](docs/CLI_GETTING_STARTED.md)
- **Examples**: [docs/CLI_EXAMPLES.md](docs/CLI_EXAMPLES.md)
- **Architecture**: [docs/CLI_ARCHITECTURE.md](docs/CLI_ARCHITECTURE.md)
- **Best practices**: [docs/CLI_BEST_PRACTICES.md](docs/CLI_BEST_PRACTICES.md)

---

## Ready?

```bash
npm run cli
```

**Enjoy KONTUR CLI v2!** 🎉
