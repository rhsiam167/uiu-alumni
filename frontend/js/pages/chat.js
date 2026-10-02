// Clean Chat Page Controller (Unidirectional State Architecture)
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { chatApi } from '../api/chat.js';
import { CONFIG } from '../config.js';
import { getRelativeRoot, escapeHtml } from '../utils.js';
import { showConfirmModal } from '../components/modal.js';

// Single State Object
const state = {
  currentUser: null,
  users: [],
  conversations: [],
  activeUserId: null,
  messages: [],
  searchQuery: '',
  errorMessage: ''
};

let pollTimer = null;
let activeDropdownMsgId = null;
let isHeaderMenuOpen = false;

// User Profile & Name resolution helper
function getUserName(userId) {
  if (state.activeUserId && String(state.activeUserId) === String(userId)) {
    const activeConv = state.conversations.find(c => String(c.userId) === String(userId));
    if (activeConv) return activeConv.name;
  }
  const u = state.users.find(u => String(u.id) === String(userId));
  if (u) return u.name;
  const conv = state.conversations.find(c => String(c.userId) === String(userId));
  if (conv) return conv.name;
  return 'User';
}

function getUserInitials(name) {
  if (!name || name === 'User') return 'UI';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.requireAuth()) return;
  state.currentUser = auth.getCurrentUser();

  renderNavbar('chat');
  renderFooter();

  // Pre-load all users to resolve names reliably
  try {
    const mentors = await apiClient.get('/users/mentors');
    state.users = Array.isArray(mentors) ? mentors : [];
  } catch (e) {
    state.users = [];
  }

  // Parse URL query parameter ?user=<id>
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('user');

  if (targetUserId) {
    state.activeUserId = targetUserId;
    // Attempt to fetch recipient name if not in loaded list
    if (!state.users.some(u => String(u.id) === String(targetUserId))) {
      try {
        const targetUser = await apiClient.get(`/users/${targetUserId}`);
        if (targetUser) state.users.push(targetUser);
      } catch (e) {}
    }
  }

  await fetchAndSyncState(true);

  // Setup DOM Event Listeners
  setupEventListeners();

  // Start polling
  pollTimer = setInterval(() => fetchAndSyncState(false), CONFIG.POLL_INTERVAL_MS);
});

// Sync state with server/adapter and trigger renders
async function fetchAndSyncState(isInitial = false) {
  try {
    const convs = await chatApi.getConversations();
    state.conversations = Array.isArray(convs) ? convs : [];

    if (state.activeUserId) {
      const msgs = await chatApi.getMessages(state.activeUserId);
      const newMsgs = Array.isArray(msgs) ? msgs : [];

      // Detect if messages changed before re-rendering thread to prevent flicker
      const hasChanged = isInitial || 
        newMsgs.length !== state.messages.length || 
        JSON.stringify(newMsgs.map(m => ({ id: m.id, unsent: m.unsent, text: m.text }))) !== 
        JSON.stringify(state.messages.map(m => ({ id: m.id, unsent: m.unsent, text: m.text })));

      if (hasChanged) {
        state.messages = newMsgs;
        renderThread(isInitial);
      }
    } else {
      state.messages = [];
      renderThread(false);
    }

    renderSidebar();
    renderHeader();
  } catch (err) {
    console.error('Failed to sync chat state:', err);
  }
}

// ==========================================
// RENDER FUNCTIONS (No other code mutates DOM)
// ==========================================

