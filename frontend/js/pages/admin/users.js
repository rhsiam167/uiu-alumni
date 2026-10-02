// Admin Users Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { getRelativeRoot, getIcon } from '../../utils.js';

let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!await auth.requireRole('admin')) return;

  renderNavbar('admin-users');
  renderFooter();

  await loadUsers();

  const searchInput = document.getElementById('users-search');
  const roleFilter = document.getElementById('users-role-filter');
  const statusFilter = document.getElementById('users-status-filter');

  const applyFilters = () => {
    const q = searchInput.value.toLowerCase().trim();
    const role = roleFilter.value;
    const status = statusFilter.value;

    const filtered = allUsers.filter(u => {
      const matchQ = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || ((u.studentId || '').toLowerCase().includes(q));
      const matchRole = !role || u.role === role;
      const matchStatus = !status || u.status === status;
      return matchQ && matchRole && matchStatus;
    });

    renderTable(filtered);
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (roleFilter) roleFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
});

async function loadUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  try {
    const res = await apiClient.get('/admin/users?limit=100');
    allUsers = res.items || res || [];
    renderTable(allUsers);
  } catch (err) {
    console.error('Failed to load users:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-danger);">Failed to load users: ${err.message}</td></tr>`;
  }
}

function renderTable(users) {
  const tbody = document.getElementById('admin-users-tbody');
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No matching users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight: 700;">
        ${u.name}
        ${u.verified ? `<span class="badge badge-verified" style="margin-left: 4px;">${getIcon('badgeCheck')} Verified</span>` : ''}
      </td>
      <td>${u.email}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td>${u.studentId || 'N/A'}</td>
      <td>${u.department || 'N/A'}</td>
      <td><span class="badge badge-${u.status}">${u.status}</span></td>
      <td style="text-align: right;">
        <a href="${getRelativeRoot()}pages/admin/user-details.html?id=${u.id}" class="btn btn-secondary btn-sm">View &amp; Review</a>
      </td>
    </tr>
  `).join('');
}
