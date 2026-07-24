// ═══════════════════════════════════════════════════════
//  pages/savings.js
//  Halaman Tabungan — kelola goals tabungan & transaksi.
//
//  Fitur:
//   - Kartu per goal tabungan dengan progress bar
//   - Total semua tabungan di header
//   - Tambah / edit / hapus goal tabungan
//   - Setor & tarik dana per goal
//   - Riwayat transaksi per goal (expandable)
//   - Indikator progress: belum/hampir/tercapai
//
//  Lifecycle:
//   init()    → dipanggil router
//   destroy() → cleanup state
// ═══════════════════════════════════════════════════════

import {
  getSavingGoals,
  addSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  addSavingTransaction,
  getSavingTransactions,
  deleteSavingTransaction,
  getTotalSavings,
} from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let allGoals        = [];
let editingGoalId   = null;
let txModalGoalId   = null;   // goal yang sedang dilihat riwayatnya

// ── Warna kartu goal (cycling) ─────────────────────────
const GOAL_ACCENTS = [
  { from: "#7c6af7", to: "#5b4bd4", glow: "rgba(124,106,247,0.25)" },
  { from: "#34d399", to: "#059669", glow: "rgba(52,211,153,0.25)"  },
  { from: "#f472b6", to: "#db2777", glow: "rgba(244,114,182,0.25)" },
  { from: "#fbbf24", to: "#d97706", glow: "rgba(251,191,36,0.25)"  },
  { from: "#60a5fa", to: "#2563eb", glow: "rgba(96,165,250,0.25)"  },
  { from: "#fb923c", to: "#ea580c", glow: "rgba(251,146,60,0.25)"  },
];

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-savings");
  if (!container) return;

  container.innerHTML = renderShell();
  await loadGoals();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  allGoals      = [];
  editingGoalId = null;
  txModalGoalId = null;
}

