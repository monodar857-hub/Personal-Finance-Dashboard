
import {
  getEmergencyData,
  setEmergencyTarget,
  addEmergencyTransaction,
  getEmergencyTransactions,
  deleteEmergencyTransaction,
  getTotalExpenseThisMonth,
} from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let emergencyData = { total: 0, target: 0 };
let allTx         = [];

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-emergency");
  if (!container) return;

  container.innerHTML = renderShell();
  await loadData();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  emergencyData = { total: 0, target: 0 };
  allTx         = [];
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
        Dana Darurat
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Jaring pengaman keuanganmu untuk situasi tak terduga.
      </p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="emergencyOpenSetTarget()"
        style="display:flex;align-items:center;gap:7px;padding:9px 16px;
               background:var(--surface-card);border:1px solid var(--border);border-radius:9px;
               color:var(--text-secondary);font-family:'DM Sans',sans-serif;font-size:0.84rem;
               font-weight:500;cursor:pointer;transition:all .2s;"
        onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--text-primary)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Set Target
      </button>
      <button onclick="emergencyOpenTx('in')"
        style="display:flex;align-items:center;gap:7px;padding:9px 18px;
               background:linear-gradient(135deg,#3b82f6,#1d4ed8);border:none;border-radius:9px;
               color:white;font-family:'DM Sans',sans-serif;font-size:0.84rem;font-weight:600;
               cursor:pointer;box-shadow:0 4px 14px rgba(59,130,246,0.3);transition:all .2s;"
        onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(59,130,246,0.45)'"
        onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 14px rgba(59,130,246,0.3)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Tambah Dana
      </button>
    </div>
  </div>

  <!-- ── Konten utama ──────────────────────────── -->
  <div id="emergency-main-content">
    <!-- Diisi loadData() -->
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;
                padding:80px;color:var(--text-muted);font-size:0.85rem;">
      <div class="spinner" style="border-color:rgba(59,130,246,0.2);border-top-color:#3b82f6;"></div>
      Memuat data...
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadData() {
  try {
    const [data, txs, monthlyExpense] = await Promise.all([
      getEmergencyData(),
      getEmergencyTransactions(),
      getTotalExpenseThisMonth(),
    ]);

    emergencyData = data;
    allTx         = txs;

    renderMainContent(monthlyExpense);
  } catch (err) {
    console.error("Load emergency error:", err);
    window.showToast("Gagal memuat data dana darurat.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: MAIN CONTENT
// ═══════════════════════════════════════════════════════
function renderMainContent(monthlyExpense) {
  const el = document.getElementById("emergency-main-content");
  if (!el) return;

  const { total = 0, target = 0 } = emergencyData;
  const hasTarget  = target > 0;
  const pct        = hasTarget ? Math.min(100, (total / target) * 100) : null;
  const status     = getStatus(total, target);
  const monthsCovered = monthlyExpense > 0 ? (total / monthlyExpense).toFixed(1) : null;

  el.innerHTML = `
  <!-- ── Baris 1: Status Hero + Info Cards ─────── -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;"
       id="emergency-top-row">

    <!-- Status Hero Card -->
    <div class="card" style="padding:28px 28px;
         border-color:${status.borderColor};
         background:linear-gradient(135deg,${status.bgFrom},transparent);
         position:relative;overflow:hidden;">

      <!-- Decorative background circle -->
      <div style="position:absolute;right:-40px;top:-40px;width:180px;height:180px;
                  border-radius:50%;background:${status.accentBg};pointer-events:none;"></div>

      <div style="position:relative;z-index:1;">
        <!-- Status Badge -->
        <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;
                    background:${status.badgeBg};border:1px solid ${status.badgeBorder};
                    border-radius:99px;margin-bottom:18px;">
          <span style="font-size:14px;">${status.emoji}</span>
          <span style="font-size:0.8rem;font-weight:700;color:${status.color};
                       font-family:'Syne',sans-serif;letter-spacing:0.02em;">
            ${status.label}
          </span>
        </div>

        <!-- Nominal -->
        <div style="font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;
                    letter-spacing:-0.03em;color:${status.color};margin-bottom:6px;
                    line-height:1.1;">
          ${window.formatRupiah(total)}
        </div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:${hasTarget ? "20px" : "0"};">
          Total dana darurat saat ini
        </div>

        <!-- Progress Bar (jika ada target) -->
        ${hasTarget ? `
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:7px;">
              <span style="font-size:0.78rem;color:var(--text-secondary);">
                Progress ke target
              </span>
              <span style="font-size:0.78rem;font-weight:700;color:${status.color};">
                ${pct.toFixed(1)}%
              </span>
            </div>
            <div class="progress-track" style="height:9px;">
              <div style="height:100%;border-radius:99px;transition:width .6s ease;
                          width:${pct}%;
                          background:linear-gradient(90deg,${status.gradFrom},${status.gradTo});">
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:7px;">
              <span style="font-size:0.75rem;color:var(--text-muted);">
                Rp 0
              </span>
              <span style="font-size:0.75rem;color:var(--text-muted);">
                Target: ${window.formatRupiah(target)}
              </span>
            </div>
          </div>` : `
          <div style="margin-top:12px;">
            <button onclick="emergencyOpenSetTarget()"
              style="font-size:0.8rem;color:var(--primary-light);background:none;border:none;
                     cursor:pointer;font-family:'DM Sans',sans-serif;padding:0;
                     text-decoration:underline;text-underline-offset:3px;">
              + Set target dana darurat →
            </button>
          </div>`}
      </div>
    </div>

    <!-- Info Cards (kanan) -->
    <div style="display:flex;flex-direction:column;gap:12px;">

      <!-- Bulan pengeluaran ter-cover -->
      <div class="card" style="flex:1;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="stat-icon" style="width:42px;height:42px;border-radius:11px;
               background:rgba(59,130,246,0.12);color:#3b82f6;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <div class="card-title" style="margin-bottom:3px;">Bulan Tercover</div>
            <div style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;
                        color:var(--text-primary);letter-spacing:-0.02em;">
              ${monthsCovered !== null
                ? `${monthsCovered} <span style="font-size:0.8rem;font-family:'DM Sans',sans-serif;
                               color:var(--text-muted);font-weight:400;">bulan</span>`
                : `<span style="font-size:0.85rem;color:var(--text-muted);font-weight:400;">
                     Belum ada data pengeluaran
                   </span>`}
            </div>
            ${monthlyExpense > 0
              ? `<div style="font-size:0.73rem;color:var(--text-muted);margin-top:2px;">
                   Pengeluaran bulan ini ${window.formatRupiah(monthlyExpense)}
                 </div>`
              : ""}
          </div>
        </div>
        <!-- Rekomendasi -->
        ${monthsCovered !== null ? `
          <div style="margin-top:12px;padding:10px 12px;border-radius:8px;
                      background:${parseFloat(monthsCovered) >= 6
                        ? "rgba(52,211,153,0.1)" : parseFloat(monthsCovered) >= 3
                        ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)"};
                      border:1px solid ${parseFloat(monthsCovered) >= 6
                        ? "rgba(52,211,153,0.2)" : parseFloat(monthsCovered) >= 3
                        ? "rgba(251,191,36,0.2)" : "rgba(248,113,113,0.2)"};">
            <div style="font-size:0.75rem;color:var(--text-secondary);line-height:1.6;">
              ${parseFloat(monthsCovered) >= 6
                ? "✅ Ideal! Dana darurat sudah cukup untuk 6+ bulan pengeluaran."
                : parseFloat(monthsCovered) >= 3
                ? "⚠️ Cukup untuk 3–6 bulan. Idealnya siapkan untuk 6 bulan pengeluaran."
                : "🔴 Masih kurang. Usahakan simpan minimal 3–6 bulan pengeluaran."}
            </div>
          </div>` : ""}
      </div>

      <!-- Target & Kekurangan -->
      ${hasTarget ? `
        <div class="card" style="flex:1;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <div class="card-title" style="margin-bottom:4px;">Target</div>
              <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;
                          color:var(--text-primary);">
                ${window.formatRupiah(target)}
              </div>
            </div>
            <div>
              <div class="card-title" style="margin-bottom:4px;">
                ${total >= target ? "Kelebihan" : "Kekurangan"}
              </div>
              <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;
                          color:${total >= target ? "var(--success)" : "var(--danger)"};">
                ${window.formatRupiah(Math.abs(target - total))}
              </div>
            </div>
          </div>
          <button onclick="emergencyOpenSetTarget()"
            style="width:100%;margin-top:12px;padding:7px;background:var(--surface-el);
                   border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);
                   font-family:'DM Sans',sans-serif;font-size:0.78rem;font-weight:500;cursor:pointer;
                   transition:all .2s;"
            onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary-light)'"
            onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
            ✏️ Ubah Target
          </button>
        </div>` : `
        <div class="card" style="flex:1;display:flex;align-items:center;justify-content:center;
             flex-direction:column;gap:8px;text-align:center;padding:20px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" stroke-width="1.5" style="opacity:.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style="font-size:0.82rem;color:var(--text-muted);">Belum ada target</div>
          <button onclick="emergencyOpenSetTarget()"
            style="padding:7px 16px;background:rgba(124,106,247,0.12);border:1px solid rgba(124,106,247,0.25);
                   border-radius:8px;color:var(--primary-light);font-family:'DM Sans',sans-serif;
                   font-size:0.8rem;font-weight:600;cursor:pointer;">
            Set Target Sekarang
          </button>
        </div>`}

    </div>
  </div>

  <!-- ── Baris 2: Quick Actions ─────────────────── -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;"
       id="emergency-actions-row">

    <button onclick="emergencyOpenTx('in')"
      style="display:flex;align-items:center;justify-content:center;gap:10px;
             padding:14px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);
             border-radius:11px;color:var(--success);font-family:'DM Sans',sans-serif;
             font-size:0.875rem;font-weight:600;cursor:pointer;"
      onmouseover="this.style.background='rgba(52,211,153,0.2)'"
      onmouseout="this.style.background='rgba(52,211,153,0.1)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Dana
    </button>

    <button onclick="emergencyOpenTx('out')"
      style="display:flex;align-items:center;justify-content:center;gap:10px;
             padding:14px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.22);
             border-radius:11px;color:var(--danger);font-family:'DM Sans',sans-serif;
             font-size:0.875rem;font-weight:600;cursor:pointer;"
      onmouseover="this.style.background='rgba(248,113,113,0.18)'"
      onmouseout="this.style.background='rgba(248,113,113,0.08)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Gunakan Dana
    </button>

    <button onclick="emergencyOpenSetTarget()"
      style="display:flex;align-items:center;justify-content:center;gap:10px;
             padding:14px;background:rgba(124,106,247,0.08);border:1px solid rgba(124,106,247,0.22);
             border-radius:11px;color:var(--primary-light);font-family:'DM Sans',sans-serif;
             font-size:0.875rem;font-weight:600;cursor:pointer;"
      onmouseover="this.style.background='rgba(124,106,247,0.16)'"
      onmouseout="this.style.background='rgba(124,106,247,0.08)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
      ${hasTarget ? "Ubah Target" : "Set Target"}
    </button>

  </div>

  <!-- ── Baris 3: Riwayat Transaksi ───────────── -->
  <div class="card" style="padding:0;overflow:hidden;">
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:16px 20px;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:0.88rem;font-weight:700;
                    color:var(--text-primary);">Riwayat Transaksi</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">
          ${allTx.length} transaksi tercatat
        </div>
      </div>
    </div>
    <div id="emergency-tx-list" style="overflow-x:auto;">
      ${renderTxList(allTx)}
    </div>
  </div>

  <!-- Responsive -->
  <style>
    @media (max-width: 900px) {
      #emergency-top-row     { grid-template-columns: 1fr !important; }
      #emergency-actions-row { grid-template-columns: 1fr 1fr !important; }
    }
    @media (max-width: 500px) {
      #emergency-actions-row { grid-template-columns: 1fr !important; }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: TX LIST
// ═══════════════════════════════════════════════════════
function renderTxList(txs) {
  if (txs.length === 0) {
    return `
      <div class="empty-state" style="padding:48px 24px;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <h3>Belum Ada Transaksi</h3>
        <p style="margin-bottom:16px;">
          Mulai tambahkan dana darurat kamu sekarang.
        </p>
        <button onclick="emergencyOpenTx('in')"
          style="padding:8px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);
                 border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
                 font-size:0.84rem;font-weight:600;cursor:pointer;">
          + Tambah Dana Pertama
        </button>
      </div>`;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Tipe</th>
          <th>Jumlah</th>
          <th>Catatan</th>
          <th style="text-align:center;">Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${txs.map(tx => {
          const isIn = tx.type === "in";
          const color = isIn ? "var(--success)" : "var(--danger)";
          const sign  = isIn ? "+" : "-";
          const label = isIn ? "Setoran" : "Penggunaan";
          const chipClass = isIn ? "chip-success" : "chip-danger";
          const note  = tx.note
            ? tx.note
            : `<span style="color:var(--text-muted);font-style:italic;">—</span>`;

          return `
            <tr>
              <td>
                <span style="font-size:0.82rem;color:var(--text-muted);">
                  ${formatDateDisplay(tx.date)}
                </span>
              </td>
              <td>
                <span class="chip ${chipClass}" style="font-size:0.76rem;">
                  ${isIn
                    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
                    : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>`}
                  ${label}
                </span>
              </td>
              <td>
                <span style="font-family:'Syne',sans-serif;font-weight:700;
                             color:${color};font-size:0.9rem;">
                  ${sign}${window.formatRupiah(tx.amount)}
                </span>
              </td>
              <td style="max-width:200px;">
                <span style="font-size:0.82rem;display:block;white-space:nowrap;
                             overflow:hidden;text-overflow:ellipsis;max-width:180px;">
                  ${note}
                </span>
              </td>
              <td>
                <div style="display:flex;justify-content:center;">
                  <button class="action-btn del" title="Hapus"
                    onclick="emergencyConfirmDeleteTx('${tx.id}',${tx.amount},'${tx.type}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2.2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

// ═══════════════════════════════════════════════════════
//  MODAL: SET TARGET
// ═══════════════════════════════════════════════════════
function emergencyOpenSetTarget() {
  const { target = 0 } = emergencyData;

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
      ${target > 0 ? "Ubah Target" : "Set Target"} Dana Darurat
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Tips -->
    <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);
                border-radius:10px;padding:12px 14px;margin-bottom:18px;">
      <div style="font-size:0.8rem;color:#93c5fd;line-height:1.7;">
        💡 <strong>Tips:</strong> Para ahli keuangan merekomendasikan dana darurat
        sebesar <strong>3–6 bulan</strong> total pengeluaran bulanan kamu.
      </div>
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Target Dana Darurat (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-em-target" class="form-input"
          style="padding-left:36px;" placeholder="0"
          value="${target > 0 ? target : ""}" min="0" />
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:5px;">
        Masukkan 0 untuk menghapus target.
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="emergencySaveTarget()" id="em-target-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);">
        Simpan Target
      </button>
    </div>`);
}

async function emergencySaveTarget() {
  const target = parseFloat(document.getElementById("f-em-target")?.value) || 0;
  const btn    = document.getElementById("em-target-save-btn");

  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    await setEmergencyTarget(target);
    window.showToast(
      target > 0
        ? `Target dana darurat diset ke ${window.formatRupiah(target)} 🎯`
        : "Target dana darurat dihapus.",
      "success"
    );
    window.closeModal();
    await loadData();
  } catch (err) {
    console.error("Set target error:", err);
    window.showToast("Gagal menyimpan target.", "error");
    if (btn) { btn.disabled = false; btn.innerHTML = "Simpan Target"; }
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: TAMBAH / GUNAKAN DANA
// ═══════════════════════════════════════════════════════
function emergencyOpenTx(type) {
  const isIn    = type === "in";
  const color   = isIn ? "var(--success)" : "var(--danger)";
  const gradFrom = isIn ? "var(--success)" : "var(--danger)";
  const gradTo   = isIn ? "#059669" : "#dc2626";
  const glow     = isIn ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)";
  const title    = isIn ? "Tambah Dana Darurat" : "Gunakan Dana Darurat";
  const today    = new Date().toISOString().split("T")[0];

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="${color}" stroke-width="2.2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      ${title}
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Saldo saat ini -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                background:var(--surface-el);border-radius:9px;
                padding:10px 14px;margin-bottom:18px;">
      <span style="font-size:0.82rem;color:var(--text-secondary);">Saldo saat ini</span>
      <span style="font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:800;
                   color:var(--text-primary);">
        ${window.formatRupiah(emergencyData.total || 0)}
      </span>
    </div>

    ${!isIn && (emergencyData.total || 0) === 0 ? `
      <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);
                  border-radius:9px;padding:12px;margin-bottom:16px;font-size:0.82rem;
                  color:var(--danger);">
        ⚠️ Dana darurat kamu saat ini kosong.
      </div>` : ""}

    <div class="form-group">
      <label class="form-label">Tanggal</label>
      <input type="date" id="f-em-tx-date" class="form-input"
        value="${today}" max="${today}" />
    </div>
    <div class="form-group">
      <label class="form-label">Jumlah (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-em-tx-amount" class="form-input"
          style="padding-left:36px;" placeholder="0" min="1" />
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">
        Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span>
      </label>
      <input type="text" id="f-em-tx-note" class="form-input"
        placeholder="${isIn ? "Misal: Setoran rutin bulanan" : "Misal: Biaya berobat darurat"}"
        maxlength="150" />
    </div>

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="emergencySaveTx('${type}')" id="em-tx-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,${gradFrom},${gradTo});
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px ${glow};">
        ${isIn ? "Simpan Setoran" : "Konfirmasi Penggunaan"}
      </button>
    </div>`);
}

async function emergencySaveTx(type) {
  const date   = document.getElementById("f-em-tx-date")?.value;
  const amount = parseFloat(document.getElementById("f-em-tx-amount")?.value);
  const note   = document.getElementById("f-em-tx-note")?.value?.trim() || "";

  if (!date)              { window.showToast("Tanggal wajib diisi.", "error"); return; }
  if (!amount || amount <= 0) { window.showToast("Jumlah harus lebih dari 0.", "error"); return; }

  // Validasi: tidak bisa tarik lebih dari saldo
  if (type === "out" && amount > (emergencyData.total || 0)) {
    window.showToast(
      `Jumlah melebihi saldo dana darurat (${window.formatRupiah(emergencyData.total)}).`,
      "error"
    );
    return;
  }

  const btn = document.getElementById("em-tx-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    await addEmergencyTransaction({ type, amount, date, note });
    window.showToast(
      type === "in"
        ? `Dana darurat bertambah ${window.formatRupiah(amount)} 🛡️`
        : `Dana darurat berkurang ${window.formatRupiah(amount)}.`,
      type === "in" ? "success" : "info"
    );
    window.closeModal();
    await loadData();
  } catch (err) {
    console.error("Save emergency tx error:", err);
    window.showToast("Gagal menyimpan transaksi.", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = type === "in" ? "Simpan Setoran" : "Konfirmasi Penggunaan";
    }
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: KONFIRMASI HAPUS TRANSAKSI
// ═══════════════════════════════════════════════════════
function emergencyConfirmDeleteTx(id, amount, type) {
  const isIn = type === "in";
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Transaksi
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);
                border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px;">
        Kamu akan menghapus:
      </div>
      <div style="font-weight:600;color:var(--text-primary);">
        ${isIn ? "Setoran" : "Penggunaan"} dana darurat
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
                  color:${isIn ? "var(--success)" : "var(--danger)"};margin-top:4px;">
        ${isIn ? "+" : "-"}${window.formatRupiah(amount)}
      </div>
    </div>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-bottom:20px;">
      Saldo dana darurat akan ikut diperbarui.
    </p>
    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="emergencyDeleteTx('${id}')"
        style="flex:1;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Ya, Hapus
      </button>
    </div>`);
}

async function emergencyDeleteTx(id) {
  try {
    await deleteEmergencyTransaction(id);
    window.closeModal();
    window.showToast("Transaksi berhasil dihapus.", "info");
    await loadData();
  } catch (err) {
    console.error("Delete emergency tx error:", err);
    window.showToast("Gagal menghapus transaksi.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  HELPER: Status dana darurat
// ═══════════════════════════════════════════════════════
function getStatus(total, target) {
  if (target <= 0) {
    return {
      label:       "Belum Ada Target",
      emoji:       "📋",
      color:       "var(--text-secondary)",
      bgFrom:      "rgba(152,152,184,0.06)",
      accentBg:    "rgba(152,152,184,0.05)",
      badgeBg:     "rgba(152,152,184,0.1)",
      badgeBorder: "rgba(152,152,184,0.2)",
      borderColor: "rgba(152,152,184,0.2)",
      gradFrom:    "#9898b8",
      gradTo:      "#5a5a78",
    };
  }

  const pct = (total / target) * 100;

  if (pct >= 100) return {
    label:       "Dana Aman 🎉",
    emoji:       "🛡️",
    color:       "var(--success)",
    bgFrom:      "rgba(52,211,153,0.08)",
    accentBg:    "rgba(52,211,153,0.05)",
    badgeBg:     "rgba(52,211,153,0.12)",
    badgeBorder: "rgba(52,211,153,0.3)",
    borderColor: "rgba(52,211,153,0.25)",
    gradFrom:    "var(--success)",
    gradTo:      "#059669",
  };

  if (pct >= 50) return {
    label:       "Cukup Aman",
    emoji:       "⚠️",
    color:       "var(--warning)",
    bgFrom:      "rgba(251,191,36,0.07)",
    accentBg:    "rgba(251,191,36,0.05)",
    badgeBg:     "rgba(251,191,36,0.12)",
    badgeBorder: "rgba(251,191,36,0.3)",
    borderColor: "rgba(251,191,36,0.25)",
    gradFrom:    "var(--warning)",
    gradTo:      "#d97706",
  };

  return {
    label:       "Belum Aman",
    emoji:       "🔴",
    color:       "var(--danger)",
    bgFrom:      "rgba(248,113,113,0.08)",
    accentBg:    "rgba(248,113,113,0.05)",
    badgeBg:     "rgba(248,113,113,0.12)",
    badgeBorder: "rgba(248,113,113,0.3)",
    borderColor: "rgba(248,113,113,0.25)",
    gradFrom:    "var(--danger)",
    gradTo:      "#dc2626",
  };
}

// ═══════════════════════════════════════════════════════
//  HELPER: Format tanggal
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
//  EXPOSE ke window
// ═══════════════════════════════════════════════════════
window.emergencyOpenSetTarget      = emergencyOpenSetTarget;
window.emergencySaveTarget         = emergencySaveTarget;
window.emergencyOpenTx             = emergencyOpenTx;
window.emergencySaveTx             = emergencySaveTx;
window.emergencyConfirmDeleteTx    = emergencyConfirmDeleteTx;
window.emergencyDeleteTx           = emergencyDeleteTx;
