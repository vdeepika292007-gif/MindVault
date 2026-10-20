/**
 * MindVault Application Controller
 * Coordinates application state, event routing, modals, search with highlighting,
 * filters, daily rediscovery with rich connection exploration, related notes,
 * local Q&A, and fast keyboard workflows.
 */

import {
  loadData,
  saveData,
  exportDataAsJson,
  importDataFromJson,
  resetStorage,
  SAMPLE_ITEMS
} from './storage.js';

import {
  createItem,
  updateItem,
  filterItems,
  sortItems,
  computeStats,
  parseTags,
  findRelatedItems
} from './items.js';

import {
  executeSmartSearch,
  tokenize,
  highlightMatches
} from './search.js';

import {
  generateDailyInsight,
  getTodayKey
} from './insight.js';

import {
  askMindVault
} from './ask.js';

import {
  AiAdapter
} from './aiAdapter.js';

import {
  createCaptureCard,
  renderRelatedCaptures,
  renderTagCloud,
  showToast,
  formatDate,
  ModalManager
} from './ui.js';

// Global application state
const AppState = {
  vaultData: null,
  currentView: 'dashboard',
  libraryFilters: {
    search: '',
    type: 'all',
    tag: '',
    status: 'active',
    sort: 'newest',
    layout: 'grid'
  },
  activeFormTags: [],
  activeDetailItemId: null,
  activeDeleteItemId: null,
  currentDailyInsight: null
};

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  AppState.vaultData = loadData();
  applyTheme(AppState.vaultData.settings?.theme || 'light');
  setupNavigation();
  setupStatCards();
  setupThemeToggle();
  setupCaptureForm();
  setupLibraryControls();
  setupAskForm();
  setupSettingsModal();
  setupConnectionModal();
  setupAiArchitectureSimulator();
  setupKeyboardShortcuts();

  // Initial renders
  renderDashboard();
  renderLibrary();
});

// ============================================================================
// Theme Management
// ============================================================================
function applyTheme(theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark';
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  if (sunIcon && moonIcon) {
    sunIcon.style.display = isDark ? 'none' : 'block';
    moonIcon.style.display = isDark ? 'block' : 'none';
  }

  if (AppState.vaultData) {
    if (!AppState.vaultData.settings) AppState.vaultData.settings = {};
    AppState.vaultData.settings.theme = theme;
    saveData(AppState.vaultData);
  }
}

function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(`Switched to ${next === 'dark' ? 'Dark Obsidian' : 'Warm Paper'} theme`);
  });
}

// ============================================================================
// View Navigation
// ============================================================================
function navigateTo(viewName) {
  AppState.currentView = viewName;

  // Toggle nav buttons
  document.querySelectorAll('.site-nav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Toggle sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${viewName}`);
  });

  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'library') {
    renderLibrary();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
  document.querySelectorAll('.site-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  const homeLink = document.getElementById('brand-home-link');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('dashboard');
    });
  }

  // Dashboard quick links to library
  const viewPinnedBtn = document.getElementById('dashboard-view-all-pinned-btn');
  if (viewPinnedBtn) {
    viewPinnedBtn.addEventListener('click', () => {
      AppState.libraryFilters.search = 'pinned';
      const searchInput = document.getElementById('library-search-input');
      if (searchInput) searchInput.value = 'pinned';
      navigateTo('library');
    });
  }

  const viewRecentBtn = document.getElementById('dashboard-view-all-recent-btn');
  if (viewRecentBtn) {
    viewRecentBtn.addEventListener('click', () => {
      AppState.libraryFilters.search = '';
      AppState.libraryFilters.type = 'all';
      AppState.libraryFilters.tag = '';
      AppState.libraryFilters.sort = 'newest';
      navigateTo('library');
    });
  }
}

// ============================================================================
// Priority 5: Clickable Stat Cards for Filtering
// ============================================================================
function setupStatCards() {
  document.querySelectorAll('.stat-card.clickable').forEach(card => {
    const handleFilter = () => {
      const filterType = card.dataset.filterType;
      const isPinned = card.dataset.filterPinned;

      if (isPinned) {
        AppState.libraryFilters.search = 'pinned';
        AppState.libraryFilters.type = 'all';
        const searchInput = document.getElementById('library-search-input');
        if (searchInput) searchInput.value = 'pinned';
      } else if (filterType) {
        AppState.libraryFilters.search = '';
        AppState.libraryFilters.type = filterType;
        const searchInput = document.getElementById('library-search-input');
        if (searchInput) searchInput.value = '';

        document.querySelectorAll('.type-filter-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.type === filterType);
        });
      }

      AppState.libraryFilters.status = 'active';
      document.getElementById('status-btn-active')?.classList.add('active');
      document.getElementById('status-btn-archived')?.classList.remove('active');

      navigateTo('library');
    };

    card.addEventListener('click', handleFilter);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFilter();
      }
    });
  });
}

