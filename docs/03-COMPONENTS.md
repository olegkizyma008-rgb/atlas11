# 🔧 Ключові компоненти (KONTUR v12)

Детальний опис основних компонентів системи v12 "Kozyr".

## 📚 Зміст

- [Open Interpreter Bridge](#open-interpreter-bridge)
- [Accessibility & UI Control](#accessibility--ui-control)
- [RAG System (Self-Healing)](#rag-system)
- [Vision & LLM Integration](#vision--llm-integration)
- [Voice Services](#voice-services)

## Open Interpreter Bridge

**Файл**: `src/modules/tetyana/open_interpreter_bridge.ts`

Інтеграція Open Interpreter для виконання Python кодів та завдань. У v12 це **основний** метод виконання складних задач.

### Основні функції v12

```typescript
// Виконання з Feedback Loop
executeWithVisionFeedback(command: string): Promise<string>
```

### Конфігурація

- **Python**: `~/mac_assistant/venv/bin/python3`
- **Agent**: `~/mac_assistant/mac_master_agent.py`
- **Environment**: Автоматичне завантаження .env змінних (мінімалістичний набір)

**Детальніше**: [ETAP_2_OPEN_INTERPRETER_BRIDGE.md](../ETAP_2_OPEN_INTERPRETER_BRIDGE.md)

## Accessibility & UI Control

**Файл**: `~/mac_assistant/mac_master_agent.py` (Python)

Повний контроль macOS UI через Accessibility API та AppleScript.

### Інструменти (Native Python)

- **AppleScript**: `osascript` через `subprocess`
- **Accessibility API**: `ApplicationServices` (через PyObjC)
- **Mouse/Keyboard**: `pyautogui` / `Quartz`

**Детальніше**: [ETAP_3_ACCESSIBILITY_UI_CONTROL.md](../ETAP_3_ACCESSIBILITY_UI_CONTROL.md)

## RAG System

**Файл**: `~/mac_assistant/index_rag.py`

Retrieval-Augmented Generation для самонавчання системи.

### Компоненти v12

- **Vector Database**: Chroma DB (`~/mac_assistant_rag/chroma_mac/`)
- **Knowledge Base**: `~/mac_assistant_rag/knowledge_base/` (GitHub Corpus)
- **Embedding Model**: `BAAI/bge-m3` (State of the art multilingual)
- **Framework**: LangChain

### Self-Healing
Система автоматично додає успішні патерни виконання в базу, якщо вони були верифіковані Grisha.

**Детальніше**: [ETAP_4_RAG_SYSTEM.md](../ETAP_4_RAG_SYSTEM.md)

## Vision & LLM Integration

**Файли**: 
- `src/kontur/vision/grisha-vision-service.ts`
- `src/kontur/cortex/unified-brain.ts`

### Vision Modes v12

#### LIVE Mode (Gemini Live)
- Потокова передача для надшвидкої реакції.

#### ON-DEMAND Mode (GPT-4o)
- Скріншот -> Аналіз -> Вердикт (Verified/Failed).
- Використовується в `executeWithVisionFeedback`.

### LLM Providers v12

- **Brain**: OpenAI / Copilot (Planner)
- **Vision**: Google Gemini / GPT-4o
- **Bridge**: Gemini 2.0 Flash (швидкість) або GPT-4o (точність)

**Детальніше**: [ETAP_5_VISION_LLM_INTEGRATION.md](../ETAP_5_VISION_LLM_INTEGRATION.md)

## Voice Services

**Файл**: `src/kontur/voice/voice-capsule.ts`

Спрощена система голосу.

- **STT**: Gemini Live / Browser Web Speech API
- **TTS**: Gemini / System Default

**Детальніше**: [STT.md](./STT.md), [TTS.md](./TTS.md)

---

**Статус**: ✅ Активно (v12)
