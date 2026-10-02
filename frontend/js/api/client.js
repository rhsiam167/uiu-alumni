// API Client Wrapper with DevAdapter fallback support
import { CONFIG } from '../config.js';
import { DevAdapter } from './dev-adapter.js';

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message || 'API request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Global session error callback listener (wired from auth.js)
let onSessionEndHandler = null;

export function setSessionEndHandler(handler) {
  onSessionEndHandler = handler;
}

async function parseResponseData(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch (_) {}
  }
  try {
    const text = await res.text();
    return text ? { message: text } : null;
  } catch (_) {}
  return null;
}

async function requestReal(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const reqOptions = {
    credentials: 'include',
    ...options
  };

  let res;
  try {
    res = await fetch(url, reqOptions);
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network failure. Please check your internet connection and try again.');
  }

  const data = await parseResponseData(res);

  if (!res.ok) {
    const status = res.status;
    const code = data?.error?.code || (status === 401 ? 'NOT_AUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'ERROR');
    const message = data?.error?.message || data?.message || (status === 401 ? 'Authentication required' : `Request failed (HTTP ${status})`);
    const details = data?.error?.details || [];

    const apiErr = new ApiError(status, code, message, details);

    // Notify auth session handler on 401 or account status 403
    if (status === 401 || (status === 403 && ['ACCOUNT_SUSPENDED', 'ACCOUNT_REJECTED', 'ACCOUNT_PENDING'].includes(code))) {
      if (typeof onSessionEndHandler === 'function') {
        onSessionEndHandler(apiErr);
      }
    }

    throw apiErr;
  }

  if (res.status === 204 || !data) {
    return { success: true };
  }

  return data;
}

export const apiClient = {
  async get(endpoint) {
    if (CONFIG.USE_DEV_ADAPTER) return handleDev('GET', endpoint, null);
    return requestReal(endpoint, { method: 'GET' });
  },

  async post(endpoint, body) {
    if (CONFIG.USE_DEV_ADAPTER) return handleDev('POST', endpoint, body);
    return requestReal(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },

  async put(endpoint, body) {
    if (CONFIG.USE_DEV_ADAPTER) return handleDev('PUT', endpoint, body);
    return requestReal(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },

  async delete(endpoint) {
    if (CONFIG.USE_DEV_ADAPTER) return handleDev('DELETE', endpoint, null);
    return requestReal(endpoint, { method: 'DELETE' });
  },

  async postForm(endpoint, formData) {
    if (CONFIG.USE_DEV_ADAPTER) return handleDev('POST', endpoint, {});
    // DO NOT set Content-Type header — browser sets it automatically with the boundary
    return requestReal(endpoint, {
      method: 'POST',
      body: formData
    });
  }
};

// ---------------------------------------------------------------------------
// Route table for dev adapter
// ---------------------------------------------------------------------------

function parsePattern(pattern) {
  const keys = [];
  const regexStr = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp('^' + regexStr + '$'), keys };
}

const ROUTES = [];

function route(method, pattern, handler) {
  const { regex, keys } = parsePattern(pattern);
  ROUTES.push({ method, regex, keys, handler });
}

function matchRoute(method, path) {
  for (const r of ROUTES) {
    if (r.method !== method) continue;
    const m = r.regex.exec(path);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => { params[k] = m[i + 1]; });
    return { handler: r.handler, params };
  }
  return null;
}

function handleDev(method, endpoint, body) {
  const currentUser = JSON.parse(localStorage.getItem('uiu_current_user') || '{}');
  const match = matchRoute(method, endpoint);
  if (!match) {
    throw new Error(`Dev adapter: endpoint not implemented: ${method} ${endpoint}`);
  }
  return match.handler(match.params, body, currentUser);
}

function deriveEventCount(ev) {
  ev.registeredCount = (ev.registeredUserIds || []).length;
  return ev;
}

// Dev adapter routes
route('GET', '/users/stats', (_, __, cu) => {
  const users = DevAdapter.getUsers();
  const jobs = DevAdapter.getJobs().filter(j => j.status === 'approved');
  const events = DevAdapter.getEvents();
  return {
    totalAlumni: users.filter(u => u.role === 'alumni' && u.status === 'approved').length,
    totalStudents: users.filter(u => u.role === 'student' && u.status === 'approved').length,
    activeJobs: jobs.length,
    upcomingEvents: events.length
  };
});

route('GET', '/users/mentors', (_, __, cu) => {
  return DevAdapter.getUsers().filter(u => u.role === 'alumni' && u.status === 'approved' && u.willingToMentor);
});

route('GET', '/users/:id', ({ id }, _, cu) => {
  return DevAdapter.getUsers().find(u => u.id === id) || null;
});

route('GET', '/jobs', (_, __, cu) => {
  return DevAdapter.getJobs();
});

route('GET', '/events', (_, __, cu) => {
  return DevAdapter.getEvents().map(deriveEventCount);
});

route('GET', '/mentorship/requests', (_, __, cu) => {
  return DevAdapter.getMentorshipRequests();
});

route('GET', '/donations', (_, __, cu) => {
  return DevAdapter.getDonations();
});

route('GET', '/admin/stats', (_, __, cu) => {
  const users = DevAdapter.getUsers();
  const jobs = DevAdapter.getJobs();
  const events = DevAdapter.getEvents();
  const donations = DevAdapter.getDonations();
  return {
    pendingApprovalsCount: users.filter(u => u.status === 'pending').length,
    totalAlumniCount: users.filter(u => u.role === 'alumni' && u.status === 'approved').length,
    totalStudentsCount: users.filter(u => u.role === 'student' && u.status === 'approved').length,
    pendingJobsCount: jobs.filter(j => j.status === 'pending').length,
    upcomingEventsCount: events.length,
    totalDonationsAmount: donations.reduce((sum, d) => sum + Number(d.amount || 0), 0)
  };
});

route('GET', '/chat/conversations', (_, __, cu) => {
  if (!cu || !cu.id) return [];
  const allMsgs = DevAdapter.getMessages();
  const allUsers = DevAdapter.getUsers();
  const clearedChats = DevAdapter.getClearedChats();

  const map = new Map();
  allMsgs.forEach(m => {
    const isSender = String(m.senderId) === String(cu.id);
    const isRecipient = String(m.recipientId) === String(cu.id);
    if (!isSender && !isRecipient) return;

    const partnerId = isSender ? String(m.recipientId) : String(m.senderId);
    const clearKey = `${cu.id}_${partnerId}`;
    const clearedAt = clearedChats[clearKey] || 0;
    const msgTime = new Date(m.createdAt || m.timestamp || 0).getTime();
    if (msgTime <= clearedAt) return;

    const partner = allUsers.find(u => String(u.id) === partnerId);
    const partnerName = partner ? partner.name : 'Unknown User';
    const initials = partnerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const textPreview = m.unsent ? 'Message unsent' : (m.text || 'Sent attachment');

    const existing = map.get(partnerId);
    if (!existing || msgTime > new Date(existing.lastMessageAt).getTime()) {
      map.set(partnerId, {
        userId: partnerId,
        name: partnerName,
        avatarInitials: initials,
        lastMessageText: textPreview,
        lastMessageAt: m.createdAt || m.timestamp || new Date().toISOString(),
        unreadCount: 0
      });
    }
  });

  const list = Array.from(map.values());
  list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return list;
});

route('GET', '/chat/conversations/:userId/messages', ({ userId }, _, cu) => {
  if (!cu || !cu.id) return [];
  const clearedChats = DevAdapter.getClearedChats();
  const clearKey = `${cu.id}_${userId}`;
  const clearedAt = clearedChats[clearKey] || 0;
  return DevAdapter.getMessages().filter(m => {
    const isMine = String(m.senderId) === String(cu.id) && String(m.recipientId) === String(userId);
    const isTheirs = String(m.senderId) === String(userId) && String(m.recipientId) === String(cu.id);
    if (!isMine && !isTheirs) return false;
    const msgTime = new Date(m.createdAt || m.timestamp || 0).getTime();
    return msgTime > clearedAt;
  });
});

route('POST', '/auth/login', (_, body, __) => {
  const users = DevAdapter.getUsers();
  const user = users.find(u => u.email.toLowerCase() === body.email.toLowerCase() && u.password === body.password);
  if (!user) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  if (user.status !== 'approved') throw new ApiError(403, `ACCOUNT_${user.status.toUpperCase()}`, `Your account is ${user.status}.`);
  return { user, token: 'dev-token-' + Date.now() };
});

route('POST', '/auth/register', (_, body, __) => {
  const users = DevAdapter.getUsers();
  if (users.find(u => u.email.toLowerCase() === body.email.toLowerCase())) {
    throw new ApiError(409, 'EMAIL_EXISTS', 'Email address is already registered');
  }
  const newUser = {
    ...body,
    id: 'u-' + Date.now(),
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0]
  };
  users.push(newUser);
  DevAdapter.saveUsers(users);
  return { success: true, message: 'Registration submitted, waiting for admin approval.' };
});

