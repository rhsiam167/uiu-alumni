// Admin Donations Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { formatDate } from '../../utils.js';
import { showToast } from '../../components/toast.js';

let allDonations = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.requireRole('admin')) return;

  renderNavbar('admin-donations');
  renderFooter();

  loadDonations();

  document.getElementById('admin-donations-purpose-filter').addEventListener('change', (e) => {
    const purpose = e.target.value;
    const filtered = purpose ? allDonations.filter(d => d.purpose === purpose) : allDonations;
    renderTable(filtered);
  });

  document.getElementById('admin-donations-export-btn').addEventListener('click', () => {
    exportToCSV();
  });
});

async function loadDonations() {
  try {
    const res = await apiClient.get('/donations?limit=100');
    allDonations = res.items || (Array.isArray(res) ? res : []);

    const totalAmount = res.totalAmount !== undefined
      ? res.totalAmount
      : allDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

    document.getElementById('admin-total-donations-amount').textContent = `${Number(totalAmount).toLocaleString()} BDT`;
    document.getElementById('admin-total-donations-count').textContent = `${res.total ?? allDonations.length} Total Contributions`;

    renderTable(allDonations);
  } catch (err) {
    showToast(err.message || 'Failed to load donations', 'danger');
  }
}

function renderTable(donations) {
  const tbody = document.getElementById('admin-donations-tbody');
  if (!donations || donations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">No donations recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = donations.map(d => `
    <tr>
      <td style="font-weight: 700;">${d.donorName || d.userName || 'Anonymous Donor'}</td>
      <td>
        ${d.isAnonymous ? '<span class="badge badge-pending">Anonymous Publicly</span>' : '<span class="badge badge-approved">Public</span>'}
      </td>
      <td style="font-weight: 800; color: var(--color-primary);">${Number(d.amount).toLocaleString()} BDT</td>
      <td>${d.purpose}</td>
      <td>${formatDate(d.createdAt || d.timestamp)}</td>
      <td style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${d.message || '—'}</td>
    </tr>
  `).join('');
}

function exportToCSV() {
  window.open(`${apiClient.defaults ? apiClient.defaults.baseURL : '/api'}/admin/donations.csv`, '_blank');
}
