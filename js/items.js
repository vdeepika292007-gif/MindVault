/**
 * MindVault Items Module
 * Handles capture creation, validation, modification, tagging,
 * pinning, archiving, filtering, and sorting.
 */

import { generateId, normalizeItem } from './storage.js';

export const VALID_TYPES = ['note', 'idea', 'link', 'snippet'];

/**
 * Validates item fields before creation or update.
 * Returns { valid: boolean, errors: Record<string, string> }
 */
export function validateItemFields({ title, content, type, url, tags }) {
  const errors = {};

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (!trimmedTitle) {
    errors.title = 'Title is required.';
  } else if (trimmedTitle.length > 200) {
    errors.title = 'Title must be 200 characters or fewer.';
  }

  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  if (!trimmedContent) {
    errors.content = 'Content is required.';
  }

  if (type && !VALID_TYPES.includes(type)) {
    errors.type = `Type must be one of: ${VALID_TYPES.join(', ')}.`;
  }

  const trimmedUrl = typeof url === 'string' ? url.trim() : '';
  if (trimmedUrl) {
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        errors.url = 'URL must begin with http:// or https://.';
      }
    } catch (_) {
      errors.url = 'Please enter a valid web URL (e.g., https://example.com).';
    }
  } else if (type === 'link') {
    errors.url = 'Link captures require a valid web URL.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Creates a new capture item object.
 */
export function createItem({ title, content, type = 'note', url = '', tags = [], isPinned = false }) {
  const validation = validateItemFields({ title, content, type, url, tags });
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const normalizedTags = parseTags(tags);
  const now = new Date().toISOString();

  const newItem = {
    id: generateId(),
    title: title.trim(),
    content: content.trim(),
    type: VALID_TYPES.includes(type) ? type : 'note',
    url: url ? url.trim() : '',
    tags: normalizedTags,
    isPinned: Boolean(isPinned),
    isArchived: false,
    createdAt: now,
    updatedAt: now
  };

  return { success: true, item: newItem };
}

/**
 * Updates an existing item.
 */
export function updateItem(existingItem, updates) {
  if (!existingItem) {
    return { success: false, errors: { general: 'Item not found.' } };
  }

  const merged = {
    ...existingItem,
    ...updates
  };

  const validation = validateItemFields({
    title: merged.title,
    content: merged.content,
    type: merged.type,
    url: merged.url,
    tags: merged.tags
  });

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const updated = {
    ...merged,
    title: merged.title.trim(),
    content: merged.content.trim(),
    url: merged.url ? merged.url.trim() : '',
    tags: parseTags(merged.tags),
    isPinned: Boolean(merged.isPinned),
    isArchived: Boolean(merged.isArchived),
    updatedAt: new Date().toISOString()
  };

  return { success: true, item: updated };
}

/**
 * Parses and normalizes tags from arrays, strings, or comma-separated lists.
 */
export function parseTags(input) {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map(t => String(t).trim().toLowerCase().replace(/^#+/, ''))
          .filter(t => t.length > 0 && t.length <= 30)
      )
    );
  }

  if (typeof input === 'string') {
    return Array.from(
      new Set(
        input
          .split(/[\s,]+/)
          .map(t => t.trim().toLowerCase().replace(/^#+/, ''))
          .filter(t => t.length > 0 && t.length <= 30)
      )
    );
  }

  return [];
}

/**
 * Filters items based on type, tag, archive status, and pinned status.
 */
export function filterItems(items, { type = 'all', tag = null, status = 'active', pinnedOnly = false } = {}) {
  return items.filter(item => {
    // Status filter
    if (status === 'active' && item.isArchived) return false;
    if (status === 'archived' && !item.isArchived) return false;

    // Pinned filter
    if (pinnedOnly && !item.isPinned) return false;

    // Type filter
    if (type !== 'all' && item.type !== type) return false;

    // Tag filter
    if (tag && !item.tags.includes(tag.toLowerCase())) return false;

    return true;
  });
}

/**
 * Sorts items according to criteria, preserving pinned priority when requested.
 */
export function sortItems(items, sortBy = 'newest', keepPinnedOnTop = true) {
  const list = [...items];

  list.sort((a, b) => {
    if (keepPinnedOnTop && a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return list;
}

/**
 * Computes vault statistics for dashboard overview.
 */
export function computeStats(items) {
  const activeItems = items.filter(i => !i.isArchived);
  const archivedItems = items.filter(i => i.isArchived);

  const byType = {
    note: 0,
    idea: 0,
    link: 0,
    snippet: 0
  };

  const tagCounts = {};

  activeItems.forEach(item => {
    if (byType[item.type] !== undefined) {
      byType[item.type]++;
    }
    item.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const pinnedCount = activeItems.filter(i => i.isPinned).length;

  // Sorted list of top tags
  const tagsList = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    totalActive: activeItems.length,
    totalArchived: archivedItems.length,
    pinnedCount,
    byType,
    tagCounts,
    tagsList
  };
}

/**
 * Finds related captures for a given item based on shared tags and content keywords.
 */
export function findRelatedItems(currentItem, allItems, maxResults = 3) {
  if (!currentItem || !Array.isArray(allItems)) return [];

  const candidates = allItems.filter(i => !i.isArchived && i.id !== currentItem.id);
  const currentTags = new Set((currentItem.tags || []).map(t => t.toLowerCase()));

  // Extract meaningful tokens from current item (length >= 4)
  const currentWords = new Set(
    `${currentItem.title} ${currentItem.content}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4)
  );

  const scored = [];

  for (const candidate of candidates) {
    let score = 0;
    const sharedTags = [];

    // Tag matching (highest relevance)
    for (const tag of (candidate.tags || [])) {
      if (currentTags.has(tag.toLowerCase())) {
        score += 15;
        sharedTags.push(tag);
      }
    }

    // Token matching
    const candidateWords = `${candidate.title} ${candidate.content}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4);

    let sharedWordsCount = 0;
    for (const word of candidateWords) {
      if (currentWords.has(word)) {
        sharedWordsCount++;
        score += 2;
        if (sharedWordsCount >= 5) break; // Cap word score
      }
    }

    if (candidate.type === currentItem.type) {
      score += 1;
    }

    if (score >= 4) {
      scored.push({
        item: candidate,
        score,
        sharedTags,
        reason: sharedTags.length > 0
          ? `Shares #${sharedTags.slice(0, 2).join(', #')}`
          : 'Shares related concepts'
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

