/**
 * MindVault Storage Module
 * Manages versioned localStorage persistence, defensive parsing, migrations,
 * export/import, and safe corruption recovery.
 */

const STORAGE_KEY = 'mindvault:v1';
const SCHEMA_VERSION = 1;
const CORRUPT_BACKUP_PREFIX = 'mindvault:corrupt_backup:';

/**
 * Seed items provided on initial empty vault so users can immediately
 * experience search, daily insights, and local Q&A.
 */
export const SAMPLE_ITEMS = [
  {
    id: 'mv-seed-01',
    title: 'Cognitive Load and Interface Design',
    content: 'When designing user interfaces, minimize extraneous cognitive load. Group related actions, use progressive disclosure, and ensure default states are intuitive without requiring manual configuration.',
    type: 'note',
    url: '',
    tags: ['design', 'ux', 'psychology'],
    isPinned: true,
    isArchived: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'mv-seed-02',
    title: 'Offline-First Second Brain Concept',
    content: 'Explore an offline-first architecture where personal knowledge remains 100% on-device. Local text indexing handles fast search, while an optional opt-in sync server preserves end-to-end encryption.',
    type: 'idea',
    url: '',
    tags: ['architecture', 'privacy', 'ideas'],
    isPinned: true,
    isArchived: false,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'mv-seed-03',
    title: 'MDN Web Docs: Web Storage API Reference',
    content: 'Comprehensive documentation on localStorage, sessionStorage, storage event listeners, and quota limits across modern desktop and mobile browsers.',
    type: 'link',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API',
    tags: ['web', 'reference', 'javascript'],
    isPinned: false,
    isArchived: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'mv-seed-04',
    title: 'Deterministic Seed Generator for Daily Rediscovery',
    content: 'function getDaySeed(dateStr) {\n  let hash = 0;\n  for (let i = 0; i < dateStr.length; i++) {\n    hash = (hash << 5) - hash + dateStr.charCodeAt(i);\n    hash |= 0;\n  }\n  return Math.abs(hash);\n}',
    type: 'snippet',
    url: '',
    tags: ['javascript', 'algorithm', 'snippet'],
    isPinned: false,
    isArchived: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'mv-seed-05',
    title: 'Building Honest AI Boundaries in Client Apps',
    content: 'Always distinguish between local deterministic algorithms (like regex, token scoring, and rule heuristics) versus real large language models. Transparent interfaces build long-term user trust.',
    type: 'note',
    url: '',
    tags: ['ai', 'transparency', 'ux'],
    isPinned: false,
    isArchived: false,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

export function getInitialModel() {
  return {
    schemaVersion: SCHEMA_VERSION,
    items: [...SAMPLE_ITEMS],
    settings: {
      theme: 'light',
      lastInsightDate: ''
    }
  };
}

/**
 * Validates and normalizes an item object.
 */
export function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const validTypes = ['note', 'idea', 'link', 'snippet'];
  const type = validTypes.includes(raw.type) ? raw.type : 'note';

  const tags = Array.isArray(raw.tags)
    ? Array.from(new Set(raw.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)))
    : [];

  const now = new Date().toISOString();

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : generateId(),
    title: typeof raw.title === 'string' ? raw.title.trim() : 'Untitled',
    content: typeof raw.content === 'string' ? raw.content.trim() : '',
    type,
    url: typeof raw.url === 'string' ? raw.url.trim() : '',
    tags,
    isPinned: Boolean(raw.isPinned),
    isArchived: Boolean(raw.isArchived),
    createdAt: raw.createdAt && !isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : now,
    updatedAt: raw.updatedAt && !isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : now
  };
}

export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'mv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Loads data from localStorage with defensive parsing and corrupt recovery.
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialModel();
      saveData(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid root JSON structure');
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items.map(normalizeItem).filter(Boolean)
      : [];

    const settings = (parsed.settings && typeof parsed.settings === 'object')
      ? {
          theme: parsed.settings.theme === 'dark' ? 'dark' : 'light',
          lastInsightDate: String(parsed.settings.lastInsightDate || '')
        }
      : { theme: 'light', lastInsightDate: '' };

    return {
      schemaVersion: SCHEMA_VERSION,
      items,
      settings
    };
  } catch (err) {
    console.error('MindVault storage load error. Creating safety backup:', err);
    try {
      const corruptRaw = localStorage.getItem(STORAGE_KEY);
      if (corruptRaw) {
        localStorage.setItem(CORRUPT_BACKUP_PREFIX + Date.now(), corruptRaw);
      }
    } catch (e) {
      // Ignore backup error
    }
    const fresh = getInitialModel();
    saveData(fresh);
    return fresh;
  }
}

/**
 * Persists the entire state model to localStorage.
 */
export function saveData(data) {
  try {
    if (!data || !Array.isArray(data.items)) {
      throw new Error('Attempted to save invalid data structure');
    }

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      items: data.items.map(normalizeItem).filter(Boolean),
      settings: data.settings || { theme: 'light', lastInsightDate: '' }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
    return false;
  }
}

/**
 * Triggers a client-side JSON export download.
 */
export function exportDataAsJson(data) {
  try {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      items: data.items,
      settings: data.settings
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    const a = document.createElement('a');
    a.href = url;
    a.download = `mindvault-export-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('Failed to export JSON:', e);
    return false;
  }
}

/**
 * Validates and imports JSON data string into current vault.
 */
export function importDataFromJson(jsonStr, replaceExisting = false, currentData) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.items)) {
      return { success: false, error: 'File must contain an "items" array.' };
    }

    const importedItems = parsed.items.map(normalizeItem).filter(Boolean);
    if (importedItems.length === 0) {
      return { success: false, error: 'No valid captures found in the file.' };
    }

    let finalItems;
    if (replaceExisting) {
      finalItems = importedItems;
    } else {
      const existingMap = new Map((currentData.items || []).map(i => [i.id, i]));
      for (const item of importedItems) {
        if (existingMap.has(item.id)) {
          // If collision, assign a fresh ID to preserve both
          item.id = generateId();
        }
        existingMap.set(item.id, item);
      }
      finalItems = Array.from(existingMap.values());
    }

    const newData = {
      ...currentData,
      items: finalItems
    };

    saveData(newData);
    return { success: true, count: importedItems.length, data: newData };
  } catch (e) {
    return { success: false, error: 'Invalid JSON format: ' + e.message };
  }
}

/**
 * Safely resets vault with pre-reset local backup.
 */
export function resetStorage(currentData) {
  try {
    // Save backup before clearing
    const backupKey = `mindvault:backup:pre_reset_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(currentData));

    const cleanModel = {
      schemaVersion: SCHEMA_VERSION,
      items: [],
      settings: {
        theme: currentData.settings?.theme || 'light',
        lastInsightDate: ''
      }
    };
    saveData(cleanModel);
    return { success: true, backupKey };
  } catch (e) {
    console.error('Failed to reset storage:', e);
    return { success: false, error: e.message };
  }
}
