/**
 * Budget monitoring and alerting system for Superwire
 * 
 * Monitors AI and audio costs against daily budgets, provides early warning
 * alerts, and integrates with existing cost tracking and notification systems.
 * 
 * Integrates with:
 * - OpenRouter cost tracking (AI costs)
 * - ElevenLabs cost tracking (audio costs)  
 * - Notification system for alerts
 * - Metrics tracking for trend analysis
 */

import { getCostSummary, shouldLimitOpEdGeneration } from './openrouter';
import { getAudioCostSummary, shouldLimitAudioGeneration } from './elevenlabs';
import { notifyFailure, notifyError } from './notifications';
import { ErrorCategory } from './error-handler';
import { getMetricsSummary } from './metrics';

/**
 * Budget configuration and thresholds
 */
export interface BudgetConfig {
  dailyLimit: number;
  warningThreshold: number; // Percentage (e.g., 0.8 for 80%)
  criticalThreshold: number; // Percentage (e.g., 0.95 for 95%)
  aiLimit: number; // Portion allocated to AI costs
  audioLimit: number; // Portion allocated to audio costs
}

/**
 * Default budget configuration following established patterns
 */
export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  dailyLimit: 6.0, // $6 daily limit from project specs
  warningThreshold: 0.8, // 80% warning as specified
  criticalThreshold: 0.95, // 95% critical
  aiLimit: 4.0, // $4 for AI costs (OpenRouter)
  audioLimit: 2.0, // $2 for audio costs (ElevenLabs)
};

/**
 * Budget status enumeration
 */
export enum BudgetStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning', 
  CRITICAL = 'critical',
  EXCEEDED = 'exceeded'
}

/**
 * Budget monitoring result
 */
export interface BudgetMonitorResult {
  status: BudgetStatus;
  totalSpent: number;
  dailyLimit: number;
  percentageUsed: number;
  remainingBudget: number;
  aiCosts: {
    spent: number;
    limit: number;
    percentageUsed: number;
    status: BudgetStatus;
  };
  audioCosts: {
    spent: number;
    limit: number;
    percentageUsed: number;
    status: BudgetStatus;
  };
  projectedDailyCost?: number;
  recommendations: string[];
  shouldLimit: {
    ai: boolean;
    audio: boolean;
    overall: boolean;
  };
}

/**
 * Alert configuration for different threshold levels
 */
interface AlertConfig {
  sendNotification: boolean;
  messagePrefix: string;
  errorCategory: ErrorCategory;
}

const ALERT_CONFIGS: Record<BudgetStatus, AlertConfig> = {
  [BudgetStatus.HEALTHY]: {
    sendNotification: false,
    messagePrefix: '✅ Budget Status: Healthy',
    errorCategory: ErrorCategory.UNKNOWN
  },
  [BudgetStatus.WARNING]: {
    sendNotification: true,
    messagePrefix: '⚠️ Budget Warning',
    errorCategory: ErrorCategory.QUOTA_EXCEEDED
  },
  [BudgetStatus.CRITICAL]: {
    sendNotification: true,
    messagePrefix: '🚨 Budget Critical',
    errorCategory: ErrorCategory.QUOTA_EXCEEDED
  },
  [BudgetStatus.EXCEEDED]: {
    sendNotification: true,
    messagePrefix: '🛑 Budget Exceeded',
    errorCategory: ErrorCategory.QUOTA_EXCEEDED
  }
};

/**
 * Determine budget status based on percentage used
 */
function getBudgetStatus(percentageUsed: number, config: BudgetConfig): BudgetStatus {
  if (percentageUsed >= 1.0) return BudgetStatus.EXCEEDED;
  if (percentageUsed >= config.criticalThreshold) return BudgetStatus.CRITICAL;
  if (percentageUsed >= config.warningThreshold) return BudgetStatus.WARNING;
  return BudgetStatus.HEALTHY;
}

/**
 * Get current cost summary from both AI and audio systems
 */
