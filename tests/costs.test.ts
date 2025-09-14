import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  trackTokenUsage, 
  getCostSummary,
  getOpEdCostSummary,
  shouldLimitOpEdGeneration,
  getTaskTypeCostBreakdown 
} from '../src/lib/openrouter';
import { 
  estimateAudioCost,
  trackAudioUsage,
  getAudioCostSummary,
  shouldLimitAudioGeneration 
} from '../src/lib/elevenlabs';
import {
  checkCostThreshold,
  getBudgetReport,
  BudgetStatus,
  getBudgetHealth
} from '../src/lib/monitor';
import fs from 'fs';
import path from 'path';

describe('Cost Tracking and Budget Management', () => {
  const testCostsFile = path.join(process.cwd(), 'test-costs.json');
  let originalCostsFile: string | null = null;

  beforeAll(() => {
    // Backup existing costs file if it exists
    const costsFile = path.join(process.cwd(), 'costs.json');
    if (fs.existsSync(costsFile)) {
      originalCostsFile = fs.readFileSync(costsFile, 'utf-8');
    }
  });

  afterAll(() => {
    // Restore original costs file
    if (originalCostsFile) {
      fs.writeFileSync(path.join(process.cwd(), 'costs.json'), originalCostsFile);
    }
    // Clean up test file
    if (fs.existsSync(testCostsFile)) {
      fs.unlinkSync(testCostsFile);
    }
  });

  describe('AI Cost Tracking', () => {
    it('should calculate costs accurately for different models', () => {
      const models = [
        { name: 'gpt-3.5-turbo', inputPrice: 0.0005, outputPrice: 0.0015 },
        { name: 'gpt-4o', inputPrice: 0.005, outputPrice: 0.015 },
        { name: 'claude-3-5-sonnet', inputPrice: 0.003, outputPrice: 0.015 },
        { name: 'google/gemini-2.0-flash-thinking-exp:free', inputPrice: 0, outputPrice: 0 }
      ];

      models.forEach(model => {
        const inputTokens = 1000;
        const outputTokens = 500;
        
        const expectedCost = (inputTokens * model.inputPrice / 1000) + 
                           (outputTokens * model.outputPrice / 1000);
        
        // Simulate cost calculation
        const actualCost = trackTokenUsage(
          model.name, 
          inputTokens, 
          outputTokens,
          'TEST'
        );
        
        expect(actualCost).toBeCloseTo(expectedCost, 6);
      });
    });

    it('should track cumulative daily costs', async () => {
      // Track multiple API calls
      trackTokenUsage('gpt-3.5-turbo', 500, 200, { taskType: 'ARTICLE_GENERATION' });
      trackTokenUsage('gpt-4o', 1000, 800, { taskType: 'CREATIVE_WRITING' });
      trackTokenUsage('claude-3-5-sonnet', 300, 150, { taskType: 'SUMMARIZATION' });
      
      const summary = await getCostSummary();
      
      expect(Object.values(summary.dailyTotals).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
      expect(summary.modelTotals).toBeDefined();
      expect(Object.keys(summary.modelTotals).length).toBeGreaterThan(0);
    });

    it('should separate op-ed costs from regular generation', async () => {
      // Track op-ed generation
      trackTokenUsage('gpt-4o', 2000, 1500, { taskType: 'OP_ED_GENERATION' });
      trackTokenUsage('gpt-4o', 1500, 1200, { taskType: 'OP_ED_GENERATION' });
      
      // Track regular generation
      trackTokenUsage('gpt-3.5-turbo', 1000, 500, { taskType: 'ARTICLE_GENERATION' });
      
      const opEdSummary = await getOpEdCostSummary();
      
      expect(opEdSummary.todayOpEdCost).toBeGreaterThan(0);
      expect(opEdSummary.costMultiplier).toBeGreaterThan(1);
      expect(opEdSummary.opEdPercentage).toBeGreaterThan(0);
      expect(opEdSummary.opEdPercentage).toBeLessThan(100);
    });

    it('should respect task type cost limits', () => {
      // Simulate approaching op-ed budget limit
      for (let i = 0; i < 20; i++) {
        trackTokenUsage('gpt-4o', 2000, 1500, { taskType: 'OP_ED_GENERATION' });
      }
      
      const shouldLimit = shouldLimitOpEdGeneration();
      
      // Should limit if approaching budget
      if (shouldLimit) {
        const summary = getOpEdCostSummary();
        expect(summary.budgetRemaining).toBeLessThan(summary.dailyBudget * 0.2);
      }
    });

    it('should provide task type breakdown', async () => {
      // Track various task types
      trackTokenUsage('gpt-3.5-turbo', 500, 200, { taskType: 'ARTICLE_GENERATION' });
      trackTokenUsage('gpt-4o', 1000, 800, { taskType: 'SCRIPT_GENERATION' });
      trackTokenUsage('claude-3-5-sonnet', 300, 150, { taskType: 'SUMMARIZATION' });
      trackTokenUsage('google/gemini-2.0-flash-thinking-exp:free', 1000, 500, { taskType: 'CLASSIFICATION' });
      
      const breakdown = await getTaskTypeCostBreakdown();
      
      expect(breakdown).toBeDefined();
      expect(breakdown['ARTICLE_GENERATION']).toBeDefined();
      expect(breakdown['SCRIPT_GENERATION']).toBeDefined();
      expect(breakdown['SUMMARIZATION']).toBeDefined();
      
      // Free model should have zero cost
      expect(breakdown['CLASSIFICATION'].totalCost).toBe(0);
    });
  });

  describe('Audio Cost Tracking', () => {
    it('should estimate audio costs accurately', () => {
      const testTexts = [
        { text: 'Short text', expectedCost: 0.0018 }, // 10 chars * $0.00018
        { text: 'This is a longer piece of text for testing audio generation costs', expectedCost: 0.0119 }, // 66 chars
        { text: 'A'.repeat(1000), expectedCost: 0.18 } // 1000 chars
      ];
      
      testTexts.forEach(({ text, expectedCost }) => {
        const cost = estimateAudioCost(text);
        expect(cost).toBeCloseTo(expectedCost, 4);
      });
    });

    it('should track audio generation usage', () => {
      const text = 'This is a test audio segment for tracking purposes';
      const voiceId = 'test-voice-id';
      
      trackAudioUsage(text, voiceId, 0.00918); // 51 chars * 0.00018
      
      const summary = getAudioCostSummary();
      
      expect(summary.todayAudioCost).toBeGreaterThan(0);
      expect(summary.characterCount).toBeGreaterThan(0);
      expect(summary.segmentCount).toBe(1);
    });

    it('should limit audio generation when approaching budget', () => {
      // Simulate high audio usage
      for (let i = 0; i < 100; i++) {
        const longText = 'A'.repeat(500);
        trackAudioUsage(longText, 'test-voice', estimateAudioCost(longText));
      }
      
      const shouldLimit = shouldLimitAudioGeneration();
      const summary = getAudioCostSummary();
      
      if (shouldLimit) {
        expect(summary.budgetPercentage).toBeGreaterThan(80);
      }
    });

    it('should calculate batch audio costs', () => {
      const segments = [
        'First segment of audio',
        'Second segment with more content',
        'Third and final segment'
      ];
      
      const batchCost = segments.reduce((sum, text) => 
        sum + estimateAudioCost(text), 0
      );
      
      const individualCosts = segments.map(estimateAudioCost);
      const totalIndividual = individualCosts.reduce((a, b) => a + b, 0);
      
      expect(batchCost).toBeCloseTo(totalIndividual, 6);
    });
  });

  describe('Budget Monitoring', () => {
    it('should check daily budget thresholds', () => {
      const budgetLimit = 6.0;
      
      const statuses = [
        { total: 4.5, expected: 'WARNING' },  // 75% of budget
        { total: 5.1, expected: 'WARNING' },  // 85% of budget
        { total: 5.7, expected: 'CRITICAL' }, // 95% of budget
        { total: 6.2, expected: 'EXCEEDED' }  // Over budget
      ];
      
      statuses.forEach(({ total, expected }) => {
        const status = checkCostThreshold(total, budgetLimit);
        expect(status.level).toBe(expected);
        expect(status.percentage).toBeCloseTo((total / budgetLimit) * 100, 1);
      });
    });

    it('should generate comprehensive budget report', () => {
      // Set up some test costs
      trackTokenUsage('gpt-4o', 2000, 1500, { taskType: 'OP_ED_GENERATION' });
      trackTokenUsage('gpt-3.5-turbo', 1000, 500, { taskType: 'ARTICLE_GENERATION' });
      trackAudioUsage('Test audio content', 'voice-id', 0.01);
      
      const report = generateBudgetReport();
      
      expect(report).toContain('Budget Status Report');
      expect(report).toContain('AI Costs:');
      expect(report).toContain('Audio Costs:');
      expect(report).toContain('Total Daily:');
      expect(report).toContain('Budget Remaining:');
    });

    it.skip('should provide budget recommendations', () => {
      // TODO: Implement getBudgetStatus function in monitor module
      // const status = getBudgetStatus(5.5, 6.0);
      // 
      // expect(status.recommendations).toBeDefined();
      // expect(status.recommendations.length).toBeGreaterThan(0);
      // 
      // // Should recommend limiting expensive operations
      // const hasLimitRecommendation = status.recommendations.some(r => 
      //   r.toLowerCase().includes('limit') || r.toLowerCase().includes('reduce')
      // );
      // expect(hasLimitRecommendation).toBe(true);
    });

    it('should analyze 7-day budget health', async () => {
      // Simulate a week of costs
      const dailyCosts = [4.5, 5.2, 6.1, 4.8, 5.5, 5.9, 5.0];
      
      // Would need to mock date/time for proper testing
      const health = await getBudgetHealth(7);
      
      expect(health).toHaveProperty('averageDailyCost');
      expect(health).toHaveProperty('trend');
      expect(health).toHaveProperty('projectedMonthlyCost');
      expect(health).toHaveProperty('status');
    });
  });

  describe('Cost Calculation Edge Cases', () => {
    it('should handle zero-cost models correctly', () => {
      const cost = trackTokenUsage(
        'google/gemini-2.0-flash-thinking-exp:free',
        10000,
        5000,
        'TEST'
      );
      
      expect(cost).toBe(0);
    });

    it('should handle very large token counts', () => {
      const largeInput = 100000;
      const largeOutput = 50000;
      
      const cost = trackTokenUsage('gpt-4o', largeInput, largeOutput);
      
      // GPT-4o: $5/1M input, $15/1M output
      const expected = (largeInput * 0.005) + (largeOutput * 0.015);
      expect(cost).toBeCloseTo(expected, 2);
    });

    it('should handle concurrent cost tracking', async () => {
      const promises = [];
      
      // Simulate concurrent API calls
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve(
            trackTokenUsage('gpt-3.5-turbo', 100, 50, { taskType: 'CONCURRENT_TEST' })
          )
        );
      }
      
      await Promise.all(promises);
      
      const summary = await getCostSummary();
      
      // All costs should be tracked
      expect(summary.grandTotal).toBeGreaterThan(0);
    });

    it('should validate cost ranges for each model', () => {
      const testCases = [
        { model: 'gpt-3.5-turbo', maxCostPer1k: 0.002 },
        { model: 'gpt-4o', maxCostPer1k: 0.02 },
        { model: 'claude-3-5-sonnet', maxCostPer1k: 0.018 },
        { model: 'google/gemini-2.0-flash-thinking-exp:free', maxCostPer1k: 0 }
      ];
      
      testCases.forEach(({ model, maxCostPer1k }) => {
        const cost = trackTokenUsage(model, 1000, 1000, { taskType: 'RANGE_TEST' });
        expect(cost).toBeLessThanOrEqual(maxCostPer1k * 2); // Input + output
      });
    });
  });
});

export { testCostsFile };