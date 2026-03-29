/**
 * Beauty Bistro — main.js
 * ========================
 * All frontend logic wired to the Flask API.
 * Loaded via:  <script src="{{ url_for('static', filename='js/main.js') }}" defer></script>
 */

'use strict';

/* ============================================================
   STATE
   ============================================================ */
let currentUser = null;  // { name, email, is_admin } or null

/* ============================================================
   API HELPERS
   ============================================================ */
async function apiPost(url, body = {}) {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  return res.json();
}

async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  return res.json();
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ============================================================
   MOBILE NAVIGATION
   ============================================================ */
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNav    = document.getElementById('mobileNav');

hamburgerBtn?.addEventListener('click', () => {
  mobileNav.classList.contains('open') ? closeMobileNav() : openMobileNav();
});

function openMobileNav() {
  mobileNav.classList.add('open');
  hamburgerBtn.classList.add('open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
}

function closeMobileNav() {
  mobileNav?.classList.remove('open');
  hamburgerBtn?.classList.remove('open');
  hamburgerBtn?.setAttribute('aria-expanded', 'false');
}

// Close on outside click
document.addEventListener('click', e => {
  if (hamburgerBtn && mobileNav &&
      !hamburgerBtn.contains(e.target) &&
      !mobileNav.contains(e.target)) {
    closeMobileNav();
  }
});

// Close everything on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeMobileNav();
    closeBookingModal();
    closeLoginModal();
  }
});

/* ============================================================
   SMOOTH SCROLL (accounts for fixed navbar)
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const navH = parseInt(getComputedStyle(document.documentElement)
                   .getPropertyValue('--nav-height')) || 70;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - navH - 10,
        behavior: 'smooth'
      });
    }
  });
});

/* ============================================================
   NAV SCROLL SHADOW
   ============================================================ */
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) {
    nav.style.boxShadow = window.scrollY > 20
      ? '0 4px 25px rgba(0,0,0,0.12)'
      : '0 2px 20px rgba(0,0,0,0.06)';
  }
}, { passive: true });

/* ============================================================
   SCROLL ANIMATIONS
   ============================================================ */
const scrollObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      scrollObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.animate-on-scroll').forEach(el => scrollObs.observe(el));

/* ============================================================
   DATE MINIMUM
   ============================================================ */
const today = new Date().toISOString().split('T')[0];
document.querySelectorAll('input[type="date"]').forEach(i => { i.min = today; });

/* ============================================================
   BOOKING MODAL — 4-STEP WIZARD
   ============================================================ */
function openBookingModal(serviceName = '') {
  document.getElementById('bookingModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  resetBookingSteps();
  if (serviceName) {
    const sel = document.getElementById('modal-service');
    [...sel.options].forEach((o, i) => { if (o.value === serviceName) sel.selectedIndex = i; });
  }
}

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('active');
  document.body.style.overflow = '';
  resetBookingSteps();
}

function resetBookingSteps() {
  ['step1','step2','step3','step4'].forEach((id, i) => {
    document.getElementById(id).style.display = i === 0 ? 'block' : 'none';
  });
  document.querySelectorAll('.step-label').forEach((el, i) => el.classList.toggle('active', i === 0));
  // Reset confirm button
  const btn = document.getElementById('confirm-btn');
  if (btn) { btn.textContent = 'Confirm Booking'; btn.disabled = false; }
}

