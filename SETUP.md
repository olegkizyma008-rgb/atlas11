# 🚀 ATLAS v12 + TETYANA v12 — Complete Setup Guide

## ✅ Статус: Повнофункціональне налаштування

Цей документ описує повне налаштування ATLAS v12 з уніфікованим Python середовищем, Vision залежностями, RAG базою та дозволами.

## 📋 Що включено

### 1. Системні залежності
- ✅ Homebrew
- ✅ Chrome
- ✅ Redis
- ✅ Node.js
- ✅ Python 3

### 2. Node.js залежності
- ✅ npm install

### 3. Python середовище (уніфіковане)
- ✅ `./venv/` у корені проекту
- ✅ Всі залежності з `requirements.txt`
- ✅ Vision: pyautogui, PIL
- ✅ RAG: chromadb, langchain, sentence-transformers
- ✅ LangGraph: langgraph
- ✅ macOS: pyobjc, atomacos

### 4. Додаткові налаштування
- ✅ Copilot CLI перевірка
- ✅ RAG база індексація
- ✅ Accessibility дозволи
- ✅ .env конфігурація
- ✅ tetyana бінарник оновлення
- ✅ Backward compatibility symlink

### 5. Проект
- ✅ npm run build

## 🎯 Швидкий старт

### Перший запуск (повне налаштування)

```bash
cd /Users/dev/Documents/GitHub/atlas
bash setup.sh
```

Скрипт автоматично:
1. Перевіряє системні залежності
2. Встановлює Chrome, Redis, Node.js, Python
3. Встановлює Node.js залежності
4. Створює уніфіковане venv у корені
5. Встановлює всі Python залежності
6. Встановлює Vision залежності (pyautogui, PIL)
7. Завантажує BAAI/bge-m3 (safetensors) для MLX у кеш HF
8. Індексує RAG базу (якщо існує)
8. Запитує про Accessibility дозволи
9. Налаштовує .env файл
10. Оновлює tetyana бінарник
11. Створює backward compatibility symlink
12. Запускає Redis (опціонально)
13. Будує проект
14. Виконує фінальні перевірки

### Запуск завдань

```bash
# Через CLI (рекомендується)
npm run cli "Відкрий Калькулятор"

# Індексація RAG через CLI (авто USE_MLX=1 на Apple Silicon)
npm run cli    # → RAG Control Agent → Index Chroma

# Через бінарник (автоматично активує venv)
./bin/tetyana "Відкрий Калькулятор"

# Через Python напряму
source venv/bin/activate
python3 src/kontur/organs/tetyana_agent.py "Відкрий Калькулятор"
```

## 📦 Залежності (requirements.txt)

### Основні групи

| Група | Пакети | Призначення |
|-------|--------|-----------|
| **Core** | rich, python-dotenv, requests, pydantic, psutil | Основна функціональність |
| **LangChain + RAG** | langchain, langchain-chroma, langchain-huggingface, chromadb | Retrieval-Augmented Generation |
| **LangGraph** | langgraph | State management & graph execution |
| **Embeddings** | sentence-transformers, huggingface-hub | Vector embeddings & similarity search |
| **Redis** | redis | State persistence & caching |
| **Vision** | pillow, pyautogui | Screenshots & UI automation |
| **MLX (Apple Silicon)** | mlx, mlx_lm, safetensors | Швидкі embeddings на M-серії |
| **macOS** | pyobjc, atomacos, pyobjc-framework-* | Accessibility API & automation |
| **Testing** | pytest | Unit & integration tests |

## 🔄 Структура проекту

```
atlas/
├── venv/                          ✅ Уніфіковане venv у корені
│   ├── bin/python3
│   ├── lib/python3.12/site-packages/
│   └── ...
├── python/
│   ├── venv -> ../venv            🔗 Symlink для зворотної сумісності
│   └── mac_master_agent.py
├── requirements.txt               ✅ Всі залежності в одному файлі
├── setup.sh                       ✅ Повнофункціональний скрипт
├── bin/
│   └── tetyana                    ✅ Оновлено для нового venv
├── src/kontur/organs/
│   ├── tetyana_agent.py
│   └── tetyana_bridge.py
├── .env                           ✅ Конфігурація
└── docs/
    └── UNIFIED_ENVIRONMENT_SETUP.md
```

## 🛠️ Управління залежностями

### Додавання нової залежності

```bash
source venv/bin/activate
pip install package_name
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

## 🚨 Розв'язання проблем

| Проблема | Рішення |
|----------|---------|
| "Python venv не знайдено" | `bash setup.sh` |
| "ModuleNotFoundError" | `source venv/bin/activate && pip install -r requirements.txt` |
| "No safetensors found (bge-m3)" | `rm -rf ~/.cache/huggingface/hub/models--BAAI--bge-m3 && hf download BAAI/bge-m3 --local-dir ~/.cache/huggingface/hub/models--BAAI--bge-m3 --include "*.safetensors"` |
| "Permission denied" | `chmod +x bin/tetyana` |
| "Vision не працює" | `pip install --upgrade pillow pyautogui` |
| "RAG не індексована" | `python3 src/kontur/organs/index_rag.py` |

## 📚 Документація

- `README.md` - Основна документація проекту
- `ARCHITECTURE_ATLAS_V12.md` - Архітектура системи
- `docs/UNIFIED_ENVIRONMENT_SETUP.md` - Детальна документація Python середовища
- `docs/` - Повна документація

## ✅ Наступні кроки

1. ✅ Запустити `bash setup.sh`
2. ✅ Перевірити: `npm run cli "test"`
3. ✅ Налаштувати API ключі в `.env`
4. ✅ Запустити завдання: `./bin/tetyana "Відкрий Калькулятор"`

---

**Дата**: 11 грудня 2025  
**Версія**: ATLAS v12 + TETYANA v12  
**Статус**: ✅ ГОТОВО
