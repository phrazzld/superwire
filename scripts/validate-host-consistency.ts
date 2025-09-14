#!/usr/bin/env npx tsx

/**
 * Host Personality Consistency Validation Script
 * Tests that generated content maintains consistent host personalities
 * across different content types and scenarios
 */

import * as dotenv from 'dotenv';
import { loadHostsConfig, maintainHostConsistency, Host } from '../src/lib/hosts';
import { generateArticle } from '../src/generators/article';
import { generateOpEd } from '../src/generators/oped';
import { generateDailyBrief } from '../src/generators/brief';
import { IngestedArticle } from '../src/lib/ingestion';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Test content samples that should match specific personality traits
const testContentSamples = {
  // Adam - Analytical, measured, data-driven
  adam_consistent: `
    The data clearly indicates a significant correlation between these economic factors and market volatility. 
    Our comprehensive analysis reveals three key patterns that warrant careful consideration. 
    First, the statistical evidence shows a 23% increase in market fluctuations during policy announcement periods. 
    Looking at the broader pattern, we can identify systematic risk factors that institutional investors must evaluate.
    The empirical evidence suggests this trend will likely continue through the next fiscal quarter.
  `,
  
  adam_inconsistent: `
    OMG this is literally SO crazy! Like, the markets are totally going bonkers right now! 
    I can't even believe what's happening - it's absolutely insane! 
    Everyone's freaking out and it's like... whoa! This is just wild, you know? 
    Honestly, I'm just vibing with these numbers and feeling the energy!
  `,

  // Dallas - Empathetic, human-focused, accessible
  dallas_consistent: `
    For working families across the country, this policy change means real impact on their daily lives.
    Let's break this down in terms that matter to real people - your grocery budget, your commute, your kids' schools.
    I've been talking to folks in communities from coast to coast, and their stories paint a clear picture.
    What strikes me most is how resilient these families are, finding ways to adapt and support each other.
    At the end of the day, these aren't just statistics - they're our neighbors, our friends, our community.
  `,

  dallas_inconsistent: `
    The algorithmic complexity of this computational framework requires advanced optimization techniques.
    We must analyze the distributed systems architecture through a lens of scalability metrics.
    The technical specifications indicate a need for microservices orchestration patterns.
    Performance benchmarking reveals bottlenecks in the data pipeline infrastructure.
    Our systematic approach leverages machine learning algorithms for predictive analytics.
  `,

  // Jordan - Energetic, youth-focused, contemporary
  jordan_consistent: `
    This is exactly the kind of breakthrough that's going to reshape how Gen Z approaches sustainability!
    The energy around this innovation is absolutely electric - young entrepreneurs are already building on these ideas.
    What's really exciting is how this connects to the broader movement we're seeing in climate activism.
    Social media is buzzing with creative applications, and honestly, the potential is limitless.
    This generation isn't just adapting to change - they're driving it at unprecedented speed!
  `,

  jordan_inconsistent: `
    In accordance with established protocols, we must conduct a methodical evaluation of regulatory frameworks.
    The bureaucratic procedures require systematic documentation and compliance verification.
    Traditional institutional approaches have demonstrated consistent results over decades of implementation.
    We recommend maintaining conservative strategies aligned with historical precedents.
    Gradual, measured progress through established channels remains the most prudent approach.
  `
};

// Sample news stories for content generation testing  
const testStories: IngestedArticle[] = [
  {
    title: 'AI Technology Breakthrough Promises Major Advances in Healthcare',
    content: 'Scientists have developed a revolutionary artificial intelligence system that can diagnose rare diseases with 95% accuracy, potentially transforming medical practice and saving thousands of lives annually.',
    url: 'https://example.com/ai-healthcare',
    pubDate: new Date().toISOString(),
    source: 'https://technews.com/feed',
    sourceName: 'Tech News',
    author: 'Dr. Sarah Chen',
    extractedAt: new Date()
  },
  {
    title: 'Climate Policy Changes Impact Local Communities Nationwide', 
    content: 'New federal environmental regulations are creating both challenges and opportunities for small towns across America, with some embracing green energy jobs while others worry about economic disruption.',
    url: 'https://example.com/climate-policy',
    pubDate: new Date().toISOString(),
    source: 'https://news.com/feed',
    sourceName: 'National News',
    author: 'Maria Rodriguez',
    extractedAt: new Date()
  }
];

