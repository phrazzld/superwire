/**
 * Text processing utilities for cleaning, chunking, and analyzing article content
 */

// Content removal patterns for advertisements and unwanted text
const CONTENT_REMOVAL_PATTERNS = [
  // Advertisements
  /ADVERTISEMENT/gi,
  /\[AD\]/gi,
  /\[ADVERTISEMENT\]/gi,
  /Sponsored Content/gi,
  /Sponsored by/gi,
  /Promoted Content/gi,
  /Partner Content/gi,
  
  // Navigation and UI elements
  /Continue reading\.{3,}/gi,
  /Read more at\.{3,}/gi,
  /Click here to/gi,
  /Tap here to/gi,
  /Swipe up/gi,
  
  // Newsletter and subscription prompts
  /Sign up for our newsletter/gi,
  /Subscribe to our/gi,
  /Get our newsletter/gi,
  /Join our mailing list/gi,
  /Sign up for updates/gi,
  /Get the latest news/gi,
  
  // Social media prompts
  /Follow us on/gi,
  /Share this article/gi,
  /Share on social media/gi,
  /Tweet this/gi,
  /Share on Facebook/gi,
  /Like us on/gi,
  
  // Related content
  /Related Articles?:/gi,
  /You may also like/gi,
  /Recommended for you/gi,
  /More from this author/gi,
  /Also read:/gi,
  
  // Cookie and privacy notices
  /We use cookies/gi,
  /Accept cookies/gi,
  /Cookie policy/gi,
  /Privacy policy/gi,
  
  // Video/audio prompts
  /Watch the video/gi,
  /Listen to the podcast/gi,
  /Play video/gi,
  
  // App download prompts
  /Download our app/gi,
  /Available on the App Store/gi,
  /Get it on Google Play/gi,
];

// HTML entities map for decoding
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&lsquo;': '\'',
  '&rsquo;': '\'',
  '&bull;': '•',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
};

/**
 * Clean text by removing HTML, ads, and normalizing whitespace
 * @param html - Raw HTML or text content
 * @returns Cleaned text
 */
export function cleanText(html: string): string {
  if (!html) return '';
  
  let cleaned = html;
  
  // Step 1: Remove HTML tags
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  
  // Step 2: Decode HTML entities
  Object.entries(HTML_ENTITIES).forEach(([entity, char]) => {
    cleaned = cleaned.replace(new RegExp(entity, 'g'), char);
  });
  
  // Decode numeric entities
  cleaned = cleaned.replace(/&#(\d+);/g, (match, dec) => 
    String.fromCharCode(parseInt(dec, 10))
  );
  cleaned = cleaned.replace(/&#x([0-9a-f]+);/gi, (match, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  
  // Step 3: Remove advertising and unwanted content patterns
  CONTENT_REMOVAL_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Step 4: Remove URLs (optional, but often noise in article text)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Step 5: Normalize whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')          // Collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')    // Max 2 newlines (preserve paragraphs)
    .replace(/\s*\n\s*/g, '\n')    // Clean up spaces around newlines
    .trim();
  
  return cleaned;
}

/**
 * Chunk article text into smaller segments for API processing
 * @param text - Article text to chunk
 * @param maxTokens - Maximum tokens per chunk (default 2000)
 * @param overlapTokens - Number of tokens to overlap between chunks (default 200)
 * @returns Array of text chunks
 */
