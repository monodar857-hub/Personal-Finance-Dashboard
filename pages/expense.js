

import {
  getExpensesByMonth,
  addExpense,
  updateExpense,
  deleteExpense,
} from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let allExpenses    = [];
let filterMonth    = new Date().getMonth() + 1;
let filterYear     = new Date().getFullYear();
let filterCategory = "all";
let editingId      = null;
let chartInstance  = null;

// ── Kategori pengeluaran ───────────────────────────────
const CATEGORIES = [
  "Makan & Minum",
  "Transport",
  "Kuota / Internet",
  "Hiburan",
  "Kesehatan",
  "Pendidikan",
  "Belanja",
  "Tagihan",
  "Tabungan",
  "Lainnya",
];

// Warna per kategori (konsisten)
const CAT_COLORS = {
  "Makan & Minum":    "#34d399",
  "Transport":        "#60a5fa",
  "Kuota / Internet": "#a78bfa",
  "Hiburan":          "#f472b6",
  "Kesehatan":        "#fb923c",
  "Pendidikan":       "#fbbf24",
  "Belanja":          "#f87171",
  "Tagihan":          "#94a3b8",
  "Tabungan":         "#7c6af7",
  "Lainnya":          "#64748b",
};

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-expense");
  if (!container) return;

  container.innerHTML = renderPage();
  await loadExpenses();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  allExpenses    = [];
  editingId      = null;
  filterCategory = "all";
}

