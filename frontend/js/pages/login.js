// Login Page Handler
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { apiClient } from '../api/client.js';
import { auth } from '../auth.js';
import { CONFIG } from '../config.js';
import { validateEmail, validatePassword } from '../validators.js';
import { getRelativeRoot, getIcon } from '../utils.js';

function getErrorMessage(code, defaultMsg = '', details = []) {
  if (code === 'ACCOUNT_PENDING') {
    return 'Your account is waiting for admin approval.';
  }
  if (code === 'ACCOUNT_REJECTED') {
    const reason = details[0]?.message || defaultMsg || 'No reason provided';
    return `Your account application was rejected: ${reason}`;
  }
  if (code === 'ACCOUNT_SUSPENDED') {
    return 'Your account has been suspended.';
  }
  if (code === 'INVALID_CREDENTIALS') {
    return 'Invalid email or password.';
  }
  if (code === 'TOO_MANY_REQUESTS' || code === '429') {
    return 'Too many login attempts. Please try again later.';
  }
  return defaultMsg || 'Login failed. Please check your credentials.';
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar('home');
  renderFooter();

  // Hide demo credentials box when USE_DEV_ADAPTER is false
  const demoBox = document.getElementById('demo-credentials-box');
  if (demoBox && !CONFIG.USE_DEV_ADAPTER) {
    demoBox.style.display = 'none';
  }

  // If already logged in with active session, redirect away
  const currentUser = auth.getCurrentUser();
  if (currentUser && currentUser.status === 'approved') {
    redirectUser(currentUser);
    return;
  }

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const alertBox = document.getElementById('login-alert');

  // Check URL parameters for session end codes / reasons
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code') || urlParams.get('reason');
  const msgParam = urlParams.get('msg') || urlParams.get('reasonText');
  if (codeParam) {
    alertBox.textContent = getErrorMessage(codeParam, msgParam);
    alertBox.style.display = 'flex';
  }

  if (togglePassBtn) {
    togglePassBtn.innerHTML = getIcon('eye');
    togglePassBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePassBtn.innerHTML = isPassword ? getIcon('eyeOff') : getIcon('eye');
      togglePassBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    document.getElementById('email-error').textContent = emailErr || '';
    document.getElementById('password-error').textContent = passErr || '';

    if (emailErr || passErr) return;

    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const data = await apiClient.post('/auth/login', { email, password });
      auth.setCurrentUser(data.user);

      // Check URL redirect parameter
      const redirectUrl = urlParams.get('redirect');
      if (redirectUrl) {
        window.location.href = decodeURIComponent(redirectUrl);
      } else {
        redirectUser(data.user);
      }
    } catch (err) {
      const displayMsg = getErrorMessage(err.code || (err.status === 429 ? '429' : ''), err.message, err.details);
      alertBox.textContent = displayMsg;
      alertBox.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
});

function redirectUser(user) {
  const root = getRelativeRoot();
  if (user.role === 'admin') {
    window.location.href = `${root}pages/admin/dashboard.html`;
  } else {
    window.location.href = `${root}pages/dashboard.html`;
  }
}