export function chunkArticle(
  text: string,
  maxTokens: number = 2000,
  overlapTokens: number = 200
): string[] {
  if (!text) return [];
  
  // Rough estimation: 1 token ≈ 4 characters (conservative estimate)
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;
  
  // If text is short enough, return as single chunk
  if (text.length <= maxChars) {
    return [text];
  }
  
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  let currentLength = 0;
  
  for (const sentence of sentences) {
    const sentenceLength = sentence.length;
    
    // If adding this sentence would exceed limit
    if (currentLength + sentenceLength > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap + sentence;
      currentLength = overlap.length + sentenceLength;
    } else {
      currentChunk += sentence;
      currentLength += sentenceLength;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Extract metadata from article text
 * @param article - Article text
 * @returns Structured metadata object
 */
export function extractMetadata(article: string): {
  dates: string[];
  quotedSources: string[];
  numericalData: Array<{ value: string; context: string }>;
  locations: string[];
  organizations: string[];
} {
  const metadata = {
    dates: [] as string[],
    quotedSources: [] as string[],
    numericalData: [] as Array<{ value: string; context: string }>,
    locations: [] as string[],
    organizations: [] as string[],
  };
  
  if (!article) return metadata;
  
  // Extract dates (various formats)
  const datePatterns = [
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/gi,
  ];
  
  datePatterns.forEach(pattern => {
    const matches = article.match(pattern) || [];
    metadata.dates.push(...matches);
  });
  
  // Extract quoted sources (people who are quoted)
  const quotePatterns = [
    /"([^"]+)"\s+(?:said|says|stated|explained|added|told|according to)\s+([A-Z][a-z]+ [A-Z][a-z]+)/g,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:said|says|stated|explained|added|told)[\s,:]+"([^"]+)"/g,
    /According to\s+([A-Z][a-z]+ [A-Z][a-z]+)/g,
  ];
  
  quotePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(article)) !== null) {
      // Extract the name (could be in different capture groups)
      const name = match[1]?.match(/[A-Z][a-z]+ [A-Z][a-z]+/) ? match[1] : match[2];
      if (name && name.match(/[A-Z][a-z]+ [A-Z][a-z]+/)) {
        metadata.quotedSources.push(name);
      }
    }
  });
  
  // Extract numerical data with context
  const numberPattern = /(\d+(?:,\d{3})*(?:\.\d+)?%?)\s+([a-z]+)/gi;
  let match;
  while ((match = numberPattern.exec(article)) !== null) {
    const context = article.substring(Math.max(0, match.index - 30), Math.min(article.length, match.index + match[0].length + 30));
    metadata.numericalData.push({
      value: match[1],
      context: context.trim(),
    });
  }
  
  // Extract locations (capitals and major cities)
  const locationPattern = /\b(?:in|at|from|to|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  while ((match = locationPattern.exec(article)) !== null) {
    if (match[1].length > 3) { // Avoid short words
      metadata.locations.push(match[1]);
    }
  }
  
  // Extract organizations (multi-word capitalized phrases)
  const orgPattern = /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\s+(?:Corporation|Inc|LLC|Ltd|Company|Organization|Institute|University|Department|Agency|Commission|Committee|Foundation|Association)/g;
  while ((match = orgPattern.exec(article)) !== null) {
    metadata.organizations.push(match[1] + ' ' + match[2]);
  }
  
  // Deduplicate all arrays
  metadata.dates = Array.from(new Set(metadata.dates));
  metadata.quotedSources = Array.from(new Set(metadata.quotedSources));
  metadata.locations = Array.from(new Set(metadata.locations));
  metadata.organizations = Array.from(new Set(metadata.organizations));
  
  // Limit numerical data to most relevant (first 10)
  metadata.numericalData = metadata.numericalData.slice(0, 10);
  
  return metadata;
}

/**
 * Calculate Jaccard similarity between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 and 1
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set(Array.from(set1).concat(Array.from(set2)));
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Deduplicate articles based on similarity of first 200 characters
 * @param articles - Array of articles with at least title and content
 * @returns Deduplicated array of articles
 */
export function deduplicateArticles<T extends { title?: string; content?: string }>(
  articles: T[],
  threshold: number = 0.8
): T[] {
  if (articles.length <= 1) return articles;
  
  const deduplicated: T[] = [];
  
  for (const article of articles) {
    const compareText = (article.title || '') + ' ' + (article.content || '').substring(0, 200);
    
    // Check if similar article already exists
    const isDuplicate = deduplicated.some(existing => {
      const existingText = (existing.title || '') + ' ' + (existing.content || '').substring(0, 200);
      return jaccardSimilarity(compareText, existingText) > threshold;
    });
    
    if (!isDuplicate) {
      deduplicated.push(article);
    }
  }
  
  return deduplicated;
}

/**
 * Batch articles for efficient API processing
 * @param articles - Array of articles
 * @param batchSize - Number of articles per batch (default 10)
 * @returns Array of article batches
 */
export function batchArticles<T>(articles: T[], batchSize: number = 10): T[][] {
  const batches: T[][] = [];
  
  for (let i = 0; i < articles.length; i += batchSize) {
    batches.push(articles.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Estimate token count for text (rough approximation)
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  // Simple estimation: ~1 token per 4 characters or ~0.75 tokens per word
  const charCount = text.length / 4;
  const wordCount = text.split(/\s+/).length * 0.75;
  
  // Return average of both methods
  return Math.ceil((charCount + wordCount) / 2);
}

/**
 * Truncate text to maximum token count
 * @param text - Text to truncate
 * @param maxTokens - Maximum token count
 * @returns Truncated text
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Calculate ratio and truncate
  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio);
  
  // Try to truncate at sentence boundary
  const truncated = text.substring(0, targetLength);
  const lastPeriod = truncated.lastIndexOf('.');
  
  if (lastPeriod > targetLength * 0.8) {
    return truncated.substring(0, lastPeriod + 1);
  }
  
  return truncated + '...';
}

/**
 * Extract summary from article (first paragraph or first N words)
 * @param text - Article text
 * @param maxWords - Maximum words for summary (default 100)
 * @returns Summary text
 */
export function extractSummary(text: string, maxWords: number = 100): string {
  if (!text) return '';
  
  // Try to get first paragraph
  const paragraphs = text.split(/\n\n+/);
  const firstParagraph = paragraphs[0];
  
  const words = firstParagraph.split(/\s+/);
  
  if (words.length <= maxWords) {
    return firstParagraph;
  }
  
  // Truncate to max words
  const summary = words.slice(0, maxWords).join(' ');
  
  // Try to end at sentence
  const lastPeriod = summary.lastIndexOf('.');
  if (lastPeriod > summary.length * 0.7) {
    return summary.substring(0, lastPeriod + 1);
  }
  
  return summary + '...';
}