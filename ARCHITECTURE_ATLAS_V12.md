# ATLAS v12 — KONTUR Architecture Integration

**Дата:** 10 грудня 2025  
**Статус:** ✅ PRODUCTION READY  
**Коміт:** `5069e07d`

---

## 📐 Архітектура

### Структура проекту

```
atlas/
├── src/
│   └── kontur/
│       ├── organs/                    ← Python органи системи
│       │   ├── tetyana_agent.py       ← LangGraph агент (ATLAS v12)
│       │   ├── tetyana_bridge.py      ← KONTUR Protocol Bridge
│       │   ├── rag_indexer.py         ← RAG індексатор
│       │   ├── mac_accessibility.py   ← macOS Accessibility API
│       │   └── worker.py              ← Generic Python worker
│       ├── protocol/                  ← KPP Protocol
│       ├── vision/                    ← Vision сервіси
│       ├── voice/                     ← Voice сервіси
│       ├── providers/                 ← LLM провайдери
│       └── ...
├── bin/
│   └── tetyana                        ← Binary wrapper
├── requirements.txt                   ← Python залежності
├── .env                               ← Конфігурація
└── ...
```

### Органи системи (src/kontur/organs/)

| Файл | Назва | Функція |
|------|-------|---------|
| `tetyana_agent.py` | TETYANA v12 Agent | LangGraph агент з 7 нодами |
| `tetyana_bridge.py` | KONTUR Bridge | KPP Protocol інтеграція |
| `rag_indexer.py` | RAG Indexer | Індексація знань |
| `mac_accessibility.py` | Accessibility | macOS API доступ |
| `worker.py` | Generic Worker | Загальний Python worker |

---

## 🔄 ATLAS v12 LangGraph Архітектура

### 7 Нодів графу

```
plan_task
    ↓
rag_search
    ↓
execute
    ↓
vision_check
    ↓
self_heal
    ↓
should_continue (умовна логіка)
├─ next_step → rag_search (цикл)
└─ END (завершення)
```

### Ноди

#### 1. **plan_task** — Планування
- Розбиває завдання на кроки
- Парсить "і" та "then" в завданні
- Ініціалізує стан графу

#### 2. **rag_search** — Пошук в RAG
- Шукає рішення в базі знань
- Витягує AppleScript з результатів
- Fallback на мінімальний скрипт

#### 3. **execute** — Виконання
- Запускає AppleScript через `osascript`
- Обробляє помилки та timeout
- Зберігає результат

#### 4. **vision_check** — Верифікація
- Робить скріншот (якщо доступна)
- Зберігає шлях до скріншоту
- Підготовляє дані для верифікації

#### 5. **self_heal** — Self-Healing
- Додає успішні рішення в RAG
- Метаданні: дата, статус, завдання
- Забезпечує навчання системи

#### 6. **next_step** — Наступний крок
- Переходить до наступного кроку
- Оновлює `current_step_idx`

#### 7. **should_continue** — Умовна логіка
- Перевіряє: чи є ще кроки?
- Перевіряє: чи була помилка?
- Повертає: "next_step" або END

---

## 📦 KONTUR Protocol Integration

### KPP Packet Structure

```python
{
    "type": "TASK_REQUEST" | "TASK_RESPONSE",
    "source": "tetyana-agent",
    "destination": "kontur-core",
    "payload": {
        "task": "завдання",
        "steps": ["крок 1", "крок 2"],
        "execution_result": "результат",
        "error": null,
        ...
    },
    "metadata": {
        "status": "success" | "error",
        "steps_count": 2,
        "rag_context_available": true
    },
    "status": "success"
}
```

### Bridge (tetyana_bridge.py)

```python
bridge = KONTURAgentBridge()
response_packet = bridge.execute_task("завдання")
# Повертає KONTURPacket з результатом
```

---

## 🚀 Запуск

### Через бінарник (рекомендовано)

```bash
./bin/tetyana "Відкрий Safari"
# Автоматично використовує KONTUR бридж
```

### Прямо через Python

```bash
# KONTUR Protocol
python3 src/kontur/organs/tetyana_bridge.py "завдання"

# Основний агент
python3 src/kontur/organs/tetyana_agent.py "завдання"
```

### Індексація RAG

```bash
python3 src/kontur/organs/rag_indexer.py
```

---

## 🔧 Конфігурація

### .env файл

```env
# Brain (LLM)
BRAIN_PROVIDER=copilot
BRAIN_MODEL=gpt-4o
BRAIN_API_KEY=...

# Vision
VISION_PROVIDER=copilot
VISION_MODEL=gpt-4o
VISION_API_KEY=...

# Redis (опціонально)
REDIS_URL=redis://localhost:6379/0
```

### requirements.txt

```
# Core
rich>=13.7
python-dotenv>=1.0

# LangChain + RAG
langchain>=0.2.0
langchain-chroma>=0.1.2
langchain-huggingface>=0.0.3

# LangGraph
langgraph>=0.2.0

# Vision
pillow>=10.0
pyautogui>=0.9.54

# Redis
redis>=5.0

# macOS
pyobjc-framework-Accessibility>=12.1
pyobjc-framework-Quartz>=12.1
```

---

## 📊 Стан компонентів

| Компонент | Статус | Примітка |
|-----------|--------|---------|
| LangGraph | ✅ | 7 нодів, умовні ребра |
| RAG | ✅ | Пошук + self-healing |
| Vision | ✅ | Скріншоти готові |
| Redis | ⏳ | Опціонально |
| KONTUR Protocol | ✅ | KPP пакети |
| Synapse | ✅ | Event emitter |
| Binary Wrapper | ✅ | KONTUR bridge |
| macOS Automation | ✅ | AppleScript |

---

## 🧪 Тестування

### Базовий тест

```bash
./bin/tetyana "Відкрий Калькулятор"
# ✅ Успіх
```

### Multi-step тест

```bash
./bin/tetyana "Відкрий Finder і перейди до Downloads"
# ✅ 2 кроки, обидва успішні
```

### KONTUR Protocol тест

```bash
python3 src/kontur/organs/tetyana_bridge.py "Тест"
# ✅ Повертає JSON з KONTUR пакетом
```

---

## 🎯 Наступні кроки

### Обов'язкові
1. ✅ Інтегрувати з KONTUR архітектурою
2. ✅ Реалізувати KPP Protocol
3. ✅ Додати self-healing

### Опціональні
1. Встановити Redis для persistence
2. Додати більше AppleScript шаблонів в RAG
3. Інтегрувати з KONTUR Synapse шиною
4. Додати логування в KONTUR систему

---

## 📝 Примітки

- Python агенти тепер частина KONTUR архітектури
- Не в окремій `/python/` папці
- Інтегровані як органи системи
- Використовують KPP Protocol для комунікації
- Self-healing забезпечує навчання системи

---

**ATLAS v12 — готова до production! 🚀**