async function validateHostConsistency() {
  console.log('🎭 HOST PERSONALITY CONSISTENCY VALIDATION\n');
  console.log('=' .repeat(60));

  try {
    // Load host configuration
    console.log('Loading host configuration...\n');
    const hostsConfig = loadHostsConfig();
    const hosts = Object.values(hostsConfig.hosts);
    
    console.log(`📋 Loaded ${hosts.length} host configurations`);
    hosts.forEach(host => {
      console.log(`   ${host.name}: ${host.role} (${host.voice_id})`);
    });
    console.log();

    // Test 1: Validate predefined content samples
    console.log('🧪 TEST 1: PREDEFINED CONTENT CONSISTENCY\n');
    console.log('=' .repeat(60));
    
    const testResults: Array<{ 
      host: string; 
      content: string; 
      expected: boolean; 
      actual: boolean; 
      score: number;
      passed: boolean 
    }> = [];

    // Test Adam with consistent and inconsistent content
    const adam = hosts.find(h => h.name.toLowerCase() === 'adam');
    if (adam) {
      console.log(`\n👤 Testing ADAM (${adam.role}):`);
      
      // Consistent content
      const adamConsistent = maintainHostConsistency(testContentSamples.adam_consistent, adam);
      console.log(`   ✅ Consistent content: Score ${adamConsistent.overallScore}/10 (${adamConsistent.isConsistent ? 'PASS' : 'FAIL'})`);
      testResults.push({
        host: 'Adam',
        content: 'consistent',
        expected: true,
        actual: adamConsistent.isConsistent,
        score: adamConsistent.overallScore,
        passed: adamConsistent.isConsistent === true
      });

      // Inconsistent content
      const adamInconsistent = maintainHostConsistency(testContentSamples.adam_inconsistent, adam);
      console.log(`   ❌ Inconsistent content: Score ${adamInconsistent.overallScore}/10 (${adamInconsistent.isConsistent ? 'PASS' : 'FAIL'})`);
      testResults.push({
        host: 'Adam',
        content: 'inconsistent', 
        expected: false,
        actual: adamInconsistent.isConsistent,
        score: adamInconsistent.overallScore,
        passed: adamInconsistent.isConsistent === false
      });

      // Show detailed analysis for first test
      if (adamConsistent.issues.length > 0) {
        console.log('   Issues found:', adamConsistent.issues.slice(0, 2));
      }
      if (adamConsistent.strengths.length > 0) {
        console.log('   Strengths found:', adamConsistent.strengths.slice(0, 2));
      }
    }

    // Test Dallas
    const dallas = hosts.find(h => h.name.toLowerCase() === 'dallas');
    if (dallas) {
      console.log(`\n👤 Testing DALLAS (${dallas.role}):`);
      
      const dallasConsistent = maintainHostConsistency(testContentSamples.dallas_consistent, dallas);
      console.log(`   ✅ Consistent content: Score ${dallasConsistent.overallScore}/10 (${dallasConsistent.isConsistent ? 'PASS' : 'FAIL'})`);
      testResults.push({
        host: 'Dallas',
        content: 'consistent',
        expected: true,
        actual: dallasConsistent.isConsistent,
        score: dallasConsistent.overallScore,
        passed: dallasConsistent.isConsistent === true
      });

      const dallasInconsistent = maintainHostConsistency(testContentSamples.dallas_inconsistent, dallas);
      console.log(`   ❌ Inconsistent content: Score ${dallasInconsistent.overallScore}/10 (${dallasInconsistent.isConsistent ? 'PASS' : 'FAIL'})`);
      testResults.push({
        host: 'Dallas',
        content: 'inconsistent',
        expected: false,
        actual: dallasInconsistent.isConsistent,
        score: dallasInconsistent.overallScore,
        passed: dallasInconsistent.isConsistent === false
      });
    }

    // Test Jordan
    const jordan = hosts.find(h => h.name.toLowerCase() === 'jordan');
    if (jordan) {
      console.log(`\n👤 Testing JORDAN (${jordan.role}):`);
      
      const jordanConsistent = maintainHostConsistency(testContentSamples.jordan_consistent, jordan);
      console.log(`   ✅ Consistent content: Score ${jordanConsistent.overallScore}/10 (${jordanConsistent.isConsistent ? 'PASS' : 'FAIL'})`);
      testResults.push({
        host: 'Jordan',
        content: 'consistent',
        expected: true,
        actual: jordanConsistent.isConsistent,
        score: jordanConsistent.overallScore,
        passed: jordanConsistent.isConsistent === true
      });

      const jordanInconsistent = maintainHostConsistency(testContentSamples.jordan_inconsistent, jordan);
      console.log(`   ❌ Inconsistent content: Score ${jordanInconsistent.overallScore}/10 (${jordanInconsistent.isConsistent ? 'PASS' : 'FAIL'})`);
      testResults.push({
        host: 'Jordan',
        content: 'inconsistent',
        expected: false,
        actual: jordanInconsistent.isConsistent,
        score: jordanInconsistent.overallScore,
        passed: jordanInconsistent.isConsistent === false
      });
    }

    // Test 2: Generate actual content and test consistency
    console.log('\n🧪 TEST 2: GENERATED CONTENT CONSISTENCY\n');
    console.log('=' .repeat(60));

    const generatedResults: Array<{
      host: string;
      contentType: string;
      score: number;
      isConsistent: boolean;
      generationTime: number;
    }> = [];

    // Test article generation for each host
    for (const host of hosts.slice(0, 2)) { // Test first 2 hosts to save costs
      console.log(`\n👤 Testing generated content for ${host.name.toUpperCase()}:`);
      
      try {
        // Generate article
        const startTime = Date.now();
        const generatedArticle = await generateArticle(testStories[0], {
          hostName: host.name,
          maxLength: 300,
          includeQuotes: false
        });
        const generationTime = Date.now() - startTime;

        if (generatedArticle && generatedArticle.content) {
          // Test consistency
          const consistency = maintainHostConsistency(generatedArticle.content, host);
          console.log(`   📝 Article: Score ${consistency.overallScore}/10 (${consistency.isConsistent ? 'CONSISTENT' : 'INCONSISTENT'})`);
          console.log(`   ⏱️  Generation time: ${generationTime}ms`);
          
          generatedResults.push({
            host: host.name,
            contentType: 'article',
            score: consistency.overallScore,
            isConsistent: consistency.isConsistent,
            generationTime
          });

          // Show sample of generated content
          const preview = generatedArticle.content.substring(0, 150) + '...';
          console.log(`   📄 Preview: "${preview}"`);
          
          // Show top personality matches
          if (consistency.personalityMatches && consistency.personalityMatches.length > 0) {
            const topMatch = consistency.personalityMatches[0];
            console.log(`   🎯 Top trait: ${topMatch.trait} (${topMatch.score}/10)`);
          }
        } else {
          console.log(`   ❌ Article generation failed`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error generating article: ${error.message}`);
      }
    }

    // Results Summary
    console.log('\n📊 VALIDATION RESULTS SUMMARY\n');
    console.log('=' .repeat(60));

    // Predefined content tests
    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;
    const accuracy = (passedTests / totalTests) * 100;

    console.log(`\n🎯 Predefined Content Tests:`);
    console.log(`   Tests passed: ${passedTests}/${totalTests} (${accuracy.toFixed(1)}%)`);
    
    // Show detailed results
    testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${status} ${result.host} ${result.content}: ${result.score}/10`);
    });

    // Generated content tests
    if (generatedResults.length > 0) {
      console.log(`\n🤖 Generated Content Tests:`);
      const consistentGenerated = generatedResults.filter(r => r.isConsistent).length;
      const avgScore = generatedResults.reduce((sum, r) => sum + r.score, 0) / generatedResults.length;
      const avgTime = generatedResults.reduce((sum, r) => sum + r.generationTime, 0) / generatedResults.length;
      
      console.log(`   Consistent content: ${consistentGenerated}/${generatedResults.length}`);
      console.log(`   Average score: ${avgScore.toFixed(1)}/10`);
      console.log(`   Average generation time: ${avgTime.toFixed(0)}ms`);
      
      generatedResults.forEach(result => {
        const status = result.isConsistent ? '✅' : '❌';
        console.log(`   ${status} ${result.host} ${result.contentType}: ${result.score}/10`);
      });
    }

    // Overall Assessment
    console.log('\n✅ OVERALL ASSESSMENT\n');
    console.log('=' .repeat(60));
    
    if (accuracy >= 85) {
      console.log('🎉 EXCELLENT: Host personality consistency validation is working correctly!');
      console.log('   ✓ Personalities are clearly differentiated');
      console.log('   ✓ Consistency detection is accurate');
      console.log('   ✓ Host characteristics are properly maintained');
    } else if (accuracy >= 70) {
      console.log('✅ GOOD: Host personality system mostly working with minor issues');
      console.log('   ✓ Most personality traits properly detected');
      console.log('   ⚠️ Some edge cases need refinement');
    } else {
      console.log('⚠️  NEEDS ATTENTION: Host personality consistency has issues');
      console.log('   ❌ Review host configuration files');
      console.log('   ❌ Check personality trait scoring algorithms');
      console.log('   ❌ Validate content generation prompts');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS\n');
    console.log('=' .repeat(60));
    
    console.log('• Host personality system is sophisticated with 7-factor analysis');
    console.log('• Consider adding more personality trait training data');
    console.log('• Implement A/B testing for different personality expressions');
    console.log('• Add real-time consistency monitoring for production content');
    console.log('• Consider machine learning models for personality detection');
    console.log('• Add user feedback system for personality preference');

    console.log('\n' + '=' .repeat(60));
    console.log(`Host personality consistency validation complete ✅`);
    console.log(`Overall accuracy: ${accuracy.toFixed(1)}% | Hosts tested: ${hosts.length}`);

  } catch (error: any) {
    console.error('\n❌ Validation failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure config/hosts.yaml exists and is valid');
    console.log('2. Check OpenRouter API configuration for content generation');  
    console.log('3. Verify host personality trait definitions are complete');
    console.log('4. Check that maintainHostConsistency function is working');
  }
}

// Run validation
validateHostConsistency().catch(console.error);