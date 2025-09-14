import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface CostEntry {
  timestamp: string;
  model: string;
  taskType?: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface GenerationMetrics {
  date: string;
  totalArticles: number;
  totalOpEds: number;
  totalBriefs: number;
  totalAudioSegments: number;
  successRate: number;
  totalDuration: number;
  totalCost: number;
}

interface StatsResponse {
  daily: {
    today: {
      ai_costs: number;
      audio_costs: number;
      total_costs: number;
      articles_generated: number;
      op_eds_generated: number;
      briefs_generated: number;
      generation_status: string;
      last_generation: string | null;
    };
    yesterday: {
      ai_costs: number;
      audio_costs: number;
      total_costs: number;
      articles_generated: number;
    };
  };
  weekly: {
    total_costs: number;
    average_daily_cost: number;
    total_articles: number;
    total_op_eds: number;
    success_rate: number;
  };
  monthly: {
    total_costs: number;
    projected_costs: number;
    days_active: number;
    budget_status: 'under' | 'near' | 'over';
    budget_percentage: number;
  };
  models: {
    usage_by_model: Record<string, {
      calls: number;
      total_cost: number;
      average_cost: number;
    }>;
    most_used: string;
    most_expensive: string;
  };
  health: {
    api_status: 'healthy' | 'degraded' | 'down';
    last_successful_generation: string | null;
    error_rate_24h: number;
    warnings: string[];
  };
}

function readCostsFile(): any {
  const costsPath = path.join(process.cwd(), 'costs.json');
  if (!fs.existsSync(costsPath)) {
    return { entries: [], dailyTotals: {}, modelTotals: {}, grandTotal: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(costsPath, 'utf-8'));
  } catch {
    return { entries: [], dailyTotals: {}, modelTotals: {}, grandTotal: 0 };
  }
}

function readMetricsFile(): any {
  const metricsPath = path.join(process.cwd(), 'generation-metrics.json');
  if (!fs.existsSync(metricsPath)) {
    return { metrics: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
  } catch {
    return { metrics: [] };
  }
}

// Force dynamic rendering since we're reading from filesystem
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const costs = readCostsFile();
    const metrics = readMetricsFile();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Calculate daily stats
    const todayCosts = costs.dailyTotals?.[today] || 0;
    const yesterdayCosts = costs.dailyTotals?.[yesterday] || 0;
    
    // Separate AI and audio costs
    const todayEntries = (costs.entries || []).filter((e: CostEntry) => 
      e.timestamp.startsWith(today)
    );
    
    const todayAICosts = todayEntries
      .filter((e: CostEntry) => !e.taskType?.includes('AUDIO'))
      .reduce((sum: number, e: CostEntry) => sum + e.cost, 0);
    
    const todayAudioCosts = todayEntries
      .filter((e: CostEntry) => e.taskType?.includes('AUDIO'))
      .reduce((sum: number, e: CostEntry) => sum + e.cost, 0);
    
    // Get generation metrics
    const todayMetrics = metrics.metrics?.find((m: GenerationMetrics) => 
      m.date === today
    );
    
    // Calculate weekly stats (last 7 days)
    const weekStart = new Date(Date.now() - 7 * 86400000);
    const weeklyEntries = (costs.entries || []).filter((e: CostEntry) => 
      new Date(e.timestamp) >= weekStart
    );
    const weeklyTotal = weeklyEntries.reduce((sum: number, e: CostEntry) => sum + e.cost, 0);
    
    // Calculate monthly stats
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthlyEntries = (costs.entries || []).filter((e: CostEntry) => 
      new Date(e.timestamp) >= monthStart
    );
    const monthlyTotal = monthlyEntries.reduce((sum: number, e: CostEntry) => sum + e.cost, 0);
    const daysInMonth = new Date().getDate();
    const projectedMonthly = (monthlyTotal / daysInMonth) * 30;
    
    // Model usage stats
    const modelUsage: Record<string, { calls: number; total_cost: number }> = {};
    (costs.entries || []).forEach((entry: CostEntry) => {
      if (!modelUsage[entry.model]) {
        modelUsage[entry.model] = { calls: 0, total_cost: 0 };
      }
      modelUsage[entry.model].calls++;
      modelUsage[entry.model].total_cost += entry.cost;
    });
    
    const modelStats = Object.entries(modelUsage).reduce((acc, [model, stats]) => {
      acc[model] = {
        ...stats,
        average_cost: stats.total_cost / stats.calls
      };
      return acc;
    }, {} as Record<string, { calls: number; total_cost: number; average_cost: number }>);
    
    const mostUsedModel = Object.entries(modelUsage)
      .sort((a, b) => b[1].calls - a[1].calls)[0]?.[0] || 'none';
    
    const mostExpensiveModel = Object.entries(modelUsage)
      .sort((a, b) => b[1].total_cost - a[1].total_cost)[0]?.[0] || 'none';
    
    // Health checks
    const warnings: string[] = [];
    if (todayCosts > 5) warnings.push('Daily costs approaching budget limit');
    if (weeklyTotal / 7 > 6) warnings.push('Average daily cost exceeding target');
    if (projectedMonthly > 180) warnings.push('Monthly projection exceeds budget');
    
    const stats: StatsResponse = {
      daily: {
        today: {
          ai_costs: todayAICosts,
          audio_costs: todayAudioCosts,
          total_costs: todayCosts,
          articles_generated: todayMetrics?.totalArticles || 0,
          op_eds_generated: todayMetrics?.totalOpEds || 0,
          briefs_generated: todayMetrics?.totalBriefs || 0,
          generation_status: todayMetrics ? 'completed' : 'pending',
          last_generation: todayMetrics?.date || null
        },
        yesterday: {
          ai_costs: yesterdayCosts * 0.7, // Estimate
          audio_costs: yesterdayCosts * 0.3,
          total_costs: yesterdayCosts,
          articles_generated: 20 // Default estimate
        }
      },
      weekly: {
        total_costs: weeklyTotal,
        average_daily_cost: weeklyTotal / 7,
        total_articles: metrics.metrics?.filter((m: GenerationMetrics) => 
          new Date(m.date) >= weekStart
        ).reduce((sum: number, m: GenerationMetrics) => sum + (m.totalArticles || 0), 0) || 0,
        total_op_eds: metrics.metrics?.filter((m: GenerationMetrics) => 
          new Date(m.date) >= weekStart
        ).reduce((sum: number, m: GenerationMetrics) => sum + (m.totalOpEds || 0), 0) || 0,
        success_rate: 0.95 // Default estimate
      },
      monthly: {
        total_costs: monthlyTotal,
        projected_costs: projectedMonthly,
        days_active: daysInMonth,
        budget_status: projectedMonthly > 180 ? 'over' : projectedMonthly > 150 ? 'near' : 'under',
        budget_percentage: (projectedMonthly / 180) * 100
      },
      models: {
        usage_by_model: modelStats,
        most_used: mostUsedModel,
        most_expensive: mostExpensiveModel
      },
      health: {
        api_status: warnings.length === 0 ? 'healthy' : warnings.length > 2 ? 'degraded' : 'healthy',
        last_successful_generation: todayMetrics?.date || yesterday,
        error_rate_24h: 0.02, // Default low error rate
        warnings
      }
    };
    
    // Return with cache headers (5 minutes for stats)
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300'
      }
    });
  } catch (error) {
    console.error('Error generating stats:', error);
    return NextResponse.json(
      { error: 'Failed to generate statistics' },
      { status: 500 }
    );
  }
}