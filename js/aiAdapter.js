/**
 * MindVault AI Adapter Interface & Local Fallback Implementation
 *
 * ARCHITECTURAL CONTRACT:
 * In accordance with MindVault PRD & TRD requirements:
 * 1. The browser NEVER stores or calls third-party AI provider API keys directly.
 * 2. In MVP, all operations execute entirely locally using transparent rules and heuristics.
 * 3. In future phases, this adapter redirects calls to a secured first-party server endpoint
 *    (e.g., /api/ai/summarize, /api/ai/ask) which handles authentication, rate limiting,
 *    and credential protection.
 */

import { executeSmartSearch } from './search.js';
import { askMindVault } from './ask.js';

export const AI_ADAPTER_STATUS = {
  mode: 'local-rules',
  connected: false,
  apiKeyExposed: false,
  description: 'Running local heuristic fallback. No cloud data transfers or external LLM tokens utilized.'
};

export const AiAdapter = {
  /**
   * Summarizes capture content.
   * In MVP: Extracts first key sentence or highlights.
   * In Future: Proxies to secure backend LLM summarizer.
   */
  async summarize(item) {
    if (!item || !item.content) return '';
    const sentences = item.content.split(/(?<=[.!?\n])\s+/);
    if (sentences.length <= 2) {
      return item.content;
    }
    // Return first 2 sentences as concise preview
    return sentences.slice(0, 2).join(' ').trim();
  },

  /**
   * Suggests tags based on item text.
   * In MVP: Identifies recurrent nouns or capitalized tokens.
   * In Future: Backend zero-shot tag classification.
   */
  async suggestTags(text, existingTags = []) {
    if (!text) return [];
    const lowerExisting = new Set(existingTags.map(t => t.toLowerCase()));
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !lowerExisting.has(w));

    // Frequency map
    const counts = {};
    for (const w of words) {
      counts[w] = (counts[w] || 0) + 1;
    }

    const suggestions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);

    return suggestions;
  },

  /**
   * Search operation delegating to local smart search engine.
   */
  async search(query, items) {
    return executeSmartSearch(items, query);
  },

  /**
   * Question answering grounded in saved content.
   */
  async answer(question, items) {
    return askMindVault(question, items);
  },

  /**
   * Reports system security and backend readiness state.
   */
  getStatus() {
    return { ...AI_ADAPTER_STATUS };
  }
};