// ============================================================================
// Dashboard View Rendering
// ============================================================================
function renderDashboard() {
  const items = AppState.vaultData.items;
  const stats = computeStats(items);

  // Update stat cards
  const elActive = document.getElementById('stat-active-count');
  const elNotes = document.getElementById('stat-notes-count');
  const elIdeas = document.getElementById('stat-ideas-count');
  const elLinks = document.getElementById('stat-links-count');
  const elSnippets = document.getElementById('stat-snippets-count');
  const elPinned = document.getElementById('stat-pinned-count');

  if (elActive) elActive.textContent = stats.totalActive;
  if (elNotes) elNotes.textContent = stats.byType.note;
  if (elIdeas) elIdeas.textContent = stats.byType.idea;
  if (elLinks) elLinks.textContent = stats.byType.link;
  if (elSnippets) elSnippets.textContent = stats.byType.snippet;
  if (elPinned) elPinned.textContent = stats.pinnedCount;

  // Render Daily Rediscovery Insight
  renderDailyInsight();

  // Render Pinned Captures (Visually distinct: amber border & pin badge)
  const pinnedContainer = document.getElementById('dashboard-pinned-container');
  if (pinnedContainer) {
    pinnedContainer.innerHTML = '';
    const pinnedItems = items.filter(i => !i.isArchived && i.isPinned).slice(0, 4);

    if (pinnedItems.length === 0) {
      const p = document.createElement('p');
      p.style.fontSize = '0.85rem';
      p.style.color = 'var(--text-muted)';
      p.textContent = 'No pinned captures yet. Click the pin icon on any card to keep key thoughts top of mind.';
      pinnedContainer.appendChild(p);
    } else {
      pinnedItems.forEach(item => {
        pinnedContainer.appendChild(createCaptureCard(item, getCardCallbacks()));
      });
    }
  }

  // Render Recent Captures (Visually distinct: chronological timestamp)
  const recentContainer = document.getElementById('dashboard-recent-container');
  if (recentContainer) {
    recentContainer.innerHTML = '';
    const recentItems = sortItems(items.filter(i => !i.isArchived), 'newest', false).slice(0, 4);

    if (recentItems.length === 0) {
      const p = document.createElement('p');
      p.style.fontSize = '0.85rem';
      p.style.color = 'var(--text-muted)';
      p.textContent = 'Your vault is empty. Capture your first thought to begin.';
      recentContainer.appendChild(p);
    } else {
      recentItems.forEach(item => {
        recentContainer.appendChild(createCaptureCard(item, getCardCallbacks()));
      });
    }
  }

  // Render Tag Cloud
  const tagCloud = document.getElementById('dashboard-tags-cloud');
  if (tagCloud) {
    renderTagCloud(tagCloud, stats.tagsList, (tag) => {
      AppState.libraryFilters.tag = tag;
      const tagSelect = document.getElementById('library-tag-select');
      if (tagSelect) tagSelect.value = tag;
      navigateTo('library');
    });
  }
}

/**
 * Priority 1: Meaningful Daily Insight Rendering with Actions
 */
function renderDailyInsight() {
  const insight = generateDailyInsight(AppState.vaultData.items);
  AppState.currentDailyInsight = insight;

  const headlineEl = document.getElementById('daily-insight-headline');
  const narrativeEl = document.getElementById('daily-insight-narrative');
  const dateEl = document.getElementById('daily-insight-date');
  const actionsBar = document.getElementById('daily-insight-actions');
  const container = document.getElementById('daily-insight-items-container');

  if (headlineEl) headlineEl.textContent = insight.headline;
  if (narrativeEl) narrativeEl.textContent = insight.narrative;
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Actions bar visibility & click handlers
  if (actionsBar) {
    if (insight.type === 'pair') {
      actionsBar.style.display = 'flex';
    } else {
      actionsBar.style.display = 'none';
    }
  }

  const btnExplore = document.getElementById('btn-explore-connection');
  const btnOpenBoth = document.getElementById('btn-open-both-notes');

  if (btnExplore) {
    btnExplore.onclick = () => openConnectionModal(insight);
  }
  if (btnOpenBoth) {
    btnOpenBoth.onclick = () => openConnectionModal(insight);
  }

  if (container) {
    container.innerHTML = '';
    if (insight.items && insight.items.length > 0) {
      insight.items.forEach(item => {
        container.appendChild(createCaptureCard(item, getCardCallbacks()));
      });
    } else {
      const emptyPrompt = document.createElement('div');
      emptyPrompt.style.padding = '1rem';
      emptyPrompt.style.fontSize = '0.9rem';
      emptyPrompt.style.color = 'var(--text-muted)';
      emptyPrompt.innerHTML = '✨ Click the <strong>+ Capture</strong> button in the top bar to record your first note.';
      container.appendChild(emptyPrompt);
    }
  }
}

// ============================================================================
// Priority 1: Connection Modal (Dual View)
// ============================================================================
function setupConnectionModal() {
  const closeBtn = document.getElementById('modal-connection-close-btn');
  const footerCloseBtn = document.getElementById('modal-connection-close-footer-btn');

  if (closeBtn) closeBtn.addEventListener('click', () => ModalManager.close('modal-connection'));
  if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => ModalManager.close('modal-connection'));
}

