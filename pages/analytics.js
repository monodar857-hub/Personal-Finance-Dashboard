

import {
  getMonthlySummary,
  getExpenseByCategoryThisMonth,
  getSavingGoals,
  getSavingTransactions,
  getAssets,
  getIncomesByMonth,
  getExpensesByMonth,
} from "../core/storage.js";

// ── Chart instances ────────────────────────────────────
let charts = {};

// ── Period selector state ──────────────────────────────
let periodMonths = 6;

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-analytics");
  if (!container) return;

  container.innerHTML = renderShell();
  await loadAll();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
  charts = {};
}

// ═══════════════════════════════════════════════════════
//  RENDER: SHELL
// ═══════════════════════════════════════════════════════
function renderShell() {
  return `
  <!-- ── Header ───────────────────────────────── -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;
              flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <h2 style="font-family:'Syne',sans-serif;font-size:1.25rem;font-weight:800;
                 color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:4px;">
        Analitik
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Visualisasi lengkap kondisi keuanganmu.
      </p>
    </div>
    <!-- Period Selector -->
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:0.82rem;color:var(--text-muted);">Tampilkan:</span>
      <div style="display:flex;gap:4px;background:var(--surface-el);
                  border-radius:9px;padding:3px;">
        ${[3, 6, 12].map(m => `
          <button id="period-btn-${m}" onclick="analyticsSetPeriod(${m})"
            style="padding:6px 14px;border-radius:7px;border:none;cursor:pointer;
                   font-family:'DM Sans',sans-serif;font-size:0.8rem;font-weight:600;
                   transition:all .2s;
                   background:${m === 6 ? "var(--primary)" : "transparent"};
                   color:${m === 6 ? "white" : "var(--text-secondary)"};">
            ${m} Bln
          </button>`).join("")}
      </div>
    </div>
  </div>

  <!-- ── Insight Cards ─────────────────────────── -->
  <div id="analytics-insights" style="margin-bottom:14px;"></div>

  <!-- ── Baris 1: Income vs Expense + Saldo ────── -->
  <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;margin-bottom:14px;"
       id="analytics-row1">

    <!-- Income vs Expense Bar Chart -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-bottom:16px;">
        <div>
          <div class="card-title" style="margin-bottom:2px;">Income vs Pengeluaran</div>
          <div style="font-size:0.78rem;color:var(--text-muted);" id="analytics-period-label-1">
            6 bulan terakhir
          </div>
        </div>
        <div style="display:flex;gap:14px;">
          <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;
                      color:var(--text-secondary);">
            <span style="width:10px;height:10px;border-radius:3px;
                         background:var(--success);display:inline-block;"></span>
            Income
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;
                      color:var(--text-secondary);">
            <span style="width:10px;height:10px;border-radius:3px;
                         background:var(--danger);display:inline-block;"></span>
            Pengeluaran
          </div>
        </div>
      </div>
      <div style="position:relative;height:240px;">
        <canvas id="chart-bar-income-expense"></canvas>
      </div>
    </div>

    <!-- Saldo Bersih Line Chart -->
    <div class="card">
      <div style="margin-bottom:16px;">
        <div class="card-title" style="margin-bottom:2px;">Saldo Bersih</div>
        <div style="font-size:0.78rem;color:var(--text-muted);" id="analytics-period-label-2">
          Tren per bulan
        </div>
      </div>
      <div style="position:relative;height:240px;">
        <canvas id="chart-line-balance"></canvas>
      </div>
    </div>

  </div>

  <!-- ── Baris 2: Kategori Expense + Tabungan ──── -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;"
       id="analytics-row2">

    <!-- Kategori Pengeluaran -->
    <div class="card">
      <div style="margin-bottom:16px;">
        <div class="card-title" style="margin-bottom:2px;">Kategori Pengeluaran</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">Bulan ini</div>
      </div>
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <!-- Wrapper fix size agar canvas tidak overflow di mobile -->
        <div style="position:relative;width:150px;height:150px;
                    flex-shrink:0;overflow:hidden;">
          <canvas id="chart-pie-category"
            width="150" height="150"
            style="width:150px!important;height:150px!important;
                   max-width:150px;max-height:150px;display:block;">
          </canvas>
          <div id="pie-center-label"
            style="position:absolute;top:50%;left:50%;
                   transform:translate(-50%,-50%);
                   text-align:center;pointer-events:none;"></div>
        </div>
        <div id="cat-legend-analytics"
          style="flex:1;min-width:120px;display:flex;flex-direction:column;gap:7px;">
        </div>
      </div>
    </div>

    <!-- Pertumbuhan Tabungan -->
    <div class="card">
      <div style="margin-bottom:16px;">
        <div class="card-title" style="margin-bottom:2px;">Pertumbuhan Tabungan</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">
          Total akumulasi per goal
        </div>
      </div>
      <div style="position:relative;height:200px;">
        <canvas id="chart-bar-savings"></canvas>
      </div>
    </div>

  </div>

  <!-- ── Baris 3: Aset per Tipe ────────────────── -->
  <div class="card" style="margin-bottom:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:16px;">
      <div>
        <div class="card-title" style="margin-bottom:2px;">Nilai Aset per Tipe</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">Distribusi nilai terkini</div>
      </div>
    </div>
    <div style="position:relative;height:200px;">
      <canvas id="chart-bar-assets"></canvas>
    </div>
  </div>

  <!-- Responsive -->
  <style>
    @media (max-width: 900px) {
      #analytics-row1 { grid-template-columns: 1fr !important; }
      #analytics-row2 { grid-template-columns: 1fr !important; }
    }
    /* Mobile: pie chart + legend stack vertikal & center */
    @media (max-width: 600px) {
      #analytics-row2 .card > div:last-of-type {
        flex-direction: column !important;
        align-items: center !important;
      }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD ALL DATA
// ═══════════════════════════════════════════════════════
async function loadAll() {
  setChartsLoading(true);
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [monthly, categories, goals, txAll, assets] = await Promise.all([
      getMonthlySummary(periodMonths),
      getExpenseByCategoryThisMonth(),
      getSavingGoals(),
      getSavingTransactions(),
      getAssets(),
    ]);

    // Render insights dulu
    renderInsights(monthly, categories);

    // Init semua chart
    initChartBarIncomeExpense(monthly);
    initChartLineBalance(monthly);
    initChartPieCategory(categories);
    initChartBarSavings(goals);
    initChartBarAssets(assets);

    // Update period labels
    updatePeriodLabels();

  } catch (err) {
    console.error("Analytics load error:", err);
    window.showToast("Gagal memuat data analitik.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  PERIOD SELECTOR
// ═══════════════════════════════════════════════════════
async function analyticsSetPeriod(months) {
  periodMonths = months;

  // Update button styles
  [3, 6, 12].forEach(m => {
    const btn = document.getElementById(`period-btn-${m}`);
    if (!btn) return;
    btn.style.background = m === months ? "var(--primary)" : "transparent";
    btn.style.color      = m === months ? "white" : "var(--text-secondary)";
  });

  // Destroy & reload chart income/expense & balance
  ["chart-bar-income-expense", "chart-line-balance"].forEach(id => {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  });

  const monthly = await getMonthlySummary(months);
  renderInsights(monthly, null);
  initChartBarIncomeExpense(monthly);
  initChartLineBalance(monthly);
  updatePeriodLabels();
}

function updatePeriodLabels() {
  const lbl = `${periodMonths} bulan terakhir`;
  const el1 = document.getElementById("analytics-period-label-1");
  const el2 = document.getElementById("analytics-period-label-2");
  if (el1) el1.textContent = lbl;
  if (el2) el2.textContent = `Tren ${lbl}`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: INSIGHT CARDS
// ═══════════════════════════════════════════════════════
function renderInsights(monthly, categories) {
  const el = document.getElementById("analytics-insights");
  if (!el || !monthly || monthly.length === 0) return;

  const now       = monthly[monthly.length - 1];   // bulan ini
  const prev      = monthly[monthly.length - 2];   // bulan lalu

  const incomeNow    = now?.income   || 0;
  const expenseNow   = now?.expense  || 0;
  const incomeChange = prev?.income  > 0
    ? ((incomeNow - prev.income) / prev.income * 100).toFixed(1)
    : null;
  const expenseChange = prev?.expense > 0
    ? ((expenseNow - prev.expense) / prev.expense * 100).toFixed(1)
    : null;

  // Saving rate bulan ini
  const savingRate = incomeNow > 0
    ? Math.round(((incomeNow - expenseNow) / incomeNow) * 100)
    : 0;

  // Bulan paling boros
  const borosMonth = [...monthly].sort((a, b) => b.expense - a.expense)[0];

  // Rata-rata saving rate
  const avgSavingRate = monthly.length > 0
    ? Math.round(
        monthly.reduce((s, m) =>
          s + (m.income > 0 ? ((m.income - m.expense) / m.income) * 100 : 0), 0
        ) / monthly.length
      )
    : 0;

  // Top kategori
  const topCat = categories?.sort((a, b) => b.total - a.total)[0];

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
                gap:12px;margin-bottom:14px;">

      <!-- Income bulan ini -->
      <div class="card" style="border-color:rgba(52,211,153,0.2);
           background:linear-gradient(135deg,rgba(52,211,153,0.06),transparent);">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">Income Bulan Ini</span>
          <div class="stat-icon si-success" style="width:32px;height:32px;border-radius:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;
                    color:var(--success);letter-spacing:-0.02em;">
          ${window.formatRupiah(incomeNow)}
        </div>
        ${incomeChange !== null ? `
          <div style="margin-top:5px;">
            <span class="stat-badge ${parseFloat(incomeChange) >= 0 ? "badge-up" : "badge-down"}"
              style="font-size:0.7rem;">
              ${parseFloat(incomeChange) >= 0 ? "+" : ""}${incomeChange}% vs bulan lalu
            </span>
          </div>` : ""}
      </div>

      <!-- Pengeluaran bulan ini -->
      <div class="card" style="border-color:rgba(248,113,113,0.2);
           background:linear-gradient(135deg,rgba(248,113,113,0.06),transparent);">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">Pengeluaran Bulan Ini</span>
          <div class="stat-icon si-danger" style="width:32px;height:32px;border-radius:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
              <polyline points="17 18 23 18 23 12"/>
            </svg>
          </div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;
                    color:var(--danger);letter-spacing:-0.02em;">
          ${window.formatRupiah(expenseNow)}
        </div>
        ${expenseChange !== null ? `
          <div style="margin-top:5px;">
            <span class="stat-badge ${parseFloat(expenseChange) <= 0 ? "badge-up" : "badge-down"}"
              style="font-size:0.7rem;">
              ${parseFloat(expenseChange) >= 0 ? "+" : ""}${expenseChange}% vs bulan lalu
            </span>
          </div>` : ""}
      </div>

      <!-- Saving Rate -->
      <div class="card" style="border-color:rgba(124,106,247,0.2);
           background:linear-gradient(135deg,rgba(124,106,247,0.06),transparent);">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">Saving Rate</span>
          <div class="stat-icon si-primary" style="width:32px;height:32px;border-radius:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;
                    color:${savingRate >= 20 ? "var(--success)" : savingRate >= 0 ? "var(--warning)" : "var(--danger)"};
                    letter-spacing:-0.02em;">
          ${savingRate}%
        </div>
        <div style="margin-top:5px;">
          <span class="stat-badge badge-neu" style="font-size:0.7rem;">
            Rata-rata ${avgSavingRate}% (${periodMonths} bln)
          </span>
        </div>
      </div>

      <!-- Insight Otomatis -->
      <div class="card" style="border-color:rgba(251,191,36,0.2);
           background:linear-gradient(135deg,rgba(251,191,36,0.06),transparent);">
        <div style="margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">💡 Insight</span>
        </div>
        <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.7;">
          ${generateInsightText(savingRate, avgSavingRate, expenseChange, topCat, borosMonth)}
        </div>
      </div>

    </div>`;
}

