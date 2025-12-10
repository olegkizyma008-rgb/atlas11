# 📚 Гайд по документації

Як знайти те, що вам потрібно.

## 🚀 Я новий користувач

**Час**: 30-60 хвилин

1. **Почніть з**: [docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md)
   - Налаштування за 5 хвилин
   - Базові команди
   - Тестування

2. **Потім прочитайте**: [docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)
   - Розуміння архітектури
   - Основні компоненти
   - Як все працює

3. **Налаштуйте**: [docs/04-CONFIGURATION.md](./docs/04-CONFIGURATION.md)
   - API ключі
   - Провайдери
   - Середовище

**Готово!** Тепер ви можете використовувати систему.

---

## 👨‍💻 Я розробник

**Час**: 2-3 години

### Базовий рівень

1. **[docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)** - Архітектура системи
2. **[docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md)** - Ключові компоненти
3. **[docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md)** - Детальні гайди

### Просунутий рівень

4. **[docs/07-ADVANCED.md](./docs/07-ADVANCED.md)** - Розширені теми
5. **[ETAP_2_OPEN_INTERPRETER_BRIDGE.md](./ETAP_2_OPEN_INTERPRETER_BRIDGE.md)** - Open Interpreter
6. **[ETAP_4_RAG_SYSTEM.md](./ETAP_4_RAG_SYSTEM.md)** - RAG система

### Спеціалізовані теми

- **Vision & LLM**: [ETAP_5_VISION_LLM_INTEGRATION.md](./ETAP_5_VISION_LLM_INTEGRATION.md)
- **Accessibility**: [ETAP_3_ACCESSIBILITY_UI_CONTROL.md](./ETAP_3_ACCESSIBILITY_UI_CONTROL.md)
- **Gemini 3**: [docs/gemini_3.md](./docs/gemini_3.md)
- **Gemini Live**: [docs/jemeni_live.md](./docs/jemeni_live.md)

---

## 🔧 Я DevOps / Системний адміністратор

**Час**: 1-2 години

1. **[docs/04-CONFIGURATION.md](./docs/04-CONFIGURATION.md)** - Конфігурація
2. **[docs/API_KEYS_GUIDE.md](./docs/API_KEYS_GUIDE.md)** - API ключі
3. **[ETAP_6_CONFIGURATION_DEPENDENCIES.md](./ETAP_6_CONFIGURATION_DEPENDENCIES.md)** - Залежності
4. **[docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md)** - Troubleshooting

---

## 🔍 Я шукаю щось конкретне

### Проблеми та рішення

**Проблема**: Python не знайдено  
**Рішення**: [docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md#python-не-знайдено)

**Проблема**: Accessibility дозволи  
**Рішення**: [docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md#accessibility-дозволи)

**Проблема**: API ключ не знайдено  
**Рішення**: [docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md#api-ключ-не-знайдено)

**Проблема**: RAG база не знайдена  
**Рішення**: [docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md#rag-база-не-знайдена)

### Компоненти та гайди

**Хочу дізнатися про**: Open Interpreter Bridge  
**Читайте**: [docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md#open-interpreter-bridge) → [docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md#open-interpreter-bridge) → [ETAP_2_OPEN_INTERPRETER_BRIDGE.md](./ETAP_2_OPEN_INTERPRETER_BRIDGE.md)

**Хочу дізнатися про**: RAG System  
**Читайте**: [docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md#rag-system) → [docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md#rag-system) → [ETAP_4_RAG_SYSTEM.md](./ETAP_4_RAG_SYSTEM.md)

**Хочу дізнатися про**: Vision & LLM  
**Читайте**: [docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md#vision--llm-integration) → [docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md#vision--llm) → [ETAP_5_VISION_LLM_INTEGRATION.md](./ETAP_5_VISION_LLM_INTEGRATION.md)

**Хочу дізнатися про**: Accessibility API  
**Читайте**: [docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md#accessibility--ui-control) → [docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md#accessibility--ui-control) → [ETAP_3_ACCESSIBILITY_UI_CONTROL.md](./ETAP_3_ACCESSIBILITY_UI_CONTROL.md)

### API та сервіси

**Хочу налаштувати API ключі**  
**Читайте**: [docs/API_KEYS_GUIDE.md](./docs/API_KEYS_GUIDE.md)

**Хочу дізнатися про Gemini 3 Reasoning**  
**Читайте**: [docs/gemini_3.md](./docs/gemini_3.md)

**Хочу дізнатися про Gemini Live WebSocket**  
**Читайте**: [docs/jemeni_live.md](./docs/jemeni_live.md)

**Хочу налаштувати Speech-to-Text**  
**Читайте**: [docs/STT.md](./docs/STT.md)

**Хочу налаштувати Text-to-Speech**  
**Читайте**: [docs/TTS.md](./docs/TTS.md)

---

## 📊 Структура документації

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
│   ├── MAP.md                     # Карта документації
│   ├── INDEX.md                   # Повний індекс
│   ├── README.md                  # Огляд папки
│   ├── API_KEYS_GUIDE.md
│   ├── ATLAS_KONTUR_UNIFIED.md
│   ├── gemini_3.md
│   ├── jemeni_live.md
│   ├── STT.md
│   └── TTS.md
├── DOCUMENTATION.md               # 📖 Головний гайд
├── DOCS_GUIDE.md                  # 📚 Цей файл
├── ETAP_*.md                      # 📊 Етапи реалізації
├── QUICK_START.md
├── QUICK_START_v12.md
├── KONTUR_v12_UPGRADE_GUIDE.md
├── ANALYSIS_COMPLETE_SUMMARY.md
└── package.json
```

---

## 🎯 Швидкі посилання

| Потреба | Документ | Час |
|---------|----------|-----|
| Швидкий старт | [docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md) | 5 хв |
| Архітектура | [docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md) | 20 хв |
| Компоненти | [docs/03-COMPONENTS.md](./docs/03-COMPONENTS.md) | 30 хв |
| Конфігурація | [docs/04-CONFIGURATION.md](./docs/04-CONFIGURATION.md) | 15 хв |
| Детальні гайди | [docs/05-DETAILED_GUIDES.md](./docs/05-DETAILED_GUIDES.md) | 1 год |
| Troubleshooting | [docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md) | за потребою |
| Розширені теми | [docs/07-ADVANCED.md](./docs/07-ADVANCED.md) | 1 год |
| Карта документації | [docs/MAP.md](./docs/MAP.md) | 10 хв |
| API ключі | [docs/API_KEYS_GUIDE.md](./docs/API_KEYS_GUIDE.md) | 10 хв |
| Gemini 3 | [docs/gemini_3.md](./docs/gemini_3.md) | 30 хв |
| Gemini Live | [docs/jemeni_live.md](./docs/jemeni_live.md) | 30 хв |
| STT | [docs/STT.md](./docs/STT.md) | 30 хв |
| TTS | [docs/TTS.md](./docs/TTS.md) | 30 хв |

---

## 💡 Поради

1. **Почніть з [docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md)** - це займе 5 хвилин
2. **Використовуйте [docs/MAP.md](./docs/MAP.md)** для навігації по документації
3. **Якщо щось не працює** - перевірте [docs/06-TROUBLESHOOTING.md](./docs/06-TROUBLESHOOTING.md)
4. **Для розробки** - читайте [docs/07-ADVANCED.md](./docs/07-ADVANCED.md)

---

**Статус**: ✅ Готово до використання  
**Останнє оновлення**: December 2025  
**Версія**: KONTUR v12

**Почніть з**: [docs/01-GETTING_STARTED.md](./docs/01-GETTING_STARTED.md)
