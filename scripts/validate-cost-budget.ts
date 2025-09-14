#!/usr/bin/env npx tsx

/**
 * Comprehensive Cost Budget Validation Script
 * Confirms daily spending stays under $6/day budget
 * Analyzes AI model costs, TTS costs, and projected daily expenses
 */

import * as fs from 'fs';
import * as path from 'path';
import { OpenRouterClient, TaskType } from '../src/lib/openrouter';

// Budget configuration
const DAILY_BUDGET_LIMIT = 6.00; // $6 per day
const WARNING_THRESHOLD = 0.80;  // Warn at 80% of budget

// Cost breakdown targets (from TODO.md)
const EXPECTED_COSTS = {
  openrouter: 1.50,  // AI models (GPT-5/Gemini)
  openaiTTS: 0.50,   // OpenAI TTS
  vercelBlob: 0.10,  // Storage & bandwidth
  total: 2.10        // Total expected daily cost
};

// Episode generation estimates
const EPISODE_ESTIMATES = {
  articlesPerDay: 100,
  scriptsPerEpisode: 5,  // intro, segments, outro
  ttsSegments: 10,       // audio segments per episode
  averageTextLength: 1000 // characters per TTS segment
};

interface CostData {
  entries: Array<{
    timestamp: string;
    model: string;
    cost: number;
    taskType?: string;
  }>;
  dailyTotals: Record<string, number>;
  modelTotals: Record<string, number>;
  grandTotal: number;
  ttsCosts?: {
    entries: Array<{
      timestamp: string;
      model: string;
      cost: number;
    }>;
    dailyTotals: Record<string, number>;
    grandTotal: number;
  };
}

