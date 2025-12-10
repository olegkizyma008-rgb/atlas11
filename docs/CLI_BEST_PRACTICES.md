# KONTUR CLI - Best Practices & Guidelines

## Configuration Management

### 1. API Key Security

**DO:**
```bash
# Keep .env in .gitignore
echo ".env" >> .gitignore

# Use environment variables in production
export GEMINI_API_KEY="your-key"
npm run cli

# Backup configuration
cp .env .env.backup
```

**DON'T:**
```bash
# Don't commit .env to git
git add .env  # ❌ WRONG

# Don't hardcode keys in code
const key = "sk-1234...";  // ❌ WRONG

# Don't share .env file
email .env to someone  # ❌ WRONG
```

### 2. Configuration Organization

**DO:**
```env
# Group by category
# Brain Service
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
BRAIN_FALLBACK_PROVIDER=openai

# Vision Service
VISION_MODE=live
VISION_LIVE_PROVIDER=gemini

# API Keys
GEMINI_API_KEY=...
OPENAI_API_KEY=...
```

**DON'T:**
```env
# Random order
GEMINI_API_KEY=...
BRAIN_PROVIDER=gemini
OPENAI_API_KEY=...
BRAIN_MODEL=gemini-2.5-flash
VISION_MODE=live
```

### 3. Provider Selection

**DO:**
```
# Use provider you have API key for
BRAIN_PROVIDER=gemini  (if you have GEMINI_API_KEY)

# Set fallback for reliability
BRAIN_FALLBACK_PROVIDER=openai

# Test before production
npm run cli → System Health → Verify
```

**DON'T:**
```
# Use provider without API key
BRAIN_PROVIDER=openai  (without OPENAI_API_KEY)

# No fallback for critical services
BRAIN_FALLBACK_PROVIDER=  (empty)

# Untested configuration in production
```

## Service Configuration

### 1. Brain Service

**Recommended Setup:**
```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-pro
BRAIN_FALLBACK_PROVIDER=openai
```

**For Development:**
```env
BRAIN_PROVIDER=gemini
BRAIN_MODEL=gemini-2.5-flash
```

**For Production:**
```env
BRAIN_PROVIDER=openai
BRAIN_MODEL=gpt-4o
BRAIN_FALLBACK_PROVIDER=gemini
```

### 2. Vision Service

**Live Stream Mode (Recommended):**
```env
VISION_MODE=live
VISION_LIVE_PROVIDER=gemini
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
VISION_LIVE_FALLBACK_PROVIDER=copilot
```

**On-Demand Mode:**
```env
VISION_MODE=on-demand
VISION_ONDEMAND_PROVIDER=copilot
VISION_ONDEMAND_MODEL=gpt-4o
VISION_ONDEMAND_FALLBACK_PROVIDER=gemini
```

### 3. Voice Services (TTS/STT)

**Ukrainian TTS:**
```env
TTS_PROVIDER=ukrainian
TTS_FALLBACK_PROVIDER=gemini
```

**Multilingual STT:**
```env
STT_PROVIDER=gemini
STT_FALLBACK_PROVIDER=web
```

### 4. Execution Engine

**For Advanced Automation:**
```env
EXECUTION_ENGINE=python-bridge
```

**For Standard Operations:**
```env
EXECUTION_ENGINE=native
```

## Workflow Best Practices

### 1. Initial Setup

**Step 1: Start with minimal config**
```bash
npm run cli
# Configure only Brain + Execution
# Test basic functionality
```

**Step 2: Add Vision**
```bash
npm run cli
# Configure Vision service
# Test task monitoring
```

**Step 3: Add Voice**
```bash
npm run cli
# Configure TTS/STT
# Test voice interaction
```

**Step 4: Add Fallbacks**
```bash
npm run cli
# Set fallback providers
# Test reliability
```

### 2. Configuration Testing

**Test Each Service:**
```bash
npm run cli
# System Health → Check each component
# Run macOS Agent → Test execution
# Test Tetyana → Test NL mode
```

**Verify Fallbacks:**
```bash
npm run cli
# Disable primary provider
# Run task (should use fallback)
# Re-enable primary
```

### 3. Backup & Recovery

**Regular Backups:**
```bash
# Create backup
cp .env .env.backup.$(date +%Y%m%d)

# List backups
ls -la .env.backup.*

# Restore from backup
cp .env.backup.20250101 .env
```

**Version Control:**
```bash
# Track configuration changes
git add .env.example  # ✅ OK (no secrets)
git add .gitignore    # ✅ OK

# Don't track actual .env
echo ".env" >> .gitignore
```

## Performance Optimization

### 1. Model Selection

**For Speed:**
```env
BRAIN_MODEL=gemini-2.5-flash
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
```

**For Quality:**
```env
BRAIN_MODEL=gemini-2.5-pro
REASONING_MODEL=gemini-3-pro-preview
```

**For Balance:**
```env
BRAIN_MODEL=gpt-4o
VISION_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
```

### 2. Fallback Strategy

**For Reliability:**
```env
# Multiple fallbacks
TTS_PROVIDER=ukrainian
TTS_FALLBACK_PROVIDER=gemini
TTS_FALLBACK2_PROVIDER=web
```

