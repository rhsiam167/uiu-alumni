// Session & Authentication Helper Module
import { getRelativeRoot, showToast } from './utils.js';
import { CONFIG } from './config.js';
import { apiClient, setSessionEndHandler } from './api/client.js';

let refreshPromise = null;

export const auth = {
  getCurrentUser() {
    const userJson = localStorage.getItem('uiu_current_user');
    return userJson ? JSON.parse(userJson) : null;
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem('uiu_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('uiu_current_user');
    }
  },

  async refreshSession() {
    if (CONFIG.USE_DEV_ADAPTER) {
      return this.getCurrentUser();
    }
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (res && res.user) {
          this.setCurrentUser(res.user);
          return res.user;
        }
      } catch (err) {
        if (err.status === 401 || (err.status === 403 && ['ACCOUNT_SUSPENDED', 'ACCOUNT_REJECTED', 'ACCOUNT_PENDING'].includes(err.code))) {
          this.setCurrentUser(null);
        }
      } finally {
        refreshPromise = null;
      }
      return this.getCurrentUser();
    })();

    return refreshPromise;
  },

  handleSessionEnd(err) {
    this.setCurrentUser(null);
    const pathname = window.location.pathname;
    const isAuthPage = pathname.endsWith('/login.html') || pathname.endsWith('/register.html');
    if (!isAuthPage) {
      const root = getRelativeRoot();
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      const codeStr = err?.code ? `&code=${encodeURIComponent(err.code)}` : '';
      const msgStr = err?.details?.[0]?.message || err?.message ? `&msg=${encodeURIComponent(err.details?.[0]?.message || err.message)}` : '';
      window.location.href = `${root}pages/login.html?redirect=${currentPath}${codeStr}${msgStr}`;
    }
  },

  async logout() {
    if (!CONFIG.USE_DEV_ADAPTER) {
      try {
        await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (_) { /* ignore network errors on logout */ }
    }
    this.setCurrentUser(null);
    const root = getRelativeRoot();
    window.location.href = `${root}index.html`;
  },

  isGuest() {
    return !this.getCurrentUser();
  },

  async requireAuth() {
    await this.refreshSession();
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      const root = getRelativeRoot();
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${root}pages/login.html?redirect=${currentPath}`;
      return false;
    }
    return true;
  },

  async requireRole(role) {
    const isAuthed = await this.requireAuth();
    if (!isAuthed) return false;

    const currentUser = this.getCurrentUser();
    if (currentUser.role !== role) {
      showToast(`Access denied: Requires ${role} privileges.`, 'error');
      setTimeout(() => {
        const root = getRelativeRoot();
        window.location.href = `${root}index.html`;
      }, 1500);
      return false;
    }
    return true;
  }
};

// Wire API client session end callback to auth helper
setSessionEndHandler((err) => auth.handleSessionEnd(err));
