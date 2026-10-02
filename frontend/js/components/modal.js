// Modal & Dialog Helper Module
import { getIcon } from '../utils.js';

export function showModal({ title, content, footerHtml = '', onClose = null }) {
  let modalBackdrop = document.getElementById('global-modal-backdrop');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'global-modal-backdrop';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn" id="modal-close-x">${getIcon('x')}</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>
  `;

  modalBackdrop.classList.add('show');

  const closeBtn = document.getElementById('modal-close-x');
  const closeModal = () => {
    modalBackdrop.classList.remove('show');
    if (onClose) onClose();
  };

  closeBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  return { close: closeModal };
}

export function showSuccessModal({ title = 'Success!', message, buttonText = 'Continue', onConfirm = null }) {
  const content = `
    <div style="text-align: center; padding: var(--space-4) 0;">
      <div class="success-modal-icon">
        ${getIcon('checkCircle')}
      </div>
      <h3 style="font-size: var(--font-size-2xl); margin-bottom: var(--space-2); color: var(--color-text-main);">${title}</h3>
      <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-6); line-height: 1.6;">${message}</p>
      <button id="success-modal-btn" class="btn btn-primary btn-lg" style="width: 100%;">${buttonText}</button>
    </div>
  `;

  let modalInstance = showModal({ title: '', content });

  document.getElementById('success-modal-btn').addEventListener('click', () => {
    modalInstance.close();
    if (onConfirm) onConfirm();
  });
}

export function showConfirmModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
  const content = `<p>${message}</p>`;
  const footerHtml = `
    <button id="confirm-cancel-btn" class="btn btn-secondary">${cancelText}</button>
    <button id="confirm-ok-btn" class="btn btn-danger">${confirmText}</button>
  `;

  let modalInstance = showModal({ title, content, footerHtml });

  document.getElementById('confirm-cancel-btn').addEventListener('click', () => modalInstance.close());
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    modalInstance.close();
    if (onConfirm) onConfirm();
  });
}
