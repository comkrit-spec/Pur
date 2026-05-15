// =======================================================
// 📱 PWA & Icon Setup
// =======================================================
function setupPWA() {
  const myIconUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135695.png";
  const manifest = {
    "name": "Asia Hydro Procurement Cloud", "short_name": "AH ProCure",
    "description": "ระบบจัดซื้อ E-Procurement ภายในองค์กร",
    "start_url": ".", "display": "standalone", "background_color": "#ffffff", "theme_color": "#2563eb",
    "icons": [{ "src": myIconUrl, "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }]
  };
  const manifestURL = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
  const link = document.createElement('link'); link.rel = 'manifest'; link.href = manifestURL; document.head.appendChild(link);
}
setupPWA();

// =======================================================
// 🔑 CONFIGURATION 
// =======================================================
const API_URL = "วาง_WEB_APP_URL_ของคุณที่นี่"; // 📌 เปลี่ยนตรงนี้ด้วย
const API_KEY = "AH_ProCure_SecureKey_2026"; 
const N = n => Number(n).toLocaleString('th-TH', {minimumFractionDigits:0, maximumFractionDigits:2});

// ตัวแปรเก็บข้อมูล (ดึงจาก Backend ทั้งหมด)
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let prDB = [], usersDB = [], vendorDB = [], budgetDB = [], catalogDB = [], poDB = [];

// ==========================================
// CORE SYSTEM FUNCTIONS
// ==========================================
async function callAPI(payload, loadingMsg = "กำลังโหลด...") {
  showLoading(loadingMsg); payload.apiKey = API_KEY; 
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    const result = await response.json(); hideLoading(); return result;
  } catch (error) { hideLoading(); toast("เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว", "error", "ti-wifi-off"); return { status: "error" }; }
}

async function syncData() {
  const res = await callAPI({ action: 'getData' }, "ซิงค์ข้อมูลล่าสุด...");
  if (res.status === 'success') { 
    prDB = res.prs || []; usersDB = res.users || []; 
    vendorDB = res.vendors || []; budgetDB = res.budgets || []; 
    catalogDB = res.catalog || []; poDB = res.pos || []; 
  }
}

async function checkAuth() {
  if (currentUser) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    setTimeout(() => document.getElementById('app-screen').classList.remove('opacity-0'), 50);
    document.getElementById('user-name-display').textContent = currentUser.name;
    document.getElementById('user-avatar').textContent = currentUser.name.charAt(0);
    document.getElementById('user-role-display').textContent = currentUser.role;
    renderSidebar();
    await syncData();
    go('dashboard');
  } else { 
    document.getElementById('login-screen').classList.remove('hidden'); 
    document.getElementById('app-screen').classList.add('hidden'); 
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const res = await callAPI({ action: 'login', user: document.getElementById('username').value.trim(), pass: document.getElementById('password').value.trim() }, "ตรวจสอบบัญชี...");
  if (res.status === 'success') {
    localStorage.setItem('currentUser', JSON.stringify(res.user)); currentUser = res.user;
    toast(`ยินดีต้อนรับ ${currentUser.name}`, 'success'); checkAuth();
  } else { toast(res.message || "รหัสไม่ถูกต้อง", 'error', 'ti-alert-circle'); }
}

function handleLogout() { 
  showConfirm('ออกจากระบบ?', 'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?', 'warning', () => {
    localStorage.removeItem('currentUser'); location.reload(); 
  });
}

// ==========================================
// UI UTILITIES & NAVIGATION
// ==========================================
const menuConfig = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', roles: ['admin', 'approver', 'user'] },
  { id: 'create-pr', label: 'สร้าง PR', icon: 'ti-file-plus', roles: ['admin', 'user'] },
  { id: 'approve', label: 'อนุมัติ PR', icon: 'ti-clipboard-check', roles: ['admin', 'approver'] },
  { id: 'po', label: 'สร้าง PO', icon: 'ti-file-invoice', roles: ['admin', 'approver'] },
  { id: 'tracking', label: 'ติดตามสถานะ', icon: 'ti-truck-delivery', roles: ['admin', 'approver', 'user'] },
  { id: 'receive', label: 'รับสินค้า', icon: 'ti-package', roles: ['admin', 'user'] },
  { id: 'export', label: 'Export รายงาน', icon: 'ti-download', roles: ['admin', 'approver'] },
  { id: 'vendors', label: 'Vendor Master', icon: 'ti-building-store', roles: ['admin'] },
  { id: 'budget', label: 'Budget Control', icon: 'ti-chart-pie', roles: ['admin', 'approver'] },
  { id: 'catalog', label: 'คลังสินค้า', icon: 'ti-search', roles: ['admin', 'user'] },
  { id: 'settings', label: 'ตั้งค่าระบบ', icon: 'ti-settings', roles: ['admin'] },
];

