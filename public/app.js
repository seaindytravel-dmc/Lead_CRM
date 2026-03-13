// app.js — CRM Frontend Logic
'use strict';
const API = '/api';

// cache contacts ทั้งหมดสำหรับ client-side filter
let allContacts = [];
// cache deals สำหรับ kanban + edit modal
let allDeals = [];

// Stage config — single source of truth
const STAGES = [
  { key: 'new',         label: 'New',         icon: '🆕', colBg: 'bg-blue-900/20',   colBorder: 'border-blue-700/40',   hText: 'text-blue-300',   countBg: 'bg-blue-900/50'   },
  { key: 'contacted',   label: 'Contacted',   icon: '📞', colBg: 'bg-indigo-900/20', colBorder: 'border-indigo-700/40', hText: 'text-indigo-300', countBg: 'bg-indigo-900/50' },
  { key: 'proposal',    label: 'Proposal',    icon: '📄', colBg: 'bg-yellow-900/20', colBorder: 'border-yellow-700/40', hText: 'text-yellow-300', countBg: 'bg-yellow-900/50' },
  { key: 'negotiation', label: 'Negotiation', icon: '🤝', colBg: 'bg-orange-900/20', colBorder: 'border-orange-700/40', hText: 'text-orange-300', countBg: 'bg-orange-900/50' },
  { key: 'won',         label: 'Won',         icon: '🏆', colBg: 'bg-green-900/20',  colBorder: 'border-green-700/40',  hText: 'text-green-300',  countBg: 'bg-green-900/50'  },
  { key: 'lost',        label: 'Lost',        icon: '❌', colBg: 'bg-gray-900/40',   colBorder: 'border-gray-600/40',   hText: 'text-gray-400',   countBg: 'bg-gray-700/50'   },
];

// ==============================
// NAVIGATION
// ==============================
const sectionMeta = {
  dashboard: { title: 'Dashboard', breadcrumb: 'หน้าหลัก / Dashboard' },
  contacts:  { title: 'Contacts',  breadcrumb: 'หน้าหลัก / Contacts' },
  deals:     { title: 'Deals',     breadcrumb: 'หน้าหลัก / Deals' },
};

function showSection(name, linkEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.remove('bg-blue-600', 'text-white');
    a.classList.add('text-gray-300');
  });
  document.getElementById(`section-${name}`).classList.add('active');
  if (linkEl) {
    linkEl.classList.add('bg-blue-600', 'text-white');
    linkEl.classList.remove('text-gray-300');
  }
  const meta = sectionMeta[name] || {};
  document.getElementById('page-title').textContent      = meta.title || name;
  document.getElementById('page-breadcrumb').textContent = meta.breadcrumb || '';

  if (name === 'dashboard') loadDashboard();
  if (name === 'contacts')  loadContacts();
  if (name === 'deals')     loadDeals();
}

// ==============================
// MODAL
// ==============================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'dealModal') loadContactOptions();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// ==============================
// TOAST
// ==============================
let _toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  const base = 'fixed bottom-6 right-6 z-[999] px-5 py-3 rounded-xl text-sm font-medium text-white shadow-2xl max-w-xs show';
  el.className = base + (type === 'error' ? ' bg-red-600' : ' bg-green-600');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3200);
}

// ==============================
// FIELD VALIDATION HELPERS
// ==============================
function showFieldError(fieldId, msg) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(`err-${fieldId.replace('c-', '')}`);
  if (input) input.classList.add('border-red-500', 'focus:border-red-500');
  if (err)   { err.textContent = msg; err.classList.remove('hidden'); }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errId = `err-${fieldId.replace('c-', '')}`;
  const err   = document.getElementById(errId);
  if (input) input.classList.remove('border-red-500', 'focus:border-red-500');
  if (err)   err.classList.add('hidden');
}

function clearAllFieldErrors() {
  ['c-name', 'c-email'].forEach(clearFieldError);
}