function openConnectionModal(insight) {
  if (!insight || !insight.itemA || !insight.itemB) return;

  const narrativeBox = document.getElementById('modal-connection-narrative');
  const dualGrid = document.getElementById('modal-connection-dual-grid');

  if (narrativeBox) {
    narrativeBox.textContent = insight.narrative;
  }

  if (dualGrid) {
    dualGrid.innerHTML = '';

    const createDualCard = (item) => {
      const el = document.createElement('div');
      el.className = 'connection-dual-card';

      const typeBadge = document.createElement('span');
      typeBadge.className = `card-type-badge ${item.type}`;
      typeBadge.textContent = item.type;
      el.appendChild(typeBadge);

      const title = document.createElement('h3');
      title.className = 'connection-dual-title';
      title.textContent = item.title;
      el.appendChild(title);

      const content = document.createElement('div');
      content.className = 'connection-dual-content';
      content.textContent = item.content;
      el.appendChild(content);

      const btnRow = document.createElement('div');
      btnRow.style.marginTop = 'auto';
      btnRow.style.display = 'flex';
      btnRow.style.gap = '0.5rem';

      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'btn btn-secondary btn-sm';
      viewBtn.textContent = 'Open Full Note';
      viewBtn.addEventListener('click', () => {
        ModalManager.close('modal-connection');
        openDetailModal(item.id);
      });
      btnRow.appendChild(viewBtn);

      el.appendChild(btnRow);
      return el;
    };

    dualGrid.appendChild(createDualCard(insight.itemA));
    dualGrid.appendChild(createDualCard(insight.itemB));
  }

  ModalManager.open('modal-connection');
}

// ============================================================================
// Library View Rendering & Filtering
// ============================================================================
function renderLibrary() {
  const items = AppState.vaultData.items;
  const filters = AppState.libraryFilters;

  // 1. Execute smart search or standard pool
  let searchResult;
  if (filters.search) {
    searchResult = executeSmartSearch(items, filters.search);
  } else {
    searchResult = {
      parsed: { isSmartRule: false },
      results: [...items],
      totalMatches: items.length
    };
  }

  // Update Smart Rule Banner
  const banner = document.getElementById('smart-rule-banner');
  const ruleText = document.getElementById('smart-rule-text');
  if (banner && ruleText) {
    if (searchResult.parsed.isSmartRule) {
      banner.classList.add('visible');
      ruleText.textContent = `⚡ Smart Rule: ${searchResult.parsed.explanation}`;
    } else {
      banner.classList.remove('visible');
    }
  }

  // 2. Apply type, tag, status filters
  let filtered = filterItems(searchResult.results, {
    type: filters.type,
    tag: filters.tag || null,
    status: filters.status
  });

  // 3. Sort items
  const sorted = sortItems(filtered, filters.sort, filters.status === 'active');

  // 4. Update Result Count Text
  const countText = document.getElementById('results-count-text');
  if (countText) {
    countText.textContent = `Showing ${sorted.length} ${filters.status} ${sorted.length === 1 ? 'capture' : 'captures'}`;
  }

  // 5. Update Type Count Badges
  updateTypeBadges(items, filters.status);

  // 6. Update Tag Select Options
  updateTagSelectOptions(items);

  // 7. Render Items or Empty State with Search Highlighting
  const container = document.getElementById('library-items-container');
  const emptyState = document.getElementById('library-empty-state');

  const searchTokens = filters.search ? tokenize(searchResult.parsed.searchTerm || filters.search) : [];

  if (container) {
    container.className = `items-container ${filters.layout === 'list' ? 'list-view' : 'grid-view'}`;
    container.innerHTML = '';

    if (sorted.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      const emptyTitle = document.getElementById('library-empty-title');
      const emptyDesc = document.getElementById('library-empty-desc');
      if (filters.search) {
        if (emptyTitle) emptyTitle.textContent = 'No matching captures found';
        if (emptyDesc) emptyDesc.textContent = `No captures matched "${filters.search}". Check your spelling, try searching by tag like "tag:ux", or capture a new thought.`;
      } else if (filters.status === 'archived') {
        if (emptyTitle) emptyTitle.textContent = 'No archived captures';
        if (emptyDesc) emptyDesc.textContent = 'You have not archived any captures yet.';
      } else {
        if (emptyTitle) emptyTitle.textContent = 'Your library is empty';
        if (emptyDesc) emptyDesc.textContent = 'Start by capturing your first thought, idea, link, or code snippet.';
      }
    } else {
      if (emptyState) emptyState.style.display = 'none';
      sorted.forEach(item => {
        container.appendChild(createCaptureCard(item, getCardCallbacks(), searchTokens));
      });
    }
  }
}

function updateTypeBadges(items, status) {
  const currentPool = items.filter(i => (status === 'active' ? !i.isArchived : i.isArchived));
  const counts = { all: currentPool.length, note: 0, idea: 0, link: 0, snippet: 0 };
  currentPool.forEach(i => {
    if (counts[i.type] !== undefined) counts[i.type]++;
  });

  const elAll = document.getElementById('type-count-all');
  const elNote = document.getElementById('type-count-note');
  const elIdea = document.getElementById('type-count-idea');
  const elLink = document.getElementById('type-count-link');
  const elSnippet = document.getElementById('type-count-snippet');

  if (elAll) elAll.textContent = `(${counts.all})`;
  if (elNote) elNote.textContent = `(${counts.note})`;
  if (elIdea) elIdea.textContent = `(${counts.idea})`;
  if (elLink) elLink.textContent = `(${counts.link})`;
  if (elSnippet) elSnippet.textContent = `(${counts.snippet})`;
}

