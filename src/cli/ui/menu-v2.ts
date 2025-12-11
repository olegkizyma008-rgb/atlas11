/**
 * KONTUR CLI v2 - Unified Configuration System
 * Clean design without emojis, structured configuration management
 * Enable/disable/delete operations for all services
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execSync, spawnSync } from 'child_process';
import { select, input, confirm } from './prompts.js';
import { configManager } from '../managers/config-manager.js';
import { modelRegistry } from '../managers/model-registry.js';
import { selectConfigItems, manageConfigItem, displayConfigSummary, ConfigSection, ConfigItem } from './config-list.js';
import { displayRagStatus, displayRagSearch, getRagIndexStatus } from './rag-status.js';

const PROJECT_ROOT = process.cwd();
const STAGING_DIR = path.join(PROJECT_ROOT, 'rag', 'knowledge_sources'); // чорнова база
const ACTIVE_DIR = path.join(PROJECT_ROOT, 'rag', 'knowledge_base', 'large_corpus'); // бойова база

// Service definitions
const SERVICES = [
    { key: 'brain', label: 'Brain', desc: 'Chat and Planning' },
    { key: 'tts', label: 'TTS', desc: 'Text-to-Speech' },
    { key: 'stt', label: 'STT', desc: 'Speech-to-Text' },
    { key: 'vision', label: 'Vision', desc: 'Visual Analysis (Grisha)' },
    { key: 'reasoning', label: 'Reasoning', desc: 'Deep Thinking' },
    { key: 'execution', label: 'Execution', desc: 'Agent Engine' }
];

const PROVIDERS = ['gemini', 'copilot', 'openai', 'anthropic', 'mistral', 'web', 'ukrainian'];

const PROVIDER_API_KEYS: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    copilot: 'COPILOT_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    mistral: 'MISTRAL_API_KEY'
};

// Swallow SIGINT to avoid ExitPromptError in prompts; user should exit via menu
let SIGINT_GUARD = false;
process.on('SIGINT', () => {
    if (SIGINT_GUARD) return;
    SIGINT_GUARD = true;
    console.log(chalk.yellow('\n(SIGINT ignored) Use menu Exit to quit. Ongoing tasks keep running.\n'));
    setTimeout(() => { SIGINT_GUARD = false; }, 500);
});

// Top repositories bundle for quick staging fetch
const TOP_REPOS = [
    'https://github.com/kevin-funderburg/AppleScripts.git',
    'https://github.com/extracts/mac-scripting.git',
    'https://github.com/temochka/macos-automation.git',
    'https://github.com/SKaplanOfficial/macOS-Automation-Resources.git',
    'https://github.com/unforswearing/applescript.git',
    'https://github.com/princelundgren/automator-collection.git',
    'https://github.com/abbeycode/AppleScripts.git',
    'https://github.com/MacPaw/macapptree.git',
    'https://github.com/alex-kostirin/pyatomac.git',
    'https://github.com/atheriel/accessibility.git',
    'https://github.com/chrs1885/Capable.git',
    'https://github.com/tmandry/AXSwift.git'
];

// ============================================================================
// RAG CONTROL AGENT HELPERS
// ============================================================================

function ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
}

function selectNoSep<T extends { value: any; disabled?: any }>(message: string, choices: T[], options: any = {}): Promise<any> {
    const filtered = choices.filter(c => !c.disabled && !(typeof c.value === 'string' && c.value.startsWith('_sep')));
    return select(message, filtered as any, options);
}

async function showRagStats(): Promise<void> {
    showHeader('RAG Stats');
    const load = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cores = os.cpus().length;

    let diskInfo = '';
    let chromaSize = '';
    try {
        diskInfo = execSync(`df -h ${PROJECT_ROOT}`, { encoding: 'utf-8' }).split('\n')[1] || '';
    } catch {
        diskInfo = 'n/a';
    }
    try {
        chromaSize = execSync(`du -sh rag/chroma_mac || true`, { encoding: 'utf-8' }).trim();
    } catch {
        chromaSize = 'n/a';
    }

    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log(`  ${chalk.green('●')} CPU cores/load    ${cores} cores | load ${load.map(l => l.toFixed(2)).join(', ')}`);
    console.log(`  ${chalk.green('●')} Memory            used ${formatBytes(usedMem)} / total ${formatBytes(totalMem)}`);
    console.log(`  ${chalk.green('●')} Disk (project)    ${chalk.gray(diskInfo.trim() || 'n/a')}`);
    console.log(`  ${chalk.green('●')} Chroma size       ${chalk.cyan(chromaSize || 'n/a')}`);
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    await input('Press Enter to continue', '');
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function listDirSafe(dir: string): string[] {
    try {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir);
    } catch {
        return [];
    }
}

async function printList(title: string, dir: string, items: string[]): Promise<void> {
    console.clear();
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log(chalk.cyan(`  │ ${chalk.green('●')} ${title} (${items.length})`.padEnd(42, ' ')) + `${chalk.green('●')} │`);
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    console.log(chalk.gray(`  Path: ${dir}\n`));
    if (!items.length) {
        console.log(chalk.yellow('  (empty)\n'));
    } else {
        for (const it of items) console.log(`  ${chalk.green('●')} ${it}`);
        console.log('');
    }
    await input('Press Enter to continue', '');
}

/**
 * Display header with title and decorative elements
 */
function showHeader(title: string): void {
    console.clear();
    // Blue arc decoration
    console.log(chalk.cyan('  ◆─────────────────────────────────────◆'));
    console.log(chalk.cyan(`  │ ${chalk.green('●')} ${title.padEnd(36)} ${chalk.green('●')} │`));
    console.log(chalk.cyan('  ◆─────────────────────────────────────◆'));
    console.log('');
}

// ============================================================================
// RAG CONVERSATIONAL AGENT (natural language, constrained to RAG/config/search)
// ============================================================================
async function ragConversationalAgent(): Promise<void> {
    showHeader('RAG Conversational Agent');
    console.log(chalk.gray('  Natural language control (staging/active, fetch, search, index, cleanup)\n'));

    while (true) {
        const task = await input('Your request (enter to exit)', '');
        if (!task) return;

        const constrainedPrompt = `
You are the RAG Control Agent for Tetyana v12.
Allowed actions ONLY:
- Manage staging dir (rag/knowledge_sources) and active dir (rag/knowledge_base/large_corpus).
- Fetch sources (git/url/path), validate accessibility, move to staging, promote to active.
- Search/index/reset Chroma; manage documents (delete/inspect quality); suggest refinements.
- Do NOT perform arbitrary macOS automation outside RAG tasks.
User request: ${task}
Respond with the actions you perform and outcomes.`;

        const env = { ...process.env, VISION_DISABLE: '1', AGENT_SCOPE: 'rag-control' };
        const cmd = './bin/tetyana';
        const args = [constrainedPrompt];

        const spinner = ora('Running rag-control agent...').start();
        const proc = spawn(cmd, args, { env, stdio: 'pipe' });
        proc.stdout.on('data', d => {
            spinner.stop();
            process.stdout.write(chalk.cyan(d.toString()));
        });
        proc.stderr.on('data', d => {
            spinner.stop();
            process.stdout.write(chalk.yellow(d.toString()));
        });
        await new Promise<void>(resolve => proc.on('close', () => resolve()));
        await input('\nPress Enter to continue', '');
    }
}