// ==============================
// SAVE BUTTON STATE
// ==============================
function setSavingState(saving) {
  const btn     = document.getElementById('contactSaveBtn');
  const spinner = document.getElementById('saveBtnSpinner');
  const text    = document.getElementById('saveBtnText');
  if (saving) {
    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'กำลังบันทึก...';
  } else {
    btn.disabled = false;
    spinner.classList.add('hidden');
    text.textContent = document.getElementById('c-id').value ? 'บันทึกการแก้ไข' : 'บันทึก';
  }
}

// ==============================
// EXPORT CSV
// ==============================
async function exportCSV() {
  try {
    showToast('⏳ กำลังสร้างไฟล์...');
    const res = await fetch(`${API}/contacts/export`);
    if (!res.ok) throw new Error('Export ไม่สำเร็จ');

    // สร้าง blob แล้วให้ browser download อัตโนมัติ
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    // ดึงชื่อไฟล์จาก header ถ้ามี ไม่งั้นใช้ชื่อ default
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    a.download = match ? match[1] : `contacts-${new Date().toISOString().substring(0,10)}.csv`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ ดาวน์โหลด CSV สำเร็จ');
  } catch (err) {
    showToast(err.message || 'Export ไม่สำเร็จ', 'error');
  }
}

// ==============================
// LOAD STATS (Prompt 5.2)
// ==============================
async function loadStats() {
  try {
    const [statsRes, pipelineRes] = await Promise.all([
      fetch(`${API}/contacts/stats`),
      fetch(`${API}/deals/pipeline`),
    ]);
    const stats    = await statsRes.json();
    const pipeline = await pipelineRes.json();

    const total = Object.values(stats).reduce((s, n) => s + Number(n), 0);
    document.getElementById('stat-contacts').textContent  = total;
    document.getElementById('stat-leads').textContent     = stats.lead     || 0;
    document.getElementById('stat-customers').textContent = stats.customer || 0;

    const totalValue = pipeline.reduce((s, p) => s + Number(p.total_value || 0), 0);
    document.getElementById('stat-deal-value').textContent =
      totalValue >= 1_000_000
        ? (totalValue / 1_000_000).toFixed(1) + 'M'
        : totalValue.toLocaleString();
  } catch {
    // stat cards ค้างค่าเดิม — ไม่ต้องแสดง error
  }
}

// ==============================
// DASHBOARD
// ==============================
async function loadDashboard() {
  // โหลด stats และ recent data พร้อมกัน
  const [_, contactsRes, dealsRes] = await Promise.all([
    loadStats(),
    fetch(`${API}/contacts`),
    fetch(`${API}/deals`),
  ]);

  try {
    const contacts = await contactsRes.json();
    const deals    = await dealsRes.json();

    // Recent Contacts (top 5)
    const dc = document.getElementById('dash-contacts');
    dc.innerHTML = contacts.length === 0
      ? emptyRow(2, 'ยังไม่มีข้อมูล')
      : contacts.slice(0, 5).map(c => `
          <tr class="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
            <td class="px-5 py-3">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center
                            text-xs font-bold text-white shrink-0">
                  ${escHtml(c.name.charAt(0).toUpperCase())}
                </div>
                <span class="font-medium text-gray-200 text-sm">${escHtml(c.name)}</span>
              </div>
            </td>
            <td class="px-5 py-3 text-sm text-gray-400">${escHtml(c.company || '—')}</td>
          </tr>`).join('');

    // Recent Deals (top 5)
    const dd = document.getElementById('dash-deals');
    dd.innerHTML = deals.length === 0
      ? emptyRow(3, 'ยังไม่มีข้อมูล')
      : deals.slice(0, 5).map(d => `
          <tr class="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
            <td class="px-5 py-3 font-medium text-gray-200 text-sm">${escHtml(d.title)}</td>
            <td class="px-5 py-3">${dealStageBadge(d.stage)}</td>
            <td class="px-5 py-3 font-semibold text-gray-200 text-sm">
              ฿${Number(d.value || 0).toLocaleString()}
            </td>
          </tr>`).join('');
  } catch {
    showToast('โหลด Dashboard ไม่สำเร็จ', 'error');
  }
}