**For Cost:**
```env
# Cheaper primary, expensive fallback
BRAIN_PROVIDER=mistral
BRAIN_FALLBACK_PROVIDER=openai
```

### 3. Caching

**Enable Model Caching:**
```typescript
// ModelRegistry caches models in memory
// Subsequent requests are instant
// Cache is per-session
```

## Troubleshooting Best Practices

### 1. Diagnostic Workflow

```bash
# Step 1: Check health
npm run cli → System Health

# Step 2: Verify API keys
npm run cli → Secrets & Keys

# Step 3: Test service
npm run cli → [Service Name]

# Step 4: Check logs
LOG_LEVEL=debug npm run cli
```

### 2. Common Issues

**Issue: Models not loading**
```bash
# Solution:
npm run cli
→ Secrets & Keys
→ Verify API key is set
→ Try again
```

**Issue: Service not responding**
```bash
# Solution:
npm run cli
→ System Health
→ Check missing configuration
→ Configure missing items
```

**Issue: Fallback not working**
```bash
# Solution:
npm run cli
→ [Service Name]
→ Verify fallback is set
→ Test with primary disabled
```

### 3. Debugging

**Enable Debug Logging:**
```bash
LOG_LEVEL=debug npm run cli
```

**Check Configuration:**
```bash
cat .env
```

**Verify API Keys:**
```bash
npm run cli → Secrets & Keys
```

## Development Best Practices

### 1. Adding New Services

**Follow the pattern:**
```typescript
// 1. Add to SERVICES array
const SERVICES = [
    { key: 'newservice', label: 'New Service', desc: '...' },
    // ...
];

// 2. Create configuration function
async function configureNewService() {
    // Implementation
}

// 3. Add to main menu
const choices = [
    { name: 'New Service', value: 'service:newservice' },
    // ...
];

// 4. Handle in switch
switch (action) {
    case 'service:newservice':
        await configureNewService();
        break;
}
```

### 2. Configuration Keys

**Naming Convention:**
```
{SERVICE}_{SETTING}

Examples:
BRAIN_PROVIDER
BRAIN_MODEL
BRAIN_FALLBACK_PROVIDER
VISION_MODE
VISION_LIVE_PROVIDER
```

### 3. Error Handling

**Always validate:**
```typescript
if (!provider) {
    console.log(chalk.red('Provider not set'));
    return;
}

if (!apiKey) {
    console.log(chalk.yellow('API key not found'));
    // Use fallback or return
}
```

## Deployment Best Practices

### 1. Production Setup

```bash
# 1. Create .env from .env.example
cp .env.example .env

# 2. Set production values
npm run cli
# Configure for production

# 3. Backup configuration
cp .env .env.prod

# 4. Test thoroughly
npm run cli → System Health
npm run cli "Test task"

# 5. Deploy
npm run build
npm start
```

### 2. Environment-Specific Config

**Development:**
```env
LOG_LEVEL=debug
APP_THEME=dark
EXECUTION_ENGINE=native
```

**Production:**
```env
LOG_LEVEL=warn
APP_THEME=dark
EXECUTION_ENGINE=python-bridge
```

### 3. Monitoring

**Check Health Regularly:**
```bash
# Daily
npm run cli → System Health

# Weekly
npm run cli → Test Tetyana

# Monthly
npm run cli → Review all settings
```

## Security Best Practices

### 1. API Key Management

**DO:**
```bash
# Use environment variables
export GEMINI_API_KEY="..."
npm run cli

# Rotate keys regularly
npm run cli → Secrets & Keys → Update key

# Use different keys per environment
PROD_GEMINI_API_KEY
DEV_GEMINI_API_KEY
```

**DON'T:**
```bash
# Don't log keys
console.log(apiKey)  # ❌

# Don't commit keys
git add .env  # ❌

# Don't share keys
email .env  # ❌
```

### 2. File Permissions

```bash
# Restrict .env access
chmod 600 .env

# Verify permissions
ls -la .env
# -rw------- (only owner can read)
```

### 3. Backup Security

```bash
# Encrypt backups
gpg -c .env.backup

# Store securely
# - Not in git
# - Not in cloud (unencrypted)
# - Not in shared folders
```

## Performance Monitoring

### 1. Response Times

**Expected:**
- Menu render: ~100ms
- Configuration save: ~50ms
- Model fetch: ~2s
- API call: ~1-5s

**Monitor:**
```bash
LOG_LEVEL=debug npm run cli
# Check timing in logs
```

### 2. Resource Usage

**Expected:**
- Memory: ~15MB
- CPU: <5% idle
- Disk: <1MB

**Monitor:**
```bash
# macOS
top -p $(pgrep -f "npm run cli")

# Linux
ps aux | grep "npm run cli"
```

## Maintenance Schedule

### Daily
- Check System Health
- Monitor error logs

### Weekly
- Test each service
- Verify API keys
- Check fallbacks

### Monthly
- Review configuration
- Update models
- Backup settings
- Security audit

### Quarterly
- Update dependencies
- Review performance
- Plan improvements

## Conclusion

Following these best practices ensures:
- ✅ Secure configuration management
- ✅ Reliable service operation
- ✅ Easy troubleshooting
- ✅ Optimal performance
- ✅ Smooth deployments

**Remember**: Configuration is critical - manage it carefully!
