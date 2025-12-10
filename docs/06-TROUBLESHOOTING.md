# 🔧 Troubleshooting

Рішення для поширених проблем.

## 🚨 Поширені проблеми

### Python не знайдено

**Помилка**: `Python not found` або `command not found: python3`

**Рішення**:

```bash
# Перевірте, де встановлено Python
which python3

# Якщо не знайдено, встановіть через Homebrew
brew install python@3.12

# Перевірте версію
python3 --version

# Оновіть PATH у .env
PYTHON_PATH=/opt/homebrew/bin/python3
```

### Accessibility дозволи

**Помилка**: `Accessibility denied` або `Permission denied`

**Рішення**:

1. Відкрийте **System Settings → Privacy & Security → Accessibility**
2. Натисніть **+** (плюс)
3. Додайте:
   - **Terminal** (або iTerm)
   - **/opt/homebrew/opt/python@3.12/bin/python3.12**
4. Перезавантажте Terminal

### API ключ не знайдено

**Помилка**: `API Key not found` або `VISION_API_KEY is undefined`

**Рішення**:

```bash
# Перевірте наявність .env файлу
ls -la /Users/dev/Documents/GitHub/atlas/.env

# Перевірте вміст
cat /Users/dev/Documents/GitHub/atlas/.env | grep API_KEY

# Якщо файлу немає, скопіюйте з прикладу
cp /Users/dev/Documents/GitHub/atlas/.env.example /Users/dev/Documents/GitHub/atlas/.env

# Відредагуйте .env з вашими ключами
nano /Users/dev/Documents/GitHub/atlas/.env
```

**Детальніше**: [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)

### RAG база не знайдена

**Помилка**: `RAG database not found` або `chroma_mac directory not found`

**Рішення**:

```bash
# Перевірте наявність папки
ls -la ~/mac_assistant_rag/chroma_mac

# Якщо папки немає, створіть її
mkdir -p ~/mac_assistant_rag/chroma_mac

# Індексуйте базу знань
~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py
```

### Virtual Environment не активний

**Помилка**: `venv not found` або `pip: command not found`

**Рішення**:

```bash
# Перевірте наявність venv
ls -la ~/mac_assistant/venv

# Якщо немає, створіть новий
python3 -m venv ~/mac_assistant/venv

# Активуйте
source ~/mac_assistant/venv/bin/activate

# Встановіть залежності
pip install -r ~/mac_assistant/requirements.txt
```

### Gemini Live WebSocket помилка

**Помилка**: `WebSocket connection failed` або `GEMINI_LIVE_API_KEY is invalid`

**Рішення**:

```bash
# Перевірте API ключ
grep VISION_LIVE_API_KEY /Users/dev/Documents/GitHub/atlas/.env

# Переконайтеся, що ключ валідний
# Отримайте новий ключ на https://ai.google.dev/

# Оновіть .env
nano /Users/dev/Documents/GitHub/atlas/.env
```

### Copilot токен експайрив

**Помилка**: `Copilot token expired` або `401 Unauthorized`

**Рішення**:

```bash
# Отримайте новий токен
node /Users/dev/Documents/GitHub/atlas/extract-copilot-token.js

# Оновіть .env
nano /Users/dev/Documents/GitHub/atlas/.env
```

## 🔍 Діагностика

### Перевірка всієї конфігурації

```bash
# Запустіть діагностичний скрипт
bash ~/mac_assistant/check_config.sh
```

### Перевірка Python

```bash
# Версія
python3 --version

# Модулі
python3 -c "import open_interpreter; print('OK')"
python3 -c "import langchain; print('OK')"
python3 -c "import chromadb; print('OK')"

# Accessibility
python3 -c "import pyobjc_framework_Accessibility; print('OK')"
```

### Перевірка Node.js

```bash
# Версія
node --version
npm --version

# Залежності
npm list @google/generative-ai
npm list openai
npm list @modelcontextprotocol/sdk
```

### Перевірка API ключів

```bash
# Gemini
curl -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $VISION_API_KEY" \
  -d '{"contents": [{"parts": [{"text": "test"}]}]}'

# Copilot
curl -X POST https://api.github.com/copilot_internal/v2/token \
  -H "Authorization: Bearer $COPILOT_API_KEY"
```

## 📊 Логування

### Увімкнення debug логування

```bash
# Встановіть LOG_LEVEL
export LOG_LEVEL=debug

# Запустіть з логуванням
npm run cli -- "команда"
```

### Перегляд логів

```bash
# Останні 100 рядків
tail -100 ~/.atlas/logs/app.log

# Фільтрування за помилками
grep ERROR ~/.atlas/logs/app.log

# Real-time логування
tail -f ~/.atlas/logs/app.log
```

## 🆘 Крайні заходи

### Повне очищення

```bash
# Видаліть кеш
rm -rf ~/.atlas/cache
rm -rf ~/.atlas/logs

# Видаліть node_modules
rm -rf /Users/dev/Documents/GitHub/atlas/node_modules

# Переінстальюйте залежності
npm install
```

### Переінстальція Python

```bash
# Видаліть venv
rm -rf ~/mac_assistant/venv

# Створіть новий
python3 -m venv ~/mac_assistant/venv

# Активуйте
source ~/mac_assistant/venv/bin/activate

# Встановіть залежності
pip install open-interpreter langchain chromadb pyobjc-framework-Accessibility python-dotenv
```

## 📞 Контакти для допомоги

- **GitHub Issues**: https://github.com/olegkizyma008-rgb/atlas/issues
- **Documentation**: [INDEX.md](./INDEX.md)
- **API Docs**: [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)

---

**Статус**: ✅ Готово до використання