// ==============================
// CONTACTS — loadContacts (Prompt 5.2)
// ==============================
async function loadContacts() {
  setLoading('contactsTable', 6);
  try {
    const res = await fetch(`${API}/contacts`);
    allContacts = await res.json();
    renderContacts(allContacts);
  } catch {
    showToast('โหลด Contacts ไม่สำเร็จ', 'error');
  }
}

// ==============================
// DEBOUNCE UTILITY
// ==============================
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ==============================
// HIGHLIGHT UTILITY
// ==============================
// ห่อส่วนที่ match ด้วย <mark> — ปลอดภัยจาก XSS (escape ก่อน)
function highlight(text, keyword) {
  const safe = escHtml(text);
  if (!keyword) return safe;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(
    new RegExp(escaped, 'gi'),
    m => `<mark class="bg-yellow-400/30 text-yellow-200 rounded px-0.5">${m}</mark>`
  );
}

// ==============================
// FILTER CONTACTS (Prompt 6.1)
// ==============================
// ฟังก์ชันหลัก — ถูกเรียกจาก debounced handler และจาก status dropdown
function filterContacts() {
  const status  = document.getElementById('filter-status').value;
  const keyword = document.getElementById('filter-search').value.trim();
  const search  = keyword.toLowerCase();

  let filtered = allContacts;
  if (status) {
    filtered = filtered.filter(c => c.status === status);
  }
  if (search) {
    filtered = filtered.filter(c =>
      (c.name    || '').toLowerCase().includes(search) ||
      (c.company || '').toLowerCase().includes(search) ||
      (c.email   || '').toLowerCase().includes(search) ||
      (c.phone   || '').toLowerCase().includes(search)
    );
  }

  // แสดง/ซ่อน Clear button
  const hasFilter = status || keyword;
  document.getElementById('btn-clear-filter').style.display = hasFilter ? '' : 'none';

  renderContacts(filtered, keyword);
}

// ล้าง filter ทั้งหมด
function clearFilter() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-search').value = '';
  document.getElementById('btn-clear-filter').style.display = 'none';
  renderContacts(allContacts, '');
}

