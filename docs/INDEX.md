# 📚 Atlas Documentation Index (KONTUR v12)

Повна документація проекту KONTUR v12 "Kozyr" з системою автоматизації macOS.

## 🚀 Швидкий старт

- **[QUICK_START.md](../QUICK_START.md)** - Швидкий старт за 5 хвилин
- **[QUICK_START_v12.md](../QUICK_START_v12.md)** - Старт для KONTUR v12
- **[EXAMPLES.md](./EXAMPLES.md)** - 🧑‍🔬 Приклади використання (Simple, RAG, Vision)
- **[FAQ.md](./FAQ.md)** - ❓ Часті запитання

## 📖 Основна документація

### Архітектура & Дизайн
- **[ETAP_1_ARCHITECTURE_ANALYSIS.md](../ETAP_1_ARCHITECTURE_ANALYSIS.md)** - Аналіз архітектури системи
- **[KONTUR_v12_UPGRADE_GUIDE.md](../KONTUR_v12_UPGRADE_GUIDE.md)** - Гайд оновлення до v12
- **[01-GETTING_STARTED.md](./01-GETTING_STARTED.md)** - Детальний старт
- **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** - Архітектура v12 (Mermaid)

### Ключові компоненти
- **[03-COMPONENTS.md](./03-COMPONENTS.md)** - Огляд компонентів
- **[ETAP_2_OPEN_INTERPRETER_BRIDGE.md](../ETAP_2_OPEN_INTERPRETER_BRIDGE.md)** - Open Interpreter інтеграція
- **[ETAP_3_ACCESSIBILITY_UI_CONTROL.md](../ETAP_3_ACCESSIBILITY_UI_CONTROL.md)** - Доступ до UI (Accessibility API)
- **[ETAP_4_RAG_SYSTEM.md](../ETAP_4_RAG_SYSTEM.md)** - RAG система для самонавчання
- **[ETAP_5_VISION_LLM_INTEGRATION.md](../ETAP_5_VISION_LLM_INTEGRATION.md)** - Vision & LLM інтеграція

### Конфігурація
- **[04-CONFIGURATION.md](./04-CONFIGURATION.md)** - Налаштування .env
- **[API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)** - Гайд налаштування API ключів
- **[06-TROUBLESHOOTING.md](./06-TROUBLESHOOTING.md)** - Вирішення проблем
- **[07-ADVANCED.md](./07-ADVANCED.md)** - Просунуті налаштування

### API & Сервіси
- **[gemini_3.md](./gemini_3.md)** - Gemini 3 (Reasoning) інтеграція
- **[jemeni_live.md](./jemeni_live.md)** - Gemini Live (потокова передача)
- **[TTS.md](./TTS.md)** - Text-to-Speech сервіси
- **[STT.md](./STT.md)** - Speech-to-Text сервіси

### Інтеграції
- **[ATLAS_KONTUR_UNIFIED.md](./ATLAS_KONTUR_UNIFIED.md)** - Об'єднання Atlas + KONTUR

## 📊 Статус проекту

- **[ANALYSIS_COMPLETE_SUMMARY.md](../ANALYSIS_COMPLETE_SUMMARY.md)** - Повний аналіз реалізації
- **[ETAP_7_FINAL_SUMMARY.md](../ETAP_7_FINAL_SUMMARY.md)** - Фінальний звіт

## 🗂️ Структура папок

```
atlas/
├── docs/                          # Документація
│   ├── INDEX.md                   # Цей файл
│   ├── FAQ.md                     # Часті запитання
│   ├── EXAMPLES.md                # Приклади
│   ├── 01-GETTING_STARTED.md
│   ├── 02-ARCHITECTURE.md
│   ├── ...
│   └── README.md
├── src/                           # Вихідний код
│   ├── modules/                   # Модулі системи
│   ├── kontur/                    # KONTUR v12 ядро
│   └── ...
├── mac_assistant/                 # Python Bridge
│   ├── mac_master_agent.py
│   └── venv/
└── package.json
```

## 🎯 Рекомендований порядок читання

### Для новачків:
1. `01-GETTING_STARTED.md` - Базовий старт
2. `EXAMPLES.md` - Спробувати приклади
3. `FAQ.md` - Відповіді на питання

### Для архітекторів:
1. `02-ARCHITECTURE.md`
2. `KONTUR_v12_UPGRADE_GUIDE.md`

### Для налаштування:
1. `04-CONFIGURATION.md`
2. `06-TROUBLESHOOTING.md`

## 🔗 Зовнішні ресурси

- [Open Interpreter Docs](https://docs.openinterpreter.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [LangChain Docs](https://python.langchain.com/)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

**Версія:** KONTUR v12 "Kozyr"
