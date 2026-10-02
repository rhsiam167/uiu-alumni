// Input Validators for UIU Alumni Portal

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!re.test(email.trim())) return 'Invalid email address format';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validateRequired(value, fieldName = 'Field') {
  if (!value || !value.toString().trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateMatch(val1, val2, fieldName = 'Passwords') {
  if (val1 !== val2) {
    return `${fieldName} do not match`;
  }
  return null;
}
