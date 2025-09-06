import { describe, it, expect, beforeAll } from '@jest/globals';
import { 
  generateArticle, 
  validateArticle,
  generateArticlesBatch 
} from '../src/generators/article';
import { 
  generateOpEd, 
  validateOpEd,
  selectOpEdTopics 
} from '../src/generators/oped';
import { 
  generateDailyBrief,
  extractKeyPoints,
  generateExecutiveSummary 
} from '../src/generators/brief';
import { loadEditorialDNA } from '../src/lib/editorial';
import { loadHostsConfiguration } from '../src/lib/hosts';

describe('Content Generation Pipeline', () => {
  let editorialDNA: any;
  let hosts: any;
  let sampleStory: any;

  beforeAll(async () => {
    editorialDNA = await loadEditorialDNA();
    hosts = await loadHostsConfiguration();
    
    // Sample story for testing
    sampleStory = {
      title: 'Test: Major Breakthrough in Renewable Energy',
      content: 'Scientists have discovered a new method for storing solar energy...',
      source: 'Reuters',
      link: 'https://example.com/article',
      pubDate: new Date().toISOString(),
      metadata: {
        topics: ['technology', 'environment'],
        importance: 8
      }
    };
  });

  describe('Article Generation', () => {
    it('should generate article with editorial DNA', async () => {
      const article = await generateArticle(sampleStory, editorialDNA);
      
      expect(article.success).toBe(true);
      expect(article.title).toBeTruthy();
      expect(article.content).toBeTruthy();
      expect(article.content.length).toBeGreaterThan(400);
      expect(article.content.length).toBeLessThan(1000);
      expect(article.model).toBeDefined();
      expect(article.cost).toBeGreaterThan(0);
    }, 30000);

    it('should validate generated articles', async () => {
      const article = await generateArticle(sampleStory, editorialDNA);
      
      if (article.success) {
        const validation = validateArticle(article.content);
        
        expect(validation.isValid).toBe(true);
        expect(validation.score).toBeGreaterThan(6);
        expect(validation.checks.lengthCheck).toBe(true);
        expect(validation.checks.noPlaceholders).toBe(true);
        expect(validation.checks.structureCheck).toBe(true);
      }
    }, 30000);

    it('should handle batch article generation', async () => {
      const stories = [sampleStory, { ...sampleStory, title: 'Another Story' }];
      const results = await generateArticlesBatch(stories, editorialDNA, {
        maxConcurrent: 2
      });
      
      expect(results.length).toBe(2);
      expect(results.filter(r => r.success).length).toBeGreaterThan(0);
      
      // Check cost accumulation
      const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
      expect(totalCost).toBeGreaterThan(0);
    }, 45000);

    it('should apply editorial angle correctly', async () => {
      const article = await generateArticle(sampleStory, editorialDNA);
      
      if (article.success && article.editorialAngle) {
        expect(article.editorialAngle).toHaveProperty('primary');
        expect(article.editorialAngle).toHaveProperty('perspectives');
        expect(article.editorialPerspectives).toBeDefined();
      }
    }, 30000);
  });

  describe('Op-Ed Generation', () => {
    it('should generate op-ed with host personality', async () => {
      const opEd = await generateOpEd([sampleStory], hosts.hosts[0], editorialDNA);
      
      expect(opEd.success).toBe(true);
      expect(opEd.title).toBeTruthy();
      expect(opEd.content).toBeTruthy();
      expect(opEd.content.length).toBeGreaterThan(800);
      expect(opEd.thesis).toBeTruthy();
      expect(opEd.hostPersonality).toBe(hosts.hosts[0].name);
    }, 30000);

    it('should validate op-ed structure', async () => {
      const opEd = await generateOpEd([sampleStory], hosts.hosts[0], editorialDNA);
      
      if (opEd.success) {
        const validation = validateOpEd(opEd.content);
        
        expect(validation.isValid).toBe(true);
        expect(validation.checks.hasThesis).toBe(true);
        expect(validation.checks.hasArguments).toBe(true);
        expect(validation.checks.hasCallToAction).toBe(true);
      }
    }, 30000);

    it('should select appropriate op-ed topics', () => {
      const stories = [
        { ...sampleStory, metadata: { ...sampleStory.metadata, controversy: 8 } },
        { ...sampleStory, title: 'Routine Weather Update', metadata: { importance: 2 } },
        { ...sampleStory, title: 'Tech Policy Debate', metadata: { controversy: 7 } }
      ];
      
      const selected = selectOpEdTopics(stories, 2);
      
      expect(selected.length).toBeLessThanOrEqual(2);
      expect(selected[0].opinionScore).toBeGreaterThan(6);
      
      // Should prioritize controversial/important topics
      expect(selected[0].metadata.controversy || selected[0].metadata.importance)
        .toBeGreaterThan(5);
    });

    it('should maintain host voice consistency', async () => {
      const analyticalHost = hosts.hosts.find((h: any) => 
        h.characteristics.analytical_depth > 8
      );
      
      const opEd = await generateOpEd([sampleStory], analyticalHost, editorialDNA);
      
      if (opEd.success) {
        // Check for analytical language patterns
        const analyticalPatterns = [
          'analysis', 'evidence', 'data', 'research', 
          'implications', 'correlation', 'methodology'
        ];
        
        const hasAnalyticalLanguage = analyticalPatterns.some(pattern => 
          opEd.content.toLowerCase().includes(pattern)
        );
        
        expect(hasAnalyticalLanguage).toBe(true);
      }
    }, 30000);
  });

  describe('Daily Brief Generation', () => {
    it('should generate comprehensive daily brief', async () => {
      const stories = [
        sampleStory,
        { ...sampleStory, title: 'Second Story' },
        { ...sampleStory, title: 'Third Story' }
      ];
      
      const brief = await generateDailyBrief({
        articles: stories,
        opEds: [],
        date: new Date().toISOString()
      });
      
      expect(brief.success).toBe(true);
      expect(brief.executiveSummary).toBeTruthy();
      expect(brief.executiveSummary.length).toBeLessThan(300);
      expect(brief.keyPoints).toBeDefined();
      expect(brief.keyPoints.length).toBeGreaterThan(0);
      expect(brief.totalWords).toBeLessThan(600);
    }, 30000);

    it('should extract key points from content', () => {
      const content = {
        articles: [sampleStory, { ...sampleStory, title: 'Another Story' }],
        opEds: []
      };
      
      const keyPoints = extractKeyPoints(content);
      
      expect(keyPoints.length).toBeGreaterThan(0);
      expect(keyPoints.length).toBeLessThanOrEqual(10); // 3-5 per story
      
      keyPoints.forEach(point => {
        expect(point).toBeTruthy();
        expect(point.length).toBeGreaterThan(10);
        expect(point.length).toBeLessThan(200);
      });
    });

    it('should generate concise executive summary', () => {
      const stories = [
        sampleStory,
        { ...sampleStory, title: 'Climate Policy Update' },
        { ...sampleStory, title: 'Tech Innovation News' }
      ];
      
      const summary = generateExecutiveSummary(stories, 200);
      
      expect(summary).toBeTruthy();
      expect(summary.split(' ').length).toBeLessThanOrEqual(200);
      expect(summary.split(' ').length).toBeGreaterThan(50);
    });

    it('should format brief with proper structure', async () => {
      const brief = await generateDailyBrief({
        articles: [sampleStory],
        opEds: [],
        date: new Date().toISOString()
      });
      
      if (brief.success) {
        expect(brief.formatted).toBeTruthy();
        expect(brief.formatted).toContain('Executive Summary');
        expect(brief.formatted).toContain('Key Points');
        expect(brief.sections).toBeDefined();
      }
    }, 30000);
  });

  describe('Cost Efficiency', () => {
    it('should use appropriate models for each task', async () => {
      // Article should use cheaper model (Gemini)
      const article = await generateArticle(sampleStory, editorialDNA);
      expect(article.model).toContain('gemini');
      expect(article.cost).toBeLessThan(0.01);
      
      // Op-Ed should use more expensive model (GPT-4)
      const opEd = await generateOpEd([sampleStory], hosts.hosts[0], editorialDNA);
      expect(opEd.model).toContain('gpt-4');
      expect(opEd.cost).toBeLessThan(0.10);
    }, 60000);

    it('should track cumulative generation costs', async () => {
      const initialCosts = await import('../costs.json').catch(() => ({ grandTotal: 0 }));
      
      // Generate some content
      await generateArticle(sampleStory, editorialDNA);
      await generateDailyBrief({ articles: [sampleStory], opEds: [], date: new Date().toISOString() });
      
      const finalCosts = await import('../costs.json').catch(() => ({ grandTotal: 0 }));
      
      // Costs should increase
      expect(finalCosts.grandTotal).toBeGreaterThanOrEqual(initialCosts.grandTotal);
    }, 45000);
  });
});

export { sampleStory };