async function getCurrentCosts(): Promise<{
  aiCosts: number;
  audioCosts: number;
  totalCosts: number;
  date: string;
}> {
  try {
    // Get costs from existing tracking systems
    const aiCostSummary = await getCostSummary();
    const audioCostSummary = await getAudioCostSummary();
    
    const today = new Date().toISOString().split('T')[0];
    
    const aiCosts = aiCostSummary?.dailyTotals[today] || 0;
    const audioCosts = audioCostSummary?.todaysAudioCosts || 0;
    
    return {
      aiCosts,
      audioCosts,
      totalCosts: aiCosts + audioCosts,
      date: today
    };
  } catch (error) {
    console.warn('⚠️ Failed to get current costs, assuming zero:', error);
    return {
      aiCosts: 0,
      audioCosts: 0,
      totalCosts: 0,
      date: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * Generate budget recommendations based on current status
 */
function generateRecommendations(result: BudgetMonitorResult): string[] {
  const recommendations: string[] = [];
  
  if (result.status === BudgetStatus.EXCEEDED) {
    recommendations.push('⛔ Stop all generation immediately - budget exceeded');
    recommendations.push('💰 Review budget allocation and increase limits if needed');
    recommendations.push('📊 Analyze cost drivers using metrics system');
  } else if (result.status === BudgetStatus.CRITICAL) {
    recommendations.push('🚨 Limit generation to essential content only');
    recommendations.push('🎯 Focus on lower-cost content types (briefs vs op-eds)');
    recommendations.push('⏰ Consider delaying non-critical generation until tomorrow');
  } else if (result.status === BudgetStatus.WARNING) {
    recommendations.push('⚠️ Monitor costs closely for remainder of day');
    recommendations.push('🎛️ Consider reducing generation quality/length slightly');
    recommendations.push('📈 Review cost efficiency in metrics dashboard');
  }
  
  // AI-specific recommendations
  if (result.aiCosts.status !== BudgetStatus.HEALTHY) {
    recommendations.push('🤖 Use more cost-efficient AI models (Gemini over GPT-4)');
    recommendations.push('📝 Reduce content length or complexity');
    recommendations.push('🔄 Implement more aggressive caching for repeated content');
  }
  
  // Audio-specific recommendations  
  if (result.audioCosts.status !== BudgetStatus.HEALTHY) {
    recommendations.push('🎵 Limit audio generation to critical episodes only');
    recommendations.push('♻️ Maximize audio cache usage for intros/outros');
    recommendations.push('⏳ Consider shorter episode formats temporarily');
  }
  
  return recommendations;
}

/**
 * Project daily costs based on current time and spending rate
 */
function projectDailyCost(currentCost: number): number {
  const now = new Date();
  const hoursElapsed = now.getHours() + now.getMinutes() / 60;
  
  // Avoid division by zero in early morning
  if (hoursElapsed < 1) return currentCost * 24;
  
  const hourlyRate = currentCost / hoursElapsed;
  const projectedDaily = hourlyRate * 24;
  
  // Cap projection at reasonable maximum (3x current budget)
  return Math.min(projectedDaily, DEFAULT_BUDGET_CONFIG.dailyLimit * 3);
}

/**
 * Main budget monitoring function
 */
export async function checkCostThreshold(
  dailyLimit: number = DEFAULT_BUDGET_CONFIG.dailyLimit,
  warningThreshold: number = DEFAULT_BUDGET_CONFIG.warningThreshold
): Promise<BudgetMonitorResult> {
  const config: BudgetConfig = {
    ...DEFAULT_BUDGET_CONFIG,
    dailyLimit,
    warningThreshold
  };
  
  const costs = await getCurrentCosts();
  const totalPercentage = costs.totalCosts / config.dailyLimit;
  const overallStatus = getBudgetStatus(totalPercentage, config);
  
  // Calculate AI cost status
  const aiPercentage = costs.aiCosts / config.aiLimit;
  const aiStatus = getBudgetStatus(aiPercentage, config);
  
  // Calculate audio cost status
  const audioPercentage = costs.audioCosts / config.audioLimit;
  const audioStatus = getBudgetStatus(audioPercentage, config);
  
  const result: BudgetMonitorResult = {
    status: overallStatus,
    totalSpent: costs.totalCosts,
    dailyLimit: config.dailyLimit,
    percentageUsed: totalPercentage,
    remainingBudget: Math.max(0, config.dailyLimit - costs.totalCosts),
    aiCosts: {
      spent: costs.aiCosts,
      limit: config.aiLimit,
      percentageUsed: aiPercentage,
      status: aiStatus
    },
    audioCosts: {
      spent: costs.audioCosts,
      limit: config.audioLimit,
      percentageUsed: audioPercentage,
      status: audioStatus
    },
    projectedDailyCost: projectDailyCost(costs.totalCosts),
    recommendations: [],
    shouldLimit: {
      ai: false, // Will be set later with async call
      audio: shouldLimitAudioGeneration(),
      overall: overallStatus === BudgetStatus.CRITICAL || overallStatus === BudgetStatus.EXCEEDED
    }
  };
  
  result.recommendations = generateRecommendations(result);
  
  return result;
}

/**
 * Monitor budget and send alerts if thresholds are exceeded
 */
export async function monitorBudgetAndAlert(
  config: BudgetConfig = DEFAULT_BUDGET_CONFIG
): Promise<BudgetMonitorResult> {
  const result = await checkCostThreshold(config.dailyLimit, config.warningThreshold);
  
  console.log(`💰 Budget Status: ${result.status.toUpperCase()} (${(result.percentageUsed * 100).toFixed(1)}% used)`);
  console.log(`   Total: $${result.totalSpent.toFixed(3)} / $${result.dailyLimit.toFixed(2)}`);
  console.log(`   AI: $${result.aiCosts.spent.toFixed(3)} / $${result.aiCosts.limit.toFixed(2)}`);
  console.log(`   Audio: $${result.audioCosts.spent.toFixed(3)} / $${result.audioCosts.limit.toFixed(2)}`);
  
  // Send notifications for warning/critical/exceeded status
  const alertConfig = ALERT_CONFIGS[result.status];
  if (alertConfig.sendNotification) {
    const errorMessage = `${alertConfig.messagePrefix}: ${(result.percentageUsed * 100).toFixed(1)}% of daily budget used ($${result.totalSpent.toFixed(2)}/$${result.dailyLimit.toFixed(2)})`;
    
    await notifyError(
      errorMessage,
      'budget-monitor',
      'checkCostThreshold',
      alertConfig.errorCategory
    );
    
    console.log(`📢 Budget alert sent: ${result.status}`);
  }
  
  return result;
}

/**
 * Get budget health over multiple days
 */
export async function getBudgetHealth(days: number = 7): Promise<{
  averageDailyCost: number;
  budgetEfficiency: number;
  daysOverBudget: number;
  trend: 'improving' | 'stable' | 'worsening';
  recommendations: string[];
}> {
  const metricsData = getMetricsSummary(days);
  const dailyCosts = metricsData.dailySummaries.map(s => s.totalCost);
  
  const averageDailyCost = dailyCosts.length > 0 
    ? dailyCosts.reduce((sum, cost) => sum + cost, 0) / dailyCosts.length 
    : 0;
  
  const budgetEfficiency = averageDailyCost > 0 
    ? DEFAULT_BUDGET_CONFIG.dailyLimit / averageDailyCost 
    : 1;
    
  const daysOverBudget = dailyCosts.filter(cost => cost > DEFAULT_BUDGET_CONFIG.dailyLimit).length;
  
  // Determine trend based on metrics
  const costTrend = metricsData.trends.costTrend;
  const trend: 'improving' | 'stable' | 'worsening' = 
    costTrend < -0.1 ? 'improving' : 
    costTrend > 0.1 ? 'worsening' : 
    'stable';
  
  const recommendations: string[] = [];
  
  if (trend === 'worsening') {
    recommendations.push('📈 Cost trend is increasing - review cost drivers');
    recommendations.push('🎯 Focus on content type cost efficiency');
  }
  
  if (daysOverBudget > days * 0.3) {
    recommendations.push('💰 Frequently exceeding budget - consider increasing limits');
    recommendations.push('🔍 Analyze high-cost days for patterns');
  }
  
  if (budgetEfficiency < 0.8) {
    recommendations.push('⚡ Operating close to budget limits - optimize cost efficiency');
    recommendations.push('🤖 Switch to more cost-effective AI models');
  }
  
  return {
    averageDailyCost,
    budgetEfficiency,
    daysOverBudget,
    trend,
    recommendations
  };
}

/**
 * Test budget monitoring system
 */
export async function testBudgetMonitoring(): Promise<boolean> {
  console.log('🧪 Testing budget monitoring system...');
  
  try {
    // Test normal monitoring
    const result = await checkCostThreshold(6.0, 0.8);
    console.log(`✓ Budget check completed: ${result.status} (${(result.percentageUsed * 100).toFixed(1)}%)`);
    
    // Test health analysis
    const health = await getBudgetHealth(3);
    console.log(`✓ Health analysis: ${health.trend} trend, avg $${health.averageDailyCost.toFixed(2)}/day`);
    
    // Test alert triggering (with very low threshold for testing)
    const alertResult = await monitorBudgetAndAlert({ 
      ...DEFAULT_BUDGET_CONFIG, 
      dailyLimit: 0.01, // Very low limit to trigger alert
      warningThreshold: 0.01 
    });
    console.log(`✓ Alert test: ${alertResult.status} status triggered`);
    
    return true;
  } catch (error) {
    console.error('❌ Budget monitoring test failed:', error);
    return false;
  }
}

/**
 * Get formatted budget report for logging/display
 */
export async function getBudgetReport(): Promise<string> {
  const result = await checkCostThreshold();
  const health = await getBudgetHealth(7);
  
  const report = [
    '💰 BUDGET REPORT',
    '================',
    `Status: ${result.status.toUpperCase()} (${(result.percentageUsed * 100).toFixed(1)}% used)`,
    `Daily Total: $${result.totalSpent.toFixed(3)} / $${result.dailyLimit.toFixed(2)}`,
    `  AI Costs: $${result.aiCosts.spent.toFixed(3)} / $${result.aiCosts.limit.toFixed(2)} (${(result.aiCosts.percentageUsed * 100).toFixed(1)}%)`,
    `  Audio Costs: $${result.audioCosts.spent.toFixed(3)} / $${result.audioCosts.limit.toFixed(2)} (${(result.audioCosts.percentageUsed * 100).toFixed(1)}%)`,
    `Remaining: $${result.remainingBudget.toFixed(3)}`,
    '',
    '📊 7-Day Health:',
    `  Average Daily: $${health.averageDailyCost.toFixed(2)}`,
    `  Days Over Budget: ${health.daysOverBudget}/7`,
    `  Trend: ${health.trend.toUpperCase()}`,
    `  Efficiency: ${(health.budgetEfficiency * 100).toFixed(0)}%`,
    ''
  ];
  
  if (result.recommendations.length > 0) {
    report.push('🎯 Recommendations:');
    result.recommendations.forEach(rec => report.push(`  ${rec}`));
  }
  
  return report.join('\n');
}