function renderSidebar() {
  document.getElementById('sidebar-menu').innerHTML = menuConfig.filter(m => m.roles.includes(currentUser.role))
    .map(m => `<button onclick="go('${m.id}')" id="nav-${m.id}" class="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"><i class="ti ${m.icon} text-lg"></i> ${m.label}</button>`).join('');
}

function go(page) {
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('bg-primary-50', 'text-primary-600'));
  document.getElementById('nav-' + page)?.classList.add('bg-primary-50', 'text-primary-600');
  const titles = { dashboard:'Dashboard', 'create-pr':'สร้างใบขอซื้อ (PR)', approve:'อนุมัติรายการ', po:'สร้างใบสั่งซื้อ (PO)', tracking:'ติดตามสถานะ', receive:'รับสินค้า (GR)', export:'Export รายงาน', vendors:'Vendor Master', budget:'ควบคุมงบประมาณ', catalog:'คลังสินค้า', settings:'ตั้งค่าระบบ (Cloud)' };
  document.getElementById('page-title').textContent = titles[page] || page;
  
  const c = document.getElementById('page-content');
  if(page==='dashboard') c.innerHTML = pageDashboard();
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
  const t = document.getElementById('toast');
  const colors = { success: 'bg-gray-800 text-white', error: 'bg-danger-600 text-white', warning: 'bg-warning-500 text-white', info: 'bg-primary-600 text-white' };
  t.className = `fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-3 transition-all duration-300 z-[200] pointer-events-none ${colors[type]}`;
  document.getElementById('toast-icon').className = `ti ${icon} text-lg`; document.getElementById('toast-msg').textContent = msg;
  t.classList.remove('toast-enter'); t.classList.add('toast-active');
  setTimeout(() => { t.classList.remove('toast-active'); t.classList.add('toast-enter'); }, 3000);
}

function showLoading(text) { document.getElementById('loading-text').textContent = text; document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

let confirmCallback = null;
function showConfirm(title, desc, type = 'primary', onConfirm) {
  const modal = document.getElementById('custom-modal'); const backdrop = document.getElementById('modal-backdrop');
  const content = document.getElementById('modal-content'); const icon = document.getElementById('modal-icon'); const btn = document.getElementById('modal-confirm-btn');
  document.getElementById('modal-title').textContent = title; document.getElementById('modal-desc').textContent = desc;
  icon.className = "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl";
  btn.className = "flex-1 text-white font-medium py-2.5 rounded-xl shadow-md transition";
  if(type === 'warning') { icon.classList.add('bg-warning-50', 'text-warning-600'); icon.innerHTML = '<i class="ti ti-alert-triangle"></i>'; btn.classList.add('bg-warning-500', 'hover:bg-warning-600'); } 
  else if(type === 'danger') { icon.classList.add('bg-danger-50', 'text-danger-600'); icon.innerHTML = '<i class="ti ti-trash"></i>'; btn.classList.add('bg-danger-600', 'hover:bg-danger-700'); } 
  else { icon.classList.add('bg-primary-50', 'text-primary-600'); icon.innerHTML = '<i class="ti ti-check"></i>'; btn.classList.add('bg-primary-600', 'hover:bg-primary-700'); }
  confirmCallback = onConfirm; btn.onclick = () => { closeModal(); if(confirmCallback) confirmCallback(); };
  modal.classList.remove('hidden');
  setTimeout(() => { backdrop.classList.remove('modal-backdrop-enter'); backdrop.classList.add('modal-backdrop-active'); content.classList.remove('modal-content-enter'); content.classList.add('modal-content-active'); }, 10);
}
function closeModal() {
  const backdrop = document.getElementById('modal-backdrop'); const content = document.getElementById('modal-content');
  backdrop.classList.remove('modal-backdrop-active'); backdrop.classList.add('modal-backdrop-enter'); content.classList.remove('modal-content-active'); content.classList.add('modal-content-enter');
  setTimeout(() => { document.getElementById('custom-modal').classList.add('hidden'); }, 300);
}

function sb(status) {
  const map = { pending: { l: 'รออนุมัติ', c: 'bg-warning-100 text-warning-600' }, approved: { l: 'อนุมัติแล้ว', c: 'bg-success-100 text-success-700' }, rejected: { l: 'ปฏิเสธ', c: 'bg-danger-100 text-danger-600' }, po_issued: { l: 'ออก PO แล้ว', c: 'bg-indigo-100 text-indigo-700' }, received: { l: 'รับของแล้ว', c: 'bg-gray-100 text-gray-600' } };
  const s = map[status] || { l: status, c: 'bg-gray-100 text-gray-600' }; return `<span class="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${s.c}">${s.l}</span>`;
}

// ==========================================
// PAGE RENDERS & LOGIC
// ==========================================
function pageDashboard() {
  const pending = prDB.filter(r => r.status === 'pending').length;
  const totalVal = prDB.reduce((sum, r) => sum + Number(r.total), 0);
  return `<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 animate-slide-up">
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"><div class="text-gray-500 text-xs font-semibold uppercase mb-2">PR ทั้งหมด</div><div class="text-3xl font-bold text-gray-800">${prDB.length}</div></div>
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"><div class="text-gray-500 text-xs font-semibold uppercase mb-2">รออนุมัติ</div><div class="text-3xl font-bold text-warning-600">${pending}</div></div>
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"><div class="text-gray-500 text-xs font-semibold uppercase mb-2">มูลค่ารวมสะสม</div><div class="text-3xl font-bold text-success-600">฿${N(totalVal)}</div></div></div>`;
}

// --- ฟังก์ชันสร้าง PR ---
let prItemsList = []; let prAttachment = null;
function initPRForm() { prItemsList = [{ name: '', unit: 'ชิ้น', qty: 1, price: 0 }]; prAttachment = null; renderPRTable(); }

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { event.target.value = ""; return toast('ไฟล์ต้องมีขนาดไม่เกิน 5MB', 'warning'); }
  const reader = new FileReader();
  reader.onload = function(e) {
    prAttachment = { name: file.name, mimeType: file.type, base64: e.target.result.split(',')[1] };
    document.getElementById('file-name-display').textContent = file.name;
    document.getElementById('file-name-display').classList.add('text-primary-600', 'font-medium');
  }; reader.readAsDataURL(file);
}

