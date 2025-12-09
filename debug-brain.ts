
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { ProviderRouter } from './src/kontur/providers/router.js';
import { LLMRequest } from './src/kontur/providers/types.js';

async function testBrain() {
    console.log('--- Testing Brain Configuration ---');
    console.log(`BRAIN_PROVIDER: ${process.env.BRAIN_PROVIDER}`);
    console.log(`BRAIN_MODEL: ${process.env.BRAIN_MODEL}`);
    // process.env.COPILOT_API_KEY should be loaded from .env
    console.log(`COPILOT_API_KEY: ${process.env.COPILOT_API_KEY ? 'Set' : 'Not Set'}`);

    const router = new ProviderRouter();
    const request: LLMRequest = {
        prompt: "Hello! Who are you and what model are you running on?",
        temperature: 0.7
    };

    try {
        console.log('\nSending request...');
        const response = await router.generateLLM('brain', request);
        console.log('\n--- Response ---');
        console.log(response.text);

        if (response.provider) console.log(`\nProvider used: ${response.provider}`);
        if (response.model) console.log(`Model used: ${response.model}`);

    } catch (error: any) {
        console.error('\n--- Error ---');
        console.error(error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

testBrain();
