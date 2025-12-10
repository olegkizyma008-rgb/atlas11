# 🏗️ Архітектура системи

Детальний огляд архітектури KONTUR v12 та Atlas.

## 📋 Загальна архітектура

**KONTUR v12** - це потужна система автоматизації macOS з модульною архітектурою, що складається з:

1. **Frontend (Electron)** - TypeScript + React + TailwindCSS
2. **Backend Core (Node.js)** - KONTUR v12 ядро
3. **Python Bridge** - Open Interpreter для виконання завдань
4. **macOS Integration** - Accessibility API та UI Control

## 🗂️ Структура проекту

### Atlas Project (`/Users/dev/Documents/GitHub/atlas/`)

```
atlas/
├── src/
│   ├── main/                 # Electron main process
│   ├── renderer/             # React frontend
│   ├── kontur/              # 🧠 KONTUR v12 Core System
│   │   ├── core/            # Core dispatcher & synapse
│   │   ├── cortex/          # Brain & unified brain
│   │   ├── providers/       # AI providers (Gemini, Copilot, etc.)
│   │   ├── vision/          # Vision services
│   │   ├── voice/           # Voice services (STT/TTS)
│   │   ├── mcp/             # MCP servers
│   │   └── protocol/        # KPP Protocol
│   ├── modules/             # Feature modules
│   │   └── tetyana/         # Tetyana executor
│   └── shared/              # Shared utilities
├── docs/                    # 📚 Документація
├── package.json             # Dependencies & scripts
├── .env                     # Configuration
└── electron.vite.config.ts  # Build configuration
```

### Mac Assistant (`/Users/dev/mac_assistant/`)

```
mac_assistant/
├── mac_master_agent.py      # 🎯 Main Python agent
├── mac_accessibility.py     # 🖱️ Accessibility utilities
├── index_rag.py            # 📚 RAG indexing
├── venv/                   # Python virtual environment
└── README.md               # Documentation
```

## 🔄 Основні компоненти

### 1. KONTUR v12 Core

- **Core Dispatcher** - центральний маршрутизатор пакетів
- **Synapse** - шина подій для координації
- **Cortex Brain** - центральний мозок системи
- **Unified Brain** - об'єднаний мозок з fallback системою

### 2. Protocol Layer (KPP)

- **KPP_Schema** - схема пакетів
- **PacketIntent** - типи намірів
- **SecurityScope** - рівні безпеки
- **verifyPacket** / **computeIntegrity** - перевірка цілісності

### 3. Providers System

- **Multi-provider Router** - підтримка Gemini, Copilot, OpenAI, Anthropic, Mistral
- **Fallback система** - автоматичне перемикання між провайдерами
- **Provider Config** - централізована конфігурація

### 4. Vision System

- **LIVE Mode**: Gemini Live API (реальний час)
- **ON-DEMAND Mode**: GPT-4o/Copilot (скріншоти)
- **GrishaVisionService** - унітарний сервіс
- **GrishaObserver** - спостереження за виконанням

### 5. Voice System

- **STT Services**: Gemini Live, Whisper
- **TTS Services**: Gemini TTS, Ukrainian TTS
- **VoiceCapsule** - інтеграція голосу

### 6. Accessibility System

- **Swift UI Helper** - низькорівневий доступ до Accessibility API
- **MCP OS Server** - стандартний MCP сервер з інструментами
- **AppleScript fallback** - резервна система

## 🐍 Python Integration

### Open Interpreter Bridge

- **Файл**: `src/modules/tetyana/open_interpreter_bridge.ts`
- **Функція**: Запуск Python агента через spawn
- **Environment**: Автоматичне завантаження .env змінних
- **Paths**:
  - Python: `~/mac_assistant/venv/bin/python3`
  - Agent: `~/mac_assistant/mac_master_agent.py`

### mac_master_agent.py

- **LLM**: Gemini 2.0-flash або GPT-4o (з fallback)
- **Vision**: Увімкнено (gpt-4o модель)
- **Accessibility**: Повний доступ (mouse, keyboard, display)
- **Custom Instructions**: Українська мова, AppleScript приклади
- **RAG**: Інтеграція з Chroma DB

### mac_accessibility.py

- **Framework**: PyObjC (Quartz + Accessibility)
- **Functions**: click_element(), get_ax_attribute()
- **Direct UI Control**: AXUIElement manipulation
- **Mouse Events**: Quartz CGEvent APIs

## 📊 Залежності

### Node.js Dependencies (основні)

- **@google/genai** / **@google/generative-ai** - Gemini integration
- **openai** - OpenAI integration
- **@anthropic-ai/sdk** - Anthropic integration
- **@mistralai/mistralai** - Mistral integration
- **@modelcontextprotocol/sdk** - MCP support
- **better-sqlite3** - Database
- **drizzle-orm** - ORM
- **express** - HTTP server
- **ws** - WebSocket support
- **react** / **@trpc** - Frontend stack

### Python Dependencies (в venv)

- **open-interpreter** - Code execution
- **langchain** - RAG functionality
- **chromadb** - Vector database
- **pyobjc-framework-Accessibility** - macOS accessibility
- **python-dotenv** - Environment variables

## 🎯 Ключові особливості

1. **Модульна архітектура** - легко додавати нові компоненти
2. **Multi-provider fallback** - надійність через резервні системи
3. **Real-time Vision** - Gemini Live для потокового аналізу
4. **Accessibility Integration** - повний контроль macOS UI
5. **RAG Ready** - готова інтеграція з базою знань
6. **Ukrainian Language** - нативна підтримка української мови
7. **Electron App** - desktop додаток з React UI

## 📈 Готовність системи

- ✅ **Архітектура**: 100% готово
- ✅ **Конфігурація**: 100% готово  
- ✅ **Dependencies**: 100% встановлено
- ✅ **Python Bridge**: 100% готово
- ✅ **Accessibility**: 100% готово
- ⚠️ **RAG Indexing**: потребує запуску `index_rag.py`
- ⚠️ **Permissions**: потребує налаштування в System Settings

---

**Детальніше:** [ETAP_1_ARCHITECTURE_ANALYSIS.md](../ETAP_1_ARCHITECTURE_ANALYSIS.md)
