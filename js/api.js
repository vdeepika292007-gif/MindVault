/**
 * MindVault API Client
 * Handles authenticated communication with the PHP 8 / MySQL backend.
 * Provides session handling, CSRF token management, and endpoints for
 * authentication, captures, user settings, and V1 JSON migration.
 */

class MindVaultApi {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.csrfToken = null;
    this.currentUser = null;
  }

  /**
   * Internal HTTP request wrapper with credentials, CSRF headers, and error handling.
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    // Attach CSRF token on mutating requests if available
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE'].includes(method) && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const config = {
      ...options,
      headers,
      credentials: 'include' // Always include session cookies across requests
    };

    try {
      const response = await fetch(url, config);
      const text = await response.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 120)}`);
      }

      // Store CSRF token whenever backend provides one
      if (data && data.csrf_token) {
        this.csrfToken = data.csrf_token;
      }

      if (!response.ok || (data && data.success === false)) {
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (networkError) {
      if (networkError.status) {
        throw networkError;
      }
      throw new Error(`Cannot reach MindVault backend API at ${url}. ${networkError.message}`);
    }
  }

  // ==========================================================================
  // Authentication Endpoints
  // ==========================================================================

  /**
   * Checks current session profile and settings.
   */
  async getMe() {
    const data = await this.request('/api/auth/me.php', { method: 'GET' });
    if (data.authenticated && data.user) {
      this.currentUser = data.user;
      this.csrfToken = data.csrf_token || null;
    } else {
      this.currentUser = null;
    }
    return data;
  }

  /**
   * Registers a new user account.
   */
  async register({ username, email, password }) {
    const data = await this.request('/api/auth/register.php', {
      method: 'POST',
      body: { username, email, password }
    });
    if (data.user) {
      this.currentUser = data.user;
      this.csrfToken = data.csrf_token || null;
    }
    return data;
  }

  /**
   * Logs into an existing account.
   */
  async login({ username_or_email, password }) {
    const data = await this.request('/api/auth/login.php', {
      method: 'POST',
      body: { username_or_email, password }
    });
    if (data.user) {
      this.currentUser = data.user;
      this.csrfToken = data.csrf_token || null;
    }
    return data;
  }

  /**
   * Terminates session and clears cookies.
   */
  async logout() {
    const data = await this.request('/api/auth/logout.php', { method: 'POST' });
    this.currentUser = null;
    this.csrfToken = null;
    return data;
  }

  // ==========================================================================
  // Captures Endpoints
  // ==========================================================================

  /**
   * Retrieves all captures owned by the authenticated user.
   */
  async getCaptures() {
    const data = await this.request('/api/captures/index.php', { method: 'GET' });
    return data.items || [];
  }

  /**
   * Creates a new capture in MySQL.
   */
  async createCapture(item) {
    const payload = {
      id: item.id,
      title: item.title,
      content: item.content,
      type: item.type,
      url: item.url || '',
      tags: item.tags || [],
      isPinned: Boolean(item.isPinned),
      isArchived: Boolean(item.isArchived)
    };
    const data = await this.request('/api/captures/create.php', {
      method: 'POST',
      body: payload
    });
    return data.item;
  }

  /**
   * Updates an existing capture owned by the authenticated user.
   */
  async updateCapture(id, updates) {
    const payload = {
      id,
      ...updates
    };
    const data = await this.request('/api/captures/update.php', {
      method: 'POST',
      body: payload
    });
    return data.item;
  }

  /**
   * Permanently deletes a capture owned by the authenticated user.
   */
  async deleteCapture(id) {
    const data = await this.request('/api/captures/delete.php', {
      method: 'POST',
      body: { id }
    });
    return data;
  }

  /**
   * Migrates an entire V1 JSON backup into the user's cloud MySQL vault.
   */
  async importCaptures(backupData) {
    const data = await this.request('/api/captures/import.php', {
      method: 'POST',
      body: backupData
    });
    return data;
  }

  // ==========================================================================
  // User Settings Endpoints
  // ==========================================================================

  /**
   * Retrieves user preferences (theme, last insight date).
   */
  async getSettings() {
    const data = await this.request('/api/settings/index.php', { method: 'GET' });
    return data.settings || {};
  }

  /**
   * Updates user preferences in MySQL.
   */
  async updateSettings(settings) {
    const data = await this.request('/api/settings/index.php', {
      method: 'POST',
      body: settings
    });
    return data.settings || {};
  }
}

export const api = new MindVaultApi();
export default api;
