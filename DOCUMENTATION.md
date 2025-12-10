# 📚 Документація Atlas

Організована документація проекту KONTUR v12.

## 🎯 Швидкий старт

**Новий користувач?** Почніть звідси:

1. **[docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md)** - Налаштування за 5 хвилин
2. **[docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)** - Розуміння системи
3. **[docs/04-CONFIGURATION.md](./docs/04-CONFIGURATION.md)** - Конфігурація

## 📖 Основна документація

### Для новачків
- **[docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md)** - Швидкий старт
- **[docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)** - Архітектура системи
- **[docs/04-CONFIGURATION.md](./docs/04-CONFIGURATION.md)** - Налаштування

### Для розробників
- **[docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md)** - Ключові компоненти
- **[docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md)** - Детальні гайди
- **[docs/07-ADVANCED.md](./docs/07-ADVANCED.md)** - Розширені теми

### Для вирішення проблем
- **[docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md)** - Рішення проблем

### API & Сервіси
- **[docs/API_KEYS_GUIDE.md](./docs/API_KEYS_GUIDE.md)** - Налаштування API ключів
- **[docs/gemini_3.md](./docs/gemini_3.md)** - Gemini 3 (Reasoning)
- **[docs/jemeni_live.md](./docs/jemeni_live.md)** - Gemini Live (потокова передача)
- **[docs/TTS.md](./docs/TTS.md)** - Text-to-Speech
- **[docs/STT.md](./docs/STT.md)** - Speech-to-Text

### Інші ресурси
- **[docs/ATLAS_KONTUR_UNIFIED.md](./docs/ATLAS_KONTUR_UNIFIED.md)** - Об'єднання Atlas + KONTUR
- **[docs/INDEX.md](./docs/INDEX.md)** - Повний індекс документації
- **[docs/README.md](./docs/README.md)** - Огляд папки docs

## 📊 Детальні етапи реалізації

Ці файли описують кожен етап розробки системи:

- **[ETAP_1_ARCHITECTURE_ANALYSIS.md](./ETAP_1_ARCHITECTURE_ANALYSIS.md)** - Аналіз архітектури
- **[ETAP_2_OPEN_INTERPRETER_BRIDGE.md](./ETAP_2_OPEN_INTERPRETER_BRIDGE.md)** - Open Interpreter
- **[ETAP_3_ACCESSIBILITY_UI_CONTROL.md](./ETAP_3_ACCESSIBILITY_UI_CONTROL.md)** - Accessibility API
- **[ETAP_4_RAG_SYSTEM.md](./ETAP_4_RAG_SYSTEM.md)** - RAG система
- **[ETAP_5_VISION_LLM_INTEGRATION.md](./ETAP_5_VISION_LLM_INTEGRATION.md)** - Vision & LLM
- **[ETAP_6_CONFIGURATION_DEPENDENCIES.md](./ETAP_6_CONFIGURATION_DEPENDENCIES.md)** - Конфігурація
- **[ETAP_7_FINAL_SUMMARY.md](./ETAP_7_FINAL_SUMMARY.md)** - Фінальний звіт

## 🔄 Оновлення та гайди

- **[KONTUR_v12_UPGRADE_GUIDE.md](./KONTUR_v12_UPGRADE_GUIDE.md)** - Гайд оновлення до v12
- **[QUICK_START.md](./QUICK_START.md)** - Швидкий старт (базова версія)
- **[QUICK_START_v12.md](./QUICK_START_v12.md)** - Швидкий старт для v12

## 📈 Статус проекту

- **[ANALYSIS_COMPLETE_SUMMARY.md](./ANALYSIS_COMPLETE_SUMMARY.md)** - Повний аналіз реалізації
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Індекс документації

## 🗂️ Структура папок

```
atlas/
├── docs/                          # 📚 Основна документація
│   ├── 01-GETTING_STARTED.md      # Швидкий старт
│   ├── 02-ARCHITECTURE.md         # Архітектура
│   ├── 03-COMPONENTS.md           # Компоненти
│   ├── 04-CONFIGURATION.md        # Конфігурація
│   ├── 05-DETAILED_GUIDES.md      # Детальні гайди
│   ├── 06-TROUBLESHOOTING.md      # Troubleshooting
│   ├── 07-ADVANCED.md             # Розширені теми
│   ├── INDEX.md                   # Повний індекс
│   ├── README.md                  # Огляд папки
│   ├── API_KEYS_GUIDE.md
│   ├── ATLAS_KONTUR_UNIFIED.md
│   ├── gemini_3.md
│   ├── jemeni_live.md
│   ├── STT.md
│   └── TTS.md
├── src/                           # 💻 Вихідний код
│   ├── kontur/                    # KONTUR v12 ядро
│   ├── modules/                   # Модулі системи
│   └── ...
├── DOCUMENTATION.md               # 📖 Цей файл
├── ETAP_*.md                      # 📊 Етапи реалізації
├── QUICK_START.md
├── QUICK_START_v12.md
├── KONTUR_v12_UPGRADE_GUIDE.md
├── ANALYSIS_COMPLETE_SUMMARY.md
└── package.json
```

## 🎯 Рекомендований порядок читання

### Для новачків (1-2 години):
1. **[docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md)** - Налаштування
2. **[docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)** - Розуміння архітектури
3. **[docs/04-CONFIGURATION.md](./docs/04-CONFIGURATION.md)** - Налаштування API

### Для розробників (3-4 години):
1. **[docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)** - Архітектура
2. **[docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md)** - Компоненти
3. **[docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md)** - Детальні гайди
4. **[docs/07-ADVANCED.md](./docs/07-ADVANCED.md)** - Розширені теми

### Для налаштування (30 хвилин):
1. **[docs/04-CONFIGURATION.md](./docs/04-CONFIGURATION.md)** - Конфігурація
2. **[docs/API_KEYS_GUIDE.md](./docs/API_KEYS_GUIDE.md)** - API ключі
3. **[docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md)** - Troubleshooting

## 🔗 Зовнішні ресурси

- [Open Interpreter Docs](https://docs.openinterpreter.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [LangChain Docs](https://python.langchain.com/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Контакти для допомоги

- **GitHub Issues**: https://github.com/olegkizyma008-rgb/atlas/issues
- **Documentation**: [docs/INDEX.md](./docs/INDEX.md)
- **Troubleshooting**: [docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md)

## 🚀 Швидкий старт

```bash
# Встановлення залежностей
npm install

# Запуск CLI
npm run cli -- "Твоє завдання"

# Приклади:
npm run cli -- "Відкрий Калькулятор"
npm run cli -- "Скільки файлів на робочому столі?"
npm run cli -- "Скажи яка сьогодні дата"
```

## 📝 Примітки

- Всі документи написані українською мовою
- Код приклади в TypeScript, Python та AppleScript
- Регулярно оновлюється разом з проектом
- Документація організована за категоріями для зручного доступу

---

**Остання оновлення:** December 2025  
**Версія:** KONTUR v12  
**Статус:** ✅ Готово до використання

**Почніть з:** [docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md)
