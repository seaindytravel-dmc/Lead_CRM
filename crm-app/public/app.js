// app.js - Frontend JavaScript สำหรับ CRM (TailAdmin UI)
const API = '/api';

// ============================
// NAVIGATION
// ============================
const sectionTitles = {
  dashboard: { title: 'Dashboard', breadcrumb: 'หน้าหลัก / Dashboard' },
  contacts:  { title: 'Contacts',  breadcrumb: 'หน้าหลัก / Contacts' },
  deals:     { title: 'Deals',     breadcrumb: 'หน้าหลัก / Deals' },
};

function showSection(name, linkEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  if (linkEl) linkEl.classList.add('active');

  const meta = sectionTitles[name] || {};
  document.getElementById('page-title').textContent = meta.title || name;
  document.getElementById('page-breadcrumb').textContent = meta.breadcrumb || '';

  if (name === 'dashboard') loadDashboard();
  if (name === 'contacts')  loadContacts();
  if (name === 'deals')     { loadDeals(); loadContactOptions(); }
}

// ============================
// MODAL
// ============================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'dealModal') loadContactOptions();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
// ปิด modal เมื่อคลิก overlay
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// ============================
// TOAST
// ============================
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = type; // 'success' | 'error'
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3200);
}

// ============================
// DASHBOARD
// ============================
async function loadDashboard() {
  try {
    const [cRes, dRes] = await Promise.all([
      fetch(`${API}/contacts`),
      fetch(`${API}/deals`),
    ]);
    const contacts = await cRes.json();
    const deals    = await dRes.json();

    // Stat cards
    document.getElementById('stat-contacts').textContent = contacts.length;
    document.getElementById('stat-deals').textContent    = deals.length;
    const totalValue = deals.reduce((s, d) => s + Number(d.value || 0), 0);
    document.getElementById('stat-value').textContent =
      totalValue >= 1000000
        ? (totalValue / 1000000).toFixed(1) + 'M'
        : totalValue.toLocaleString();
    document.getElementById('stat-won').textContent =
      deals.filter(d => d.stage === 'closed_won').length;

    // Recent contacts table (top 5)
    const dc = document.getElementById('dash-contacts');
    if (contacts.length === 0) {
      dc.innerHTML = '<tr><td colspan="2"><div class="empty-state"><p>ยังไม่มีข้อมูล</p></div></td></tr>';
    } else {
      dc.innerHTML = contacts.slice(0, 5).map(c => `
        <tr>
          <td>
            <div class="user-cell">
              <div class="mini-avatar">${escHtml(c.name.charAt(0).toUpperCase())}</div>
              <div><div class="cell-name">${escHtml(c.name)}</div>
              <div class="cell-sub">${escHtml(c.email || '')}</div></div>
            </div>
          </td>
          <td style="color:var(--text-muted);font-size:0.82rem">${escHtml(c.company || '—')}</td>
        </tr>`).join('');
    }

    // Recent deals table (top 5)
    const dd = document.getElementById('dash-deals');
    if (deals.length === 0) {
      dd.innerHTML = '<tr><td colspan="3"><div class="empty-state"><p>ยังไม่มีข้อมูล</p></div></td></tr>';
    } else {
      dd.innerHTML = deals.slice(0, 5).map(d => `
        <tr>
          <td class="cell-name">${escHtml(d.title)}</td>
          <td><span class="badge badge-${d.stage}">${formatStage(d.stage)}</span></td>
          <td style="font-weight:600">฿${Number(d.value||0).toLocaleString()}</td>
        </tr>`).join('');
    }
  } catch (err) {
    showToast('โหลด Dashboard ไม่สำเร็จ', 'error');
  }
}