// ============================================================================
// KONTUR WORKFLOW AUDIT (agent-based constrained check)
// ============================================================================
async function konturWorkflowAudit(): Promise<void> {
    showHeader('KONTUR Workflow Audit');
    console.log(chalk.gray('  Comprehensive KONTUR protocol & module compliance audit\n'));

    const config = configManager.getAll();
    const konturEndpoints = [
        { key: 'KONTUR_CORE_URL', label: 'KONTUR Core URL' },
        { key: 'KONTUR_AGENT_URL', label: 'KONTUR Agent URL' },
        { key: 'KONTUR_AUTH_TOKEN', label: 'KONTUR Auth Token' }
    ];
    const missing = konturEndpoints.filter(e => !config[e.key]);
    if (missing.length) {
        console.log(chalk.yellow('  ⚠ Missing KONTUR config:'));
        missing.forEach(m => console.log(`    - ${m.label} (${m.key})`));
        console.log('');
    }

    while (true) {
        const auditChoices = [
            { name: `${chalk.green('●')} Module Compliance Check`, value: 'modules' },
            { name: `${chalk.green('●')} Protocol Communication Audit`, value: 'protocol' },
            { name: `${chalk.green('●')} Bridge & Organ Validation`, value: 'bridges' },
            { name: `${chalk.green('●')} Full System Workflow Analysis`, value: 'full' },
            { name: `${chalk.green('●')} KONTUR Configuration Status`, value: 'config' },
            { name: `${chalk.green('●')} Configure KONTUR Endpoints`, value: 'setup' },
            { name: `${chalk.green('●')} Test KONTUR Connectivity`, value: 'test' },
            { name: `${chalk.green('●')} View Architecture Diagram`, value: 'diagram' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const auditAction = await selectNoSep('', auditChoices);
        if (auditAction === 'back') return;

        switch (auditAction) {
            case 'modules':
                await konturModuleCheck();
                break;
            case 'protocol':
                await konturProtocolAudit();
                break;
            case 'bridges':
                await konturBridgeValidation();
                break;
            case 'full':
                await konturFullWorkflowAnalysis();
                break;
            case 'config':
                await konturConfigStatus();
                break;
            case 'setup':
                await konturConfigureEndpoints();
                break;
            case 'test':
                await konturTestConnectivity();
                break;
            case 'diagram':
                await konturShowArchitecture();
                break;
        }
    }
}

async function konturModuleCheck(): Promise<void> {
    showHeader('KONTUR Module Compliance');
    console.log(chalk.gray('  Verifying all modules are under KONTUR control\n'));

    const modules = [
        { name: 'tetyana_agent.py', path: 'src/kontur/organs/tetyana_agent.py', type: 'Python Organ' },
        { name: 'rag_indexer.py', path: 'src/kontur/organs/rag_indexer.py', type: 'Python Organ' },
        { name: 'menu-v2.ts', path: 'src/cli/ui/menu-v2.ts', type: 'CLI Bridge' },
        { name: 'GrishaVisionService.ts', path: 'src/kontur/vision/GrishaVisionService.ts', type: 'Vision Module' },
        { name: 'tetyana_bridge.ts', path: 'src/modules/tetyana/tetyana_bridge.ts', type: 'Bridge' },
        { name: 'config-manager.ts', path: 'src/cli/managers/config-manager.ts', type: 'Config Manager' }
    ];

    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    for (const mod of modules) {
        const exists = fs.existsSync(path.join(PROJECT_ROOT, mod.path));
        const status = exists ? chalk.green('✓ OK') : chalk.red('✗ MISSING');
        console.log(`  │ ${chalk.green('●')} ${mod.name.padEnd(25)} ${status} (${mod.type})`);
    }
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    await input('\nPress Enter to continue', '');
}

async function konturProtocolAudit(): Promise<void> {
    showHeader('KONTUR Protocol Communication');
    console.log(chalk.gray('  Verifying KPP protocol compliance\n'));

    const prompt = `
You are the KONTUR Protocol Auditor.
Analyze the codebase for KPP (KONTUR Protocol) compliance:
- Check if all modules use KONTUR message format (KPP).
- Verify bridges (CLI, Electron, Python) communicate via KONTUR.
- Identify any direct module-to-module communication bypassing KONTUR.
- List protocol violations and suggest fixes.
Constraints: Analyze only, do not modify code.
Report findings concisely.`;

    const env = { ...process.env, VISION_DISABLE: '1', AGENT_SCOPE: 'kontur-protocol-audit' };
    const spinner = ora('Auditing protocol compliance...').start();
    const proc = spawn('./bin/tetyana', [prompt], { env, stdio: 'pipe' });
    proc.stdout.on('data', d => {
        spinner.stop();
        process.stdout.write(chalk.cyan(d.toString()));
    });
    proc.stderr.on('data', d => {
        spinner.stop();
        process.stdout.write(chalk.yellow(d.toString()));
    });
    await new Promise<void>(resolve => proc.on('close', () => resolve()));
    await input('\nPress Enter to continue', '');
}

async function konturBridgeValidation(): Promise<void> {
    showHeader('KONTUR Bridge & Organ Validation');
    console.log(chalk.gray('  Checking bridges and organs\n'));

    const bridges = [
        { name: 'CLI Bridge', path: 'src/cli/ui/menu-v2.ts', role: 'User interface → KONTUR' },
        { name: 'Electron Bridge', path: 'src/main/main.ts', role: 'Electron app → KONTUR' },
        { name: 'Python Bridge', path: 'src/modules/tetyana/tetyana_bridge.ts', role: 'Python organs → KONTUR' },
        { name: 'KPP Protocol', path: 'src/kontur/protocol/kpp.ts', role: 'Message protocol' }
    ];

    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    for (const bridge of bridges) {
        const exists = fs.existsSync(path.join(PROJECT_ROOT, bridge.path));
        const status = exists ? chalk.green('✓ Active') : chalk.yellow('⚠ Not found');
        console.log(`  │ ${chalk.green('●')} ${bridge.name.padEnd(20)} ${status}`);
        console.log(`  │    Role: ${bridge.role}`);
    }
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    await input('\nPress Enter to continue', '');
}

async function konturFullWorkflowAnalysis(): Promise<void> {
    showHeader('KONTUR Full Workflow Analysis');
    console.log(chalk.gray('  Running comprehensive system analysis via agent\n'));

    const prompt = `
You are the KONTUR Workflow Audit Agent.
Tasks:
- Verify ALL modules/components are under KONTUR control and communicate via KONTUR protocol.
- Check data flow: CLI → KONTUR → Python organs → RAG/Vision → KONTUR → CLI/Electron.
- Verify Redis checkpoint integration with LangGraph.
- Analyze RAG (Chroma) integration with KONTUR.
- Check Vision (Grisha) integration and protocol compliance.
- Verify self-healing mechanism uses KONTUR for updates.
- Check bridges, organs, CLI/Electron surfaces for KONTUR compliance.
- Identify bottlenecks, missing integrations, protocol violations.
- Report missing or misconfigured pieces and suggest fixes.
Constraints: Do NOT perform arbitrary macOS automation; only inspect/analyze KONTUR workflow state.
Respond with detailed findings, architecture diagram (text), and remediation steps.`;

    const env = { ...process.env, VISION_DISABLE: '1', AGENT_SCOPE: 'kontur-audit' };
    const spinner = ora('Auditing KONTUR workflow...').start();
    const proc = spawn('./bin/tetyana', [prompt], { env, stdio: 'pipe' });
    proc.stdout.on('data', d => {
        spinner.stop();
        process.stdout.write(chalk.cyan(d.toString()));
    });
    proc.stderr.on('data', d => {
        spinner.stop();
        process.stdout.write(chalk.yellow(d.toString()));
    });
    await new Promise<void>(resolve => proc.on('close', () => resolve()));
    await input('\nPress Enter to continue', '');
}

async function konturConfigStatus(): Promise<void> {
    showHeader('KONTUR Configuration Status');
    console.log(chalk.gray('  Current KONTUR setup\n'));

    const config = configManager.getAll();
    const konturKeys = [
        'KONTUR_CORE_URL',
        'KONTUR_AGENT_URL',
        'KONTUR_AUTH_TOKEN',
        'EXECUTION_ENGINE',
        'VISION_MODE',
        'BRAIN_PROVIDER',
        'BRAIN_MODEL'
    ];

    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    for (const key of konturKeys) {
        const val = config[key];
        const status = val ? chalk.green('✓ Set') : chalk.red('✗ Missing');
        const display = val ? chalk.cyan(val.toString().substring(0, 30)) : chalk.gray('(not set)');
        console.log(`  │ ${chalk.green('●')} ${key.padEnd(25)} ${status}`);
        if (val) console.log(`  │    Value: ${display}`);
    }
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    await input('\nPress Enter to continue', '');
}

async function konturConfigureEndpoints(): Promise<void> {
    showHeader('Configure KONTUR Endpoints');
    console.log(chalk.gray('  Set up KONTUR core, agent, and auth\n'));

    const endpoints = [
        { key: 'KONTUR_CORE_URL', label: 'KONTUR Core URL', default: 'http://localhost:8000' },
        { key: 'KONTUR_AGENT_URL', label: 'KONTUR Agent URL', default: 'http://localhost:8001' },
        { key: 'KONTUR_AUTH_TOKEN', label: 'KONTUR Auth Token', default: '' }
    ];

    for (const ep of endpoints) {
        const current = configManager.get(ep.key) || ep.default;
        const val = await input(`${ep.label}`, current);
        if (val) configManager.set(ep.key, val);
    }
    console.log(chalk.green('\n✓ KONTUR endpoints configured'));
    await input('\nPress Enter to continue', '');
}

async function konturTestConnectivity(): Promise<void> {
    showHeader('Test KONTUR Connectivity');
    console.log(chalk.gray('  Testing connection to KONTUR services\n'));

    const config = configManager.getAll();
    const coreUrl = config['KONTUR_CORE_URL'] || 'http://localhost:8000';
    const agentUrl = config['KONTUR_AGENT_URL'] || 'http://localhost:8001';

    const spinner = ora('Testing KONTUR Core...').start();
    try {
        const coreRes = await Promise.race([
            fetch(`${coreUrl}/health`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]) as any;
        if (coreRes.ok) {
            spinner.succeed(`✓ KONTUR Core (${coreUrl}) is reachable`);
        } else {
            spinner.warn(`⚠ KONTUR Core returned ${coreRes.status}`);
        }
    } catch (e: any) {
        spinner.fail(`✗ KONTUR Core unreachable: ${e.message}`);
    }

    const spinner2 = ora('Testing KONTUR Agent...').start();
    try {
        const agentRes = await Promise.race([
            fetch(`${agentUrl}/health`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]) as any;
        if (agentRes.ok) {
            spinner2.succeed(`✓ KONTUR Agent (${agentUrl}) is reachable`);
        } else {
            spinner2.warn(`⚠ KONTUR Agent returned ${agentRes.status}`);
        }
    } catch (e: any) {
        spinner2.fail(`✗ KONTUR Agent unreachable: ${e.message}`);
    }

    await input('\nPress Enter to continue', '');
}

async function konturShowArchitecture(): Promise<void> {
    showHeader('KONTUR Architecture Diagram');
    console.log(chalk.cyan(`
  ╔════════════════════════════════════════════════════════════════╗
  ║                    KONTUR SYSTEM ARCHITECTURE                  ║
  ╚════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────┐
  │  USER INTERFACES (Bridges)                                  │
  ├─────────────────────────────────────────────────────────────┤
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
  │  │  CLI Bridge  │  │ Electron UI  │  │ Web Portal   │      │
  │  │ (menu-v2.ts) │  │  (main.ts)   │  │ (optional)   │      │
  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
  └─────────┼──────────────────┼──────────────────┼──────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
            ┌──────────────────▼──────────────────┐
            │    KPP (KONTUR Protocol)            │
            │  Message Format & Routing           │
            └──────────────────┬──────────────────┘
                               │
  ┌─────────────────────────────▼──────────────────────────────┐
  │  KONTUR CORE (Orchestration & Control)                     │
  ├──────────────────────────────────────────────────────────┤
  │  ┌─────────────────────────────────────────────────────┐ │
  │  │ Task Planning | State Management | Protocol Router  │ │
  │  └─────────────────────────────────────────────────────┘ │
  └──────┬────────────────────────────────────────────────┬──┘
         │                                                │
    ┌────▼──────────────┐                    ┌───────────▼────┐
    │  PYTHON ORGANS    │                    │  SERVICES      │
    ├───────────────────┤                    ├────────────────┤
    │ • tetyana_agent   │                    │ • RAG (Chroma) │
    │ • rag_indexer     │                    │ • Vision       │
    │ • vision_service  │                    │ • Redis        │
    │ • self_healer     │                    │ • Execution    │
    └────┬──────────────┘                    └────┬───────────┘
         │                                        │
    ┌────▼────────────────────────────────────────▼────┐
    │  PERSISTENT STATE (Redis Checkpointing)         │
    │  LangGraph State Snapshots & Recovery           │
    └─────────────────────────────────────────────────┘

  Data Flow:
  1. User input → CLI Bridge → KPP message
  2. KONTUR Core routes to Python organs
  3. Organs execute with RAG/Vision/Execution services
  4. Results checkpoint to Redis
  5. Response → KPP message → UI Bridge → User

  Protocol: All inter-module communication via KPP (KONTUR Protocol)
  No direct module-to-module communication allowed.
    `));
    await input('\nPress Enter to continue', '');
}

// ============================================================================
// RAG CONTROL AGENT (staging/active, fetch/add/delete/promote)
// ============================================================================

async function ragControlAgent(): Promise<void> {
    ensureDir(STAGING_DIR);
    ensureDir(ACTIVE_DIR);

    while (true) {
        showHeader('RAG Control Agent');
        console.log(chalk.gray('  Manage staging/active corpora, fetch sources, promote, clean\n'));

        const stagingItems = listDirSafe(STAGING_DIR);
        const activeItems = listDirSafe(ACTIVE_DIR);

        const choices = [
            { name: `${chalk.green('●')} Add source to staging (git/url/path)`, value: 'add' },
            { name: `${chalk.green('●')} Fetch top repositories bundle → staging`, value: 'fetch_top' },
            { name: `${chalk.green('●')} Quick ingest top bundle → active + index`, value: 'ingest_top' },
            { name: `${chalk.green('●')} Search (RAG preview)`, value: 'search' },
            { name: `${chalk.green('●')} Promote staging → active`, value: 'promote' },
            { name: `${chalk.green('●')} List staging (${stagingItems.length})`, value: 'list_staging' },
            { name: `${chalk.green('●')} List active (${activeItems.length})`, value: 'list_active' },
            { name: `${chalk.green('●')} Clean staging (delete)`, value: 'clean_staging' },
            { name: `${chalk.green('●')} Clean active (delete)`, value: 'clean_active' },
            { name: `${chalk.green('●')} Index active (use MLX on Apple Silicon)`, value: 'index_active' },
            { name: `${chalk.green('●')} Resource & RAG Stats (live snapshot)`, value: 'stats' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await selectNoSep('', choices);
        if (action === 'back') return;

        switch (action) {
            case 'add':
                await addSourceToStaging();
                break;
            case 'fetch_top':
                await fetchTopReposToStaging();
                break;
            case 'ingest_top':
                await ingestTopBundle();
                break;
            case 'search':
                await ragQuickSearch();
                break;
            case 'promote':
                await promoteStagingToActive();
                break;
            case 'list_staging':
                await printList('Staging', STAGING_DIR, stagingItems);
                break;
            case 'list_active':
                await printList('Active', ACTIVE_DIR, activeItems);
                break;
            case 'clean_staging':
                await cleanDir(STAGING_DIR, 'staging');
                break;
            case 'clean_active':
                await cleanDir(ACTIVE_DIR, 'active');
                break;
            case 'index_active':
                await indexChroma(); // reuse; will pick USE_MLX on Apple Silicon
                break;
            case 'stats':
                await showRagStats();
                break;
        }
    }
}

async function addSourceToStaging(): Promise<void> {
    ensureDir(STAGING_DIR);
    const src = await input('Enter git URL or local path to add to staging', 'https://github.com/kevin-funderburg/AppleScripts.git');
    if (!src) return;
    const spinner = ora('Adding source...').start();
    try {
        if (src.startsWith('http://') || src.startsWith('https://')) {
            const name = src.split('/').pop()?.replace('.git', '') || `repo_${Date.now()}`;
            const target = path.join(STAGING_DIR, name);
            fs.rmSync(target, { recursive: true, force: true });
            const result = spawnSync('git', ['clone', '--depth=1', src, target], { stdio: 'pipe', encoding: 'utf-8' });
            if (result.status !== 0) throw new Error(result.stderr || 'git clone failed');
        } else if (fs.existsSync(src)) {
            const base = path.basename(src);
            const target = path.join(STAGING_DIR, base);
            fs.rmSync(target, { recursive: true, force: true });
            fs.cpSync(src, target, { recursive: true });
        } else {
            throw new Error('Source not found');
        }
        spinner.succeed('Source added to staging');
    } catch (e: any) {
        spinner.fail('Failed to add source');
        console.log(chalk.red(`  ✗ ${e.message || e}`));
    }
    await new Promise(r => setTimeout(r, 1200));
}

async function ingestTopBundle(): Promise<void> {
    ensureDir(STAGING_DIR);
    ensureDir(ACTIVE_DIR);
    const confirmIngest = await confirm('Fetch top repos → staging, promote to active, then index?', true);
    if (!confirmIngest) return;
    await fetchTopReposToStaging();
    await promoteStagingToActive();
    await indexChroma();
}

async function ragQuickSearch(): Promise<void> {
    showHeader('RAG Search (Preview)');
    const query = await input('Search query', 'open Safari');
    if (!query) return;
    const refine = await input('Add refinement (optional)', '');
    const finalQuery = refine ? `${query}. ${refine}` : query;
    await displayRagSearch(finalQuery);
}

async function fetchTopReposToStaging(): Promise<void> {
    ensureDir(STAGING_DIR);
    const spinner = ora('Fetching top repositories bundle...').start();
    try {
        for (const repo of TOP_REPOS) {
            const name = repo.split('/').pop()?.replace('.git', '') || `repo_${Date.now()}`;
            const target = path.join(STAGING_DIR, name);
            fs.rmSync(target, { recursive: true, force: true });
            const result = spawnSync('git', ['clone', '--depth=1', repo, target], { stdio: 'pipe', encoding: 'utf-8' });
            if (result.status !== 0) throw new Error(result.stderr || `git clone failed for ${repo}`);
        }
        spinner.succeed('Top repositories fetched to staging');
    } catch (e: any) {
        spinner.fail('Failed to fetch top repositories');
        console.log(chalk.red(`  ✗ ${e.message || e}`));
    }
    await new Promise(r => setTimeout(r, 1200));
}

async function promoteStagingToActive(): Promise<void> {
    ensureDir(STAGING_DIR);
    ensureDir(ACTIVE_DIR);
    const confirmMove = await confirm('Promote staging → active (overwrite duplicates)?', false);
    if (!confirmMove) return;
    const spinner = ora('Promoting...').start();
    try {
        const items = fs.readdirSync(STAGING_DIR);
        for (const item of items) {
            const src = path.join(STAGING_DIR, item);
            const dst = path.join(ACTIVE_DIR, item);
            fs.rmSync(dst, { recursive: true, force: true });
            fs.cpSync(src, dst, { recursive: true });
        }
        spinner.succeed('Promoted staging to active');
    } catch (e: any) {
        spinner.fail('Promote failed');
        console.log(chalk.red(`  ✗ ${e.message || e}`));
    }
    await new Promise(r => setTimeout(r, 1200));
}

async function cleanDir(dir: string, label: string): Promise<void> {
    const ok = await confirm(`Delete all contents of ${label} (${dir})?`, false);
    if (!ok) return;
    const spinner = ora(`Cleaning ${label}...`).start();
    try {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        spinner.succeed(`Cleaned ${label}`);
    } catch (e: any) {
        spinner.fail(`Failed to clean ${label}`);
        console.log(chalk.red(`  ✗ ${e.message || e}`));
    }
    await new Promise(r => setTimeout(r, 1200));
}

/**
 * Format value for display
 */
function fmtVal(val: string | undefined, placeholder: string = 'not set'): string {
    return val ? chalk.green(val) : chalk.gray(placeholder);
}

/**
 * Format API key (masked)
 */
function fmtKey(val: string | undefined): string {
    if (!val) return chalk.red('not set');
    if (val.length > 10) return chalk.green(val.substring(0, 8) + '...');
    return chalk.green('***');
}

/**
 * Main menu - unified configuration
 */
export async function mainMenuV2(): Promise<void> {
    while (true) {
        showHeader('Main Menu');
        const config = configManager.getAll();

        // Build service status display
        const serviceChoices = SERVICES.map(s => {
            if (s.key === 'execution') {
                const engine = config['EXECUTION_ENGINE'] || 'not set';
                const engineLabel = engine === 'python-bridge' ? 'Python Bridge' :
                    engine === 'native' ? 'Native (MCP)' : engine;
                return {
                    name: `${s.label.padEnd(12)} ${chalk.cyan(engineLabel)}`,
                    value: `service:${s.key}`
                };
            }
            const provider = config[`${s.key.toUpperCase()}_PROVIDER`] || 'not set';
            const model = config[`${s.key.toUpperCase()}_MODEL`] || 'not set';
            return {
                name: `${s.label.padEnd(12)} ${chalk.gray(provider)} / ${chalk.cyan(model)}`,
                value: `service:${s.key}`
            };
        });

        const choices = [
            ...serviceChoices,
            { name: chalk.cyan('◆─────────────────────────────────────────────────◆'), value: '_sep1', disabled: true },
            { name: `${chalk.green('●')} Secrets & Keys`, value: 'secrets' },
            { name: `${chalk.green('●')} App Settings`, value: 'settings' },
            { name: `${chalk.green('●')} System Health`, value: 'health' },
            { name: `${chalk.green('●')} KONTUR Workflow Audit`, value: 'kontur_audit' },
            { name: `${chalk.green('●')} RAG Control Agent`, value: 'rag_agent' },
            { name: `${chalk.green('●')} RAG Conversational Agent`, value: 'rag_conversational' },
            { name: chalk.cyan('◆─────────────────────────────────────────────────◆'), value: '_sep2', disabled: true },
            { name: `${chalk.green('●')} Build & Deploy`, value: 'build' },
            { name: `${chalk.green('●')} Run macOS Agent`, value: 'run_agent' },
            { name: `${chalk.green('●')} Test Tetyana`, value: 'test_tetyana' },
            { name: chalk.yellow('✕ Exit'), value: 'exit' }
        ];

        const action = await selectNoSep('', choices);

        if (action === 'exit') {
            console.log(chalk.gray('\n  Exiting...\n'));
            process.exit(0);
        }

        if (action.startsWith('service:')) {
            const serviceName = action.replace('service:', '');
            await configureService(serviceName);
        } else if (action === 'secrets') {
            await configureSecrets();
        } else if (action === 'settings') {
            await configureAppSettings();
        } else if (action === 'health') {
            await runHealthCheck();
        } else if (action === 'kontur_audit') {
            await konturWorkflowAudit();
        } else if (action === 'rag_agent') {
            await ragControlAgent();
        } else if (action === 'rag_conversational') {
            await ragConversationalAgent();
        } else if (action === 'build') {
            await buildAndDeployMenu();
        } else if (action === 'test_tetyana') {
            await testTetyanaMode();
        } else if (action === 'run_agent') {
            await runPythonAgent();
        }
    }
}

/**
 * Configure a specific service with unified interface
 */
async function configureService(service: string): Promise<void> {
    const serviceUpper = service.toUpperCase();
    const serviceInfo = SERVICES.find(s => s.key === service);
    const serviceName = serviceInfo?.label || service;

    // Special handling for Vision
    if (service === 'vision') {
        await configureVision();
        return;
    }

    // Special handling for Execution
    if (service === 'execution') {
        await configureExecutionEngine();
        return;
    }

    while (true) {
        showHeader(`Configure ${serviceName}`);
        console.log(chalk.gray(`  ${serviceInfo?.desc || ''}\n`));

        const config = configManager.getAll();
        const providerKey = `${serviceUpper}_PROVIDER`;
        const modelKey = `${serviceUpper}_MODEL`;
        const fallbackKey = `${serviceUpper}_FALLBACK_PROVIDER`;

        const currentProvider = config[providerKey];
        const currentModel = config[modelKey];
        const currentFallback = config[fallbackKey];

        const choices: { name: string; value: string; disabled?: boolean | string }[] = [
            { name: `Provider         ${fmtVal(currentProvider)}`, value: 'provider' },
            { name: `Model            ${fmtVal(currentModel)}`, value: 'model', disabled: !currentProvider ? 'Set provider first' : undefined },
            { name: `Fallback         ${currentFallback ? fmtVal(currentFallback) : chalk.gray('none')}`, value: 'fallback' },
            { name: '─'.repeat(45), value: '_sep', disabled: true },
            { name: 'Back', value: 'back' }
        ];

        const action = await selectNoSep('Provider', choices);

        if (action === 'back') return;

        switch (action) {
            case 'provider':
                await selectProvider(providerKey);
                break;
            case 'model':
                await selectModel(providerKey, modelKey);
                break;
            case 'fallback':
                await selectFallback(fallbackKey, currentProvider);
                break;
        }
    }
}

/**
 * Configure Vision service
 */
async function configureVision(): Promise<void> {
    while (true) {
        showHeader('Configure Vision (Grisha)');
        console.log(chalk.gray('  Visual monitoring for task verification\n'));

        const config = configManager.getAll();
        const currentMode = config['VISION_MODE'] || 'live';
        const fallbackMode = config['VISION_FALLBACK_MODE'];

        const modeLabel = currentMode === 'live' ? chalk.cyan('Live Stream') : chalk.magenta('On-Demand');
        const fallbackLabel = fallbackMode === 'live' ? chalk.cyan('Live Stream') :
            fallbackMode === 'on-demand' ? chalk.magenta('On-Demand') :
                chalk.gray('none');

        const liveProvider = config['VISION_LIVE_PROVIDER'] || 'gemini';
        const onDemandProvider = config['VISION_ONDEMAND_PROVIDER'] || 'copilot';

        const choices = [
            { name: `${chalk.green('●')} Active Mode      ${modeLabel}`, value: 'mode' },
            { name: `${chalk.green('●')} Fallback Mode    ${fallbackLabel}`, value: 'fallback_mode' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep1', disabled: true },
            { name: `${chalk.green('●')} Live Stream      ${chalk.gray(liveProvider)}`, value: 'live' },
            { name: `${chalk.green('●')} On-Demand        ${chalk.gray(onDemandProvider)}`, value: 'ondemand' },
            { name: `${chalk.green('●')} Preset: Electron (Live gemini → Fallback on-demand copilot)`, value: 'preset_electron' },
            { name: `${chalk.green('●')} Preset: CLI headless (disable vision)`, value: 'preset_headless' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep2', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);

        if (action === 'back') return;

        switch (action) {
            case 'mode':
                await selectVisionMode('VISION_MODE');
                break;
            case 'fallback_mode':
                await selectVisionFallbackMode('VISION_FALLBACK_MODE', currentMode);
                break;
            case 'live':
                await configureVisionMode('Live Stream', 'VISION_LIVE');
                break;
            case 'ondemand':
                await configureVisionMode('On-Demand', 'VISION_ONDEMAND');
                break;
            case 'preset_electron':
                await applyElectronVisionPreset();
                break;
            case 'preset_headless':
                await applyHeadlessVisionPreset();
                break;
        }
    }
}

/**
 * Configure a specific Vision mode
 */
async function configureVisionMode(label: string, prefix: string): Promise<void> {
    while (true) {
        showHeader(`Vision: ${label}`);

        const config = configManager.getAll();
        const providerKey = `${prefix}_PROVIDER`;
        const modelKey = `${prefix}_MODEL`;
        const fallbackKey = `${prefix}_FALLBACK_PROVIDER`;

        const currentProvider = config[providerKey];
        const currentModel = config[modelKey];
        const currentFallback = config[fallbackKey];

        const choices = [
            { name: `${chalk.green('●')} Provider         ${fmtVal(currentProvider)}`, value: 'provider' },
            { name: `${chalk.green('●')} Model            ${fmtVal(currentModel)}`, value: 'model', disabled: !currentProvider ? 'Set provider first' : undefined },
            { name: `${chalk.green('●')} Fallback         ${currentFallback ? fmtVal(currentFallback) : chalk.gray('none')}`, value: 'fallback' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);

        if (action === 'back') return;

        switch (action) {
            case 'provider':
                await selectProvider(providerKey);
                break;
            case 'model':
                await selectModel(providerKey, modelKey);
                break;
            case 'fallback':
                await selectFallback(fallbackKey, currentProvider);
                break;
        }
    }
}

/**
 * Configure Execution Engine
 */
async function configureExecutionEngine(): Promise<void> {
    while (true) {
        showHeader('Configure Execution Engine');
        console.log(chalk.gray('  Select the agent runtime environment\n'));

        const config = configManager.getAll();
        const currentEngine = config['EXECUTION_ENGINE'] || 'native';

        const choices = [
            {
                name: `${chalk.green('●')} Engine           ${currentEngine === 'python-bridge' ? chalk.green('Python Bridge') : chalk.cyan('Native (MCP)')}`,
                value: 'engine'
            },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);
        if (action === 'back') return;

        if (action === 'engine') {
            const engine = await select('Select Engine', [
                { name: `Python Bridge    ${chalk.gray('Advanced automation via Open Interpreter')}`, value: 'python-bridge' },
                { name: `Native (MCP)     ${chalk.gray('Standard Atlas MCP execution')}`, value: 'native' },
                { name: 'Back', value: 'back' }
            ]);

            if (engine !== 'back') {
                configManager.set('EXECUTION_ENGINE', engine);
                console.log(chalk.green(`\n  Execution engine set to ${engine}`));
                await new Promise(r => setTimeout(r, 800));
            }
        }
    }
}

/**
 * Configure Secrets & API Keys - SEPARATE SECTION
 */
async function configureSecrets(): Promise<void> {
    const keysList = [
        { key: 'GEMINI_API_KEY', label: 'Gemini API Key' },
        { key: 'COPILOT_API_KEY', label: 'GitHub Copilot Token' },
        { key: 'OPENAI_API_KEY', label: 'OpenAI API Key' },
        { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key' },
        { key: 'MISTRAL_API_KEY', label: 'Mistral API Key' }
    ];

    while (true) {
        showHeader('Secrets & API Keys');
        console.log(chalk.gray('  Manage authentication credentials\n'));

        const config = configManager.getAll();

        const choices: { name: string; value: string; disabled?: boolean }[] = keysList.map(k => ({
            name: `${chalk.green('●')} ${k.label.padEnd(28)} ${fmtKey(config[k.key])}`,
            value: k.key
        }));
        choices.push({ name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true });
        choices.push({ name: chalk.gray('← Back'), value: 'back' });

        const selected = await select('', choices);
        if (selected === 'back') return;

        const keyInfo = keysList.find(k => k.key === selected);
        const current = configManager.get(selected);

        // Special handling for Copilot
        if (selected === 'COPILOT_API_KEY') {
            const method = await select('Method', [
                { name: 'Enter Manually', value: 'manual' },
                { name: 'Import from GitHub CLI', value: 'gh' },
                { name: 'Cancel', value: 'cancel' }
            ]);

            if (method === 'cancel') continue;
            if (method === 'gh') {
                // TODO: Implement GitHub CLI import
                console.log(chalk.yellow('\n  GitHub CLI import not yet implemented'));
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }
        }

        const value = await input(`${keyInfo?.label || selected}`, current);
        if (value && value !== current) {
            configManager.set(selected, value);
            console.log(chalk.green('\n  Saved!'));
            await new Promise(r => setTimeout(r, 800));
        }
    }
}

/**
 * Configure App Settings
 */
async function configureAppSettings(): Promise<void> {
    while (true) {
        showHeader('App Settings');
        const config = configManager.getAll();

        const language = config['APP_LANGUAGE'] || 'uk';
        const theme = config['APP_THEME'] || 'dark';
        const logLevel = config['LOG_LEVEL'] || 'info';
        const useMlxRaw = `${config['USE_MLX'] || ''}`.toLowerCase();
        const useMlx = useMlxRaw === '1' || useMlxRaw === 'true' || useMlxRaw === 'on';
        const ragTopK = config['RAG_TOP_K'] || '5';

        const defaultUseVision = config['DEFAULT_USE_VISION'] === '1' || config['DEFAULT_USE_VISION'] === true || config['DEFAULT_USE_VISION'] === 'true';
        const defaultLiveLog = config['DEFAULT_LIVE_LOG'] === '1' || config['DEFAULT_LIVE_LOG'] === true || config['DEFAULT_LIVE_LOG'] === 'true';

        const choices = [
            { name: `${chalk.green('●')} Language         ${language === 'uk' ? chalk.cyan('Українська') : chalk.gray('English')}`, value: 'APP_LANGUAGE' },
            { name: `${chalk.green('●')} Theme            ${theme === 'dark' ? chalk.magenta('Dark') : chalk.yellow('Light')}`, value: 'APP_THEME' },
            { name: `${chalk.green('●')} Log Level        ${chalk.cyan(logLevel)}`, value: 'LOG_LEVEL' },
            { name: `${chalk.green('●')} USE_MLX          ${useMlx ? chalk.green('ON') : chalk.red('OFF')} ${chalk.gray('(fast embeddings on Apple Silicon)')}`, value: 'USE_MLX' },
            { name: `${chalk.green('●')} RAG Top-K        ${chalk.cyan(ragTopK)}`, value: 'RAG_TOP_K' },
            { name: `${chalk.green('●')} Default Vision   ${defaultUseVision ? chalk.green('ON') : chalk.red('OFF')} ${chalk.gray('(screenshots & verification)')}`, value: 'DEFAULT_USE_VISION' },
            { name: `${chalk.green('●')} Default Live Log ${defaultLiveLog ? chalk.green('ON') : chalk.red('OFF')} ${chalk.gray('(stream agent output)')}`, value: 'DEFAULT_LIVE_LOG' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);
        if (action === 'back') return;

        if (action === 'APP_LANGUAGE') {
            const lang = await select('Language', [
                { name: 'Українська', value: 'uk' },
                { name: 'English', value: 'en' },
                { name: 'Back', value: 'back' }
            ]);
            if (lang !== 'back') configManager.set('APP_LANGUAGE', lang);
        } else if (action === 'APP_THEME') {
            const t = await select('Theme', [
                { name: 'Dark', value: 'dark' },
                { name: 'Light', value: 'light' },
                { name: 'Back', value: 'back' }
            ]);
            if (t !== 'back') configManager.set('APP_THEME', t);
        } else if (action === 'LOG_LEVEL') {
            const level = await select('Log Level', [
                { name: 'Debug', value: 'debug' },
                { name: 'Info', value: 'info' },
                { name: 'Warn', value: 'warn' },
                { name: 'Error', value: 'error' },
                { name: 'Back', value: 'back' }
            ]);
            if (level !== 'back') configManager.set('LOG_LEVEL', level);
        } else if (action === 'USE_MLX') {
            const val = await select('USE_MLX (fast embeddings on Apple Silicon)', [
                { name: 'ON (recommended on Apple Silicon)', value: '1' },
                { name: 'OFF', value: '0' },
                { name: 'Back', value: 'back' }
            ]);
            if (val !== 'back') configManager.set('USE_MLX', val);
        } else if (action === 'RAG_TOP_K') {
            const val = await input('RAG Top-K (results to fetch)', ragTopK);
            if (val) configManager.set('RAG_TOP_K', val);
        } else if (action === 'DEFAULT_USE_VISION') {
            const val = await select('Default Vision (screenshots & verification)', [
                { name: 'ON (use screenshots)', value: '1' },
                { name: 'OFF (no vision)', value: '0' },
                { name: 'Back', value: 'back' }
            ]);
            if (val !== 'back') configManager.set('DEFAULT_USE_VISION', val);
        } else if (action === 'DEFAULT_LIVE_LOG') {
            const val = await select('Default Live Log (stream agent output)', [
                { name: 'ON (show live output)', value: '1' },
                { name: 'OFF (silent mode)', value: '0' },
                { name: 'Back', value: 'back' }
            ]);
            if (val !== 'back') configManager.set('DEFAULT_LIVE_LOG', val);
        }
    }
}

/**
 * Select provider
 */
async function selectProvider(providerKey: string): Promise<void> {
    const choices = PROVIDERS.map(p => ({ name: p, value: p }));
    choices.push({ name: 'Back', value: 'back' });

    const selected = await select('Provider', choices);
    if (selected !== 'back') {
        configManager.set(providerKey, selected);
    }
}

/**
 * Select model
 */
async function selectModel(providerKey: string, modelKey: string): Promise<void> {
    const provider = configManager.get(providerKey);

    if (!provider) {
        console.log(chalk.red('\n  Please set a provider first.\n'));
        await new Promise(r => setTimeout(r, 1500));
        return;
    }

    const spinner = ora('Fetching models...').start();

    try {
        const apiKey = getEffectiveApiKey(provider);
        const models = await modelRegistry.fetchModels(provider, apiKey);
        spinner.stop();

        if (models.length === 0) {
            console.log(chalk.yellow('\n  No models available for this provider.\n'));
            await new Promise(r => setTimeout(r, 1500));
            return;
        }

        const choices = models.map(m => ({
            name: `${m.name}${m.id !== m.name ? chalk.gray(` (${m.id})`) : ''}`,
            value: m.id
        }));
        choices.push({ name: 'Back', value: 'back' });

        const selected = await selectNoSep('Model', choices, { pageSize: 20 });
        if (selected !== 'back') {
            configManager.set(modelKey, selected);
        }
    } catch (e: any) {
        spinner.fail(`Failed to fetch models: ${e.message}`);
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Select fallback provider
 */
async function selectFallback(fallbackKey: string, primaryProvider?: string): Promise<void> {
    const excludeSet = new Set([primaryProvider].filter(Boolean));
    const availableProviders = PROVIDERS.filter(p => !excludeSet.has(p));
    const choices = [
        { name: 'None', value: '' },
        ...availableProviders.map(p => ({ name: p, value: p })),
        { name: 'Back', value: 'back' }
    ];

    const selected = await selectNoSep('Fallback Provider', choices);
    if (selected !== 'back') {
        configManager.set(fallbackKey, selected);
    }
}

/**
 * Select Vision mode
 */
async function selectVisionMode(modeKey: string): Promise<void> {
    const choices = [
        { name: `Live Stream      ${chalk.gray('Continuous video stream for real-time observation')}`, value: 'live' },
        { name: `On-Demand        ${chalk.gray('Screenshot after task - Copilot/GPT-4o analysis')}`, value: 'on-demand' },
        { name: 'Back', value: 'back' }
    ];

    const selected = await select('Vision Mode', choices);
    if (selected !== 'back') {
        configManager.set(modeKey, selected);
        console.log(chalk.green(`\n  Vision mode set to ${selected}`));
        await new Promise(r => setTimeout(r, 800));
    }
}

/**
 * Select Vision fallback mode
 */
async function selectVisionFallbackMode(modeKey: string, currentMode: string): Promise<void> {
    const choices = [
        { name: 'None', value: '' },
        currentMode !== 'live' ? { name: 'Live Stream', value: 'live' } : null,
        currentMode !== 'on-demand' ? { name: 'On-Demand', value: 'on-demand' } : null,
        { name: 'Back', value: 'back' }
    ].filter(Boolean) as any[];

    const selected = await select('Fallback Mode', choices);
    if (selected !== 'back') {
        configManager.set(modeKey, selected);
    }
}

/**
 * Get effective API key
 */
function getEffectiveApiKey(provider: string): string {
    const config = configManager.getAll();
    const providerKeyName = PROVIDER_API_KEYS[provider];
    return (providerKeyName && config[providerKeyName]) || config['GEMINI_API_KEY'] || '';
}

async function applyElectronVisionPreset(): Promise<void> {
    // Live: gemini, On-Demand: copilot, Fallback: on-demand
    configManager.set('VISION_MODE', 'live');
    configManager.set('VISION_FALLBACK_MODE', 'on-demand');
    configManager.set('VISION_LIVE_PROVIDER', 'gemini');
    configManager.set('VISION_ONDEMAND_PROVIDER', 'copilot');
    console.log(chalk.green('\n  ✓ Electron preset applied (Live: gemini, Fallback: On-Demand copilot)\n'));
    await new Promise(r => setTimeout(r, 1200));
}

async function applyHeadlessVisionPreset(): Promise<void> {
    // Disable vision for CLI headless runs; user can still enable per-run prompt
    configManager.set('VISION_MODE', 'on-demand');
    configManager.set('VISION_FALLBACK_MODE', '');
    // Mark providers but vision can be turned off at run time
    configManager.set('VISION_LIVE_PROVIDER', 'gemini');
    configManager.set('VISION_ONDEMAND_PROVIDER', 'copilot');
    console.log(chalk.yellow('\n  ⚠️ Vision will be disabled at runtime if you choose headless in agent run.\n'));
    await new Promise(r => setTimeout(r, 1200));
}

/**
 * Run health check
 */
async function runHealthCheck(): Promise<void> {
    showHeader('System Health Check');
    console.log(chalk.gray('  Checking system configuration...\n'));

    const config = configManager.getAll();
    const requiredKeys = [
        { key: 'GEMINI_API_KEY', label: 'Gemini API Key' },
        { key: 'COPILOT_API_KEY', label: 'Copilot Token' },
        { key: 'OPENAI_API_KEY', label: 'OpenAI API Key' },
        { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key' },
        { key: 'MISTRAL_API_KEY', label: 'Mistral API Key' }
    ];

    const checks: { label: string; ok: boolean; detail?: string }[] = [];
    const hasAllKeys = requiredKeys.every(k => !!config[k.key]);
    for (const k of requiredKeys) {
        checks.push({ label: k.label, ok: !!config[k.key] });
    }

    // BRAIN/VISION/EXEC
    checks.push({ label: 'Brain Provider', ok: !!config['BRAIN_PROVIDER'] });
    checks.push({ label: 'Brain Model', ok: !!config['BRAIN_MODEL'] });
    checks.push({ label: 'Vision Mode', ok: !!config['VISION_MODE'] });
    checks.push({ label: 'Execution Engine', ok: !!config['EXECUTION_ENGINE'] });

    // Binaries
    checks.push(checkCommand('python3', 'python3 available'));
    checks.push(checkCommand('copilot', 'copilot CLI available'));
    checks.push(checkCommand('redis-cli', 'redis-cli available'));

    // Redis ping
    const redisOk = checkRedis();
    checks.push({ label: 'Redis reachable', ok: redisOk });

    // Chrome present
    const chromeOk = fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    checks.push({ label: 'Google Chrome installed', ok: chromeOk });

    // Chroma DB exists
    const chromaDb = path.join(PROJECT_ROOT, 'rag', 'chroma_mac', 'chroma.sqlite3');
    checks.push({ label: 'Chroma DB exists', ok: fs.existsSync(chromaDb) });

    // MLX toggle hint
    const onAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64';
    checks.push({ label: 'Apple Silicon (for MLX)', ok: onAppleSilicon, detail: onAppleSilicon ? 'arm64' : process.arch });

    let healthy = checks.every(c => c.ok);
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));
    for (const c of checks) {
        const status = c.ok ? chalk.green('✓ OK') : chalk.red('✗ MISSING');
        const detail = c.detail ? ` ${chalk.gray(c.detail)}` : '';
        console.log(`  │ ${chalk.green('●')} ${c.label.padEnd(28)} ${status}${detail}`);
    }
    console.log(chalk.cyan('  ◆─────────────────────────────────────────◆'));

    console.log('');
    if (healthy) {
        console.log(chalk.green('  ✓ All critical components configured!'));
    } else {
        console.log(chalk.yellow('  ⚠ Some components need configuration'));
    }

    await input('\nPress Enter to continue', '');
}

function checkCommand(cmdName: string, label: string): { label: string; ok: boolean; detail?: string } {
    try {
        const which = spawnSync('which', [cmdName], { encoding: 'utf-8' });
        if (which.status === 0 && which.stdout.trim()) {
            return { label, ok: true, detail: which.stdout.trim() };
        }
    } catch {}
    return { label, ok: false };
}

function checkRedis(): boolean {
    try {
        const res = spawnSync('redis-cli', ['ping'], { encoding: 'utf-8', timeout: 1000 });
        return res.status === 0 && res.stdout.trim().toLowerCase() === 'pong';
    } catch {
        return false;
    }
}

/**
 * Test Tetyana mode
 */
async function testTetyanaMode(): Promise<void> {
    showHeader('Test Tetyana (NL Mode)');
    console.log(chalk.gray('  Testing natural language task execution\n'));
    
    const task = await input('Enter a test task', 'Open Calculator');
    console.log(chalk.gray(`\n  Testing: "${task}"\n`));
    
    try {
        const { OpenInterpreterBridge } = await import('../../modules/tetyana/open_interpreter_bridge.js');
        
        const bridge = new OpenInterpreterBridge();
        
        if (!OpenInterpreterBridge.checkEnvironment()) {
            console.log(chalk.red('  ✗ Python environment not found'));
            console.log(chalk.gray('  Please ensure mac_master_agent.py is set up'));
            await new Promise(r => setTimeout(r, 2000));
            return;
        }
        
        console.log(chalk.cyan('  ◆ Testing natural language mode...\n'));
        
        try {
            const result = await bridge.execute(task);
            console.log(chalk.green('\n  ✓ Test completed successfully\n'));
            console.log(chalk.gray('  Result:'));
            console.log(chalk.cyan('  ' + result.split('\n').join('\n  ')));
            await new Promise(r => setTimeout(r, 1500));
        } catch (error: any) {
            console.log(chalk.red(`\n  ✗ Test failed: ${error.message}\n`));
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (error: any) {
        console.log(chalk.red(`  ✗ Error: ${error.message}`));
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Run Python Agent
 */
async function runPythonAgent(): Promise<void> {
    showHeader('Run macOS Automation Agent - Tetyana v12 LangGraph');
    console.log(chalk.gray('  Reliable automation with replan and verification\n'));

    const config = configManager.getAll();
    const task = await input('Enter task', 'Open Calculator');
    const defaultUseVision = config['DEFAULT_USE_VISION'] === '1' || config['DEFAULT_USE_VISION'] === true || config['DEFAULT_USE_VISION'] === 'true';
    const defaultLiveLog = config['DEFAULT_LIVE_LOG'] === '1' || config['DEFAULT_LIVE_LOG'] === true || config['DEFAULT_LIVE_LOG'] === 'true';
    const useVision = await confirm('Use vision (screenshots & verification)? (best in Electron UI)', defaultUseVision);
    const liveLog = await confirm('Stream live log?', defaultLiveLog);

    console.log(chalk.gray(`\n  Executing: "${task}"\n`));
    const env = { ...process.env, VISION_DISABLE: useVision ? '0' : '1' };

    // Streamed execution via ./bin/tetyana to show live logs
    const cmd = './bin/tetyana';
    const args = [task];

    const spinner = liveLog ? null : ora('Running agent...').start();
    const proc = spawn(cmd, args, { env, stdio: liveLog ? 'inherit' : 'pipe' });

    if (!liveLog && proc.stdout) {
        proc.stdout.on('data', (data) => {
            if (spinner) spinner.stop();
            process.stdout.write(chalk.cyan(data.toString()));
        });
    }
    if (!liveLog && proc.stderr) {
        proc.stderr.on('data', (data) => {
            if (spinner) spinner.stop();
            process.stdout.write(chalk.yellow(data.toString()));
        });
    }

    await new Promise<void>((resolve) => {
        proc.on('close', (code) => {
            if (spinner) spinner.stop();
            if (code === 0) {
                console.log(chalk.green('\n  ✓ Agent completed\n'));
            } else {
                console.log(chalk.red(`\n  ✗ Agent exited with code ${code}\n`));
            }
            resolve();
        });
    });
}

/**
 * Build and Deploy Menu
 */
async function buildAndDeployMenu(): Promise<void> {
    while (true) {
        showHeader('Build & Deploy');
        
        const choices = [
            { name: `${chalk.green('●')} Build Project       ${chalk.gray('npm run build')}`, value: 'build' },
            { name: `${chalk.green('●')} Dev Mode            ${chalk.gray('npm run dev')}`, value: 'dev' },
            { name: `${chalk.green('●')} Rebuild Binary      ${chalk.gray('Copy Python organs')}`, value: 'rebuild_binary' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);
        
        if (action === 'back') return;
        
        if (action === 'build') {
            await runBuild();
        } else if (action === 'dev') {
            await runDev();
        } else if (action === 'rebuild_binary') {
            await rebuildBinary();
        }
    }
}

/**
 * Run npm build
 */
async function runBuild(): Promise<void> {
    showHeader('Building Project');
    console.log(chalk.gray('  Running: npm run build\n'));
    
    const { execSync } = require('child_process');
    try {
        const spinner = ora('Building...').start();
        const output = execSync('npm run build', { encoding: 'utf-8', stdio: 'pipe' });
        spinner.succeed('Build completed successfully');
        console.log(chalk.green('\n  ✓ Project built and ready for deployment\n'));
        await new Promise(r => setTimeout(r, 1500));
    } catch (error: any) {
        console.log(chalk.red(`\n  ✗ Build failed: ${error.message}\n`));
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Run npm dev
 */
async function runDev(): Promise<void> {
    showHeader('Development Mode');
    console.log(chalk.gray('  Running: npm run dev\n'));
    console.log(chalk.yellow('  Note: Press Ctrl+C to stop\n'));
    
    const { execSync } = require('child_process');
    try {
        execSync('npm run dev', { stdio: 'inherit' });
    } catch (error: any) {
        console.log(chalk.gray('\n  Development mode stopped\n'));
    }
}

/**
 * Rebuild Binary (copy Python organs)
 */
async function rebuildBinary(): Promise<void> {
    showHeader('Rebuild Binary');
    console.log(chalk.gray('  Copying Python organs to out/kontur/\n'));
    
    const { execSync } = require('child_process');
    try {
        const spinner = ora('Rebuilding...').start();
        execSync('mkdir -p out/kontur/organs out/kontur/ag', { stdio: 'pipe' });
        execSync('cp src/kontur/organs/*.py out/kontur/organs/', { stdio: 'pipe' });
        execSync('cp src/kontur/ag/*.py out/kontur/ag/', { stdio: 'pipe' });
        spinner.succeed('Binary rebuilt successfully');
        console.log(chalk.green('\n  ✓ Python organs copied to out/\n'));
        await new Promise(r => setTimeout(r, 1500));
    } catch (error: any) {
        console.log(chalk.red(`\n  ✗ Rebuild failed: ${error.message}\n`));
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * RAG Status and Search Menu
 */
async function ragMenu(): Promise<void> {
    while (true) {
        showHeader('RAG Status & Search');
        
        const status = await getRagIndexStatus();
        const statusText = status.indexed ? 
            chalk.green(`✓ Indexed (${status.documentCount} docs)`) : 
            chalk.red('✗ Not indexed');

        const choices = [
            { name: `${chalk.green('●')} View Status           ${statusText}`, value: 'status' },
            { name: `${chalk.green('●')} Search Repository     ${chalk.gray('Find documents')}`, value: 'search' },
            { name: `${chalk.green('●')} Index Chroma (50k)    ${chalk.gray('Build vectors')}`, value: 'index' },
            { name: `${chalk.green('●')} Reset Chroma          ${chalk.gray('Clear DB')}`, value: 'reset' },
            { name: `${chalk.green('●')} Manage Docs           ${chalk.gray('Delete by source pattern')}`, value: 'manage_docs' },
            { name: chalk.cyan('◆─────────────────────────────────────────◆'), value: '_sep', disabled: true },
            { name: chalk.gray('← Back'), value: 'back' }
        ];

        const action = await select('', choices);
        
        if (action === 'back') return;
        
        if (action === 'status') {
            await displayRagStatus();
        } else if (action === 'search') {
            const query = await input('Search query', 'open Safari');
            if (query) {
                const refine = await input('Add refinement (optional)', '');
                const finalQuery = refine ? `${query}. ${refine}` : query;
                await displayRagSearch(finalQuery);
            }
        } else if (action === 'index') {
            await indexChroma();
        } else if (action === 'reset') {
            await resetChroma();
        } else if (action === 'manage_docs') {
            await deleteChromaDocs();
        }
    }
}

/**
 * Run RAG indexer (build 50k+ embeddings if corpus available)
 */
async function indexChroma(): Promise<void> {
    showHeader('Index Chroma (RAG)');
    console.log(chalk.gray('  Running: python3 src/kontur/organs/rag_indexer.py\n'));
    try {
        const spinner = ora('Indexing...').start();
        const env = { ...process.env };
        if (isAppleSilicon()) {
            env.USE_MLX = '1';
        }
        execSync('python3 src/kontur/organs/rag_indexer.py', { stdio: 'pipe', env });
        spinner.succeed('Indexing completed');
        console.log(chalk.green('\n  ✓ Chroma index built\n'));
        await new Promise(r => setTimeout(r, 1500));
    } catch (error: any) {
        console.log(chalk.red(`\n  ✗ Indexing failed: ${error.message}\n`));
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Reset Chroma database (dangerous)
 */
async function resetChroma(): Promise<void> {
    const confirmed = await confirm('Reset Chroma database? This will clear rag/chroma_mac', false);
    if (!confirmed) return;

    showHeader('Reset Chroma');
    const ragPath = path.join(process.cwd(), 'rag', 'chroma_mac');
    try {
        if (fs.existsSync(ragPath)) {
            fs.rmSync(ragPath, { recursive: true, force: true });
        }
        fs.mkdirSync(ragPath, { recursive: true });
        console.log(chalk.green('\n  ✓ Chroma database reset\n'));
        await new Promise(r => setTimeout(r, 1500));
    } catch (error: any) {
        console.log(chalk.red(`\n  ✗ Reset failed: ${error.message}\n`));
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Delete documents from Chroma by source pattern
 */
async function deleteChromaDocs(): Promise<void> {
    const pattern = await input('Delete docs where source LIKE (e.g., %.md or folder%)', '');
    if (!pattern) return;
    const confirmed = await confirm(`Delete documents matching "${pattern}"?`, false);
    if (!confirmed) return;

    showHeader('Delete Chroma Documents');
    try {
        const pythonScript = `
import sqlite3
import json
db = 'rag/chroma_mac/chroma.sqlite3'
conn = sqlite3.connect(db)
cur = conn.cursor()
try:
    cur.execute("DELETE FROM documents WHERE metadata LIKE ?", ('%${pattern}%',))
    conn.commit()
    print('OK')
except Exception as e:
    print('ERR', e)
finally:
    conn.close()
`;
        const output = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
        if (output.startsWith('OK')) {
            console.log(chalk.green('\n  ✓ Documents deleted\n'));
        } else {
            console.log(chalk.yellow(`\n  ⚠ ${output}\n`));
        }
    } catch (error: any) {
        console.log(chalk.red(`\n  ✗ Delete failed: ${error.message}\n`));
    }
    await new Promise(r => setTimeout(r, 1500));
}

function isAppleSilicon(): boolean {
    return process.platform === 'darwin' && process.arch === 'arm64';
}
