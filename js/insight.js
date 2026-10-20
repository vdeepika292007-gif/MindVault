/**
 * MindVault Daily Insight Module
 * Deterministic daily rediscovery engine seeded by the local calendar date.
 * Surfaces connected pairs with rich contextual explanations, shared tag highlights,
 * and actionable connection exploration.
 */

import { tokenize } from './search.js';

// Common stop words to exclude when finding meaningful shared tokens
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'your', 'have', 'more',
  'will', 'about', 'when', 'what', 'into', 'some', 'than', 'them', 'then', 'they',
  'were', 'been', 'also', 'each', 'make', 'like', 'time', 'just', 'know', 'take',
  'which', 'their', 'only', 'come', 'could', 'look', 'good', 'first', 'even',
  'note', 'capture', 'item', 'idea', 'link', 'code', 'snippet', 'using', 'used',
  'such', 'over', 'well', 'both', 'between', 'before', 'after', 'under'
]);

/**
 * Returns YYYY-MM-DD for the current user locale/date.
 */
export function getTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic integer hash of a string.
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates an articulate, human-friendly explanation of why two captures connect.
 */
function composeConnectionNarrative(itemA, itemB, sharedTags, sharedTokens) {
  const titleA = itemA.title;
  const titleB = itemB.title;

  if (sharedTags.length >= 2) {
    return `Your “${titleA}” and “${titleB}” captures both focus on #${sharedTags[0]} and #${sharedTags[1]} — connecting foundational theory with practical application.`;
  }

  if (sharedTags.length === 1) {
    const tag = sharedTags[0];
    const extraContext = sharedTokens.length > 0 ? ` with mutual emphasis on "${sharedTokens[0]}"` : '';
    return `Your “${titleA}” and “${titleB}” notes both explore #${tag}${extraContext}, offering complementary insights across your vault.`;
  }

  if (sharedTokens.length >= 2) {
    return `Your “${titleA}” and “${titleB}” notes both explore "${sharedTokens[0]}" and "${sharedTokens[1]}" — bridging your ${itemA.type} and ${itemB.type} captures.`;
  }

  const token = sharedTokens[0] || 'shared themes';
  return `Your “${titleA}” and “${titleB}” captures intersect around "${token}", revealing related concepts captured at different times.`;
}

/**
 * Finds all pairs of items that share at least one tag or meaningful keyword.
 */
function findConnectedPairs(items) {
  const pairs = [];

  for (let i = 0; i < items.length; i++) {
    const itemA = items[i];
    const tokensA = new Set(
      tokenize(`${itemA.title} ${itemA.content}`).filter(t => t.length >= 4 && !STOP_WORDS.has(t))
    );

    for (let j = i + 1; j < items.length; j++) {
      const itemB = items[j];

      // Check shared tags
      const sharedTags = (itemA.tags || []).filter(t => (itemB.tags || []).includes(t));

      // Check shared tokens
      const tokensB = tokenize(`${itemB.title} ${itemB.content}`).filter(t => t.length >= 4 && !STOP_WORDS.has(t));
      const sharedTokens = tokensB.filter(t => tokensA.has(t));

      if (sharedTags.length > 0 || sharedTokens.length > 0) {
        const narrative = composeConnectionNarrative(itemA, itemB, sharedTags, sharedTokens);
        pairs.push({
          itemA,
          itemB,
          sharedTags,
          sharedTokens,
          connectionType: sharedTags.length > 0 ? 'tag' : 'keyword',
          connectionValue: sharedTags[0] || sharedTokens[0] || 'concept',
          narrative,
          reason: narrative
        });
      }
    }
  }

  return pairs;
}

/**
 * Computes deterministic daily insight.
 * Guarantees that on the same calendar day, the same vault content produces
 * the exact same daily insight.
 */
export function generateDailyInsight(items, dateStr = getTodayKey()) {
  const activeItems = (items || []).filter(i => !i.isArchived);
  const seed = hashString(dateStr);

  // Case 1: Empty vault
  if (activeItems.length === 0) {
    return {
      date: dateStr,
      type: 'empty',
      headline: 'Begin Your Knowledge Vault',
      narrative: 'Your vault is currently empty. Capture your first note, idea, link, or snippet to unlock daily rediscovery and smart connections.',
      explanation: 'Your vault is currently empty. Capture your first note, idea, link, or snippet to unlock daily rediscovery.',
      items: [],
      sharedTags: [],
      sharedTokens: []
    };
  }

  // Case 2: Only 1 capture exists
  if (activeItems.length === 1) {
    const item = activeItems[0];
    return {
      date: dateStr,
      type: 'single',
      headline: 'Foundational Knowledge Spark',
      narrative: `You have 1 capture: “${item.title}”. Add a second note with shared tags to allow MindVault to discover unexpected relationships.`,
      explanation: 'You have one foundational capture. Add another thought or tag to begin discovering connections.',
      items: [item],
      sharedTags: item.tags || [],
      sharedTokens: []
    };
  }

  // Case 3: 2 or more captures - check for connected pairs
  const connectedPairs = findConnectedPairs(activeItems);
  if (connectedPairs.length > 0) {
    // Sort deterministically by id combination so order is stable
    connectedPairs.sort((a, b) => {
      const keyA = `${a.itemA.id}:${a.itemB.id}`;
      const keyB = `${b.itemA.id}:${b.itemB.id}`;
      return keyA.localeCompare(keyB);
    });

    const chosenIndex = seed % connectedPairs.length;
    const chosen = connectedPairs[chosenIndex];

    return {
      date: dateStr,
      type: 'pair',
      headline: 'Connected Knowledge Insight',
      narrative: chosen.narrative,
      explanation: chosen.narrative,
      connectionValue: chosen.connectionValue,
      connectionType: chosen.connectionType,
      sharedTags: chosen.sharedTags,
      sharedTokens: chosen.sharedTokens,
      items: [chosen.itemA, chosen.itemB],
      itemA: chosen.itemA,
      itemB: chosen.itemB
    };
  }

  // Case 4: No connected pairs found - resurface an older item
  const todayStart = new Date(dateStr).getTime();
  const olderItems = activeItems.filter(item => {
    const updatedTime = new Date(item.updatedAt).getTime();
    return updatedTime < todayStart;
  });

  const candidatePool = olderItems.length > 0 ? olderItems : activeItems;
  // Sort candidate pool by createdAt ascending (older items first)
  candidatePool.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const chosenIndex = seed % candidatePool.length;
  const chosenItem = candidatePool[chosenIndex];

  const createdDate = new Date(chosenItem.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return {
    date: dateStr,
    type: 'resurface',
    headline: 'Rediscovered Thought',
    narrative: `Originally captured on ${createdDate}. Revisit “${chosenItem.title}” to see if new insights or tags have emerged since you saved it.`,
    explanation: `Saved on ${createdDate}. Revisit this capture to see if new insights have emerged.`,
    items: [chosenItem],
    itemA: chosenItem,
    sharedTags: chosenItem.tags || [],
    sharedTokens: [],
    reason: `Originally captured ${createdDate}`
  };
}