function renderPRTable() {
  const container = document.getElementById('pr-items-container'); if(!container) return;
  container.innerHTML = prItemsList.map((it, i) => `
    <div class="grid grid-cols-12 gap-3 items-center mb-3">
      <div class="col-span-1 text-center text-sm font-medium text-gray-400">${i + 1}</div>
      <div class="col-span-4"><input type="text" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500" placeholder="ชื่อสินค้า/บริการ" value="${it.name}" oninput="prItemsList[${i}].name=this.value"></div>
      <div class="col-span-2"><input type="text" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500 text-center" placeholder="หน่วย" value="${it.unit}" oninput="prItemsList[${i}].unit=this.value"></div>
      <div class="col-span-2"><input type="number" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500 text-center" min="1" value="${it.qty}" oninput="prItemsList[${i}].qty=+this.value; calculatePRTotal()"></div>
      <div class="col-span-2"><input type="number" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500 text-right" min="0" value="${it.price}" oninput="prItemsList[${i}].price=+this.value; calculatePRTotal()"></div>
      <div class="col-span-1 text-center"><button onclick="removePRItem(${i})" class="text-gray-400 hover:text-danger-600 transition p-2 rounded-lg hover:bg-danger-50"><i class="ti ti-trash text-lg"></i></button></div>
    </div>`).join('');
  calculatePRTotal();
}
function addPRItem() { prItemsList.push({ name: '', unit: 'ชิ้น', qty: 1, price: 0 }); renderPRTable(); }
function removePRItem(i) { if(prItemsList.length > 1) { showConfirm('ลบรายการสินค้า?', `ต้องการลบรายการที่ ${i+1} ใช่หรือไม่?`, 'danger', () => { prItemsList.splice(i, 1); renderPRTable(); toast('ลบแล้ว', 'success'); }); } }

function calculatePRTotal() {
  const subtotal = prItemsList.reduce((sum, it) => sum + (it.qty * it.price), 0);
  const vat = subtotal * 0.07;
  document.getElementById('pr-total-box').innerHTML = `<div class="flex justify-between text-sm text-gray-500 mb-2"><span>ยอดก่อน VAT:</span> <span>฿ ${N(subtotal)}</span></div><div class="flex justify-between text-sm text-gray-500 mb-3 pb-3 border-b border-gray-200"><span>VAT 7%:</span> <span>฿ ${N(vat)}</span></div><div class="flex justify-between text-lg font-bold text-primary-700"><span>ยอดสุทธิรวม:</span> <span>฿ ${N(subtotal + vat)}</span></div>`;
}

