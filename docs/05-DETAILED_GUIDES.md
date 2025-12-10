# 📖 Детальні гайди (KONTUR v12)

Глибокий розбір основних компонентів та їх налаштування після оновлення до версії v12 "Kozyr".

## 📚 Зміст

- [Open Interpreter Bridge (v12)](#open-interpreter-bridge)
- [Accessibility & UI Control](#accessibility--ui-control)
- [RAG System (Self-Healing)](#rag-system)
- [Vision Feedback Loop](#vision-feedback-loop)
- [Voice Services](#voice-services)

## Open Interpreter Bridge

**Файл**: `src/modules/tetyana/open_interpreter_bridge.ts`

### Що це?

Міст між TypeScript ядром (Tetyana) та Python-агентом (Open Interpreter). У версії v12 отримав критичне оновлення — глибокий зворотний зв'язок від Vision.

### Основні функції v12

```typescript
// Стандартне виконання
execute(command: string): Promise<string>

// Виконання з Vision Feedback Loop (v12)
executeWithVisionFeedback(
    prompt: string, 
    maxRetries: number = 3
): Promise<string>
```

### Приклад Feedback Loop

```typescript
// 1. Tetyana виконує дію через Python
await bridge.execute("Click the blue button");

// 2. Grisha (Vision) перевіряє результат
const verification = await grishaVision.verifyStep(...);

// 3. Якщо помилка — bridge отримує feedback і пробує знову
if (!verification.verified) {
    // Автоматичний retry з корекцією
    await bridge.execute(`PREVIOUS FAILED: ${verification.message}. FIX IT.`);
}
```

**Детальніше**: [ETAP_2_OPEN_INTERPRETER_BRIDGE.md](../ETAP_2_OPEN_INTERPRETER_BRIDGE.md)

## Accessibility & UI Control

**Файл**: `~/mac_assistant/mac_master_agent.py` (Python)

У v12 ми використовуємо нативний AppleScript через Python Agent.

### Приклади команд (v12)

#### 1. Управління додатками
```python
# Відкрити додаток і очистити стан
tell application "Safari"
    activate
    tell application "System Events" to keystroke "n" using command down
end tell
```

#### 2. Введення тексту
```python
tell application "System Events"
    keystroke "Hello World"
    key code 36 # Enter
end tell
```

#### 3. Клік мишею (Coordinates)
```python
import pyautogui
pyautogui.click(x=100, y=200)
```

**Детальніше**: [ETAP_3_ACCESSIBILITY_UI_CONTROL.md](../ETAP_3_ACCESSIBILITY_UI_CONTROL.md)

## RAG System

**Файл**: `~/mac_assistant/index_rag.py`

### v12 "Kozyr" RAG
- **База**: 50,000+ прикладів
- **Self-healing**: Автоматичне навчання

### Як це працює (Code)

```python
# 1. Пошук перед дією (Automatic)
def pre_process(task):
    context = search_rag(task) # Знаходить схожі успішні кейси
    return f"CONTEXT:\n{context}\n\nTASK: {task}"

# 2. Self-healing (збереження успіху)
if success:
    add_to_rag(task, solution)
```

**Детальніше**: [ETAP_4_RAG_SYSTEM.md](../ETAP_4_RAG_SYSTEM.md)

## Vision Feedback Loop

**Файл**: `src/modules/tetyana/executor.ts`

### Логіка Verificator -> Executor

```typescript
// Executor (Tetyana)
while (attempts < 3) {
    // 1. Пауза Vision
    vision.pauseCapture();
    
    // 2. Виконання
    await bridge.execute(step);
    
    // 3. Верифікація
    vision.resumeCapture();
    const result = await vision.verifyStep(step);
    
    if (result.verified) break;
    
    // 4. Retry з Feedback
    feedback = result.message; 
}

// 5. Replan (якщо все провалилось)
if (!success) {
    await triggerReplan(error);
}
```

**Детальніше**: [ETAP_5_VISION_LLM_INTEGRATION.md](../ETAP_5_VISION_LLM_INTEGRATION.md)

## Voice Services

**Файл**: `.env`

У v12 ми відмовилися від складних TTS/STT на користь спрощеної конфігурації.

### Конфігурація v12

```env
# Видалено всі зайві TTS_*/STT_*
# Залишено тільки Fallback, якщо потрібно
```

**Статус**: ✅ Всі компоненти оновлено до v12
