# ЕТАП 3: АНАЛІЗ ACCESSIBILITY ТА UI CONTROL СИСТЕМИ

## 🎯 ЗАГАЛЬНА АРХІТЕКТУРА

### Два рівні контролю UI

```
┌──────────────────────────────────────────────────────────┐
│                  TETYANA EXECUTOR                        │
│                                                          │
│  executionConfig.engine === 'python-bridge'             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  РІВЕНЬ 1: Open Interpreter (Python)             │   │
│  │  - Генерує AppleScript код                        │   │
│  │  - Використовує mac_accessibility.py             │   │
│  │  - Прямий доступ до Accessibility API            │   │
│  │  - Контроль: mouse, keyboard, display            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  executionConfig.engine === 'native'                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  РІВЕНЬ 2: MCP OS Server (TypeScript)            │   │
│  │  - Стандартний MCP протокол                      │   │
│  │  - Інструменти: open_application, mouse_click    │   │
│  │  - AppleScript fallback                          │   │
│  │  - Перевірка дозволів                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│              macOS ACCESSIBILITY API                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AppleScript (osascript)                         │   │
│  │  - tell application "System Events"              │   │
│  │  - keystroke, click, activate                    │   │
│  │  - Найвищий рівень абстракції                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PyObjC (Python)                                 │   │
│  │  - AXUIElement API                               │   │
│  │  - Quartz Events                                 │   │
│  │  - Низькорівневий доступ                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                  macOS SYSTEM                            │
│                                                          │
│  - UI Events (mouse, keyboard)                          │
│  - Application Control                                  │
│  - Window Management                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 🔐 ПЕРЕВІРКА ACCESSIBILITY ДОЗВОЛІВ

### Файл: `os.ts` (рядки 19-54)

```typescript
async function checkAccessibilityPermissions(): Promise<{ granted: boolean, message: string }>
```

#### Логіка перевірки

1. **Запуск тестового AppleScript**
   ```typescript
   const testScript = 'tell application "System Events" to return name of first process'
   await execAsync(`osascript -e '${testScript}'`)
   ```

2. **Аналіз результату**
   - Якщо успішно: `{ granted: true }`
   - Якщо помилка з кодом -1719: дозволи не надано
   - Якщо інша помилка: невідомий статус

3. **Інструкції для користувача**
   ```
   ❌ Accessibility Permissions Required
   
   Please enable:
   1. Open System Settings → Privacy & Security → Accessibility
   2. Add your Terminal app or Electron app to the list
   3. Toggle the switch ON
   4. Restart this application
   
   Alternatively:
     tccutil reset Accessibility
   ```

### Коди помилок
- **-1719**: "not allowed" - дозволи не надано
- **-1728**: "not permitted" - доступ заборонено
- **Інші**: невідомі помилки

## 🛠️ MCP OS SERVER - ДЕТАЛЬНИЙ АНАЛІЗ

### Файл: `src/kontur/mcp/servers/os.ts`

#### Структура сервера

```typescript
const server = new Server(
    {
        name: "atlas-os-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
)
```

### Доступні інструменти

#### 1. **open_application**
```typescript
{
    name: "open_application",
    description: "Opens an application on macOS and activates it",
    inputSchema: {
        type: "object",
        properties: {
            appName: { type: "string" }
        },
        required: ["appName"]
    }
}
```

**Реалізація:**
```applescript
tell application "AppName" to activate
```

**Приклади:**
- `open_application("Calculator")`
- `open_application("Safari")`
- `open_application("Terminal")`

#### 2. **keyboard_type**
```typescript
{
    name: "keyboard_type",
    description: "Simulate typing text",
    inputSchema: {
        properties: {
            text: { type: "string" },
            delay: { type: "number" }  // Delay between keystrokes
        },
        required: ["text"]
    }
}
```

**Реалізація:**
```applescript
tell application "System Events" to keystroke "text"
```

**Особливості:**
- Підтримує спеціальні символи
- Можна встановити затримку між символами
- Безпечна обробка спеціальних символів

#### 3. **keyboard_press**
```typescript
{
    name: "keyboard_press",
    description: "Press a specific key combination",
    inputSchema: {
        properties: {
            key: { type: "string" },  // 'return', 'space', 'a'
            modifiers: { type: "array" }  // 'command down', 'shift down'
        },
        required: ["key"]
    }
}
```

**Реалізація:**
```applescript
tell application "System Events"
    keystroke "a" using command down
end tell
```

**Приклади:**
- `keyboard_press("return")` - Enter
- `keyboard_press("space")` - Space
- `keyboard_press("a", ["command down"])` - Cmd+A
- `keyboard_press("s", ["command down", "shift down"])` - Cmd+Shift+S

#### 4. **mouse_click**
```typescript
{
    name: "mouse_click",
    description: "Click mouse at specific coordinates",
    inputSchema: {
        properties: {
            x: { type: "number" },
            y: { type: "number" },
            double: { type: "boolean" }
        },
        required: ["x", "y"]
    }
}
```

**Реалізація:**
```applescript
tell application "System Events" to click at {x, y}
```

**Особливості:**
- Абсолютні координати на екрані
- Підтримка подвійного кліку
- Можна комбінувати з модифікаторами

#### 5. **ui_tree**
```typescript
{
    name: "ui_tree",
    description: "Get accessibility tree of an application",
    inputSchema: {
        properties: {
            appName: { type: "string" },
            pid: { type: "number" }
        }
    }
}
```

**Повертає:**
```json
{
    "role": "AXApplication",
    "title": "Calculator",
    "children": [
        {
            "role": "AXWindow",
            "title": "Calculator",
            "children": [...]
        }
    ]
}
```

**Використання:**
- Розуміння структури UI додатку
- Пошук елементів за role/title
- Отримання координат елементів

#### 6. **ui_find**
```typescript
{
    name: "ui_find",
    description: "Find UI element by role or title",
    inputSchema: {
        properties: {
            appName: { type: "string" },
            role: { type: "string" },  // "AXButton", "AXTextField"
            title: { type: "string" }   // "OK", "Cancel"
        }
    }
}
```

**Приклади:**
- `ui_find("Calculator", role="AXButton", title="1")`
- `ui_find("Safari", role="AXTextField")`

#### 7. **ui_action**
```typescript
{
    name: "ui_action",
    description: "Perform accessibility action on UI element",
    inputSchema: {
        properties: {
            appName: { type: "string" },
            role: { type: "string" },
            title: { type: "string" },
            action: { type: "string" }  // "AXPress", "AXShowMenu"
        },
        required: ["action"]
    }
}
```

**Доступні дії:**
- `AXPress` - натиснути кнопку
- `AXShowMenu` - показати меню
- `AXConfirm` - підтвердити
- `AXCancel` - скасувати

#### 8. **execute_applescript**
```typescript
{
    name: "execute_applescript",
    description: "Execute raw AppleScript for complex UI automation",
    inputSchema: {
        properties: {
            script: { type: "string" }
        },
        required: ["script"]
    }
}
```

**Приклад:**
```applescript
tell application "Safari"
    activate
    delay 0.5
    tell application "System Events"
        keystroke "l" using command down
        delay 0.3
        keystroke "youtube.com"
        keystroke return
    end tell
end tell
```

#### 9. **get_screenshot**
```typescript
{
    name: "get_screenshot",
    description: "Capture screenshot of the main screen",
    inputSchema: {
        properties: {
            action: { type: "string" },  // "screen"
            pid: { type: "number" }
        }
    }
}
```

**Реалізація:**
```bash
screencapture -x /tmp/screenshot.png
```

**Використання:**
- Vision verification (Grisha аналізує скріншот)
- Отримання поточного стану UI

#### 10. **get_screen_size**
```typescript
{
    name: "get_screen_size",
    description: "Get current screen resolution",
    inputSchema: { type: "object", properties: {} }
}
```

**Повертає:**
```json
{
    "width": 1920,
    "height": 1080
}
```

## 🐍 MAC_ACCESSIBILITY.PY - ДЕТАЛЬНИЙ АНАЛІЗ

### Файл: `/Users/dev/mac_assistant/mac_accessibility.py`

#### Залежності
```python
import Quartz
from ApplicationServices import (
    AXUIElementCreateSystemWide,
    AXUIElementCreateApplication,
    AXUIElementCopyAttributeValue,
    kAXFocusedApplicationAttribute,
    kAXPositionAttribute,
    kAXSizeAttribute
)
```

**Джерела:**
- **Quartz**: Core Graphics для mouse/keyboard events
- **ApplicationServices**: Accessibility API для UI елементів

### Функції

#### 1. **get_ax_attribute(element, attribute)**
```python
def get_ax_attribute(element, attribute):
    try:
        error, value = AXUIElementCopyAttributeValue(element, attribute, None)
        if error == 0:
            return value
    except Exception:
        pass
    return None
```

**Логіка:**
- Отримує атрибут AXUIElement
- Повертає значення, якщо успішно (error == 0)
- Повертає None при помилці

**Атрибути:**
- `kAXPositionAttribute` - координати (x, y)
- `kAXSizeAttribute` - розміри (width, height)
- `kAXTitleAttribute` - заголовок
- `kAXRoleAttribute` - тип елемента

#### 2. **click_element(ax_element)**
```python
def click_element(ax_element):
    # Get Position and Size
    pos_value = get_ax_attribute(ax_element, kAXPositionAttribute)
    size_value = get_ax_attribute(ax_element, kAXSizeAttribute)
    
    # Calculate center
    center_x = x + (w / 2)
    center_y = y + (h / 2)
    
    # Send mouse events
    _mouse_event(Quartz.kCGEventLeftMouseDown, center_x, center_y)
    _mouse_event(Quartz.kCGEventLeftMouseUp, center_x, center_y)
```

**Процес:**
1. Отримує позицію та розмір елемента
2. Обчислює центр елемента
3. Генерує MouseDown + MouseUp события

#### 3. **_mouse_event(type, x, y)**
```python
def _mouse_event(type, x, y):
    ev = Quartz.CGEventCreateMouseEvent(None, type, (x, y), Quartz.kCGMouseButtonLeft)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, ev)