// ═══════════════════════════════════════════════════════
//  RENDER: SHELL HALAMAN
// ═══════════════════════════════════════════════════════
function renderShell() {
  return `
  <!-- ── Header ───────────────────────────────── -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;
              flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <h2 style="font-family:'Syne',sans-serif;font-size:1.25rem;font-weight:800;
                 color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:4px;">
        Tabungan
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Kelola goals tabungan dan pantau progressnya.
      </p>
    </div>
    <button onclick="savingsOpenAddGoal()"
      style="display:flex;align-items:center;gap:7px;padding:9px 18px;
             background:linear-gradient(135deg,var(--primary),var(--primary-dark));
             border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
             font-size:0.84rem;font-weight:600;cursor:pointer;
             box-shadow:0 4px 14px rgba(124,106,247,0.3);transition:all .2s;"
      onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(124,106,247,0.45)'"
      onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 14px rgba(124,106,247,0.3)'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Goal
    </button>
  </div>

  <!-- ── Summary Banner ────────────────────────── -->
  <div id="savings-summary-banner" style="margin-bottom:20px;"></div>

  <!-- ── Goals Grid ────────────────────────────── -->
  <div id="savings-goals-grid"
    style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
    <!-- Diisi oleh renderGoalsGrid() -->
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadGoals() {
  setGoalsLoading(true);
  try {
    allGoals = await getSavingGoals();
    const total = allGoals.reduce((s, g) => s + (g.total || 0), 0);
    renderSummaryBanner(total);
    renderGoalsGrid();
  } catch (err) {
    console.error("Load savings error:", err);
    window.showToast("Gagal memuat data tabungan.", "error");
  } finally {
    setGoalsLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: SUMMARY BANNER
// ═══════════════════════════════════════════════════════
function renderSummaryBanner(total) {
  const el = document.getElementById("savings-summary-banner");
  if (!el) return;

  const goalsCount    = allGoals.length;
  const achieved      = allGoals.filter(g => g.target > 0 && g.total >= g.target).length;
  const inProgress    = allGoals.filter(g => g.total > 0 && (g.target === 0 || g.total < g.target)).length;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">

      <div class="card" style="border-color:rgba(124,106,247,0.25);
           background:linear-gradient(135deg,rgba(124,106,247,0.08),transparent);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">Total Tabungan</span>
          <div class="stat-icon si-primary" style="width:34px;height:34px;border-radius:9px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
            </svg>
          </div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                    color:var(--primary-light);letter-spacing:-0.02em;">
          ${window.formatRupiah(total)}
        </div>
      </div>

      <div class="card">
        <div style="margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">Total Goals</span>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                    color:var(--text-primary);letter-spacing:-0.02em;">
          ${goalsCount}
          <span style="font-size:0.82rem;font-family:'DM Sans',sans-serif;
                       color:var(--text-muted);font-weight:400;">goals</span>
        </div>
      </div>

      <div class="card">
        <div style="margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">Tercapai</span>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                    color:var(--success);letter-spacing:-0.02em;">
          ${achieved}
          <span style="font-size:0.82rem;font-family:'DM Sans',sans-serif;
                       color:var(--text-muted);font-weight:400;">goal</span>
        </div>
      </div>

      <div class="card">
        <div style="margin-bottom:8px;">
          <span class="card-title" style="margin-bottom:0;">Sedang Berjalan</span>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;
                    color:var(--warning);letter-spacing:-0.02em;">
          ${inProgress}
          <span style="font-size:0.82rem;font-family:'DM Sans',sans-serif;
                       color:var(--text-muted);font-weight:400;">goal</span>
        </div>
      </div>

    </div>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: GOALS GRID
// ═══════════════════════════════════════════════════════
function renderGoalsGrid() {
  const el = document.getElementById("savings-goals-grid");
  if (!el) return;

  if (allGoals.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:60px 24px;grid-column:1/-1;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3"/>
          <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
        </svg>
        <h3>Belum Ada Goal Tabungan</h3>
        <p style="margin-bottom:18px;">
          Buat goal pertamamu — nabung emas, beli HP, liburan, apapun!
        </p>
        <button onclick="savingsOpenAddGoal()"
          style="padding:9px 22px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
                 border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
                 font-size:0.84rem;font-weight:600;cursor:pointer;">
          + Buat Goal Pertama
        </button>
      </div>`;
    return;
  }

  el.innerHTML = allGoals.map((goal, idx) =>
    renderGoalCard(goal, idx)
  ).join("");
}

