#!/usr/bin/env npx tsx

/**
 * Editorial DNA Filtering Validation Script
 * Tests the editorial filtering system to ensure it correctly:
 * - Scores articles based on editorial values
 * - Filters content according to priorities
 * - Applies thresholds appropriately
 * - Avoids unwanted content types
 */

import * as dotenv from 'dotenv';
import { 
  loadEditorialDNA,
  calculateValueAlignment,
  calculateTopicRelevance,
  assessFutureImpact,
  calculateNovelty,
  assessSystemicImportance,
  assessActionability,
  detectClickbait,
  calculateStoryImportance,
  applyEditorialFilter,
  getEditorialAngle
} from '../src/lib/editorial';
import { IngestedArticle } from '../src/lib/ingestion';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Test articles with various characteristics
const testArticles: IngestedArticle[] = [
  // High-quality climate tech article (should score high)
  {
    title: 'Breakthrough in Carbon Capture Technology Could Transform Climate Fight',
    content: 'Scientists have developed a revolutionary new carbon capture system that could dramatically reduce emissions from industrial sources. This innovative technology represents a major breakthrough in our fight against climate change, offering a scalable solution that could transform how we approach carbon reduction. The system uses novel materials and processes that are both cost-effective and energy-efficient, marking a significant advance in climate technology.',
    url: 'https://example.com/climate-breakthrough',
    publishedAt: new Date().toISOString(),
    source: 'Scientific Journal',
    author: 'Dr. Jane Smith',
    extractedAt: new Date()
  },
  
  // Celebrity gossip (should be filtered out)
  {
    title: 'Celebrity Couple Spotted at Restaurant - You Won\'t Believe What Happened Next!',
    content: 'Famous actor was seen dining with his new girlfriend at an exclusive restaurant. Sources say the couple looked happy together. This shocking revelation has broken the internet as fans react to the news. The celebrity relationship drama continues with this latest development in their romance.',
    url: 'https://example.com/celebrity-gossip',
    publishedAt: new Date().toISOString(),
    source: 'Gossip Magazine',
    author: 'Entertainment Reporter',
    extractedAt: new Date()
  },
  
  // AI development article (should score high)
  {
    title: 'New AI Model Achieves Unprecedented Performance in Scientific Research',
    content: 'Artificial intelligence researchers have unveiled a groundbreaking machine learning model that can accelerate scientific discovery. The neural network system demonstrates remarkable capabilities in analyzing complex data and generating novel hypotheses. This development could transform how research is conducted across multiple fields, from medicine to materials science. The implications for future technological progress are significant.',
    url: 'https://example.com/ai-breakthrough',
    publishedAt: new Date().toISOString(),
    source: 'Tech News',
    author: 'AI Research Team',
    extractedAt: new Date()
  },
  
  // Sports news (should score low)
  {
    title: 'Local Team Wins Championship Game in Overtime',
    content: 'The hometown team secured victory in last night\'s championship game with a dramatic overtime goal. Fans celebrated in the streets as their team claimed the title for the first time in decades. The winning goal came from the team\'s star player who has been instrumental throughout the season.',
    url: 'https://example.com/sports-win',
    publishedAt: new Date().toISOString(),
    source: 'Sports Network',
    author: 'Sports Writer',
    extractedAt: new Date()
  },
  
  // Geopolitics with systemic impact (should score medium-high)
  {
    title: 'International Climate Agreement Reached at Global Summit',
    content: 'World leaders have reached a landmark agreement on climate policy that will reshape international cooperation on environmental issues. The treaty establishes new standards for emissions reduction and creates a framework for global collaboration. This systemic change in international policy could have widespread consequences for the economy and society. The agreement represents a significant evolution in how nations approach climate challenges.',
    url: 'https://example.com/climate-policy',
    publishedAt: new Date().toISOString(),
    source: 'International News',
    author: 'Policy Correspondent',
    extractedAt: new Date()
  },
  
  // Clickbait article (should be heavily penalized)
  {
    title: 'This One Trick Will Blow Your Mind - Doctors Hate It!',
    content: 'You won\'t believe this shocking discovery that is breaking the internet. What happened next will leave you speechless. This insane revelation has gone viral and everyone is talking about it. Click here to find out the mind-blowing secret that will change everything.',
    url: 'https://example.com/clickbait',
    publishedAt: new Date().toISOString(),
    source: 'Clickbait Site',
    author: 'Unknown',
    extractedAt: new Date()
  },
  
  // Scientific breakthrough (should score very high)
  {
    title: 'Fusion Energy Milestone: Net Energy Gain Achieved Consistently',
    content: 'Scientists have achieved consistent net energy gain from nuclear fusion reactions, marking a historic breakthrough in clean energy research. This unprecedented achievement could transform the global energy infrastructure and provide a solution to climate challenges. The discovery represents decades of research coming to fruition, with profound implications for the future of human civilization. The technology could revolutionize how we generate power, offering virtually limitless clean energy.',
    url: 'https://example.com/fusion-breakthrough',
    publishedAt: new Date().toISOString(),
    source: 'Science Magazine',
    author: 'Energy Research Team',
    extractedAt: new Date()
  },
  
  // Crime story (should score very low)
  {
    title: 'Local Bank Robber Arrested After Police Chase',
    content: 'Police arrested a suspect following a bank robbery and subsequent chase through downtown. The individual was apprehended without incident after a brief pursuit. No injuries were reported in the incident.',
    url: 'https://example.com/crime-story',
    publishedAt: new Date().toISOString(),
    source: 'Local News',
    author: 'Crime Reporter',
    extractedAt: new Date()
  }
];

