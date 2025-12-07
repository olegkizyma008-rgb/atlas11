import { GrishaAPI, SafetyReport } from './contract';
import { synapse } from '../../kontur/synapse';
import { BrainAPI } from '../brain/contract';

export class GrishaCapsule implements GrishaAPI {
    private brain: BrainAPI;

    constructor(brain: BrainAPI) {
        this.brain = brain;
    }

    async observe(): Promise<SafetyReport> {
        console.log("GRISHA: Observing system state via Brain...");

        // In a real system, we'd feed recent logs/context to the Brain
        const context = "System is running. User executed: build task.";

        const response = await this.brain.think({
            system_prompt: "You are GRISHA, the Sentinel. Analyze the system state for threats. Return JSON: { threats: string[], level: 'low'|'medium'|'high' }.",
            user_prompt: `Context: ${context}`
        });

        let report: SafetyReport = {
            threats: [],
            level: 'low',
            timestamp: Date.now()
        };

        try {
            const result = JSON.parse(response.text || '{}');
            report = {
                threats: result.threats || [],
                level: result.level || 'low',
                timestamp: Date.now()
            };
        } catch (e) {
            console.warn("GRISHA: Failed to parse Brain response", e);
        }

        if (report.level !== 'low') {
            synapse.emit('grisha', 'threat_detected', { level: report.level, description: report.threats.join(', ') });
        }

        return report;
    }

    async audit(args: { action: string; params: Record<string, any> }): Promise<{ allowed: boolean; reason?: string }> {
        console.log(`GRISHA: Auditing action ${args.action}`);
        // Brain check could go here
        return { allowed: true };
    }
}