function renderGoalCard(goal, idx) {
  const accent   = GOAL_ACCENTS[idx % GOAL_ACCENTS.length];
  const total    = goal.total    || 0;
  const target   = goal.target   || 0;
  const hasTarget = target > 0;
  const pct      = hasTarget ? Math.min(100, Math.round((total / target) * 100)) : null;
  const remaining = hasTarget ? Math.max(0, target - total) : null;

  // Status badge
  let statusBadge = "";
  let progressColor = accent.from;
  if (hasTarget) {
    if (pct >= 100) {
      statusBadge   = `<span class="chip chip-success" style="font-size:0.7rem;">🎉 Tercapai!</span>`;
      progressColor = "var(--success)";
    } else if (pct >= 75) {
      statusBadge   = `<span class="chip chip-warning" style="font-size:0.7rem;">🔥 Hampir sampai</span>`;
      progressColor = "var(--warning)";
    } else if (pct >= 40) {
      statusBadge   = `<span class="chip chip-primary" style="font-size:0.7rem;">🚀 Sedang berjalan</span>`;
    } else {
      statusBadge   = `<span class="chip chip-neutral" style="font-size:0.7rem;">💪 Baru mulai</span>`;
    }
  } else {
    statusBadge = `<span class="chip chip-neutral" style="font-size:0.7rem;">📦 Tanpa target</span>`;
  }

  return `
    <div class="card" style="padding:0;overflow:hidden;
                              box-shadow:0 4px 24px ${accent.glow};">
      <!-- Card Top Accent -->
      <div style="height:4px;background:linear-gradient(90deg,${accent.from},${accent.to});"></div>

      <div style="padding:20px 22px;">
        <!-- Goal Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;
                    gap:12px;margin-bottom:14px;">
          <div style="min-width:0;">
            <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;
                        color:var(--text-primary);letter-spacing:-0.01em;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${goal.label}
            </div>
            <div style="margin-top:5px;">${statusBadge}</div>
          </div>
          <!-- Actions -->
          <div style="display:flex;gap:5px;flex-shrink:0;">
            <button class="action-btn edit" title="Edit Goal"
              onclick="savingsOpenEditGoal('${goal.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn del" title="Hapus Goal"
              onclick="savingsConfirmDeleteGoal('${goal.id}','${escapeStr(goal.label)}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Nominal -->
        <div style="margin-bottom:${hasTarget ? "12px" : "16px"};">
          <div style="font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;
                      letter-spacing:-0.02em;color:${accent.from};">
            ${window.formatRupiah(total)}
          </div>
          ${hasTarget ? `
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">
              dari target ${window.formatRupiah(target)}
            </div>` : `
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">
              Tidak ada target
            </div>`}
        </div>

        <!-- Progress Bar -->
        ${hasTarget ? `
          <div style="margin-bottom:6px;">
            <div class="progress-track">
              <div class="progress-fill"
                style="width:${pct}%;background:linear-gradient(90deg,${accent.from},${accent.to});">
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:5px;">
              <span style="font-size:0.75rem;color:var(--text-muted);">${pct}% tercapai</span>
              ${remaining > 0
                ? `<span style="font-size:0.75rem;color:var(--text-muted);">
                    Kurang ${window.formatRupiah(remaining)}
                   </span>`
                : `<span style="font-size:0.75rem;color:var(--success);font-weight:600;">
                    ✓ Terpenuhi
                   </span>`}
            </div>
          </div>` : ""}

        ${goal.note ? `
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;
                      font-style:italic;border-left:2px solid var(--border);
                      padding-left:8px;">
            ${goal.note}
          </div>` : `<div style="margin-bottom:14px;"></div>`}

        <!-- Action Buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;">
          <button onclick="savingsOpenTx('${goal.id}','in','${escapeStr(goal.label)}')"
            style="padding:8px 4px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.25);
                   border-radius:8px;color:var(--success);font-family:'DM Sans',sans-serif;
                   font-size:0.78rem;font-weight:600;cursor:pointer;transition:all .2s;
                   display:flex;align-items:center;justify-content:center;gap:4px;"
            onmouseover="this.style.background='rgba(52,211,153,0.22)'"
            onmouseout="this.style.background='rgba(52,211,153,0.12)'">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Setor
          </button>
          <button onclick="savingsOpenTx('${goal.id}','out','${escapeStr(goal.label)}')"
            style="padding:8px 4px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.22);
                   border-radius:8px;color:var(--danger);font-family:'DM Sans',sans-serif;
                   font-size:0.78rem;font-weight:600;cursor:pointer;transition:all .2s;
                   display:flex;align-items:center;justify-content:center;gap:4px;"
            onmouseover="this.style.background='rgba(248,113,113,0.2)'"
            onmouseout="this.style.background='rgba(248,113,113,0.1)'">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tarik
          </button>
          <button onclick="savingsOpenHistory('${goal.id}','${escapeStr(goal.label)}')"
            style="padding:8px 4px;background:var(--surface-el);border:1px solid var(--border);
                   border-radius:8px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
                   font-size:0.78rem;font-weight:500;cursor:pointer;transition:all .2s;
                   display:flex;align-items:center;justify-content:center;gap:4px;"
            onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary-light)'"
            onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Riwayat
          </button>
        </div>

      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  MODAL: TAMBAH / EDIT GOAL
// ═══════════════════════════════════════════════════════
function savingsOpenAddGoal() {
  editingGoalId = null;
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Goal Tabungan
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderGoalForm()}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="savingsSaveGoal()" id="savings-goal-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);">
        Buat Goal
      </button>
    </div>`);
}

