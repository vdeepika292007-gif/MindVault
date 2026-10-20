/**
 * MindVault UI Module
 * Handles safe DOM creation (zero raw HTML injection), modal lifecycles,
 * reactive view updates, tag chip components, search term highlighting,
 * related captures rendering, and toast notifications.
 */

import { highlightMatches } from './search.js';

/**
 * Escapes HTML characters safely.
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a date string into a clean readable date (e.g. "Oct 20, 2026").
 */
export function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (_) {
    return isoStr;
  }
}

/**
 * Floating toast notification helper.
 */
export function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 220);
  }, duration);
}

/**
 * Creates an accessible SVG icon element.
 */
function createSvgIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  if (name === 'pin') {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 17v5M5 17h14M7 8l-2 9h14l-2-9M9 8V3h6v5');
    svg.appendChild(path);
  } else if (name === 'link') {
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71');
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71');
    svg.appendChild(path1);
    svg.appendChild(path2);
  } else if (name === 'copy') {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '9');
    rect.setAttribute('y', '9');
    rect.setAttribute('width', '13');
    rect.setAttribute('height', '13');
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');
    svg.appendChild(rect);
    svg.appendChild(path);
  } else if (name === 'edit') {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7');
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z');
    svg.appendChild(path);
    svg.appendChild(path2);
  } else if (name === 'archive') {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '21 8 21 21 3 21 3 8');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '1');
    rect.setAttribute('y', '3');
    rect.setAttribute('width', '22');
    rect.setAttribute('height', '5');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '10');
    line.setAttribute('y1', '12');
    line.setAttribute('x2', '14');
    line.setAttribute('y2', '12');
    svg.appendChild(polyline);
    svg.appendChild(rect);
    svg.appendChild(line);
  } else if (name === 'trash') {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '3 6 5 6 21 6');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2');
    svg.appendChild(polyline);
    svg.appendChild(path);
  }

  return svg;
}

/**
 * Creates a capture card DOM node with safe text insertion and search highlighting.
 */
export function createCaptureCard(item, callbacks, searchTokens = []) {
  const card = document.createElement('article');
  card.className = `capture-card ${item.isPinned ? 'pinned' : ''} ${item.isArchived ? 'archived' : ''}`;
  card.dataset.id = item.id;

  // Header: Type badge & Pin button
  const header = document.createElement('div');
  header.className = 'card-header';

  const typeBadge = document.createElement('span');
  typeBadge.className = `card-type-badge ${item.type}`;
  typeBadge.textContent = item.type;
  header.appendChild(typeBadge);

  const quickActions = document.createElement('div');
  quickActions.className = 'card-quick-actions';

  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = `pin-btn ${item.isPinned ? 'pinned' : ''}`;
  pinBtn.title = item.isPinned ? 'Unpin capture' : 'Pin to top';
  pinBtn.setAttribute('aria-label', pinBtn.title);
  pinBtn.appendChild(createSvgIcon('pin'));
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onTogglePin(item.id);
  });
  quickActions.appendChild(pinBtn);

  header.appendChild(quickActions);
  card.appendChild(header);

  // Title with search highlighting if active
  const title = document.createElement('h3');
  title.className = 'card-title';
  if (searchTokens && searchTokens.length > 0) {
    title.innerHTML = highlightMatches(item.title, searchTokens);
  } else {
    title.textContent = item.title;
  }
  title.tabIndex = 0;
  title.setAttribute('role', 'button');
  title.addEventListener('click', () => callbacks.onOpenDetail(item.id));
  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callbacks.onOpenDetail(item.id);
    }
  });
  card.appendChild(title);

  // Snippet vs Note/Idea vs Link
  if (item.type === 'snippet') {
    const snippetBox = document.createElement('pre');
    snippetBox.className = 'card-snippet-box';
    const code = document.createElement('code');
    if (searchTokens && searchTokens.length > 0) {
      code.innerHTML = highlightMatches(item.content, searchTokens);
    } else {
      code.textContent = item.content;
    }
    snippetBox.appendChild(code);
    card.appendChild(snippetBox);
  } else {
    const preview = document.createElement('p');
    preview.className = 'card-content-preview';
    if (searchTokens && searchTokens.length > 0) {
      preview.innerHTML = highlightMatches(item.content, searchTokens);
    } else {
      preview.textContent = item.content;
    }
    card.appendChild(preview);
  }

  // URL for link captures
  if (item.type === 'link' && item.url) {
    const linkPreview = document.createElement('a');
    linkPreview.className = 'card-link-preview';
    linkPreview.href = item.url;
    linkPreview.target = '_blank';
    linkPreview.rel = 'noopener noreferrer';
    linkPreview.appendChild(createSvgIcon('link'));
    const linkText = document.createElement('span');
    linkText.textContent = item.url.length > 45 ? item.url.slice(0, 45) + '...' : item.url;
    linkPreview.appendChild(linkText);
    linkPreview.addEventListener('click', (e) => e.stopPropagation());
    card.appendChild(linkPreview);
  }

  // Tags
  if (item.tags && item.tags.length > 0) {
    const tagsWrapper = document.createElement('div');
    tagsWrapper.className = 'card-tags';
    item.tags.forEach(tag => {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'tag-badge';
      tagBadge.textContent = `#${tag}`;
      tagBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onTagClick(tag);
      });
      tagsWrapper.appendChild(tagBadge);
    });
    card.appendChild(tagsWrapper);
  }

  // Footer: Date and Action Buttons
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const dateSpan = document.createElement('span');
  dateSpan.textContent = formatDate(item.updatedAt);
  dateSpan.title = `Created: ${formatDate(item.createdAt)}\nUpdated: ${formatDate(item.updatedAt)}`;
  footer.appendChild(dateSpan);

  const menuActions = document.createElement('div');
  menuActions.className = 'card-menu-actions';

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'action-btn';
  copyBtn.title = 'Copy capture content';
  copyBtn.setAttribute('aria-label', 'Copy content');
  copyBtn.appendChild(createSvgIcon('copy'));
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onCopyContent(item);
  });
  menuActions.appendChild(copyBtn);

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'action-btn';
  editBtn.title = 'Edit capture';
  editBtn.setAttribute('aria-label', 'Edit capture');
  editBtn.appendChild(createSvgIcon('edit'));
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onOpenEdit(item.id);
  });
  menuActions.appendChild(editBtn);

  // Archive button
  const archiveBtn = document.createElement('button');
  archiveBtn.type = 'button';
  archiveBtn.className = 'action-btn';
  archiveBtn.title = item.isArchived ? 'Restore to active vault' : 'Archive capture';
  archiveBtn.setAttribute('aria-label', archiveBtn.title);
  archiveBtn.appendChild(createSvgIcon('archive'));
  archiveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onToggleArchive(item.id);
  });
  menuActions.appendChild(archiveBtn);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'action-btn';
  deleteBtn.title = 'Delete capture';
  deleteBtn.setAttribute('aria-label', 'Delete capture');
  deleteBtn.appendChild(createSvgIcon('trash'));
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onPromptDelete(item.id);
  });
  menuActions.appendChild(deleteBtn);

  footer.appendChild(menuActions);
  card.appendChild(footer);

  return card;
}

