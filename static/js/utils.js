function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '<i class="fas fa-check"></i>', error: '<i class="fas fa-xmark"></i>', info: '<i class="fas fa-info"></i>' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, duration);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function debounce(fn, delay) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

async function apiFetch(url, options = {}) {
  const defaults = { headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  const res = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } });
  if (!res.ok && res.status === 401) { window.location.href = '/admin/login'; return {}; }
  return res.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderIcon(icon, defaultCls) {
  const cls = (icon || '').trim();
  if (!cls && !defaultCls) return '';
  const src = cls || defaultCls;
  if (src.includes('fa-')) return `<i class="${src}"></i>`;
  return escapeHtml(src);
}
