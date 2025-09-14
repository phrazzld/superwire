/**
 * Quality assurance and content validation system
 * Ensures generated content meets standards before publication
 */

interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
  warnings: string[];
  metrics: {
    readability: number;
    grammar: number;
    factualAccuracy: number;
    consistency: number;
    completeness: number;
  };
}

interface ContentQualityReport {
  overall: QualityCheckResult;
  byFormat: Record<string, QualityCheckResult>;
  recommendations: string[];
  timestamp: string;
}

interface HallucinationCheckResult {
  detected: boolean;
  suspicious: string[];
  confidence: number;
  details: string[];
}

/**
 * Check content quality for grammar, readability, and factual claims
 */
export function checkContentQuality(text: string): QualityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Readability checks
  const readability = checkReadability(text);
  if (readability.score < 50) {
    issues.push('Poor readability: text is too complex');
  } else if (readability.score < 60) {
    warnings.push('Readability could be improved');
  }
  
  // Grammar checks
  const grammar = checkGrammar(text);
  if (grammar.errors > 5) {
    issues.push(`Multiple grammar errors detected: ${grammar.errors}`);
  } else if (grammar.errors > 2) {
    warnings.push(`Some grammar issues found: ${grammar.errors}`);
  }
  
  // Factual claim checks
  const factual = checkFactualClaims(text);
  if (factual.unsupported > 3) {
    issues.push('Multiple unsupported claims detected');
  } else if (factual.unsupported > 0) {
    warnings.push(`${factual.unsupported} claims need verification`);
  }
  
  // Structure checks
  const structure = checkStructure(text);
  if (!structure.hasIntro) issues.push('Missing introduction');
  if (!structure.hasConclusion) warnings.push('Missing conclusion');
  if (structure.paragraphs < 3) issues.push('Insufficient content structure');
  
  // Calculate overall score
  const score = calculateQualityScore({
    readability: readability.score,
    grammar: grammar.score,
    factual: factual.score,
    structure: structure.score
  });
  
  return {
    passed: issues.length === 0 && score >= 70,
    score,
    issues,
    warnings,
    metrics: {
      readability: readability.score,
      grammar: grammar.score,
      factualAccuracy: factual.score,
      consistency: 85, // Placeholder
      completeness: structure.score
    }
  };
}

/**
 * Check readability using Flesch Reading Ease formula
 */
function checkReadability(text: string): { score: number; level: string } {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, level: 'Invalid' };
  }
  
  // Flesch Reading Ease formula
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  let score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  score = Math.max(0, Math.min(100, score));
  
  let level = 'Very Easy';
  if (score < 30) level = 'Very Difficult';
  else if (score < 50) level = 'Difficult';
  else if (score < 60) level = 'Fairly Difficult';
  else if (score < 70) level = 'Standard';
  else if (score < 80) level = 'Fairly Easy';
  else if (score < 90) level = 'Easy';
  
  return { score, level };
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) count++;
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent e
  if (word.endsWith('e')) count--;
  
  // Ensure at least one syllable
  return Math.max(1, count);
}

/**
 * Check grammar (simplified - in production would use language tool)
 */
function checkGrammar(text: string): { errors: number; score: number } {
  let errors = 0;
  
  // Common grammar patterns to check
  const patterns = [
    /\s{2,}/g, // Multiple spaces
    /[.!?]{2,}/g, // Multiple punctuation
    /\b(a)\s+[aeiou]/gi, // 'a' before vowel
    /\b(an)\s+[^aeiou]/gi, // 'an' before consonant
    /\b(your)\s+(a|an|the)\s+\w+ing\b/gi, // Your + gerund
    /\b(there)\s+(a|an|the)\s+\w+\b/gi, // There + article misuse
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) errors += matches.length;
  });
  
  // Check sentence fragments
  const sentences = text.split(/[.!?]+/);
  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    if (words.length > 0 && words.length < 3) {
      errors++; // Likely fragment
    }
  });
  
  const score = Math.max(0, 100 - (errors * 5));
  return { errors, score };
}

/**
 * Check factual claims (simplified - checks for unsupported absolutes)
 */
