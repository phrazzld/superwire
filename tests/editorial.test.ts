import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  loadEditorialDNA,
  calculateStoryImportance,
  applyEditorialFilter,
  injectEditorialAngle,
  getEditorialValues,
  getTopicPriorities
} from '../src/lib/editorial';
import {
  loadHostsConfig,
  selectHostForStory,
  generateHostDialogue,
  maintainHostConsistency,
  rotateHosts
} from '../src/lib/hosts';

describe('Editorial DNA and Host System', () => {
  let editorialDNA: any;
  let hostsConfig: any;
  let testStories: any[];

  beforeAll(async () => {
    editorialDNA = await loadEditorialDNA();
    hostsConfig = loadHostsConfig();
    
    // Create test stories with varying characteristics
    testStories = [
      {
        title: 'AI Breakthrough Changes Healthcare',
        content: 'Revolutionary AI system diagnoses rare diseases...',
        metadata: {
          topics: ['technology', 'health'],
          sources: ['MIT', 'Nature'],
          quotes: 3
        }
      },
      {
        title: 'Climate Summit Reaches Historic Agreement',
        content: 'World leaders commit to ambitious carbon reduction...',
        metadata: {
          topics: ['environment', 'politics'],
          sources: ['UN', 'Reuters'],
          quotes: 5
        }
      },
      {
        title: 'Celebrity Scandal Rocks Hollywood',
        content: 'Minor celebrity involved in trivial incident...',
        metadata: {
          topics: ['entertainment'],
          sources: ['TMZ'],
          quotes: 1
        }
      },
      {
        title: 'Economic Inequality Reaches Record Levels',
        content: 'New study reveals widening wealth gap...',
        metadata: {
          topics: ['economy', 'society'],
          sources: ['World Bank', 'Economic Forum'],
          quotes: 4
        }
      },
      {
        title: 'Local Cat Wins Pet Contest',
        content: 'Fluffy takes home first prize...',
        metadata: {
          topics: ['local', 'lifestyle'],
          sources: ['Local News'],
          quotes: 0
        }
      }
    ];
  });

  describe('Editorial DNA Configuration', () => {
    it('should load editorial configuration successfully', () => {
      expect(editorialDNA).toBeDefined();
      expect(editorialDNA.values).toBeDefined();
      expect(editorialDNA.perspectives).toBeDefined();
      expect(editorialDNA.topic_priorities).toBeDefined();
      expect(editorialDNA.importance_weights).toBeDefined();
    });

    it('should have properly weighted values', () => {
      const values = getEditorialValues(editorialDNA);
      
      expect(values).toBeDefined();
      expect(Object.keys(values).length).toBeGreaterThan(0);
      
      // Check priority values are higher
      const topValues = Object.entries(values)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 3);
      
      topValues.forEach(([, priority]) => {
        expect(priority as number).toBeGreaterThanOrEqual(8);
      });
    });

    it('should define topic priorities correctly', () => {
      const priorities = getTopicPriorities(editorialDNA);
      
      expect(priorities).toBeDefined();
      
      // High priority topics should have score >= 8
      const highPriorityTopics = ['technology', 'climate', 'economy'];
      highPriorityTopics.forEach(topic => {
        if (priorities[topic]) {
          expect(priorities[topic]).toBeGreaterThanOrEqual(7);
        }
      });
      
      // Low priority topics should have score < 5
      const lowPriorityTopics = ['celebrity', 'sports', 'lifestyle'];
      lowPriorityTopics.forEach(topic => {
        if (priorities[topic]) {
          expect(priorities[topic]).toBeLessThan(5);
        }
      });
    });
  });

  describe('Story Importance Calculation', () => {
    it('should calculate importance scores correctly', () => {
      const scores = testStories.map(story => ({
        title: story.title,
        score: calculateStoryImportance(story, editorialDNA)
      }));
      
      // AI/Healthcare story should score high
      const aiStory = scores.find(s => s.title.includes('AI Breakthrough'));
      expect(aiStory?.score).toBeGreaterThan(7);
      
      // Celebrity story should score low
      const celebStory = scores.find(s => s.title.includes('Celebrity'));
      expect(celebStory?.score).toBeLessThan(3);
      
      // Climate story should score high
      const climateStory = scores.find(s => s.title.includes('Climate'));
      expect(climateStory?.score).toBeGreaterThan(6);
    });

    it('should apply importance weights correctly', () => {
      const story = {
        title: 'Test Story',
        content: 'Content about future implications and systemic change...',
        metadata: {
          topics: ['technology'],
          futureImpact: 9,
          systemic: 8,
          actionability: 7
        }
      };
      
      const score = calculateStoryImportance(story, editorialDNA);
      
      // Should weight future impact and systemic factors heavily
      expect(score).toBeGreaterThan(7);
    });

    it('should penalize clickbait and trivial content', () => {
      const clickbaitStory = {
        title: 'You Won\'t BELIEVE What This Celebrity Did!!!',
        content: 'Shocking revelations...',
        metadata: {
          topics: ['entertainment'],
          clickbait: true
        }
      };
      
      const score = calculateStoryImportance(clickbaitStory, editorialDNA);
      
      // Should have significant penalty
      expect(score).toBeLessThan(2);
    });
  });

  describe('Editorial Filtering', () => {
    it('should filter stories by importance threshold', () => {
      const filtered = applyEditorialFilter(testStories, editorialDNA);
      
      // Should remove low-importance stories
      expect(filtered.length).toBeLessThan(testStories.length);
      
      // Should not include cat contest story
      const hasCatStory = filtered.some(s => s.title.includes('Cat'));
      expect(hasCatStory).toBe(false);
      
      // Should include AI and Climate stories
      const hasAIStory = filtered.some(s => s.title.includes('AI'));
      const hasClimateStory = filtered.some(s => s.title.includes('Climate'));
      expect(hasAIStory).toBe(true);
      expect(hasClimateStory).toBe(true);
    });

    it('should rank stories by importance', () => {
      const filtered = applyEditorialFilter(testStories, editorialDNA);
      
      // Check stories are sorted by importance score
      for (let i = 1; i < filtered.length; i++) {
        expect(filtered[i - 1].editorialScore).toBeGreaterThanOrEqual(
          filtered[i].editorialScore
        );
      }
    });

    it('should respect maximum daily stories limit', () => {
      const manyStories = Array(50).fill(null).map((_, i) => ({
        title: `Story ${i}`,
        content: `Important content ${i}`,
        metadata: { topics: ['technology'], importance: 7 + Math.random() * 3 }
      }));
      
      const filtered = applyEditorialFilter(manyStories, editorialDNA);
      
      // Should not exceed maximum (typically 30-40)
      expect(filtered.length).toBeLessThanOrEqual(40);
    });
  });

  describe('Editorial Angle Injection', () => {
    it('should add appropriate editorial angles', () => {
      const techStory = testStories[0]; // AI story
      const enhanced = injectEditorialAngle(techStory, editorialDNA);
      
      expect(enhanced.editorialAngle).toBeDefined();
      expect(enhanced.editorialAngle.primary).toBeTruthy();
      expect(enhanced.editorialPerspectives).toBeDefined();
      expect(enhanced.editorialPerspectives.length).toBeGreaterThan(0);
    });

    it('should match angles to story types', () => {
      const economyStory = testStories[3]; // Economic inequality
      const enhanced = injectEditorialAngle(economyStory, editorialDNA);
      
      // Should have economic/social angle
      expect(enhanced.editorialAngle.primary).toMatch(/economic|social|equality/i);
    });

    it('should include perspectives to seek', () => {
      const climateStory = testStories[1];
      const enhanced = injectEditorialAngle(climateStory, editorialDNA);
      
      // Should include relevant perspectives
      const perspectives = enhanced.editorialPerspectives || [];
      const hasRelevantPerspective = perspectives.some((p: string) => 
        p.includes('scientist') || 
        p.includes('expert') || 
        p.includes('affected')
      );
      
      expect(hasRelevantPerspective).toBe(true);
    });
  });

  describe('Host Selection and Personality', () => {
    it('should load host configurations', () => {
      expect(hostsConfig).toBeDefined();
      expect(hostsConfig.hosts).toBeDefined();
      expect(hostsConfig.hosts.length).toBeGreaterThanOrEqual(3);
      
      // Check each host has required properties
      hostsConfig.hosts.forEach((host: any) => {
        expect(host.name).toBeDefined();
        expect(host.characteristics).toBeDefined();
        expect(host.speechPatterns).toBeDefined();
        expect(host.topicInterests).toBeDefined();
      });
    });

    it('should select appropriate host for story type', () => {
      const techStory = testStories[0];
      const selectedHost = selectHostForStory(techStory, hostsConfig.hosts);
      
      expect(selectedHost).toBeDefined();
      
      // Tech story should go to analytical host or tech-interested host
      const hostInterests = selectedHost.topicInterests;
      const hasTechInterest = hostInterests.technology > 5 || 
                              selectedHost.characteristics.analytical_depth > 7;
      
      expect(hasTechInterest).toBe(true);
    });

    it('should generate host dialogue', async () => {
      const story = testStories[0];
      const host1 = hostsConfig.hosts[0];
      const host2 = hostsConfig.hosts[1];
      
      const dialogue = await generateHostDialogue(story, host1, host2);
      
      expect(dialogue).toBeDefined();
      expect(dialogue.dialogue).toBeTruthy();
      expect(dialogue.dialogue.length).toBeGreaterThan(100);
      expect(dialogue.wordCount).toBeGreaterThan(150);
      expect(dialogue.wordCount).toBeLessThan(400);
    }, 30000);

    it('should maintain host voice consistency', () => {
      const analyticalHost = hostsConfig.hosts.find((h: any) => 
        h.characteristics.analytical_depth > 8
      );
      
      const analyticalText = `
        The data clearly indicates a correlation between these factors.
        Our analysis reveals significant implications for future policy.
        The methodology employed in this study is particularly robust.
      `;
      
      const consistency = maintainHostConsistency(analyticalText, analyticalHost);
      
      expect(consistency.isConsistent).toBe(true);
      expect(consistency.score).toBeGreaterThan(6);
      expect(consistency.analysis.analyticalDepth.score).toBeGreaterThan(7);
    });

    it('should detect inconsistent host voice', () => {
      const analyticalHost = hostsConfig.hosts.find((h: any) => 
        h.characteristics.analytical_depth > 8
      );
      
      const casualText = `
        OMG this is like totally amazing! 
        I can't even believe how cool this is!!!
        This is gonna be huge, trust me!
      `;
      
      const consistency = maintainHostConsistency(casualText, analyticalHost);
      
      expect(consistency.isConsistent).toBe(false);
      expect(consistency.score).toBeLessThan(6);
      expect(consistency.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Host Rotation', () => {
    it('should balance host participation', () => {
      const assignments = rotateHosts(testStories, hostsConfig.hosts);
      
      expect(assignments.length).toBe(testStories.length);
      
      // Count host appearances
      const hostCounts: Record<string, number> = {};
      assignments.forEach(assignment => {
        assignment.hosts.forEach(host => {
          hostCounts[host.name] = (hostCounts[host.name] || 0) + 1;
        });
      });
      
      // Check balance (no host should dominate)
      const counts = Object.values(hostCounts);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      
      // Difference should be reasonable
      expect(maxCount - minCount).toBeLessThanOrEqual(3);
    });

    it('should respect host pairing preferences', () => {
      const assignments = rotateHosts(testStories.slice(0, 3), hostsConfig.hosts);
      
      // Check for good pairings
      assignments.forEach(assignment => {
        if (assignment.hosts.length === 2) {
          const [host1, host2] = assignment.hosts;
          
          // Analytical and empathetic hosts should pair well
          const goodPairing = 
            (host1.characteristics.analytical_depth > 7 && 
             host2.characteristics.empathy_level > 7) ||
            (host2.characteristics.analytical_depth > 7 && 
             host1.characteristics.empathy_level > 7);
          
          // Most pairings should be complementary
          expect(assignment.hosts.length).toBeGreaterThanOrEqual(1);
        }
      });
    });

    it('should provide rotation statistics', () => {
      const result = rotateHosts(testStories, hostsConfig.hosts);
      
      // Calculate stats
      const stats = result.reduce((acc: any, assignment) => {
        assignment.hosts.forEach(host => {
          acc[host.name] = (acc[host.name] || 0) + 1;
        });
        return acc;
      }, {});
      
      // Each host should participate
      hostsConfig.hosts.forEach((host: any) => {
        expect(stats[host.name]).toBeGreaterThan(0);
      });
    });
  });

  describe('Special Editorial Rules', () => {
    it('should always cover certain topics', () => {
      const mustCoverStory = {
        title: 'Major Climate Disaster Affects Millions',
        content: 'Unprecedented flooding...',
        metadata: {
          topics: ['climate', 'disaster'],
          importance: 5 // Even with lower score
        }
      };
      
      const stories = [...testStories, mustCoverStory];
      const filtered = applyEditorialFilter(stories, editorialDNA);
      
      // Should include climate disaster regardless of score
      const hasDisasterStory = filtered.some(s => 
        s.title.includes('Climate Disaster')
      );
      expect(hasDisasterStory).toBe(true);
    });

    it('should never cover certain topics', () => {
      const bannedStory = {
        title: 'Tabloid Gossip About Reality TV Star',
        content: 'Scandalous rumors...',
        metadata: {
          topics: ['tabloid', 'gossip'],
          importance: 10 // Even with high score
        }
      };
      
      const stories = [...testStories, bannedStory];
      const filtered = applyEditorialFilter(stories, editorialDNA);
      
      // Should exclude tabloid content
      const hasTableoidStory = filtered.some(s => 
        s.title.includes('Tabloid')
      );
      expect(hasTableoidStory).toBe(false);
    });
  });
});

export { testStories };