function loadCostData(): CostData | null {
  const costsPath = path.join(process.cwd(), 'costs.json');
  
  if (!fs.existsSync(costsPath)) {
    console.log('⚠️  No costs.json file found - creating initial tracking file');
    const initialData: CostData = {
      entries: [],
      dailyTotals: {},
      modelTotals: {},
      grandTotal: 0,
      ttsCosts: {
        entries: [],
        dailyTotals: {},
        grandTotal: 0
      }
    };
    fs.writeFileSync(costsPath, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  
  try {
    const content = fs.readFileSync(costsPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to parse costs.json:', error);
    return null;
  }
}

function calculateDailyCost(date: string, data: CostData): number {
  const aiCost = data.dailyTotals[date] || 0;
  const ttsCost = data.ttsCosts?.dailyTotals[date] || 0;
  return aiCost + ttsCost;
}

function estimateFullEpisodeCost(): number {
  const client = new OpenRouterClient();
  
  // Estimate AI generation costs
  const scriptCosts = {
    intro: 0.001,      // GPT-5-mini for intro
    articles: 0.0005 * 3, // Gemini for 3 article summaries  
    opEd: 0.002,       // GPT-5 for creative op-ed
    conclusion: 0.001  // GPT-5-mini for outro
  };
  
  // Estimate TTS costs (OpenAI pricing: $0.015 per 1000 chars)
  const ttsCosts = {
    intro: (500 * 0.015) / 1000,      // ~500 chars
    segments: (3000 * 0.015) / 1000,  // ~3000 chars for articles
    outro: (300 * 0.015) / 1000       // ~300 chars
  };
  
  const totalAI = Object.values(scriptCosts).reduce((a, b) => a + b, 0);
  const totalTTS = Object.values(ttsCosts).reduce((a, b) => a + b, 0);
  
  return totalAI + totalTTS;
}

function analyzeModelEfficiency(data: CostData): void {
  console.log('\n📊 Model Cost Efficiency Analysis\n');
  console.log('=' .repeat(50));
  
  // Analyze cost per model
  const modelAnalysis: Record<string, { count: number; totalCost: number }> = {};
  
  for (const entry of data.entries) {
    if (!modelAnalysis[entry.model]) {
      modelAnalysis[entry.model] = { count: 0, totalCost: 0 };
    }
    modelAnalysis[entry.model].count++;
    modelAnalysis[entry.model].totalCost += entry.cost;
  }
  
  // Sort by total cost
  const sortedModels = Object.entries(modelAnalysis)
    .sort(([, a], [, b]) => b.totalCost - a.totalCost);
  
  for (const [model, stats] of sortedModels) {
    const avgCost = stats.totalCost / stats.count;
    console.log(`📌 ${model}`);
    console.log(`   Uses: ${stats.count}`);
    console.log(`   Total: $${stats.totalCost.toFixed(6)}`);
    console.log(`   Avg/call: $${avgCost.toFixed(6)}`);
  }
}

function projectMonthlyCosts(dailyAverage: number): void {
  console.log('\n📈 Cost Projections\n');
  console.log('=' .repeat(50));
  
  const projections = {
    daily: dailyAverage,
    weekly: dailyAverage * 7,
    monthly: dailyAverage * 30,
    yearly: dailyAverage * 365
  };
  
  for (const [period, cost] of Object.entries(projections)) {
    const budgetPercent = (cost / (DAILY_BUDGET_LIMIT * (period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365))) * 100;
    const status = budgetPercent > 100 ? '❌' : budgetPercent > 80 ? '⚠️' : '✅';
    
    console.log(`${status} ${period.charAt(0).toUpperCase() + period.slice(1)}: $${cost.toFixed(2)} (${budgetPercent.toFixed(1)}% of budget)`);
  }
}

async function validateCostBudget() {
  console.log('💰 COST BUDGET VALIDATION REPORT\n');
  console.log('=' .repeat(50));
  console.log(`Daily Budget Limit: $${DAILY_BUDGET_LIMIT.toFixed(2)}`);
  console.log(`Warning Threshold: ${(WARNING_THRESHOLD * 100).toFixed(0)}%`);
  console.log('=' .repeat(50));
  
  // Load cost data
  const data = loadCostData();
  
  if (!data) {
    console.error('❌ Failed to load cost data');
    return;
  }
  
  // Analyze historical daily costs
  console.log('\n📅 Historical Daily Costs\n');
  
  const dates = Object.keys(data.dailyTotals).sort();
  let maxDailyCost = 0;
  let totalDays = 0;
  let totalCost = 0;
  
  for (const date of dates) {
    const dailyCost = calculateDailyCost(date, data);
    totalDays++;
    totalCost += dailyCost;
    
    if (dailyCost > maxDailyCost) {
      maxDailyCost = dailyCost;
    }
    
    const percentOfBudget = (dailyCost / DAILY_BUDGET_LIMIT) * 100;
    const status = dailyCost > DAILY_BUDGET_LIMIT ? '❌ OVER' : 
                   dailyCost > (DAILY_BUDGET_LIMIT * WARNING_THRESHOLD) ? '⚠️ WARN' : 
                   '✅ OK';
    
    console.log(`${date}: $${dailyCost.toFixed(4)} (${percentOfBudget.toFixed(1)}% of budget) ${status}`);
  }
  
  const averageDailyCost = totalDays > 0 ? totalCost / totalDays : 0;
  
  // Current status
  console.log('\n📊 Current Status\n');
  console.log('=' .repeat(50));
  
  const today = new Date().toISOString().split('T')[0];
  const todayCost = calculateDailyCost(today, data);
  const todayPercent = (todayCost / DAILY_BUDGET_LIMIT) * 100;
  
  console.log(`Today's spending: $${todayCost.toFixed(4)} (${todayPercent.toFixed(1)}%)`);
  console.log(`Average daily: $${averageDailyCost.toFixed(4)}`);
  console.log(`Peak daily: $${maxDailyCost.toFixed(4)}`);
  console.log(`Total tracked: $${data.grandTotal.toFixed(4)}`);
  
  // Episode cost estimation
  console.log('\n💵 Episode Cost Breakdown\n');
  console.log('=' .repeat(50));
  
  const episodeCost = estimateFullEpisodeCost();
  console.log(`Estimated cost per episode: $${episodeCost.toFixed(4)}`);
  console.log(`Episodes possible per day: ${Math.floor(DAILY_BUDGET_LIMIT / episodeCost)}`);
  console.log(`Cost for 2 episodes/day: $${(episodeCost * 2).toFixed(4)}`);
  
  // Compare with expected costs
  console.log('\n🎯 Budget vs Expected Costs\n');
  console.log('=' .repeat(50));
  
  console.log('Service            | Expected | Actual Avg | Status');
  console.log('-------------------|----------|------------|-------');
  
  const actualAI = averageDailyCost - (data.ttsCosts?.grandTotal || 0) / totalDays;
  const actualTTS = (data.ttsCosts?.grandTotal || 0) / totalDays;
  
  const aiStatus = actualAI <= EXPECTED_COSTS.openrouter ? '✅' : '⚠️';
  const ttsStatus = actualTTS <= EXPECTED_COSTS.openaiTTS ? '✅' : '⚠️';
  
  console.log(`AI Models (OpenRouter) | $${EXPECTED_COSTS.openrouter.toFixed(2)}   | $${actualAI.toFixed(2)}      | ${aiStatus}`);
  console.log(`OpenAI TTS            | $${EXPECTED_COSTS.openaiTTS.toFixed(2)}   | $${actualTTS.toFixed(2)}      | ${ttsStatus}`);
  console.log(`Vercel Blob           | $${EXPECTED_COSTS.vercelBlob.toFixed(2)}   | N/A        | ✅`);
  console.log('-------------------|----------|------------|-------');
  console.log(`Total                 | $${EXPECTED_COSTS.total.toFixed(2)}   | $${averageDailyCost.toFixed(2)}      | ${averageDailyCost <= EXPECTED_COSTS.total ? '✅' : '⚠️'}`);
  
  // Model efficiency analysis
  analyzeModelEfficiency(data);
  
  // Cost projections
  projectMonthlyCosts(averageDailyCost > 0 ? averageDailyCost : EXPECTED_COSTS.total);
  
  // Final validation
  console.log('\n✅ BUDGET COMPLIANCE VALIDATION\n');
  console.log('=' .repeat(50));
  
  const budgetStatus = maxDailyCost <= DAILY_BUDGET_LIMIT;
  const projectedStatus = EXPECTED_COSTS.total <= DAILY_BUDGET_LIMIT;
  
  if (budgetStatus && projectedStatus) {
    console.log('🎉 PASSED: All daily costs are within the $6/day budget!');
    console.log(`   Historical peak: $${maxDailyCost.toFixed(2)} (${((maxDailyCost / DAILY_BUDGET_LIMIT) * 100).toFixed(1)}% of budget)`);
    console.log(`   Expected daily: $${EXPECTED_COSTS.total.toFixed(2)} (${((EXPECTED_COSTS.total / DAILY_BUDGET_LIMIT) * 100).toFixed(1)}% of budget)`);
    console.log(`   Budget headroom: $${(DAILY_BUDGET_LIMIT - EXPECTED_COSTS.total).toFixed(2)}/day available`);
  } else {
    console.log('⚠️  ATTENTION: Budget concerns detected');
    if (!budgetStatus) {
      console.log(`   Peak spending exceeded budget: $${maxDailyCost.toFixed(2)}`);
    }
    if (!projectedStatus) {
      console.log(`   Projected costs exceed budget: $${EXPECTED_COSTS.total.toFixed(2)}`);
    }
  }
  
  // Recommendations
  console.log('\n💡 Cost Optimization Recommendations\n');
  console.log('=' .repeat(50));
  
  if (actualAI > EXPECTED_COSTS.openrouter * 0.8) {
    console.log('• Consider using more Gemini Flash Lite for simple tasks');
  }
  if (actualTTS > EXPECTED_COSTS.openaiTTS * 0.8) {
    console.log('• Optimize script length to reduce TTS character count');
  }
  console.log('• Use caching for repeated content segments');
  console.log('• Batch API calls to reduce overhead');
  console.log('• Monitor peak usage times and distribute load');
  
  console.log('\n' + '=' .repeat(50));
  console.log('Cost validation complete ✅');
}

// Run validation
validateCostBudget().catch(console.error);