function checkFactualClaims(text: string): { unsupported: number; score: number } {
  let unsupported = 0;
  
  // Patterns that suggest unsupported claims
  const claimPatterns = [
    /\b(always|never|all|none|every|no one)\b/gi,
    /\b(studies show|research proves|scientists agree)\b(?!.*\[|\()/gi,
    /\b(it is known|everyone knows|obviously)\b/gi,
    /\b\d+%\b(?!.*source|study|report|according)/gi,
    /\b(will definitely|will certainly|guaranteed to)\b/gi
  ];
  
  claimPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) unsupported += matches.length;
  });
  
  const score = Math.max(0, 100 - (unsupported * 10));
  return { unsupported, score };
}

/**
 * Check content structure
 */
function checkStructure(text: string): {
  hasIntro: boolean;
  hasConclusion: boolean;
  paragraphs: number;
  score: number;
} {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Check for introduction (first paragraph should set context)
  const hasIntro = paragraphs.length > 0 && paragraphs[0].length > 100;
  
  // Check for conclusion (last paragraph should summarize)
  const hasConclusion = paragraphs.length > 0 && 
    paragraphs[paragraphs.length - 1].length > 80 &&
    /\b(conclusion|summary|overall|therefore|thus)\b/i.test(
      paragraphs[paragraphs.length - 1]
    );
  
  let score = 100;
  if (!hasIntro) score -= 20;
  if (!hasConclusion) score -= 20;
  if (paragraphs.length < 3) score -= 30;
  if (sentences.length < 5) score -= 20;
  
  return {
    hasIntro,
    hasConclusion,
    paragraphs: paragraphs.length,
    score: Math.max(0, score)
  };
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(metrics: Record<string, number>): number {
  const weights = {
    readability: 0.25,
    grammar: 0.25,
    factual: 0.30,
    structure: 0.20
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  Object.entries(metrics).forEach(([key, value]) => {
    const weight = weights[key as keyof typeof weights] || 0.25;
    totalScore += value * weight;
    totalWeight += weight;
  });
  
  return Math.round(totalScore / totalWeight);
}

/**
 * Validate editorial consistency across content
 */
export function validateEditorialConsistency(
  content: Array<{ type: string; text: string; metadata?: any }>
): QualityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Extract tone indicators
  const tones = content.map(item => analyzeTone(item.text));
  
  // Check tone consistency
  const primaryTone = getMostCommonTone(tones);
  const inconsistentItems = tones.filter(t => 
    Math.abs(t.formality - primaryTone.formality) > 30
  );
  
  if (inconsistentItems.length > content.length * 0.3) {
    issues.push('Inconsistent tone across content pieces');
  } else if (inconsistentItems.length > 0) {
    warnings.push(`${inconsistentItems.length} items have different tone`);
  }
  
  // Check vocabulary consistency
  const vocabularyLevels = content.map(item => 
    analyzeVocabularyLevel(item.text)
  );
  
  const avgVocabLevel = vocabularyLevels.reduce((a, b) => a + b, 0) / vocabularyLevels.length;
  const vocabVariance = vocabularyLevels.filter(v => 
    Math.abs(v - avgVocabLevel) > 20
  ).length;
  
  if (vocabVariance > content.length * 0.3) {
    issues.push('Vocabulary complexity varies too much');
  }
  
  // Check perspective consistency
  const perspectives = content.map(item => 
    extractPerspective(item.text)
  );
  
  const hasConflictingPerspectives = checkForConflicts(perspectives);
  if (hasConflictingPerspectives) {
    issues.push('Conflicting editorial perspectives detected');
  }
  
  const score = calculateConsistencyScore(tones, vocabularyLevels, perspectives);
  
  return {
    passed: issues.length === 0 && score >= 70,
    score,
    issues,
    warnings,
    metrics: {
      readability: 75,
      grammar: 85,
      factualAccuracy: 80,
      consistency: score,
      completeness: 90
    }
  };
}

/**
 * Analyze tone of text
 */
function analyzeTone(text: string): { formality: number; sentiment: number } {
  let formality = 50; // 0 = very casual, 100 = very formal
  let sentiment = 50; // 0 = very negative, 100 = very positive
  
  // Formal indicators
  const formalPatterns = [
    /\b(furthermore|moreover|consequently|therefore|thus)\b/gi,
    /\b(shall|whom|whereby|thereof|herein)\b/gi,
    /\b(it is|there are|one must|one should)\b/gi
  ];
  
  // Casual indicators
  const casualPatterns = [
    /\b(gonna|wanna|gotta|kinda|sorta)\b/gi,
    /\b(awesome|cool|great|amazing|wow)\b/gi,
    /[!]{2,}/g,
    /\b(lol|omg|btw|fyi)\b/gi
  ];
  
  formalPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) formality += matches.length * 2;
  });
  
  casualPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) formality -= matches.length * 3;
  });
  
  formality = Math.max(0, Math.min(100, formality));
  
  // Sentiment analysis (simplified)
  const positiveWords = text.match(/\b(good|great|excellent|positive|success|achieve|improve|benefit)\b/gi);
  const negativeWords = text.match(/\b(bad|poor|negative|fail|problem|issue|concern|risk)\b/gi);
  
  if (positiveWords) sentiment += positiveWords.length * 2;
  if (negativeWords) sentiment -= negativeWords.length * 2;
  
  sentiment = Math.max(0, Math.min(100, sentiment));
  
  return { formality, sentiment };
}