function savingsOpenEditGoal(id) {
  const goal = allGoals.find(g => g.id === id);
  if (!goal) return;
  editingGoalId = id;
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit Goal
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderGoalForm(goal)}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="savingsSaveGoal()" id="savings-goal-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);">
        Simpan Perubahan
      </button>
    </div>`);
}

function renderGoalForm(data = {}) {
  return `
    <div class="form-group">
      <label class="form-label">Nama Goal</label>
      <input type="text" id="f-goal-label" class="form-input"
        placeholder="Contoh: Beli HP, Liburan Bali, Nabung Emas"
        value="${data.label || ""}" maxlength="60" />
    </div>
    <div class="form-group">
      <label class="form-label">
        Target Dana (Rp)
        <span style="color:var(--text-muted);font-weight:400;"> — opsional</span>
      </label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-goal-target" class="form-input"
          style="padding-left:36px;" placeholder="0 = tanpa target"
          value="${data.target || ""}" min="0" />
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:5px;">
        Biarkan 0 jika kamu tidak punya target nominal.
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">
        Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span>
      </label>
      <input type="text" id="f-goal-note" class="form-input"
        placeholder="Misal: Target beli akhir tahun"
        value="${data.note || ""}" maxlength="150" />
    </div>`;
}

async function savingsSaveGoal() {
  const label  = document.getElementById("f-goal-label")?.value?.trim();
  const target = parseFloat(document.getElementById("f-goal-target")?.value) || 0;
  const note   = document.getElementById("f-goal-note")?.value?.trim() || "";

  if (!label) { window.showToast("Nama goal wajib diisi.", "error"); return; }

  const btn = document.getElementById("savings-goal-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    if (editingGoalId) {
      await updateSavingGoal(editingGoalId, { label, target, note });
      window.showToast("Goal berhasil diperbarui! ✏️", "success");
    } else {
      await addSavingGoal({ label, target, note });
      window.showToast("Goal tabungan berhasil dibuat! 🎯", "success");
    }
    window.closeModal();
    await loadGoals();
  } catch (err) {
    console.error("Save goal error:", err);
    window.showToast("Gagal menyimpan goal.", "error");
    if (btn) { btn.disabled = false; btn.innerHTML = editingGoalId ? "Simpan Perubahan" : "Buat Goal"; }
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: KONFIRMASI HAPUS GOAL
// ═══════════════════════════════════════════════════════
function savingsConfirmDeleteGoal(id, label) {
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Goal
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);
                border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px;">
        Kamu akan menghapus goal:
      </div>
      <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);">${label}</div>
    </div>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-bottom:20px;line-height:1.6;">
      ⚠️ Semua riwayat transaksi goal ini juga akan dihapus.<br>
      Data yang dihapus tidak bisa dikembalikan.
    </p>
    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="savingsDeleteGoal('${id}')"
        style="flex:1;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Ya, Hapus
      </button>
    </div>`);
}

