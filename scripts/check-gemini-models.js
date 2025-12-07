
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ No API key found in env');
        process.exit(1);
    }

    console.log('🔑 Using API Key:', apiKey.substring(0, 8) + '...');

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Note: listModels is on the genAI instance or model manager depending on SDK version
        // For 0.24.x it might be different, let's try standard way
        console.log('📡 Fetching available models...');
        // There isn't a direct listModels on the main class in some versions, 
        // but let's try to just instantiate a few common ones and see if they throw immediately
        // or use the model manager if accessible.

        // Actually, in the newer SDK, we might not have a listModels method easily exposed on the client
        // without using the REST API directly or a specific manager. 
        // Let's try to infer from a simple generation test on candidate models.

        const candidates = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-exp',
            'gemini-2.5-flash',
            'gemini-1.5-flash'
        ];

        for (const modelName of candidates) {
            process.stdout.write(`Testing ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hi');
                console.log('✅ OK');
            } catch (e) {
                console.log(`❌ FAILED: ${e.message}`);
                console.log(JSON.stringify(e, null, 2));
            }
        }

    } catch (error) {
        console.error('Check failed:', error);
    }
}

listModels();