function updateTagSelectOptions(items) {
  const select = document.getElementById('library-tag-select');
  if (!select) return;

  const currentVal = AppState.libraryFilters.tag;
  const allTags = new Set();
  items.forEach(i => (i.tags || []).forEach(t => allTags.add(t)));
  const sortedTags = Array.from(allTags).sort();

  select.innerHTML = '<option value="">All Tags</option>';
  sortedTags.forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = `#${tag}`;
    if (tag === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function setupLibraryControls() {
  const searchInput = document.getElementById('library-search-input');
  const clearBtn = document.getElementById('library-search-clear-btn');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      AppState.libraryFilters.search = searchInput.value.trim();
      if (clearBtn) {
        clearBtn.classList.toggle('visible', searchInput.value.length > 0);
      }
      renderLibrary();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      clearBtn.classList.remove('visible');
      AppState.libraryFilters.search = '';
      renderLibrary();
      if (searchInput) searchInput.focus();
    });
  }

  // Smart search hint chips
  document.querySelectorAll('.smart-search-hints .hint-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      if (searchInput) {
        searchInput.value = query;
        if (clearBtn) clearBtn.classList.add('visible');
      }
      AppState.libraryFilters.search = query;
      renderLibrary();
    });
  });

  // Reset smart rule banner button
  const ruleResetBtn = document.getElementById('smart-rule-reset-btn');
  if (ruleResetBtn) {
    ruleResetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (clearBtn) clearBtn.classList.remove('visible');
      AppState.libraryFilters.search = '';
      renderLibrary();
    });
  }

  // Type filter buttons
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.libraryFilters.type = btn.dataset.type;
      renderLibrary();
    });
  });

  // Status buttons (Active vs Archived)
  const statusActiveBtn = document.getElementById('status-btn-active');
  const statusArchivedBtn = document.getElementById('status-btn-archived');

  if (statusActiveBtn && statusArchivedBtn) {
    statusActiveBtn.addEventListener('click', () => {
      statusActiveBtn.classList.add('active');
      statusArchivedBtn.classList.remove('active');
      AppState.libraryFilters.status = 'active';
      renderLibrary();
    });

    statusArchivedBtn.addEventListener('click', () => {
      statusArchivedBtn.classList.add('active');
      statusActiveBtn.classList.remove('active');
      AppState.libraryFilters.status = 'archived';
      renderLibrary();
    });
  }

  // Tag dropdown
  const tagSelect = document.getElementById('library-tag-select');
  if (tagSelect) {
    tagSelect.addEventListener('change', () => {
      AppState.libraryFilters.tag = tagSelect.value;
      renderLibrary();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById('library-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      AppState.libraryFilters.sort = sortSelect.value;
      renderLibrary();
    });
  }

  // View Mode Layout buttons (Grid vs List)
  const gridBtn = document.getElementById('view-mode-grid');
  const listBtn = document.getElementById('view-mode-list');

  if (gridBtn && listBtn) {
    gridBtn.addEventListener('click', () => {
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
      AppState.libraryFilters.layout = 'grid';
      renderLibrary();
    });

    listBtn.addEventListener('click', () => {
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
      AppState.libraryFilters.layout = 'list';
      renderLibrary();
    });
  }

  // Empty state button
  const emptyCaptureBtn = document.getElementById('empty-state-capture-btn');
  if (emptyCaptureBtn) {
    emptyCaptureBtn.addEventListener('click', () => {
      const searchVal = AppState.libraryFilters.search;
      openCaptureModal(null, searchVal);
    });
  }
}