// ============================
// CONTACTS
// ============================
async function loadContacts() {
  try {
    const res = await fetch(`${API}/contacts`);
    const contacts = await res.json();
    const tbody = document.getElementById('contactsTable');

    if (contacts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <p>ยังไม่มี Contact กด "เพิ่ม Contact" เพื่อเริ่มต้น</p>
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td>
          <div class="user-cell">
            <div class="mini-avatar">${escHtml(c.name.charAt(0).toUpperCase())}</div>
            <div>
              <div class="cell-name">${escHtml(c.name)}</div>
              <div class="cell-sub">${escHtml(c.email || '')}</div>
            </div>
          </div>
        </td>
        <td style="color:var(--text-muted)">${escHtml(c.email || '—')}</td>
        <td>${escHtml(c.phone || '—')}</td>
        <td>${escHtml(c.company || '—')}</td>
        <td>
          <button class="btn btn-danger-sm" onclick="deleteContact(${c.id})">ลบ</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    showToast('โหลด Contacts ไม่สำเร็จ', 'error');
  }
}

async function addContact() {
  const name    = document.getElementById('c-name').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const phone   = document.getElementById('c-phone').value.trim();
  const company = document.getElementById('c-company').value.trim();

  if (!name) { showToast('กรุณากรอกชื่อ', 'error'); return; }

  try {
    const res = await fetch(`${API}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, company }),
    });
    if (!res.ok) throw new Error();

    ['c-name','c-email','c-phone','c-company'].forEach(id => {
      document.getElementById(id).value = '';
    });
    closeModal('contactModal');
    showToast('เพิ่ม Contact สำเร็จ');
    loadContacts();
  } catch {
    showToast('เพิ่ม Contact ไม่สำเร็จ', 'error');
  }
}

async function deleteContact(id) {
  if (!confirm('ยืนยันลบ Contact นี้?')) return;
  try {
    await fetch(`${API}/contacts/${id}`, { method: 'DELETE' });
    showToast('ลบ Contact แล้ว');
    loadContacts();
  } catch {
    showToast('ลบ Contact ไม่สำเร็จ', 'error');
  }
}

// ============================
// DEALS
// ============================
async function loadContactOptions() {
  try {
    const res = await fetch(`${API}/contacts`);
    const contacts = await res.json();
    const sel = document.getElementById('d-contact');
    sel.innerHTML = '<option value="">— เลือก Contact —</option>' +
      contacts.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  } catch {}
}

async function loadDeals() {
  try {
    const res = await fetch(`${API}/deals`);
    const deals = await res.json();
    const tbody = document.getElementById('dealsTable');

    if (deals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon">💼</div>
          <p>ยังไม่มี Deal กด "เพิ่ม Deal" เพื่อเริ่มต้น</p>
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = deals.map(d => `
      <tr>
        <td class="cell-name">${escHtml(d.title)}</td>
        <td>
          ${d.contact_name
            ? `<div class="user-cell">
                <div class="mini-avatar">${escHtml(d.contact_name.charAt(0).toUpperCase())}</div>
                <span style="font-size:0.85rem">${escHtml(d.contact_name)}</span>
               </div>`
            : '<span style="color:var(--text-muted)">—</span>'}
        </td>
        <td><span class="badge badge-${d.stage}">${formatStage(d.stage)}</span></td>
        <td style="font-weight:600">฿${Number(d.value||0).toLocaleString()}</td>
        <td>
          <button class="btn btn-danger-sm" onclick="deleteDeal(${d.id})">ลบ</button>
        </td>
      </tr>`).join('');
  } catch {
    showToast('โหลด Deals ไม่สำเร็จ', 'error');
  }
}

async function addDeal() {
  const title      = document.getElementById('d-title').value.trim();
  const value      = document.getElementById('d-value').value;
  const stage      = document.getElementById('d-stage').value;
  const contact_id = document.getElementById('d-contact').value || null;

  if (!title) { showToast('กรุณากรอกชื่อ Deal', 'error'); return; }

  try {
    const res = await fetch(`${API}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, value: value || 0, stage, contact_id }),
    });
    if (!res.ok) throw new Error();

    document.getElementById('d-title').value = '';
    document.getElementById('d-value').value = '';
    document.getElementById('d-stage').value = 'lead';
    closeModal('dealModal');
    showToast('เพิ่ม Deal สำเร็จ');
    loadDeals();
  } catch {
    showToast('เพิ่ม Deal ไม่สำเร็จ', 'error');
  }
}

async function deleteDeal(id) {
  if (!confirm('ยืนยันลบ Deal นี้?')) return;
  try {
    await fetch(`${API}/deals/${id}`, { method: 'DELETE' });
    showToast('ลบ Deal แล้ว');
    loadDeals();
  } catch {
    showToast('ลบ Deal ไม่สำเร็จ', 'error');
  }
}

// ============================
// HELPERS
// ============================
function formatStage(stage) {
  return { lead:'Lead', qualified:'Qualified', proposal:'Proposal',
           negotiation:'Negotiation', closed_won:'Closed Won', closed_lost:'Closed Lost' }[stage] || stage;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================
// INIT
// ============================
document.addEventListener('DOMContentLoaded', () => loadDashboard());
