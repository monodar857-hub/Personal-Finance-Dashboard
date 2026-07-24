// ═══════════════════════════════════════════════════════
//  pages/income.js
//  Halaman Pemasukan — catat, lihat, edit, hapus income.
//
//  Fitur:
//   - Tabel semua data income (sort terbaru dulu)
//   - Filter by bulan & tahun
//   - Form tambah income (via modal)
//   - Edit income (via modal pre-filled)
//   - Hapus income (konfirmasi)
//   - Total income bulan terpilih di header
//   - Export data ke CSV
//
//  Lifecycle:
//   init()    → dipanggil router saat navigasi ke income
//   destroy() → cleanup event listeners
// ═══════════════════════════════════════════════════════

import {
  getIncomes,
  getIncomesByMonth,
  addIncome,
  updateIncome,
  deleteIncome,
} from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let allIncomes   = [];       // cache data income
let filterMonth  = new Date().getMonth() + 1;
let filterYear   = new Date().getFullYear();
let editingId    = null;     // id income yang sedang diedit

// ── Daftar sumber income (untuk suggestions) ──────────
const INCOME_SOURCES = [
  "Uang Saku", "Gaji", "Freelance", "Bonus",
  "Investasi", "Bisnis", "Transfer", "Lainnya",
];

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-income");
  if (!container) return;

  container.innerHTML = renderPage();
  bindFilterEvents();
  await loadIncomes();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  allIncomes  = [];
  editingId   = null;
}

