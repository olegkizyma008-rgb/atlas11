# ЕТАП 2: ДОСЛІДЖЕННЯ OPEN INTERPRETER BRIDGE ТА ІНТЕГРАЦІЇ

## 📡 АРХІТЕКТУРА МОСТА

### Загальна схема взаємодії
```
┌─────────────────────────────────────────────────────────────┐
│                    ATLAS (TypeScript/Node.js)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TetyanaExecutor (executor.ts)                       │  │
│  │  - Планує кроки                                      │  │
│  │  - Валідує з Vision (Grisha)                         │  │
│  │  - Вибирає execution engine                          │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│                   │ executionConfig.engine === 'python-bridge'
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │  OpenInterpreterBridge (open_interpreter_bridge.ts)  │  │
│  │  - spawn() Python process                            │  │
│  │  - Передає env vars (API keys)                       │  │
│  │  - Слухає stdout/stderr                              │  │
│  │  - Повертає результат                                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│                   │ spawn(PYTHON_PATH, [AGENT_SCRIPT])     │
│                   │                                         │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    │ ~/mac_assistant/venv/bin/python3
                    │ ~/mac_assistant/mac_master_agent.py
                    │
┌───────────────────▼─────────────────────────────────────────┐
│              PYTHON PROCESS (Open Interpreter)              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  mac_master_agent.py                                │  │
│  │  - Завантажує .env конфігурацію                      │  │
│  │  - Ініціалізує Open Interpreter                      │  │
│  │  - Налаштовує LLM (Gemini/Copilot)                  │  │
│  │  - Налаштовує Vision (gpt-4o)                        │  │
│  │  - Налаштовує Accessibility                          │  │
│  │  - Запускає interactive chat або single task         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Open Interpreter Engine                            │  │
│  │  - Аналізує prompt                                   │  │
│  │  - Генерує Python/AppleScript код                    │  │
│  │  - Виконує код                                       │  │
│  │  - Повертає результат                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  macOS Integration                                  │  │
│  │  - mac_accessibility.py (PyObjC)                     │  │
│  │  - AppleScript execution                             │  │
│  │  - UI control (mouse, keyboard)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 OPEN INTERPRETER BRIDGE - ДЕТАЛЬНИЙ АНАЛІЗ

### Файл: `open_interpreter_bridge.ts`

#### Константи та шляхи
```typescript
const HOME = process.env.HOME || '/Users/dev'
const PYTHON_PATH = path.join(HOME, 'mac_assistant/venv/bin/python3')
const AGENT_SCRIPT_PATH = path.join(HOME, 'mac_assistant/mac_master_agent.py')
const ENV_FILE_PATH = path.join(HOME, 'Documents/GitHub/atlas/.env')
```

**Призначення:**
- Визначає шляхи до Python venv та агента
- Завантажує конфігурацію з .env файлу
- Забезпечує переносимість (використовує HOME змінну)

#### Функція: `loadEnvFile()`
```typescript
function loadEnvFile(): Record<string, string>
```

**Логіка:**
1. Перевіряє існування файлу `.env`
2. Читає вміст файлу
3. Парсить рядки у формат `KEY=VALUE`
4. Ігнорує коментарі (рядки, що починаються з `#`)
5. Повертає об'єкт з усіма змінними

**Важливо:** Це дозволяє Python процесу мати доступ до всіх API ключів без додаткової конфігурації.

#### Метод: `execute(prompt: string)`
```typescript
async execute(prompt: string): Promise<string>
```

**Етапи виконання:**

1. **Завантаження конфігурації**
   ```typescript
   const envFileVars = loadEnvFile()
   const visionConfig = getVisionConfig()
   ```

2. **Підготовка environment змінних**
   ```typescript
   const env = {
       ...process.env,           // Існуючі змінні
       ...envFileVars,           // Змінні з .env
       GEMINI_API_KEY: ...,      // Fallback chain
       COPILOT_API_KEY: ...,
       OPENAI_API_KEY: ...,
       PYTHONUNBUFFERED: '1'     // Для real-time output
   }
   ```

3. **Запуск Python процесу**
   ```typescript
   this.process = spawn(PYTHON_PATH, [AGENT_SCRIPT_PATH, prompt], {
       env,
       cwd: HOME
   })
   ```

4. **Обробка виходу**
   - **stdout**: Логування та накопичення результату
   - **stderr**: Логування (Open Interpreter часто логує туди)
   - **close**: Резолв/реджект Promise на основі exit code

5. **Обробка помилок**
   - Якщо процес не запустився: `reject(err)`
   - Якщо exit code !== 0: `reject(new Error(...))`
   - Якщо успішно: `resolve(fullOutput)`

#### Метод: `checkEnvironment()`
```typescript
static checkEnvironment(): boolean {
    return fs.existsSync(PYTHON_PATH) && fs.existsSync(AGENT_SCRIPT_PATH)
}
```

**Перевіряє:**
- Наявність Python venv
- Наявність агента скрипту

