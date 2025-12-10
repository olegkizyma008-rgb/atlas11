# ⚙️ Конфігурація

Налаштування API ключів, провайдерів та середовища.

## 📋 Файл конфігурації

**Основний файл**: `/Users/dev/Documents/GitHub/atlas/.env`

## 🔑 API Ключі

### Gemini API

```env
VISION_API_KEY=REDACTED_GOOGLE_API_KEY
TTS_API_KEY=REDACTED_GOOGLE_API_KEY
STT_API_KEY=REDACTED_GOOGLE_API_KEY
VISION_LIVE_API_KEY=REDACTED_GOOGLE_API_KEY
VISION_ONDEMAND_API_KEY=REDACTED_GITHUB_TOKEN
```

### GitHub Copilot API

```env
BRAIN_API_KEY=REDACTED_GITHUB_TOKEN
COPILOT_API_KEY=REDACTED_GITHUB_TOKEN
REASONING_API_KEY=REDACTED_GITHUB_TOKEN
```

### OpenAI API (опціонально)

```env
OPENAI_API_KEY=sk-...
```

### Anthropic API (опціонально)

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Mistral API (опціонально)

```env
MISTRAL_API_KEY=...
```

**Детальніше**: [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)

## 🎯 Провайдери

### Основні провайдери

```env
# LLM (Brain)
BRAIN_PROVIDER=copilot
BRAIN_FALLBACK_PROVIDER=gemini

# Vision
VISION_PROVIDER=gemini
VISION_FALLBACK_PROVIDER=copilot

# Voice
STT_PROVIDER=gemini
TTS_PROVIDER=gemini

# Reasoning
REASONING_PROVIDER=gemini
REASONING_FALLBACK_PROVIDER=copilot
```

### Execution Engine

```env
EXECUTION_ENGINE=python-bridge
```

## 🐍 Python Integration

### Python Path

```env
PYTHON_PATH=/Users/dev/mac_assistant/venv/bin/python3
```

### Agent Path

```env
AGENT_PATH=/Users/dev/mac_assistant/mac_master_agent.py
```

### RAG Database

```env
RAG_DB_PATH=/Users/dev/mac_assistant_rag/chroma_mac
RAG_KNOWLEDGE_BASE=/Users/dev/mac_assistant_rag/macOS-automation-knowledge-base
```

## 🌐 Server Configuration

```env
# HTTP Server
HTTP_PORT=3000
HTTP_HOST=localhost

# WebSocket
WS_PORT=3001
WS_HOST=localhost

# Database
DATABASE_URL=sqlite:./atlas.db
```

## 🔐 Security

```env
# JWT Secret
JWT_SECRET=your-secret-key

# API Rate Limiting
RATE_LIMIT=100

# Timeout
REQUEST_TIMEOUT=30000
```

## 📝 Logging

```env
# Log Level
LOG_LEVEL=info

# Log Format
LOG_FORMAT=json
```

## 🎨 UI Configuration

```env
# Theme
THEME=dark

# Language
LANGUAGE=uk
```

## 🔄 Fallback System

Система автоматично перемикається між провайдерами при помилці:

```
Primary Provider → Fallback 1 → Fallback 2 → Fallback 3
```

### Приклад для LLM

```
Copilot → Gemini → OpenAI → Anthropic → Mistral
```

## ✅ Перевірка конфігурації

```bash
# Перевірити наявність .env файлу
ls -la /Users/dev/Documents/GitHub/atlas/.env

# Перевірити API ключі
grep "API_KEY" /Users/dev/Documents/GitHub/atlas/.env

# Перевірити Python
which python3
~/mac_assistant/venv/bin/python3 --version

# Перевірити RAG базу
ls -la ~/mac_assistant_rag/chroma_mac
```

## 🚀 Налаштування для розробки

### Development Environment

```env
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### Production Environment

```env
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
```

## 📚 Детальніше

- [ETAP_6_CONFIGURATION_DEPENDENCIES.md](../ETAP_6_CONFIGURATION_DEPENDENCIES.md)
- [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)
- [CONTEXT7_SETUP.md](./CONTEXT7_SETUP.md)

---

**Статус**: ✅ Налаштовано
