# KONTUR CLI v2 - Architecture & Design

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Menu System (menu-v2.ts)                            │   │
│  │  - Main menu navigation                              │   │
│  │  - Service configuration                             │   │
│  │  - Secrets management                                │   │
│  │  - App settings                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Configuration List UI (config-list.ts)              │   │
│  │  - Multi-select interface                            │   │
│  │  - Enable/disable/delete operations                  │   │
│  │  - Status display                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Prompt Utilities (prompts.ts)                       │   │
│  │  - Input prompts                                     │   │
│  │  - Select prompts                                    │   │
│  │  - Confirm dialogs                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Configuration Management Layer               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Config Manager (config-manager.ts)                  │   │
│  │  - Load/save .env file                               │   │
│  │  - Get/set configuration values                      │   │
│  │  - Atomic writes                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Model Registry (model-registry.ts)                  │   │
│  │  - Fetch models from providers                       │   │
│  │  - Cache model lists                                 │   │
│  │  - Fallback to static lists                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LLM Providers                                       │   │
│  │  - Gemini (Google)                                   │   │
│  │  - OpenAI (ChatGPT)                                  │   │
│  │  - Anthropic (Claude)                                │   │
│  │  - Mistral                                           │   │
│  │  - GitHub Copilot                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Configuration Storage                               │   │
│  │  - .env file (local)                                 │   │
│  │  - Environment variables                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Configuration Read Flow
```
User starts CLI
    ↓
Load .env file (ConfigManager)
    ↓
Display current configuration
    ↓
Show status for each service
    ↓
User selects service to configure
```

### Configuration Write Flow
```
User selects configuration option
    ↓
Prompt for new value
    ↓
Validate input
    ↓
Update ConfigManager
    ↓
Write to .env file
    ↓
Confirm to user
```

### Model Fetching Flow
```
User selects "Model" option
    ↓
Check if API key exists
    ↓
If API key: Fetch from provider API
    ↓
If no key or fetch fails: Use static list
    ↓
Display available models
    ↓
User selects model
    ↓
Save to configuration
```

## Component Responsibilities

### Menu System (menu-v2.ts)
**Responsibility**: User interaction and navigation

**Functions**:
- `mainMenuV2()` - Main menu loop
- `configureService()` - Service configuration
- `configureVision()` - Vision-specific setup
- `configureSecrets()` - API key management
- `configureAppSettings()` - App preferences
- `runHealthCheck()` - System diagnostics

**Interactions**:
- Calls ConfigManager for read/write
- Calls ModelRegistry for model fetching
- Uses prompt utilities for user input

### Configuration List UI (config-list.ts)
**Responsibility**: Multi-select and status display

**Functions**:
- `formatConfigItem()` - Format item for display
- `selectConfigItems()` - Multi-select interface
- `manageConfigItem()` - Enable/disable/delete
- `displayConfigSummary()` - Show all settings
- `loadConfigItems()` - Load from .env

**Interactions**:
- Reads from ConfigManager
- Provides structured UI for complex operations

### Config Manager (config-manager.ts)
**Responsibility**: .env file management

**Functions**:
- `load()` - Read .env file
- `get()` - Get single value
- `set()` - Set single value
- `getAll()` - Get all values

**Features**:
- Atomic writes (no partial updates)
- Automatic file creation
- Proper line handling

### Model Registry (model-registry.ts)
**Responsibility**: Model information management

**Functions**:
- `getModels()` - Get static model list
- `fetchModels()` - Fetch from provider API
- Merge fetched + static models

**Features**:
- Caching (in-memory)
- Fallback to static list
- Support for all providers

## Service Configuration Pattern

Each service follows this pattern:

```typescript
// 1. Define service metadata
const SERVICES = [
    { key: 'brain', label: 'Brain', desc: 'Chat and Planning' },
    // ...
];

// 2. Create configuration function
async function configureService(service: string) {
    while (true) {
        // Show current config
        const config = configManager.getAll();
        
        // Build menu choices
        const choices = [
            { name: `Provider ${fmtVal(config[providerKey])}`, value: 'provider' },
            { name: `Model ${fmtVal(config[modelKey])}`, value: 'model' },
            // ...
        ];
        
        // Get user action
        const action = await select('', choices);
        
        // Handle action
        switch (action) {
            case 'provider':
                await selectProvider(providerKey);
                break;
            // ...
        }
    }
}

// 3. Helper functions for each option
async function selectProvider(providerKey: string) {
    const choices = PROVIDERS.map(p => ({ name: p, value: p }));
    const selected = await select('Provider', choices);
    if (selected !== 'back') {
        configManager.set(providerKey, selected);
    }
}
```

## Configuration Hierarchy

