
import 'dotenv/config';
import { initializeDeepIntegration } from '../src/main/initialize-deep-integration';

async function runVerification() {
    console.log("⚡ Starting KONTUR System Verification...");

    try {
        const system = await initializeDeepIntegration();

        console.log("✅ System Initialized. Running Integration Test...");
        const result = await system.runIntegrationTest();

        console.log("📊 Verification Result:", result);

        if (result.success) {
            console.log("🎉 SUCCESS: KONTUR System is fully operational.");
            process.exit(0);
        } else {
            console.error("❌ FAILURE: Integration test returned errors:", result.errors);
            process.exit(1);
        }

    } catch (error) {
        console.error("💥 CRITICAL FAILURE:", error);
        process.exit(1);
    }
}

runVerification();
