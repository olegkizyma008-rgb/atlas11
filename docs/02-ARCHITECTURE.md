# 🏗️ Архітектура системи (KONTUR v12)

Детальний огляд архітектури KONTUR v12 "Kozyr" та Atlas.

## 📋 Основна схема

```mermaid
graph TD
    User[User] -->|Goal| Atlas[Atlas Brain (Planner)]
    Atlas -->|Plan| Tetyana[Tetyana (Executor)]
    
    subgraph Execution Cycle
        Tetyana -->|Context| RAG[RAG System (Search)]
        Tetyana -->|Command| Bridge[Python Bridge]
        Bridge -->|Action| OS[macOS UI]
        OS -->|Visual State| Grisha[Grisha (Vision)]
        Grisha -->|Feedback| Tetyana
    end
    
    subgraph Self-Healing
        Tetyana -->|Success Pattern| RAG_Store[RAG (Store)]
    end
```

## 🧠 Компоненти Trinity

### 1. ATLAS (Planner)
- **Роль**: Архітектор та Планувальник.
- **Модель**: GPT-4.1 / Copilot.
- **Функція**: Розбиває складні завдання користувача на кроки плану (`PlanStep`).
- **Інструмент**: `implementation_plan`.

### 2. TETYANA (Executor)
- **Роль**: Виконавець.
- **Engine**: Python Bridge (Open Interpreter).
- **Функція**: Виконує кроки плану, керує мишею/клавіатурою.
- **Логіка v12**:
    - **Replan**: Якщо крок не вдався 3 рази — запит нового плану до Atlas.
    - **Feedback Loop**: Отримує візуальний фідбек від Grisha.

### 3. GRISHA (Guardian)
- **Роль**: Верифікатор та Охоронець.
- **Модель**: GPT-4o (Vision).
- **Функція**: 
    - Дивиться на екран.
    - Перевіряє безпеку дій (Safety Filter).
    - Перевіряє успішність виконання (Verification).

## 🔄 Цикл Виконання (The Loop)

У v12 ми відмовилися від сліпого виконання на користь циклу зворотного зв'язку:

1. **Plan**: Atlas створює план.
2. **Execute**: Tetyana надсилає команду в Python Bridge.
3. **Observe**: Grisha робить знімок екрану.
4. **Verify**: Grisha порівнює результат з очікуванням.
5. **Correct**: Якщо помилка, Tetyana отримує опис помилки і пробує виправити (Retry).
6. **Learn**: Успішний патерн зберігається в RAG.

## 🗂️ Структура проекту

### Python Bridge (`~/mac_assistant/`)
Основне робоче середовище v12.

```
mac_assistant/
├── mac_master_agent.py      # 🎯 Основний агент (v12)
├── index_rag.py            # 📚 RAG Система
└── venv/                   # Ізольоване середовище
```

### TypeScript Core (`src/`)
Оркестрація та інтерфейс.

```
src/
├── kontur/                 # Ядро системи
│   ├── vision/             # Grisha Service
│   └── cortex/             # Brain Service
├── modules/
│   └── tetyana/            # Executor Logic
│       ├── executor.ts     # Replan logic
│       └── bridge.ts       # Python Link
```

## 📊 Потік Даних (Data Flow)

1. **User Request** -> Electron UI -> Trinity Channel.
2. **Atlas** генерує JSON Plan.
3. **Tetyana** бере перший крок -> шукає в RAG.
4. **Tetyana** передає команду в `mac_master_agent.py` (spawn process).
5. **Python Agent** використовує AppleScript/Accessibility API.
6. **macOS** змінює стан вікна.
7. **Grisha** аналізує скріншот -> повертає `verified: boolean`.

## 🛠️ Технологічний Стек

- **Frontend**: React + TailwindCSS (Electron).
- **Backend**: Node.js (TypeScript).
- **Execution**: Python 3.12 (Open Interpreter Custom).
- **AI Models**: 
    - Planner: OpenAI o1 / GPT-4.1
    - Vision: GPT-4o
    - Bridge: GPT-4o-mini / Gemini 2.0 Flash

---

**Детальніше про налаштування**: [04-CONFIGURATION.md](./04-CONFIGURATION.md)
