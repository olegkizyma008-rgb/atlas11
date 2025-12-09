#!/usr/bin/env node
/**
 * Test Script: Verify OpenInterpreterBridge Environment
 * 
 * This script checks if the Python environment and mac_master_agent.py
 * are properly configured for the OpenInterpreterBridge to work.
 * 
 * Run with: npx ts-node test-bridge-environment.ts
 */

import { OpenInterpreterBridge } from './src/modules/tetyana/open_interpreter_bridge';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/Users/dev';
const PYTHON_PATH = path.join(HOME, 'mac_assistant/venv/bin/python3');
const AGENT_SCRIPT_PATH = path.join(HOME, 'mac_assistant/mac_master_agent.py');
const RAG_DB_PATH = path.join(HOME, 'mac_assistant_rag/chroma_mac');
const KB_PATH = path.join(HOME, 'mac_assistant_rag/macOS-automation-knowledge-base');

interface CheckResult {
  name: string;
  status: 'OK' | 'WARN' | 'ERROR';
  message: string;
  details?: string[];
}

const results: CheckResult[] = [];

// Check 1: Python venv exists
console.log('🔍 Checking Python environment...');
const pythonExists = fs.existsSync(PYTHON_PATH);
results.push({
  name: 'Python venv',
  status: pythonExists ? 'OK' : 'ERROR',
  message: pythonExists ? `✅ Python found at ${PYTHON_PATH}` : `❌ Python not found at ${PYTHON_PATH}`,
});

// Check 2: mac_master_agent.py exists
console.log('🔍 Checking mac_master_agent.py...');
const agentExists = fs.existsSync(AGENT_SCRIPT_PATH);
results.push({
  name: 'mac_master_agent.py',
  status: agentExists ? 'OK' : 'ERROR',
  message: agentExists ? `✅ Agent script found at ${AGENT_SCRIPT_PATH}` : `❌ Agent script not found at ${AGENT_SCRIPT_PATH}`,
});

// Check 3: OpenInterpreterBridge.checkEnvironment()
console.log('🔍 Checking OpenInterpreterBridge.checkEnvironment()...');
const bridgeReady = OpenInterpreterBridge.checkEnvironment();
results.push({
  name: 'OpenInterpreterBridge',
  status: bridgeReady ? 'OK' : 'ERROR',
  message: bridgeReady ? '✅ Bridge environment is ready' : '❌ Bridge environment check failed',
});

// Check 4: RAG Database
console.log('🔍 Checking RAG database...');
const ragDbExists = fs.existsSync(RAG_DB_PATH);
results.push({
  name: 'RAG Database',
  status: ragDbExists ? 'OK' : 'WARN',
  message: ragDbExists ? `✅ RAG database found at ${RAG_DB_PATH}` : `⚠️ RAG database not found at ${RAG_DB_PATH}`,
  details: ragDbExists ? [
    `Run: ~/mac_assistant/venv/bin/python3 ~/mac_assistant/index_rag.py`
  ] : undefined,
});

// Check 5: Knowledge Base
console.log('🔍 Checking Knowledge Base...');
const kbExists = fs.existsSync(KB_PATH);
results.push({
  name: 'Knowledge Base',
  status: kbExists ? 'OK' : 'WARN',
  message: kbExists ? `✅ Knowledge base found at ${KB_PATH}` : `⚠️ Knowledge base not found at ${KB_PATH}`,
});

// Check 6: Environment variables
console.log('🔍 Checking environment variables...');
const hasGemini = !!process.env.GEMINI_API_KEY;
const hasCopilot = !!process.env.COPILOT_API_KEY;
const hasOpenAI = !!process.env.OPENAI_API_KEY;

const envStatus = hasGemini || hasCopilot || hasOpenAI ? 'OK' : 'ERROR';
const envMessage = [
  hasGemini ? '✅ GEMINI_API_KEY' : '❌ GEMINI_API_KEY',
  hasCopilot ? '✅ COPILOT_API_KEY' : '❌ COPILOT_API_KEY',
  hasOpenAI ? '✅ OPENAI_API_KEY' : '❌ OPENAI_API_KEY',
].join(', ');

results.push({
  name: 'API Keys',
  status: envStatus as 'OK' | 'ERROR',
  message: envMessage,
});

// Print results
console.log('\n' + '='.repeat(80));
console.log('📊 ENVIRONMENT CHECK RESULTS');
console.log('='.repeat(80) + '\n');

let allOk = true;
results.forEach((result) => {
  const icon = result.status === 'OK' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} ${result.name.padEnd(30)} ${result.message}`);
  
  if (result.details) {
    result.details.forEach((detail) => {
      console.log(`   └─ ${detail}`);
    });
  }
  
  if (result.status !== 'OK') {
    allOk = false;
  }
});

console.log('\n' + '='.repeat(80));

if (allOk) {
  console.log('✅ All checks passed! The bridge is ready to use.');
  console.log('\nNext steps:');
  console.log('1. Set EXECUTION_ENGINE=python-bridge in your .env file');
  console.log('2. Run: npm run dev (or your start command)');
  console.log('3. Send a task to the system');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  console.log('\nQuick fixes:');
  console.log('1. Ensure Python 3.12+ is installed: brew install python@3.12');
  console.log('2. Create venv: python3 -m venv ~/mac_assistant/venv');
  console.log('3. Install dependencies: ~/mac_assistant/venv/bin/pip install open-interpreter langchain chromadb pyobjc');
  console.log('4. Set API keys in .env file');
  process.exit(1);
}
