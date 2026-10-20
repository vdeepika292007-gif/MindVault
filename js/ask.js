/**
 * MindVault Ask Engine
 * Transparent, local retrieval-based Q&A engine.
 * Never hallucinates or fabricates content; grounds answers strictly in
 * user-created captures and always cites source items with matching excerpts.
 */

import { normalizeText, tokenize, scoreItem } from './search.js';

const QUESTION_STOP_WORDS = new Set([
  'what', 'where', 'when', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might',
  'must', 'will', 'shall', 'the', 'a', 'an', 'and', 'or', 'but', 'if',
  'in', 'on', 'at', 'to', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now',
  'tell', 'me', 'find', 'show', 'give', 'look', 'search', 'saved', 'vault',
  'capture', 'notes', 'ideas', 'links', 'snippets'
]);

/**
 * Extracts a concise excerpt from text containing one of the query terms.
 */
function extractRelevantExcerpt(text, tokens, maxLength = 260) {
  if (!text) return '';
  const sentences = text.split(/(?<=[.!?\n])\s+/);

  for (const sentence of sentences) {
    const norm = normalizeText(sentence);
    for (const token of tokens) {
      if (norm.includes(token)) {
        return sentence.length > maxLength
          ? sentence.slice(0, maxLength).trim() + '...'
          : sentence.trim();
      }
    }
  }

  // Fallback to first section of content
  return text.length > maxLength ? text.slice(0, maxLength).trim() + '...' : text.trim();
}

/**
 * Evaluates user question against all active captures.
 * Returns factual grounded answer with explicit sources.
 */
export function askMindVault(question, items, threshold = 6) {
  const trimmed = (question || '').trim();
  if (!trimmed) {
    return {
      status: 'empty',
      message: 'Enter a question or topic to search your saved knowledge.',
      answer: null,
      sources: [],
      queryTokens: []
    };
  }

  const allTokens = tokenize(trimmed);
  const meaningfulTokens = allTokens.filter(t => !QUESTION_STOP_WORDS.has(t) && t.length >= 2);
  const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

  const activeItems = (items || []).filter(item => !item.isArchived);

  // Score each active item
  const scored = [];
  for (const item of activeItems) {
    const score = scoreItem(item, queryTokens, trimmed);
    if (score >= threshold) {
      scored.push({ item, score });
    }
  }

  // Extract available tags in vault for helpful empty guidance
  const vaultTags = Array.from(new Set(activeItems.flatMap(i => i.tags || []))).slice(0, 5);

  // No items meet minimum relevance threshold
  if (scored.length === 0) {
    return {
      status: 'no_matches',
      query: trimmed,
      message: `No saved captures in your vault match "${trimmed}".`,
      suggestion: vaultTags.length > 0
        ? `MindVault retrieves information strictly from your saved notes. Try querying existing topics like #${vaultTags.join(', #')}, or capture a new thought about "${trimmed}".`
        : `MindVault retrieves information strictly from your saved notes. Try different search terms or capture a new note.`,
      answer: null,
      sources: [],
      queryTokens,
      vaultTags
    };
  }

  // Sort by relevance score descending
  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.slice(0, 4);

  // Prepare source cards with matching excerpts
  const sources = topMatches.map(({ item, score }) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    type: item.type,
    tags: item.tags,
    url: item.url,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    excerpt: extractRelevantExcerpt(item.content, queryTokens),
    score
  }));

  // Build factual, non-hallucinated grounded synthesis
  const count = sources.length;
  const intro = count === 1
    ? `Based on your saved captures, **${sources[0].title}** is directly relevant to your inquiry:`
    : `Found **${count} captures** directly relevant to your inquiry:`;

  const highlights = sources.map(s => {
    return `• **${s.title}** (${s.type.toUpperCase()}): "${s.excerpt}"`;
  }).join('\n\n');

  const answer = `${intro}\n\n${highlights}\n\n*(Grounded in your vault captures using local text retrieval. No external AI APIs or cloud models contacted.)*`;

  return {
    status: 'success',
    query: trimmed,
    message: null,
    answer,
    sources,
    matchCount: count,
    queryTokens
  };
}