// ============================================================================
// Card Action Callbacks
// ============================================================================
function getCardCallbacks() {
  return {
    onTogglePin: (id) => {
      const item = AppState.vaultData.items.find(i => i.id === id);
      if (!item) return;
      item.isPinned = !item.isPinned;
      item.updatedAt = new Date().toISOString();
      saveData(AppState.vaultData);
      showToast(item.isPinned ? '📌 Capture pinned to top' : 'Capture unpinned');
      renderDashboard();
      renderLibrary();
    },

    onToggleArchive: (id) => {
      const item = AppState.vaultData.items.find(i => i.id === id);
      if (!item) return;
      item.isArchived = !item.isArchived;
      item.updatedAt = new Date().toISOString();
      saveData(AppState.vaultData);
      showToast(item.isArchived ? 'Capture archived' : 'Restored to active vault');
      renderDashboard();
      renderLibrary();
    },

    onOpenDetail: (id) => {
      openDetailModal(id);
    },

    onOpenEdit: (id) => {
      openCaptureModal(id);
    },

    onPromptDelete: (id) => {
      promptDeleteCapture(id);
    },

    onCopyContent: (item) => {
      const copyText = `${item.title}\n\n${item.content}${item.url ? '\n\nURL: ' + item.url : ''}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(() => {
          showToast('Copied capture to clipboard');
        }).catch(() => {
          showToast('Failed to copy');
        });
      } else {
        showToast('Clipboard not supported in this browser');
      }
    },

    onTagClick: (tag) => {
      AppState.libraryFilters.tag = tag;
      const tagSelect = document.getElementById('library-tag-select');
      if (tagSelect) tagSelect.value = tag;
      navigateTo('library');
    }
  };
}

// ============================================================================
// Priority 2: Improved Quick Capture Form & Lifecycle
// ============================================================================
function openCaptureModal(itemId = null, prefillTitle = '') {
  const modalTitle = document.getElementById('modal-capture-title');
  const typeInput = document.getElementById('form-item-type');
  const idInput = document.getElementById('form-item-id');
  const titleInput = document.getElementById('form-title');
  const urlInput = document.getElementById('form-url');
  const contentInput = document.getElementById('form-content');
  const pinInput = document.getElementById('form-is-pinned');

  clearFormErrors();

  if (itemId) {
    const item = AppState.vaultData.items.find(i => i.id === itemId);
    if (!item) return;
    if (modalTitle) modalTitle.textContent = 'Edit Capture';
    if (idInput) idInput.value = item.id;
    if (typeInput) typeInput.value = item.type;
    if (titleInput) titleInput.value = item.title;
    if (urlInput) urlInput.value = item.url || '';
    if (contentInput) contentInput.value = item.content;
    if (pinInput) pinInput.checked = Boolean(item.isPinned);
    AppState.activeFormTags = [...(item.tags || [])];
    syncTypeTabs(item.type);
  } else {
    if (modalTitle) modalTitle.textContent = 'New Capture';
    if (idInput) idInput.value = '';
    if (typeInput) typeInput.value = 'note';
    if (titleInput) titleInput.value = prefillTitle || '';
    if (urlInput) urlInput.value = '';
    if (contentInput) contentInput.value = '';
    if (pinInput) pinInput.checked = false;
    AppState.activeFormTags = [];
    syncTypeTabs('note');
  }

  renderFormTagChips();
  ModalManager.open('modal-capture');
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 60);
  }
}

function syncTypeTabs(type) {
  const typeInput = document.getElementById('form-item-type');
  if (typeInput) typeInput.value = type;

  document.querySelectorAll('.type-tab-btn').forEach(btn => {
    const match = btn.dataset.type === type;
    btn.classList.toggle('active', match);
    btn.setAttribute('aria-checked', match ? 'true' : 'false');
  });

  // Automatically show URL field only for link captures
  const urlGroup = document.getElementById('form-url-group');
  if (urlGroup) {
    urlGroup.style.display = type === 'link' ? 'flex' : 'none';
  }

  const urlReqBadge = document.getElementById('form-url-required-badge');
  if (urlReqBadge) {
    urlReqBadge.style.display = type === 'link' ? 'inline' : 'none';
  }

  // Snippet editor mode and hint
  const contentArea = document.getElementById('form-content');
  const snippetHint = document.getElementById('form-snippet-hint');

  if (contentArea) {
    if (type === 'snippet') {
      contentArea.classList.add('code-mode');
      contentArea.placeholder = '// Paste or write your code snippet or command here...\n// Press Tab to indent.';
      if (snippetHint) snippetHint.style.display = 'block';
    } else {
      contentArea.classList.remove('code-mode');
      contentArea.placeholder = 'Write your thoughts, ideas, or references here...';
      if (snippetHint) snippetHint.style.display = 'none';
    }
  }
}

function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

function showFormError(field, message) {
  const el = document.getElementById(`form-${field}-error`);
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}

function renderFormTagChips() {
  const container = document.getElementById('form-tag-container');
  const input = document.getElementById('form-tag-input');
  if (!container || !input) return;

  // Remove existing chips
  container.querySelectorAll('.tag-chip').forEach(c => c.remove());

  // Render current chips before text input
  AppState.activeFormTags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = `#${tag} `;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tag-chip-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.setAttribute('aria-label', `Remove tag ${tag}`);
    removeBtn.addEventListener('click', () => {
      AppState.activeFormTags = AppState.activeFormTags.filter(t => t !== tag);
      renderFormTagChips();
    });

    chip.appendChild(removeBtn);
    container.insertBefore(chip, input);
  });
}

