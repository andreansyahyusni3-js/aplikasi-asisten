window.PRODUCT_LIST = [
  "CNNX SKT", "CNNX B SKT", "HD SKT", "MCB SKT", "MCM SKT", 
  "MCG SKT", "PBB SKT", "PBM SKT", "PBW SKT", "MCB SKM", "MCM SKM", "PBB SKM", "PBM SKM"
];

window.GEMINI_API_KEY = "AQ.Ab8RN6JC1ZN9BiBuVTNlUiFiK675gBDtuww4onWjmUfUK4T-nA";

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

  ['stok', 'omzet', 'laporan', 'ringkasan', 'pbuc', 'kendaraan'].forEach(t => {
    const deskBtn = document.getElementById(`nav-desk-${t}`);
    const mobBtn = document.getElementById(`nav-mob-${t}`);
    if (deskBtn && mobBtn) {
      if (t === tabName) {
        deskBtn.className = "w-full p-3 rounded-xl font-medium text-xs flex justify-center items-center bg-red-600 text-white shadow-lg";
        mobBtn.className = "text-red-500 p-1";
      } else {
        deskBtn.className = "w-full p-3 rounded-xl font-medium text-xs flex justify-center items-center text-slate-400 hover:bg-slate-800 hover:text-white";
        mobBtn.className = "text-slate-400 p-1";
      }
    }
  });

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

  let grandOut = 0;
  let grandRemaining = 0;

  tbody.innerHTML = window.PRODUCT_LIST.map((sku, idx) => {
    const initial = window.stockData[sku] ? (window.stockData[sku].initial || 0) : 0;
    const added = window.stockData[sku] ? (window.stockData[sku].added || 0) : 0;

    let out = 0;
    (window.transactions || []).forEach(t => {
      (t.items || []).forEach(i => {
        if (i.product === sku) out += (i.qty || 0);
      });
    });

    const remaining = (initial + added) - out;
    grandOut += out;
    grandRemaining += remaining;

    return `
      <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
        <td class="p-3 border text-center font-medium">${idx + 1}</td>
        <td class="p-3 border font-bold text-slate-800">${sku}</td>
        <td class="p-2 border text-center bg-blue-50/50">
          <input type="number" id="input-stock-initial-${sku}" value="${initial}" class="w-20 text-center px-2 py-1 text-xs border rounded-lg bg-white font-bold">
        </td>
        <td class="p-3 border text-right font-medium text-blue-600">${added > 0 ? '+' + added : added} Bks</td>
        <td class="p-3 border text-right font-medium text-amber-600">${out} Bks</td>
        <td class="p-3 border text-right font-bold ${remaining < 0 ? 'text-red-600' : 'text-slate-900'}">${remaining} Bks</td>
      </tr>
    `;
  }).join('');

  const statOut = document.getElementById('stat-stock-out');
  const statRem = document.getElementById('stat-stock-remaining');
  if (statOut) statOut.textContent = `${grandOut} Bungkus`;
  if (statRem) statRem.textContent = `${grandRemaining} Bungkus`;
}