function renderContacts(contacts, keyword = '') {
  const total = allContacts.length;
  const shown = contacts.length;

  // counter: 'แสดง X จาก Y รายการ' เมื่อมี filter, 'X รายการ' เมื่อไม่มี
  const isFiltered = keyword || document.getElementById('filter-status').value;
  document.getElementById('contacts-count').textContent =
    isFiltered ? `แสดง ${shown} จาก ${total} รายการ` : `${total} รายการ`;

  const tbody = document.getElementById('contactsTable');

  if (contacts.length === 0) {
    const msg = isFiltered ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มี Contact';
    const sub = isFiltered ? `ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง` : `กด "เพิ่ม Contact" เพื่อเริ่มต้น`;
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-5 py-16 text-center">
          <div class="flex flex-col items-center gap-2 text-gray-500">
            <span class="text-4xl">${isFiltered ? '🔍' : '👤'}</span>
            <p class="text-sm font-medium text-gray-300">${msg}</p>
            <p class="text-xs">${sub}</p>
            ${isFiltered ? `<button onclick="clearFilter()"
              class="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
              ล้างตัวกรอง</button>` : ''}
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = contacts.map(c => `
    <tr class="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
      <td class="px-5 py-3.5">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center
                      text-xs font-bold text-white shrink-0">
            ${escHtml((c.name || '?').charAt(0).toUpperCase())}
          </div>
          <div>
            <div class="font-semibold text-gray-200 text-sm">${highlight(c.name, keyword)}</div>
            <div class="text-xs text-gray-500">${escHtml(c.tags || '')}</div>
          </div>
        </div>
      </td>
      <td class="px-5 py-3.5 text-sm text-gray-300">${highlight(c.company || '—', keyword)}</td>
      <td class="px-5 py-3.5 text-sm text-gray-300">${highlight(c.email || '—', keyword)}</td>
      <td class="px-5 py-3.5 text-sm text-gray-300">${highlight(c.phone || '—', keyword)}</td>
      <td class="px-5 py-3.5">${contactStatusBadge(c.status)}</td>
      <td class="px-5 py-3.5">
        <div class="flex items-center gap-2">
          <button onclick="openEditModal(${c.id})"
            class="px-3 py-1.5 text-xs font-semibold text-blue-400 border border-blue-800
                   rounded-lg hover:bg-blue-900/40 transition-colors">แก้ไข</button>
          <button onclick="deleteContact(${c.id})"
            class="px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-900
                   rounded-lg hover:bg-red-900/30 transition-colors">ลบ</button>
        </div>
      </td>
    </tr>`).join('');
}

// openAddModal (Prompt 5.2) — เปิด modal ว่าง
function openAddModal() {
  document.getElementById('contactModalTitle').textContent = 'เพิ่ม Contact ใหม่';
  document.getElementById('saveBtnText').textContent       = 'บันทึก';
  clearAllFieldErrors();
  ['c-id','c-name','c-company','c-email','c-phone','c-tags'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('c-notes').value  = '';
  document.getElementById('c-status').value = 'lead';
  openModal('contactModal');
}

// openEditModal (Prompt 5.2) — โหลดข้อมูล + เปิด modal พร้อม pre-fill
function openEditModal(id) {
  const c = allContacts.find(x => x.id === id);
  if (!c) return;
  document.getElementById('contactModalTitle').textContent = 'แก้ไข Contact';
  document.getElementById('saveBtnText').textContent       = 'บันทึกการแก้ไข';
  clearAllFieldErrors();
  document.getElementById('c-id').value      = c.id;
  document.getElementById('c-name').value    = c.name    || '';
  document.getElementById('c-company').value = c.company || '';
  document.getElementById('c-email').value   = c.email   || '';
  document.getElementById('c-phone').value   = c.phone   || '';
  document.getElementById('c-status').value  = c.status  || 'lead';
  document.getElementById('c-tags').value    = c.tags    || '';
  document.getElementById('c-notes').value   = c.notes   || '';
  openModal('contactModal');
}

// saveContact (Prompt 5.2) — POST หรือ PUT ตาม mode
async function saveContact() {
  clearAllFieldErrors();

  const id      = document.getElementById('c-id').value;
  const name    = document.getElementById('c-name').value.trim();
  const company = document.getElementById('c-company').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const phone   = document.getElementById('c-phone').value.trim();
  const status  = document.getElementById('c-status').value;
  const tags    = document.getElementById('c-tags').value.trim();
  const notes   = document.getElementById('c-notes').value.trim();

  // Validate — แสดง error ใต้ field
  let hasError = false;
  if (!name) {
    showFieldError('c-name', 'กรุณากรอกชื่อ-นามสกุล');
    hasError = true;
  }
  if (!email) {
    showFieldError('c-email', 'กรุณากรอกอีเมล');
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('c-email', 'รูปแบบอีเมลไม่ถูกต้อง');
    hasError = true;
  }
  if (hasError) return;

  setSavingState(true);
  try {
    const url    = id ? `${API}/contacts/${id}` : `${API}/contacts`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, company, email, phone, status, tags, notes }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'บันทึกไม่สำเร็จ');
    }
    closeModal('contactModal');
    showToast(id ? '✓ แก้ไข Contact แล้ว' : '✓ เพิ่ม Contact สำเร็จ');
    loadContacts();
    loadStats(); // อัปเดต stat cards
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setSavingState(false);
  }
}

