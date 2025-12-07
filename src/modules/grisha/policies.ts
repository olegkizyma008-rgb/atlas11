/**
 * GRISHA Security Policies
 * Defines threat patterns and security rules
 */

import { z } from 'zod';

export enum ThreatLevel {
  SAFE = 'low',
  WARNING = 'medium',
  DANGER = 'high',
  CRITICAL = 'critical'
}

export interface ThreatPattern {
  name: string;
  severity: ThreatLevel;
  patterns: RegExp[];
  description: string;
  mitigation?: string;
}

export interface SecurityPolicy {
  name: string;
  description: string;
  threats: ThreatPattern[];
  allowlistedOperations: string[];
}

/**
 * Code Injection Threats
 */
export const CODE_INJECTION_POLICY: ThreatPattern[] = [
  {
    name: 'eval_execution',
    severity: ThreatLevel.CRITICAL,
    patterns: [/eval\s*\(/gi, /Function\s*\(/gi],
    description: 'Direct code evaluation - highest risk',
    mitigation: 'Use safer alternatives like Function constructor with sandboxing'
  },
  {
    name: 'exec_execution',
    severity: ThreatLevel.CRITICAL,
    patterns: [/exec\s*\(/gi, /system\s*\(/gi],
    description: 'System command execution',
    mitigation: 'Restrict to whitelisted commands only'
  },
  {
    name: 'require_dynamic',
    severity: ThreatLevel.DANGER,
    patterns: [/require\s*\(/gi],
    description: 'Dynamic module loading from user input',
    mitigation: 'Validate module names against whitelist'
  },
  {
    name: 'import_dynamic',
    severity: ThreatLevel.DANGER,
    patterns: [/import\s*\(/gi],
    description: 'Dynamic ES6 imports from user input',
    mitigation: 'Validate module names against whitelist'
  }
];

/**
 * File System Threats
 */
export const FILE_SYSTEM_POLICY: ThreatPattern[] = [
  {
    name: 'delete_system_files',
    severity: ThreatLevel.CRITICAL,
    patterns: [
      /rm\s+-rf\s+\//gi,
      /rm\s+-rf\s+\/.*\//gi,
      /unlink\s*\(\s*['"`]\/[^'"`]*['"`]\s*\)/gi,
      /rmSync\s*\(\s*['"`]\/[^'"`]*['"`]\s*\)/gi
    ],
    description: 'Attempting to delete system directories',
    mitigation: 'Block all operations on system paths'
  },
  {
    name: 'delete_application_files',
    severity: ThreatLevel.DANGER,
    patterns: [
      /rm\s+-rf\s+\./gi,
      /unlink\s*\(\s*['"`]\./gi,
      /rmSync\s*\(\s*['"`]\./gi
    ],
    description: 'Attempting to delete application files',
    mitigation: 'Restrict to sandboxed temporary directories'
  },
  {
    name: 'write_privileged_files',
    severity: ThreatLevel.DANGER,
    patterns: [
      /\/etc\//gi,
      /\/root\//gi,
      /\/sys\//gi,
      /\/proc\//gi,
      /writeFileSync\s*\(\s*['"`]\/(etc|root|sys|proc)[^'"`]*['"`]/gi
    ],
    description: 'Attempting to write to system files',
    mitigation: 'Restrict write operations to app directories only'
  }
];

/**
 * Network Threats
 */
export const NETWORK_POLICY: ThreatPattern[] = [
  {
    name: 'external_callback',
    severity: ThreatLevel.DANGER,
    patterns: [
      /fetch\s*\(\s*['"`]https?:\/\/[^'"`]*attacker[^'"`]*['"`]/gi,
      /fetch\s*\(\s*['"`]https?:\/\/[^'"`]*exfil[^'"`]*['"`]/gi,
      /socket\.connect\s*\(\s*['"`][^'"`]*['"`]/gi
    ],
    description: 'Attempting to establish external callbacks',
    mitigation: 'Block outbound connections to non-whitelisted domains'
  },
  {
    name: 'data_exfiltration',
    severity: ThreatLevel.DANGER,
    patterns: [
      /POST.*sensit/gi,
      /POST.*secret/gi,
      /POST.*token/gi,
      /POST.*api.key/gi
    ],
    description: 'Suspicious data exfiltration patterns',
    mitigation: 'Monitor and log all data transmissions'
  }
];

/**
 * Resource Exhaustion Threats
 */
export const RESOURCE_POLICY: ThreatPattern[] = [
  {
    name: 'infinite_loop',
    severity: ThreatLevel.DANGER,
    patterns: [
      /while\s*\(\s*true\s*\)/gi,
      /for\s*\(\s*;\s*;\s*\)/gi,
      /setInterval\s*\([^,]*,\s*0\s*\)/gi
    ],
    description: 'Infinite loops causing DoS',
    mitigation: 'Implement execution timeout limits'
  },
  {
    name: 'memory_bomb',
    severity: ThreatLevel.DANGER,
    patterns: [
      /new\s+Array\s*\(\s*\d{7,}\s*\)/gi,
      /Buffer\.alloc\s*\(\s*\d{8,}\s*\)/gi,
      /new\s+Uint8Array\s*\(\s*\d{8,}\s*\)/gi
    ],
    description: 'Excessive memory allocation',
    mitigation: 'Limit memory allocations per request'
  },
  {
    name: 'cpu_bomb',
    severity: ThreatLevel.DANGER,
    patterns: [
      /crypto\.pbkdf2Sync\s*\([^,]*,\s*[^,]*,\s*\d{6,}/gi,
      /bcrypt\.hashSync.*10[0-9]/gi
    ],
    description: 'Expensive computational operations',
    mitigation: 'Limit computational complexity'
  }
];

/**
 * Privilege Escalation Threats
 */
export const PRIVILEGE_POLICY: ThreatPattern[] = [
  {
    name: 'sudo_execution',
    severity: ThreatLevel.CRITICAL,
    patterns: [/sudo\s+/gi, /execSync\s*\(\s*['"`]sudo/gi],
    description: 'Attempting privilege escalation with sudo',
    mitigation: 'Block all sudo usage'
  },
  {
    name: 'chmod_abuse',
    severity: ThreatLevel.DANGER,
    patterns: [/chmod\s+777/gi, /chmod\s+755\s+\/etc/gi],
    description: 'Attempting to change file permissions',
    mitigation: 'Restrict chmod operations'
  }
];

/**
 * Comprehensive Security Policy
 */
export const ATLAS_SECURITY_POLICY: SecurityPolicy = {
  name: 'Atlas11 Security Policy',
  description: 'Default security policy for autonomous system operations',
  threats: [
    ...CODE_INJECTION_POLICY,
    ...FILE_SYSTEM_POLICY,
    ...NETWORK_POLICY,
    ...RESOURCE_POLICY,
    ...PRIVILEGE_POLICY
  ],
  allowlistedOperations: [
    'read_file',
    'write_temp_file',
    'execute_safe_tool',
    'api_call_whitelisted',
    'memory_store',
    'memory_recall',
    'brain_query',
    'log_event'
  ]
};

/**
 * Analyze content for threats
 */
export function analyzeThreat(content: string, patterns: ThreatPattern[]): {
  threatsFound: { pattern: ThreatPattern; matches: string[] }[];
  maxSeverity: ThreatLevel;
  riskScore: number;
} {
  const threatsFound: { pattern: ThreatPattern; matches: string[] }[] = [];
  let maxSeverity = ThreatLevel.SAFE;
  let riskScore = 0;

  for (const pattern of patterns) {
    const matches: string[] = [];
    for (const regex of pattern.patterns) {
      const regexMatches = content.match(regex);
      if (regexMatches) {
        matches.push(...regexMatches);
      }
    }

    if (matches.length > 0) {
      threatsFound.push({ pattern, matches });

      // Calculate risk score
      const severityScore = {
        [ThreatLevel.SAFE]: 0,
        [ThreatLevel.WARNING]: 10,
        [ThreatLevel.DANGER]: 50,
        [ThreatLevel.CRITICAL]: 100
      };

      riskScore += severityScore[pattern.severity] * matches.length;

      // Update max severity
      const severityOrder = [ThreatLevel.SAFE, ThreatLevel.WARNING, ThreatLevel.DANGER, ThreatLevel.CRITICAL];
      if (severityOrder.indexOf(pattern.severity) > severityOrder.indexOf(maxSeverity)) {
        maxSeverity = pattern.severity;
      }
    }
  }

  return {
    threatsFound,
    maxSeverity,
    riskScore: Math.min(riskScore, 100)
  };
}

/**
 * Validate operation against policy
 */
export function validateOperation(
  operation: string,
  params: Record<string, any>,
  policy: SecurityPolicy = ATLAS_SECURITY_POLICY
): { allowed: boolean; reason?: string; riskLevel?: ThreatLevel } {
  // Check whitelist first
  if (policy.allowlistedOperations.includes(operation)) {
    return { allowed: true };
  }

  // Analyze operation and params for threats
  const operationStr = `${operation}(${JSON.stringify(params)})`;
  const analysis = analyzeThreat(operationStr, policy.threats);

  if (analysis.threatsFound.length === 0) {
    return { allowed: true };
  }

  const threatsDescription = analysis.threatsFound
    .map((t) => `${t.pattern.name} (${t.pattern.severity})`)
    .join(', ');

  return {
    allowed: false,
    reason: `Security threat detected: ${threatsDescription}`,
    riskLevel: analysis.maxSeverity
  };
}