**Використання:** Перед запуском моста перевіряється, чи все на місці.

## 🐍 MAC_MASTER_AGENT.PY - ДЕТАЛЬНИЙ АНАЛІЗ

### Конфігурація LLM

#### Завантаження API ключів
```python
KEY_GEMINI = os.environ.get("GEMINI_API_KEY")
KEY_COPILOT = os.environ.get("COPILOT_API_KEY") or os.environ.get("BRAIN_API_KEY")
```

**Пріоритет:**
1. GEMINI_API_KEY (рекомендується для Open Interpreter)
2. COPILOT_API_KEY або BRAIN_API_KEY (з fallback)

#### Вибір моделі
```python
if KEY_GEMINI:
    interpreter.llm.model = "gemini/gemini-2.0-flash"
    interpreter.llm.api_key = KEY_GEMINI
elif KEY_COPILOT:
    interpreter.llm.model = "gpt-4o"
    interpreter.llm.api_key = KEY_COPILOT
else:
    sys.exit(1)  # Критична помилка
```

**Логіка:**
- Gemini 2.0-flash - рекомендована модель (нативна підтримка в Open Interpreter)
- GPT-4o - fallback (потребує спеціальної конфігурації endpoint)

### Конфігурація Vision

```python
interpreter.vision = True
interpreter.vision_model = "gpt-4o"
interpreter.vision_screenshot_every = 3  # Скріншот кожні 3 кроки
```

**Особливості:**
- Vision увімкнена для аналізу скріншотів
- Модель GPT-4o для high-quality аналізу
- Періодичні скріншоти для контролю виконання

### Конфігурація Accessibility

```python
interpreter.computer.accessibility = True  # Дозвіл на доступ до UI
interpreter.computer.mouse = True          # Контроль мишею
interpreter.computer.keyboard = True       # Введення тексту
interpreter.computer.display = True        # Показ дій (червоний круг)
```

**Результат:** Open Interpreter отримує повний контроль над macOS UI.

### Custom Instructions (українська мова)

```python
interpreter.custom_instructions = """
Ти — агент автоматизації macOS.

ПРАВИЛА:
1. Використовуй System Events keystroke для введення тексту
2. Використовуй System Events click для кліків
3. Завжди чекай після дій: `delay 0.5`
4. Для відкриття додатків: `tell application "AppName" to activate`

ПРИКЛАД для Calculator:
```applescript
tell application "Calculator" to activate
delay 0.5
tell application "System Events" to keystroke "22*45"
tell application "System Events" to keystroke return
```

Говори українською. Виконуй завдання покроково.
"""
```

**Призначення:**
- Навчає Open Interpreter правильному синтаксису AppleScript
- Забезпечує українськомовні відповіді
- Дає приклади для типових завдань

### Перевірка Accessibility дозволів

```python
def check_accessibility_permission():
    """Перевіряє, чи надано дозволи Accessibility"""
    test_script = '''
    tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
    end tell
    '''
    
    result = subprocess.run(['osascript', '-e', test_script], ...)
    
    if result.returncode == 0:
        return True  # Дозволи надано
    else:
        # Показати інструкції користувачу
        return False
```

**Логіка:**
1. Запускає простий AppleScript, що потребує Accessibility дозволів
2. Якщо успішно - дозволи надано
3. Якщо помилка - показує інструкції для налаштування

### Режими роботи

#### 1. Single-shot (з аргументами)
```bash
python3 mac_master_agent.py "Відкрий Калькулятор"
```

```python
if len(sys.argv) > 1:
    prompt = " ".join(sys.argv[1:])
    interpreter.chat(prompt)
```

**Використання:** Для одноразового виконання завдання.

#### 2. Interactive (без аргументів)
```bash
python3 mac_master_agent.py
```

```python
while True:
    user_input = Prompt.ask("\n[bold cyan]>>[/bold cyan]")
    if user_input.lower() in ['exit', 'quit', 'вихід']:
        break
    interpreter.chat(user_input)
```

**Використання:** Для інтерактивної роботи з агентом.

## 🔗 ІНТЕГРАЦІЯ З TETYANA EXECUTOR

### Файл: `executor.ts` (рядки 560-630)

#### Метод: `executeStepViaBridge()`

```typescript
private async executeStepViaBridge(
    step: PlanStep, 
    stepNum: number, 
    feedbackContext: string = ""
): Promise<any>
```

**Логіка виконання:**

1. **Перевірка environment**
   ```typescript
   if (!OpenInterpreterBridge.checkEnvironment()) {
       reject(new Error("Python environment not found"))
   }
   ```

2. **Побудова контексту**
   ```typescript
   const fullPlanContext = plan.steps.map((s, i) =>
       `Step ${i + 1}: ${s.action} ${JSON.stringify(s.args)}`
   ).join('\n')
   ```

