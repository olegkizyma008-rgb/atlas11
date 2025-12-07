/**
 * GRISHA Visual Oversight
 * Uses Gemini Vision to analyze screenshots for anomalies
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface VisualAnomalyReport {
  anomaliesDetected: boolean;
  confidence: number;
  anomalies: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    location?: string;
  }[];
  recommendations: string[];
  timestamp: number;
}

export class GrishaVision {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string = '') {
    this.genAI = new GoogleGenerativeAI(apiKey || 'mock-key');
  }

  /**
   * Analyze screenshot for visual anomalies
   * Returns report of detected anomalies
   */
  async analyzeScreenshot(screenshotBase64: string): Promise<VisualAnomalyReport> {
    console.log('👁️ GRISHA: Analyzing screenshot for anomalies...');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/png',
            data: screenshotBase64,
          },
        },
        {
          text: `You are GRISHA, a visual security analyst. Analyze this screenshot for security anomalies.
          
          Look for:
          1. Suspicious UI elements (dialogs, popups asking for credentials)
          2. Resource exhaustion indicators (high CPU/memory usage)
          3. Unusual processes or windows
          4. Network activity indicators
          5. Permission requests
          
          Return JSON: {
            "anomalies": [
              { "type": "string", "severity": "low|medium|high", "description": "string", "location": "string" }
            ],
            "confidence": 0.0-1.0,
            "recommendations": ["string"]
          }`,
        },
      ]);

      const response = await result.response;
      const text = response.text();

      let report: VisualAnomalyReport = {
        anomaliesDetected: false,
        confidence: 0,
        anomalies: [],
        recommendations: [],
        timestamp: Date.now(),
      };

      try {
        const parsed = JSON.parse(text);
        report.anomalies = parsed.anomalies || [];
        report.confidence = parsed.confidence || 0;
        report.recommendations = parsed.recommendations || [];
        report.anomaliesDetected = report.anomalies.length > 0;
      } catch (e) {
        console.warn('👁️ GRISHA: Failed to parse vision response', e);
        report.anomaliesDetected = true;
        report.anomalies.push({
          type: 'parse_error',
          severity: 'medium',
          description: `Vision analysis returned unparseable response: ${text.substring(0, 100)}`,
        });
      }

      if (report.anomaliesDetected) {
        console.warn(
          `👁️ GRISHA: ${report.anomalies.length} anomalies detected with ${Math.round(report.confidence * 100)}% confidence`
        );
      } else {
        console.log('👁️ GRISHA: No anomalies detected');
      }

      return report;
    } catch (error) {
      console.error('👁️ GRISHA: Vision analysis failed', error);

      return {
        anomaliesDetected: true,
        confidence: 0.8,
        anomalies: [
          {
            type: 'vision_service_error',
            severity: 'high',
            description: `Vision service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        recommendations: ['Check API key', 'Verify image format', 'Retry analysis'],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Detect UI anomalies (simulated for now)
   * In production, would call analyzeScreenshot
   */
  async detectUIAnomalies(
    uiElements: Array<{ type: string; x: number; y: number; width: number; height: number }>
  ): Promise<VisualAnomalyReport> {
    console.log('👁️ GRISHA: Analyzing UI elements for anomalies...');

    const anomalies: VisualAnomalyReport['anomalies'] = [];
    let confidence = 0.5;

    // Check for suspicious dialog patterns
    for (const el of uiElements) {
      if (el.type === 'dialog' && el.width > 800 && el.height > 600) {
        anomalies.push({
          type: 'large_dialog',
          severity: 'medium',
          description: 'Large dialog window detected - potential phishing',
          location: `(${el.x}, ${el.y})`,
        });
        confidence += 0.2;
      }

      if (el.type === 'input' && el.width > 500) {
        anomalies.push({
          type: 'credential_field',
          severity: 'high',
          description: 'Large input field detected - potential credential harvesting',
          location: `(${el.x}, ${el.y})`,
        });
        confidence += 0.3;
      }

      if (el.type === 'button' && el.width > 200) {
        anomalies.push({
          type: 'oversized_button',
          severity: 'low',
          description: 'Oversized button - potential clickjacking',
          location: `(${el.x}, ${el.y})`,
        });
        confidence += 0.1;
      }
    }

    confidence = Math.min(confidence, 1.0);

    return {
      anomaliesDetected: anomalies.length > 0,
      confidence,
      anomalies,
      recommendations: [
        anomalies.length > 0 ? 'Review UI elements for security' : 'UI elements appear normal',
        'Monitor for further suspicious activity',
      ],
      timestamp: Date.now(),
    };
  }

  /**
   * Detect resource exhaustion visually
   */
  async detectResourceAnomalies(
    metrics: { cpuUsage: number; memoryUsage: number; diskUsage: number }
  ): Promise<VisualAnomalyReport> {
    console.log('👁️ GRISHA: Analyzing resource usage for anomalies...');

    const anomalies: VisualAnomalyReport['anomalies'] = [];
    let confidence = 0;

    if (metrics.cpuUsage > 90) {
      anomalies.push({
        type: 'high_cpu',
        severity: 'high',
        description: `CPU usage extremely high: ${metrics.cpuUsage}% - possible DoS or crypto mining`,
      });
      confidence += 0.4;
    } else if (metrics.cpuUsage > 70) {
      anomalies.push({
        type: 'elevated_cpu',
        severity: 'medium',
        description: `CPU usage elevated: ${metrics.cpuUsage}% - monitor for runaway processes`,
      });
      confidence += 0.2;
    }

    if (metrics.memoryUsage > 90) {
      anomalies.push({
        type: 'high_memory',
        severity: 'high',
        description: `Memory usage extremely high: ${metrics.memoryUsage}% - possible memory bomb`,
      });
      confidence += 0.4;
    } else if (metrics.memoryUsage > 75) {
      anomalies.push({
        type: 'elevated_memory',
        severity: 'medium',
        description: `Memory usage elevated: ${metrics.memoryUsage}% - memory leak suspected`,
      });
      confidence += 0.2;
    }

    if (metrics.diskUsage > 95) {
      anomalies.push({
        type: 'disk_full',
        severity: 'high',
        description: `Disk nearly full: ${metrics.diskUsage}% - data exfiltration risk`,
      });
      confidence += 0.3;
    }

    confidence = Math.min(confidence, 1.0);

    return {
      anomaliesDetected: anomalies.length > 0,
      confidence,
      anomalies,
      recommendations: [
        anomalies.length > 0 ? 'Take immediate action on resource issues' : 'Resource usage normal',
        'Enable resource monitoring',
        'Set up alerts for resource thresholds',
      ],
      timestamp: Date.now(),
    };
  }
}

export function createGrishaVision(apiKey?: string): GrishaVision {
  return new GrishaVision(apiKey);
}