// ═══════════════════════════════════════════════════════
//  RENDER: STRUKTUR HALAMAN
// ═══════════════════════════════════════════════════════
function renderPage() {
  const now    = new Date();
  const months = buildMonthOptions(filterMonth);
  const years  = buildYearOptions(filterYear);

  return `
  <!-- ── Header ───────────────────────────────── -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;
              flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <h2 style="font-family:'Syne',sans-serif;font-size:1.25rem;font-weight:800;
                 color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:4px;">
        Pemasukan
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Catat dan pantau semua sumber pemasukanmu.
      </p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="incomeExportCSV()"
        style="display:flex;align-items:center;gap:7px;padding:9px 16px;
               background:var(--surface-card);border:1px solid var(--border);border-radius:9px;
               color:var(--text-secondary);font-family:'DM Sans',sans-serif;font-size:0.84rem;
               font-weight:500;cursor:pointer;transition:all .2s;"
        onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--text-primary)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export CSV
      </button>
      <button onclick="incomeOpenAdd()"
        style="display:flex;align-items:center;gap:7px;padding:9px 18px;
               background:linear-gradient(135deg,var(--success),#059669);border:none;border-radius:9px;
               color:white;font-family:'DM Sans',sans-serif;font-size:0.84rem;font-weight:600;
               cursor:pointer;box-shadow:0 4px 14px rgba(52,211,153,0.3);transition:all .2s;"
        onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(52,211,153,0.45)'"
        onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 14px rgba(52,211,153,0.3)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tambah Pemasukan
      </button>
    </div>
  </div>

  <!-- ── Summary Card + Filter ─────────────────── -->
  <div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;margin-bottom:20px;" id="income-top-row">

    <!-- Summary Card -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;" id="income-summary-cards">
      <!-- Diisi oleh renderSummaryCards() -->
    </div>

    <!-- Filter Panel -->
    <div class="card" style="padding:16px 18px;min-width:220px;">
      <div class="card-title" style="margin-bottom:12px;">Filter Periode</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <select id="income-filter-month"
          style="width:100%;background:var(--surface-el);border:1.5px solid var(--border);
                 border-radius:8px;padding:8px 10px;color:var(--text-primary);
                 font-family:'DM Sans',sans-serif;font-size:0.84rem;outline:none;cursor:pointer;">
          ${months}
        </select>
        <select id="income-filter-year"
          style="width:100%;background:var(--surface-el);border:1.5px solid var(--border);
                 border-radius:8px;padding:8px 10px;color:var(--text-primary);
                 font-family:'DM Sans',sans-serif;font-size:0.84rem;outline:none;cursor:pointer;">
          ${years}
        </select>
        <button onclick="incomeApplyFilter()"
          style="padding:8px;background:var(--primary);border:none;border-radius:8px;
                 color:white;font-family:'DM Sans',sans-serif;font-size:0.84rem;
                 font-weight:600;cursor:pointer;">
          Terapkan
        </button>
      </div>
    </div>

  </div>

  <!-- ── Tabel Income ──────────────────────────── -->
  <div class="card" style="padding:0;overflow:hidden;">

    <!-- Table Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:16px 20px;border-bottom:1px solid var(--border);">
      <div style="font-family:'Syne',sans-serif;font-size:0.88rem;font-weight:700;
                  color:var(--text-primary);" id="income-table-title">
        Semua Pemasukan
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <!-- Search -->
        <div style="position:relative;">
          <input type="text" id="income-search" placeholder="Cari sumber..."
            oninput="incomeSearch(this.value)"
            style="background:var(--surface-el);border:1.5px solid var(--border);border-radius:8px;
                   padding:7px 12px 7px 32px;color:var(--text-primary);font-family:'DM Sans',sans-serif;
                   font-size:0.82rem;outline:none;width:180px;transition:all .2s;"
            onfocus="this.style.borderColor='var(--primary)'"
            onblur="this.style.borderColor='var(--border)'"/>
          <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
        <span id="income-count"
          style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;"></span>
      </div>
    </div>

    <!-- Table Body -->
    <div id="income-table-body" style="overflow-x:auto;">
      <!-- Diisi oleh renderTable() -->
    </div>

  </div>

  <!-- Responsive -->
  <style>
    @media (max-width: 768px) {
      #income-top-row { grid-template-columns: 1fr !important; }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadIncomes() {
  setTableLoading(true);
  try {
    allIncomes = await getIncomesByMonth(filterMonth, filterYear);
    renderSummaryCards();
    renderTable(allIncomes);
    updateTableTitle();
  } catch (err) {
    console.error("Load incomes error:", err);
    window.showToast("Gagal memuat data pemasukan.", "error");
    renderTableError();
  } finally {
    setTableLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: SUMMARY CARDS
// ═══════════════════════════════════════════════════════
function renderSummaryCards() {
  const el = document.getElementById("income-summary-cards");
  if (!el) return;

  const total   = allIncomes.reduce((s, i) => s + i.amount, 0);
  const count   = allIncomes.length;
  const avg     = count > 0 ? total / count : 0;
  const highest = count > 0 ? Math.max(...allIncomes.map(i => i.amount)) : 0;

  el.innerHTML = `
    <div class="card" style="border-color:rgba(52,211,153,0.25);
         background:linear-gradient(135deg,rgba(52,211,153,0.07),transparent);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="card-title" style="margin-bottom:0;">Total Bulan Ini</span>
        <div class="stat-icon si-success" style="width:34px;height:34px;border-radius:9px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                  color:var(--success);letter-spacing:-0.02em;">
        ${window.formatRupiah(total)}
      </div>
    </div>

    <div class="card">
      <div style="margin-bottom:8px;">
        <span class="card-title" style="margin-bottom:0;">Jumlah Transaksi</span>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                  color:var(--text-primary);letter-spacing:-0.02em;">
        ${count} <span style="font-size:0.85rem;font-family:'DM Sans',sans-serif;
                             color:var(--text-muted);font-weight:400;">transaksi</span>
      </div>
    </div>

    <div class="card">
      <div style="margin-bottom:8px;">
        <span class="card-title" style="margin-bottom:0;">Tertinggi</span>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                  color:var(--warning);letter-spacing:-0.02em;">
        ${window.formatRupiah(highest)}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: TABEL
// ═══════════════════════════════════════════════════════
function renderTable(data) {
  const el = document.getElementById("income-table-body");
  if (!el) return;

  // Update count
  const countEl = document.getElementById("income-count");
  if (countEl) countEl.textContent = `${data.length} data`;

  if (data.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:48px 24px;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <h3>Belum Ada Pemasukan</h3>
        <p style="margin-bottom:16px;">Belum ada pemasukan di periode ini.</p>
        <button onclick="incomeOpenAdd()"
          style="padding:8px 20px;background:linear-gradient(135deg,var(--success),#059669);
                 border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
                 font-size:0.84rem;font-weight:600;cursor:pointer;">
          + Tambah Sekarang
        </button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Sumber</th>
          <th>Jumlah</th>
          <th>Catatan</th>
          <th style="text-align:center;">Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => renderTableRow(item)).join("")}
      </tbody>
    </table>`;
}

function renderTableRow(item) {
  const dateDisp = formatDateDisplay(item.date);
  const note     = item.note ? item.note : `<span style="color:var(--text-muted);font-style:italic;">—</span>`;
  const sourceColor = getSourceColor(item.source);

  return `
    <tr id="income-row-${item.id}">
      <td>
        <span style="font-size:0.82rem;color:var(--text-muted);">${dateDisp}</span>
      </td>
      <td>
        <span class="chip" style="background:${sourceColor.bg};color:${sourceColor.text};font-size:0.78rem;">
          ${item.source}
        </span>
      </td>
      <td>
        <span style="font-family:'Syne',sans-serif;font-weight:700;color:var(--success);font-size:0.9rem;">
          +${window.formatRupiah(item.amount)}
        </span>
      </td>
      <td style="max-width:200px;">
        <span style="font-size:0.82rem;white-space:nowrap;overflow:hidden;
                     text-overflow:ellipsis;display:block;max-width:180px;">
          ${note}
        </span>
      </td>
      <td>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
          <button class="action-btn edit" title="Edit"
            onclick="incomeOpenEdit('${item.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-btn del" title="Hapus"
            onclick="incomeConfirmDelete('${item.id}','${escapeStr(item.source)}',${item.amount})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`;
}