// deleteContact (Prompt 5.2) — confirm dialog แล้ว DELETE
async function deleteContact(id) {
  const c = allContacts.find(x => x.id === id);
  const name = c ? c.name : 'Contact นี้';
  if (!confirm(`ยืนยันลบ "${name}" ?\nข้อมูลนี้จะถูกลบถาวร`)) return;
  try {
    const res = await fetch(`${API}/contacts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('ลบ Contact แล้ว');
    loadContacts();
    loadStats();
  } catch {
    showToast('ลบไม่สำเร็จ', 'error');
  }
}

// ==============================
// DEALS — KANBAN BOARD
// ==============================

// โหลด contacts ลง dropdown ใน deal modal
async function loadContactOptions() {
  try {
    const res = await fetch(`${API}/contacts`);
    const contacts = await res.json();
    const sel = document.getElementById('d-contact');
    const current = sel.value;
    sel.innerHTML = '<option value="">— เลือก Contact —</option>' +
      contacts.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
    if (current) sel.value = current; // preserve selection เมื่อ edit
  } catch {}
}

// โหลด deals จาก API แล้ว render Kanban + update summary bar
async function loadDeals() {
  document.getElementById('kanban-board').innerHTML = `
    <div class="flex items-center gap-3 text-gray-500 py-16 px-8">
      <div class="spinner"></div><span class="text-sm">กำลังโหลด...</span>
    </div>`;
  try {
    const res = await fetch(`${API}/deals`);
    allDeals = await res.json();
    renderKanban(allDeals);
    updateSummaryBar(allDeals);
  } catch {
    showToast('โหลด Deals ไม่สำเร็จ', 'error');
  }
}

// สร้าง Kanban columns
function renderKanban(deals) {
  const board = document.getElementById('kanban-board');
  board.innerHTML = STAGES.map(stage => {
    const cards = deals.filter(d => d.stage === stage.key);
    const total = cards.reduce((s, d) => s + Number(d.value || 0), 0);
    return `
      <div class="w-64 shrink-0 flex flex-col rounded-xl border ${stage.colBorder} ${stage.colBg}">
        <!-- Column Header -->
        <div class="flex items-center justify-between px-3 py-3 border-b ${stage.colBorder}">
          <div class="flex items-center gap-2">
            <span class="text-base">${stage.icon}</span>
            <span class="font-semibold text-sm ${stage.hText}">${stage.label}</span>
            <span class="text-xs font-bold px-1.5 py-0.5 rounded-full ${stage.countBg} ${stage.hText}">
              ${cards.length}
            </span>
          </div>
          <span class="text-xs text-gray-500 font-medium">
            ${total >= 1000 ? '฿' + (total/1000).toFixed(0) + 'K' : total > 0 ? '฿' + total.toLocaleString() : ''}
          </span>
        </div>
        <!-- Cards -->
        <div class="flex-1 p-2 space-y-2 min-h-[120px]">
          ${cards.length === 0
            ? `<div class="text-center py-8 text-gray-600 text-xs">ยังไม่มี deal</div>`
            : cards.map(d => dealCard(d, stage)).join('')}
        </div>
        <!-- Add in column -->
        <button onclick="openDealModal(null, '${stage.key}')"
          class="w-full text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700/40
                 py-2.5 px-3 transition-colors rounded-b-xl border-t ${stage.colBorder}
                 flex items-center gap-1.5">
          <span>＋</span> เพิ่มใน ${stage.label}
        </button>
      </div>`;
  }).join('');
}

// สร้าง deal card HTML
function dealCard(d, stage) {
  const closeDate = d.close_date
    ? new Date(d.close_date).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' })
    : null;
  const isOverdue = d.close_date && new Date(d.close_date) < new Date() && d.stage !== 'won' && d.stage !== 'lost';

  // Stage selector options
  const stageOptions = STAGES.map(s =>
    `<option value="${s.key}" ${s.key === d.stage ? 'selected' : ''}>${s.icon} ${s.label}</option>`
  ).join('');

  return `
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2.5
                hover:border-gray-500 transition-colors group">

      <!-- Title -->
      <div class="font-semibold text-sm text-gray-100 leading-snug">${escHtml(d.title)}</div>

      <!-- Contact -->
      ${d.contact_name ? `
        <div class="flex items-center gap-1.5">
          <div class="w-5 h-5 bg-blue-700 rounded-full flex items-center justify-center
                      text-[10px] font-bold text-white shrink-0">
            ${escHtml(d.contact_name.charAt(0).toUpperCase())}
          </div>
          <span class="text-xs text-gray-400 truncate">${escHtml(d.contact_name)}</span>
        </div>` : ''}

      <!-- Value + Date -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-bold text-white">฿${Number(d.value||0).toLocaleString()}</span>
        ${closeDate ? `
          <span class="text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}">
            ${isOverdue ? '⚠️ ' : '📅 '}${closeDate}
          </span>` : ''}
      </div>

      <!-- Stage Changer + Actions -->
      <div class="flex items-center gap-1.5 pt-1 border-t border-gray-700/60">
        <select onchange="changeDealStage(${d.id}, this.value)"
          class="flex-1 bg-gray-700 border border-gray-600 text-gray-300 text-xs
                 rounded-md px-1.5 py-1 outline-none focus:border-blue-500
                 cursor-pointer min-w-0">
          ${stageOptions}
        </select>
        <button onclick="openDealModal(${d.id})"
          class="text-xs px-2 py-1 text-blue-400 border border-blue-800
                 rounded-md hover:bg-blue-900/40 transition-colors shrink-0">✏️</button>
        <button onclick="deleteDeal(${d.id})"
          class="text-xs px-2 py-1 text-red-400 border border-red-900
                 rounded-md hover:bg-red-900/30 transition-colors shrink-0">🗑️</button>
      </div>
    </div>`;
}

// อัปเดต Summary Bar
function updateSummaryBar(deals) {
  const total  = deals.reduce((s, d) => s + Number(d.value || 0), 0);
  const won    = deals.filter(d => d.stage === 'won');
  const closed = deals.filter(d => d.stage === 'won' || d.stage === 'lost').length;
  const winRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;

  document.getElementById('pipeline-total').textContent =
    total >= 1_000_000 ? (total / 1_000_000).toFixed(1) + 'M' : '฿' + total.toLocaleString();
  document.getElementById('pipeline-won').textContent     = `${won.length} deals`;
  document.getElementById('pipeline-winrate').textContent = `${winRate}%`;
}

// เปิด Deal Modal (Add หรือ Edit)
function openDealModal(id = null, defaultStage = 'new') {
  const isEdit = !!id;
  document.getElementById('dealModalTitle').textContent = isEdit ? 'แก้ไข Deal' : 'เพิ่ม Deal ใหม่';
  document.getElementById('dealBtnText').textContent    = isEdit ? 'บันทึกการแก้ไข' : 'บันทึก Deal';

  // clear errors
  ['err-d-title', 'err-d-contact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (isEdit) {
    const d = allDeals.find(x => x.id === id);
    if (!d) return;
    document.getElementById('d-id').value         = d.id;
    document.getElementById('d-title').value      = d.title      || '';
    document.getElementById('d-value').value      = d.value      || '';
    document.getElementById('d-stage').value      = d.stage      || 'new';
    document.getElementById('d-close-date').value = d.close_date ? d.close_date.substring(0, 10) : '';
    document.getElementById('d-notes').value      = d.notes      || '';
  } else {
    document.getElementById('d-id').value         = '';
    document.getElementById('d-title').value      = '';
    document.getElementById('d-value').value      = '';
    document.getElementById('d-stage').value      = defaultStage;
    document.getElementById('d-close-date').value = '';
    document.getElementById('d-notes').value      = '';
  }

  loadContactOptions().then(() => {
    if (isEdit) {
      const d = allDeals.find(x => x.id === id);
      if (d && d.contact_id) document.getElementById('d-contact').value = d.contact_id;
    } else {
      document.getElementById('d-contact').value = '';
    }
  });

  openModal('dealModal');
}

// บันทึก Deal — POST หรือ PUT ตาม d-id
async function saveDeal() {
  const id         = document.getElementById('d-id').value;
  const title      = document.getElementById('d-title').value.trim();
  const contact_id = document.getElementById('d-contact').value || null;
  const value      = document.getElementById('d-value').value;
  const stage      = document.getElementById('d-stage').value;
  const close_date = document.getElementById('d-close-date').value || null;
  const notes      = document.getElementById('d-notes').value.trim();

  // Validate
  let hasError = false;
  const titleErr = document.getElementById('err-d-title');
  const contactErr = document.getElementById('err-d-contact');
  titleErr.classList.add('hidden');
  contactErr.classList.add('hidden');

  if (!title)      { titleErr.textContent = 'กรุณากรอกชื่อ Deal'; titleErr.classList.remove('hidden'); hasError = true; }
  if (!contact_id) { contactErr.textContent = 'กรุณาเลือก Contact'; contactErr.classList.remove('hidden'); hasError = true; }
  if (hasError) return;

  // Loading state
  const btn = document.getElementById('dealSaveBtn');
  const spinner = document.getElementById('dealBtnSpinner');
  btn.disabled = true;
  spinner.classList.remove('hidden');

  try {
    const url    = id ? `${API}/deals/${id}` : `${API}/deals`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, contact_id, value: value || 0, stage, close_date, notes }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'บันทึกไม่สำเร็จ');
    }
    closeModal('dealModal');
    showToast(id ? '✓ แก้ไข Deal แล้ว' : '✓ เพิ่ม Deal สำเร็จ');
    loadDeals();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
}

// เปลี่ยน stage โดยตรงจาก deal card
async function changeDealStage(id, newStage) {
  const d = allDeals.find(x => x.id === id);
  if (!d || d.stage === newStage) return;
  try {
    const res = await fetch(`${API}/deals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:      d.title,
        contact_id: d.contact_id,
        value:      d.value,
        stage:      newStage,
        close_date: d.close_date,
        notes:      d.notes,
      }),
    });
    if (!res.ok) throw new Error();
    const stageLabel = STAGES.find(s => s.key === newStage)?.label || newStage;
    showToast(`✓ ย้ายไป ${stageLabel} แล้ว`);
    loadDeals();
    loadStats();
  } catch {
    showToast('เปลี่ยน Stage ไม่สำเร็จ', 'error');
    loadDeals(); // reset dropdown กลับค่าเดิม
  }
}