async function savingsDeleteGoal(id) {
  try {
    await deleteSavingGoal(id);
    window.closeModal();
    window.showToast("Goal berhasil dihapus.", "info");
    await loadGoals();
  } catch (err) {
    console.error("Delete goal error:", err);
    window.showToast("Gagal menghapus goal.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: SETOR / TARIK
// ═══════════════════════════════════════════════════════
function savingsOpenTx(goalId, type, goalLabel) {
  const isDeposit  = type === "in";
  const color      = isDeposit ? "var(--success)" : "var(--danger)";
  const gradFrom   = isDeposit ? "var(--success)" : "var(--danger)";
  const gradTo     = isDeposit ? "#059669" : "#dc2626";
  const glow       = isDeposit ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)";
  const title      = isDeposit ? "Setor ke Tabungan" : "Tarik dari Tabungan";
  const today      = new Date().toISOString().split("T")[0];

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2">
        ${isDeposit
          ? `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`
          : `<line x1="5" y1="12" x2="19" y2="12"/>`}
      </svg>
      ${title}
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div style="background:var(--surface-el);border-radius:9px;padding:10px 14px;
                margin-bottom:18px;font-size:0.82rem;color:var(--text-secondary);">
      Goal: <strong style="color:var(--text-primary);">${goalLabel}</strong>
    </div>

    <div class="form-group">
      <label class="form-label">Tanggal</label>
      <input type="date" id="f-tx-date" class="form-input"
        value="${today}" max="${today}" />
    </div>
    <div class="form-group">
      <label class="form-label">Jumlah (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-tx-amount" class="form-input"
          style="padding-left:36px;" placeholder="0" min="1" />
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">
        Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span>
      </label>
      <input type="text" id="f-tx-note" class="form-input"
        placeholder="${isDeposit ? "Contoh: Gajian bulan ini" : "Contoh: Keperluan darurat"}"
        maxlength="150" />
    </div>

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="savingsSaveTx('${goalId}','${type}')" id="savings-tx-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,${gradFrom},${gradTo});
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px ${glow};">
        ${isDeposit ? "Setor Sekarang" : "Tarik Sekarang"}
      </button>
    </div>`);
}

async function savingsSaveTx(goalId, type) {
  const date   = document.getElementById("f-tx-date")?.value;
  const amount = parseFloat(document.getElementById("f-tx-amount")?.value);
  const note   = document.getElementById("f-tx-note")?.value?.trim() || "";

  if (!date)              { window.showToast("Tanggal wajib diisi.", "error"); return; }
  if (!amount || amount <= 0) { window.showToast("Jumlah harus lebih dari 0.", "error"); return; }

  const btn = document.getElementById("savings-tx-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    await addSavingTransaction({ goalId, type, amount, date, note });
    const label = type === "in" ? "Setoran berhasil dicatat! 💰" : "Penarikan berhasil dicatat! 📤";
    window.showToast(label, "success");
    window.closeModal();
    await loadGoals();
  } catch (err) {
    console.error("Save transaction error:", err);
    window.showToast("Gagal menyimpan transaksi.", "error");
    if (btn) { btn.disabled = false; btn.innerHTML = type === "in" ? "Setor Sekarang" : "Tarik Sekarang"; }
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: RIWAYAT TRANSAKSI PER GOAL
// ═══════════════════════════════════════════════════════
async function savingsOpenHistory(goalId, goalLabel) {
  txModalGoalId = goalId;

  // Tampilkan modal loading dulu
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Riwayat — ${goalLabel}
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div style="text-align:center;padding:32px;color:var(--text-muted);">
      <div class="spinner" style="margin:0 auto 10px;border-color:rgba(124,106,247,.2);
           border-top-color:var(--primary);"></div>
      Memuat riwayat...
    </div>`);

  try {
    const txs = await getSavingTransactions(goalId);
    renderHistoryModal(goalId, goalLabel, txs);
  } catch (err) {
    console.error("Load history error:", err);
    window.showToast("Gagal memuat riwayat.", "error");
  }
}

function renderHistoryModal(goalId, goalLabel, txs) {
  const modal = document.getElementById("global-modal-body");
  if (!modal) return;

  const goal  = allGoals.find(g => g.id === goalId);
  const total = goal?.total || 0;

  modal.innerHTML = `
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Riwayat — ${goalLabel}
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Saldo sekarang -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                background:var(--surface-el);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
      <span style="font-size:0.82rem;color:var(--text-secondary);">Saldo saat ini</span>
      <span style="font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:800;
                   color:var(--primary-light);">
        ${window.formatRupiah(total)}
      </span>
    </div>

    <!-- List transaksi -->
    <div style="max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:0;">
      ${txs.length === 0
        ? `<div class="empty-state" style="padding:32px;">
             <h3>Belum ada transaksi</h3>
             <p>Setor atau tarik dana untuk memulai.</p>
           </div>`
        : txs.map(tx => {
            const isIn   = tx.type === "in";
            const color  = isIn ? "var(--success)" : "var(--danger)";
            const sign   = isIn ? "+" : "-";
            const icon   = isIn
              ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
              : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:11px 0;
                          border-bottom:1px solid rgba(42,42,69,0.5);">
                <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;
                            background:${isIn ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.1)"};
                            display:flex;align-items:center;justify-content:center;">
                  ${icon}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.84rem;font-weight:500;color:var(--text-primary);">
                    ${isIn ? "Setoran" : "Penarikan"}
                  </div>
                  ${tx.note
                    ? `<div style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;
                                   overflow:hidden;text-overflow:ellipsis;">${tx.note}</div>`
                    : `<div style="font-size:0.75rem;color:var(--text-muted);">
                         ${formatDateDisplay(tx.date)}
                       </div>`}
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-family:'Syne',sans-serif;font-size:0.88rem;
                               font-weight:700;color:${color};">
                    ${sign}${window.formatRupiah(tx.amount)}
                  </div>
                  ${tx.note
                    ? `<div style="font-size:0.72rem;color:var(--text-muted);">
                         ${formatDateDisplay(tx.date)}
                       </div>`
                    : ""}
                </div>
                <button class="action-btn del" title="Hapus"
                  onclick="savingsDeleteTx('${tx.id}','${goalId}','${escapeStr(goalLabel)}')"
                  style="flex-shrink:0;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>`;
          }).join("")}
    </div>

    <button onclick="closeModal()"
      style="width:100%;margin-top:16px;padding:10px;background:var(--surface-el);
             border:1px solid var(--border);border-radius:9px;color:var(--text-secondary);
             font-family:'DM Sans',sans-serif;font-size:0.875rem;font-weight:500;cursor:pointer;">
      Tutup
    </button>`;
}

async function savingsDeleteTx(txId, goalId, goalLabel) {
  try {
    await deleteSavingTransaction(txId);
    window.showToast("Transaksi dihapus.", "info");
    const txs = await getSavingTransactions(goalId);
    await loadGoals();
    renderHistoryModal(goalId, goalLabel, txs);
  } catch (err) {
    console.error("Delete tx error:", err);
    window.showToast("Gagal menghapus transaksi.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function setGoalsLoading(loading) {
  const el = document.getElementById("savings-goals-grid");
  if (!el || !loading) return;
  el.innerHTML = Array(3).fill(`
    <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:14px;
                padding:22px;animation:skPulse 1.4s ease infinite;">
      <div style="height:12px;width:50%;background:var(--surface-el);border-radius:6px;margin-bottom:12px;"></div>
      <div style="height:28px;width:65%;background:var(--surface-el);border-radius:6px;margin-bottom:16px;"></div>
      <div style="height:7px;width:100%;background:var(--surface-el);border-radius:99px;"></div>
    </div>`).join("");
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

function escapeStr(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
//  EXPOSE ke window
// ═══════════════════════════════════════════════════════
window.savingsOpenAddGoal        = savingsOpenAddGoal;
window.savingsOpenEditGoal       = savingsOpenEditGoal;
window.savingsSaveGoal           = savingsSaveGoal;
window.savingsConfirmDeleteGoal  = savingsConfirmDeleteGoal;
window.savingsDeleteGoal         = savingsDeleteGoal;
window.savingsOpenTx             = savingsOpenTx;
window.savingsSaveTx             = savingsSaveTx;
window.savingsOpenHistory        = savingsOpenHistory;
window.savingsDeleteTx           = savingsDeleteTx;
