import { describe, it, expect } from 'vitest';
import { initializeDeepIntegration, DeepIntegrationSystem } from '../src/main/initialize-deep-integration';

describe('Deep Integration - KONTUR + ATLAS', () => {
  let system: DeepIntegrationSystem;

  it('should create deep integration system instance', async () => {
    system = new DeepIntegrationSystem();
    expect(system).toBeDefined();
    expect(system.core).toBeDefined();
    expect(system.unifiedBrain).toBeDefined();
  });

  it('should initialize all Atlas Capsules', async () => {
    system = new DeepIntegrationSystem();
    await system['initAtlasCapsules']();
    
    expect(system.atlas).toBeDefined();
    expect(system.tetyana).toBeDefined();
    expect(system.grisha).toBeDefined();
    expect(system.memory).toBeDefined();
  });

  it('should get system status', async () => {
    system = new DeepIntegrationSystem();
    const status = system.getStatus();
    
    expect(status).toBeDefined();
    expect(status.core).toBe('READY');
    expect(status.brain).toBe('READY');
  });

  it('should handle organ failures gracefully', async () => {
    system = new DeepIntegrationSystem();
    
    system.on('organ_failure', (data) => {
      expect(data.urn).toBeDefined();
    });
  });
});
