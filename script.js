// =======================================================
// ⚙️ SYSTEM CONFIGURATION & THEME
// =======================================================
let sysConfig = JSON.parse(localStorage.getItem('sysConfig')) || {
  appName: "AH Procurement",
  logoUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135695.png",
  dateFormat: "DD/MM/YYYY",
  vatEnabled: true,
  vatRate: 7,
  theme: "light" 
};

function setupPWA() {
  const manifest = {
    "name": sysConfig.appName, "short_name": sysConfig.appName, "display": "standalone", "background_color": "#ffffff", "theme_color": "#2563eb",
    "icons": [{ "src": sysConfig.logoUrl, "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }]
  };
  const link = document.createElement('link'); link.rel = 'manifest'; link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })); document.head.appendChild(link);
}
setupPWA();

function toggleTheme() { sysConfig.theme = sysConfig.theme === 'light' ? 'dark' : 'light'; saveConfig(); }
function applyTheme() {
  if (sysConfig.theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  const appTitle = document.getElementById('app-main-title'); const appLogo = document.getElementById('app-logo');
  if(appTitle) appTitle.textContent = sysConfig.appName; if(appLogo) appLogo.src = sysConfig.logoUrl;
}
function saveConfig() { localStorage.setItem('sysConfig', JSON.stringify(sysConfig)); applyTheme(); }
applyTheme();

// =======================================================
// 🔑 CORE VARIABLES & API
// =======================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwqjGS1NnVylaDqyaY3nntPBIwzr7gK2I_tK8Ox98N7gV_LefAFKCytwbl2evQuy0LaYQ/exec"; // 📌 เปลี่ยนตรงนี้ด้วย
const API_KEY = "AH_ProCure_SecureKey_2026"; 
const N = n => Number(n).toLocaleString('th-TH', {minimumFractionDigits:0, maximumFractionDigits:2});

let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let prDB = [], usersDB = [], vendorDB = [], budgetDB = [], catalogDB = [], poDB = [];
let dashboardCharts = [];

async function callAPI(payload, loadingMsg = "กำลังโหลด...") {
  showLoading(loadingMsg); payload.apiKey = API_KEY; 
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    const result = await response.json(); hideLoading(); return result;
  } catch (error) { hideLoading(); toast("เชื่อมต่อล้มเหลว", "error", "ti-wifi-off"); return { status: "error" }; }
}

async function syncData() {
  const res = await callAPI({ action: 'getData' }, "ซิงค์ข้อมูลล่าสุด...");
  if (res.status === 'success') { prDB = res.prs || []; usersDB = res.users || []; vendorDB = res.vendors || []; budgetDB = res.budgets || []; catalogDB = res.catalog || []; poDB = res.pos || []; }
}

async function checkAuth() {
  if (currentUser) {
    document.getElementById('login-screen').classList.add('hidden'); document.getElementById('app-screen').classList.remove('hidden');
    setTimeout(() => document.getElementById('app-screen').classList.remove('opacity-0'), 50);
    document.getElementById('user-name-display').textContent = currentUser.name; document.getElementById('user-avatar').textContent = currentUser.name.charAt(0); document.getElementById('user-role-display').textContent = currentUser.role;
    renderSidebar(); await syncData(); go('dashboard');
  } else { document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('app-screen').classList.add('hidden'); }
}

async function handleLogin(e) {
  e.preventDefault();
  const res = await callAPI({ action: 'login', user: document.getElementById('username').value.trim(), pass: document.getElementById('password').value.trim() }, "ตรวจสอบบัญชี...");
  if (res.status === 'success') { localStorage.setItem('currentUser', JSON.stringify(res.user)); currentUser = res.user; toast(`ยินดีต้อนรับ ${currentUser.name}`, 'success'); checkAuth(); } 
  else { toast(res.message || "รหัสไม่ถูกต้อง", 'error', 'ti-alert-circle'); }
}

function handleLogout() { showConfirm('ออกจากระบบ?', 'ต้องการออกจากระบบ?', 'warning', () => { localStorage.removeItem('currentUser'); location.reload(); }); }

// ==========================================
// NAVIGATION & UTILS
// ==========================================
const menuConfig = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', roles: ['admin', 'manager', 'director', 'ceo', 'approver', 'user'] },
  { id: 'create-pr', label: 'สร้าง PR', icon: 'ti-file-plus', roles: ['admin', 'user', 'manager', 'director', 'ceo'] },
  { id: 'approve', label: 'อนุมัติ PR', icon: 'ti-clipboard-check', roles: ['admin', 'approver', 'manager', 'director', 'ceo'] },
  { id: 'po', label: 'สร้าง PO', icon: 'ti-file-invoice', roles: ['admin', 'approver', 'manager', 'director'] },
  { id: 'tracking', label: 'ติดตามสถานะ', icon: 'ti-truck-delivery', roles: ['admin', 'approver', 'user', 'manager', 'director', 'ceo'] },
  { id: 'receive', label: 'รับสินค้า (GR)', icon: 'ti-package', roles: ['admin', 'user', 'manager'] },
  { id: 'export', label: 'Export รายงาน', icon: 'ti-download', roles: ['admin', 'approver', 'manager', 'director', 'ceo'] },
  { id: 'vendors', label: 'Vendor Master', icon: 'ti-building-store', roles: ['admin', 'manager', 'director'] },
  { id: 'budget', label: 'Budget Control', icon: 'ti-chart-pie', roles: ['admin', 'approver', 'manager', 'director', 'ceo'] },
  { id: 'catalog', label: 'คลังสินค้า', icon: 'ti-search', roles: ['admin', 'user', 'manager'] },
  { id: 'settings', label: 'ตั้งค่าระบบ', icon: 'ti-settings', roles: ['admin'] },
];