/**
 * Renders related captures inside the detail view.
 */
export function renderRelatedCaptures(container, relatedList, onOpenDetail) {
  container.innerHTML = '';
  if (!relatedList || relatedList.length === 0) {
    const emptyNotice = document.createElement('p');
    emptyNotice.className = 'related-empty-hint';
    emptyNotice.textContent = 'No related captures yet. Add shared tags to connect this note with others in your vault.';
    container.appendChild(emptyNotice);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'related-captures-grid';

  relatedList.forEach(({ item, reason }) => {
    const card = document.createElement('div');
    card.className = 'related-mini-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const topRow = document.createElement('div');
    topRow.className = 'related-mini-header';

    const typeBadge = document.createElement('span');
    typeBadge.className = `card-type-badge ${item.type}`;
    typeBadge.textContent = item.type;
    topRow.appendChild(typeBadge);

    const reasonBadge = document.createElement('span');
    reasonBadge.className = 'related-reason-pill';
    reasonBadge.textContent = reason;
    topRow.appendChild(reasonBadge);

    card.appendChild(topRow);

    const title = document.createElement('h4');
    title.className = 'related-mini-title';
    title.textContent = item.title;
    card.appendChild(title);

    const preview = document.createElement('p');
    preview.className = 'related-mini-excerpt';
    preview.textContent = item.content.slice(0, 90) + (item.content.length > 90 ? '...' : '');
    card.appendChild(preview);

    card.addEventListener('click', () => onOpenDetail(item.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpenDetail(item.id);
      }
    });

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

/**
 * Renders tag cloud items in the dashboard panel.
 */
export function renderTagCloud(container, tagsList, onTagClick) {
  container.innerHTML = '';
  if (!tagsList || tagsList.length === 0) {
    const emptySpan = document.createElement('span');
    emptySpan.style.fontSize = '0.825rem';
    emptySpan.style.color = 'var(--text-muted)';
    emptySpan.textContent = 'No tags created yet.';
    container.appendChild(emptySpan);
    return;
  }

  tagsList.forEach(({ name, count }) => {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'hint-chip';
    badge.textContent = `#${name} (${count})`;
    badge.addEventListener('click', () => onTagClick(name));
    container.appendChild(badge);
  });
}

/**
 * Modal dialog state controller.
 */
export const ModalManager = {
  lastFocusedElement: null,

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    this.lastFocusedElement = document.activeElement;
    modal.classList.add('open');

    // Focus first interactive element in modal
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      setTimeout(() => focusable.focus(), 50);
    }
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  },

  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(modal => {
      modal.classList.remove('open');
    });
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }
};