```

**Логіка:**
- Створює mouse event (Down/Up)
- Постить його в HID event tap
- Результат: реальний click на macOS

#### 4. **type_text(text)**
```python
def type_text(text):
    for char in text:
        esc_char = char.replace('"', '\\"').replace('\\', '\\\\')
        cmd = f'tell application "System Events" to keystroke "{esc_char}"'
        os.system(f"osascript -e '{cmd}'")
        time.sleep(0.01)
```

**Логіка:**
- Ітерує по кожному символу
- Екранує спеціальні символи
- Запускає AppleScript для кожного символу
- Затримка 10ms між символами

**Чому AppleScript?**
- Надійніше для спеціальних символів
- Не потребує маппінгу keycodes
- Підтримує Unicode

#### 5. **get_ui_tree()**
```python
def get_ui_tree():
    system = AXUIElementCreateSystemWide()
    error, app_ref = AXUIElementCopyAttributeValue(system, kAXFocusedApplicationAttribute, None)
    if error == 0:
        return app_ref
    return None
```

**Логіка:**
- Отримує системний AXUIElement
- Знаходить focused application
- Повертає reference до додатку

## 📊 ПОРІВНЯННЯ ДВОХ РІВНІВ КОНТРОЛЮ

| Аспект | Open Interpreter (Python) | MCP OS Server (TypeScript) |
|--------|--------------------------|---------------------------|
| **Рівень абстракції** | Низький (PyObjC) | Середній (AppleScript) |
| **Гнучкість** | Висока (прямий доступ) | Середня (стандартні інструменти) |
| **Надійність** | Висока (низькорівневий) | Дуже висока (AppleScript) |
| **Швидкість** | Висока (прямі вызови) | Середня (через osascript) |
| **Складність** | Висока (потребує знань) | Низька (стандартні інструменти) |
| **Обробка помилок** | Потребує реалізації | Вбудована |
| **Перевірка дозволів** | Базова | Детальна |
| **Fallback** | Немає | AppleScript fallback |

## 🔄 ПОТІК ВИКОНАННЯ UI ДІЇ

### Приклад: Відкрити Safari та перейти на YouTube

#### Через Open Interpreter (Python)
```python
# mac_master_agent.py отримує prompt:
# "Відкрий Safari і перейди на youtube.com"

