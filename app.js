window.PRODUCT_LIST = [
  "CNNX SKT", "CNNX B SKT", "HD SKT", "MCB SKT", "MCM SKT", 
  "MCG SKT", "PBB SKT", "PBM SKT", "PBW SKT", "MCB SKM", "MCM SKM", "PBB SKM", "PBM SKM"
];

window.cart = [];
window.stockData = {};
window.transactions = [];
window.generatedReports = [];
window.pbucData = {};
window.kmLogs = [];

window.generateUniqueId = () => Date.now().toString() + '_' + Math.random().toString(36).substr(2, 7);

function openResetModal() { document.getElementById('modal-reset-db').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function switchTab(tabName) {
  ['stok', 'omzet', 'laporan', 'ringkasan', 'pbuc', 'kendaraan'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function initProductDropdown() {
  const select = document.getElementById('select-produk');
  if (select && window.PRODUCT_LIST) {
    select.innerHTML = window.PRODUCT_LIST.map(item => `<option value="${item}">${item}</option>`).join('');
  }
}

function renderStockTable() {
  const tbody = document.getElementById('stock-table-body');
  if (!tbody || !window.PRODUCT_LIST) return;

  tbody.innerHTML = window.PRODUCT_LIST.map((sku, idx) => {
    const initial = window.stockData[sku] ? (window.stockData[sku].initial || 0) : 0;
    const added = window.stockData[sku] ? (window.stockData[sku].added || 0) : 0;
    let out = 0;
    (window.transactions || []).forEach(t => {
      (t.items || []).forEach(i => { if (i.product === sku) out += (i.qty || 0); });
    });
    const remaining = (initial + added) - out;

    return `
      <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
        <td class="p-3 border text-center font-medium">${idx + 1}</td>
        <td class="p-3 border font-bold text-slate-800">${sku}</td>
        <td class="p-3 border text-right font-medium">${initial} Bks</td>
        <td class="p-3 border text-right font-medium text-amber-600">${out} Bks</td>
        <td class="p-3 border text-right font-bold ${remaining < 0 ? 'text-red-600' : 'text-slate-900'}">${remaining} Bks</td>
      </tr>
    `;
  }).join('');
}

function addToCart() {
  const product = document.getElementById('select-produk').value;
  const qtyInput = document.getElementById('input-jumlah');
  const qty = parseInt(qtyInput.value, 10);
  if (!qty || qty <= 0) return;

  const existingIdx = window.cart.findIndex(i => i.product === product);
  if (existingIdx > -1) {
    window.cart[existingIdx].qty += qty;
  } else {
    window.cart.push({ product: product, qty: qty });
  }
  qtyInput.value = '';
  renderCartUI();
}

function renderCartUI() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;
  if (window.cart.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-2">Belum ada item</p>`;
    return;
  }
  container.innerHTML = window.cart.map(item => `
    <div class="flex justify-between items-center text-xs">
      <span class="font-bold text-slate-800">${item.product}</span>
      <span class="font-semibold text-slate-600">${item.qty} Bks</span>
    </div>
  `).join('');
}

function saveTransaction() {
  const tokoName = document.getElementById('input-toko').value.trim();
  if (!tokoName || window.cart.length === 0) return;

  const newTx = {
    id: window.generateUniqueId(),
    toko: tokoName,
    items: [...window.cart],
    createdAt: new Date().toLocaleDateString('id-ID')
  };

  window.transactions.unshift(newTx);
  document.getElementById('input-toko').value = '';
  window.cart = [];

  renderCartUI();
  if (typeof window.syncTxToCloud === 'function') window.syncTxToCloud(newTx);
  renderTransactions();
  renderStockTable();
}

function renderTransactions() {
  const container = document.getElementById('tx-list-container');
  if (!container) return;
  if (window.transactions.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400">Belum ada transaksi</div>`;
    return;
  }
  container.innerHTML = window.transactions.map(t => `
    <div class="bg-slate-50 p-3 rounded-xl border space-y-1">
      <h4 class="font-bold text-xs text-slate-900">${t.toko}</h4>
      <div class="text-[11px] text-slate-600">
        ${(t.items || []).map(i => `<div>${i.product}: ${i.qty} Bks</div>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderAllViews() {
  initProductDropdown();
  renderCartUI();
  renderTransactions();
  renderStockTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAllViews();
});
