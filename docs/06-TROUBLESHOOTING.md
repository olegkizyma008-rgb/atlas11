# 🔧 Troubleshooting (KONTUR v12)

Рішення для поширених проблем у версії v12.

## 🚨 Поширені проблеми

### 🤖 "Grisha refused verification"

**Проблема**: Агент виконує дію, але система каже "Grisha відхилив" і запускає Retry.

**Рішення**:
1. Переконайтеся, що вікно програми **видиме** і не перекрите.
2. Перевірте, чи дозволено **Screen Recording** для Terminal у System Settings.
3. Якщо це специфічний UI, спробуйте перефразувати задачу, щоб змінити метод виконання.

### 🐍 "Python Bridge Failed"

**Проблема**: Tetyana не може запустити Python процес.

**Рішення**:
```bash
# Перевірте, чи працює venv
~/mac_assistant/venv/bin/python3 -c "print('OK')"

# Спробуйте перевстановити залежності
pip install langchain-chroma langchain-huggingface rich
```

### 📚 "RAG Model Download Stuck"

**Проблема**: Індексація або перший запуск зависає на "Loading model BAAI/bge-m3".

**Рішення**:
Це нормально для першого запуску, модель займає ~1-2 ГБ.
Якщо зависло надовго:
1. Зупиніть процес (Ctrl+C).
2. Видаліть кеш HuggingFace: `rm -rf ~/.cache/huggingface`.
3. Запустіть знову.

### Python не знайдено

**Помилка**: `Python not found` або `command not found: python3`

**Рішення**:

```bash
# Перевірте, де встановлено Python
which python3

# Оновіть PATH у .env
PYTHON_PATH=/Users/dev/mac_assistant/venv/bin/python3
```

### Accessibility дозволи

**Помилка**: `Accessibility denied` або `Permission denied`

**Рішення**:
1. Відкрийте **System Settings → Privacy & Security → Accessibility**
2. Видаліть (-) і додайте знову (+) **Terminal**.
3. Додайте бінарник Python з venv.

## 🔍 Діагностика

### Швидкий чек

```bash
# Запустіть діагностику
npm run cli -- "System Status"
```

### Перегляд логів

```bash
# Останні помилки
grep ERROR ~/.atlas/logs/app.log
```

## 🆘 Крайні заходи

### "Factory Reset"

```bash
# Очистити RAG і логи
rm -rf ~/mac_assistant_rag/chroma_mac
rm -rf ~/.atlas/logs

# Переінсталювати venv
rm -rf ~/mac_assistant/venv
python3 -m venv ~/mac_assistant/venv
source ~/mac_assistant/venv/bin/activate
pip install -r ~/mac_assistant/requirements.txt
```

---

**Контакти**: https://github.com/olegkizyma008-rgb/atlas/issues