3. **Формування prompt для кроку**
   ```typescript
   const stepPrompt = `
   SINGLE STEP EXECUTION
   
   Execute ONLY Step ${stepNum}, then stop.
   
   GOAL: "${plan.goal}"
   
   PLAN (reference only):
   ${fullPlanContext}
   
   CURRENT STEP (${stepNum}):
   Action: ${step.action}
   Args: ${JSON.stringify(step.args)}
   ${correctionPrompt}
   
   RULES:
   1. Do ONLY Step ${stepNum}. Stop after.
   2. Activate target app before interacting.
   3. Use AppleScript for macOS control.
   4. If opening an app, clear its state first.
   5. Output "Step ${stepNum} done." when finished.
   `
   ```

4. **Запуск моста**
   ```typescript
   const bridge = new OpenInterpreterBridge()
   const result = await bridge.execute(stepPrompt)
   ```

5. **Обробка результату**
   - Успіх: `resolve(result)`
   - Помилка: `reject(error)`

### Цикл виконання з перевіркою Vision

```
┌─────────────────────────────────────────────┐
│  Tetyana: Крок 1 - Open Calculator         │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  Vision: Pause capture                      │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  OpenInterpreterBridge.execute(prompt)      │
│  - Запускає Python процес                   │
│  - Виконує AppleScript                      │
│  - Повертає результат                       │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  Vision: Resume capture                     │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  Grisha: Verify step (Vision observation)   │
│  - Аналізує скріншот                        │
│  - Перевіряє, чи крок виконано              │
│  - Повертає verified: true/false            │
└────────────┬────────────────────────────────┘
             │
        ┌────┴─────┐
        │           │
        ▼           ▼
    ✅ OK      ❌ FAILED
        │           │
        │           ▼
        │    ┌──────────────────┐
        │    │ Retry (max 3)    │
        │    │ з feedback       │
        │    └──────────────────┘
        │
        ▼
   Next Step
```

## 📊 ПОТІК ДАНИХ

### Від Tetyana до Python

```
Tetyana Executor
    ↓
    executeStepViaBridge()
    ↓
    OpenInterpreterBridge.execute(prompt)
    ↓
    spawn(python3, [mac_master_agent.py, prompt])
    ↓
    Environment Variables:
    - GEMINI_API_KEY
    - COPILOT_API_KEY
    - PYTHONUNBUFFERED=1
    ↓
    Python Process
    ↓
    interpreter.chat(prompt)
    ↓
    Open Interpreter Engine
    ↓
    AppleScript / Python Code
    ↓
    macOS System
```

### Від Python до Tetyana

```
Python Process (stdout)
    ↓
    OpenInterpreterBridge.stdout listener
    ↓
    Накопичення результату (fullOutput)
    ↓
    Process close event
    ↓
    resolve(fullOutput)
    ↓
    Tetyana: result отримано
    ↓
    Grisha: Vision verification
    ↓
    Tetyana: Next step або retry
```

## ⚙️ КОНФІГУРАЦІЙНІ ПАРАМЕТРИ

### Execution Config

```typescript
export function getExecutionConfig(): ExecutionConfig {
    return {
        engine: process.env.EXECUTION_ENGINE || 'native'
        // 'python-bridge' - використовує Open Interpreter
        // 'native' - використовує MCP OS Server
    }
}
```

### Умова для вибору Python Bridge

```typescript
const executionConfig = getExecutionConfig()
const usePythonBridge = executionConfig.engine === 'python-bridge'

if (usePythonBridge) {
    // Використовуємо Open Interpreter Bridge
    await this.executeStepViaBridge(step, stepNum, feedbackContext)
} else {
    // Використовуємо MCP OS Server (native)
    await this.executeStep(step, stepNum)
}
```

## 🎯 КЛЮЧОВІ ОСОБЛИВОСТІ

### 1. Асинхронність
- Open Interpreter Bridge повертає Promise
- Tetyana чекає на результат
- Грішина перевіряє результат паралельно

### 2. Обробка помилок
- Перевірка environment перед запуском
- Timeout для Python процесу
- Retry логіка з feedback контекстом
- Graceful degradation (fallback на native)

### 3. Безпека
- Перевірка дозволів перед запуском
- Валідація кроків перед виконанням
- Vision verification після кожного кроку
- Deadlock breaker (replan при критичних помилках)

### 4. Гнучкість
- Підтримка як single-shot, так і interactive режимів
- Fallback між LLM провайдерами
- Модульна архітектура (легко замінити компоненти)
- Українськомовна підтримка

## 📈 ГОТОВНІСТЬ КОМПОНЕНТІВ

- ✅ **OpenInterpreterBridge**: 100% готово
- ✅ **mac_master_agent.py**: 100% готово
- ✅ **TetyanaExecutor integration**: 100% готово
- ✅ **Environment setup**: 100% готово
- ⚠️ **Permissions**: потребує налаштування
- ⚠️ **RAG integration**: потребує запуску index_rag.py

---
**Статус ЕТАПУ 2**: ✅ ЗАВЕРШЕНО
**Наступний етап**: Accessibility та UI Control система