function nextStep(step) {
  if (step === 2 && !document.getElementById('modal-service').value) {
    showToast('Please select a service.', 'error'); return;
  }
  if (step === 3) {
    if (!document.getElementById('modal-date').value ||
        !document.getElementById('modal-time').value) {
      showToast('Please select a date and time.', 'error'); return;
    }
  }
  ['step1','step2','step3','step4'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('step' + step).style.display = 'block';
  document.querySelectorAll('.step-label').forEach((el, i) => el.classList.toggle('active', i === step - 1));
}

function prevStep(step) {
  ['step1','step2','step3','step4'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('step' + step).style.display = 'block';
  document.querySelectorAll('.step-label').forEach((el, i) => el.classList.toggle('active', i === step - 1));
}

async function confirmBooking() {
  const name  = document.getElementById('modal-name').value.trim();
  const email = document.getElementById('modal-email').value.trim();
  const phone = document.getElementById('modal-phone').value.trim();
  const notes = document.getElementById('modal-notes').value.trim();

  if (!name || !phone) {
    showToast('Name and phone number are required.', 'error'); return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'error'); return;
  }

  const btn = document.getElementById('confirm-btn');
  btn.textContent = 'Booking…';
  btn.disabled    = true;

  try {
    const data = await apiPost('/api/book', {
      service: document.getElementById('modal-service').value,
      date:    document.getElementById('modal-date').value,
      time:    document.getElementById('modal-time').value,
      name, email, phone, notes
    });

    if (data.success) {
      document.getElementById('step3').style.display = 'none';
      document.getElementById('step4').style.display = 'block';

      // Inject WhatsApp button
      const step4 = document.getElementById('step4');
      const existing = step4.querySelector('.wa-confirm-btn');
      if (!existing && data.whatsapp_url) {
        const wa = document.createElement('a');
        wa.href      = data.whatsapp_url;
        wa.target    = '_blank';
        wa.rel       = 'noopener noreferrer';
        wa.className = 'btn wa-confirm-btn';
        wa.style.cssText = 'background:#25D366;color:#fff;margin-top:10px;display:inline-block;';
        wa.innerHTML = '💬 Confirm on WhatsApp';
        step4.querySelector('.btn-primary').insertAdjacentElement('afterend', wa);
      }

      showToast('Booking confirmed! 🎉', 'success');
      if (currentUser) loadMyBookings();
    } else {
      showToast(data.error || 'Booking failed. Please try again.', 'error');
      btn.textContent = 'Confirm Booking';
      btn.disabled    = false;
    }
  } catch {
    showToast('Network error. Please check your connection.', 'error');
    btn.textContent = 'Confirm Booking';
    btn.disabled    = false;
  }
}

/* ============================================================
   QUICK BOOKING FORM
   ============================================================ */
async function quickBook() {
  const service = document.getElementById('quick-service').value;
  const date    = document.getElementById('quick-date').value;
  const time    = document.getElementById('quick-time').value;
  const name    = document.getElementById('quick-name').value.trim();
  const phone   = document.getElementById('quick-phone').value.trim();

  if (!service || !date || !time || !name || !phone) {
    showToast('Please fill in all fields.', 'error'); return;
  }

  const btn = document.getElementById('quick-book-btn');
  btn.textContent = 'Booking…';
  btn.disabled    = true;

  try {
    const data = await apiPost('/api/book', { service, date, time, name, phone, email: '', notes: '' });

    if (data.success) {
      showToast('Booking received! We will contact you shortly. 💛', 'success');
      ['quick-service','quick-date','quick-time','quick-name','quick-phone'].forEach(id => {
        document.getElementById(id).value = '';
      });
      if (data.whatsapp_url) {
        setTimeout(() => window.open(data.whatsapp_url, '_blank'), 1500);
      }
    } else {
      showToast(data.error || 'Booking failed. Please try again.', 'error');
    }
  } catch {
    showToast('Network error. Please check your connection.', 'error');
  } finally {
    btn.textContent = 'Book Now';
    btn.disabled    = false;
  }
}

/* ============================================================
   LOGIN / REGISTER MODAL
   ============================================================ */
function openLoginModal() {
  if (currentUser) {
    document.getElementById('account-dashboard')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  document.getElementById('loginModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  showLoginTab();
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('active');
  document.body.style.overflow = '';
}

function showLoginTab() {
  document.getElementById('login-tab').style.display    = 'block';
  document.getElementById('register-tab').style.display = 'none';
}

function showRegister() {
  document.getElementById('login-tab').style.display    = 'none';
  document.getElementById('register-tab').style.display = 'block';
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showToast('Please enter your email and password.', 'error'); return; }

  const btn = document.getElementById('login-btn');
  btn.textContent = 'Logging in…'; btn.disabled = true;

  try {
    const data = await apiPost('/api/login', { email, password });
    if (data.success) {
      currentUser = data.user;
      closeLoginModal();
      showToast(data.message, 'success');
      onLoginSuccess(data.user);
    } else {
      showToast(data.error || 'Login failed.', 'error');
    }
  } catch { showToast('Network error.', 'error'); }
  finally  { btn.textContent = 'Login'; btn.disabled = false; }
}

async function register() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  if (!name || !email || !password || !confirm) {
    showToast('All fields are required.', 'error'); return;
  }
  if (password !== confirm) { showToast('Passwords do not match.', 'error'); return; }
  if (password.length < 6)  { showToast('Password must be at least 6 characters.', 'error'); return; }

  const btn = document.getElementById('register-btn');
  btn.textContent = 'Creating account…'; btn.disabled = true;

  try {
    const data = await apiPost('/api/register', { name, email, password });
    if (data.success) {
      currentUser = data.user;
      closeLoginModal();
      showToast(data.message, 'success');
      onLoginSuccess(data.user);
    } else {
      showToast(data.error || 'Registration failed.', 'error');
    }
  } catch { showToast('Network error.', 'error'); }
  finally  { btn.textContent = 'Create Account'; btn.disabled = false; }
}

async function logout() {
  try { await apiPost('/api/logout'); } catch (_) {}
  currentUser = null;
  document.getElementById('account-dashboard').style.display = 'none';
  document.getElementById('admin-dashboard').style.display   = 'none';
  updateNavUI(null);
  showToast('Logged out successfully.', 'success');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   POST-LOGIN UI UPDATES
   ============================================================ */
function onLoginSuccess(user) {
  updateNavUI(user);
  // Update greeting
  const greeting = document.getElementById('dashboard-greeting');
  if (greeting) greeting.textContent = `Welcome back, ${user.name}! 👋`;
  // Show customer dashboard
  document.getElementById('account-dashboard').style.display = 'block';
  loadMyBookings();
  // Show admin dashboard if admin
  if (user.is_admin) {
    document.getElementById('admin-dashboard').style.display = 'block';
    loadAdminDashboard();
  }
}

function updateNavUI(user) {
  const loginBtn  = document.getElementById('nav-login-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');
  const mobileAcct = document.getElementById('mobile-account-link');

  if (user) {
    loginBtn?.setAttribute('style', 'display:none');
    logoutBtn?.removeAttribute('style');
    if (mobileAcct) mobileAcct.textContent = `👤 ${user.name}`;
  } else {
    loginBtn?.removeAttribute('style');
    logoutBtn?.setAttribute('style', 'display:none');
    if (mobileAcct) mobileAcct.innerHTML = '<i class="far fa-user"></i> My Account';
  }
}

/* ============================================================
   CUSTOMER DASHBOARD — load real appointments
   ============================================================ */
async function loadMyBookings() {
  if (!currentUser) return;
  const list = document.getElementById('my-appointments-list');
  if (!list) return;

  try {
    const data = await apiGet('/api/my-bookings');
    if (!data.success) return;

    if (data.bookings.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--brown);">
          <i class="fas fa-calendar-plus" style="font-size:3rem;margin-bottom:16px;display:block;color:var(--light-gold);"></i>
          <p>No appointments yet.</p>
          <button class="btn btn-primary" onclick="openBookingModal()" style="margin-top:16px;">Book Now</button>
        </div>`;
      return;
    }

    list.innerHTML = data.bookings.map(b => `
      <div class="appointment-card" id="appt-${b.id}">
        <div class="appointment-date">
          <div class="day">${b.day}</div>
          <div class="month">${b.month}</div>
        </div>
        <div class="appointment-details">
          <h4>${b.service}</h4>
          <p><i class="far fa-clock"></i> ${b.time}</p>
          <p><i class="fas fa-map-marker-alt"></i> Beauty Bistro, Accra</p>
          <p>Status: <strong style="color:${statusColor(b.status)};">${cap(b.status)}</strong></p>
        </div>
        <div class="appointment-actions">
          ${['pending','confirmed'].includes(b.status) ? `
            <button class="btn-icon" title="Cancel" onclick="cancelMyBooking(${b.id})">
              <i class="fas fa-times"></i>
            </button>` : ''}
          <button class="btn-icon" title="WhatsApp Us" style="color:#25D366;"
            onclick="window.open('https://wa.me/233203200800?text=Hi%20Beauty%20Bistro!%20Regarding%20booking%20%23${b.id}', '_blank')">
            <i class="fab fa-whatsapp"></i>
          </button>
        </div>
      </div>`).join('');
  } catch (e) { console.error('loadMyBookings:', e); }
}

async function cancelMyBooking(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    const data = await apiPost(`/api/my-bookings/${id}/cancel`);
    if (data.success) { showToast('Appointment cancelled.', 'success'); loadMyBookings(); }
    else showToast(data.error || 'Could not cancel.', 'error');
  } catch { showToast('Network error.', 'error'); }
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
async function loadAdminDashboard() {
  loadAdminStats();
  loadAdminBookings('all');
}

async function loadAdminStats() {
  try {
    const data = await apiGet('/api/admin/stats');
    if (!data.success) return;
    const s = data.stats;
    const map = {
      'admin-stat-bookings':  s.todays_bookings,
      'admin-stat-customers': s.total_customers,
      'admin-stat-total':     s.total_bookings,
      'admin-stat-occupancy': s.occupancy_rate + '%'
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  } catch (e) { console.error('loadAdminStats:', e); }
}

async function loadAdminBookings(status = 'all', search = '') {
  const list = document.getElementById('admin-bookings-list');
  if (!list) return;
  list.innerHTML = '<p style="text-align:center;color:var(--brown);padding:20px;">Loading…</p>';

  try {
    let url = `/api/admin/bookings?status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const data = await apiGet(url);
    if (!data.success) return;

    if (data.bookings.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--brown);padding:30px;">No bookings found.</p>';
      return;
    }

    list.innerHTML = data.bookings.map(b => `
      <div class="appointment-card" id="admin-appt-${b.id}">
        <div class="appointment-date">
          <div class="day">${b.day}</div>
          <div class="month">${b.month}</div>
        </div>
        <div class="appointment-details">
          <h4>${b.client_name} — ${b.service}</h4>
          <p><i class="far fa-clock"></i> ${b.time} &nbsp;|&nbsp; <i class="fas fa-phone"></i> ${b.phone}</p>
          <p><i class="fas fa-envelope"></i> ${b.email || '—'}</p>
          ${b.notes ? `<p><i class="fas fa-sticky-note"></i> ${b.notes}</p>` : ''}
          <p>Status: <strong style="color:${statusColor(b.status)};">${cap(b.status)}</strong>
             &nbsp;·&nbsp; <small style="color:var(--brown);">Booked ${b.created_at}</small></p>
        </div>
        <div class="appointment-actions" style="flex-direction:column;align-items:center;gap:6px;">
          ${b.status === 'pending' ? `
            <button class="btn-icon" title="Confirm" onclick="adminUpdateStatus(${b.id},'confirmed')"
              style="background:var(--light-gold);" aria-label="Confirm booking">
              <i class="fas fa-check"></i>
            </button>` : ''}
          ${!['cancelled','completed'].includes(b.status) ? `
            <button class="btn-icon" title="Cancel" onclick="adminUpdateStatus(${b.id},'cancelled')"
              aria-label="Cancel booking">
              <i class="fas fa-times"></i>
            </button>` : ''}
          ${b.status === 'confirmed' ? `
            <button class="btn-icon" title="Mark Complete" onclick="adminUpdateStatus(${b.id},'completed')"
              style="background:#E3F2FD;color:#1565C0;" aria-label="Mark completed">
              <i class="fas fa-flag-checkered"></i>
            </button>` : ''}
          <button class="btn-icon" title="WhatsApp client"
            onclick="window.open('https://wa.me/${b.phone.replace(/\D/g,'')}?text=Hi%20${encodeURIComponent(b.client_name)}!%20This%20is%20Beauty%20Bistro.%20Regarding%20your%20booking%20%23${b.id}.', '_blank')"
            style="background:#E8F5E9;color:#388E3C;" aria-label="WhatsApp client">
            <i class="fab fa-whatsapp"></i>
          </button>
          <button class="btn-icon" title="Delete booking" onclick="adminDeleteBooking(${b.id})"
            style="color:#C62828;" aria-label="Delete booking">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`).join('');
  } catch (e) { console.error('loadAdminBookings:', e); }
}

async function adminUpdateStatus(id, status) {
  try {
    const data = await apiPost(`/api/admin/bookings/${id}/status`, { status });
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminBookings(
        document.querySelector('.admin-filter-btn.active')?.dataset.status || 'all',
        document.getElementById('admin-search')?.value || ''
      );
      loadAdminStats();
    } else showToast(data.error || 'Update failed.', 'error');
  } catch { showToast('Network error.', 'error'); }
}

