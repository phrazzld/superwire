import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for progressive article loading - remaining content
 * Returns the rest of the article content after the first paragraph
 */

// Mock article storage - in production, this would fetch from Convex/database
const getArticleRemainingContent = async (articleId: string): Promise<string | null> => {
  // In production, this would:
  // 1. Fetch from Convex using the article ID
  // 2. Extract everything after the first paragraph
  // 3. Return it for progressive loading
  
  // Mock implementation with longer content
  const mockRemainingContent: Record<string, string> = {
    'article-1': `Industry experts attribute this rapid growth to several converging factors: dramatically falling costs, improved battery storage technology, and increasingly supportive government policies worldwide. The levelized cost of solar energy has dropped by 89% over the past decade, making it the cheapest source of power in history for most of the world.

China continues to lead in renewable installations, adding more solar capacity in 2023 alone than the United States has built in its entire history. However, emerging markets in Africa and Southeast Asia are experiencing the fastest growth rates, with some countries planning to leapfrog fossil fuel infrastructure entirely.

The implications extend beyond environmental benefits. Renewable energy is creating millions of jobs globally, with the International Renewable Energy Agency reporting that the sector now employs over 13 million people worldwide. This economic transformation is reshaping geopolitical dynamics, reducing dependence on fossil fuel imports and creating new patterns of international cooperation.

Despite this progress, challenges remain. Grid infrastructure requires massive upgrades to handle the intermittent nature of renewable sources. Energy storage solutions, while improving rapidly, still need further advancement to ensure reliable 24/7 power supply. Additionally, the mining of rare earth elements for batteries and solar panels raises environmental and ethical concerns that the industry must address.

Looking ahead, analysts project that renewable energy could account for 50% of global electricity generation by 2030 if current trends continue. This transition represents one of the fastest technological shifts in human history, comparable to the adoption of the internet or mobile phones.`,
    
    'article-2': `The breakthrough centers on a new error correction method that dramatically reduces the noise that has plagued quantum systems. By maintaining quantum coherence for unprecedented durations, researchers have finally achieved the stability needed for practical applications.

The immediate applications focus on drug discovery and materials science. Pharmaceutical companies are already using these quantum systems to model molecular interactions that were previously impossible to simulate. One team has identified three promising compounds for Alzheimer's treatment in just six months of quantum-assisted research—a process that would typically take years using conventional methods.

Financial institutions are equally excited about the possibilities. Quantum algorithms are being deployed for portfolio optimization, risk analysis, and fraud detection. Major banks report that quantum computing could save the industry hundreds of billions annually through more efficient operations and better risk management.

However, the technology also raises significant concerns. Quantum computers pose a fundamental threat to current encryption methods, potentially rendering most cybersecurity systems obsolete. Governments and tech companies are racing to develop "quantum-resistant" encryption before malicious actors gain access to powerful quantum machines.

The democratization of quantum computing remains a challenge. Currently, only a handful of organizations have access to these systems, which require near-absolute-zero temperatures and sophisticated isolation from environmental interference. Cloud-based quantum computing services are emerging as a solution, but questions about data security and computational sovereignty persist.

Education systems are scrambling to prepare the next generation for a quantum future. Universities are launching new quantum engineering programs, while companies struggle to find qualified quantum programmers. The field requires a unique combination of physics, computer science, and mathematics expertise that few possess.`,
    
    'article-3': `The agreement's enforcement mechanisms mark a departure from previous climate accords. Countries that fail to meet their targets will face trade restrictions and lose access to international climate funding. This "teeth" in the agreement came after small island nations threatened to walk away from negotiations unless concrete accountability measures were included.

The $100 billion fund will be managed by a new international body with representation from both developed and developing nations. Unlike previous climate funds, this one includes specific allocation requirements: 40% for renewable energy infrastructure, 30% for climate adaptation, 20% for reforestation and ecosystem restoration, and 10% for loss and damage compensation.

Major economies have committed to unprecedented changes. The United States pledged to achieve net-zero emissions by 2040, a decade earlier than previously planned. China announced it would peak emissions by 2025 and reach carbon neutrality by 2050. The European Union committed to a 65% reduction in emissions by 2030.

The private sector played a crucial role in negotiations. A coalition of companies representing $50 trillion in assets pledged to align their operations with the agreement's goals. This includes divesting from fossil fuels, transitioning to renewable energy, and implementing science-based emission reduction targets.

Indigenous groups and youth activists, who were given formal roles in the negotiations for the first time, successfully pushed for stronger language on protecting biodiversity and ensuring just transitions for workers in fossil fuel industries. The agreement recognizes that climate action must not exacerbate existing inequalities.

Critics argue that even these ambitious targets may not be enough to limit warming to 1.5 degrees Celsius. Some scientists calculate that the current commitments would still result in 1.8 degrees of warming. However, the agreement includes a ratchet mechanism requiring countries to strengthen their commitments every two years based on the latest scientific evidence.`
  };
  
  return mockRemainingContent[articleId] || null;
};

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    // Await the params as required in Next.js 15
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    // Simulate network delay for realistic progressive loading
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const remainingContent = await getArticleRemainingContent(id);
    
    if (!remainingContent) {
      return NextResponse.json(
        { error: 'Article content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        articleId: id,
        content: remainingContent,
        timestamp: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching remaining content:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch article content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Configure caching with longer revalidation for remaining content
export const revalidate = 3600; // Revalidate every hour