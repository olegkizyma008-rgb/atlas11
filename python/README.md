# Python Agent - Tetyana v12 LangGraph Edition

Потужна система автоматизації macOS з LangGraph, RAG базою знань та Vision інтеграцією.

**Розташування:** `/atlas/python/`

## 📋 Структура

```
/atlas/python/
├── venv/                          # Python virtual environment
├── mac_master_agent.py            # Основний LangGraph агент
├── mac_master_agent_advanced.py   # Розширена версія з LLM інтеграцією
├── mac_accessibility.py           # Accessibility API утиліти
├── index_rag.py                   # Скрипт індексації RAG бази
├── requirements.txt               # Python залежності
└── README.md                      # Цей файл

/atlas/rag/
├── chroma_mac/                    # Chroma DB з векторами
├── macOS-automation-knowledge-base/  # База знань (Markdown файли)
├── knowledge_base/                # Додаткові знання
└── knowledge_sources/             # Джерела знань
```

## 🚀 Швидкий старт

### 1. Перевірка середовища

```bash
# Перевіримо, що все готово
cd /Users/dev/Documents/GitHub/atlas
npx ts-node test-bridge-environment.ts
```

### 2. Налаштування дозволів

```bash
bash ~/mac_assistant/setup_permissions.sh
```

Це відкриє System Settings → Privacy & Security → Accessibility.
Додайте Terminal та Python до списку дозволених додатків.

### 3. Індексація RAG бази

```bash
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

Це завантажить документи з `macOS-automation-knowledge-base` і створить векторну базу.

### 4. Встановлення API ключів

Створіть або оновіть файл `~/.env`:

```bash
# Виберіть один з провайдерів:

# Gemini (рекомендується)
export GEMINI_API_KEY="your-gemini-api-key"

# Або OpenAI/Copilot
export OPENAI_API_KEY="your-openai-api-key"
export COPILOT_API_KEY="your-copilot-api-key"
```

### 5. Тестування агента

```bash
# Базова версія
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent.py "Відкрий Калькулятор"

# Покращена версія з RAG
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent_v2.py "Зроби скріншот екрану"
```

## 🔧 Компоненти

### mac_master_agent.py (Базова версія)

Основний агент Open Interpreter з конфігурацією:
- LLM: Gemini або GPT-4o
- Vision: Автоматичне розпізнавання екрану
- Accessibility: Керування мишкою та клавіатурою
- Custom instructions українською мовою

**Використання:**
```bash
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent.py "ваше завдання"
```

### mac_master_agent_v2.py (Покращена версія)

Розширена версія з:
- ✅ RAG інтеграцією (пошук у базі знань)
- ✅ Кращою обробкою помилок
- ✅ Детальним логуванням
- ✅ Інтерактивним режимом

**Використання:**
```bash
# Командний режим
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent_v2.py "ваше завдання"

# Інтерактивний режим
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent_v2.py
```

### mac_accessibility.py

Низькорівневий модуль для роботи з Accessibility API:

```python
from mac_accessibility import click_mouse, type_text, get_ui_tree

# Клік на координатах
click_mouse(100, 200)

# Введення тексту
type_text("Hello, macOS!")

# Отримання дерева UI
tree = get_ui_tree()
```

### index_rag.py

Скрипт для індексації бази знань:

```bash
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

Завантажує всі `.md` файли з `macOS-automation-knowledge-base` і створює векторну базу в Chroma.

## 🔌 Інтеграція з Atlas (KONTUR)

### Через Open Interpreter Bridge

```typescript
// src/modules/tetyana/open_interpreter_bridge.ts
const bridge = new OpenInterpreterBridge();

if (OpenInterpreterBridge.checkEnvironment()) {
    const result = await bridge.execute("Відкрий Figma");
    console.log(result);
}
```

### Через Tetyana Executor

```typescript
// src/modules/tetyana/executor.ts
// Якщо EXECUTION_ENGINE=python-bridge в .env:
const executor = new TetyanaExecutor(core);
await executor.execute(plan, inputPacket);
```

## 📚 RAG База знань

### Структура

```
~/mac_assistant_rag/macOS-automation-knowledge-base/
├── basics.md              # Основні команди
├── accessibility.md       # Accessibility API
├── automation.md          # Сценарії автоматизації
└── ...
```

### Додавання нових документів

1. Створіть `.md` файл у `macOS-automation-knowledge-base/`
2. Запустіть індексацію:
   ```bash
   ~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
   ```

### Приклад документу

```markdown
# Як відкрити додаток

## Через AppleScript
```applescript
tell application "Finder"
    activate
end tell
```

## Через Python
```python
import subprocess
subprocess.run(['open', '-a', 'Finder'])
```
```

## 🐛 Troubleshooting

### "Python not found"

```bash
# Перевірте, що Python 3.12+ встановлений
python3 --version

# Якщо ні, встановіть через Homebrew
brew install python@3.12
```

### "Accessibility API not available"

1. Відкрийте System Settings → Privacy & Security → Accessibility
2. Додайте Terminal та Python до списку
3. Перезавантажте Terminal

### "RAG database not found"

```bash
# Переконайтеся, що база знань існує
ls ~/mac_assistant_rag/macOS-automation-knowledge-base/

# Запустіть індексацію
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

### "API Key not found"

```bash
# Встановіть API ключ
export GEMINI_API_KEY="your-key"

# Або додайте у ~/.env
echo 'GEMINI_API_KEY=your-key' >> ~/.env
source ~/.env
```

## 📊 Залежності

```
open-interpreter==0.4.3
langchain==1.1.3
langchain-community==0.4.1
langchain-chroma==1.0.0
langchain-huggingface==1.1.0
chromadb==1.3.5
pyobjc-core==12.1
pyobjc-framework-Accessibility==12.1
pyobjc-framework-Quartz==12.1
```

Встановлені в `~/mac_assistant/venv/`

## 🔐 Безпека

- ✅ Всі API ключи зберігаються в `.env` (не в коді)
- ✅ Accessibility API вимагає явного дозволу користувача
- ✅ Агент не має доступу до паролів та конфіденційних даних
- ✅ Всі дії логуються

## 📝 Логування

Логи виводяться в stderr:

```bash
# Запустіть з перенаправленням логів
~/mac_assistant/venv/bin/python3 ~/mac_assistant/mac_master_agent_v2.py "завдання" 2>&1 | tee agent.log
```

## 🚧 Розробка

### Додавання нових функцій до mac_accessibility.py

```python
def new_function(param):
    """Опис функції"""
    # Реалізація
    pass
```

### Розширення RAG бази

1. Додайте `.md` файли до `macOS-automation-knowledge-base/`
2. Запустіть `index_rag.py`
3. Агент автоматично матиме доступ до нових знань

## 📞 Контакти

Для питань та пропозицій див. основний репозиторій Atlas.

## 📄 Ліцензія

Частина проекту Atlas. Див. LICENSE у кореневій папці.