// ═══════════════════════════════════════════════════════
//  MODAL: TAMBAH / EDIT INCOME
// ═══════════════════════════════════════════════════════
function incomeOpenAdd() {
  editingId = null;
  const today = new Date().toISOString().split("T")[0];

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Pemasukan
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderIncomeForm({ date: today })}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="incomeSave()"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--success),#059669);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(52,211,153,0.3);" id="income-save-btn">
        Simpan Pemasukan
      </button>
    </div>`);
}

function incomeOpenEdit(id) {
  const item = allIncomes.find(i => i.id === id);
  if (!item) return;

  editingId = id;

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit Pemasukan
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderIncomeForm(item)}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="incomeSave()"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);" id="income-save-btn">
        Simpan Perubahan
      </button>
    </div>`);
}

function renderIncomeForm(data = {}) {
  const sourceOptions = INCOME_SOURCES.map(s =>
    `<option value="${s}" ${data.source === s ? "selected" : ""}>${s}</option>`
  ).join("");

  return `
    <div class="form-group">
      <label class="form-label">Tanggal</label>
      <input type="date" id="f-income-date" class="form-input"
        value="${data.date || ""}" max="${new Date().toISOString().split("T")[0]}" />
    </div>
    <div class="form-group">
      <label class="form-label">Sumber Pemasukan</label>
      <select id="f-income-source" class="form-input"
        style="cursor:pointer;" onchange="incomeToggleCustomSource(this.value)">
        ${sourceOptions}
        <option value="__custom__" ${!INCOME_SOURCES.includes(data.source) && data.source ? "selected" : ""}>
          Kustom...
        </option>
      </select>
    </div>
    <div class="form-group" id="f-income-custom-wrap"
      style="display:${!INCOME_SOURCES.includes(data.source) && data.source ? "block" : "none"};">
      <label class="form-label">Nama Sumber Kustom</label>
      <input type="text" id="f-income-custom" class="form-input"
        placeholder="Contoh: Jual barang online"
        value="${!INCOME_SOURCES.includes(data.source) && data.source ? data.source : ""}" />
    </div>
    <div class="form-group">
      <label class="form-label">Jumlah (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-income-amount" class="form-input"
          style="padding-left:36px;" placeholder="0"
          value="${data.amount || ""}" min="1" />
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span></label>
      <input type="text" id="f-income-note" class="form-input"
        placeholder="Tambahkan catatan..."
        value="${data.note || ""}" maxlength="200" />
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  SAVE (Tambah / Edit)
// ═══════════════════════════════════════════════════════
async function incomeSave() {
  const date   = document.getElementById("f-income-date")?.value;
  const srcSel = document.getElementById("f-income-source")?.value;
  const source = srcSel === "__custom__"
    ? (document.getElementById("f-income-custom")?.value?.trim() || "")
    : srcSel;
  const amount = parseFloat(document.getElementById("f-income-amount")?.value);
  const note   = document.getElementById("f-income-note")?.value?.trim() || "";

  // Validasi
  if (!date)          { window.showToast("Tanggal wajib diisi.", "error"); return; }
  if (!source)        { window.showToast("Sumber pemasukan wajib diisi.", "error"); return; }
  if (!amount || amount <= 0) { window.showToast("Jumlah harus lebih dari 0.", "error"); return; }

  const btn = document.getElementById("income-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    if (editingId) {
      await updateIncome(editingId, { date, source, amount, note });
      window.showToast("Pemasukan berhasil diperbarui! ✏️", "success");
    } else {
      await addIncome({ date, source, amount, note });
      window.showToast("Pemasukan berhasil ditambahkan! 💰", "success");
    }

    window.closeModal();
    await loadIncomes(); // refresh tabel

  } catch (err) {
    console.error("Save income error:", err);
    window.showToast("Gagal menyimpan. Coba lagi.", "error");
    if (btn) { btn.disabled = false; btn.innerHTML = editingId ? "Simpan Perubahan" : "Simpan Pemasukan"; }
  }
}

// ═══════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════
function incomeConfirmDelete(id, source, amount) {
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Pemasukan
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);
                border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <div style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:4px;">
        Kamu akan menghapus:
      </div>
      <div style="font-weight:600;color:var(--text-primary);font-size:0.95rem;">${source}</div>
      <div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
                  color:var(--danger);margin-top:4px;">
        +${window.formatRupiah(amount)}
      </div>
    </div>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-bottom:20px;">
      Data yang dihapus tidak bisa dikembalikan.
    </p>
    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="incomeDelete('${id}')"
        style="flex:1;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Ya, Hapus
      </button>
    </div>`);
}