function renderSidebar() {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  let convList = [...state.conversations];

  // If query target has no messages yet, display pseudo entry in sidebar map so active contact is selected
  if (state.activeUserId) {
    const exists = convList.some(c => String(c.userId) === String(state.activeUserId));
    if (!exists) {
      const partnerName = getUserName(state.activeUserId);
      convList.unshift({
        userId: state.activeUserId,
        name: partnerName,
        avatarInitials: getUserInitials(partnerName),
        lastMessageText: 'New conversation',
        lastMessageAt: '',
        unreadCount: 0
      });
    }
  }

  // Filter by search box
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    convList = convList.filter(c => c.name.toLowerCase().includes(q) || c.lastMessageText.toLowerCase().includes(q));
  }

  if (convList.length === 0 && !state.activeUserId) {
    container.innerHTML = `<div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted); font-size: var(--font-size-sm);">No active conversations.</div>`;
    return;
  }

  container.innerHTML = convList.map(c => {
    const isActive = String(c.userId) === String(state.activeUserId);
    const initials = c.avatarInitials || getUserInitials(c.name);
    const timeStr = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return `
      <div class="chat-conv-item ${isActive ? 'active' : ''}" data-user-id="${escapeHtml(c.userId)}">
        <div class="avatar avatar-sm">${escapeHtml(initials)}</div>
        <div class="chat-conv-info">
          <div class="chat-conv-name-row">
            <span class="chat-conv-name">${escapeHtml(c.name)}</span>
            <span class="chat-conv-time">${escapeHtml(timeStr)}</span>
          </div>
          <div class="chat-conv-preview">${escapeHtml(c.lastMessageText)}</div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.chat-conv-item').forEach(item => {
    item.addEventListener('click', () => {
      const uid = item.getAttribute('data-user-id');
      selectConversation(uid);
    });
  });
}

function renderHeader() {
  const defaultTitle = document.getElementById('chat-header-default-title');
  const profileLink = document.getElementById('chat-header-profile-link');
  const avatarEl = document.getElementById('chat-header-avatar');
  const titleEl = document.getElementById('chat-header-title');
  const actionsEl = document.getElementById('chat-header-actions');
  const dropdownEl = document.getElementById('chat-header-menu-dropdown');
  const chatApp = document.getElementById('chat-app');

  const inputField = document.getElementById('chat-input-text');
  const sendBtn = document.getElementById('chat-send-btn');

  if (!state.activeUserId) {
    if (defaultTitle) defaultTitle.style.display = 'block';
    if (profileLink) profileLink.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'none';

    if (inputField) inputField.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    if (chatApp) chatApp.classList.remove('mobile-thread-active');
    return;
  }

  const partnerName = getUserName(state.activeUserId);
  const initials = getUserInitials(partnerName);
  const profileUrl = `${getRelativeRoot()}pages/profile.html?id=${state.activeUserId}`;

  if (defaultTitle) defaultTitle.style.display = 'none';
  if (profileLink) {
    profileLink.href = profileUrl;
    profileLink.style.display = 'flex';
  }

  if (avatarEl) avatarEl.textContent = initials;
  if (titleEl) titleEl.textContent = partnerName;

  if (actionsEl) actionsEl.style.display = 'block';
  if (dropdownEl) dropdownEl.style.display = isHeaderMenuOpen ? 'block' : 'none';

  if (inputField) inputField.disabled = false;
  if (sendBtn) sendBtn.disabled = false;

  if (chatApp) chatApp.classList.add('mobile-thread-active');
}

function renderThread(shouldScrollToBottom = false) {
  const container = document.getElementById('messages-container');
  const errorBanner = document.getElementById('chat-error-banner');
  const errorMessageEl = document.getElementById('chat-error-message');

  if (!container) return;

  // Render error banner if any
  if (state.errorMessage) {
    if (errorMessageEl) errorMessageEl.textContent = state.errorMessage;
    if (errorBanner) errorBanner.style.display = 'flex';
  } else {
    if (errorBanner) errorBanner.style.display = 'none';
  }

  if (!state.activeUserId) {
    container.innerHTML = `
      <div class="empty-state" style="margin: auto;">
        <div class="empty-state-title">No conversation selected</div>
        <p>Choose a contact from the left list to start messaging.</p>
      </div>
    `;
    return;
  }

  if (state.messages.length === 0) {
    const partnerName = getUserName(state.activeUserId);
    container.innerHTML = `<p style="text-align: center; color: var(--color-text-muted); font-size: var(--font-size-sm); margin: auto;">Say hi to ${escapeHtml(partnerName)}!</p>`;
    return;
  }

  // Check scroll position before rendering to avoid breaking user manual scrolling
  const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

  container.innerHTML = state.messages.map(m => {
    const isMine = String(m.senderId) === String(state.currentUser.id);
    const isUnsent = m.unsent;

    const bubbleText = isUnsent ? 'Message unsent' : escapeHtml(m.text);
    const msgTime = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const isDropdownOpen = activeDropdownMsgId === String(m.id);

    return `
      <div class="chat-message-row ${isMine ? 'mine' : 'theirs'}">
        <div class="chat-message-content">
          <div class="chat-bubble ${isMine ? 'mine' : 'theirs'} ${isUnsent ? 'unsent' : ''}">
            <div>${bubbleText}</div>
            ${msgTime ? `<div class="chat-bubble-time">${escapeHtml(msgTime)}</div>` : ''}
          </div>

          ${(!isUnsent && isMine) ? `
          <div class="chat-msg-options">
            <button type="button" class="chat-msg-dots-btn" data-msg-id="${escapeHtml(m.id)}" title="Message options">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </button>
            <div class="chat-msg-dropdown" style="display: ${isDropdownOpen ? 'block' : 'none'};">
              <button type="button" class="chat-msg-unsend-btn" data-unsend-id="${escapeHtml(m.id)}">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
                <span>Unsend</span>
              </button>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Auto-scroll if initial load or user was near bottom
  if (shouldScrollToBottom || isAtBottom) {
    container.scrollTop = container.scrollHeight;
  }

  // Attach event handlers for message 3-dot dropdowns
  container.querySelectorAll('.chat-msg-dots-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = btn.getAttribute('data-msg-id');
      activeDropdownMsgId = activeDropdownMsgId === msgId ? null : msgId;
      renderThread(false);
    });
  });

  container.querySelectorAll('.chat-msg-unsend-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const msgId = btn.getAttribute('data-unsend-id');
      showConfirmModal({
        title: 'Unsend Message',
        message: 'Are you sure you want to unsend this message?',
        confirmText: 'Unsend',
        onConfirm: async () => {
          await handleUnsendMessage(msgId);
        }
      });
    });
  });
}

// ==========================================
// ACTION HANDLERS (Update State & Call Render)
// ==========================================

async function selectConversation(userId) {
  state.activeUserId = userId;
  activeDropdownMsgId = null;
  isHeaderMenuOpen = false;

  // Sync URL parameter cleanly without reloading page
  const newUrl = window.location.pathname + `?user=${userId}`;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  await fetchAndSyncState(true);
}

async function handleSendMessage(text) {
  if (!state.activeUserId || !text) return;

  const payload = { text };
  state.errorMessage = '';

  try {
    await chatApi.sendMessage(state.activeUserId, payload);
    const newMsgs = await chatApi.getMessages(state.activeUserId);
    state.messages = Array.isArray(newMsgs) ? newMsgs : [];
    const convs = await chatApi.getConversations();
    state.conversations = Array.isArray(convs) ? convs : [];

    renderSidebar();
    renderHeader();
    renderThread(true);
  } catch (err) {
    console.error('Failed to send message:', err);
    state.errorMessage = 'Failed to send message. Please try again.';
    renderThread(false);
  }
}

async function handleUnsendMessage(messageId) {
  activeDropdownMsgId = null;
  try {
    await chatApi.unsendMessage(messageId);
    await fetchAndSyncState(false);
  } catch (err) {
    console.error('Failed to unsend message:', err);
    state.errorMessage = 'Failed to unsend message.';
    renderThread(false);
  }
}

function handleDeleteConversation() {
  if (!state.activeUserId) return;
  
  showConfirmModal({
    title: 'Delete Chat',
    message: 'Delete this conversation for you? The other person will still keep their chat history.',
    confirmText: 'Delete',
    onConfirm: async () => {
      const targetId = state.activeUserId;
      isHeaderMenuOpen = false;

      try {
        await chatApi.deleteConversation(targetId);

        state.activeUserId = null;
        state.messages = [];
        activeDropdownMsgId = null;

        window.history.replaceState({}, document.title, window.location.pathname);

        await fetchAndSyncState(true);
      } catch (err) {
        console.error('Failed to delete conversation:', err);
        state.errorMessage = 'Failed to delete conversation.';
        renderThread(false);
      }
    }
  });
}

function setupEventListeners() {
  // Search Box
  const searchInput = document.getElementById('chat-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderSidebar();
    });
  }

  // Header 3-dot Menu Toggle
  const headerMenuBtn = document.getElementById('chat-header-menu-btn');
  if (headerMenuBtn) {
    headerMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isHeaderMenuOpen = !isHeaderMenuOpen;
      renderHeader();
    });
  }

  // Delete Conversation Button
  const deleteConvBtn = document.getElementById('delete-conversation-btn');
  if (deleteConvBtn) {
    deleteConvBtn.addEventListener('click', handleDeleteConversation);
  }

  // Back Button for Mobile View
  const backBtn = document.getElementById('chat-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      state.activeUserId = null;
      window.history.replaceState({}, document.title, window.location.pathname);
      renderHeader();
      renderSidebar();
    });
  }

  // Close Error Banner Button
  const closeErrorBtn = document.getElementById('close-error-btn');
  if (closeErrorBtn) {
    closeErrorBtn.addEventListener('click', () => {
      state.errorMessage = '';
      renderThread(false);
    });
  }

  // Form Submission
  const form = document.getElementById('chat-input-form');
  const input = document.getElementById('chat-input-text');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input ? input.value.trim() : '';
      if (!text || !state.activeUserId) return;

      if (input) {
        input.value = '';
        input.focus();
      }

      await handleSendMessage(text);
      if (input) input.focus();
    });
  }

  // Global document click to dismiss dropdowns
  document.addEventListener('click', () => {
    if (isHeaderMenuOpen) {
      isHeaderMenuOpen = false;
      renderHeader();
    }
    if (activeDropdownMsgId) {
      activeDropdownMsgId = null;
      renderThread(false);
    }
  });
}
