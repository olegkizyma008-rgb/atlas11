# ⚡ QUICK START: Open Interpreter Bridge

**Статус:** ✅ 85% готово до запуску  
**Час на налаштування:** ~5 хвилин (API ключі вже налаштовані!)

---

## 🎯 4 кроки до запуску

### 1️⃣ Перевірити конфігурацію (1 хвилина)

```bash
# Запустіть скрипт перевірки:
bash ~/mac_assistant/check_config.sh
```

**Очікуваний результат:**
```
✅ API ключи: Налаштовані
✅ EXECUTION_ENGINE: python-bridge
✅ Python venv: Налаштовано
✅ Залежності: Встановлені
✅ mac_master_agent_v2.py: Готово
⚠️  RAG Database: Потребує індексації
⚠️  Дозволи: Потребують вручної конфігурації
```

**Статус:** ✅ API ключи вже налаштовані!

### 2️⃣ Налаштувати дозволи (3 хвилини)

```bash
bash ~/mac_assistant/setup_permissions.sh
```

Потім вручну додайте Terminal до:
- **System Settings → Privacy & Security → Accessibility**

### 3️⃣ Індексувати RAG базу (2 хвилини)

```bash
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

### 4️⃣ Тестувати агента (2 хвилини)

```bash
# Покращена версія з RAG (рекомендується)
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent_v2.py "Відкрий Калькулятор"

# Або базова версія
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent.py "Зроби скріншот"
```

---

## 📊 Статус компонентів

| Компонент | Статус | Файл |
|-----------|--------|------|
| Open Interpreter Bridge | ✅ 100% | `src/modules/tetyana/open_interpreter_bridge.ts` |
| mac_master_agent_v2.py | ✅ 100% | `~/mac_assistant/mac_master_agent_v2.py` |
| Tetyana Executor | ✅ 100% | `src/modules/tetyana/executor.ts` |
| MCP OS Server | ✅ 100% | `src/kontur/mcp/servers/os.ts` |
| Python venv | ✅ 100% | `~/mac_assistant/venv/` |
| RAG Database | ✅ 80% | `~/mac_assistant_rag/chroma_mac` |
| API ключі | ✅ Налаштовано | `.env` (BRAIN_API_KEY, COPILOT_API_KEY, VISION_API_KEY) |
| EXECUTION_ENGINE | ✅ Налаштовано | `.env` (python-bridge) |
| Дозволи | ⚠️ Manual | `setup_permissions.sh` |

---

## 🔧 Поточна конфігурація

### ✅ API ключі (вже налаштовані)

```bash
# У файлі /Users/dev/Documents/GitHub/atlas/.env:
BRAIN_API_KEY=ghu_p20qYHtzvdGoBvtN8V2YqOWXg...
COPILOT_API_KEY=ghu_p20qYHtzvdGoBvtN8V2YqOWXgd...
VISION_API_KEY=AIzaSyCkcmmP8C5OxNRIRf82E2S46Pm...
TTS_API_KEY=AIzaSyCkcmmP8C5OxNRIRf82E2S46P...
STT_API_KEY=AIzaSyCc8qvGwjMargEwTRjTOknDh...
```

### ✅ Execution Engine (вже налаштовано)

```bash
# У .env файлі проекту Atlas:
EXECUTION_ENGINE=python-bridge
```

**Статус:** ✅ Все готово!

---

## 🧪 Тестування

### Мінімальний тест (Python)

```bash
~/mac_assistant/venv/bin/python3 ~/mac_assistant/test_minimal.py
```

### Тест середовища (TypeScript)

```bash
cd /Users/dev/Documents/GitHub/atlas
npx ts-node test-bridge-environment.ts
```

---

## 📚 Документація

- **`~/mac_assistant/README.md`** — Повна документація
- **`IMPLEMENTATION_STATUS.md`** — Детальний статус
- **`test_minimal.py`** — Тестовий скрипт

---

## 🚀 Приклади використання

### Через Python

```bash
# Командний режим
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent_v2.py "Відкрий Figma"

# Інтерактивний режим
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent_v2.py
```

### Через TypeScript (Atlas)

```typescript
import { OpenInterpreterBridge } from './src/modules/tetyana/open_interpreter_bridge';

const bridge = new OpenInterpreterBridge();
if (OpenInterpreterBridge.checkEnvironment()) {
    const result = await bridge.execute("Відкрий Калькулятор");
    console.log(result);
}
```

---

## ⚠️ Troubleshooting

| Проблема | Рішення |
|----------|---------|
| "Python not found" | `brew install python@3.12` |
| "Accessibility denied" | System Settings → Privacy & Security → Accessibility |
| "API Key not found" | `export GEMINI_API_KEY="..."` |
| "RAG database not found" | `python3 ~/mac_assistant/index_rag.py` |

---

## 📞 Контакти

Див. основний репозиторій Atlas для більш детальної інформації.

---

---

## ⚡ СТАТУС ГОТОВНОСТІ

✅ **API ключи:** Налаштовані  
✅ **EXECUTION_ENGINE:** python-bridge  
✅ **Open Interpreter Bridge:** Готово  
✅ **Python venv:** Налаштовано  
⚠️ **Дозволи:** Потребують вручної конфігурації  
⚠️ **RAG база:** Потребує індексації  

**Готово? Почніть з кроку 1! ⬆️**