function renderSidebar() {
  document.getElementById('sidebar-menu').innerHTML = menuConfig.filter(m => m.roles.includes(currentUser.role)).map(m => `<button onclick="go('${m.id}')" id="nav-${m.id}" class="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><i class="ti ${m.icon} text-lg"></i> ${m.label}</button>`).join('');
}

function go(page) {
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('bg-primary-50', 'dark:bg-primary-900/30', 'text-primary-600', 'dark:text-primary-400'));
  document.getElementById('nav-' + page)?.classList.add('bg-primary-50', 'dark:bg-primary-900/30', 'text-primary-600', 'dark:text-primary-400');
  const titles = { dashboard:'Dashboard', 'create-pr':'สร้างใบขอซื้อ (PR)', approve:'อนุมัติรายการ', po:'สร้างใบสั่งซื้อ (PO)', tracking:'ติดตามสถานะ', receive:'รับสินค้า (GR)', export:'Export รายงาน', vendors:'Vendor Master', budget:'ควบคุมงบประมาณ', catalog:'คลังสินค้า', settings:'ตั้งค่าระบบ (ERP Control)' };
  document.getElementById('page-title').textContent = titles[page] || page;
  
  const c = document.getElementById('page-content');
  if(page==='dashboard') { c.innerHTML = pageDashboard(); setTimeout(renderDashboardCharts, 100); }
  else if(page==='create-pr') { c.innerHTML = pageCreatePR(); initPRForm(); }
  else if(page==='approve') c.innerHTML = pageApprove();
  else if(page==='po') c.innerHTML = pagePO();
  else if(page==='tracking') c.innerHTML = pageTracking();
  else if(page==='receive') c.innerHTML = pageReceive();
  else if(page==='export') c.innerHTML = pageExport();
  else if(page==='vendors') c.innerHTML = pageVendors();
  else if(page==='budget') c.innerHTML = pageBudget();
  else if(page==='catalog') c.innerHTML = pageCatalog();
  else if(page==='settings') c.innerHTML = pageSettings();
}

function toast(msg, type='success', icon='ti-circle-check') {
  const t = document.getElementById('toast'); const colors = { success: 'bg-gray-800 text-white', error: 'bg-danger-600 text-white', warning: 'bg-warning-500 text-white', info: 'bg-primary-600 text-white' };
  t.className = `fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-3 transition-all duration-300 z-[200] pointer-events-none ${colors[type]}`;
  document.getElementById('toast-icon').className = `ti ${icon} text-lg`; document.getElementById('toast-msg').textContent = msg;
  t.classList.remove('toast-enter'); t.classList.add('toast-active'); setTimeout(() => { t.classList.remove('toast-active'); t.classList.add('toast-enter'); }, 3000);
}