# Open Interpreter генерує AppleScript:
applescript_code = """
tell application "Safari" to activate
delay 1
tell application "System Events"
    keystroke "l" using command down
    delay 0.3
    keystroke "youtube.com"
    keystroke return
end tell
"""

# Виконує через osascript:
os.system(f"osascript -e '{applescript_code}'")

# Результат: Safari відкритий, YouTube завантажується
```

#### Через MCP OS Server (TypeScript)
```typescript
// Tetyana Executor отримує план:
const plan = {
    steps: [
        { action: 'open_application', args: { appName: 'Safari' } },
        { action: 'keyboard_press', args: { key: 'l', modifiers: ['command down'] } },
        { action: 'keyboard_type', args: { text: 'youtube.com' } },
        { action: 'keyboard_press', args: { key: 'return' } }
    ]
}

// Tetyana виконує кожен крок через MCP:
await executeStep(step)  // Викликає MCP инструмент

// MCP OS Server виконує AppleScript:
const script = `tell application "Safari" to activate`
await execAsync(`osascript -e '${script}'`)

// Результат: Safari відкритий
```

## ⚙️ КОНФІГУРАЦІЯ EXECUTION ENGINE

### Вибір рівня контролю

```typescript
const executionConfig = getExecutionConfig()
const usePythonBridge = executionConfig.engine === 'python-bridge'