function generateInsightText(savingRate, avgSavingRate, expenseChange, topCat, borosMonth) {
  const insights = [];

  if (savingRate >= 30)
    insights.push("🎉 Luar biasa! Saving rate kamu bulan ini sangat baik.");
  else if (savingRate >= 20)
    insights.push("👍 Saving rate kamu sudah cukup baik. Pertahankan!");
  else if (savingRate >= 0)
    insights.push("⚠️ Saving rate masih rendah. Coba kurangi pengeluaran.");
  else
    insights.push("🔴 Pengeluaran melebihi income bulan ini. Hati-hati!");

  if (topCat)
    insights.push(`📊 Pengeluaran terbesar: <strong>${topCat.category}</strong> (${window.formatRupiah(topCat.total)}).`);

  if (expenseChange !== null) {
    const c = parseFloat(expenseChange);
    if (c > 20)
      insights.push(`📈 Pengeluaran naik ${expenseChange}% vs bulan lalu.`);
    else if (c < -10)
      insights.push(`📉 Pengeluaran turun ${Math.abs(expenseChange)}% vs bulan lalu — bagus!`);
  }

  return insights.slice(0, 2).join("<br>") || "Tambahkan data income & pengeluaran untuk melihat insight.";
}

// ═══════════════════════════════════════════════════════
//  CHART 1: Bar — Income vs Expense
// ═══════════════════════════════════════════════════════
function initChartBarIncomeExpense(monthly) {
  const canvas = document.getElementById("chart-bar-income-expense");
  if (!canvas) return;
  if (charts["chart-bar-income-expense"]) {
    charts["chart-bar-income-expense"].destroy();
  }

  charts["chart-bar-income-expense"] = new Chart(canvas, {
    type: "bar",
    data: {
      labels:   monthly.map(m => m.label),
      datasets: [
        {
          label:           "Income",
          data:            monthly.map(m => m.income),
          backgroundColor: "rgba(52,211,153,0.75)",
          borderColor:     "rgba(52,211,153,1)",
          borderWidth:     1.5,
          borderRadius:    6,
          borderSkipped:   false,
        },
        {
          label:           "Pengeluaran",
          data:            monthly.map(m => m.expense),
          backgroundColor: "rgba(248,113,113,0.75)",
          borderColor:     "rgba(248,113,113,1)",
          borderWidth:     1.5,
          borderRadius:    6,
          borderSkipped:   false,
        },
      ],
    },
    options: chartBaseOptions({
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: tooltipStyle({
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${window.formatRupiah(ctx.raw)}`,
          },
        }),
      },
      scales: chartScalesRupiah(),
    }),
  });
}

// ═══════════════════════════════════════════════════════
//  CHART 2: Line — Saldo Bersih
// ═══════════════════════════════════════════════════════
function initChartLineBalance(monthly) {
  const canvas = document.getElementById("chart-line-balance");
  if (!canvas) return;
  if (charts["chart-line-balance"]) {
    charts["chart-line-balance"].destroy();
  }

  const balances    = monthly.map(m => m.balance);
  const isAllPositive = balances.every(b => b >= 0);

  charts["chart-line-balance"] = new Chart(canvas, {
    type: "line",
    data: {
      labels:   monthly.map(m => m.label),
      datasets: [{
        label:           "Saldo Bersih",
        data:            balances,
        borderColor:     "rgba(124,106,247,1)",
        backgroundColor: "rgba(124,106,247,0.1)",
        borderWidth:     2.5,
        pointBackgroundColor: balances.map(b =>
          b >= 0 ? "rgba(52,211,153,1)" : "rgba(248,113,113,1)"
        ),
        pointBorderColor:    "transparent",
        pointRadius:     5,
        pointHoverRadius: 7,
        fill:            true,
        tension:         0.4,
      }],
    },
    options: chartBaseOptions({
      plugins: {
        legend: { display: false },
        tooltip: tooltipStyle({
          callbacks: {
            label: ctx => ` Saldo: ${window.formatRupiah(ctx.raw)}`,
            labelColor: ctx => ({
              backgroundColor: ctx.raw >= 0 ? "rgba(52,211,153,1)" : "rgba(248,113,113,1)",
              borderColor: "transparent",
            }),
          },
        }),
      },
      scales: {
        ...chartScalesRupiah(),
        y: {
          ...chartScalesRupiah().y,
          grid: {
            color: ctx => ctx.tick.value === 0
              ? "rgba(152,152,184,0.4)"
              : "rgba(42,42,69,0.5)",
            lineWidth: ctx => ctx.tick.value === 0 ? 1.5 : 1,
            drawBorder: false,
          },
        },
      },
    }),
  });
}

// ═══════════════════════════════════════════════════════
//  CHART 3: Pie — Kategori Pengeluaran
// ═══════════════════════════════════════════════════════
function initChartPieCategory(categories) {
  const canvas = document.getElementById("chart-pie-category");
  if (!canvas) return;
  if (charts["chart-pie-category"]) {
    charts["chart-pie-category"].destroy();
  }

  const CAT_COLORS = {
    "Makan & Minum":    "#34d399", "Transport":        "#60a5fa",
    "Kuota / Internet": "#a78bfa", "Hiburan":          "#f472b6",
    "Kesehatan":        "#fb923c", "Pendidikan":       "#fbbf24",
    "Belanja":          "#f87171", "Tagihan":          "#94a3b8",
    "Tabungan":         "#7c6af7", "Lainnya":          "#64748b",
  };

  const legendEl = document.getElementById("cat-legend-analytics");
  const centerEl = document.getElementById("pie-center-label");

  if (!categories || categories.length === 0) {
    if (canvas.parentElement) canvas.parentElement.innerHTML = `
      <div style="width:150px;height:150px;border-radius:50%;border:2px dashed var(--border);
                  display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <div style="text-align:center;font-size:0.7rem;color:var(--text-muted);">
          Belum ada<br>pengeluaran
        </div>
      </div>`;
    if (legendEl) legendEl.innerHTML = "";
    return;
  }

  const sorted = [...categories].sort((a, b) => b.total - a.total);
  const total  = sorted.reduce((s, c) => s + c.total, 0);
  const labels = sorted.map(c => c.category);
  const data   = sorted.map(c => c.total);
  const colors = labels.map(l => CAT_COLORS[l] || "#64748b");

  if (centerEl) {
    centerEl.innerHTML = `
      <div style="font-size:0.55rem;color:var(--text-muted);">TOTAL</div>
      <div style="font-family:'Syne',sans-serif;font-size:0.65rem;font-weight:800;
                  color:var(--danger);">
        ${total >= 1_000_000
          ? "Rp" + (total / 1_000_000).toFixed(1) + "jt"
          : "Rp" + (total / 1_000).toFixed(0) + "rb"}
      </div>`;
  }

  charts["chart-pie-category"] = new Chart(canvas, {
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
      responsive:          false,
      maintainAspectRatio: true,
      cutout:              "68%",
      plugins: {
        legend: { display: false },
        tooltip: tooltipStyle({
          callbacks: {
            label: ctx => {
              const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
              return ` ${window.formatRupiah(ctx.raw)} (${pct}%)`;
            },
          },
        }),
      },
    },
  });

  // Legend
  if (legendEl) {
    legendEl.innerHTML = sorted.slice(0, 5).map((c, i) => {
      const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;min-width:0;">
            <span style="width:8px;height:8px;border-radius:2px;flex-shrink:0;
                         background:${colors[i]};"></span>
            <span style="font-size:0.76rem;color:var(--text-secondary);
                         white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${c.category}
            </span>
          </div>
          <span style="font-size:0.74rem;color:var(--text-muted);flex-shrink:0;">${pct}%</span>
        </div>`;
    }).join("");
  }
}

// ═══════════════════════════════════════════════════════
//  CHART 4: Bar — Tabungan per Goal
// ═══════════════════════════════════════════════════════
function initChartBarSavings(goals) {
  const canvas = document.getElementById("chart-bar-savings");
  if (!canvas) return;
  if (charts["chart-bar-savings"]) {
    charts["chart-bar-savings"].destroy();
  }

  if (!goals || goals.length === 0) {
    canvas.parentElement.innerHTML = `
      <div class="empty-state" style="padding:40px;">
        <h3>Belum Ada Tabungan</h3>
        <p>Buat goal tabungan untuk melihat grafik.</p>
      </div>`;
    return;
  }

  const COLORS = [
    "#7c6af7","#34d399","#f472b6","#fbbf24",
    "#60a5fa","#fb923c","#a78bfa","#34d3d3",
  ];

  const labels  = goals.map(g => g.label.length > 12 ? g.label.slice(0, 12) + "…" : g.label);
  const totals  = goals.map(g => g.total  || 0);
  const targets = goals.map(g => g.target || 0);

  charts["chart-bar-savings"] = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label:           "Terkumpul",
          data:            totals,
          backgroundColor: COLORS.map(c => c + "cc"),
          borderColor:     COLORS,
          borderWidth:     1.5,
          borderRadius:    6,
          borderSkipped:   false,
        },
        {
          label:           "Target",
          data:            targets,
          backgroundColor: "rgba(152,152,184,0.1)",
          borderColor:     "rgba(152,152,184,0.4)",
          borderWidth:     1.5,
          borderRadius:    6,
          borderSkipped:   false,
          borderDash:      [4, 4],
        },
      ],
    },
    options: chartBaseOptions({
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display:  true,
          position: "bottom",
          labels: {
            color:    "#9898b8",
            font:     { family: "'DM Sans'", size: 11 },
            boxWidth: 10,
            padding:  14,
          },
        },
        tooltip: tooltipStyle({
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${window.formatRupiah(ctx.raw)}`,
          },
        }),
      },
      scales: chartScalesRupiah(),
    }),
  });
}

// ═══════════════════════════════════════════════════════
//  CHART 5: Bar — Aset per Tipe
// ═══════════════════════════════════════════════════════
function initChartBarAssets(assets) {
  const canvas = document.getElementById("chart-bar-assets");
  if (!canvas) return;
  if (charts["chart-bar-assets"]) {
    charts["chart-bar-assets"].destroy();
  }

  if (!assets || assets.length === 0) {
    canvas.parentElement.innerHTML += `
      <div class="empty-state" style="padding:40px;">
        <h3>Belum Ada Aset</h3>
        <p>Tambahkan aset untuk melihat grafik.</p>
      </div>`;
    return;
  }

  const TYPE_COLORS = {
    "Emas": "#fbbf24", "Investasi": "#34d399", "Saham": "#60a5fa",
    "Reksa Dana": "#a78bfa", "Kripto": "#f472b6", "Properti": "#34d3d3",
    "Kendaraan": "#fb923c", "Elektronik": "#818cf8", "Lainnya": "#94a3b8",
  };

  // Agregasi per tipe
  const typeMap = {};
  assets.forEach(a => {
    typeMap[a.type] = (typeMap[a.type] || 0) + (a.value || 0);
  });
  const sorted = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  charts["chart-bar-assets"] = new Chart(canvas, {
    type: "bar",
    data: {
      labels:   sorted.map(([t]) => t),
      datasets: [{
        label:           "Nilai Aset",
        data:            sorted.map(([, v]) => v),
        backgroundColor: sorted.map(([t]) => (TYPE_COLORS[t] || "#94a3b8") + "cc"),
        borderColor:     sorted.map(([t]) => TYPE_COLORS[t]  || "#94a3b8"),
        borderWidth:     1.5,
        borderRadius:    8,
        borderSkipped:   false,
      }],
    },
    options: chartBaseOptions({
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: tooltipStyle({
          callbacks: {
            label: ctx => ` ${window.formatRupiah(ctx.raw)}`,
          },
        }),
      },
      scales: {
        x: {
          grid:  { color: "rgba(42,42,69,0.5)", drawBorder: false },
          ticks: {
            color:    "#5a5a78",
            font:     { family: "'DM Sans'", size: 11 },
            callback: val => {
              if (val >= 1_000_000) return "Rp" + (val / 1_000_000).toFixed(1) + "jt";
              if (val >= 1_000)     return "Rp" + (val / 1_000).toFixed(0)     + "rb";
              return "Rp" + val;
            },
          },
          beginAtZero: true,
        },
        y: {
          grid:  { display: false },
          ticks: { color: "#9898b8", font: { family: "'DM Sans'", size: 12 } },
        },
      },
    }),
  });
}

// ═══════════════════════════════════════════════════════
//  CHART HELPERS
// ═══════════════════════════════════════════════════════
function chartBaseOptions(extra = {}) {
  return {
    responsive:          true,
    maintainAspectRatio: false,
    ...extra,
  };
}

function tooltipStyle(extra = {}) {
  return {
    backgroundColor: "rgba(20,20,40,0.95)",
    titleColor:      "#eeeef8",
    bodyColor:       "#9898b8",
    borderColor:     "rgba(42,42,69,0.8)",
    borderWidth:     1,
    padding:         10,
    cornerRadius:    8,
    ...extra,
  };
}

function chartScalesRupiah() {
  return {
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
          if (val >= 1_000)     return "Rp" + (val / 1_000).toFixed(0)     + "rb";
          return "Rp" + val;
        },
      },
      beginAtZero: true,
    },
  };
}

// ═══════════════════════════════════════════════════════
//  LOADING STATE
// ═══════════════════════════════════════════════════════
function setChartsLoading(loading) {
  if (!loading) return;
}

// ═══════════════════════════════════════════════════════
//  EXPOSE ke window
// ═══════════════════════════════════════════════════════
window.analyticsSetPeriod = analyticsSetPeriod;
