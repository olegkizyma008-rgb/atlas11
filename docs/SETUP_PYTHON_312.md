# 🐍 Setup Python 3.12 — Complete Guide

## 📊 Аналіз та рішення

### Проблема
Проект мав 2 різні venv:
- `.venv/` — Python 3.11 (без LangChain/LangGraph)
- `python/venv/` — Python 3.12 (з повним стеком)

### Рішення
**Вибір: Python 3.12** — оптимальна версія для ATLAS v12

---

## ✅ Чому Python 3.12?

| Критерій | Python 3.11 | Python 3.12 |
|----------|------------|------------|
| LangChain | ❌ НЕ встановлено | ✅ 1.1.3 |
| LangGraph | ❌ НЕ встановлено | ✅ 1.0.4 |
| ChromaDB | ❌ НЕ встановлено | ✅ 1.3.5 |
| Sentence-transformers | ❌ НЕ встановлено | ✅ 5.1.2 |
| Пакетів | 163 | 280+ |
| Швидкість | Нормальна | +5-10% швидше |

---

## 🔧 Що змінено в setup.sh

### 1. Python 3.12 як обов'язкова версія
```bash
PYTHON_BIN="/opt/homebrew/opt/python@3.12/bin/python3.12"
$PYTHON_BIN -m venv venv
```

### 2. Видалення старих venv
```bash
rm -rf venv .venv python/venv 2>/dev/null || true
```

### 3. Чистий symlink для зворотної сумісності
```bash
if [ -L "python/venv" ]; then
    rm -f python/venv
fi
ln -sf ../venv python/venv
```

### 4. Встановлення всіх залежностей
```bash
pip install -r requirements.txt
```

---

## 📦 Встановлені залежності (Python 3.12)

### Core
- langchain==1.1.3
- langchain-chroma==1.0.0
- langchain-core==1.1.3
- langchain-huggingface==1.1.0
- langgraph==1.0.4
- chromadb==1.3.5
- sentence-transformers==5.1.2

### LLM Providers
- openai==2.9.0
- anthropic==0.37.1
- google-generativeai==0.7.2
- litellm==1.80.9

### Vision & macOS
- pillow==12.0.0
- pyautogui==0.9.54
- opencv-python==4.12.0.88
- pyobjc-core==12.1
- pyobjc-framework-Accessibility==12.1

### Utils
- rich==13.5.3
- python-dotenv==1.1.1
- redis>=5.0
- pytest>=7.4.4

---

## 🚀 Запуск setup.sh

```bash
cd /Users/dev/Documents/GitHub/atlas
bash setup.sh
```

**Що буде зроблено:**
1. ✅ Встановить Homebrew, Chrome, Redis, Node.js
2. ✅ Встановить Python 3.12
3. ✅ Видалить старі venv
4. ✅ Створить новий venv з Python 3.12
5. ✅ Встановить всі залежності
6. ✅ Індексує RAG базу
7. ✅ Налаштує Accessibility дозволи
8. ✅ Оновить tetyana бінарник
9. ✅ Побудує проект
10. ✅ Виконає фінальні перевірки

---

## ✅ Перевірка після setup

```bash
# Перевірити Python версію
python3 --version

# Перевірити LangChain
python3 -c "import langchain; print(langchain.__version__)"

# Перевірити LangGraph
python3 -c "import langgraph; print(langgraph.__version__)"

# Перевірити RAG
python3 -c "import chromadb; print('RAG OK')"

# Перевірити Vision
python3 -c "from PIL import Image; import pyautogui; print('Vision OK')"
```

---

## 📁 Структура після setup

```
atlas/
├── venv/                          ✅ Python 3.12 (уніфіковане)
├── python/venv -> ../venv         🔗 Symlink для зворотної сумісності
├── requirements.txt               ✅ Всі залежності
├── setup.sh                       ✅ Оновлено для Python 3.12
├── .env                           ✅ Конфігурація
└── docs/
    ├── PYTHON_DEPENDENCIES_ANALYSIS.md
    └── SETUP_PYTHON_312.md
```

---

## 🎯 Наступні кроки

1. Запустити: `bash setup.sh`
2. Налаштувати API ключі в `.env`
3. Запустити завдання: `npm run cli "Відкрий Калькулятор"`

---

**Дата**: 11 грудня 2025  
**Версія**: Python 3.12.12  
**Статус**: ✅ ГОТОВО