function pageCreatePR() {
  return `<div class="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-up">
    <div class="xl:col-span-2 space-y-6">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"><h3 class="font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2"><i class="ti ti-file-info text-primary-600"></i> ข้อมูลทั่วไป</h3>
        <div class="grid grid-cols-2 gap-5"><div><label class="block mb-1.5 text-sm font-medium text-gray-700">ผู้ขอซื้อ</label><input type="text" class="w-full bg-gray-100 border border-gray-200 text-gray-500 text-sm rounded-lg px-3 py-2 cursor-not-allowed" value="${currentUser.name}" readonly></div><div><label class="block mb-1.5 text-sm font-medium text-gray-700">แผนก</label><select id="pr-dept" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2 outline-none focus:border-primary-500"><option>MT</option><option>IT</option><option>HR</option><option>Operation</option></select></div></div></div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"><div class="flex justify-between items-end mb-4 pb-3 border-b border-gray-100"><h3 class="font-semibold text-gray-800 flex items-center gap-2"><i class="ti ti-list-details text-primary-600"></i> รายการสินค้า</h3><button onclick="addPRItem()" class="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg transition"><i class="ti ti-plus"></i> เพิ่ม</button></div>
        <div id="pr-items-container" class="space-y-1"></div></div></div>
    <div class="xl:col-span-1 space-y-6">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
        <h3 class="font-semibold text-gray-800 mb-4">สรุปยอดรวม</h3>
        <div id="pr-total-box" class="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-100"></div>
        <div class="mb-5"><label class="block mb-2 text-sm font-medium text-gray-700">แนบใบเสนอราคา</label>
          <div class="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition cursor-pointer" onclick="document.getElementById('pr-file-upload').click()"><i class="ti ti-upload text-2xl text-gray-400 mb-1"></i><p class="text-xs text-gray-500" id="file-name-display">คลิกเพื่ออัปโหลดไฟล์ (Max: 5MB)</p><input type="file" id="pr-file-upload" class="hidden" accept=".pdf,image/jpeg,image/png" onchange="handleFileSelect(event)"></div></div>
        <button onclick="showConfirm('ส่งขออนุมัติ PR?', 'กรุณาตรวจสอบข้อมูลและไฟล์แนบ', 'primary', submitNewPR)" class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl text-sm px-5 py-3 text-center transition shadow-md flex justify-center items-center gap-2"><i class="ti ti-cloud-upload text-lg"></i> ส่งขออนุมัติ</button></div></div></div>`;
}

async function submitNewPR() {
  if (prItemsList.length === 0) return toast('ต้องมีสินค้าอย่างน้อย 1 รายการ', 'warning');
  for (let i = 0; i < prItemsList.length; i++) {
    const it = prItemsList[i];
    if (!it.name.trim()) return toast(`กรุณากรอกชื่อสินค้าบรรทัด ${i + 1}`, 'error');
    if (it.qty <= 0 || it.price < 0) return toast(`จำนวนและราคาบรรทัด ${i + 1} ไม่ถูกต้อง`, 'error');
  }
  
  const newPR = { 
    id: `PR${new Date().getFullYear().toString().slice(-2)}${String(prDB.length+1).padStart(4,'0')}`, 
    date: new Date().toLocaleDateString('th-TH'), dept: document.getElementById('pr-dept').value, req: currentUser.name, 
    items: prItemsList, status: 'pending', attachment: prAttachment 
  };
  
  const res = await callAPI({ action: 'createPR', prData: newPR }, "กำลังบันทึกและอัปโหลดไฟล์...");
  if (res.status === 'success') { toast('สร้าง PR สำเร็จ', 'success'); await syncData(); go('tracking'); } 
  else { toast(res.message, 'error'); }
}