async function adminDeleteBooking(id) {
  if (!confirm(`Permanently delete booking #${id}? This cannot be undone.`)) return;
  try {
    const data = await apiDelete(`/api/admin/bookings/${id}`);
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById(`admin-appt-${id}`)?.remove();
      loadAdminStats();
    } else showToast(data.error || 'Delete failed.', 'error');
  } catch { showToast('Network error.', 'error'); }
}

function adminFilterBookings(status) {
  document.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  const search = document.getElementById('admin-search')?.value || '';
  loadAdminBookings(status, search);
}

async function loadAdminNewsletter() {
  const panel = document.getElementById('newsletter-panel');
  const list  = document.getElementById('newsletter-list');
  if (!panel || !list) return;

  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'none') return;

  try {
    const data = await apiGet('/api/admin/newsletter');
    if (!data.success) return;
    list.innerHTML = data.subscribers.length
      ? data.subscribers.map(s => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--light-gold);">
            <span>${s.email}</span>
            <small style="color:var(--brown);">${s.date}</small>
          </div>`).join('')
      : '<p style="color:var(--brown);">No subscribers yet.</p>';
  } catch { showToast('Could not load subscribers.', 'error'); }
}

/* ============================================================
   GALLERY FILTER
   ============================================================ */
function filterGallery(category) {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.style.display = (category === 'all' || item.dataset.category === category) ? 'block' : 'none';
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === category;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

/* ============================================================
   NEWSLETTER
   ============================================================ */
async function subscribeNewsletter(e) {
  e.preventDefault();
  const input = document.getElementById('newsletter-email');
  const email = input.value.trim();
  if (!email) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Subscribing…'; btn.disabled = true;

  try {
    const data = await apiPost('/api/newsletter', { email });
    showToast(data.message || 'Subscribed! 💛', 'success');
    if (data.success) input.value = '';
  } catch { showToast('Subscription failed. Please try again.', 'error'); }
  finally  { btn.textContent = 'Subscribe'; btn.disabled = false; }
}

/* ============================================================
   MODAL BACKDROP CLOSE
   ============================================================ */
document.getElementById('bookingModal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeBookingModal();
});
document.getElementById('loginModal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeLoginModal();
});

/* ============================================================
   UTILITIES
   ============================================================ */
function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function statusColor(s) {
  return { confirmed: '#2E7D32', pending: '#E65100', cancelled: '#C62828', completed: '#1565C0' }[s] || '#555';
}

/* ============================================================
   INIT — check existing session on page load
   ============================================================ */
(async function init() {
  try {
    const data = await apiGet('/api/me');
    if (data.logged_in) {
      currentUser = data.user;
      onLoginSuccess(data.user);
    }
  } catch (_) {
    // Guest — do nothing
  }
})();