async function incomeDelete(id) {
  try {
    await deleteIncome(id);
    window.closeModal();
    window.showToast("Pemasukan berhasil dihapus.", "info");
    await loadIncomes();
  } catch (err) {
    console.error("Delete income error:", err);
    window.showToast("Gagal menghapus. Coba lagi.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  FILTER
// ═══════════════════════════════════════════════════════
function bindFilterEvents() {
  // Filter langsung saat ganti bulan/tahun
  setTimeout(() => {
    const mEl = document.getElementById("income-filter-month");
    const yEl = document.getElementById("income-filter-year");
    if (mEl) mEl.value = filterMonth;
    if (yEl) yEl.value = filterYear;
  }, 0);
}

function incomeApplyFilter() {
  const m = parseInt(document.getElementById("income-filter-month")?.value);
  const y = parseInt(document.getElementById("income-filter-year")?.value);
  if (m) filterMonth = m;
  if (y) filterYear  = y;
  loadIncomes();
}

function updateTableTitle() {
  const el = document.getElementById("income-table-title");
  if (!el) return;
  const monthName = new Date(filterYear, filterMonth - 1).toLocaleDateString("id-ID", {
    month: "long", year: "numeric",
  });
  el.textContent = `Pemasukan — ${monthName}`;
}

// ═══════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════
function incomeSearch(query) {
  const q       = query.toLowerCase().trim();
  const filtered = q
    ? allIncomes.filter(i =>
        i.source.toLowerCase().includes(q) ||
        (i.note && i.note.toLowerCase().includes(q))
      )
    : allIncomes;
  renderTable(filtered);
}

// ═══════════════════════════════════════════════════════
//  EXPORT CSV
// ═══════════════════════════════════════════════════════
function incomeExportCSV() {
  if (allIncomes.length === 0) {
    window.showToast("Tidak ada data untuk diekspor.", "error");
    return;
  }

  const headers = ["Tanggal", "Sumber", "Jumlah (Rp)", "Catatan"];
  const rows    = allIncomes.map(i => [
    i.date,
    `"${i.source}"`,
    i.amount,
    `"${(i.note || "").replace(/"/g, '""')}"`,
  ]);

  const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");

  const monthName = new Date(filterYear, filterMonth - 1)
    .toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    .replace(" ", "-");

  a.href     = url;
  a.download = `pemasukan-${monthName}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  window.showToast(`${allIncomes.length} data berhasil diekspor! 📥`, "success");
}

// ═══════════════════════════════════════════════════════
//  HELPER: Loading state tabel
// ═══════════════════════════════════════════════════════
function setTableLoading(loading) {
  const el = document.getElementById("income-table-body");
  if (!el || !loading) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;
                padding:48px;color:var(--text-muted);font-size:0.85rem;">
      <div class="spinner" style="border-color:rgba(52,211,153,0.2);border-top-color:var(--success);"></div>
      Memuat data...
    </div>`;
}

function renderTableError() {
  const el = document.getElementById("income-table-body");
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state" style="padding:40px;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3 style="color:var(--danger);">Gagal Memuat Data</h3>
      <p>Periksa koneksi internet kamu.</p>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  HELPER: Warna chip sumber
// ═══════════════════════════════════════════════════════
function getSourceColor(source) {
  const map = {
    "Gaji":      { bg: "rgba(52,211,153,0.15)",  text: "var(--success)"  },
    "Freelance": { bg: "rgba(124,106,247,0.15)", text: "var(--primary)"  },
    "Bisnis":    { bg: "rgba(251,191,36,0.15)",  text: "var(--warning)"  },
    "Investasi": { bg: "rgba(96,165,250,0.15)",  text: "#60a5fa"         },
    "Bonus":     { bg: "rgba(244,114,182,0.15)", text: "#f472b6"         },
    "Uang Saku": { bg: "rgba(167,139,250,0.15)", text: "#a78bfa"         },
  };
  return map[source] || { bg: "rgba(152,152,184,0.12)", text: "var(--text-secondary)" };
}

// ═══════════════════════════════════════════════════════
//  HELPER: Tampilkan/sembunyikan input kustom sumber
// ═══════════════════════════════════════════════════════
function incomeToggleCustomSource(val) {
  const wrap = document.getElementById("f-income-custom-wrap");
  if (wrap) wrap.style.display = val === "__custom__" ? "block" : "none";
}

// ═══════════════════════════════════════════════════════
//  HELPER: Format tanggal display
// ═══════════════════════════════════════════════════════
function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

// ═══════════════════════════════════════════════════════
//  HELPER: Build month <option> list
// ═══════════════════════════════════════════════════════
function buildMonthOptions(selected) {
  const names = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];
  return names.map((n, i) =>
    `<option value="${i + 1}" ${selected === i + 1 ? "selected" : ""}>${n}</option>`
  ).join("");
}

function buildYearOptions(selected) {
  const cur  = new Date().getFullYear();
  const opts = [];
  for (let y = cur; y >= cur - 4; y--) {
    opts.push(`<option value="${y}" ${selected === y ? "selected" : ""}>${y}</option>`);
  }
  return opts.join("");
}

// ═══════════════════════════════════════════════════════
//  HELPER: Escape string untuk atribut HTML inline
// ═══════════════════════════════════════════════════════
function escapeStr(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
//  EXPOSE ke window (dipanggil dari HTML inline onclick)
// ═══════════════════════════════════════════════════════
window.incomeOpenAdd          = incomeOpenAdd;
window.incomeOpenEdit         = incomeOpenEdit;
window.incomeSave             = incomeSave;
window.incomeConfirmDelete    = incomeConfirmDelete;
window.incomeDelete           = incomeDelete;
window.incomeApplyFilter      = incomeApplyFilter;
window.incomeSearch           = incomeSearch;
window.incomeExportCSV        = incomeExportCSV;
window.incomeToggleCustomSource = incomeToggleCustomSource;