if (usePythonBridge) {
    // Використовуємо Open Interpreter
    // Більше гнучкості, але потребує дозволів
    await executeStepViaBridge(step, stepNum, feedbackContext)
} else {
    // Використовуємо MCP OS Server
    // Більше надійності, стандартні інструменти
    await executeStep(step, stepNum)
}
```

### Змінна середовища
```bash
export EXECUTION_ENGINE=python-bridge  # або 'native'
```

## 🎯 КЛЮЧОВІ ОСОБЛИВОСТІ

### 1. Двошаровість
- **Рівень 1**: Open Interpreter (Python) - для складних завдань
- **Рівень 2**: MCP OS Server (TypeScript) - для стандартних операцій

### 2. Fallback механізм
- Якщо Python bridge не працює → використовуємо MCP
- Якщо MCP не працює → AppleScript fallback
- Якщо AppleScript не працює → помилка

### 3. Перевірка дозволів
- Перед запуском перевіряємо Accessibility дозволи
- Показуємо інструкції, якщо дозволи не надано
- Graceful degradation (деякі функції можуть не працювати)

### 4. Безпека
- Екранування спеціальних символів
- Валідація координат мишки
- Перевірка існування елементів перед дією

## 📈 ГОТОВНІСТЬ КОМПОНЕНТІВ

- ✅ **MCP OS Server**: 100% готово
- ✅ **mac_accessibility.py**: 100% готово
- ✅ **AppleScript integration**: 100% готово
- ✅ **Accessibility permissions check**: 100% готово
- ⚠️ **PyObjC optimization**: потребує тестування
- ⚠️ **Error recovery**: базова реалізація

---
**Статус ЕТАПУ 3**: ✅ ЗАВЕРШЕНО
**Наступний етап**: RAG система та база знань
