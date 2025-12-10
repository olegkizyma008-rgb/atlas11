# 📚 Atlas Documentation Index

Повна документація проекту KONTUR v12 з системою автоматизації macOS.

## 🚀 Швидкий старт

- **[QUICK_START.md](../QUICK_START.md)** - Швидкий старт за 5 хвилин
- **[QUICK_START_v12.md](../QUICK_START_v12.md)** - Старт для KONTUR v12

## 📖 Основна документація

### Архітектура & Дизайн
- **[ETAP_1_ARCHITECTURE_ANALYSIS.md](../ETAP_1_ARCHITECTURE_ANALYSIS.md)** - Аналіз архітектури системи
- **[KONTUR_v12_UPGRADE_GUIDE.md](../KONTUR_v12_UPGRADE_GUIDE.md)** - Гайд оновлення до v12

### Ключові компоненти
- **[ETAP_2_OPEN_INTERPRETER_BRIDGE.md](../ETAP_2_OPEN_INTERPRETER_BRIDGE.md)** - Open Interpreter інтеграція
- **[ETAP_3_ACCESSIBILITY_UI_CONTROL.md](../ETAP_3_ACCESSIBILITY_UI_CONTROL.md)** - Доступ до UI (Accessibility API)
- **[ETAP_4_RAG_SYSTEM.md](../ETAP_4_RAG_SYSTEM.md)** - RAG система для самонавчання
- **[ETAP_5_VISION_LLM_INTEGRATION.md](../ETAP_5_VISION_LLM_INTEGRATION.md)** - Vision & LLM інтеграція

### Конфігурація
- **[ETAP_6_CONFIGURATION_DEPENDENCIES.md](../ETAP_6_CONFIGURATION_DEPENDENCIES.md)** - Залежності та конфігурація
- **[CONTEXT7_SETUP.md](../CONTEXT7_SETUP.md)** - Context7 MCP налаштування

### API & Сервіси
- **[API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)** - Гайд налаштування API ключів
- **[gemini_3.md](./gemini_3.md)** - Gemini 3 (Reasoning) інтеграція
- **[jemeni_live.md](./jemeni_live.md)** - Gemini Live (потокова передача)
- **[TTS.md](./TTS.md)** - Text-to-Speech сервіси
- **[STT.md](./STT.md)** - Speech-to-Text сервіси

### Інтеграції
- **[ATLAS_KONTUR_UNIFIED.md](./ATLAS_KONTUR_UNIFIED.md)** - Об'єднання Atlas + KONTUR

## 📊 Статус проекту

- **[ANALYSIS_COMPLETE_SUMMARY.md](../ANALYSIS_COMPLETE_SUMMARY.md)** - Повний аналіз реалізації
- **[ETAP_7_FINAL_SUMMARY.md](../ETAP_7_FINAL_SUMMARY.md)** - Фінальний звіт
- **[DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md)** - Індекс документації

## 🗂️ Структура папок

```
atlas/
├── docs/                          # Документація
│   ├── INDEX.md                   # Цей файл
│   ├── API_KEYS_GUIDE.md
│   ├── ATLAS_KONTUR_UNIFIED.md
│   ├── gemini_3.md
│   ├── jemeni_live.md
│   ├── STT.md
│   ├── TTS.md
│   └── README.md
├── src/                           # Вихідний код
│   ├── modules/                   # Модулі системи
│   ├── kontur/                    # KONTUR v12 ядро
│   └── ...
├── scripts/                       # Утиліти та скрипти
├── test/                          # Тести
├── QUICK_START.md                 # Швидкий старт
├── QUICK_START_v12.md
├── ETAP_*.md                      # Детальні етапи реалізації
├── KONTUR_v12_UPGRADE_GUIDE.md
├── ANALYSIS_COMPLETE_SUMMARY.md
└── package.json
```

## 🎯 Рекомендований порядок читання

### Для новачків:
1. `QUICK_START.md` - Базовий старт
2. `ETAP_1_ARCHITECTURE_ANALYSIS.md` - Розуміння архітектури
3. `ETAP_6_CONFIGURATION_DEPENDENCIES.md` - Налаштування

### Для розробників:
1. `KONTUR_v12_UPGRADE_GUIDE.md` - Оновлення до v12
2. `ETAP_2_OPEN_INTERPRETER_BRIDGE.md` - Open Interpreter
3. `ETAP_3_ACCESSIBILITY_UI_CONTROL.md` - UI контроль
4. `ETAP_4_RAG_SYSTEM.md` - RAG система
5. `ETAP_5_VISION_LLM_INTEGRATION.md` - Vision & LLM

### Для налаштування:
1. `API_KEYS_GUIDE.md` - API ключі
2. `CONTEXT7_SETUP.md` - Context7 MCP
3. `ETAP_6_CONFIGURATION_DEPENDENCIES.md` - Залежності

## 🔗 Зовнішні ресурси

- [Open Interpreter Docs](https://docs.openinterpreter.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [LangChain Docs](https://python.langchain.com/)
- [MCP Protocol](https://modelcontextprotocol.io/)

## 📝 Примітки

- Всі документи написані українською мовою
- Код приклади в TypeScript, Python та AppleScript
- Регулярно оновлюється разом з проектом

---

**Остання оновлення:** December 2025  
**Версія:** KONTUR v12
