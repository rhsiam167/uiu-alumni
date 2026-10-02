// Register Page Script
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { showSuccessModal } from '../components/modal.js';
import { apiClient } from '../api/client.js';
import { validateEmail, validatePassword, validateMatch } from '../validators.js';
import { getRelativeRoot, showToast } from '../utils.js';

let selectedRole = 'alumni';

function clearErrors() {
  const alertBox = document.getElementById('register-alert');
  if (alertBox) alertBox.style.display = 'none';
  document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
}

function displayFieldError(field, message) {
  const errEl = document.getElementById(`err-${field}`);
  if (errEl) {
    errEl.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar('home');
  renderFooter();

  const roleSelectSec = document.getElementById('role-select-section');
  const registerFormSec = document.getElementById('register-form-section');
  const studentCard = document.getElementById('select-student-card');
  const alumniCard = document.getElementById('select-alumni-card');
  const changeRoleBtn = document.getElementById('change-role-btn');
  const formRoleTitle = document.getElementById('form-role-title');

  const alumniFields = document.querySelectorAll('.alumni-only-field');
  const studentFields = document.querySelectorAll('.student-only-field');

  function setRole(role) {
    selectedRole = role;
    roleSelectSec.style.display = 'none';
    registerFormSec.style.display = 'block';

    if (role === 'student') {
      formRoleTitle.textContent = 'Student Registration';
      alumniFields.forEach(el => el.style.display = 'none');
      studentFields.forEach(el => el.style.display = 'block');
    } else {
      formRoleTitle.textContent = 'Alumni Registration';
      alumniFields.forEach(el => el.style.display = 'block');
      studentFields.forEach(el => el.style.display = 'none');
    }
    clearErrors();
  }

  studentCard.addEventListener('click', () => setRole('student'));
  alumniCard.addEventListener('click', () => setRole('alumni'));
  changeRoleBtn.addEventListener('click', () => {
    registerFormSec.style.display = 'none';
    roleSelectSec.style.display = 'block';
    clearErrors();
  });

  const form = document.getElementById('register-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm-password').value;
    const studentId = document.getElementById('reg-studentid').value.trim();
    const department = document.getElementById('reg-department').value;
    const program = document.getElementById('reg-program').value.trim();

    const passErr = validatePassword(password);
    const matchErr = validateMatch(password, confirmPass, 'Passwords');
    const emailErr = validateEmail(email);

    let hasClientErr = false;
    if (emailErr) { displayFieldError('email', emailErr); hasClientErr = true; }
    if (passErr) { displayFieldError('password', passErr); hasClientErr = true; }
    if (matchErr) { displayFieldError('confirmPassword', matchErr); hasClientErr = true; }

    if (hasClientErr) return;

    const payload = {
      name,
      email,
      password,
      role: selectedRole,
      studentId
    };

    if (phone) payload.phone = phone;
    if (department) payload.department = department;
    if (program) payload.program = program;

    if (selectedRole === 'alumni') {
      const gradYear = document.getElementById('reg-gradyear').value.trim();
      const company = document.getElementById('reg-company').value.trim();
      const jobTitle = document.getElementById('reg-jobtitle').value.trim();
      const linkedin = document.getElementById('reg-linkedin').value.trim();
      const city = document.getElementById('reg-city').value.trim();

      if (gradYear !== '') payload.graduationYear = Number(gradYear);
      if (company) payload.company = company;
      if (jobTitle) payload.jobTitle = jobTitle;
      if (linkedin) payload.linkedin = linkedin;
      if (city) payload.city = city;
    } else {
      const semester = document.getElementById('reg-semester').value.trim();
      const expectedGrad = document.getElementById('reg-expectedgrad').value.trim();

      if (semester) payload.currentSemester = semester;
      if (expectedGrad !== '') payload.expectedGraduation = Number(expectedGrad);
    }

    const submitBtn = document.getElementById('reg-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      await apiClient.post('/auth/register', payload);

      showSuccessModal({
        title: 'Registration Submitted',
        message: 'Your account registration has been submitted successfully! An administrator will review your academic details. You will be able to log in once approved.',
        buttonText: 'Return to Login',
        onConfirm: () => {
          window.location.href = `${getRelativeRoot()}pages/login.html`;
        }
      });
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Registration';

      const alertBox = document.getElementById('register-alert');

      if (err.code === 'EMAIL_EXISTS') {
        displayFieldError('email', 'An account with this email address already exists.');
        if (alertBox) {
          alertBox.textContent = 'Registration failed: Email address already registered.';
          alertBox.style.display = 'flex';
        }
      } else if (err.code === 'STUDENT_ID_EXISTS') {
        displayFieldError('studentId', 'An account with this Student ID already exists.');
        if (alertBox) {
          alertBox.textContent = 'Registration failed: Student ID already registered.';
          alertBox.style.display = 'flex';
        }
      } else if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        err.details.forEach(d => {
          if (d.field) displayFieldError(d.field, d.message);
        });
        if (alertBox) {
          alertBox.textContent = 'Please fix the errors indicated below.';
          alertBox.style.display = 'flex';
        }
      } else {
        if (alertBox) {
          alertBox.textContent = err.message || 'Registration failed. Please try again.';
          alertBox.style.display = 'flex';
        } else {
          showToast(err.message || 'Registration failed', 'error');
        }
      }
    }
  });
});
