# 🔧 Ключові компоненти

Детальний опис основних компонентів системи.

## 📚 Зміст

- [Open Interpreter Bridge](#open-interpreter-bridge)
- [Accessibility & UI Control](#accessibility--ui-control)
- [RAG System](#rag-system)
- [Vision & LLM Integration](#vision--llm-integration)
- [Voice Services](#voice-services)

## Open Interpreter Bridge

**Файл**: `src/modules/tetyana/open_interpreter_bridge.ts`

Інтеграція Open Interpreter для виконання Python кодів та завдань.

### Основні функції

```typescript
execute(command: string): Promise<ExecutionResult>
checkEnvironment(): Promise<EnvironmentStatus>
```

### Конфігурація

- **Python**: `~/mac_assistant/venv/bin/python3`
- **Agent**: `~/mac_assistant/mac_master_agent.py`
- **Environment**: Автоматичне завантаження .env змінних

### Приклад використання

```bash
npm run cli -- "Відкрий Калькулятор"
```

**Детальніше**: [ETAP_2_OPEN_INTERPRETER_BRIDGE.md](../ETAP_2_OPEN_INTERPRETER_BRIDGE.md)

## Accessibility & UI Control

**Файл**: `src/kontur/mcp/servers/os.ts`

Повний контроль macOS UI через Accessibility API.

### Інструменти

- `open_application` - Відкриття додатків
- `keyboard_type` / `keyboard_press` - Введення тексту та натиск клавіш
- `mouse_click` - Клік мишею
- `ui_tree` - Отримання дерева UI елементів
- `ui_find` - Пошук елементів за role/title
- `ui_action` - Виконання дій на елементах
- `execute_applescript` - AppleScript для складної автоматизації
- `get_screenshot` - Отримання скріншоту

### Native Helper

- **Файл**: `bin/atlas-ui-helper` (Swift)
- **Розмір**: 120976 байт
- **Функціональність**: Низькорівневий доступ до Accessibility API

### AppleScript Fallback

Резервна система без залежностей для базових операцій.

**Детальніше**: [ETAP_3_ACCESSIBILITY_UI_CONTROL.md](../ETAP_3_ACCESSIBILITY_UI_CONTROL.md)

## RAG System

**Файл**: `~/mac_assistant/index_rag.py`

Retrieval-Augmented Generation для самонавчання системи.

### Компоненти

- **Vector Database**: Chroma DB (`~/mac_assistant_rag/chroma_mac/`)
- **Knowledge Base**: `~/mac_assistant_rag/macOS-automation-knowledge-base/`
- **Embedding Model**: `BAAI/bge-small-en-v1.5`
- **Framework**: LangChain

### Налаштування

```bash
# Індексація бази знань
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

### Функціональність

- Пошук рішень у базі знань
- Автоматичне навчання на успішних кроках
- Адаптація до змін UI

**Детальніше**: [ETAP_4_RAG_SYSTEM.md](../ETAP_4_RAG_SYSTEM.md)

## Vision & LLM Integration

**Файли**: 
- `src/kontur/vision/grisha-vision-service.ts`
- `src/kontur/cortex/unified-brain.ts`

### Vision Modes

#### LIVE Mode (Gemini Live)
- Реальний час потокова передача
- WebSocket з'єднання
- Безперервний аналіз екрану

#### ON-DEMAND Mode
- Скріншот після кроку
- Copilot/GPT-4o аналіз
- Більш економно за трафіком

### LLM Providers

- **Gemini** (основний)
- **Copilot** (fallback)
- **OpenAI** (резервний)
- **Anthropic** (резервний)
- **Mistral** (резервний)

### Unified Brain

Об'єднаний мозок з автоматичним fallback:

```typescript
const response = await unifiedBrain.think(prompt, {
  primaryProvider: 'gemini',
  fallbackProviders: ['copilot', 'openai'],
  reasoning: true
});
```

**Детальніше**: [ETAP_5_VISION_LLM_INTEGRATION.md](../ETAP_5_VISION_LLM_INTEGRATION.md)

## Voice Services

### Speech-to-Text (STT)

- **Gemini Live** - реальний час
- **Whisper** - офлайн розпізнавання

### Text-to-Speech (TTS)

- **Gemini TTS** - природний голос
- **Ukrainian TTS** - українська мова
- **Web TTS** - браузер синтез

### Конфігурація

```env
STT_PROVIDER=gemini
TTS_PROVIDER=gemini
```

**Детальніше**: [STT.md](./STT.md), [TTS.md](./TTS.md)

## 🔗 Зв'язки між компонентами

```
┌─────────────────────────────────────────┐
│         User Input (Text/Voice)         │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │  STT Service │
        └──────┬──────┘
               │
        ┌──────▼──────────────────┐
        │   Unified Brain (LLM)   │
        │  - Gemini (primary)     │
        │  - Copilot (fallback)   │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │  Vision Service (LIVE)  │
        │  - Gemini Live API      │
        │  - Real-time analysis   │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │  Accessibility Layer    │
        │  - UI Tree              │
        │  - Mouse/Keyboard       │
        │  - AppleScript          │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │   macOS UI Control      │
        │  - Open apps            │
        │  - Click elements       │
        │  - Type text            │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │    RAG System           │
        │  - Store solutions      │
        │  - Learn from success   │
        └──────┬──────────────────┘
               │
        ┌──────▼──────────────────┐
        │   TTS Service           │
        │  - Gemini TTS           │
        │  - Ukrainian voice      │
        └──────────────────────────┘
```

---

**Детальніше**: Див. окремі документи для кожного компонента
