// ============================================================================
// EDUCORE LMS — UI COMPONENTS MODULE (ui-components.js)
// Unified Toast System, Skeleton Loaders, Status Badges & UI Helpers
// ============================================================================

/**
 * Display a Toast Notification card
 * @param {'success'|'error'|'warning'|'info'} type 
 * @param {string} title 
 * @param {string} message 
 * @param {number} durationMs 
 */
export function showToast(type = 'info', title = '', message = '', durationMs = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `educore-toast toast-${type}`;
  toast.innerHTML = `
    <div class="educore-toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="educore-toast-content">
      ${title ? `<div class="educore-toast-title">${escHTML(title)}</div>` : ''}
      <div class="educore-toast-message">${escHTML(message)}</div>
    </div>
    <button class="educore-toast-close" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.educore-toast-close');
  const dismiss = () => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  };

  closeBtn.addEventListener('click', dismiss);

  container.appendChild(toast);

  if (durationMs > 0) {
    setTimeout(dismiss, durationMs);
  }
}

/**
 * Escapes HTML characters for security
 */
function escHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Returns HTML string for Card Skeleton Loaders
 * @param {number} count 
 */
export function renderSkeletonCards(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
      </div>
    `;
  }
  return html;
}

/**
 * Returns HTML string for Table Row Skeleton Loaders
 * @param {number} rows 
 * @param {number} cols 
 */
export function renderSkeletonTableRows(rows = 5, cols = 4) {
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<td><div class="skeleton skeleton-text" style="width: ${60 + (c * 10)}%;"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}

/**
 * Returns HTML string for Status Badges
 * @param {'success'|'warning'|'danger'|'info'|'neutral'} type 
 * @param {string} text 
 */
export function renderLMSBadge(type = 'info', text = '') {
  return `<span class="badge-lms badge-lms-${type}">${escHTML(text)}</span>`;
}
