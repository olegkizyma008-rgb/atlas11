# 📖 Детальні гайди

Глибокий розбір основних компонентів та їх налаштування.

## 📚 Зміст

- [Open Interpreter Bridge](#open-interpreter-bridge)
- [Accessibility & UI Control](#accessibility--ui-control)
- [RAG System](#rag-system)
- [Vision & LLM](#vision--llm)
- [Voice Services](#voice-services)

## Open Interpreter Bridge

**Файл**: `src/modules/tetyana/open_interpreter_bridge.ts`

### Що це?

Open Interpreter Bridge дозволяє системі виконувати Python код та складні завдання через окремий Python процес.

### Архітектура

```
TypeScript (Node.js)
        ↓
  Open Interpreter Bridge
        ↓
  Python Process (spawn)
        ↓
  mac_master_agent.py
        ↓
  macOS Accessibility API
```

### Основні функції

```typescript
// Виконання команди
execute(command: string): Promise<ExecutionResult>

// Перевірка середовища
checkEnvironment(): Promise<EnvironmentStatus>

// Отримання статусу
getStatus(): Promise<Status>
```

### Конфігурація

```typescript
const config = {
  pythonPath: '~/mac_assistant/venv/bin/python3',
  agentPath: '~/mac_assistant/mac_master_agent.py',
  timeout: 30000,
  env: {
    BRAIN_API_KEY: process.env.BRAIN_API_KEY,
    COPILOT_API_KEY: process.env.COPILOT_API_KEY,
    VISION_API_KEY: process.env.VISION_API_KEY,
  }
};
```

### Приклади використання

```bash
# Простий привіт
npm run cli -- "Скажи привіт"

# Відкриття додатку
npm run cli -- "Відкрий Калькулятор"

# Виконання команди
npm run cli -- "Скільки файлів у ~/Documents"

# Складне завдання
npm run cli -- "Відкрий Finder, перейди до Downloads, і скажи скільки там файлів"
```

**Детальніше**: [ETAP_2_OPEN_INTERPRETER_BRIDGE.md](../ETAP_2_OPEN_INTERPRETER_BRIDGE.md)

## Accessibility & UI Control

**Файл**: `src/kontur/mcp/servers/os.ts`

### Що це?

Система для контролю macOS UI через Accessibility API та AppleScript.

### Інструменти

#### 1. open_application
Відкриття додатків

```typescript
await osServer.open_application({
  name: "Calculator"
});
```

#### 2. keyboard_type / keyboard_press
Введення тексту та натиск клавіш

```typescript
// Введення тексту
await osServer.keyboard_type({
  text: "Hello World"
});

// Натиск клавіші
await osServer.keyboard_press({
  key: "Return"
});
```

#### 3. mouse_click
Клік мишею

```typescript
await osServer.mouse_click({
  x: 100,
  y: 200,
  button: "left"
});
```

#### 4. ui_tree
Отримання дерева UI елементів

```typescript
const tree = await osServer.ui_tree({
  focused: true
});
```

#### 5. ui_find
Пошук елементів за role/title

```typescript
const element = await osServer.ui_find({
  role: "AXButton",
  title: "OK"
});
```

#### 6. ui_action
Виконання дій на елементах

```typescript
await osServer.ui_action({
  element: element,
  action: "AXPress"
});
```

#### 7. execute_applescript
AppleScript для складної автоматизації

```typescript
await osServer.execute_applescript({
  script: `
    tell application "Finder"
      activate
      open home
    end tell
  `
});
```

#### 8. get_screenshot
Отримання скріншоту

```typescript
const screenshot = await osServer.get_screenshot();
```

### Native Helper

**Файл**: `bin/atlas-ui-helper` (Swift)

Низькорівневий доступ до Accessibility API для більш надійної роботи.

### AppleScript Fallback

Резервна система без залежностей для базових операцій.

**Детальніше**: [ETAP_3_ACCESSIBILITY_UI_CONTROL.md](../ETAP_3_ACCESSIBILITY_UI_CONTROL.md)

## RAG System

**Файл**: `~/mac_assistant/index_rag.py`

### Що це?

RAG (Retrieval-Augmented Generation) система дозволяє:
- Зберігати успішні рішення
- Шукати рішення в базі знань
- Автоматично навчатися на успішних кроках

### Компоненти

#### Vector Database (Chroma)
```
~/mac_assistant_rag/chroma_mac/
├── chroma.sqlite3
└── embeddings/
```

#### Knowledge Base
```
~/mac_assistant_rag/macOS-automation-knowledge-base/
├── automation-guide.md
├── ui-patterns.md
└── ...
```

#### Embedding Model
```
BAAI/bge-small-en-v1.5
```

### Налаштування

```bash
# Індексація бази знань
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

### Функціональність

```python
# Пошук рішень
results = search_rag("Як відкрити Finder?")

# Додавання нового рішення
add_to_rag(
  question="Як відкрити Finder?",
  answer="Натисніть Cmd+Space, введіть 'Finder', натисніть Enter"
)
```

**Детальніше**: [ETAP_4_RAG_SYSTEM.md](../ETAP_4_RAG_SYSTEM.md)

## Vision & LLM

**Файли**: 
- `src/kontur/vision/grisha-vision-service.ts`
- `src/kontur/cortex/unified-brain.ts`

### Vision Modes

#### LIVE Mode (Gemini Live)
- Реальний час потокова передача
- WebSocket з'єднання
- Безперервний аналіз екрану
- Найбільш інтелектуальний режим

#### ON-DEMAND Mode
- Скріншот після кроку
- Copilot/GPT-4o аналіз
- Більш економно за трафіком
- Швидший відгук

### LLM Providers

```typescript
// Основний провайдер
const response = await unifiedBrain.think(prompt, {
  primaryProvider: 'gemini',
  fallbackProviders: ['copilot', 'openai'],
  reasoning: true
});
```

### Reasoning (Gemini 3)

Глибоке мислення для складних завдань:

```typescript
const response = await unifiedBrain.think(prompt, {
  reasoning: true,
  thinkingBudget: 10000 // tokens
});
```

**Детальніше**: [ETAP_5_VISION_LLM_INTEGRATION.md](../ETAP_5_VISION_LLM_INTEGRATION.md)

## Voice Services

### Speech-to-Text (STT)

#### Gemini Live
- Реальний час розпізнавання
- Потокова передача
- Найкраща якість

#### Whisper
- Офлайн розпізнавання
- Без інтернету
- Менш точне

### Text-to-Speech (TTS)

#### Gemini TTS
- Природний голос
- Багато мов
- Найкраща якість

#### Ukrainian TTS
- Українська мова
- Локальна обробка
- Швидкий синтез

### Конфігурація

```env
STT_PROVIDER=gemini
TTS_PROVIDER=gemini
LANGUAGE=uk
```

**Детальніше**: [STT.md](./STT.md), [TTS.md](./TTS.md)

---

**Статус**: ✅ Всі компоненти готові до використання
