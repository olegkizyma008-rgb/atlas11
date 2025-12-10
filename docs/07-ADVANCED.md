# 🚀 Розширені теми

Для розробників та просунутих користувачів.

## 📚 Зміст

- [KONTUR v12 Upgrade](#kontur-v12-upgrade)
- [Custom Providers](#custom-providers)
- [RAG Advanced](#rag-advanced)
- [Performance Optimization](#performance-optimization)
- [Contributing](#contributing)

## KONTUR v12 Upgrade

### Що нового у v12?

- ✅ Gemini 3 Reasoning (глибоке мислення)
- ✅ Gemini Live WebSocket (потокова передача)
- ✅ Multi-provider fallback (надійність)
- ✅ RAG система (самонавчання)
- ✅ Voice integration (голос)

### Оновлення з v11

```bash
# Оновіть залежності
npm install

# Перебудуйте проект
npm run build

# Перевірте версію
npm list @google/generative-ai
```

**Детальніше**: [KONTUR_v12_UPGRADE_GUIDE.md](../KONTUR_v12_UPGRADE_GUIDE.md)

## Custom Providers

### Додавання нового LLM провайдера

1. **Створіть файл провайдера**:

```typescript
// src/kontur/providers/custom-provider.ts

export class CustomProvider implements IProvider {
  async think(prompt: string, options?: ThinkOptions): Promise<string> {
    // Ваша реалізація
    const response = await fetch('https://api.custom.com/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CUSTOM_API_KEY}`
      },
      body: JSON.stringify({ prompt })
    });
    return response.text();
  }
}
```

2. **Зареєструйте у конфігурації**:

```typescript
// src/kontur/providers/config.ts

const providers = {
  'custom': new CustomProvider(),
  // ...
};
```

3. **Використовуйте**:

```typescript
const response = await unifiedBrain.think(prompt, {
  primaryProvider: 'custom',
  fallbackProviders: ['gemini', 'copilot']
});
```

## RAG Advanced

### Структурована індексація

```python
# ~/mac_assistant/advanced_rag.py

from langchain.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma

# Завантажте документи
loader = DirectoryLoader(
  '~/mac_assistant_rag/macOS-automation-knowledge-base',
  glob='**/*.md'
)
documents = loader.load()

# Розділіть текст
splitter = RecursiveCharacterTextSplitter(
  chunk_size=1000,
  chunk_overlap=200
)
chunks = splitter.split_documents(documents)

# Створіть embeddings
embeddings = HuggingFaceEmbeddings(
  model_name='BAAI/bge-small-en-v1.5'
)

# Збережіть у Chroma
vectorstore = Chroma.from_documents(
  chunks,
  embeddings,
  persist_directory='~/mac_assistant_rag/chroma_mac'
)
```

### Пошук з фільтрацією

```python
# Пошук з метаданими
results = vectorstore.similarity_search_with_score(
  query="Як відкрити Finder?",
  k=5,
  filter={'source': 'automation-guide.md'}
)

for doc, score in results:
  print(f"Score: {score}")
  print(f"Content: {doc.page_content}")
```

### Автоматичне навчання

```python
# Додавання успішного рішення
def learn_from_success(task: str, solution: str):
  doc = Document(
    page_content=f"Task: {task}\nSolution: {solution}",
    metadata={'type': 'learned', 'timestamp': datetime.now()}
  )
  vectorstore.add_documents([doc])
```

## Performance Optimization

### Кешування результатів

```typescript
// src/kontur/cache/response-cache.ts

class ResponseCache {
  private cache = new Map<string, CachedResponse>();
  
  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.value;
    }
    return null;
  }
  
  set(key: string, value: string, ttl: number = 3600000) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }
  
  private isExpired(cached: CachedResponse): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }
}
```

### Паралельне виконання

```typescript
// Виконання кількох завдань паралельно
const results = await Promise.all([
  unifiedBrain.think(prompt1),
  unifiedBrain.think(prompt2),
  unifiedBrain.think(prompt3)
]);
```

### Оптимізація Vision

```typescript
// Використовуйте ON-DEMAND замість LIVE для швидкості
const response = await grishaVision.analyze(screenshot, {
  mode: 'on-demand',
  provider: 'copilot' // швидше ніж gemini
});
```

## Contributing

### Структура Pull Request

1. **Fork репозиторію**
2. **Створіть гілку**: `git checkout -b feature/my-feature`
3. **Зробіть зміни**
4. **Тестуйте**: `npm run test`
5. **Commit**: `git commit -m "Add my feature"`
6. **Push**: `git push origin feature/my-feature`
7. **Відкрийте Pull Request**

### Код стиль

```typescript
// ✅ Добре
const response = await unifiedBrain.think(prompt, {
  primaryProvider: 'gemini',
  fallbackProviders: ['copilot']
});

// ❌ Погано
const response = await unifiedBrain.think(prompt, {primaryProvider:'gemini',fallbackProviders:['copilot']});
```

### Тестування

```bash
# Запустіть тести
npm run test

# Тести з покриттям
npm run test:coverage

# Специфічний тест
npm run test -- --testNamePattern="Vision"
```

### Документація

Кожна нова функція повинна мати:
- JSDoc коментарі
- Приклади використання
- Тести
- Документація в docs/

```typescript
/**
 * Виконує завдання через Open Interpreter Bridge
 * @param command - Команда для виконання
 * @param options - Опції виконання
 * @returns Результат виконання
 * 
 * @example
 * const result = await execute("Відкрий Калькулятор");
 */
async function execute(command: string, options?: ExecuteOptions): Promise<ExecutionResult> {
  // ...
}
```

## 🔗 Зовнішні ресурси

- [Open Interpreter Docs](https://docs.openinterpreter.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [LangChain Docs](https://python.langchain.com/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Статус**: ✅ Готово для розробки
