import { GrishaAPI, SafetyReport } from './contract';
import { synapse } from '../../kontur/synapse';
import { BrainAPI } from '../brain/contract';
import { 
  validateOperation, 
  analyzeThreat, 
  ATLAS_SECURITY_POLICY,
  ThreatLevel 
} from './policies';
import { GrishaVision, VisualAnomalyReport, createGrishaVision } from './vision';

export class GrishaCapsule implements GrishaAPI {
    private brain: BrainAPI;
    private vision: GrishaVision;
    private auditLog: Array<{
        timestamp: number;
        action: string;
        allowed: boolean;
        reason?: string;
        riskLevel?: string;
    }> = [];
    private threatHistory: Map<string, number> = new Map();
    private lastVisualAnalysis: VisualAnomalyReport | null = null;

    constructor(brain: BrainAPI) {
        this.brain = brain;
        this.vision = createGrishaVision(process.env.GOOGLE_API_KEY);
        console.log('🛡️ GrishaCapsule: Real security implementation initialized with vision oversight');
    }

    async observe(): Promise<SafetyReport> {
        console.log("🛡️ GRISHA: Observing system state via Brain and Vision...");

        // Build threat summary from recent audit log
        const recentThreats = this.auditLog
            .filter(entry => !entry.allowed)
            .slice(-5)
            .map(entry => entry.reason || 'Unknown threat');

        // Collect threat data from visual analysis
        const visualThreats: string[] = [];
        if (this.lastVisualAnalysis?.anomaliesDetected) {
            visualThreats.push(
                ...this.lastVisualAnalysis.anomalies.map(
                    a => `${a.type} (${a.severity}): ${a.description}`
                )
            );
        }

        const allThreats = [...recentThreats, ...visualThreats];
        const threatLevel = allThreats.length > 3 ? 'high' : allThreats.length > 0 ? 'medium' : 'low';

        // Query Brain for additional context
        const context = `Audit log: ${this.auditLog.length} ops. Recent threats: ${allThreats.join('; ') || 'None detected'}`;

        const response = await this.brain.think({
            system_prompt: "You are GRISHA, the Sentinel. Assess system security threats. Return JSON: { threats: string[], level: 'low'|'medium'|'high' }.",
            user_prompt: `Context: ${context}`
        });

        let report: SafetyReport = {
            threats: allThreats,
            level: threatLevel as 'low' | 'medium' | 'high',
            timestamp: Date.now()
        };

        try {
            const result = JSON.parse(response.text || '{}');
            report.threats = result.threats || allThreats;
            report.level = result.level || threatLevel as 'low' | 'medium' | 'high';
        } catch (e) {
            console.warn("🛡️ GRISHA: Failed to parse Brain response", e);
        }

        if (report.level !== 'low') {
            synapse.emit('grisha', 'threat_detected', { 
                level: report.level, 
                description: report.threats.join(', ') 
            });
        }

        return report;
    }

    async audit(args: { action: string; params: Record<string, any> }): Promise<{ allowed: boolean; reason?: string }> {
        console.log(`🛡️ GRISHA: Auditing action "${args.action}"`);

        // Validate against security policy
        const validation = validateOperation(args.action, args.params, ATLAS_SECURITY_POLICY);

        // Log audit entry
        const auditEntry = {
            timestamp: Date.now(),
            action: args.action,
            allowed: validation.allowed,
            reason: validation.reason,
            riskLevel: validation.riskLevel
        };

        this.auditLog.push(auditEntry);

        // Update threat history
        if (!validation.allowed) {
            const key = `${args.action}:${validation.riskLevel}`;
            this.threatHistory.set(key, (this.threatHistory.get(key) || 0) + 1);

            // Emit threat signal
            synapse.emit('grisha', 'audit_log', {
                action: args.action,
                verdict: 'BLOCKED',
                reason: validation.reason
            });

            console.warn(`🛡️ GRISHA: BLOCKED - ${validation.reason}`);
        } else {
            // Log successful audit
            synapse.emit('grisha', 'audit_log', {
                action: args.action,
                verdict: 'ALLOWED'
            });

            console.log(`🛡️ GRISHA: ALLOWED - ${args.action}`);
        }

        return { 
            allowed: validation.allowed, 
            reason: validation.reason 
        };
    }

    /**
     * Analyze screenshot for visual anomalies
     */
    async analyzeScreenshot(screenshotBase64: string): Promise<VisualAnomalyReport> {
        console.log("🛡️ GRISHA: Analyzing screenshot for visual threats...");
        this.lastVisualAnalysis = await this.vision.analyzeScreenshot(screenshotBase64);
        
        if (this.lastVisualAnalysis.anomaliesDetected) {
            synapse.emit('grisha', 'visual_anomaly', {
                anomalies: this.lastVisualAnalysis.anomalies,
                confidence: this.lastVisualAnalysis.confidence
            });
        }
        
        return this.lastVisualAnalysis;
    }

    /**
     * Get security report
     */
    async getSecurityReport(): Promise<{
        auditLogSize: number;
        blockedOperations: number;
        threatLevel: string;
        topThreats: { threat: string; count: number }[];
        visualAnomalies?: number;
    }> {
        const blockedOps = this.auditLog.filter(e => !e.allowed).length;
        const topThreats = Array.from(this.threatHistory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([threat, count]) => ({ threat, count }));

        return {
            auditLogSize: this.auditLog.length,
            blockedOperations: blockedOps,
            threatLevel: blockedOps > 5 ? 'high' : blockedOps > 2 ? 'medium' : 'low',
            topThreats,
            visualAnomalies: this.lastVisualAnalysis?.anomalies.length || 0
        };
    }

    /**
     * Clear old audit logs (keep only last N entries)
     */
    pruneAuditLog(keepLast: number = 100): void {
        if (this.auditLog.length > keepLast) {
            this.auditLog = this.auditLog.slice(-keepLast);
            console.log(`🛡️ GRISHA: Pruned audit log to ${keepLast} entries`);
        }
    }
}