function saveStockInputs() {
  window.PRODUCT_LIST.forEach(sku => {
    const inputEl = document.getElementById(`input-stock-initial-${sku}`);
    if (inputEl) {
      const val = parseInt(inputEl.value, 10) || 0;
      if (!window.stockData[sku]) window.stockData[sku] = { initial: 0, added: 0 };
      window.stockData[sku].initial = val;
    }
  });

  if (typeof window.syncStockToCloud === 'function') {
    window.syncStockToCloud(window.stockData);
  }
  renderStockTable();
  alert("Stok Awal Berhasil Diperbarui!");
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
  const countLabel = document.getElementById('cart-count');
  if (!container || !countLabel) return;

  countLabel.textContent = `${window.cart.length} Item`;

  if (window.cart.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada barang dipilih</p>`;
    return;
  }

  container.innerHTML = window.cart.map(item => `
    <div class="flex justify-between items-center bg-white p-2.5 rounded-lg border text-xs">
      <span class="font-bold text-slate-800">${item.product}</span>
      <span class="font-semibold text-slate-600">${item.qty} Bungkus</span>
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
    container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">Belum ada transaksiRecorded</div>`;
    return;
  }

  container.innerHTML = window.transactions.map(t => `
    <div class="bg-slate-50 p-4 rounded-xl border border-amber-200 space-y-2">
      <h4 class="font-bold text-slate-900 text-sm">${t.toko}</h4>
      <div class="bg-white p-2.5 rounded-lg border text-xs">
        ${(t.items || []).map(i => `<div class="flex justify-between"><span>${i.product}</span><b>${i.qty} Bks</b></div>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderDailySummaryTable() {
  const tbody = document.getElementById('summary-daily-tbody');
  if (!tbody || !window.PRODUCT_LIST) return;

  tbody.innerHTML = window.PRODUCT_LIST.map((sku, idx) => {
    let totalOut = 0;
    (window.transactions || []).forEach(t => {
      (t.items || []).forEach(i => {
        if (i.product === sku) totalOut += (i.qty || 0);
      });
    });

    return `
      <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
        <td class="p-3 border text-center font-medium">${idx + 1}</td>
        <td class="p-3 border font-bold text-slate-800">${sku}</td>
        <td class="p-3 border text-right font-bold text-amber-600">${totalOut} Bks</td>
      </tr>
    `;
  }).join('');
}

function renderPbucTable() {
  const tbody = document.getElementById('pbuc-table-body');
  if (!tbody || !window.PRODUCT_LIST) return;

  tbody.innerHTML = window.PRODUCT_LIST.map((sku, idx) => {
    const initial = window.stockData[sku] ? (window.stockData[sku].initial || 0) : 0;
    const added = window.stockData[sku] ? (window.stockData[sku].added || 0) : 0;

    let out = 0;
    (window.transactions || []).forEach(t => {
      (t.items || []).forEach(i => {
        if (i.product === sku) out += (i.qty || 0);
      });
    });

    const appStock = (initial + added) - out;
    const pbucVal = window.pbucData[sku] || 0;
    const diff = appStock - pbucVal;

    return `
      <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
        <td class="p-3 border text-center font-medium">${idx + 1}</td>
        <td class="p-3 border font-bold text-slate-800">${sku}</td>
        <td class="p-3 border text-right font-bold">${appStock} Bks</td>
        <td class="p-2 border text-center bg-purple-50/50">
          <input type="number" value="${pbucVal}" onchange="window.pbucData['${sku}'] = parseInt(this.value, 10) || 0" class="w-24 text-center px-2 py-1 text-xs border rounded-lg bg-white font-bold">
        </td>
        <td class="p-3 border text-right font-bold ${diff !== 0 ? 'text-rose-600' : 'text-emerald-600'}">${diff} Bks</td>
      </tr>
    `;
  }).join('');
}

function saveKmLog() {
  const kmAwal = parseInt(document.getElementById('input-km-awal').value, 10) || 0;
  const kmAkhir = parseInt(document.getElementById('input-km-akhir').value, 10) || 0;
  if (kmAkhir <= kmAwal) return alert("KM Akhir harus lebih besar!");

  const newKm = {
    id: window.generateUniqueId(),
    kmAwal: kmAwal,
    kmAkhir: kmAkhir,
    jarak: kmAkhir - kmAwal,
    date: new Date().toLocaleDateString('id-ID')
  };

  window.kmLogs.unshift(newKm);
  document.getElementById('input-km-awal').value = '';
  document.getElementById('input-km-akhir').value = '';

  if (typeof window.syncKmToCloud === 'function') window.syncKmToCloud(newKm);
  renderKmTable();
}

function saveBbmLog() {
  const kmVal = parseInt(document.getElementById('input-bbm-km').value, 10) || 0;
  const literVal = parseFloat(document.getElementById('input-bbm-liter').value) || 0;
  if (kmVal <= 0 || literVal <= 0) return alert("Isi data BBM dengan benar!");

  alert("Log Pengisian BBM Disimpan!");
  document.getElementById('input-bbm-km').value = '';
  document.getElementById('input-bbm-liter').value = '';
}

function renderKmTable() {
  const tbody = document.getElementById('km-table-body');
  if (!tbody) return;
  if (window.kmLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Belum ada log KM</td></tr>`;
    return;
  }
  tbody.innerHTML = window.kmLogs.map(k => `
    <tr>
      <td class="p-2.5 border">${k.date}</td>
      <td class="p-2.5 border text-right">${k.kmAwal} KM</td>
      <td class="p-2.5 border text-right">${k.kmAkhir} KM</td>
      <td class="p-2.5 border text-right font-bold text-blue-600">${k.jarak} KM</td>
    </tr>
  `).join('');
}

async function scanNotaWithAI(event) {
  const file = event.target.files[0];
  if (!file) return;

  const apiKey = window.GEMINI_API_KEY;
  const statusEl = document.getElementById('ai-scan-status');
  statusEl.classList.remove('hidden');

  try {
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });

    const promptText = `
      Kamu adalah sistem OCR AI. Baca foto nota penjualan ini.
      Daftar SKU produk yang valid hanyalah: ${JSON.stringify(window.PRODUCT_LIST)}.
      Kembalikan HANYA JSON: { "toko": "Nama Toko", "items": [ {"product": "NAMA_SKU_EXACT", "qty": 10} ] }
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inlineData: { mimeType: file.type, data: base64Image } }
          ]
        }]
      })
    });

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    if (result.toko) document.getElementById('input-toko').value = result.toko;
    if (result.items && Array.isArray(result.items)) {
      result.items.forEach(parsedItem => {
        const validSku = window.PRODUCT_LIST.find(s => s.toLowerCase() === parsedItem.product.toLowerCase());
        if (validSku && parsedItem.qty > 0) {
          const existingIdx = window.cart.findIndex(i => i.product === validSku);
          if (existingIdx > -1) {
            window.cart[existingIdx].qty += parsedItem.qty;
          } else {
            window.cart.push({ product: validSku, qty: parsedItem.qty });
          }
        }
      });
    }
    renderCartUI();
    statusEl.textContent = "✅ Berhasil! Form terisi otomatis.";
  } catch (err) {
    statusEl.textContent = "❌ Gagal membaca nota. Silakan input manual.";
  } finally {
    event.target.value = '';
  }
}

function renderAllViews() {
  initProductDropdown();
  renderCartUI();
  renderTransactions();
  renderStockTable();
  renderDailySummaryTable();
  renderPbucTable();
  renderKmTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAllViews();
});