route('POST', '/events', (_, body, cu) => {
  if (!cu || cu.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin only');
  const events = DevAdapter.getEvents();
  const newEvent = {
    ...body,
    id: 'ev-' + Date.now(),
    registeredUserIds: [],
    createdAt: new Date().toISOString().split('T')[0]
  };
  events.push(newEvent);
  DevAdapter.saveEvents(events);
  return deriveEventCount(newEvent);
});

route('POST', '/events/:id/register', ({ id }, body, cu) => {
  if (!cu || !cu.id) throw new ApiError(401, 'NOT_AUTHENTICATED', 'Not authenticated');
  if (cu.role === 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin accounts cannot register for events');

  const events = DevAdapter.getEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) throw new ApiError(404, 'NOT_FOUND', 'Event not found');

  const ev = events[idx];
  if (!ev.registeredUserIds) ev.registeredUserIds = [];

  if (ev.registeredUserIds.includes(cu.id)) {
    throw new ApiError(409, 'ALREADY_REGISTERED', 'Already registered for this event');
  }
  if (ev.capacity && ev.registeredUserIds.length >= ev.capacity) {
    throw new ApiError(409, 'EVENT_FULL', 'Event is at full capacity');
  }

  ev.registeredUserIds.push(cu.id);
  DevAdapter.saveEvents(events);
  return deriveEventCount({ ...ev });
});

route('POST', '/jobs', (_, body, cu) => {
  const jobs = DevAdapter.getJobs();
  const newJob = {
    ...body,
    id: 'jb-' + Date.now(),
    status: 'pending',
    applicantsCount: 0,
    createdAt: new Date().toISOString().split('T')[0]
  };
  jobs.push(newJob);
  DevAdapter.saveJobs(jobs);
  return newJob;
});

route('POST', '/jobs/apply', (_, body, cu) => {
  const apps = DevAdapter.getJobApplications();
  const newApp = {
    ...body,
    id: 'ja-' + Date.now(),
    createdAt: new Date().toISOString()
  };
  apps.push(newApp);
  DevAdapter.saveJobApplications(apps);

  const jobs = DevAdapter.getJobs();
  const jobIndex = jobs.findIndex(j => j.id === body.jobId);
  if (jobIndex !== -1) {
    if (!Array.isArray(jobs[jobIndex].applications)) jobs[jobIndex].applications = [];
    const alreadyApplied = jobs[jobIndex].applications.some(a => a.applicantId === body.applicantId);
    if (!alreadyApplied) {
      jobs[jobIndex].applications.push({ applicantId: body.applicantId, applicantName: body.applicantName });
    }
    DevAdapter.saveJobs(jobs);
  }
  return newApp;
});

route('POST', '/mentorship/requests', (_, body, cu) => {
  const reqs = DevAdapter.getMentorshipRequests();
  const active = reqs.find(r =>
    r.requesterId === body.requesterId && r.mentorId === body.mentorId &&
    (r.status === 'pending' || r.status === 'accepted')
  );
  if (active) {
    throw new ApiError(409, 'DUPLICATE_REQUEST', 'You already have an active mentorship request with this mentor.');
  }
  const newReq = {
    ...body,
    id: 'mr-' + Date.now(),
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0]
  };
  reqs.push(newReq);
  DevAdapter.saveMentorshipRequests(reqs);
  return newReq;
});

