// ═══════════════════════════════════════════════════════
//  pages/dashboard.js
//  Halaman utama — ringkasan keuangan, grafik, transaksi
//  terbaru, dan preview to-do list.
//
//  Lifecycle:
//   init()    → dipanggil router saat navigasi ke dashboard
//   destroy() → dipanggil router saat navigasi keluar
// ═══════════════════════════════════════════════════════

import {
  getDashboardSummary,
  getMonthlySummary,
  getExpenseByCategoryThisMonth,
} from "../core/storage.js";
import { getActiveUser } from "../core/auth.js";

// ── Chart instances (disimpan agar bisa di-destroy) ────
let chartIncomeExpense = null;
let chartCategory      = null;

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-dashboard");
  if (!container) return;

  // Render skeleton dulu agar tidak terasa lambat
  container.innerHTML = renderSkeleton();

  try {
    // Ambil semua data secara paralel
    const [summary, monthly, categories] = await Promise.all([
      getDashboardSummary(),
      getMonthlySummary(6),
      getExpenseByCategoryThisMonth(),
    ]);

    // Render konten penuh
    container.innerHTML = renderDashboard(summary);

    // Init grafik setelah DOM siap
    initChartIncomeExpense(monthly);
    initChartCategory(categories);

    // Render transaksi terbaru & todo preview
    renderRecentTransactions(summary.recentTransactions);
    renderTodoPreview();

  } catch (err) {
    console.error("Dashboard init error:", err);
    container.innerHTML = renderError(err.message);
  }
}

// ═══════════════════════════════════════════════════════
//  DESTROY — bersihkan chart instances
// ═══════════════════════════════════════════════════════
export function destroy() {
  if (chartIncomeExpense) { chartIncomeExpense.destroy(); chartIncomeExpense = null; }
  if (chartCategory)      { chartCategory.destroy();      chartCategory      = null; }
}