/**
 * Analyze vocabulary complexity level
 */
function analyzeVocabularyLevel(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const complexWords = words.filter(w => w.length > 10 || countSyllables(w) > 3);
  
  const complexity = (complexWords.length / words.length) * 100;
  return Math.min(100, complexity * 3); // Scale to 0-100
}

/**
 * Extract editorial perspective
 */
function extractPerspective(text: string): string[] {
  const perspectives: string[] = [];
  
  const perspectivePatterns = {
    'technological': /\b(innovation|technology|digital|AI|automation)\b/gi,
    'environmental': /\b(climate|environment|sustainable|green|carbon)\b/gi,
    'economic': /\b(economy|market|financial|business|trade)\b/gi,
    'social': /\b(society|community|equality|justice|rights)\b/gi,
    'political': /\b(government|policy|political|legislation|democracy)\b/gi
  };
  
  Object.entries(perspectivePatterns).forEach(([perspective, pattern]) => {
    const matches = text.match(pattern);
    if (matches && matches.length > 2) {
      perspectives.push(perspective);
    }
  });
  
  return perspectives;
}

/**
 * Get most common tone from array
 */
function getMostCommonTone(tones: Array<{ formality: number; sentiment: number }>): {
  formality: number;
  sentiment: number;
} {
  const avgFormality = tones.reduce((sum, t) => sum + t.formality, 0) / tones.length;
  const avgSentiment = tones.reduce((sum, t) => sum + t.sentiment, 0) / tones.length;
  
  return { formality: avgFormality, sentiment: avgSentiment };
}

/**
 * Check for conflicting perspectives
 */
function checkForConflicts(perspectives: string[][]): boolean {
  const conflicts = [
    ['environmental', 'economic'],
    ['technological', 'social'],
    ['political', 'individual']
  ];
  
  const allPerspectives = perspectives.flat();
  
  for (const [persp1, persp2] of conflicts) {
    const hasConflict = allPerspectives.includes(persp1) && 
                       allPerspectives.includes(persp2) &&
                       Math.abs(
                         allPerspectives.filter(p => p === persp1).length -
                         allPerspectives.filter(p => p === persp2).length
                       ) > 5;
    
    if (hasConflict) return true;
  }
  
  return false;
}

/**
 * Calculate consistency score
 */
function calculateConsistencyScore(
  tones: Array<{ formality: number; sentiment: number }>,
  vocabularyLevels: number[],
  perspectives: string[][]
): number {
  // Tone consistency
  const avgTone = getMostCommonTone(tones);
  const toneVariance = tones.reduce((sum, t) => 
    sum + Math.abs(t.formality - avgTone.formality), 0
  ) / tones.length;
  const toneScore = Math.max(0, 100 - toneVariance);
  
  // Vocabulary consistency
  const avgVocab = vocabularyLevels.reduce((a, b) => a + b, 0) / vocabularyLevels.length;
  const vocabVariance = vocabularyLevels.reduce((sum, v) => 
    sum + Math.abs(v - avgVocab), 0
  ) / vocabularyLevels.length;
  const vocabScore = Math.max(0, 100 - vocabVariance);
  
  // Perspective consistency
  const hasConflicts = checkForConflicts(perspectives);
  const perspectiveScore = hasConflicts ? 50 : 100;
  
  return Math.round((toneScore + vocabScore + perspectiveScore) / 3);
}