function setupCaptureForm() {
  // Capture quick button in header
  const quickBtn = document.getElementById('quick-capture-btn');
  if (quickBtn) {
    quickBtn.addEventListener('click', () => openCaptureModal());
  }

  // Close & Cancel buttons
  const closeBtn = document.getElementById('modal-capture-close-btn');
  const cancelBtn = document.getElementById('modal-capture-cancel-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => ModalManager.close('modal-capture'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => ModalManager.close('modal-capture'));

  // Type selector tabs
  document.querySelectorAll('.type-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => syncTypeTabs(btn.dataset.type));
  });

  // Toggle code font button
  const toggleMonoBtn = document.getElementById('form-toggle-mono-btn');
  const contentInput = document.getElementById('form-content');
  if (toggleMonoBtn && contentInput) {
    toggleMonoBtn.addEventListener('click', () => {
      contentInput.classList.toggle('code-mode');
    });
  }

  // Priority 2: Tab key support in snippet editor (inserts 2 spaces)
  if (contentInput) {
    contentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = contentInput.selectionStart;
        const end = contentInput.selectionEnd;
        contentInput.value = contentInput.value.substring(0, start) + '  ' + contentInput.value.substring(end);
        contentInput.selectionStart = contentInput.selectionEnd = start + 2;
      }
    });
  }

  // Tag text input handling
  const tagInput = document.getElementById('form-tag-input');
  if (tagInput) {
    const handleAddTag = () => {
      const val = tagInput.value.trim().toLowerCase().replace(/^#+/, '');
      if (val) {
        const newTags = parseTags([...AppState.activeFormTags, val]);
        AppState.activeFormTags = newTags;
        tagInput.value = '';
        renderFormTagChips();
      }
    };

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        handleAddTag();
      } else if (e.key === 'Backspace' && !tagInput.value && AppState.activeFormTags.length > 0) {
        AppState.activeFormTags.pop();
        renderFormTagChips();
      }
    });

    tagInput.addEventListener('blur', () => {
      if (tagInput.value.trim()) {
        handleAddTag();
      }
    });
  }

  // Suggest Tags AI Helper
  const suggestTagsBtn = document.getElementById('form-suggest-tags-btn');
  if (suggestTagsBtn) {
    suggestTagsBtn.addEventListener('click', async () => {
      const content = contentInput ? contentInput.value : '';
      if (!content.trim()) {
        showToast('Write some content first to suggest relevant tags');
        return;
      }
      const suggested = await AiAdapter.suggestTags(content, AppState.activeFormTags);
      if (suggested.length === 0) {
        showToast('No new distinct tags identified in this text');
      } else {
        AppState.activeFormTags = parseTags([...AppState.activeFormTags, ...suggested]);
        renderFormTagChips();
        showToast(`Added suggested tags: ${suggested.map(t => '#' + t).join(', ')}`);
      }
    });
  }

  // Form submission (preserves entered text on error, Ctrl+Enter fast submit)
  const form = document.getElementById('capture-form');
  if (form) {
    form.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFormErrors();

      const id = document.getElementById('form-item-id')?.value;
      const title = document.getElementById('form-title')?.value;
      const content = document.getElementById('form-content')?.value;
      const type = document.getElementById('form-item-type')?.value;
      const url = document.getElementById('form-url')?.value;
      const isPinned = document.getElementById('form-is-pinned')?.checked;

      if (id) {
        // Update existing item
        const existing = AppState.vaultData.items.find(i => i.id === id);
        const result = updateItem(existing, {
          title,
          content,
          type,
          url,
          tags: AppState.activeFormTags,
          isPinned
        });

        if (!result.success) {
          // Preserve text, display error messages
          Object.entries(result.errors).forEach(([field, msg]) => showFormError(field, msg));
          return;
        }

        const index = AppState.vaultData.items.findIndex(i => i.id === id);
        AppState.vaultData.items[index] = result.item;
        saveData(AppState.vaultData);
        showToast(`✨ Updated ${result.item.type}: "${result.item.title}"`);
      } else {
        // Create new item
        const result = createItem({
          title,
          content,
          type,
          url,
          tags: AppState.activeFormTags,
          isPinned
        });

        if (!result.success) {
          // Preserve text, display error messages
          Object.entries(result.errors).forEach(([field, msg]) => showFormError(field, msg));
          return;
        }

        AppState.vaultData.items.unshift(result.item);
        saveData(AppState.vaultData);
        showToast(`✨ Saved ${result.item.type}: "${result.item.title}" to your vault.`);
      }

      ModalManager.close('modal-capture');
      renderDashboard();
      renderLibrary();
    });
  }
}

// ============================================================================
// Priority 3: Detail View Modal & Related Captures
// ============================================================================
function openDetailModal(itemId) {
  const item = AppState.vaultData.items.find(i => i.id === itemId);
  if (!item) return;

  AppState.activeDetailItemId = itemId;

  const badge = document.getElementById('detail-type-badge');
  const dateBadge = document.getElementById('detail-date-badge');
  const titleEl = document.getElementById('modal-detail-title');
  const linkRow = document.getElementById('detail-link-row');
  const linkAnchor = document.getElementById('detail-link-anchor');
  const linkText = document.getElementById('detail-link-text');
  const contentArea = document.getElementById('detail-content-area');
  const tagsContainer = document.getElementById('detail-tags-container');

  if (badge) {
    badge.className = `card-type-badge ${item.type}`;
    badge.textContent = item.type;
  }
  if (dateBadge) {
    dateBadge.textContent = `Updated ${formatDate(item.updatedAt)}`;
  }
  if (titleEl) titleEl.textContent = item.title;

  if (item.type === 'link' && item.url) {
    if (linkRow) linkRow.style.display = 'block';
    if (linkAnchor) linkAnchor.href = item.url;
    if (linkText) linkText.textContent = item.url;
  } else {
    if (linkRow) linkRow.style.display = 'none';
  }

  if (contentArea) {
    if (item.type === 'snippet') {
      contentArea.innerHTML = `<pre class="card-snippet-box" style="max-height: none;"><code>${item.content.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>`;
    } else {
      contentArea.textContent = item.content;
    }
  }

  if (tagsContainer) {
    tagsContainer.innerHTML = '';
    (item.tags || []).forEach(tag => {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'tag-badge';
      tagBadge.textContent = `#${tag}`;
      tagBadge.addEventListener('click', () => {
        ModalManager.close('modal-detail');
        AppState.libraryFilters.tag = tag;
        const tagSelect = document.getElementById('library-tag-select');
        if (tagSelect) tagSelect.value = tag;
        navigateTo('library');
      });
      tagsContainer.appendChild(tagBadge);
    });
  }

  // Priority 3: Find and Render Related Captures
  const relatedContainer = document.getElementById('detail-related-container');
  if (relatedContainer) {
    const relatedList = findRelatedItems(item, AppState.vaultData.items, 3);
    renderRelatedCaptures(relatedContainer, relatedList, (relatedId) => {
      openDetailModal(relatedId);
    });
  }

  // Update pin button text
  const pinBtn = document.getElementById('detail-pin-btn');
  if (pinBtn) pinBtn.textContent = item.isPinned ? 'Unpin' : 'Pin';

  // Update archive button text
  const archiveBtn = document.getElementById('detail-archive-btn');
  if (archiveBtn) archiveBtn.textContent = item.isArchived ? 'Restore' : 'Archive';

  ModalManager.open('modal-detail');
}