function validateEditorialFiltering() {
  console.log('📰 EDITORIAL DNA FILTERING VALIDATION\n');
  console.log('=' .repeat(50));
  
  try {
    // Load editorial configuration
    console.log('Loading Editorial DNA configuration...\n');
    const editorialDNA = loadEditorialDNA();
    
    // Display configuration summary
    console.log('📋 CONFIGURATION SUMMARY\n');
    console.log('Core Values:', editorialDNA.editorial_dna.values.length);
    console.log('Topic Priorities:', Object.keys(editorialDNA.editorial_dna.priorities).length);
    console.log('Minimum Score Threshold:', editorialDNA.thresholds.minimum_importance_score);
    console.log('Maximum Daily Stories:', editorialDNA.thresholds.maximum_daily_stories);
    console.log('Topics to Avoid:', editorialDNA.editorial_dna.avoid.length);
    console.log('Special Rules - Never Cover:', editorialDNA.special_rules.never_cover.length);
    
    // Test individual scoring functions
    console.log('\n📊 INDIVIDUAL SCORING TESTS\n');
    console.log('=' .repeat(50));
    
    testArticles.forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title.substring(0, 60)}...`);
      console.log('   Source:', article.source);
      
      // Calculate individual scores
      const valueAlignment = calculateValueAlignment(article, editorialDNA.editorial_dna.values);
      const topicRelevance = calculateTopicRelevance(article, editorialDNA.editorial_dna.priorities);
      const futureImpact = assessFutureImpact(article);
      const novelty = calculateNovelty(article);
      const systemicImportance = assessSystemicImportance(article);
      const actionability = assessActionability(article);
      const clickbaitScore = detectClickbait(article);
      const totalScore = calculateStoryImportance(article, editorialDNA);
      
      console.log('   Scores:');
      console.log(`     Value Alignment: ${valueAlignment.toFixed(2)}/10`);
      console.log(`     Topic Relevance: ${topicRelevance.toFixed(2)}/10`);
      console.log(`     Future Impact: ${futureImpact.toFixed(2)}/10`);
      console.log(`     Novelty: ${novelty.toFixed(2)}/10`);
      console.log(`     Systemic Importance: ${systemicImportance.toFixed(2)}/10`);
      console.log(`     Actionability: ${actionability.toFixed(2)}/10`);
      console.log(`     Clickbait Penalty: ${clickbaitScore.toFixed(2)}`);
      console.log(`     📍 TOTAL SCORE: ${totalScore.toFixed(2)}`);
      
      // Determine if article passes threshold
      const passes = totalScore >= editorialDNA.thresholds.minimum_importance_score;
      console.log(`     Status: ${passes ? '✅ PASS' : '❌ FILTERED'}`);
    });
    
    // Test batch filtering
    console.log('\n🔍 BATCH FILTERING TEST\n');
    console.log('=' .repeat(50));
    
    const filteredArticles = applyEditorialFilter(testArticles, editorialDNA);
    
    console.log(`\nInput Articles: ${testArticles.length}`);
    console.log(`Filtered Articles: ${filteredArticles.length}`);
    console.log(`Filter Rate: ${((1 - filteredArticles.length / testArticles.length) * 100).toFixed(1)}%`);
    
    console.log('\nArticles that passed filtering:');
    filteredArticles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title.substring(0, 50)}...`);
      console.log(`     Score: ${article.editorialScore?.toFixed(2)}`);
    });
    
    // Test editorial angles
    console.log('\n📐 EDITORIAL ANGLES TEST\n');
    console.log('=' .repeat(50));
    
    const angleTypes = ['breaking_news', 'scientific_discovery', 'technology_announcement'];
    angleTypes.forEach(type => {
      const angle = getEditorialAngle(type);
      if (angle) {
        console.log(`\n${type.replace(/_/g, ' ').toUpperCase()}:`);
        console.log(`  Primary: "${angle.primary}"`);
        console.log(`  Secondary: "${angle.secondary}"`);
        console.log(`  Avoid: "${angle.avoid}"`);
      }
    });
    
    // Validation summary
    console.log('\n✅ VALIDATION RESULTS\n');
    console.log('=' .repeat(50));
    
    // Expected outcomes
    const expectations = [
      { title: 'Climate breakthrough', shouldPass: true },
      { title: 'Celebrity gossip', shouldPass: false },
      { title: 'AI research', shouldPass: true },
      { title: 'Sports news', shouldPass: false },
      { title: 'Climate policy', shouldPass: true },
      { title: 'Clickbait', shouldPass: false },
      { title: 'Fusion energy', shouldPass: true },
      { title: 'Crime story', shouldPass: false }
    ];
    
    let correctFiltering = 0;
    expectations.forEach((expectation, index) => {
      const article = testArticles[index];
      const score = calculateStoryImportance(article, editorialDNA);
      const passes = score >= editorialDNA.thresholds.minimum_importance_score;
      const correct = passes === expectation.shouldPass;
      
      console.log(`${correct ? '✅' : '❌'} ${expectation.title}: ${passes ? 'Passed' : 'Filtered'} (Expected: ${expectation.shouldPass ? 'Pass' : 'Filter'})`);
      
      if (correct) correctFiltering++;
    });
    
    const accuracy = (correctFiltering / expectations.length) * 100;
    console.log(`\nFiltering Accuracy: ${accuracy.toFixed(1)}% (${correctFiltering}/${expectations.length} correct)`);
    
    // Check specific requirements
    console.log('\n🎯 SPECIFIC REQUIREMENTS CHECK\n');
    console.log('=' .repeat(50));
    
    const requirements = {
      'Climate tech scores high': filteredArticles.some(a => a.title.includes('Carbon Capture')),
      'Celebrity gossip filtered': !filteredArticles.some(a => a.title.includes('Celebrity')),
      'AI content prioritized': filteredArticles.some(a => a.title.includes('AI Model')),
      'Sports filtered (low priority)': !filteredArticles.some(a => a.title.includes('Championship')),
      'Clickbait penalized': !filteredArticles.some(a => a.title.includes('One Trick')),
      'Scientific breakthroughs included': filteredArticles.some(a => a.title.includes('Fusion')),
      'Crime stories filtered': !filteredArticles.some(a => a.title.includes('Robber'))
    };
    
    let requirementsMet = 0;
    Object.entries(requirements).forEach(([requirement, met]) => {
      console.log(`${met ? '✅' : '❌'} ${requirement}`);
      if (met) requirementsMet++;
    });
    
    const requirementsScore = (requirementsMet / Object.keys(requirements).length) * 100;
    console.log(`\nRequirements Met: ${requirementsScore.toFixed(0)}% (${requirementsMet}/${Object.keys(requirements).length})`);
    
    // Overall assessment
    console.log('\n📊 OVERALL ASSESSMENT\n');
    console.log('=' .repeat(50));
    
    if (accuracy >= 90 && requirementsScore >= 85) {
      console.log('🎉 EXCELLENT: Editorial filtering is working correctly!');
      console.log('   - Properly prioritizes high-value content');
      console.log('   - Successfully filters unwanted topics');
      console.log('   - Scoring algorithms functioning as expected');
    } else if (accuracy >= 70 && requirementsScore >= 70) {
      console.log('✅ GOOD: Editorial filtering mostly working with minor issues');
      console.log('   - Review scoring weights for better accuracy');
      console.log('   - Fine-tune keyword matching algorithms');
    } else {
      console.log('⚠️ NEEDS ATTENTION: Editorial filtering has issues');
      console.log('   - Check configuration values');
      console.log('   - Review scoring algorithms');
      console.log('   - Adjust thresholds as needed');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS\n');
    console.log('=' .repeat(50));
    
    console.log('• Consider implementing semantic embeddings for better content understanding');
    console.log('• Add machine learning models for more accurate topic classification');
    console.log('• Implement source credibility scoring from configuration');
    console.log('• Add temporal relevance scoring based on publication date');
    console.log('• Consider caching scores for performance optimization');
    console.log('• Add logging for production monitoring of filtering decisions');
    
  } catch (error: any) {
    console.error('\n❌ Validation failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure config/editorial.yaml exists and is valid');
    console.log('2. Check that all required fields are present in configuration');
    console.log('3. Verify YAML syntax is correct');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('Editorial filtering validation complete ✅');
}

// Run validation
validateEditorialFiltering();