```
.env File
├── Services
│   ├── Brain
│   │   ├── BRAIN_PROVIDER
│   │   ├── BRAIN_MODEL
│   │   └── BRAIN_FALLBACK_PROVIDER
│   ├── Vision
│   │   ├── VISION_MODE
│   │   ├── VISION_LIVE_PROVIDER
│   │   ├── VISION_LIVE_MODEL
│   │   ├── VISION_ONDEMAND_PROVIDER
│   │   └── VISION_ONDEMAND_MODEL
│   ├── TTS/STT
│   │   ├── TTS_PROVIDER
│   │   ├── TTS_FALLBACK_PROVIDER
│   │   └── TTS_FALLBACK2_PROVIDER
│   ├── Reasoning
│   │   ├── REASONING_PROVIDER
│   │   ├── REASONING_MODEL
│   │   └── REASONING_FALLBACK_PROVIDER
│   └── Execution
│       └── EXECUTION_ENGINE
├── Secrets
│   ├── GEMINI_API_KEY
│   ├── COPILOT_API_KEY
│   ├── OPENAI_API_KEY
│   ├── ANTHROPIC_API_KEY
│   └── MISTRAL_API_KEY
└── App Settings
    ├── APP_LANGUAGE
    ├── APP_THEME
    └── LOG_LEVEL
```

## State Management

### Configuration State
- **Source**: .env file
- **Cache**: In-memory (ConfigManager)
- **Lifetime**: Loaded at startup, updated on change
- **Persistence**: Atomic writes to .env

### UI State
- **Menu Position**: Current menu level
- **Selection**: User's current choice
- **Lifetime**: Per interaction
- **Persistence**: None (stateless)

### Model Cache
- **Source**: Provider APIs + static list
- **Cache**: In-memory (ModelRegistry)
- **Lifetime**: Per session
- **Refresh**: On demand (when user selects model)

## Error Handling

### Configuration Errors
```
User input → Validate → Save → Confirm
                ↓
            Invalid? → Show error → Retry
```

### API Errors
```
Fetch models → Success? → Display
                  ↓
              Fail? → Use static list
```

### File Errors
```
Write to .env → Success? → Confirm
                   ↓
               Fail? → Show error → Retry
```

## Design Patterns

### 1. Menu Loop Pattern
```typescript
while (true) {
    showHeader();
    const action = await select('', choices);
    
    if (action === 'back') return;
    
    switch (action) {
        case 'option1': await handleOption1(); break;
        case 'option2': await handleOption2(); break;
    }
}
```

### 2. Configuration Pattern
```typescript
const key = `${SERVICE}_PROVIDER`;
const current = config[key];
configManager.set(key, newValue);
```

### 3. Fallback Pattern
```typescript
const value = config[specificKey] || config[globalKey] || default;
```

### 4. Validation Pattern
```typescript
if (!provider) {
    console.log(chalk.red('Please set provider first'));
    return;
}
```

## Performance Considerations

### 1. File I/O
- Minimize .env reads (cache in ConfigManager)
- Batch writes when possible
- Use atomic operations

### 2. API Calls
- Cache model lists in ModelRegistry
- Fetch only when user requests
- Fall back to static list immediately

### 3. UI Rendering
- Reuse menu structure
- Minimize screen redraws
- Use pagination for large lists

## Security Considerations

### 1. API Keys
- Stored in .env (local file)
- Masked in display (show only first 8 chars)
- Never logged or transmitted
- User responsible for .env security

### 2. Input Validation
- Validate provider names
- Validate model IDs
- Prevent injection attacks

### 3. File Permissions
- .env should have restricted permissions
- Warn if .env is world-readable
- Backup before major changes

## Testing Strategy

### Unit Tests
- ConfigManager: Read/write operations
- ModelRegistry: Model fetching and caching
- Utilities: Formatting and validation

### Integration Tests
- Menu navigation
- Configuration persistence
- Provider integration

### Manual Tests
- User workflows
- Edge cases
- Error scenarios

## Future Enhancements

### 1. Configuration Profiles
```
Save current config as "production"
Load "development" profile
Switch between profiles
```

### 2. Batch Operations
```
Select multiple items
Apply same operation to all
```

### 3. Configuration Validation
```
Test API keys before saving
Verify model availability
Check provider connectivity
```

### 4. Advanced Features
```
Configuration history
Rollback to previous state
Diff between profiles
```

## Deployment

### Development
```bash
npm run cli
```

### Production
```bash
npm run build
npm run cli
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "run", "cli"]
```

## Monitoring & Logging

### Log Levels
- **Debug**: Detailed operation info
- **Info**: General operation status
- **Warn**: Potential issues
- **Error**: Failed operations

### Logged Events
- Configuration changes
- API calls
- Errors and exceptions
- User actions (optional)

## Conclusion

The KONTUR CLI v2 provides a clean, structured interface for system configuration with:
- Clear separation of concerns
- Consistent patterns across services
- Reliable configuration management
- User-friendly navigation
- Extensible architecture
