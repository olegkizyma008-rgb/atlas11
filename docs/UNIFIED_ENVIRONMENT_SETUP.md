# 🔧 Уніфіковане Python Середовище ATLAS v12

## 📋 Огляд

Всі Python залежності проекту ATLAS v12 тепер **уніфіковані в одному місці**:

- **Місцезнаходження**: `./venv/` (корінь проекту)
- **Requirements**: `./requirements.txt` (один файл для всього)
- **Управління**: `setup.sh` (автоматичне налаштування)

## 📁 Структура

```
atlas/
├── venv/                          # ✅ Уніфіковане віртуальне оточення
│   ├── bin/
│   │   ├── python3
│   │   ├── pip
│   │   └── ...
│   ├── lib/
│   │   └── python3.12/site-packages/
│   └── pyvenv.cfg
├── requirements.txt               # ✅ Всі залежності в одному файлі
├── setup.sh                       # ✅ Автоматичне налаштування
├── bin/
│   └── tetyana                    # ✅ Оновлено для нового venv
├── python/
│   └── venv -> ../venv            # 🔗 Symlink для зворотної сумісності
└── src/
    └── kontur/organs/
        ├── tetyana_agent.py
        └── tetyana_bridge.py
```

## 🚀 Швидкий Старт

### 1️⃣ Перший запуск (повне налаштування)

```bash
cd /Users/dev/Documents/GitHub/atlas
bash setup.sh
```

Скрипт автоматично:
- ✅ Перевіряє системні залежності (Homebrew, Chrome, Redis, Node.js, Python)
- ✅ Встановлює Node.js залежності (`npm install`)
- ✅ Створює уніфіковане venv у корені (`./venv`)
- ✅ Встановлює всі Python залежності з `requirements.txt`
- ✅ Оновлює `bin/tetyana` для нового venv
- ✅ Налаштовує `.env` файл
- ✅ Будує проект (`npm run build`)
- ✅ Виконує фінальні перевірки

### 2️⃣ Активація venv (для розробки)

```bash
# Активувати venv
source venv/bin/activate

# Деактивувати
deactivate
```

### 3️⃣ Запуск завдань

```bash
# Через CLI
npm run cli "Відкрий Калькулятор"

# Через бінарник (автоматично активує venv)
./bin/tetyana "Відкрий Калькулятор"

# Через Python напряму
python3 src/kontur/organs/tetyana_agent.py "Відкрий Калькулятор"
```

## 📦 Залежності (requirements.txt)

### Групи залежностей

| Група | Пакети | Призначення |
|-------|--------|-----------|
| **Core** | rich, python-dotenv, requests, pydantic, psutil | Основна функціональність |
| **LangChain + RAG** | langchain, langchain-chroma, langchain-huggingface, chromadb | Retrieval-Augmented Generation |
| **LangGraph** | langgraph | State management & graph execution |
| **Embeddings** | sentence-transformers, huggingface-hub | Vector embeddings & similarity search |
| **Redis** | redis | State persistence & caching |
| **Vision** | pillow, pyautogui | Screenshots & UI automation |
| **macOS** | pyobjc-framework-Accessibility, pyobjc-framework-Quartz, pyobjc, atomacos | Accessibility API & automation |
| **Testing** | pytest | Unit & integration tests |

### Опціональні залежності

```bash
# Apple Silicon optimization (M1/M2/M3/M4)
pip install mlx-lm>=0.18.0

# Text processing
pip install unidecode>=1.3.8
```

## 🔄 Зворотна сумісність

Для старих скриптів, що посилаються на `python/venv/`:

```bash
# Автоматичний symlink (створюється setup.sh)
python/venv -> ../venv
```

Це дозволяє старим скриптам працювати без змін:

```bash
# Старий шлях (все ще працює)
python/venv/bin/python3 script.py

# Новий шлях (рекомендується)
venv/bin/python3 script.py
```

## 🛠️ Управління залежностями

### Додавання нової залежності

```bash
# Активувати venv
source venv/bin/activate

# Встановити пакет
pip install package_name

# Оновити requirements.txt
pip freeze > requirements.txt
```

### Оновлення всіх залежностей

```bash
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

### Перевірка встановлених пакетів

```bash
source venv/bin/activate
pip list
```

## 📊 Структура tetyana бінарника

```bash
#!/bin/bash
# bin/tetyana

PROJECT_ROOT="..."

# ✅ Новий шлях (уніфікований)
PYTHON_VENV="$PROJECT_ROOT/venv/bin/python3"

# 🔄 Fallback для зворотної сумісності
if [ ! -f "$PYTHON_VENV" ]; then
    PYTHON_VENV="$PROJECT_ROOT/python/venv/bin/python3"
fi

# Запуск агента
"$PYTHON_VENV" "$PYTHON_AGENT_TO_RUN" "$@"
```

## 🔍 Перевірка середовища

```bash
# Перевірити venv
ls -la venv/bin/python3

# Перевірити Python версію
venv/bin/python3 --version

# Перевірити pip
venv/bin/pip --version

# Перевірити встановлені залежності
venv/bin/pip list | grep -E "langchain|langgraph|chromadb|redis"
```

## 🚨 Розв'язання проблем

### Проблема: "Python venv не знайдено"

```bash
# Рішення: Запустити setup.sh
bash setup.sh
```

### Проблема: "ModuleNotFoundError: No module named 'langchain'"

```bash
# Рішення: Переактивувати venv
source venv/bin/activate
pip install -r requirements.txt
```

### Проблема: "Permission denied" при запуску tetyana

```bash
# Рішення: Надати дозволи
chmod +x bin/tetyana
```

### Проблема: "venv не активований"

```bash
# Перевірити активацію
which python3
# Повинно показати: /Users/dev/Documents/GitHub/atlas/venv/bin/python3

# Якщо ні — активувати вручну
source venv/bin/activate
```

## 📝 Примітки

- **Python версія**: 3.12+ (рекомендується)
- **Розмір venv**: ~2-3 GB (залежить від залежностей)
- **Час встановлення**: ~5-10 хвилин (залежить від інтернету)
- **Платформа**: macOS тільки (використовує pyobjc, atomacos)

## 🔗 Пов'язані файли

- `setup.sh` - Скрипт налаштування
- `requirements.txt` - Список залежностей
- `bin/tetyana` - Бінарник агента
- `.env` - Конфігурація
- `src/kontur/organs/tetyana_agent.py` - Основний агент
- `src/kontur/organs/tetyana_bridge.py` - KONTUR бридж

## 📚 Документація

- [ARCHITECTURE_ATLAS_V12.md](../ARCHITECTURE_ATLAS_V12.md) - Архітектура системи
- [README.md](../README.md) - Основна документація