route('POST', '/donations', (_, body, cu) => {
  const dons = DevAdapter.getDonations();
  const newDonation = {
    ...body,
    id: 'dn-' + Date.now(),
    createdAt: new Date().toISOString()
  };
  dons.push(newDonation);
  DevAdapter.saveDonations(dons);
  return newDonation;
});

route('POST', '/chat/conversations/:userId/messages', ({ userId }, body, cu) => {
  if (!cu || !cu.id) throw new ApiError(401, 'NOT_AUTHENTICATED', 'Not authenticated');
  const msgs = DevAdapter.getMessages();
  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    senderId: cu.id,
    recipientId: userId,
    text: body.text || '',
    attachment: body.attachment || null,
    createdAt: new Date().toISOString(),
    unsent: false
  };
  msgs.push(newMsg);
  DevAdapter.saveMessages(msgs);
  return newMsg;
});

route('PUT', '/users/:id', ({ id }, body, cu) => {
  const users = DevAdapter.getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...body };
    DevAdapter.saveUsers(users);
    return users[index];
  }
  return { success: true };
});

route('PUT', '/admin/users/:id', ({ id }, body, cu) => {
  const users = DevAdapter.getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...body };
    DevAdapter.saveUsers(users);
    return users[index];
  }
  return { success: true };
});