/**
 * Detect potential hallucinations by comparing to source material
 */
export function detectHallucinations(
  generatedText: string,
  sources: Array<{ text: string; url?: string }>
): HallucinationCheckResult {
  const suspicious: string[] = [];
  const details: string[] = [];
  
  // Extract claims from generated text
  const claims = extractClaims(generatedText);
  
  // Check each claim against sources
  let unsupportedClaims = 0;
  claims.forEach(claim => {
    const isSupported = sources.some(source => 
      isClaimSupported(claim, source.text)
    );
    
    if (!isSupported) {
      suspicious.push(claim);
      unsupportedClaims++;
    }
  });
  
  // Check for specific numbers/dates not in sources
  const numbers = generatedText.match(/\b\d+(\.\d+)?%?\b/g) || [];
  const dates = generatedText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi) || [];
  
  [...numbers, ...dates].forEach(item => {
    const inSources = sources.some(source => source.text.includes(item));
    if (!inSources) {
      suspicious.push(`Unsupported data point: ${item}`);
    }
  });
  
  // Calculate confidence
  const confidence = unsupportedClaims > 0 ? 
    Math.min(100, (unsupportedClaims / claims.length) * 100) : 0;
  
  const detected = suspicious.length > 3 || confidence > 30;
  
  if (detected) {
    details.push(`Found ${unsupportedClaims} unsupported claims out of ${claims.length}`);
    details.push(`Confidence level: ${confidence.toFixed(1)}%`);
  }
  
  return {
    detected,
    suspicious: suspicious.slice(0, 10), // Limit to top 10
    confidence,
    details
  };
}

/**
 * Extract factual claims from text
 */
function extractClaims(text: string): string[] {
  const claims: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  sentences.forEach(sentence => {
    // Look for factual statement patterns
    if (
      /\b(is|are|was|were|has|have|had)\b/i.test(sentence) &&
      !/\b(may|might|could|should|would|perhaps|possibly)\b/i.test(sentence)
    ) {
      claims.push(sentence.trim());
    }
  });
  
  return claims;
}

/**
 * Check if a claim is supported by source text
 */
function isClaimSupported(claim: string, sourceText: string): boolean {
  // Extract key terms from claim
  const keyTerms = claim
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 4); // Focus on substantial words
  
  // Check how many key terms appear in source
  const matchedTerms = keyTerms.filter(term => 
    sourceText.toLowerCase().includes(term)
  );
  
  // Consider supported if >60% of key terms match
  return matchedTerms.length >= keyTerms.length * 0.6;
}

/**
 * Check host voice consistency
 */
export function checkHostVoiceConsistency(
  transcript: string,
  host: { name: string; characteristics: any; speechPatterns: any }
): QualityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Analyze transcript segments attributed to this host
  const hostSegments = extractHostSegments(transcript, host.name);
  
  if (hostSegments.length === 0) {
    issues.push(`No segments found for host ${host.name}`);
    return {
      passed: false,
      score: 0,
      issues,
      warnings,
      metrics: {
        readability: 0,
        grammar: 0,
        factualAccuracy: 0,
        consistency: 0,
        completeness: 0
      }
    };
  }
  
  // Check each segment for consistency
  const consistencyScores = hostSegments.map(segment => 
    analyzeVoiceConsistency(segment, host)
  );
  
  const avgScore = consistencyScores.reduce((sum, s) => sum + s, 0) / consistencyScores.length;
  
  if (avgScore < 60) {
    issues.push(`Host voice inconsistent (score: ${avgScore.toFixed(1)})`);
  } else if (avgScore < 75) {
    warnings.push(`Host voice could be more consistent`);
  }
  
  // Check for out-of-character moments
  const outOfCharacter = hostSegments.filter(segment => 
    detectOutOfCharacter(segment, host)
  );
  
  if (outOfCharacter.length > 0) {
    warnings.push(`${outOfCharacter.length} segments seem out of character`);
  }
  
  return {
    passed: issues.length === 0 && avgScore >= 70,
    score: avgScore,
    issues,
    warnings,
    metrics: {
      readability: 80,
      grammar: 85,
      factualAccuracy: 90,
      consistency: avgScore,
      completeness: 85
    }
  };
}

