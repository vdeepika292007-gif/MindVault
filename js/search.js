/**
 * MindVault Search Module
 * Implements normalized keyword search, field-weighted relevance scoring,
 * and rule-based local smart search.
 */

/**
 * Normalizes text for case-insensitive and diacritic-insensitive matching.
 */
export function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Tokenizes text into search terms, removing punctuation and short blanks.
 */
export function tokenize(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(/[\s,.;:!?()[\]{}"'\\/|`~@#$%^&*+=<>_-]+/)
    .filter(token => token.length > 0);
}

/**
 * Safely escapes HTML and wraps matching tokens in <mark class="search-highlight"> tags.
 */
export function highlightMatches(text, tokens) {
  if (!text) return '';
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  if (!tokens || tokens.length === 0) return escaped;

  const validTokens = Array.from(new Set(
    tokens
      .map(t => String(t).trim())
      .filter(t => t.length >= 2)
  )).sort((a, b) => b.length - a.length);

  if (validTokens.length === 0) return escaped;

  const escapedTokens = validTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

  return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}


/**
 * Evaluates a single item against query tokens and computes a relevance score.
 * Title and tags matches rank significantly higher than general body content.
 */
export function scoreItem(item, tokens, rawQuery = '') {
  if (!tokens || tokens.length === 0) return 1;

  const titleNorm = normalizeText(item.title);
  const contentNorm = normalizeText(item.content);
  const typeNorm = normalizeText(item.type);
  const urlNorm = normalizeText(item.url);
  const tagsNorm = item.tags.map(normalizeText);
  const rawQueryNorm = normalizeText(rawQuery);

  let score = 0;
  let matchesAllTokens = true;

  // Exact phrase match bonuses
  if (rawQueryNorm.length > 2) {
    if (titleNorm.includes(rawQueryNorm)) {
      score += 30;
    } else if (contentNorm.includes(rawQueryNorm)) {
      score += 15;
    }
  }

  for (const token of tokens) {
    let tokenMatched = false;

    // Title match (highest weight)
    if (titleNorm.includes(token)) {
      score += 12;
      tokenMatched = true;
    }

    // Tag match (very high weight)
    for (const tag of tagsNorm) {
      if (tag === token) {
        score += 10;
        tokenMatched = true;
      } else if (tag.includes(token)) {
        score += 6;
        tokenMatched = true;
      }
    }

    // Type match
    if (typeNorm.includes(token)) {
      score += 5;
      tokenMatched = true;
    }

    // URL match
    if (urlNorm.includes(token)) {
      score += 4;
      tokenMatched = true;
    }

    // Content match
    if (contentNorm.includes(token)) {
      score += 3;
      tokenMatched = true;
    }

    if (!tokenMatched) {
      matchesAllTokens = false;
    }
  }

  // Bonus if all query tokens are present
  if (matchesAllTokens && tokens.length > 1) {
    score += 10;
  }

  return score;
}

/**
 * Performs pure keyword search across an array of items.
 * Returns sorted list of matching items.
 */
export function searchKeyword(items, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return items;

  const scored = [];
  for (const item of items) {
    const score = scoreItem(item, tokens, query);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Sort by score descending; if tied, sort by updatedAt
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime();
  });

  return scored.map(s => s.item);
}

/**
 * Parses user input for local smart-search rules.
 * Documented patterns:
 * - "ideas about <term>" / "idea about <term>"
 * - "links about <term>" / "link about <term>"
 * - "notes about <term>" / "note about <term>"
 * - "snippets about <term>" / "snippet about <term>"
 * - "tag:<term>"
 * - "pinned <term>" or "pinned"
 *
 * If no rule matches, gracefully falls back to standard keyword search.
 */
export function parseSmartSearch(rawInput) {
  const input = (rawInput || '').trim();
  if (!input) {
    return {
      isSmartRule: false,
      ruleType: null,
      explanation: null,
      filterType: null,
      filterTag: null,
      pinnedOnly: false,
      searchTerm: ''
    };
  }

  // Rule 1: Type prefix like "ideas about travel", "links about javascript", "snippets about react"
  const typeAboutRegex = /^(ideas?|links?|notes?|snippets?)\s+(?:about|on|for|regarding)\s+(.+)$/i;
  const typeAboutMatch = input.match(typeAboutRegex);
  if (typeAboutMatch) {
    let typeKey = typeAboutMatch[1].toLowerCase();
    if (typeKey.endsWith('s')) typeKey = typeKey.slice(0, -1);
    const searchTerm = typeAboutMatch[2].trim();

    return {
      isSmartRule: true,
      ruleType: 'type-search',
      explanation: `Showing ${typeKey.toUpperCase()} captures matching "${searchTerm}"`,
      filterType: typeKey,
      filterTag: null,
      pinnedOnly: false,
      searchTerm
    };
  }

  // Rule 2: Explicit "tag:<tagname>"
  const tagRegex = /^tag:\s*([a-zA-Z0-9_-]+)(?:\s+(.*))?$/i;
  const tagMatch = input.match(tagRegex);
  if (tagMatch) {
    const tagName = tagMatch[1].toLowerCase();
    const rest = (tagMatch[2] || '').trim();

    return {
      isSmartRule: true,
      ruleType: 'tag-filter',
      explanation: `Filtered to tag #${tagName}${rest ? ` and matching "${rest}"` : ''}`,
      filterType: null,
      filterTag: tagName,
      pinnedOnly: false,
      searchTerm: rest
    };
  }

  // Rule 3: Pinned captures "pinned <term>" or simply "pinned"
  const pinnedRegex = /^pinned(?:\s+(.+))?$/i;
  const pinnedMatch = input.match(pinnedRegex);
  if (pinnedMatch) {
    const searchTerm = (pinnedMatch[1] || '').trim();
    return {
      isSmartRule: true,
      ruleType: 'pinned-filter',
      explanation: `Showing pinned captures${searchTerm ? ` matching "${searchTerm}"` : ''}`,
      filterType: null,
      filterTag: null,
      pinnedOnly: true,
      searchTerm
    };
  }

  // Rule 4: Type only like "ideas", "notes", "links", "snippets"
  const singleTypeRegex = /^(ideas|notes|links|snippets)$/i;
  const singleTypeMatch = input.match(singleTypeRegex);
  if (singleTypeMatch) {
    let typeKey = singleTypeMatch[1].toLowerCase();
    if (typeKey.endsWith('s')) typeKey = typeKey.slice(0, -1);
    return {
      isSmartRule: true,
      ruleType: 'type-filter',
      explanation: `Showing all ${typeKey.toUpperCase()} captures`,
      filterType: typeKey,
      filterTag: null,
      pinnedOnly: false,
      searchTerm: ''
    };
  }

  // Default fallback: normal keyword search
  return {
    isSmartRule: false,
    ruleType: 'keyword',
    explanation: null,
    filterType: null,
    filterTag: null,
    pinnedOnly: false,
    searchTerm: input
  };
}

/**
 * Executes smart search combining rule parsing and ranking.
 */
export function executeSmartSearch(items, rawInput) {
  const parsed = parseSmartSearch(rawInput);

  let pool = [...items];

  // Apply rule-based filters
  if (parsed.pinnedOnly) {
    pool = pool.filter(i => i.isPinned);
  }
  if (parsed.filterType) {
    pool = pool.filter(i => i.type === parsed.filterType);
  }
  if (parsed.filterTag) {
    pool = pool.filter(i => i.tags.includes(parsed.filterTag));
  }

  // Apply search term if present
  let results;
  if (parsed.searchTerm) {
    results = searchKeyword(pool, parsed.searchTerm);
  } else {
    results = pool;
  }

  return {
    parsed,
    results,
    totalMatches: results.length
  };
}