// ═══════════════════════════════════════════════════════
//  RENDER: SKELETON LOADING
// ═══════════════════════════════════════════════════════
function renderSkeleton() {
  const skCard = `
    <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;">
      <div style="height:12px;width:40%;background:var(--surface-el);border-radius:6px;margin-bottom:14px;animation:skPulse 1.4s ease infinite;"></div>
      <div style="height:28px;width:60%;background:var(--surface-el);border-radius:6px;animation:skPulse 1.4s ease infinite .1s;"></div>
    </div>`;

  return `
    <style>
      @keyframes skPulse {
        0%,100%{opacity:.4} 50%{opacity:.9}
      }
    </style>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px;">
      ${skCard}${skCard}${skCard}${skCard}
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:24px;">
      <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;height:300px;animation:skPulse 1.4s ease infinite;"></div>
      <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;height:300px;animation:skPulse 1.4s ease infinite .15s;"></div>
    </div>
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;">
      <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;height:260px;animation:skPulse 1.4s ease infinite;"></div>
      <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:14px;padding:20px 22px;height:260px;animation:skPulse 1.4s ease infinite .2s;"></div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: DASHBOARD UTAMA
// ═══════════════════════════════════════════════════════
function renderDashboard(summary) {
  const user    = getActiveUser();
  const name    = user?.displayName?.split(" ")[0] || "Kamu";
  const hour    = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  const {
    incomeThisMonth  = 0,
    expenseThisMonth = 0,
    balance          = 0,
    totalSavings     = 0,
    totalAssets      = 0,
    pendingTodos     = 0,
  } = summary;

  const savingRate   = incomeThisMonth > 0
    ? Math.round(((incomeThisMonth - expenseThisMonth) / incomeThisMonth) * 100)
    : 0;
  const isProfit     = balance >= 0;
  const balanceColor = isProfit ? "var(--success)" : "var(--danger)";
  const balanceIcon  = isProfit
    ? `<path d="M12 19V5M5 12l7-7 7 7"/>`
    : `<path d="M12 5v14M19 12l-7 7-7-7"/>`;

  return `
  <!-- ── Greeting ───────────────────────────────── -->
  <div style="margin-bottom:24px;">
    <h1 style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;
               color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:4px;">
      ${greeting}, ${name}! 👋
    </h1>
    <p style="font-size:0.85rem;color:var(--text-muted);">
      Ini ringkasan keuangan kamu bulan ini.
    </p>
  </div>

  <!-- ── Stat Cards ────────────────────────────── -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px;">

    <!-- Saldo Bulan Ini -->
    <div class="card" style="border-color:rgba(124,106,247,0.25);background:linear-gradient(135deg,rgba(124,106,247,0.08),transparent);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <span class="card-title" style="margin-bottom:0;">Saldo Bersih</span>
        <div class="stat-icon si-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
      <div class="stat-value" style="color:${balanceColor};">${window.formatRupiah(Math.abs(balance))}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
        <span class="stat-badge ${isProfit ? "badge-up" : "badge-down"}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${balanceIcon}</svg>
          ${isProfit ? "+" : "-"}${Math.abs(savingRate)}% saving rate
        </span>
      </div>
    </div>

    <!-- Income Bulan Ini -->
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <span class="card-title" style="margin-bottom:0;">Pemasukan</span>
        <div class="stat-icon si-success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
      </div>
      <div class="stat-value" style="color:var(--success);">${window.formatRupiah(incomeThisMonth)}</div>
      <div style="margin-top:8px;">
        <span class="stat-badge badge-neu">Bulan ini</span>
      </div>
    </div>

    <!-- Expense Bulan Ini -->
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <span class="card-title" style="margin-bottom:0;">Pengeluaran</span>
        <div class="stat-icon si-danger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
          </svg>
        </div>
      </div>
      <div class="stat-value" style="color:var(--danger);">${window.formatRupiah(expenseThisMonth)}</div>
      <div style="margin-top:8px;">
        <span class="stat-badge badge-neu">Bulan ini</span>
      </div>
    </div>

    <!-- Tabungan + Aset -->
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <span class="card-title" style="margin-bottom:0;">Total Aset</span>
        <div class="stat-icon si-warning">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
          </svg>
        </div>
      </div>
      <div class="stat-value" style="color:var(--warning);">${window.formatRupiah(totalSavings + totalAssets)}</div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
        <span class="chip chip-neutral" style="font-size:0.7rem;">
          Tabungan ${window.formatRupiah(totalSavings)}
        </span>
      </div>
    </div>

  </div>

  <!-- ── Grafik Baris 1 ────────────────────────── -->
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px;" id="dash-chart-row">

    <!-- Income vs Expense Chart -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div>
          <div class="card-title" style="margin-bottom:2px;">Income vs Pengeluaran</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">6 bulan terakhir</div>
        </div>
        <div style="display:flex;gap:14px;">
          <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary);">
            <span style="width:10px;height:10px;border-radius:3px;background:var(--success);display:inline-block;"></span>
            Income
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary);">
            <span style="width:10px;height:10px;border-radius:3px;background:var(--danger);display:inline-block;"></span>
            Pengeluaran
          </div>
        </div>
      </div>
      <div style="position:relative;height:220px;">
        <canvas id="chart-income-expense"></canvas>
      </div>
    </div>

    <!-- Kategori Pengeluaran -->
    <div class="card">
      <div style="margin-bottom:18px;">
        <div class="card-title" style="margin-bottom:2px;">Kategori Pengeluaran</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">Bulan ini</div>
      </div>
      <div style="position:relative;height:180px;display:flex;align-items:center;justify-content:center;">
        <canvas id="chart-category"></canvas>
      </div>
      <div id="chart-category-legend" style="margin-top:12px;display:flex;flex-direction:column;gap:6px;"></div>
    </div>

  </div>

  <!-- ── Transaksi & Todo Baris 2 ──────────────── -->
  <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;" id="dash-bottom-row">

    <!-- Transaksi Terbaru -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div class="card-title" style="margin-bottom:0;">Transaksi Terbaru</div>
        <button onclick="window.navigateTo('income')"
          style="font-size:0.75rem;color:var(--primary-light);background:none;border:none;cursor:pointer;
                 font-family:'DM Sans',sans-serif;font-weight:500;padding:0;">
          Lihat semua →
        </button>
      </div>
      <div id="recent-tx-list"></div>
    </div>

    <!-- To-Do Preview -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div class="card-title" style="margin-bottom:2px;">To-Do List</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">
            ${pendingTodos} task belum selesai
          </div>
        </div>
        <button onclick="window.navigateTo('todo')"
          style="font-size:0.75rem;color:var(--primary-light);background:none;border:none;cursor:pointer;
                 font-family:'DM Sans',sans-serif;font-weight:500;padding:0;">
          Lihat semua →
        </button>
      </div>
      <div id="todo-preview-list"></div>
    </div>

  </div>

  <!-- Responsive style untuk grid -->
  <style>
    @media (max-width: 900px) {
      #dash-chart-row { grid-template-columns: 1fr !important; }
      #dash-bottom-row { grid-template-columns: 1fr !important; }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════
//  CHART: Income vs Expense (Bar Chart)
// ═══════════════════════════════════════════════════════
function initChartIncomeExpense(monthly) {
  const canvas = document.getElementById("chart-income-expense");
  if (!canvas) return;

  if (chartIncomeExpense) chartIncomeExpense.destroy();

  const labels   = monthly.map(m => m.label);
  const incomes  = monthly.map(m => m.income);
  const expenses = monthly.map(m => m.expense);

  chartIncomeExpense = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label:           "Income",
          data:            incomes,
          backgroundColor: "rgba(52,211,153,0.7)",
          borderColor:     "rgba(52,211,153,1)",
          borderWidth:     1.5,
          borderRadius:    6,
          borderSkipped:   false,
        },
        {
          label:           "Pengeluaran",
          data:            expenses,
          backgroundColor: "rgba(248,113,113,0.7)",
          borderColor:     "rgba(248,113,113,1)",
          borderWidth:     1.5,
          borderRadius:    6,
          borderSkipped:   false,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: "index", intersect: false },
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
            label: ctx => ` ${ctx.dataset.label}: ${window.formatRupiah(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid:  { color: "rgba(42,42,69,0.5)", drawBorder: false },
          ticks: { color: "#5a5a78", font: { family: "'DM Sans'", size: 11 } },
        },
        y: {
          grid:       { color: "rgba(42,42,69,0.5)", drawBorder: false },
          ticks: {
            color:    "#5a5a78",
            font:     { family: "'DM Sans'", size: 11 },
            callback: val => {
              if (val >= 1_000_000) return "Rp" + (val / 1_000_000).toFixed(1) + "jt";
              if (val >= 1_000)     return "Rp" + (val / 1_000).toFixed(0) + "rb";
              return "Rp" + val;
            },
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ═══════════════════════════════════════════════════════
//  CHART: Kategori Pengeluaran (Doughnut Chart)
// ═══════════════════════════════════════════════════════
function initChartCategory(categories) {
  const canvas = document.getElementById("chart-category");
  if (!canvas) return;

  if (chartCategory) chartCategory.destroy();

  // Jika tidak ada data
  if (!categories || categories.length === 0) {
    canvas.parentElement.innerHTML = `
      <div style="text-align:center;color:var(--text-muted);font-size:0.82rem;padding:40px 0;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 8px;display:block;opacity:.4">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
        </svg>
        Belum ada pengeluaran
      </div>`;
    return;
  }

  const COLORS = [
    "#7c6af7","#34d399","#f87171","#fbbf24",
    "#60a5fa","#f472b6","#a78bfa","#34d3d3",
  ];

  const labels = categories.map(c => c.category);
  const data   = categories.map(c => c.total);
  const colors = labels.map((_, i) => COLORS[i % COLORS.length]);

  chartCategory = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + "cc"),
        borderColor:     colors,
        borderWidth:     2,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              "70%",
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
            label: ctx => ` ${window.formatRupiah(ctx.raw)}`,
          },
        },
      },
    },
  });

  // Render legend custom
  const legendEl = document.getElementById("chart-category-legend");
  if (legendEl) {
    const total = data.reduce((a, b) => a + b, 0);
    legendEl.innerHTML = categories.slice(0, 4).map((c, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:7px;min-width:0;">
          <span style="width:8px;height:8px;border-radius:2px;background:${colors[i]};flex-shrink:0;"></span>
          <span style="font-size:0.78rem;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.category}</span>
        </div>
        <span style="font-size:0.78rem;color:var(--text-muted);flex-shrink:0;">
          ${total > 0 ? Math.round((c.total / total) * 100) : 0}%
        </span>
      </div>`).join("");
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: TRANSAKSI TERBARU
// ═══════════════════════════════════════════════════════
function renderRecentTransactions(transactions) {
  const el = document.getElementById("recent-tx-list");
  if (!el) return;

  if (!transactions || transactions.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:24px 0;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <h3>Belum Ada Transaksi</h3>
        <p>Catat income atau pengeluaran pertamamu.</p>
      </div>`;
    return;
  }

  el.innerHTML = transactions.map(tx => {
    const isIncome = tx.txType === "income";
    const icon     = isIncome
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)"  stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`;

    const iconBg   = isIncome ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)";
    const label    = isIncome ? (tx.source || "Pemasukan") : (tx.category || "Pengeluaran");
    const amtColor = isIncome ? "var(--success)" : "var(--danger)";
    const amtSign  = isIncome ? "+" : "-";
    const dateDisp = formatDateDisplay(tx.date);

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;
                  border-bottom:1px solid rgba(42,42,69,0.5);">
        <div style="width:34px;height:34px;border-radius:9px;background:${iconBg};
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${icon}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.875rem;font-weight:500;color:var(--text-primary);
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${label}
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${dateDisp}</div>
        </div>
        <div style="font-size:0.875rem;font-weight:600;color:${amtColor};flex-shrink:0;">
          ${amtSign}${window.formatRupiah(tx.amount)}
        </div>
      </div>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════
//  RENDER: TODO PREVIEW
//  Import dinamis getTodos dari storage
// ═══════════════════════════════════════════════════════
async function renderTodoPreview() {
  const el = document.getElementById("todo-preview-list");
  if (!el) return;

  try {
    const { getTodos } = await import("../core/storage.js");
    const todos        = (await getTodos()).slice(0, 5);

    if (todos.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="padding:24px 0;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <h3>To-Do Kosong</h3>
          <p>Tambahkan task pertamamu.</p>
        </div>`;
      return;
    }

    const priorityColors = { high: "var(--danger)", medium: "var(--warning)", low: "var(--success)" };
    const priorityLabels = { high: "Tinggi", medium: "Sedang", low: "Rendah" };

    el.innerHTML = todos.map(todo => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 0;
                  border-bottom:1px solid rgba(42,42,69,0.5);
                  ${todo.done ? "opacity:0.5;" : ""}">
        <div style="width:16px;height:16px;border-radius:5px;flex-shrink:0;
                    border:2px solid ${todo.done ? "var(--success)" : "var(--border)"};
                    background:${todo.done ? "var(--success)" : "transparent"};
                    display:flex;align-items:center;justify-content:center;">
          ${todo.done ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
        </div>
        <span style="flex:1;font-size:0.84rem;color:var(--text-${todo.done ? "muted" : "primary"});
                     text-decoration:${todo.done ? "line-through" : "none"};
                     white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${todo.text}
        </span>
        <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;
                     background:${priorityColors[todo.priority] || "var(--text-muted)"};
                     title="${priorityLabels[todo.priority] || ""}">
        </span>
      </div>`).join("");

  } catch (err) {
    console.error("Todo preview error:", err);
    el.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);padding:12px 0;">Gagal memuat to-do.</div>`;
  }
}

// ═══════════════════════════════════════════════════════
//  HELPER: Format tanggal "YYYY-MM-DD" → "12 Jan 2025"
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
//  HELPER: Render error state
// ═══════════════════════════════════════════════════════
function renderError(msg) {
  return `
    <div class="empty-state" style="padding-top:80px;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3 style="color:var(--danger);">Gagal Memuat Dashboard</h3>
      <p style="margin-bottom:16px;">${msg || "Periksa koneksi internet kamu."}</p>
      <button onclick="window.router.reload('dashboard')"
        style="padding:8px 20px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.85rem;cursor:pointer;">
        🔄 Coba Lagi
      </button>
    </div>`;
}