// ═══════════════════════════════════════════════════════
//  RENDER: STRUKTUR HALAMAN
// ═══════════════════════════════════════════════════════
function renderPage() {
  return `
  <!-- ── Header ───────────────────────────────── -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;
              flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <h2 style="font-family:'Syne',sans-serif;font-size:1.25rem;font-weight:800;
                 color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:4px;">
        Pengeluaran
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Pantau ke mana uangmu pergi setiap bulan.
      </p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="expenseExportCSV()"
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
      <button onclick="expenseOpenAdd()"
        style="display:flex;align-items:center;gap:7px;padding:9px 18px;
               background:linear-gradient(135deg,var(--danger),#dc2626);border:none;border-radius:9px;
               color:white;font-family:'DM Sans',sans-serif;font-size:0.84rem;font-weight:600;
               cursor:pointer;box-shadow:0 4px 14px rgba(248,113,113,0.3);transition:all .2s;"
        onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(248,113,113,0.45)'"
        onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 14px rgba(248,113,113,0.3)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tambah Pengeluaran
      </button>
    </div>
  </div>

  <!-- ── Baris Atas: Summary + Filter ──────────── -->
  <div style="display:grid;grid-template-columns:1fr 280px;gap:14px;
              align-items:start;margin-bottom:14px;" id="expense-top-row">

    <!-- Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;"
         id="expense-summary-cards">
      <!-- Diisi oleh renderSummaryCards() -->
    </div>

    <!-- Filter Panel -->
    <div class="card" style="padding:16px 18px;">
      <div class="card-title" style="margin-bottom:12px;">Filter Periode</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <select id="expense-filter-month" class="form-input" style="cursor:pointer;">
          ${buildMonthOptions(filterMonth)}
        </select>
        <select id="expense-filter-year" class="form-input" style="cursor:pointer;">
          ${buildYearOptions(filterYear)}
        </select>
        <select id="expense-filter-cat" class="form-input" style="cursor:pointer;"
          onchange="expenseFilterCat(this.value)">
          <option value="all">Semua Kategori</option>
          ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <button onclick="expenseApplyFilter()"
          style="padding:8px;background:var(--primary);border:none;border-radius:8px;
                 color:white;font-family:'DM Sans',sans-serif;font-size:0.84rem;
                 font-weight:600;cursor:pointer;">
          Terapkan
        </button>
      </div>
    </div>

  </div>

  <!-- ── Baris Tengah: Chart + Breakdown ───────── -->
  <div style="display:grid;grid-template-columns:1fr 280px;gap:14px;
              margin-bottom:14px;" id="expense-chart-row">

    <!-- Pie Chart Kategori -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div class="card-title" style="margin-bottom:2px;">Breakdown Kategori</div>
          <div style="font-size:0.78rem;color:var(--text-muted);" id="expense-chart-subtitle">
            Bulan ini
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
        <!-- Wrapper chart: ukuran fix 160x160, canvas tidak overflow -->
        <div style="position:relative;width:160px;height:160px;
                    flex-shrink:0;overflow:hidden;">
          <canvas id="expense-pie-chart"
            width="160" height="160"
            style="width:160px!important;height:160px!important;
                   max-width:160px;max-height:160px;display:block;">
          </canvas>
          <div id="expense-pie-center"
            style="position:absolute;top:50%;left:50%;
                   transform:translate(-50%,-50%);
                   text-align:center;pointer-events:none;">
          </div>
        </div>
        <div id="expense-cat-legend"
          style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:140px;">
        </div>
      </div>
    </div>

    <!-- Top Kategori -->
    <div class="card">
      <div class="card-title" style="margin-bottom:14px;">Pengeluaran Terbesar</div>
      <div id="expense-top-cats" style="display:flex;flex-direction:column;gap:10px;">
        <!-- Diisi oleh renderTopCategories() -->
      </div>
    </div>

  </div>

  <!-- ── Tabel Pengeluaran ──────────────────────── -->
  <div class="card" style="padding:0;overflow:hidden;">

    <!-- Table Toolbar -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                flex-wrap:wrap;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);">
      <div style="font-family:'Syne',sans-serif;font-size:0.88rem;font-weight:700;
                  color:var(--text-primary);" id="expense-table-title">
        Semua Pengeluaran
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="position:relative;">
          <input type="text" id="expense-search" placeholder="Cari kategori / catatan..."
            oninput="expenseSearch(this.value)"
            style="background:var(--surface-el);border:1.5px solid var(--border);border-radius:8px;
                   padding:7px 12px 7px 32px;color:var(--text-primary);font-family:'DM Sans',sans-serif;
                   font-size:0.82rem;outline:none;width:200px;transition:all .2s;"
            onfocus="this.style.borderColor='var(--primary)'"
            onblur="this.style.borderColor='var(--border)'"/>
          <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
        <span id="expense-count" style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;"></span>
      </div>
    </div>

    <!-- Table Body -->
    <div id="expense-table-body" style="overflow-x:auto;"></div>

  </div>

  <!-- Responsive -->
  <style>
    @media (max-width: 900px) {
      #expense-top-row   { grid-template-columns: 1fr !important; }
      #expense-chart-row { grid-template-columns: 1fr !important; }
    }
    /* Mobile: pie chart section stack vertikal & center */
    @media (max-width: 600px) {
      #expense-chart-row > .card > div:last-of-type {
        flex-direction: column !important;
        align-items: center !important;
      }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadExpenses() {
  setTableLoading(true);
  try {
    allExpenses = await getExpensesByMonth(filterMonth, filterYear);
    renderSummaryCards();
    renderPieChart();
    renderTopCategories();
    applyTableFilter();
    updateTableTitle();
  } catch (err) {
    console.error("Load expenses error:", err);
    window.showToast("Gagal memuat data pengeluaran.", "error");
  } finally {
    setTableLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: SUMMARY CARDS
// ═══════════════════════════════════════════════════════
function renderSummaryCards() {
  const el = document.getElementById("expense-summary-cards");
  if (!el) return;

  const total   = allExpenses.reduce((s, e) => s + e.amount, 0);
  const count   = allExpenses.length;
  const avg     = count > 0 ? total / count : 0;
  const highest = count > 0 ? Math.max(...allExpenses.map(e => e.amount)) : 0;
  const highestItem = allExpenses.find(e => e.amount === highest);

  el.innerHTML = `
    <div class="card" style="border-color:rgba(248,113,113,0.25);
         background:linear-gradient(135deg,rgba(248,113,113,0.07),transparent);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="card-title" style="margin-bottom:0;">Total Pengeluaran</span>
        <div class="stat-icon si-danger" style="width:34px;height:34px;border-radius:9px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
            <polyline points="17 18 23 18 23 12"/>
          </svg>
        </div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                  color:var(--danger);letter-spacing:-0.02em;">
        ${window.formatRupiah(total)}
      </div>
    </div>

    <div class="card">
      <div style="margin-bottom:8px;">
        <span class="card-title" style="margin-bottom:0;">Rata-rata / Transaksi</span>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                  color:var(--text-primary);letter-spacing:-0.02em;">
        ${window.formatRupiah(Math.round(avg))}
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
        dari ${count} transaksi
      </div>
    </div>

    <div class="card">
      <div style="margin-bottom:8px;">
        <span class="card-title" style="margin-bottom:0;">Terbesar</span>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                  color:var(--warning);letter-spacing:-0.02em;">
        ${window.formatRupiah(highest)}
      </div>
      ${highestItem ? `
        <div style="margin-top:4px;">
          <span class="chip chip-neutral" style="font-size:0.7rem;">${highestItem.category}</span>
        </div>` : ""}
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: PIE CHART
// ═══════════════════════════════════════════════════════
function renderPieChart() {
  const canvas = document.getElementById("expense-pie-chart");
  if (!canvas) return;

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  // Agregasi per kategori
  const catMap = {};
  allExpenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const total   = entries.reduce((s, [, v]) => s + v, 0);

  // Update subtitle
  const sub = document.getElementById("expense-chart-subtitle");
  if (sub) {
    const monthName = new Date(filterYear, filterMonth - 1)
      .toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    sub.textContent = monthName;
  }

  // Pie center — total
  const center = document.getElementById("expense-pie-center");
  if (center) {
    center.innerHTML = entries.length > 0 ? `
      <div style="font-size:0.6rem;color:var(--text-muted);margin-bottom:2px;">TOTAL</div>
      <div style="font-family:'Syne',sans-serif;font-size:0.7rem;font-weight:800;
                  color:var(--danger);">
        ${total >= 1_000_000
          ? "Rp" + (total / 1_000_000).toFixed(1) + "jt"
          : "Rp" + (total / 1_000).toFixed(0) + "rb"}
      </div>` : "";
  }

  if (entries.length === 0) {
    canvas.parentElement.innerHTML = `
      <div style="width:160px;height:160px;display:flex;flex-direction:column;
                  align-items:center;justify-content:center;
                  border-radius:50%;border:2px dashed var(--border);">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" stroke-width="1.5" style="opacity:.5">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
        </svg>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:6px;text-align:center;">
          Belum ada<br>pengeluaran
        </div>
      </div>`;
    renderCategoryLegend([]);
    return;
  }

  const labels = entries.map(([k]) => k);
  const data   = entries.map(([, v]) => v);
  const colors = labels.map(l => CAT_COLORS[l] || "#64748b");

  chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + "cc"),
        borderColor:     colors,
        borderWidth:     2,
        hoverOffset:     8,
      }],
    },
    options: {
      responsive:          false,
      maintainAspectRatio: true,
      cutout:              "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(20,20,40,0.95)",
          titleColor:      "#eeeef8",
          bodyColor:       "#9898b8",
          borderColor:     "rgba(42,42,69,0.8)",
          borderWidth:     1,
          padding:         10,
          callbacks: {
            label: ctx => {
              const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
              return ` ${window.formatRupiah(ctx.raw)} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  renderCategoryLegend(entries, total);
}

function renderCategoryLegend(entries, total = 0) {
  const el = document.getElementById("expense-cat-legend");
  if (!el) return;

  if (entries.length === 0) {
    el.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">Belum ada data.</div>`;
    return;
  }

  el.innerHTML = entries.slice(0, 5).map(([cat, val]) => {
    const color = CAT_COLORS[cat] || "#64748b";
    const pct   = total > 0 ? Math.round((val / total) * 100) : 0;
    const barW  = Math.max(4, pct);
    return `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;
                    gap:8px;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:7px;min-width:0;">
            <span style="width:8px;height:8px;border-radius:2px;flex-shrink:0;
                         background:${color};"></span>
            <span style="font-size:0.78rem;color:var(--text-secondary);
                         white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${cat}
            </span>
          </div>
          <span style="font-size:0.75rem;color:var(--text-muted);flex-shrink:0;">${pct}%</span>
        </div>
        <div class="progress-track" style="height:4px;">
          <div class="progress-fill" style="width:${barW}%;background:${color};"></div>
        </div>
      </div>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════
//  RENDER: TOP KATEGORI (card kanan)
// ═══════════════════════════════════════════════════════
function renderTopCategories() {
  const el = document.getElementById("expense-top-cats");
  if (!el) return;

  const catMap = {};
  allExpenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  const sorted = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const max = sorted[0]?.[1] || 1;

  if (sorted.length === 0) {
    el.innerHTML = `<div style="font-size:0.82rem;color:var(--text-muted);
                                text-align:center;padding:20px 0;">
                      Belum ada data.
                    </div>`;
    return;
  }

  el.innerHTML = sorted.map(([cat, val], idx) => {
    const color = CAT_COLORS[cat] || "#64748b";
    const barW  = Math.round((val / max) * 100);
    return `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-family:'Syne',sans-serif;font-size:0.7rem;font-weight:700;
                         color:var(--text-muted);width:14px;">${idx + 1}</span>
            <span style="font-size:0.82rem;color:var(--text-secondary);">${cat}</span>
          </div>
          <span style="font-size:0.8rem;font-weight:600;color:var(--text-primary);">
            ${window.formatRupiah(val)}
          </span>
        </div>
        <div class="progress-track" style="height:5px;">
          <div class="progress-fill" style="width:${barW}%;background:${color};"></div>
        </div>
      </div>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════
//  RENDER: TABEL
// ═══════════════════════════════════════════════════════
function applyTableFilter() {
  const filtered = filterCategory === "all"
    ? allExpenses
    : allExpenses.filter(e => e.category === filterCategory);
  renderTable(filtered);
}

function renderTable(data) {
  const el      = document.getElementById("expense-table-body");
  const countEl = document.getElementById("expense-count");
  if (!el) return;
  if (countEl) countEl.textContent = `${data.length} data`;

  if (data.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:48px 24px;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
        </svg>
        <h3>Belum Ada Pengeluaran</h3>
        <p style="margin-bottom:16px;">
          ${filterCategory !== "all"
            ? `Tidak ada pengeluaran kategori <strong>${filterCategory}</strong> bulan ini.`
            : "Belum ada pengeluaran di periode ini."}
        </p>
        <button onclick="expenseOpenAdd()"
          style="padding:8px 20px;background:linear-gradient(135deg,var(--danger),#dc2626);
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
          <th>Kategori</th>
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
  const color    = CAT_COLORS[item.category] || "#64748b";
  const note     = item.note
    ? item.note
    : `<span style="color:var(--text-muted);font-style:italic;">—</span>`;

  return `
    <tr id="expense-row-${item.id}">
      <td>
        <span style="font-size:0.82rem;color:var(--text-muted);">${dateDisp}</span>
      </td>
      <td>
        <span class="chip" style="background:${color}22;color:${color};border:1px solid ${color}44;
                                   font-size:0.78rem;">
          ${item.category}
        </span>
      </td>
      <td>
        <span style="font-family:'Syne',sans-serif;font-weight:700;
                     color:var(--danger);font-size:0.9rem;">
          -${window.formatRupiah(item.amount)}
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
            onclick="expenseOpenEdit('${item.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-btn del" title="Hapus"
            onclick="expenseConfirmDelete('${item.id}','${escapeStr(item.category)}',${item.amount})">
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
//  MODAL: FORM TAMBAH / EDIT
// ═══════════════════════════════════════════════════════
function expenseOpenAdd() {
  editingId = null;
  const today = new Date().toISOString().split("T")[0];
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Pengeluaran
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderExpenseForm({ date: today })}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="expenseSave()" id="expense-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(248,113,113,0.3);">
        Simpan Pengeluaran
      </button>
    </div>`);
}

function expenseOpenEdit(id) {
  const item = allExpenses.find(e => e.id === id);
  if (!item) return;
  editingId = id;
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit Pengeluaran
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderExpenseForm(item)}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="expenseSave()" id="expense-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);">
        Simpan Perubahan
      </button>
    </div>`);
}

function renderExpenseForm(data = {}) {
  const catOptions = CATEGORIES.map(c =>
    `<option value="${c}" ${data.category === c ? "selected" : ""}>${c}</option>`
  ).join("");

  return `
    <div class="form-group">
      <label class="form-label">Tanggal</label>
      <input type="date" id="f-exp-date" class="form-input"
        value="${data.date || ""}" max="${new Date().toISOString().split("T")[0]}" />
    </div>
    <div class="form-group">
      <label class="form-label">Kategori</label>
      <select id="f-exp-category" class="form-input" style="cursor:pointer;">
        ${catOptions}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Jumlah (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-exp-amount" class="form-input"
          style="padding-left:36px;" placeholder="0"
          value="${data.amount || ""}" min="1" />
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">
        Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span>
      </label>
      <input type="text" id="f-exp-note" class="form-input"
        placeholder="Contoh: Makan siang di kantin"
        value="${data.note || ""}" maxlength="200" />
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════════════════
async function expenseSave() {
  const date     = document.getElementById("f-exp-date")?.value;
  const category = document.getElementById("f-exp-category")?.value;
  const amount   = parseFloat(document.getElementById("f-exp-amount")?.value);
  const note     = document.getElementById("f-exp-note")?.value?.trim() || "";

  if (!date)              { window.showToast("Tanggal wajib diisi.", "error"); return; }
  if (!category)          { window.showToast("Kategori wajib dipilih.", "error"); return; }
  if (!amount || amount <= 0) { window.showToast("Jumlah harus lebih dari 0.", "error"); return; }

  const btn = document.getElementById("expense-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    if (editingId) {
      await updateExpense(editingId, { date, category, amount, note });
      window.showToast("Pengeluaran berhasil diperbarui! ✏️", "success");
    } else {
      await addExpense({ date, category, amount, note });
      window.showToast("Pengeluaran berhasil dicatat! 📝", "success");
    }
    window.closeModal();
    await loadExpenses();
  } catch (err) {
    console.error("Save expense error:", err);
    window.showToast("Gagal menyimpan. Coba lagi.", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = editingId ? "Simpan Perubahan" : "Simpan Pengeluaran";
    }
  }
}

// ═══════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════
function expenseConfirmDelete(id, category, amount) {
  const color = CAT_COLORS[category] || "#64748b";
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Pengeluaran
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);
                border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:6px;">
        Kamu akan menghapus:
      </div>
      <span class="chip" style="background:${color}22;color:${color};
                                  border:1px solid ${color}44;font-size:0.8rem;">
        ${category}
      </span>
      <div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
                  color:var(--danger);margin-top:8px;">
        -${window.formatRupiah(amount)}
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
      <button onclick="expenseDelete('${id}')"
        style="flex:1;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Ya, Hapus
      </button>
    </div>`);
}

async function expenseDelete(id) {
  try {
    await deleteExpense(id);
    window.closeModal();
    window.showToast("Pengeluaran berhasil dihapus.", "info");
    await loadExpenses();
  } catch (err) {
    console.error("Delete expense error:", err);
    window.showToast("Gagal menghapus. Coba lagi.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  FILTER & SEARCH
// ═══════════════════════════════════════════════════════
function expenseApplyFilter() {
  const m = parseInt(document.getElementById("expense-filter-month")?.value);
  const y = parseInt(document.getElementById("expense-filter-year")?.value);
  if (m) filterMonth = m;
  if (y) filterYear  = y;
  loadExpenses();
}

function expenseFilterCat(val) {
  filterCategory = val;
  applyTableFilter();
}

function expenseSearch(query) {
  const q = query.toLowerCase().trim();
  const filtered = q
    ? allExpenses.filter(e =>
        e.category.toLowerCase().includes(q) ||
        (e.note && e.note.toLowerCase().includes(q))
      )
    : allExpenses;
  renderTable(filtered);
}

function updateTableTitle() {
  const el = document.getElementById("expense-table-title");
  if (!el) return;
  const monthName = new Date(filterYear, filterMonth - 1)
    .toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  el.textContent = `Pengeluaran — ${monthName}`;
}

// ═══════════════════════════════════════════════════════
//  EXPORT CSV
// ═══════════════════════════════════════════════════════
function expenseExportCSV() {
  if (allExpenses.length === 0) {
    window.showToast("Tidak ada data untuk diekspor.", "error");
    return;
  }
  const headers = ["Tanggal", "Kategori", "Jumlah (Rp)", "Catatan"];
  const rows    = allExpenses.map(e => [
    e.date,
    `"${e.category}"`,
    e.amount,
    `"${(e.note || "").replace(/"/g, '""')}"`,
  ]);
  const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const monthName = new Date(filterYear, filterMonth - 1)
    .toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    .replace(" ", "-");
  a.href     = url;
  a.download = `pengeluaran-${monthName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  window.showToast(`${allExpenses.length} data berhasil diekspor! 📥`, "success");
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function setTableLoading(loading) {
  const el = document.getElementById("expense-table-body");
  if (!el || !loading) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;
                padding:48px;color:var(--text-muted);font-size:0.85rem;">
      <div class="spinner" style="border-color:rgba(248,113,113,0.2);border-top-color:var(--danger);"></div>
      Memuat data...
    </div>`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

function buildMonthOptions(selected) {
  const names = ["Januari","Februari","Maret","April","Mei","Juni",
                 "Juli","Agustus","September","Oktober","November","Desember"];
  return names.map((n, i) =>
    `<option value="${i + 1}" ${selected === i + 1 ? "selected" : ""}>${n}</option>`
  ).join("");
}

function buildYearOptions(selected) {
  const cur = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => cur - i)
    .map(y => `<option value="${y}" ${selected === y ? "selected" : ""}>${y}</option>`)
    .join("");
}

function escapeStr(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
//  EXPOSE ke window
// ═══════════════════════════════════════════════════════
window.expenseOpenAdd         = expenseOpenAdd;
window.expenseOpenEdit        = expenseOpenEdit;
window.expenseSave            = expenseSave;
window.expenseConfirmDelete   = expenseConfirmDelete;
window.expenseDelete          = expenseDelete;
window.expenseApplyFilter     = expenseApplyFilter;
window.expenseFilterCat       = expenseFilterCat;
window.expenseSearch          = expenseSearch;
window.expenseExportCSV       = expenseExportCSV;
