// Donate Page Handler
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { showSuccessModal } from '../components/modal.js';
import { formatDate, getRelativeRoot } from '../utils.js';
import { showToast } from '../components/toast.js';

let selectedAmount = 1000;

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('donate');
  renderFooter();

  const user = auth.getCurrentUser();

  // Load real fund statistics from existing donations
  await refreshFundStats();

  // Amount pills handler
  const amountPills = document.querySelectorAll('.amount-pill');
  const customWrapper = document.getElementById('custom-amount-wrapper');
  const customInput = document.getElementById('donate-custom-amount');
  const purposeSelect = document.getElementById('donate-purpose');

  // Select 1000 by default
  const defaultPill = document.querySelector('.amount-pill[data-amount="1000"]');
  if (defaultPill) {
    defaultPill.classList.remove('btn-outline');
    defaultPill.classList.add('btn-primary');
  }

  amountPills.forEach(pill => {
    pill.addEventListener('click', () => {
      amountPills.forEach(p => {
        p.classList.remove('btn-primary');
        p.classList.add('btn-outline');
      });
      pill.classList.remove('btn-outline');
      pill.classList.add('btn-primary');

      const val = pill.getAttribute('data-amount');
      if (val === 'custom') {
        customWrapper.style.display = 'block';
        customInput.focus();
        selectedAmount = Number(customInput.value) || 0;
      } else {
        customWrapper.style.display = 'none';
        selectedAmount = Number(val);
      }
    });
  });

  if (customInput) {
    customInput.addEventListener('input', () => {
      selectedAmount = Number(customInput.value) || 0;
    });
  }

  // Drive card click syncs with dropdown select
  document.querySelectorAll('.fund-drive-card').forEach(card => {
    card.addEventListener('click', () => {
      const fund = card.getAttribute('data-fund');
      if (purposeSelect && fund) {
        purposeSelect.value = fund;
        // Highlight active drive card
        document.querySelectorAll('.fund-drive-card').forEach(c => c.style.borderColor = 'var(--color-border-light)');
        card.style.borderColor = 'var(--color-primary)';
      }
    });
  });

  const form = document.getElementById('donate-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!user) {
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${getRelativeRoot()}pages/login.html?redirect=${currentPath}`;
      return;
    }

    const purpose = purposeSelect.value;
    const message = document.getElementById('donate-message').value.trim();
    const isAnonymous = document.getElementById('donate-anonymous').checked;

    if (!selectedAmount || selectedAmount <= 0) {
      showToast('Please enter or select a valid contribution amount.', 'error');
      return;
    }

    const submitBtn = document.getElementById('donate-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
      await apiClient.post('/donations', {
        userId: user.id,
        userName: user.name,
        amount: selectedAmount,
        purpose,
        message,
        isAnonymous,
        timestamp: new Date().toISOString()
      });

      showSuccessModal({
        title: 'Thank You for Your Support!',
        message: `Your contribution of ৳${selectedAmount.toLocaleString()} BDT to the ${purpose} has been recorded successfully. Thank you for empowering UIU!`,
        buttonText: 'Done',
        onConfirm: async () => {
          form.reset();
          submitBtn.disabled = false;
          submitBtn.textContent = 'Complete Donation';
          await refreshFundStats();
          loadMyDonations(user);
        }
      });
    } catch (err) {
      showToast('Failed to record contribution.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Donation';
    }
  });

  if (user) {
    loadMyDonations(user);
  } else {
    const listEl = document.getElementById('my-donations-list');
    if (listEl) {
      listEl.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Please log in to view your contribution history.</p>`;
    }
  }
});

async function refreshFundStats() {
  try {
    const summaryArray = await apiClient.get('/donations/summary');
    const items = Array.isArray(summaryArray) ? summaryArray : [];
    const map = new Map(items.map(item => [item.purpose, item]));

    const gen = map.get('General Fund') || { totalAmount: 0, donorCount: 0 };
    const sch = map.get('Scholarship Fund') || { totalAmount: 0, donorCount: 0 };
    const emg = map.get('Emergency Fund') || { totalAmount: 0, donorCount: 0 };

    const genTot = document.getElementById('stat-general-total');
    if (genTot) genTot.textContent = `${Number(gen.totalAmount || 0).toLocaleString()} BDT`;
    const genDon = document.getElementById('stat-general-donors');
    if (genDon) genDon.textContent = `${Number(gen.donorCount || 0)}`;

    const schTot = document.getElementById('stat-scholarship-total');
    if (schTot) schTot.textContent = `${Number(sch.totalAmount || 0).toLocaleString()} BDT`;
    const schDon = document.getElementById('stat-scholarship-donors');
    if (schDon) schDon.textContent = `${Number(sch.donorCount || 0)}`;

    const emgTot = document.getElementById('stat-emergency-total');
    if (emgTot) emgTot.textContent = `${Number(emg.totalAmount || 0).toLocaleString()} BDT`;
    const emgDon = document.getElementById('stat-emergency-donors');
    if (emgDon) emgDon.textContent = `${Number(emg.donorCount || 0)}`;

  } catch (err) {
    console.error('Failed to load donation summary:', err);
  }
}

async function loadMyDonations(user) {
  const container = document.getElementById('my-donations-list');
  if (!container) return;

  try {
    const donations = await apiClient.get('/donations');
    const myDons = Array.isArray(donations) ? donations : (donations.items || []);

    if (myDons.length === 0) {
      container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted); padding: var(--space-4) 0;">You haven't made any contributions yet.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Fund Drive</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${myDons.map(d => `
              <tr>
                <td>${formatDate(d.createdAt || d.timestamp)}</td>
                <td><strong>${d.purpose}</strong> ${d.isAnonymous ? '<span class="badge" style="background:#F1F5F9;">Anonymous</span>' : ''}</td>
                <td style="font-weight: 700; color: var(--color-primary);">৳${Number(d.amount).toLocaleString()} BDT</td>
                <td><span class="badge badge-approved">Recorded</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load my donations history:', err);
    container.innerHTML = `<p style="color: var(--color-danger);">Failed to load contribution history.</p>`;
  }
}