function pageApprove() {
  const pending = prDB.filter(r => r.status === 'pending');
  if(pending.length === 0) return `<div class="bg-white rounded-2xl p-12 text-center text-gray-400 border border-dashed"><i class="ti ti-checkbox text-5xl mb-3 text-success-400"></i><p>ไม่มีเอกสารรออนุมัติ</p></div>`;
  return `<div class="grid gap-4 animate-slide-up">` + pending.map(r => `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2"><span class="font-bold text-primary-700">${r.id}</span> ${sb(r.status)}</div>
        <div class="text-sm font-medium text-gray-800 mt-1">${r.items[0].name} ${r.items.length > 1 ? `(+${r.items.length - 1} รายการ)` : ''} <span class="text-primary-600">(฿${N(r.total)})</span></div>
        <div class="text-xs text-gray-500 mt-1 mb-2">${r.date} | ${r.dept} | ผู้ขอ: ${r.req}</div>
        ${r.attachment ? `<a href="${r.attachment}" target="_blank" class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition"><i class="ti ti-paperclip text-sm"></i> ดูเอกสารแนบ</a>` : `<span class="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg"><i class="ti ti-file-off text-sm"></i> ไม่มีไฟล์</span>`}
      </div>
      <div class="flex flex-col gap-2">
        <button onclick="doApprove('${r.id}', 'approved')" class="bg-success-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-success-700"><i class="ti ti-check"></i> อนุมัติ</button>
        <button onclick="doApprove('${r.id}', 'rejected')" class="bg-white border border-danger-200 text-danger-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-danger-50"><i class="ti ti-x"></i> ปฏิเสธ</button>
      </div></div>`).join('') + `</div>`;
}

function doApprove(id, status) {
  const isApp = status === 'approved';
  showConfirm(isApp ? 'ยืนยันอนุมัติ?' : 'ยืนยันปฏิเสธ?', `ต้องการ${isApp?'อนุมัติ':'ปฏิเสธ'} PR หมายเลข ${id} ใช่หรือไม่?`, isApp ? 'primary' : 'danger', async () => {
    const res = await callAPI({ action: 'updatePR', id: id, status: status }, "กำลังอัปเดต...");
    if(res.status === 'success') { toast(`สำเร็จ`, 'success'); await syncData(); go('approve'); } else { toast(res.message, 'error'); }
  });
}

// --- ฟังก์ชันสร้าง PO ---
function pagePO() { 
  const approvedPRs = prDB.filter(r => r.status === 'approved');
  let content = '';
  if(approvedPRs.length === 0) {
    content = `<div class="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm"><div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4"><i class="ti ti-file-x text-4xl text-indigo-300"></i></div><h3 class="text-lg font-bold text-gray-800">ไม่มีรายการพร้อมออก PO</h3><p class="text-sm text-gray-500 mt-1">ต้องมีใบ PR ที่ผ่านการอนุมัติแล้ว จึงจะสามารถสร้างใบสั่งซื้อได้</p></div>`;
  } else {
    content = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"><p class="text-sm font-medium text-gray-500 mb-4">เลือก PR ที่อนุมัติแล้วเพื่อดำเนินการสร้าง PO</p><div class="space-y-3 mb-6">
        ${approvedPRs.map(r => `<label class="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition group"><input type="checkbox" class="po-checkbox w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" value="${r.id}"><div class="flex-1"><div class="flex justify-between"><span class="font-bold text-indigo-700 group-hover:text-indigo-800">${r.id}</span><span class="font-bold text-gray-800">฿${N(r.total)}</span></div><div class="text-sm text-gray-600 mt-1">${r.items[0].name} ${r.items.length > 1 ? `(+${r.items.length - 1} รายการ)` : ''} | <span class="text-xs text-gray-400">แผนก: ${r.dept}</span></div></div></label>`).join('')}
      </div><button onclick="processCreatePO()" class="w-full bg-indigo-600 text-white font-medium rounded-xl py-3 shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2"><i class="ti ti-file-export"></i> สร้างเอกสาร PO</button></div>`;
  }
  return `<div class="animate-slide-up space-y-6"><div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white flex justify-between items-center relative overflow-hidden"><div class="relative z-10"><h2 class="text-2xl font-bold mb-1 flex items-center gap-2"><i class="ti ti-file-invoice"></i> สร้างใบสั่งซื้อ (Purchase Order)</h2><p class="text-blue-100 text-sm">เปลี่ยนคำขอซื้อ (PR) ที่อนุมัติแล้ว ให้เป็นใบสั่งซื้อส่งให้ Vendor</p></div><i class="ti ti-receipt text-8xl absolute -right-4 -bottom-4 text-white/10 rotate-12"></i></div>${content}</div>`; 
}

function processCreatePO() {
  const checkboxes = document.querySelectorAll('.po-checkbox:checked');
  const selectedPRs = Array.from(checkboxes).map(cb => cb.value);
  if (selectedPRs.length === 0) return toast('กรุณาเลือก PR อย่างน้อย 1 รายการ', 'warning');
  
  showConfirm('สร้างใบสั่งซื้อ (PO)?', `สร้างเอกสาร PO ใหม่จาก PR ทั้งหมด ${selectedPRs.length} รายการ`, 'primary', async () => {
    const res = await callAPI({ action: 'createPO', prIds: selectedPRs }, "กำลังสร้างใบสั่งซื้อ...");
    if (res.status === 'success') { toast(res.message, 'success'); await syncData(); go('po'); } 
    else { toast(res.message, 'error'); }
  });
}

// --- [อัปเดต A] ฟังก์ชันพิมพ์ PDF ---
function printPO(poId) {
  const po = poDB.find(p => p.id === poId);
  if (!po) return toast('ไม่พบเอกสาร', 'error');

  const prIds = po.prIds.split(',').map(s => s.trim());
  let itemsHtml = ''; let grandTotal = 0;
  
  prDB.forEach(pr => {
    if (prIds.includes(pr.id)) {
      grandTotal += Number(pr.total);
      pr.items.forEach((it, idx) => {
        itemsHtml += `<tr><td style="padding:10px; border-bottom:1px solid #eee;">${it.name}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${it.qty}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">฿${N(it.price)}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right; font-weight:bold;">฿${N(it.qty * it.price)}</td></tr>`;
      });
    }
  });

  const printWindow = window.open('', '', 'width=900,height=700');
  printWindow.document.write(`
    <html><head><title>Purchase Order - ${po.id}</title>
    <style>body{font-family:'Prompt', sans-serif; padding:40px; color:#333;} table{width:100%; border-collapse:collapse; margin-top:20px;} th{background:#f8f9fa; padding:12px; text-align:left; border-bottom:2px solid #ddd;}</style>
    </head><body>
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #2563eb; padding-bottom:20px; mb-4;">
        <div><h1 style="color:#2563eb; margin:0;">Asia Hydro</h1><p style="margin:5px 0 0 0; color:#666;">Purchase Order (ใบสั่งซื้อ)</p></div>
        <div style="text-align:right;"><h2 style="margin:0;">No. ${po.id}</h2><p style="margin:5px 0 0 0;">วันที่: ${po.date}</p></div>
      </div>
      <div style="margin-top:30px;"><strong>เรียน Vendor:</strong> ${po.vendor} <br><strong>อ้างอิง PR:</strong> ${po.prIds}</div>
      <table>
        <tr><th>รายละเอียดสินค้า</th><th style="text-align:center;">จำนวน</th><th style="text-align:right;">ราคา/หน่วย</th><th style="text-align:right;">รวมเป็นเงิน</th></tr>
        ${itemsHtml}
      </table>
      <div style="text-align:right; margin-top:30px; font-size:20px;"><strong>ยอดชำระสุทธิ: <span style="color:#2563eb;">฿${N(grandTotal)}</span></strong></div>
      <div style="margin-top:80px; display:flex; justify-content:space-around;">
        <div style="text-align:center; border-top:1px solid #ccc; width:200px; padding-top:10px;">ผู้มีอำนาจลงนาม</div>
        <div style="text-align:center; border-top:1px solid #ccc; width:200px; padding-top:10px;">ผู้ขาย/ผู้รับใบสั่งซื้อ</div>
      </div>
      <script>setTimeout(()=>{ window.print(); window.close(); }, 500);</script>
    </body></html>
  `);
}

function pageTracking() {
  const list = (currentUser.role === 'user') ? prDB.filter(r => r.req === currentUser.name) : prDB;
  return `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up"><table class="min-w-full text-left"><thead class="bg-gray-50 border-b border-gray-100"><tr><th class="p-4 text-sm font-semibold text-gray-500">PR No.</th><th class="p-4 text-sm font-semibold text-gray-500">ข้อมูล</th><th class="p-4 text-right text-sm font-semibold text-gray-500">ยอดรวม</th><th class="p-4 text-center text-sm font-semibold text-gray-500">สถานะ</th></tr></thead><tbody class="divide-y divide-gray-50">
  ${list.reverse().map(r=>`<tr class="hover:bg-gray-50">
      <td class="p-4 font-semibold text-primary-600 flex items-center gap-1">${r.id} ${r.attachment ? `<a href="${r.attachment}" target="_blank" class="text-gray-400 hover:text-primary-600"><i class="ti ti-paperclip"></i></a>` : ''}</td>
      <td class="p-4"><div class="text-sm font-medium text-gray-800">${r.items[0].name} ${r.items.length > 1 ? `(+${r.items.length - 1} รายการ)` : ''}</div><div class="text-xs text-gray-500">${r.date} | ${r.dept} | ${r.req}</div></td>
      <td class="p-4 text-right text-sm font-medium">฿${N(r.total)}</td><td class="p-4 text-center">${sb(r.status)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

// --- [อัปเดต B] ฟังก์ชันหน้า รับของ (GR) เชื่อมหลังบ้าน ---
function pageReceive() { 
  const pendingPOs = poDB.filter(p => p.status === 'issued');
  
  let poListHtml = '';
  if(pendingPOs.length === 0) {
    poListHtml = `<div class="text-center py-8 text-gray-400"><i class="ti ti-check text-4xl mb-2 text-success-300"></i><p>ไม่มีสินค้าค้างรับในระบบ</p></div>`;
  } else {
    poListHtml = `<div class="space-y-3 mt-6 text-left">
      <h3 class="text-sm font-bold text-gray-700 mb-2">รายการ PO รอรับสินค้า:</h3>
      ${pendingPOs.map(po => `
        <div class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div><p class="font-bold text-teal-700">${po.id}</p><p class="text-xs text-gray-500">อ้างอิง: ${po.prIds} | Vendor: ${po.vendor}</p></div>
          <div class="flex gap-2">
            <button onclick="printPO('${po.id}')" class="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition"><i class="ti ti-printer"></i> ดูเอกสาร</button>
            <button onclick="confirmReceive('${po.id}')" class="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition shadow-sm"><i class="ti ti-package"></i> รับของ</button>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  return `<div class="animate-slide-up space-y-6"><div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white flex justify-between items-center relative overflow-hidden"><div class="relative z-10"><h2 class="text-2xl font-bold mb-1 flex items-center gap-2"><i class="ti ti-package"></i> บันทึกรับสินค้า (Goods Receipt)</h2><p class="text-emerald-100 text-sm">ตรวจสอบรายการสินค้าที่นำส่งและรับเข้าคลัง</p></div><i class="ti ti-truck-loading text-8xl absolute -right-4 -bottom-4 text-white/10 -rotate-12"></i></div><div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-10"><div class="inline-flex items-center justify-center w-20 h-20 bg-teal-50 text-teal-500 rounded-full mb-4"><i class="ti ti-barcode text-4xl"></i></div>${poListHtml}</div></div>`; 
}

function confirmReceive(poId) {
  showConfirm('ยืนยันรับสินค้าเข้าคลัง?', `คุณตรวจสอบสินค้าของ ${poId} ครบถ้วนแล้วใช่หรือไม่?`, 'primary', async () => {
    const res = await callAPI({ action: 'receiveGoods', poId: poId }, "กำลังตัดยอดเข้าคลัง...");
    if (res.status === 'success') { toast(res.message, 'success'); await syncData(); go('receive'); } 
    else { toast(res.message, 'error'); }
  });
}

function pageExport() { 
  return `<div class="animate-slide-up space-y-6"><div class="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl shadow-lg p-6 text-white flex justify-between items-center relative overflow-hidden"><div class="relative z-10"><h2 class="text-2xl font-bold mb-1 flex items-center gap-2"><i class="ti ti-report-analytics"></i> Export Report</h2><p class="text-purple-100 text-sm">ดาวน์โหลดรายงานและวิเคราะห์ข้อมูลการสั่งซื้อ</p></div><i class="ti ti-chart-bar text-8xl absolute -right-4 -bottom-4 text-white/10"></i></div><div class="grid grid-cols-1 md:grid-cols-3 gap-6"><div onclick="toast('กำลังสร้างไฟล์ Excel...', 'info')" class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-success-400 cursor-pointer transition group relative overflow-hidden"><div class="w-14 h-14 bg-success-50 text-success-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition"><i class="ti ti-file-spreadsheet text-3xl"></i></div><h3 class="font-bold text-gray-800">รายงานสรุป PR/PO</h3><p class="text-xs text-gray-500 mt-1 mb-4">ข้อมูลรายการทั้งหมด (.xlsx)</p><span class="text-sm font-medium text-success-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">ดาวน์โหลด <i class="ti ti-arrow-right"></i></span></div><div onclick="toast('กำลังสร้างไฟล์ PDF...', 'info')" class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-danger-400 cursor-pointer transition group relative overflow-hidden"><div class="w-14 h-14 bg-danger-50 text-danger-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition"><i class="ti ti-file-type-pdf text-3xl"></i></div><h3 class="font-bold text-gray-800">Budget Report</h3><p class="text-xs text-gray-500 mt-1 mb-4">รายงานสรุปการใช้งบประมาณ (.pdf)</p><span class="text-sm font-medium text-danger-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">ดาวน์โหลด <i class="ti ti-arrow-right"></i></span></div><div onclick="toast('เปิดหน้า Dashboard Analytics', 'success')" class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-400 cursor-pointer transition group relative overflow-hidden"><div class="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition"><i class="ti ti-device-desktop-analytics text-3xl"></i></div><h3 class="font-bold text-gray-800">Spend Analytics</h3><p class="text-xs text-gray-500 mt-1 mb-4">ดูสถิติผ่านหน้ากราฟ</p><span class="text-sm font-medium text-primary-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">เปิดดู <i class="ti ti-arrow-right"></i></span></div></div></div>`; 
}

// --- [อัปเดต C] ดึงข้อมูล Master Data ของจริงมาโชว์ ---
function pageVendors() { 
  if(vendorDB.length === 0) return `<div class="text-center py-10 text-gray-400">ยังไม่มีฐานข้อมูล Vendor</div>`;
  return `<div class="animate-slide-up space-y-6"><div class="flex justify-between items-center"><h2 class="text-xl font-bold text-gray-800 flex items-center gap-2"><i class="ti ti-building-store text-amber-500 text-2xl"></i> ทะเบียนผู้ขาย (Vendor Master)</h2><button onclick="toast('สามารถเพิ่มใน Google Sheets ได้เลย', 'info')" class="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-700 transition"><i class="ti ti-plus"></i> เพิ่มผู้ขาย</button></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">${vendorDB.map(v => `<div class="bg-white border border-gray-100 shadow-sm p-5 rounded-2xl hover:border-amber-300 transition group"><div class="flex justify-between items-start mb-4"><div class="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-110 transition">${v.name[0]}</div><span class="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-md font-bold border border-amber-100"><i class="ti ti-star-filled text-amber-400"></i> ${v.score}</span></div><h3 class="font-bold text-gray-800 text-base truncate" title="${v.name}">${v.name}</h3><p class="text-xs text-gray-500 mt-1">หมวดหมู่: <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">${v.cat}</span></p><div class="mt-4 pt-4 border-t border-gray-50 flex justify-between items-end"><div><p class="text-[10px] text-gray-400 uppercase font-semibold">ยอดสั่งซื้อสะสม</p><p class="font-bold text-gray-800">฿ ${N(v.spend)}</p></div><span class="text-[10px] text-success-600 bg-success-50 px-2 py-1 rounded-full font-medium">Active</span></div></div>`).join('')}</div></div>`; 
}

function pageBudget() { 
  if(budgetDB.length === 0) return `<div class="text-center py-10 text-gray-400">ยังไม่มีฐานข้อมูล Budget</div>`;
  return `<div class="animate-slide-up space-y-6"><div class="flex justify-between items-center"><h2 class="text-xl font-bold text-gray-800 flex items-center gap-2"><i class="ti ti-chart-pie text-rose-500 text-2xl"></i> ควบคุมงบประมาณ (Budget)</h2></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6">${budgetDB.map(b => { const pct = Math.round((b.used/b.budget)*100); const isDanger = pct > 80; const colStart = isDanger ? 'from-red-500' : 'from-emerald-400'; const colEnd = isDanger ? 'to-rose-600' : 'to-teal-500'; const bgCol = isDanger ? 'bg-red-50' : 'bg-emerald-50'; return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div class="flex justify-between items-start mb-4"><div class="flex items-center gap-3"><div class="w-10 h-10 ${bgCol} rounded-xl flex items-center justify-center"><i class="ti ti-briefcase ${isDanger ? 'text-red-500' : 'text-emerald-500'} text-xl"></i></div><div><h3 class="font-bold text-gray-800">แผนก ${b.dept}</h3><p class="text-xs text-gray-500">ข้อมูลจากระบบจริง</p></div></div><span class="text-xl font-black ${isDanger ? 'text-red-600' : 'text-emerald-600'}">${pct}%</span></div><div class="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden shadow-inner"><div class="bg-gradient-to-r ${colStart} ${colEnd} h-3 rounded-full transition-all duration-1000" style="width: ${pct}%"></div></div><div class="flex justify-between text-sm font-medium"><span class="text-gray-500">ใช้ไปแล้ว: <span class="text-gray-800">฿${N(b.used)}</span></span><span class="text-gray-500">ทั้งหมด: <span class="text-gray-800">฿${N(b.budget)}</span></span></div></div>`}).join('')}</div></div>`; 
}

function pageCatalog() { 
  if(catalogDB.length === 0) return `<div class="text-center py-10 text-gray-400">ยังไม่มีฐานข้อมูลสินค้า</div>`;
  return `<div class="animate-slide-up space-y-6"><div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"><div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h2 class="text-lg font-bold text-gray-800 flex items-center gap-2"><i class="ti ti-search text-cyan-600"></i> ค้นหาสินค้า (Catalog)</h2><div class="relative"><input type="text" placeholder="ค้นหารหัส หรือ ชื่อสินค้า..." class="bg-white border border-gray-200 text-sm rounded-lg pl-10 pr-4 py-2 outline-none focus:border-cyan-500 shadow-sm w-64"><i class="ti ti-search absolute left-3 top-2.5 text-gray-400"></i></div></div><div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead class="bg-gray-50 text-gray-500 font-semibold uppercase text-xs"><tr><th class="p-4 w-24">รหัส</th><th class="p-4">ชื่อสินค้า</th><th class="p-4 w-32">หมวดหมู่</th><th class="p-4 text-right w-32">ราคา (฿)</th><th class="p-4 text-center w-32">คงเหลือ</th><th class="p-4 text-center w-20">จัดการ</th></tr></thead><tbody class="divide-y divide-gray-100">${catalogDB.map(c => `<tr class="hover:bg-cyan-50/30 transition group"><td class="p-4 font-bold text-cyan-700">${c.code}</td><td class="p-4 font-medium text-gray-800">${c.name}</td><td class="p-4"><span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[11px]">${c.cat}</span></td><td class="p-4 text-right font-medium text-gray-700">${N(c.price)}</td><td class="p-4 text-center"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${c.stock > 10 ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}">${c.stock} ชิ้น</span></td><td class="p-4 text-center"><button onclick="toast('ให้ผู้ดูแลเพิ่มลง PR จาก Google Sheets', 'info')" class="text-gray-400 hover:text-cyan-600 transition p-1.5 rounded bg-gray-50 hover:bg-cyan-100" title="เพิ่มลงรายการขอซื้อ"><i class="ti ti-shopping-cart-plus text-lg"></i></button></td></tr>`).join('')}</tbody></table></div></div></div>`; 
}

function pageSettings() {
  return `<div class="max-w-5xl space-y-6 animate-slide-up"><div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="ti ti-settings text-primary-600"></i> ตั้งค่าระบบ</h3>
    <div onclick="generateMockData()" class="bg-white p-6 rounded-xl border border-gray-100 hover:border-primary-300 transition cursor-pointer flex items-center gap-4 w-fit"><div class="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center"><i class="ti ti-database text-2xl"></i></div><div><h4 class="font-bold text-gray-800 text-sm">รีเซ็ต Database</h4><p class="text-xs text-gray-500">รีเซ็ตและสร้างตารางพื้นฐานใหม่</p></div></div></div></div>`;
}

async function generateMockData() {
  showConfirm('รีเซ็ตฐานข้อมูล?', 'ระบบจะลบข้อมูลทั้งหมดและสร้าง Mock Data ใหม่ แน่ใจหรือไม่?', 'danger', async () => {
    const res = await callAPI({ action: 'initMockData' }, "สร้างข้อมูลจำลอง...");
    if (res.status === 'success') { toast(res.message, 'success'); setTimeout(() => { localStorage.removeItem('currentUser'); location.reload(); }, 1500); }
    else { toast(res.message, 'error'); }
  });
}

// 🚀 Boot System
if (API_URL.includes("วาง_WEB_APP_URL")) { 
  alert("⚠️ กรุณาตั้งค่า API_URL ในไฟล์ script.js บรรทัดที่ 20 ก่อนใช้งาน"); 
} else { 
  checkAuth(); 
}