function showLoading(text) { document.getElementById('loading-text').textContent = text; document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

function showConfirm(title, desc, type = 'primary', onConfirm) {
  const modal = document.getElementById('custom-modal'); const backdrop = document.getElementById('modal-backdrop'); const content = document.getElementById('modal-content'); const icon = document.getElementById('modal-icon'); const btn = document.getElementById('modal-confirm-btn');
  document.getElementById('modal-title').textContent = title; document.getElementById('modal-desc').textContent = desc;
  icon.className = "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"; btn.className = "flex-1 text-white font-medium py-2.5 rounded-xl shadow-md transition";
  if(type === 'warning') { icon.classList.add('bg-warning-50', 'dark:bg-warning-900/30', 'text-warning-600'); icon.innerHTML = '<i class="ti ti-alert-triangle"></i>'; btn.classList.add('bg-warning-500', 'hover:bg-warning-600'); } 
  else if(type === 'danger') { icon.classList.add('bg-danger-50', 'dark:bg-danger-900/30', 'text-danger-600'); icon.innerHTML = '<i class="ti ti-trash"></i>'; btn.classList.add('bg-danger-600', 'hover:bg-danger-700'); } 
  else { icon.classList.add('bg-primary-50', 'dark:bg-primary-900/30', 'text-primary-600'); icon.innerHTML = '<i class="ti ti-check"></i>'; btn.classList.add('bg-primary-600', 'hover:bg-primary-700'); }
  confirmCallback = onConfirm; btn.onclick = () => { closeModal(); if(confirmCallback) confirmCallback(); };
  modal.classList.remove('hidden'); setTimeout(() => { backdrop.classList.remove('modal-backdrop-enter'); backdrop.classList.add('modal-backdrop-active'); content.classList.remove('modal-content-enter'); content.classList.add('modal-content-active'); }, 10);
}
function closeModal() {
  const backdrop = document.getElementById('modal-backdrop'); const content = document.getElementById('modal-content');
  backdrop.classList.remove('modal-backdrop-active'); backdrop.classList.add('modal-backdrop-enter'); content.classList.remove('modal-content-active'); content.classList.add('modal-content-enter');
  setTimeout(() => { document.getElementById('custom-modal').classList.add('hidden'); }, 300);
}

function sb(status) {
  const map = { pending: { l: 'รอ ผจก. อนุมัติ', c: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' }, pending_manager: { l: 'รอ ผจก. อนุมัติ', c: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' }, pending_director: { l: 'รอ ผอ. อนุมัติ', c: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' }, pending_ceo: { l: 'รอ CEO อนุมัติ', c: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' }, approved: { l: 'อนุมัติแล้ว', c: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' }, rejected: { l: 'ปฏิเสธ', c: 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400' }, po_issued: { l: 'ออก PO แล้ว', c: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' }, received: { l: 'รับของแล้ว', c: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' } };
  const s = map[status] || { l: status, c: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }; 
  return `<span class="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${s.c}">${s.l}</span>`;
}

// ==========================================
// PAGE RENDERS
// ==========================================
function pageDashboard() {
  const pending = prDB.filter(r => r.status.includes('pending')).length;
  const poIssued = prDB.filter(r => r.status === 'po_issued').length;
  const totalVal = prDB.reduce((sum, r) => sum + Number(r.total), 0);
  const recentPRs = [...prDB].reverse().slice(0, 5);
  return `
  <div class="animate-slide-up space-y-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
      <div><h2 class="text-2xl font-bold text-gray-800 dark:text-white">สวัสดี, ${currentUser.name} 👋</h2><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">ภาพรวมระบบจัดซื้อประจำวันที่ ${new Date().toLocaleDateString('th-TH')}</p></div>
      <button onclick="go('create-pr')" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:bg-primary-700 transition flex items-center gap-2"><i class="ti ti-plus"></i> สร้างคำขอซื้อ (PR)</button>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4"><div class="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-2xl"><i class="ti ti-files"></i></div><div><p class="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">PR ทั้งหมด</p><h4 class="text-2xl font-bold text-gray-800 dark:text-white">${prDB.length}</h4></div></div>
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4"><div class="w-12 h-12 rounded-xl bg-warning-50 dark:bg-warning-900/30 text-warning-600 flex items-center justify-center text-2xl"><i class="ti ti-clock"></i></div><div><p class="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">รออนุมัติ</p><h4 class="text-2xl font-bold text-warning-600">${pending}</h4></div></div>
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4"><div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-2xl"><i class="ti ti-file-export"></i></div><div><p class="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">ออก PO แล้ว</p><h4 class="text-2xl font-bold text-indigo-600">${poIssued}</h4></div></div>
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4"><div class="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-900/30 text-success-600 flex items-center justify-center text-2xl"><i class="ti ti-cash"></i></div><div><p class="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">มูลค่ารวม (฿)</p><h4 class="text-xl font-bold text-success-600">${N(totalVal)}</h4></div></div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div class="p-5 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center"><h3 class="font-bold text-gray-800 dark:text-white flex items-center gap-2"><i class="ti ti-list text-primary-500"></i> รายการขอล่าสุด</h3><button onclick="go('tracking')" class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">ดูทั้งหมด</button></div>
          <div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead class="bg-gray-50/50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs"><tr><th class="p-4">เลขที่</th><th class="p-4">รายการ</th><th class="p-4 text-right">ยอดสุทธิ</th><th class="p-4 text-center">สถานะ</th></tr></thead><tbody class="divide-y divide-gray-50 dark:divide-gray-700">
            ${recentPRs.length > 0 ? recentPRs.map(r => `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"><td class="p-4 font-semibold text-primary-600 dark:text-primary-400">${r.id}</td><td class="p-4"><p class="text-gray-800 dark:text-gray-200 font-medium truncate w-40 md:w-auto">${r.items[0].name}</p><p class="text-[10px] text-gray-400">${r.req}</p></td><td class="p-4 text-right font-medium text-gray-700 dark:text-gray-300">฿${N(r.total)}</td><td class="p-4 text-center">${sb(r.status)}</td></tr>`).join('') : `<tr><td colspan="4" class="p-8 text-center text-gray-400">ยังไม่มีรายการ</td></tr>`}
          </tbody></table></div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"><h3 class="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4"><i class="ti ti-chart-bar text-primary-500"></i> มูลค่าสั่งซื้อแยกตามแผนก</h3><div class="relative w-full h-64"><canvas id="spendChart"></canvas></div></div>
      </div>
      <div class="xl:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col"><h3 class="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6"><i class="ti ti-chart-pie text-rose-500"></i> สัดส่วนการใช้งบ</h3><div class="relative w-full flex-1 min-h-[250px] flex items-center justify-center"><canvas id="budgetChart"></canvas></div><button onclick="go('budget')" class="w-full mt-6 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-xl transition border border-gray-200 dark:border-gray-600">ดูงบประมาณทั้งหมด</button></div>
    </div>
  </div>`;
}

function renderDashboardCharts() {
  dashboardCharts.forEach(c => c.destroy()); dashboardCharts = [];
  Chart.defaults.font.family = "'Prompt', sans-serif"; Chart.defaults.color = sysConfig.theme === 'dark' ? '#9ca3af' : '#6b7280';
  const ctxBudget = document.getElementById('budgetChart');
  if(ctxBudget && budgetDB.length > 0) {
    dashboardCharts.push(new Chart(ctxBudget, { type: 'doughnut', data: { labels: budgetDB.map(b=>`แผนก ${b.dept}`), datasets: [{ data: budgetDB.map(b=>b.used), backgroundColor: ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }, cutout: '70%' } }));
  }
  const ctxSpend = document.getElementById('spendChart');
  if(ctxSpend) {
    const spendByDept = {}; prDB.filter(r => ['approved', 'po_issued', 'received'].includes(r.status)).forEach(r => { spendByDept[r.dept] = (spendByDept[r.dept] || 0) + Number(r.total); });
    dashboardCharts.push(new Chart(ctxSpend, { type: 'bar', data: { labels: Object.keys(spendByDept).length ? Object.keys(spendByDept) : ['ไม่มีข้อมูล'], datasets: [{ label: 'มูลค่า (฿)', data: Object.keys(spendByDept).length ? Object.values(spendByDept) : [0], backgroundColor: '#6366f1', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: sysConfig.theme === 'dark' ? '#374151' : '#e5e7eb' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } } }));
  }
}

// --- ฟังก์ชันสร้าง PR ---
let prItemsList = []; let prAttachment = null;
function initPRForm() { prItemsList = [{ name: '', unit: 'ชิ้น', qty: 1, price: 0 }]; prAttachment = null; renderPRTable(); }
function handleFileSelect(event) {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { event.target.value = ""; return toast('ไฟล์ต้องไม่เกิน 5MB', 'warning'); }
  const reader = new FileReader(); reader.onload = e => { prAttachment = { name: file.name, mimeType: file.type, base64: e.target.result.split(',')[1] }; document.getElementById('file-name-display').textContent = file.name; document.getElementById('file-name-display').classList.add('text-primary-600', 'font-medium'); }; reader.readAsDataURL(file);
}
function renderPRTable() {
  const container = document.getElementById('pr-items-container'); if(!container) return;
  container.innerHTML = prItemsList.map((it, i) => `<div class="grid grid-cols-12 gap-3 items-center mb-3"><div class="col-span-1 text-center text-sm font-medium text-gray-400">${i + 1}</div><div class="col-span-4"><input type="text" class="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500" placeholder="ชื่อสินค้า" value="${it.name}" oninput="prItemsList[${i}].name=this.value"></div><div class="col-span-2"><input type="text" class="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500 text-center" placeholder="หน่วย" value="${it.unit}" oninput="prItemsList[${i}].unit=this.value"></div><div class="col-span-2"><input type="number" class="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500 text-center" min="1" value="${it.qty}" oninput="prItemsList[${i}].qty=+this.value; calculatePRTotal()"></div><div class="col-span-2"><input type="number" class="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500 text-right" min="0" value="${it.price}" oninput="prItemsList[${i}].price=+this.value; calculatePRTotal()"></div><div class="col-span-1 text-center"><button onclick="removePRItem(${i})" class="text-gray-400 hover:text-danger-600 transition p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/30"><i class="ti ti-trash text-lg"></i></button></div></div>`).join('');
  calculatePRTotal();
}
function addPRItem() { prItemsList.push({ name: '', unit: 'ชิ้น', qty: 1, price: 0 }); renderPRTable(); }
function removePRItem(i) { if(prItemsList.length > 1) { showConfirm('ลบรายการ?', `ต้องการลบรายการที่ ${i+1}?`, 'danger', () => { prItemsList.splice(i, 1); renderPRTable(); toast('ลบแล้ว', 'success'); }); } }
function calculatePRTotal() {
  const subtotal = prItemsList.reduce((sum, it) => sum + (it.qty * it.price), 0);
  let vat = 0, vatHtml = `<div class="flex justify-between text-sm text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700"><span>VAT:</span> <span>ไม่มี (0%)</span></div>`;
  if (sysConfig.vatEnabled) { vat = subtotal * (sysConfig.vatRate / 100); vatHtml = `<div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700"><span>VAT ${sysConfig.vatRate}%:</span> <span>฿ ${N(vat)}</span></div>`; }
  document.getElementById('pr-total-box').innerHTML = `<div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2"><span>ยอดก่อน VAT:</span> <span>฿ ${N(subtotal)}</span></div>${vatHtml}<div class="flex justify-between text-lg font-bold text-primary-700 dark:text-primary-400"><span>ยอดสุทธิ:</span> <span>฿ ${N(subtotal + vat)}</span></div>`;
}

function pageCreatePR() {
  const userOpts = usersDB.map(u => `<option value="${u.name}">`).join('');
  return `<div class="animate-slide-up space-y-6"><div class="grid grid-cols-1 xl:grid-cols-3 gap-6"><div class="xl:col-span-2 space-y-6"><div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"><h3 class="font-semibold text-gray-800 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2"><i class="ti ti-file-info text-primary-600"></i> ข้อมูลทั่วไป</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-5"><div><label class="block mb-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">ผู้บันทึก</label><input type="text" class="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 text-sm rounded-lg px-3 py-2 cursor-not-allowed" value="${currentUser.name}" readonly></div><div><label class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">ผู้ขอซื้อ <span class="text-red-500">*</span></label><input type="text" id="pr-requester" list="user-list" placeholder="พิมพ์ชื่อ..." class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500"><datalist id="user-list">${userOpts}</datalist></div><div><label class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">แผนก</label><select id="pr-dept" class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-lg px-3 py-2 outline-none"><option>MT</option><option>IT</option><option>HR</option><option>Operation</option></select></div></div></div><div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"><div class="flex justify-between items-end mb-4 pb-3 border-b border-gray-100 dark:border-gray-700"><h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2"><i class="ti ti-list-details text-primary-600"></i> รายการสินค้า</h3><button onclick="addPRItem()" class="text-sm font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg"><i class="ti ti-plus"></i> เพิ่ม</button></div><div id="pr-items-container" class="space-y-1"></div></div></div><div class="xl:col-span-1 space-y-6"><div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-6"><h3 class="font-semibold text-gray-800 dark:text-white mb-4">สรุปยอดรวม</h3><div id="pr-total-box" class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 mb-5 border border-gray-100 dark:border-gray-600"></div><div class="mb-5"><label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">แนบใบเสนอราคา</label><div class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick="document.getElementById('pr-file-upload').click()"><i class="ti ti-upload text-2xl text-gray-400 mb-1"></i><p class="text-xs text-gray-500" id="file-name-display">คลิกเพื่ออัปโหลดไฟล์</p><input type="file" id="pr-file-upload" class="hidden" accept=".pdf,image/jpeg,image/png" onchange="handleFileSelect(event)"></div></div><button onclick="showConfirm('ส่งขออนุมัติ PR?', 'ตรวจสอบความถูกต้องก่อนยืนยัน', 'primary', submitNewPR)" class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl py-3 shadow-md flex justify-center items-center gap-2"><i class="ti ti-cloud-upload"></i> ส่งขออนุมัติ</button></div></div></div></div>`;
}

async function submitNewPR() {
  const reqName = document.getElementById('pr-requester').value.trim();
  if (!reqName) return toast('กรุณาระบุชื่อผู้ขอซื้อ', 'warning');
  if (prItemsList.length === 0) return toast('ต้องมีสินค้าอย่างน้อย 1 รายการ', 'warning');
  for (let i = 0; i < prItemsList.length; i++) { if (!prItemsList[i].name.trim() || prItemsList[i].qty <= 0 || prItemsList[i].price < 0) return toast(`ข้อมูลรายการที่ ${i+1} ไม่สมบูรณ์`, 'error'); }
  const newPR = { id: `PR${new Date().getFullYear().toString().slice(-2)}${String(prDB.length+1).padStart(4,'0')}`, date: new Date().toLocaleDateString('th-TH'), dept: document.getElementById('pr-dept').value, req: reqName, items: prItemsList, attachment: prAttachment, hasVat: sysConfig.vatEnabled, vatRate: sysConfig.vatRate };
  const res = await callAPI({ action: 'createPR', prData: newPR, byUser: currentUser.username }, "บันทึกข้อมูล...");
  if (res.status === 'success') { toast('สร้าง PR สำเร็จ', 'success'); await syncData(); go('tracking'); } else { toast(res.message, 'error'); }
}

function pageApprove() {
  const pending = prDB.filter(r => {
    if (['rejected', 'approved', 'po_issued', 'received'].includes(r.status)) return false;
    if (currentUser.role === 'admin') return true; 
    if ((currentUser.role === 'manager' || currentUser.role === 'approver') && (r.status === 'pending' || r.status === 'pending_manager')) return true;
    if (currentUser.role === 'director' && r.status === 'pending_director') return true;
    if (currentUser.role === 'ceo' && r.status === 'pending_ceo') return true;
    return false;
  });
  if(pending.length === 0) return `<div class="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center text-gray-400 border border-dashed dark:border-gray-700"><i class="ti ti-checkbox text-5xl mb-3 text-success-400"></i><p>ไม่มีเอกสารรออนุมัติในระดับของคุณ</p></div>`;
  return `<div class="grid gap-4 animate-slide-up">` + pending.map(r => `<div class="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center"><div><div class="flex items-center gap-2"><span class="font-bold text-primary-700 dark:text-primary-400">${r.id}</span> ${sb(r.status)}</div><div class="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">${r.items[0].name} ${r.items.length > 1 ? `(+${r.items.length - 1} รายการ)` : ''} <span class="text-primary-600 dark:text-primary-400">(฿${N(r.total)})</span></div><div class="text-xs text-gray-500 mt-1 mb-2">${r.date} | ${r.dept} | ผู้ขอ: ${r.req}</div>${r.attachment ? `<a href="${r.attachment}" target="_blank" class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg"><i class="ti ti-paperclip"></i> ดูเอกสารแนบ</a>` : ``}</div><div class="flex flex-col gap-2"><button onclick="doApprove('${r.id}', 'approved')" class="bg-success-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-success-700"><i class="ti ti-check"></i> อนุมัติ</button><button onclick="doApprove('${r.id}', 'rejected')" class="bg-white dark:bg-gray-700 border border-danger-200 dark:border-danger-700 text-danger-600 dark:text-danger-400 px-4 py-2 rounded-lg text-sm font-medium"><i class="ti ti-x"></i> ปฏิเสธ</button></div></div>`).join('') + `</div>`;
}

function doApprove(id, status) {
  const isApp = status === 'approved';
  showConfirm(isApp ? 'ยืนยันอนุมัติ?' : 'ยืนยันปฏิเสธ?', `ต้องการ${isApp?'อนุมัติ':'ปฏิเสธ'} PR หมายเลข ${id}?`, isApp ? 'primary' : 'danger', async () => {
    const res = await callAPI({ action: 'updatePR', id: id, status: status, byUser: currentUser.username, role: currentUser.role }, "ประมวลผล...");
    if(res.status === 'success') { toast(res.message, 'success'); await syncData(); go('approve'); } else { toast(res.message, 'error'); }
  });
}

function pagePO() { 
  const approvedPRs = prDB.filter(r => r.status === 'approved');
  let content = '';
  if(approvedPRs.length === 0) content = `<div class="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-dashed border-gray-200 dark:border-gray-700"><div class="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><i class="ti ti-file-x text-4xl text-indigo-300"></i></div><h3 class="text-lg font-bold text-gray-800 dark:text-white">ไม่มีรายการพร้อมออก PO</h3></div>`;
  else content = `<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"><p class="text-sm font-medium text-gray-500 mb-4">เลือก PR ที่อนุมัติแล้วเพื่อดำเนินการสร้าง PO</p><div class="space-y-3 mb-6">${approvedPRs.map(r => `<label class="flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 cursor-pointer"><input type="checkbox" class="po-checkbox w-5 h-5 text-indigo-600 rounded"><div class="flex-1"><div class="flex justify-between"><span class="font-bold text-indigo-700 dark:text-indigo-400">${r.id}</span><span class="font-bold text-gray-800 dark:text-gray-200">฿${N(r.total)}</span></div><div class="text-sm text-gray-600 dark:text-gray-400 mt-1">${r.items[0].name} | ${r.dept}</div></div></label>`).join('')}</div><button onclick="processCreatePO()" class="w-full bg-indigo-600 text-white font-medium rounded-xl py-3 shadow-md"><i class="ti ti-file-export"></i> สร้างเอกสาร PO</button></div>`;
  return `<div class="animate-slide-up space-y-6"><div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white flex justify-between items-center relative overflow-hidden"><div class="relative z-10"><h2 class="text-2xl font-bold mb-1 flex items-center gap-2"><i class="ti ti-file-invoice"></i> สร้างใบสั่งซื้อ (PO)</h2></div><i class="ti ti-receipt text-8xl absolute -right-4 -bottom-4 text-white/10 rotate-12"></i></div>${content}</div>`; 
}

function processCreatePO() {
  const cbs = document.querySelectorAll('.po-checkbox:checked'); const selectedPRs = Array.from(cbs).map(cb => cb.value);
  if (selectedPRs.length === 0) return toast('กรุณาเลือก PR', 'warning');
  showConfirm('สร้าง PO?', `ออก PO จาก PR ${selectedPRs.length} รายการ`, 'primary', async () => {
    const res = await callAPI({ action: 'createPO', prIds: selectedPRs, byUser: currentUser.username }, "สร้างใบสั่งซื้อ...");
    if (res.status === 'success') { toast(res.message, 'success'); await syncData(); go('po'); } else { toast(res.message, 'error'); }
  });
}

function printPO(poId) {
  const po = poDB.find(p => p.id === poId); if (!po) return toast('ไม่พบเอกสาร', 'error');
  const prIds = po.prIds.split(',').map(s => s.trim()); let itemsHtml = ''; let grandTotal = 0;
  prDB.forEach(pr => { if (prIds.includes(pr.id)) { grandTotal += Number(pr.total); pr.items.forEach(it => { itemsHtml += `<tr><td style="padding:10px; border-bottom:1px solid #eee;">${it.name}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${it.qty}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">฿${N(it.price)}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right; font-weight:bold;">฿${N(it.qty * it.price)}</td></tr>`; }); } });
  const w = window.open('', '', 'width=900,height=700');
  w.document.write(`<html><head><title>PO - ${po.id}</title><style>body{font-family:'Prompt',sans-serif; padding:40px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th{background:#f8f9fa; padding:12px; text-align:left; border-bottom:2px solid #ddd;}</style></head><body><div style="display:flex; justify-content:space-between; border-bottom:3px solid #2563eb; padding-bottom:20px;"><div><h1 style="color:#2563eb; margin:0;">${sysConfig.appName}</h1><p style="margin:5px 0 0; color:#666;">Purchase Order</p></div><div style="text-align:right;"><h2 style="margin:0;">No. ${po.id}</h2><p style="margin:5px 0 0;">วันที่: ${po.date}</p></div></div><div style="margin-top:30px;"><strong>Vendor:</strong> ${po.vendor} <br><strong>อ้างอิง PR:</strong> ${po.prIds}</div><table><tr><th>รายการ</th><th style="text-align:center;">จำนวน</th><th style="text-align:right;">ราคา/หน่วย</th><th style="text-align:right;">รวม</th></tr>${itemsHtml}</table><div style="text-align:right; margin-top:30px; font-size:20px;"><strong>ยอดสุทธิ: <span style="color:#2563eb;">฿${N(grandTotal)}</span></strong></div><script>setTimeout(()=>{window.print(); window.close();},500);</script></body></html>`);
}

function pageReceive() { 
  const pendingPOs = poDB.filter(p => p.status === 'issued');
  let html = '';
  if(pendingPOs.length === 0) html = `<div class="text-center py-8 text-gray-400"><i class="ti ti-check text-4xl mb-2 text-success-300"></i><p>ไม่มีสินค้าค้างรับ</p></div>`;
  else html = `<div class="space-y-3 mt-6 text-left">${pendingPOs.map(po => `<div class="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600"><div><p class="font-bold text-teal-700 dark:text-teal-400">${po.id}</p><p class="text-xs text-gray-500 dark:text-gray-300">อ้างอิง: ${po.prIds}</p></div><div class="flex gap-2"><button onclick="printPO('${po.id}')" class="bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 px-3 py-1.5 rounded-lg text-sm"><i class="ti ti-printer"></i></button><button onclick="confirmReceive('${po.id}')" class="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm">รับของ</button></div></div>`).join('')}</div>`;
  return `<div class="animate-slide-up space-y-6"><div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white"><h2 class="text-2xl font-bold mb-1 flex items-center gap-2"><i class="ti ti-package"></i> บันทึกรับสินค้า (GR)</h2></div><div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center py-10">${html}</div></div>`; 
}

function confirmReceive(poId) {
  showConfirm('ยืนยันรับของ?', `ตรวจสอบสินค้าของ ${poId} ครบถ้วนแล้ว?`, 'primary', async () => {
    const res = await callAPI({ action: 'receiveGoods', poId: poId, byUser: currentUser.username }, "กำลังตัดยอด...");
    if (res.status === 'success') { toast(res.message, 'success'); await syncData(); go('receive'); } else { toast(res.message, 'error'); }
  });
}

function pageTracking() {
  const list = (currentUser.role === 'user') ? prDB.filter(r => r.req === currentUser.name) : prDB;
  return `<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-slide-up"><table class="min-w-full text-left"><thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700"><tr><th class="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">PR No.</th><th class="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">ข้อมูล</th><th class="p-4 text-right text-sm font-semibold text-gray-500 dark:text-gray-400">ยอดรวม</th><th class="p-4 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">สถานะ</th></tr></thead><tbody class="divide-y divide-gray-50 dark:divide-gray-700">${list.reverse().map(r=>`<tr class="hover:bg-gray-50 dark:hover:bg-gray-700"><td class="p-4 font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1">${r.id} ${r.attachment ? `<a href="${r.attachment}" target="_blank"><i class="ti ti-paperclip"></i></a>` : ''}</td><td class="p-4"><div class="text-sm font-medium dark:text-gray-200">${r.items[0].name}</div><div class="text-xs text-gray-500">${r.date} | ${r.req}</div></td><td class="p-4 text-right text-sm font-medium dark:text-gray-300">฿${N(r.total)}</td><td class="p-4 text-center">${sb(r.status)}</td></tr>`).join('')}</tbody></table></div>`;
}

function pageExport() { return `<div class="animate-slide-up space-y-6"><div class="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl shadow-lg p-6 text-white"><h2 class="text-2xl font-bold"><i class="ti ti-report-analytics"></i> Export Report</h2></div><div class="bg-white dark:bg-gray-800 p-10 text-center rounded-2xl border border-dashed dark:border-gray-700"><i class="ti ti-file-spreadsheet text-5xl text-gray-400 mb-4"></i><p class="dark:text-gray-300">ฟีเจอร์ดาวน์โหลด Excel รอการอัปเดตในแพตช์หน้า</p></div></div>`; }
function pageVendors() { return `<div class="animate-slide-up space-y-6"><div class="flex justify-between items-center"><h2 class="text-xl font-bold dark:text-white"><i class="ti ti-building-store text-amber-500 text-2xl"></i> ทะเบียนผู้ขาย (Vendor)</h2></div><div class="grid grid-cols-1 md:grid-cols-3 gap-5">${vendorDB.map(v => `<div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-2xl"><h3 class="font-bold dark:text-white">${v.name}</h3><p class="text-xs text-gray-500 mt-1">${v.cat}</p></div>`).join('')}</div></div>`; }
function pageBudget() { return `<div class="animate-slide-up space-y-6"><div class="flex justify-between items-center"><h2 class="text-xl font-bold dark:text-white"><i class="ti ti-chart-pie text-rose-500 text-2xl"></i> งบประมาณ (Budget)</h2></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6">${budgetDB.map(b => { const pct = Math.round((b.used/b.budget)*100); return `<div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700"><div class="flex justify-between mb-4"><h3 class="font-bold dark:text-white">แผนก ${b.dept}</h3><span class="font-bold ${pct>80?'text-red-500':'text-emerald-500'}">${pct}%</span></div><div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-2"><div class="bg-emerald-500 h-3 rounded-full" style="width: ${pct}%"></div></div></div>`}).join('')}</div></div>`; }
function pageCatalog() { return `<div class="animate-slide-up space-y-6"><div class="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700"><h2 class="text-lg font-bold dark:text-white mb-4"><i class="ti ti-search text-cyan-600"></i> คลังสินค้า (Catalog)</h2><div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead class="bg-gray-50 dark:bg-gray-900 text-gray-500"><tr><th class="p-4">รหัส</th><th class="p-4">ชื่อสินค้า</th><th class="p-4 text-right">ราคา</th></tr></thead><tbody class="divide-y divide-gray-100 dark:divide-gray-700">${catalogDB.map(c => `<tr class="dark:text-gray-200"><td class="p-4 font-bold">${c.code}</td><td class="p-4">${c.name}</td><td class="p-4 text-right">${N(c.price)}</td></tr>`).join('')}</tbody></table></div></div></div>`; }

function pageSettings() {
  const rColor = currentUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700';
  const userTableHtml = usersDB.map(u => `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-50 dark:border-gray-700/50"><td class="p-3 font-medium text-gray-800 dark:text-gray-200">${u.name}</td><td class="p-3 text-gray-500 dark:text-gray-400">${u.username}</td><td class="p-3"><span class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded text-xs uppercase font-bold border border-gray-200 dark:border-gray-600">${u.role}</span></td><td class="p-3 flex gap-2"><button onclick="openUserModal('${u.username}')" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 transition p-1 rounded bg-blue-50 dark:bg-blue-900/30" title="แก้ไข"><i class="ti ti-edit"></i></button>${(u.username !== 'admin' && u.username !== currentUser.username) ? `<button onclick="deleteUser('${u.username}')" class="text-red-600 dark:text-red-400 hover:text-red-800 transition p-1 rounded bg-red-50 dark:bg-red-900/30" title="ลบผู้ใช้"><i class="ti ti-trash"></i></button>` : `<span class="w-7"></span>`}</td></tr>`).join('');
  return `
  <div class="max-w-4xl space-y-6 animate-slide-up pb-10">
    <div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><i class="ti ti-settings"></i> การตั้งค่าระบบ (ERP Control)</h2><button onclick="toggleTheme()" class="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-4 py-2 rounded-xl text-sm font-medium shadow-md transition flex items-center gap-2"><i class="ti ti-${sysConfig.theme === 'dark' ? 'sun' : 'moon'}"></i> โหมดสว่าง/มืด</button></div>
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"><div class="p-5 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900"><h3 class="font-bold text-gray-800 dark:text-white">ข้อมูลผู้ใช้งาน (My Profile)</h3></div><div class="p-6 flex items-center gap-6"><div class="w-20 h-20 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-3xl font-bold">${currentUser.name.charAt(0)}</div><div><h4 class="text-xl font-bold dark:text-white">${currentUser.name}</h4><p class="text-gray-500 text-sm mb-2">${currentUser.username}</p><span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${rColor}">${currentUser.role}</span></div></div></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"><div class="p-5 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900"><h3 class="font-bold text-gray-800 dark:text-white">การแสดงผล (Preferences)</h3></div><div class="p-6 space-y-4"><div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อระบบ</label><input type="text" id="cfg-app-name" value="${sysConfig.appName}" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"></div><div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ลิงก์โลโก้</label><input type="text" id="cfg-logo" value="${sysConfig.logoUrl}" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"></div><div class="flex gap-4"><div class="flex-1"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ใช้งาน VAT</label><select id="cfg-vat-en" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"><option value="true" ${sysConfig.vatEnabled ? 'selected' : ''}>เปิดใช้งาน</option><option value="false" ${!sysConfig.vatEnabled ? 'selected' : ''}>ปิดใช้งาน</option></select></div><div class="w-24"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT (%)</label><input type="number" id="cfg-vat-rate" value="${sysConfig.vatRate}" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"></div></div><button onclick="saveUIPrefs()" class="w-full bg-primary-600 text-white font-medium py-2 rounded-xl mt-2 hover:bg-primary-700 transition">บันทึกการตั้งค่า</button></div></div>
      <div class="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/50 overflow-hidden h-fit"><div class="p-5 border-b border-red-200/50 dark:border-red-900/50"><h3 class="font-bold text-red-800 dark:text-red-400 flex items-center gap-2"><i class="ti ti-alert-triangle"></i> Danger Zone</h3></div><div class="p-6"><p class="text-xs text-red-600 dark:text-red-300 mb-4">รีเซ็ตข้อมูลทั้งหมดและสร้างฐานข้อมูลใหม่พร้อมกับตั้งค่าสิทธิ์ระดับ Enterprise (CEO, Director, Manager)</p><button onclick="generateMockData()" class="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-xl shadow-sm transition">ดำเนินการรีเซ็ตฐานข้อมูล</button></div></div>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-6"><div class="p-5 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900"><h3 class="font-bold text-gray-800 dark:text-white"><i class="ti ti-users"></i> จัดการผู้ใช้งาน (User Management)</h3><button onclick="openUserModal()" class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-primary-700 transition flex items-center gap-1"><i class="ti ti-user-plus"></i> เพิ่มผู้ใช้ใหม่</button></div><div class="overflow-x-auto"><table class="min-w-full text-sm text-left"><thead class="bg-gray-50 dark:bg-gray-900"><th class="p-3 text-gray-500 dark:text-gray-400">ชื่อ-นามสกุล</th><th class="p-3 text-gray-500 dark:text-gray-400">Username</th><th class="p-3 text-gray-500 dark:text-gray-400">สิทธิ์ (Role)</th><th class="p-3 text-gray-500 dark:text-gray-400">จัดการ</th></thead><tbody class="divide-y divide-gray-50 dark:divide-gray-700">${userTableHtml}</tbody></table></div></div>
  </div>`;
}

function saveUIPrefs() {
  sysConfig.appName = document.getElementById('cfg-app-name').value; sysConfig.logoUrl = document.getElementById('cfg-logo').value; sysConfig.vatEnabled = document.getElementById('cfg-vat-en').value === 'true'; sysConfig.vatRate = Number(document.getElementById('cfg-vat-rate').value);
  saveConfig(); toast('บันทึกสำเร็จ', 'success');
}

async function generateMockData() {
  showConfirm('รีเซ็ตฐานข้อมูล?', 'ลบข้อมูลเดิมทั้งหมดและสร้าง DB ใหม่?', 'danger', async () => {
    const res = await callAPI({ action: 'initMockData' }, "ดำเนินการ...");
    if (res.status === 'success') { toast(res.message, 'success'); setTimeout(() => { localStorage.removeItem('currentUser'); location.reload(); }, 1500); } else { toast(res.message, 'error'); }
  });
}

function openUserModal(username = null) {
  const modal = document.getElementById('user-modal'); const title = document.getElementById('user-modal-title'); const hint = document.getElementById('um-pass-hint');
  if (username) {
    const user = usersDB.find(u => u.username === username); title.innerHTML = `<i class="ti ti-user-edit text-primary-600"></i> แก้ไขผู้ใช้งาน`; hint.textContent = "(เว้นว่างหากไม่ต้องการเปลี่ยนรหัสผ่าน)";
    document.getElementById('um-username').value = user.username; document.getElementById('um-username').disabled = true; document.getElementById('um-username').classList.add('bg-gray-100', 'cursor-not-allowed');
    document.getElementById('um-name').value = user.name; document.getElementById('um-role').value = user.role;
  } else {
    title.innerHTML = `<i class="ti ti-user-plus text-primary-600"></i> เพิ่มผู้ใช้งาน`; hint.textContent = "(จำเป็นต้องกำหนดรหัสผ่าน)";
    document.getElementById('um-username').value = ''; document.getElementById('um-username').disabled = false; document.getElementById('um-username').classList.remove('bg-gray-100', 'cursor-not-allowed');
    document.getElementById('um-name').value = ''; document.getElementById('um-role').value = 'user';
  }
  document.getElementById('um-password').value = ''; modal.classList.remove('hidden');
}

function closeUserModal() { document.getElementById('user-modal').classList.add('hidden'); }

async function submitUserForm() {
  const data = { username: document.getElementById('um-username').value.trim(), name: document.getElementById('um-name').value.trim(), password: document.getElementById('um-password').value, role: document.getElementById('um-role').value };
  if (!data.username || !data.name) return toast('กรุณากรอก Username และชื่อ', 'warning');
  if (!document.getElementById('um-username').disabled && !data.password) return toast('ต้องกำหนดรหัสผ่าน', 'warning');
  const res = await callAPI({ action: 'saveUser', userData: data, byUser: currentUser.username }, "กำลังบันทึก...");
  if (res.status === 'success') { toast(res.message, 'success'); closeUserModal(); await syncData(); go('settings'); } else { toast(res.message, 'error'); }
}

function deleteUser(username) {
  showConfirm('ลบผู้ใช้?', `ยืนยันการลบผู้ใช้ ${username}?`, 'danger', async () => {
    const res = await callAPI({ action: 'deleteUser', targetUsername: username, byUser: currentUser.username }, "ลบข้อมูล...");
    if (res.status === 'success') { toast(res.message, 'success'); await syncData(); go('settings'); } else { toast(res.message, 'error'); }
  });
}

// 🚀 Boot System
if (API_URL.includes("วาง_WEB_APP_URL")) { alert("⚠️ ตั้งค่า API_URL ในไฟล์ script.js ก่อนใช้งาน"); } else { checkAuth(); }
