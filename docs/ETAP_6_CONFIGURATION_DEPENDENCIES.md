# ЕТАП 6: ДОСЛІДЖЕННЯ КОНФІГУРАЦІЙНИХ ФАЙЛІВ ТА ЗАЛЕЖНОСТЕЙ

## 📦 ЗАЛЕЖНОСТІ СИСТЕМИ

### Node.js Dependencies (package.json)

#### Основні залежності для KONTUR v11

```json
{
  "dependencies": {
    "@google/genai": "^1.31.0",
    "@google/generative-ai": "^0.24.1",
    "@modelcontextprotocol/sdk": "^1.24.3",
    "@anthropic-ai/sdk": "^0.71.2",
    "@mistralai/mistralai": "^1.10.0",
    "openai": "^4.0.0",
    "better-sqlite3": "^9.6.0",
    "drizzle-orm": "^0.29.5",
    "express": "^4.18.0",
    "ws": "^8.18.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@trpc/server": "^10.0.0",
    "@trpc/client": "^10.0.0",
    "zod": "^3.25.76",
    "uuid": "^9.0.0"
  }
}
```

**Групування за функціональністю:**

| Група | Пакети | Призначення |
|-------|--------|-----------|
| **AI Providers** | @google/genai, @google/generative-ai, openai, @anthropic-ai/sdk, @mistralai/mistralai | LLM та Vision API |
| **MCP Protocol** | @modelcontextprotocol/sdk | Model Context Protocol |
| **Database** | better-sqlite3, drizzle-orm | Локальна база даних |
| **Server** | express, ws | HTTP та WebSocket сервер |
| **Frontend** | react, react-dom, @trpc/client | React UI |
| **RPC** | @trpc/server, @trpc/client | Type-safe RPC |
| **Utilities** | zod, uuid, yaml, dotenv | Валідація та конфігурація |

### Python Dependencies (venv)

#### Встановлені пакети

```bash
# Core
open-interpreter==0.4.3          # Code execution engine
langchain==1.1.3                 # RAG framework
chromadb==1.3.5                  # Vector database
python-dotenv==1.0.0             # Environment variables

# macOS Integration
pyobjc-framework-Accessibility==12.1  # Accessibility API
pyobjc-framework-Quartz==12.1         # Quartz events
pyobjc-framework-AppKit==12.1         # AppKit utilities

# LLM Providers
google-generativeai==0.3.0        # Gemini API
openai==1.3.0                     # OpenAI API

# Utilities
requests==2.31.0                  # HTTP client
pydantic==2.0.0                   # Data validation
```

**Групування за функціональністю:**

| Група | Пакети | Призначення |
|-------|--------|-----------|
| **Execution** | open-interpreter | Виконання Python/AppleScript |
| **RAG** | langchain, chromadb | Retrieval-Augmented Generation |
| **macOS** | pyobjc-framework-* | Accessibility та UI control |
| **LLM** | google-generativeai, openai | API до моделей |
| **Utilities** | python-dotenv, requests, pydantic | Допоміжні функції |

## 🔧 КОНФІГУРАЦІЙНІ ФАЙЛИ

### 1. Atlas .env файл

**Шлях:** `/Users/dev/Documents/GitHub/atlas/.env`

#### Структура конфігурації

```bash
# === BRAIN (LLM) ===
BRAIN_PROVIDER=copilot
BRAIN_API_KEY=REDACTED_GITHUB_TOKEN
BRAIN_MODEL=gpt-4o
COPILOT_API_KEY=REDACTED_GITHUB_TOKEN

# === VISION (Live Mode) ===
VISION_MODE=live
VISION_LIVE_PROVIDER=gemini
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
VISION_LIVE_API_KEY=REDACTED_GOOGLE_API_KEY
VISION_LIVE_FALLBACK_PROVIDER=

# === VISION (On-Demand Mode) ===
VISION_ONDEMAND_PROVIDER=copilot
VISION_ONDEMAND_MODEL=gpt-4o
VISION_ONDEMAND_API_KEY=REDACTED_GITHUB_TOKEN
VISION_FALLBACK_MODE=on-demand

# === TTS (Text-to-Speech) ===
TTS_PROVIDER=gemini
TTS_MODEL=gemini-2.5-flash-preview-tts
TTS_API_KEY=REDACTED_GOOGLE_API_KEY

# === STT (Speech-to-Text) ===
STT_PROVIDER=gemini
STT_MODEL=gemini-2.5-flash
STT_API_KEY=REDACTED_GOOGLE_API_KEY

# === REASONING (Deep Thinking) ===
REASONING_API_KEY=REDACTED_GITHUB_TOKEN

# === EXECUTION ENGINE ===
EXECUTION_ENGINE=python-bridge  # або 'native'

# === ENVIRONMENT ===
NODE_ENV=development
```

#### Пояснення ключових змінних

| Змінна | Значення | Призначення |
|--------|----------|-----------|
| **BRAIN_PROVIDER** | copilot | Основний LLM провайдер |
| **VISION_MODE** | live | Режим Vision (live/on-demand) |
| **EXECUTION_ENGINE** | python-bridge | Execution engine (python-bridge/native) |
| **TTS_PROVIDER** | gemini | Text-to-Speech провайдер |
| **STT_PROVIDER** | gemini | Speech-to-Text провайдер |

### 2. Python .env завантаження

**Файл:** `open_interpreter_bridge.ts` (рядки 15-33)