/**
 * Extract segments for a specific host from transcript
 */
function extractHostSegments(transcript: string, hostName: string): string[] {
  const pattern = new RegExp(`${hostName}:\\s*([^\\n]+)`, 'gi');
  const matches = Array.from(transcript.matchAll(pattern));
  return matches.map(match => match[1]);
}

/**
 * Analyze voice consistency for a segment
 */
function analyzeVoiceConsistency(
  segment: string,
  host: { characteristics: any; speechPatterns: any }
): number {
  let score = 100;
  
  // Check analytical depth
  if (host.characteristics.analytical_depth > 7) {
    const hasAnalysis = /\b(analysis|data|evidence|correlation|implies)\b/i.test(segment);
    if (!hasAnalysis && segment.length > 100) score -= 10;
  }
  
  // Check empathy level
  if (host.characteristics.empathy_level > 7) {
    const hasEmpathy = /\b(feel|understand|concern|care|impact on)\b/i.test(segment);
    if (!hasEmpathy && segment.length > 100) score -= 10;
  }
  
  // Check energy level
  if (host.characteristics.energy_level > 7) {
    const hasEnergy = /[!]|exciting|amazing|incredible|wow/i.test(segment);
    if (!hasEnergy && segment.length > 50) score -= 5;
  }
  
  // Check speech patterns
  if (host.speechPatterns?.transition_phrases) {
    const hasTransition = host.speechPatterns.transition_phrases.some((phrase: string) => 
      segment.toLowerCase().includes(phrase.toLowerCase())
    );
    if (!hasTransition && segment.length > 150) score -= 5;
  }
  
  return Math.max(0, score);
}

/**
 * Detect out-of-character moments
 */
function detectOutOfCharacter(
  segment: string,
  host: { characteristics: any }
): boolean {
  // Analytical host using very casual language
  if (host.characteristics.analytical_depth > 8) {
    if (/\b(gonna|wanna|kinda|like totally)\b/i.test(segment)) {
      return true;
    }
  }
  
  // Empathetic host being cold
  if (host.characteristics.empathy_level > 8) {
    if (/\b(don't care|whatever|irrelevant|pointless)\b/i.test(segment)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate quality report for all content
 */
export async function generateQualityReport(
  content: Array<{ type: string; text: string; metadata?: any }>
): Promise<ContentQualityReport> {
  const byFormat: Record<string, QualityCheckResult> = {};
  
  // Check quality by content type
  const contentTypes = Array.from(new Set(content.map(c => c.type)));
  
  for (const type of contentTypes) {
    const typeContent = content.filter(c => c.type === type);
    const combinedText = typeContent.map(c => c.text).join('\n\n');
    
    byFormat[type] = checkContentQuality(combinedText);
  }
  
  // Overall quality check
  const allText = content.map(c => c.text).join('\n\n');
  const overall = checkContentQuality(allText);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (overall.score < 70) {
    recommendations.push('Overall quality needs improvement');
  }
  
  Object.entries(byFormat).forEach(([type, result]) => {
    if (result.score < 70) {
      recommendations.push(`Improve ${type} content quality`);
    }
    result.issues.forEach(issue => {
      recommendations.push(`${type}: ${issue}`);
    });
  });
  
  // Check consistency
  const consistency = validateEditorialConsistency(content);
  if (!consistency.passed) {
    recommendations.push('Improve editorial consistency across content');
  }
  
  return {
    overall,
    byFormat,
    recommendations: recommendations.slice(0, 10), // Limit to top 10
    timestamp: new Date().toISOString()
  };
}

export type {
  QualityCheckResult,
  ContentQualityReport,
  HallucinationCheckResult
};