route('PUT', '/events/:id', ({ id }, body, cu) => {
  if (!cu || cu.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin only');
  const events = DevAdapter.getEvents();
  const index = events.findIndex(e => e.id === id);
  if (index !== -1) {
    const preserved = events[index].registeredUserIds || [];
    events[index] = { ...events[index], ...body, registeredUserIds: preserved };
    DevAdapter.saveEvents(events);
    return deriveEventCount({ ...events[index] });
  }
  return { success: true };
});

route('PUT', '/jobs/:id', ({ id }, body, cu) => {
  const jobs = DevAdapter.getJobs();
  const index = jobs.findIndex(j => j.id === id);
  if (index !== -1) {
    jobs[index] = { ...jobs[index], ...body };
    DevAdapter.saveJobs(jobs);
    return jobs[index];
  }
  return { success: true };
});

route('PUT', '/mentorship/requests/:id', ({ id }, body, cu) => {
  const reqs = DevAdapter.getMentorshipRequests();
  const index = reqs.findIndex(r => r.id === id);
  if (index !== -1) {
    reqs[index] = { ...reqs[index], ...body };
    DevAdapter.saveMentorshipRequests(reqs);
    return reqs[index];
  }
  return { success: true };
});

route('DELETE', '/events/:id/register', ({ id }, _, cu) => {
  if (!cu || !cu.id) throw new ApiError(401, 'NOT_AUTHENTICATED', 'Not authenticated');
  const events = DevAdapter.getEvents();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) throw new ApiError(404, 'NOT_FOUND', 'Event not found');

  const ev = events[idx];
  if (!ev.registeredUserIds) ev.registeredUserIds = [];
  ev.registeredUserIds = ev.registeredUserIds.filter(uid => uid !== cu.id);
  DevAdapter.saveEvents(events);
  return { success: true };
});

route('DELETE', '/events/:id', ({ id }, _, cu) => {
  if (!cu || cu.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin only');
  let events = DevAdapter.getEvents().filter(e => e.id !== id);
  DevAdapter.saveEvents(events);
  return { success: true };
});

route('DELETE', '/mentorship/requests/:id', ({ id }, _, cu) => {
  if (!cu || !cu.id) throw new ApiError(401, 'NOT_AUTHENTICATED', 'Not authenticated');
  const reqs = DevAdapter.getMentorshipRequests();
  const index = reqs.findIndex(r => r.id === id);
  if (index === -1) throw new ApiError(404, 'NOT_FOUND', 'Request not found');

  const req = reqs[index];
  const isRequester = String(req.requesterId) === String(cu.id);
  const isMentor = String(req.mentorId) === String(cu.id);

  if (!isRequester && !isMentor) throw new ApiError(403, 'FORBIDDEN', 'Not authorized');

  if (req.status === 'pending' && isRequester) {
    reqs[index] = { ...req, status: 'cancelled' };
  } else if (req.status === 'accepted' && (isRequester || isMentor)) {
    reqs[index] = { ...req, status: 'ended' };
  } else {
    throw new ApiError(400, 'INVALID_STATUS', 'Cannot cancel a request in current status: ' + req.status);
  }

  DevAdapter.saveMentorshipRequests(reqs);
  return { success: true, status: reqs[index].status };
});

route('DELETE', '/chat/messages/:id', ({ id }, _, cu) => {
  if (!cu || !cu.id) throw new ApiError(401, 'NOT_AUTHENTICATED', 'Not authenticated');
  let msgs = DevAdapter.getMessages();
  const index = msgs.findIndex(m => String(m.id) === String(id) && String(m.senderId) === String(cu.id));
  if (index !== -1) {
    msgs[index].unsent = true;
    msgs[index].text = '';
    msgs[index].attachment = null;
    DevAdapter.saveMessages(msgs);
  }
  return { success: true };
});

route('DELETE', '/chat/conversations/:userId', ({ userId }, _, cu) => {
  if (!cu || !cu.id) throw new ApiError(401, 'NOT_AUTHENTICATED', 'Not authenticated');
  const cleared = DevAdapter.getClearedChats();
  cleared[`${cu.id}_${userId}`] = Date.now();
  DevAdapter.saveClearedChats(cleared);
  return { success: true };
});

route('DELETE', '/jobs/:id', ({ id }, _, cu) => {
  let jobs = DevAdapter.getJobs().filter(j => j.id !== id);
  DevAdapter.saveJobs(jobs);
  return { success: true };
});
