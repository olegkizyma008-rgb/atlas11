# 🚀 Швидкий старт (KONTUR v12)

Налаштування та запуск Atlas KONTUR v12 "Kozyr" за 5 хвилин.

## ⚡ Базовий запуск

### Через CLI (рекомендується)

```bash
# Прямі команди українською мовою
npm run cli -- "Твоє завдання"

# Приклади:
npm run cli -- "Відкрий Калькулятор"
npm run cli -- "Скільки файлів на робочому столі?"
npm run cli -- "Скажи яка сьогодні дата"
```

### Через Python Bridge (прямо)

У v12 ми використовуємо нативний Python міст для виконання важких завдань.

```bash
# Прямий запуск агента
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent.py "Твоє завдання"

# Приклад:
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent.py "Відкрий Finder і створи нову папку Test"
```

## ⚙️ Налаштування

### 1️⃣ Дозволи Accessibility (обов'язково)

> [!IMPORTANT]
> Для роботи Vision та контролю миші потрібні спеціальні дозволи.

1. Відкрийте **System Settings → Privacy & Security → Accessibility**
2. Натисніть **+** (плюс)
3. Додайте:
   - **Terminal** (або iTerm/VS Code)
   - **/Users/dev/mac_assistant/venv/bin/python3** (Python venv executable)

![Accessibility Settings Placeholder](electron-web/accessibility-settings.png)

### 2️⃣ API ключі (v12 Minimalist)

Ми спростили конфігурацію. Відредагуйте `/Users/dev/Documents/GitHub/atlas/.env`:

```env
# === BRAIN (Planner) ===
BRAIN_PROVIDER=copilot
BRAIN_API_KEY=ghu_...

# === VISION (Verification) ===
VISION_PROVIDER=copilot
VISION_API_KEY=ghu_...

# === EXECUTION ===
EXECUTION_ENGINE=python-bridge

# === RAG ===
RAG_ENABLED=true
```

Детальніше: [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)

### 3️⃣ RAG Base (Self-Healing)

База знань автоматично наповнюється, але для старту можна запустити індексацію:

```bash
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

## 🧪 Тестування

```bash
# Тест 1: Простий привіт (CLI)
npm run cli -- "Скажи привіт"

# Тест 2: Vision Feedback Loop (Python)
# Спробуйте завдання, яке вимагає зворотного зв'язку
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent.py "Зроби скріншот цього вікна"
```

## 📊 Статус системи (v12)

| Компонент | Статус | Версія |
|-----------|--------|--------|
| Open Interpreter Bridge | ✅ Active | v12.0.1 |
| Execution Engine | ✅ Python | 3.12 |
| RAG System | ✅ Enabled | ChromaDB |
| Vision Mode | ✅ On-Demand | GPT-4o |
| Дозволи | ⚠️ Перевірити | - |

## ❓ Troubleshooting

| Проблема | Рішення |
|----------|---------|
| "Python not found" | Перевірте шлях: `~/mac_assistant/venv/bin/python3` |
| "Grisha refused verification" | Перевірте чистоту екрану або спробуйте ще раз (Agent зробить Replan) |
| "RAG database missing" | Запустіть `index_rag.py` (вона створиться автоматично) |

---

**Готово? Почніть з:** `npm run cli -- "Привіт, я готовий працювати"`