// Bind detail modal action buttons
document.getElementById('modal-detail-close-btn')?.addEventListener('click', () => ModalManager.close('modal-detail'));

document.getElementById('detail-copy-btn')?.addEventListener('click', () => {
  const item = AppState.vaultData.items.find(i => i.id === AppState.activeDetailItemId);
  if (!item) return;
  const copyText = `${item.title}\n\n${item.content}${item.url ? '\n\nURL: ' + item.url : ''}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(copyText).then(() => showToast('Copied to clipboard'));
  }
});

document.getElementById('detail-pin-btn')?.addEventListener('click', () => {
  const item = AppState.vaultData.items.find(i => i.id === AppState.activeDetailItemId);
  if (!item) return;
  item.isPinned = !item.isPinned;
  item.updatedAt = new Date().toISOString();
  saveData(AppState.vaultData);
  showToast(item.isPinned ? '📌 Capture pinned' : 'Capture unpinned');
  document.getElementById('detail-pin-btn').textContent = item.isPinned ? 'Unpin' : 'Pin';
  renderDashboard();
  renderLibrary();
});

document.getElementById('detail-archive-btn')?.addEventListener('click', () => {
  const item = AppState.vaultData.items.find(i => i.id === AppState.activeDetailItemId);
  if (!item) return;
  item.isArchived = !item.isArchived;
  item.updatedAt = new Date().toISOString();
  saveData(AppState.vaultData);
  showToast(item.isArchived ? 'Capture archived' : 'Restored to active vault');
  ModalManager.close('modal-detail');
  renderDashboard();
  renderLibrary();
});

document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
  const id = AppState.activeDetailItemId;
  ModalManager.close('modal-detail');
  openCaptureModal(id);
});

document.getElementById('detail-delete-btn')?.addEventListener('click', () => {
  const id = AppState.activeDetailItemId;
  ModalManager.close('modal-detail');
  promptDeleteCapture(id);
});

// ============================================================================
// Delete Confirmation Modal
// ============================================================================
function promptDeleteCapture(id) {
  const item = AppState.vaultData.items.find(i => i.id === id);
  if (!item) return;

  AppState.activeDeleteItemId = id;
  const label = document.getElementById('delete-capture-title-label');
  if (label) label.textContent = `"${item.title}"`;

  ModalManager.open('modal-confirm-delete');
}

document.getElementById('modal-delete-close-btn')?.addEventListener('click', () => ModalManager.close('modal-confirm-delete'));
document.getElementById('modal-delete-cancel-btn')?.addEventListener('click', () => ModalManager.close('modal-confirm-delete'));

document.getElementById('modal-delete-confirm-btn')?.addEventListener('click', () => {
  const id = AppState.activeDeleteItemId;
  if (!id) return;

  AppState.vaultData.items = AppState.vaultData.items.filter(i => i.id !== id);
  saveData(AppState.vaultData);
  ModalManager.close('modal-confirm-delete');
  showToast('Capture permanently removed');
  renderDashboard();
  renderLibrary();
});

// ============================================================================
// Priority 4: Ask MindVault (Transparent Local Grounded Q&A)
// ============================================================================
function setupAskForm() {
  const form = document.getElementById('ask-form');
  const input = document.getElementById('ask-query-input');
  const resultPanel = document.getElementById('ask-result-panel');
  const answerText = document.getElementById('answer-content-text');
  const sourcesCount = document.getElementById('ask-sources-count');
  const sourcesContainer = document.getElementById('ask-sources-container');
  const sourcesSection = document.getElementById('ask-sources-section');

  const executeAsk = (query) => {
    if (!query) return;
    const response = askMindVault(query, AppState.vaultData.items);

    if (resultPanel) resultPanel.classList.add('visible');

    if (response.status === 'no_matches') {
      if (answerText) {
        answerText.innerHTML = `<strong>${response.message}</strong><br><br>${response.suggestion}`;
      }
      if (sourcesCount) sourcesCount.textContent = 'Found 0 matching notes';
      if (sourcesSection) sourcesSection.style.display = 'none';
    } else {
      if (answerText) {
        // Safe formatting for markdown style notes
        let formatted = response.answer
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '<br><br>');

        answerText.innerHTML = formatted;
      }

      if (sourcesCount) {
        sourcesCount.textContent = `Found ${response.matchCount} cited ${response.matchCount === 1 ? 'source' : 'sources'}`;
      }
      if (sourcesSection) sourcesSection.style.display = 'block';

      if (sourcesContainer) {
        sourcesContainer.innerHTML = '';
        response.sources.forEach(src => {
          const card = document.createElement('div');
          card.className = 'source-card';
          card.setAttribute('role', 'button');
          card.tabIndex = 0;

          const title = document.createElement('div');
          title.className = 'source-card-title';
          title.innerHTML = `📄 ${highlightMatches(src.title, response.queryTokens)}`;

          const excerpt = document.createElement('div');
          excerpt.className = 'source-card-excerpt';
          excerpt.innerHTML = `"${highlightMatches(src.excerpt, response.queryTokens)}"`;

          card.appendChild(title);
          card.appendChild(excerpt);
          card.addEventListener('click', () => openDetailModal(src.id));
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openDetailModal(src.id);
            }
          });
          sourcesContainer.appendChild(card);
        });
      }
    }
  };

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executeAsk(input?.value.trim());
    });
  }

  // Suggestion chips
  document.querySelectorAll('.ask-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.question;
      if (input) input.value = q;
      executeAsk(q);
    });
  });
}

// ============================================================================
// Architecture & AI Simulator
// ============================================================================
function setupAiArchitectureSimulator() {
  const output = document.getElementById('adapter-sim-output');

  document.getElementById('sim-suggest-tags-btn')?.addEventListener('click', async () => {
    if (!output) return;
    const active = AppState.vaultData.items.filter(i => !i.isArchived);
    if (active.length === 0) {
      output.textContent = 'Vault is empty. Add a capture to simulate tag suggestions.';
      return;
    }
    const sample = active[0];
    const suggestions = await AiAdapter.suggestTags(sample.content, sample.tags);
    output.textContent = `SIMULATING AiAdapter.suggestTags()\nInput capture: "${sample.title}"\nExisting tags: [${sample.tags.join(', ')}]\nSuggested new tags: [${suggestions.join(', ')}]\nStatus: Rule-based heuristic extraction completed locally.`;
  });

  document.getElementById('sim-summarize-btn')?.addEventListener('click', async () => {
    if (!output) return;
    const active = AppState.vaultData.items.filter(i => !i.isArchived);
    if (active.length === 0) {
      output.textContent = 'Vault is empty. Add a capture to simulate summarization.';
      return;
    }
    const sample = active[0];
    const summary = await AiAdapter.summarize(sample);
    output.textContent = `SIMULATING AiAdapter.summarize()\nInput capture: "${sample.title}"\nSynthesized preview: "${summary}"\nStatus: Grounded sentence extraction completed locally.`;
  });

  document.getElementById('sim-status-btn')?.addEventListener('click', () => {
    if (!output) return;
    const status = AiAdapter.getStatus();
    output.textContent = `INSPECTING AiAdapter.getStatus()\n${JSON.stringify(status, null, 2)}\n\nSecurity Guarantee: Provider API keys are never required or stored in browser localStorage. Storage remains in unencrypted plaintext on current browser profile.`;
  });
}

// ============================================================================
// Priority 6: Vault Settings & Data Safety Modal
// ============================================================================
function setupSettingsModal() {
  const openBtn = document.getElementById('settings-open-btn');
  const closeBtn = document.getElementById('modal-settings-close-btn');
  const closeFooterBtn = document.getElementById('modal-settings-close-footer-btn');

  if (openBtn) openBtn.addEventListener('click', () => ModalManager.open('modal-settings'));
  if (closeBtn) closeBtn.addEventListener('click', () => ModalManager.close('modal-settings'));
  if (closeFooterBtn) closeFooterBtn.addEventListener('click', () => ModalManager.close('modal-settings'));

  // Export JSON
  document.getElementById('export-json-btn')?.addEventListener('click', () => {
    const ok = exportDataAsJson(AppState.vaultData);
    if (ok) showToast('Backup file downloaded successfully');
  });

  // Import JSON
  const fileInput = document.getElementById('import-json-file-input');
  document.getElementById('import-json-btn')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const res = importDataFromJson(content, false, AppState.vaultData);
      if (res.success) {
        AppState.vaultData = res.data;
        showToast(`Successfully imported ${res.count} captures`);
        ModalManager.close('modal-settings');
        renderDashboard();
        renderLibrary();
      } else {
        showToast(`Import failed: ${res.error}`);
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Load Seed Captures
  document.getElementById('load-sample-btn')?.addEventListener('click', () => {
    AppState.vaultData.items = [...SAMPLE_ITEMS];
    saveData(AppState.vaultData);
    showToast('Loaded 5 starter captures into your vault');
    ModalManager.close('modal-settings');
    renderDashboard();
    renderLibrary();
  });

  // Reset Vault with confirmation and safety pre-reset download
  document.getElementById('reset-vault-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset your vault? An automatic JSON backup will be downloaded before clearing.')) {
      exportDataAsJson(AppState.vaultData);
      resetStorage(AppState.vaultData);
      AppState.vaultData = loadData();
      showToast('Vault cleared and pre-reset backup saved');
      ModalManager.close('modal-settings');
      renderDashboard();
      renderLibrary();
    }
  });
}

// ============================================================================
// Priority 2: Global Keyboard Shortcuts
// ============================================================================
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
      ModalManager.closeAll();
      return;
    }

    // Ctrl+K or Cmd+K opens Quick Capture
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openCaptureModal();
      return;
    }

    // '/' key focuses library search when not already focused on an input/textarea
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      navigateTo('library');
      const searchInput = document.getElementById('library-search-input');
      if (searchInput) searchInput.focus();
    }
  });
}