```typescript
function loadEnvFile(): Record<string, string> {
    const envVars: Record<string, string> = {}
    try {
        if (fs.existsSync(ENV_FILE_PATH)) {
            const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8')
            envContent.split('\n').forEach(line => {
                const trimmed = line.trim()
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const [key, ...valueParts] = trimmed.split('=')
                    const value = valueParts.join('=').trim()
                    envVars[key.trim()] = value
                }
            })
        }
    } catch (error) {
        console.warn(`Could not load .env file: ${error}`)
    }
    return envVars
}
```

**Логіка:**
1. Читає файл `.env`
2. Парсить рядки у формат KEY=VALUE
3. Ігнорує коментарі (рядки з #)
4. Повертає об'єкт з усіма змінними

### 3. Python venv конфігурація

**Шлях:** `/Users/dev/mac_assistant/venv/`

#### Структура venv

```
venv/
├── bin/
│   ├── python3              # Python інтерпретатор
│   ├── pip                  # Package manager
│   ├── activate             # Activation script
│   └── ...
├── lib/
│   └── python3.12/
│       └── site-packages/   # Встановлені пакети
├── include/
└── pyvenv.cfg              # Конфігурація venv
```

#### Активація venv

```bash
# Активація
source ~/mac_assistant/venv/bin/activate

# Деактивація
deactivate
```

#### Встановлення залежностей

```bash
# Встановити всі залежності
pip install -r requirements.txt

# Встановити конкретний пакет
pip install open-interpreter==0.4.3
```

### 4. TypeScript конфігурація

**Файл:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./out"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out"]
}
```

**Ключові опції:**
- **target**: ES2020 (сучасний JavaScript)
- **strict**: true (суворі типи)
- **moduleResolution**: bundler (для Electron)

## 🔐 УПРАВЛІННЯ API КЛЮЧАМИ

### Безпека

#### ✅ Правильно
```bash
# Зберігати у .env файлі (не в git)
GEMINI_API_KEY=sk-...

# Завантажувати з environment
const apiKey = process.env.GEMINI_API_KEY
```

#### ❌ Неправильно
```bash
# Не зберігати в коді
const apiKey = "sk-..."

# Не комітити в git
git add .env
```

### Fallback система

```typescript
// Якщо основний ключ не знайдений
const apiKey = 
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_LIVE_API_KEY ||
    ''
```

## 📊 КОНФІГУРАЦІЙНА МАТРИЦЯ

### Вибір провайдерів

```
┌─────────────────────────────────────────────────────┐
│              PROVIDER SELECTION MATRIX              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  BRAIN (LLM)                                        │
│  ├─ Gemini (рекомендується)                         │
│  ├─ Copilot (GitHub)                               │
│  ├─ OpenAI (GPT-4o)                                 │
│  ├─ Anthropic (Claude)                              │
│  └─ Mistral                                         │
│                                                     │
│  VISION (Live)                                      │
│  ├─ Gemini Live (рекомендується)                    │
│  └─ Fallback: Copilot                               │
│                                                     │
│  VISION (On-Demand)                                 │
│  ├─ Copilot (рекомендується)                        │
│  └─ Fallback: Gemini                                │
│                                                     │
│  TTS (Text-to-Speech)                               │
│  ├─ Gemini (рекомендується)                         │
│  └─ Fallback: Google Cloud                          │
│                                                     │
│  STT (Speech-to-Text)                               │
│  ├─ Gemini (рекомендується)                         │
# 3. Запустити Electron app
npm run kontur:start

# 4. Тестувати Python bridge
python3 ~/mac_assistant/mac_master_agent.py "Відкрий Finder"
```

### Сценарій 2: Продакшн (Production)

```bash
# 1. Білд проекту
npm run build

# 2. Запустити білд
npm run preview

# 3. Розгортання
npm run deploy
```

### Сценарій 3: Тестування

```bash
# 1. Unit тести
npm run test

# 2. Type checking
npm run typecheck

# 3. Integration тести
npx ts-node test-bridge-environment.ts
```

## 📈 ГОТОВНІСТЬ КОНФІГУРАЦІЇ

| Компонент | Статус | Примітка |
|-----------|--------|---------|
| **Node.js deps** | ✅ 100% | Встановлено |
| **Python venv** | ✅ 100% | Налаштовано |
| **API ключі** | ✅ 100% | Налаштовано |
| **.env файл** | ✅ 100% | Готово |
| **TypeScript config** | ✅ 100% | Готово |
| **Permissions** | ⚠️ 80% | Потребує налаштування |
| **RAG indexing** | ⚠️ 50% | Потребує запуску |

## 🔄 КОНФІГУРАЦІЙНИЙ ПОТІК

```
┌──────────────────────────────────────────────────────┐
│  1. LOAD .env                                        │
│     └─ Читаємо конфігурацію з файлу                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│  2. VALIDATE CONFIG                                  │
│     ├─ Перевіряємо наявність API ключів             │
│     ├─ Перевіряємо вибір провайдерів                │
│     └─ Перевіряємо execution engine                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│  3. INITIALIZE PROVIDERS                             │
│     ├─ Ініціалізуємо Gemini provider                │
│     ├─ Ініціалізуємо Copilot provider               │
│     └─ Ініціалізуємо fallback providers             │
│                                                      │
├──────────────────────────────────────────────────────┤
│  4. SETUP SERVICES                                   │
│     ├─ Налаштовуємо Vision service                  │
│     ├─ Налаштовуємо TTS service                     │
│     ├─ Налаштовуємо STT service                     │
│     └─ Налаштовуємо Reasoning service               │
│                                                      │
├──────────────────────────────────────────────────────┤
│  5. START APPLICATION                                │
│     ├─ Запускаємо Electron app                      │
│     ├─ Запускаємо Python bridge                     │
│     └─ Запускаємо MCP servers                       │
│                                                      │
└──────────────────────────────────────────────────────┘