async function deleteDeal(id) {
  const d = allDeals.find(x => x.id === id);
  const name = d ? d.title : 'Deal นี้';
  if (!confirm(`ยืนยันลบ "${name}" ?\nข้อมูลนี้จะถูกลบถาวร`)) return;
  try {
    await fetch(`${API}/deals/${id}`, { method: 'DELETE' });
    showToast('ลบ Deal แล้ว');
    loadDeals();
    loadStats();
  } catch {
    showToast('ลบไม่สำเร็จ', 'error');
  }
}

// ==============================
// HELPERS
// ==============================
function contactStatusBadge(status) {
  const cls    = { lead:'badge-lead', prospect:'badge-prospect', customer:'badge-customer', inactive:'badge-inactive' };
  const labels = { lead:'Lead', prospect:'Prospect', customer:'Customer', inactive:'Inactive' };
  const c = cls[status] || 'badge-inactive';
  const l = labels[status] || status;
  return `<span class="badge ${c} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold">${l}</span>`;
}

function dealStageBadge(stage) {
  const cls = {
    new:'badge-new', contacted:'badge-contacted', proposal:'badge-proposal',
    negotiation:'badge-negotiation', won:'badge-won', lost:'badge-lost',
  };
  const labels = {
    new:'New', contacted:'Contacted', proposal:'Proposal',
    negotiation:'Negotiation', won:'Won', lost:'Lost',
  };
  const c = cls[stage] || 'badge-new';
  const l = labels[stage] || stage;
  return `<span class="badge ${c} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold">${l}</span>`;
}

function setLoading(tbodyId, cols) {
  document.getElementById(tbodyId).innerHTML = `
    <tr>
      <td colspan="${cols}" class="px-5 py-12 text-center">
        <div class="flex flex-col items-center gap-3 text-gray-500">
          <div class="spinner"></div>
          <span class="text-sm">กำลังโหลด...</span>
        </div>
      </td>
    </tr>`;
}

function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="px-5 py-8 text-center text-sm text-gray-500">${msg}</td></tr>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==============================
// INIT
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  // Active nav
  const firstNav = document.querySelector('.nav-link');
  if (firstNav) {
    firstNav.classList.add('bg-blue-600', 'text-white');
    firstNav.classList.remove('text-gray-300');
  }

  // Search — debounce 300ms (พิมพ์หยุดแล้วค่อย filter)
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    const debouncedFilter = debounce(filterContacts, 300);
    searchInput.addEventListener('input', debouncedFilter);
  }

  // Status dropdown — ไม่ต้อง debounce (select เปลี่ยนทีเดียว)
  const statusSelect = document.getElementById('filter-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', filterContacts);
  }

  loadDashboard();
});
