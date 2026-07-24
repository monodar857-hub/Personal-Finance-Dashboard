// ═══════════════════════════════════════════════════════
//  pages/assets.js
//  Halaman Aset — catat & pantau aset non-cash.
//
//  Fitur:
//   - Kartu ringkasan total aset + breakdown per tipe
//   - Tabel semua aset dengan indikator naik/turun nilai
//   - Tambah / edit / hapus aset (via modal)
//   - Filter by tipe aset
//   - Search by nama aset
//   - Visual bar proporsi nilai per tipe
//   - Export CSV
//
//  Lifecycle:
//   init()    → dipanggil router
//   destroy() → cleanup state
// ═══════════════════════════════════════════════════════

import {
  getAssets,
  addAsset,
  updateAsset,
  deleteAsset,
} from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let allAssets    = [];
let filterType   = "all";
let editingId    = null;

// ── Tipe aset ──────────────────────────────────────────
const ASSET_TYPES = [
  "Emas",
  "Investasi",
  "Saham",
  "Reksa Dana",
  "Kripto",
  "Properti",
  "Kendaraan",
  "Elektronik",
  "Lainnya",
];

// ── Warna & icon per tipe ──────────────────────────────
const TYPE_META = {
  "Emas":       { color: "#fbbf24", icon: "🥇", bg: "rgba(251,191,36,0.12)"  },
  "Investasi":  { color: "#34d399", icon: "📈", bg: "rgba(52,211,153,0.12)"  },
  "Saham":      { color: "#60a5fa", icon: "📊", bg: "rgba(96,165,250,0.12)"  },
  "Reksa Dana": { color: "#a78bfa", icon: "💼", bg: "rgba(167,139,250,0.12)" },
  "Kripto":     { color: "#f472b6", icon: "🪙", bg: "rgba(244,114,182,0.12)" },
  "Properti":   { color: "#34d3d3", icon: "🏠", bg: "rgba(52,211,211,0.12)"  },
  "Kendaraan":  { color: "#fb923c", icon: "🚗", bg: "rgba(251,146,60,0.12)"  },
  "Elektronik": { color: "#818cf8", icon: "💻", bg: "rgba(129,140,248,0.12)" },
  "Lainnya":    { color: "#94a3b8", icon: "📦", bg: "rgba(148,163,184,0.12)" },
};

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-assets");
  if (!container) return;

  container.innerHTML = renderShell();
  await loadAssets();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  allAssets  = [];
  filterType = "all";
  editingId  = null;
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
        Aset
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Pantau nilai aset non-cash dan perkembangannya.
      </p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="assetExportCSV()"
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
      <button onclick="assetOpenAdd()"
        style="display:flex;align-items:center;gap:7px;padding:9px 18px;
               background:linear-gradient(135deg,var(--warning),#d97706);border:none;border-radius:9px;
               color:white;font-family:'DM Sans',sans-serif;font-size:0.84rem;font-weight:600;
               cursor:pointer;box-shadow:0 4px 14px rgba(251,191,36,0.3);transition:all .2s;"
        onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(251,191,36,0.45)'"
        onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 14px rgba(251,191,36,0.3)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tambah Aset
      </button>
    </div>
  </div>

  <!-- ── Summary + Breakdown ───────────────────── -->
  <div id="asset-summary-section" style="margin-bottom:14px;"></div>

  <!-- ── Tabel Aset ────────────────────────────── -->
  <div class="card" style="padding:0;overflow:hidden;">

    <!-- Toolbar -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                flex-wrap:wrap;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);">
      <div style="font-family:'Syne',sans-serif;font-size:0.88rem;font-weight:700;
                  color:var(--text-primary);">
        Daftar Aset
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">

        <!-- Filter Tipe -->
        <select id="asset-filter-type" onchange="assetFilterType(this.value)"
          style="background:var(--surface-el);border:1.5px solid var(--border);border-radius:8px;
                 padding:7px 10px;color:var(--text-primary);font-family:'DM Sans',sans-serif;
                 font-size:0.82rem;outline:none;cursor:pointer;">
          <option value="all">Semua Tipe</option>
          ${ASSET_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>

        <!-- Search -->
        <div style="position:relative;">
          <input type="text" id="asset-search" placeholder="Cari nama aset..."
            oninput="assetSearch(this.value)"
            style="background:var(--surface-el);border:1.5px solid var(--border);border-radius:8px;
                   padding:7px 12px 7px 32px;color:var(--text-primary);
                   font-family:'DM Sans',sans-serif;font-size:0.82rem;outline:none;
                   width:180px;transition:all .2s;"
            onfocus="this.style.borderColor='var(--primary)'"
            onblur="this.style.borderColor='var(--border)'"/>
          <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;"
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" stroke-width="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>

        <span id="asset-count"
          style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;"></span>
      </div>
    </div>

    <!-- Table Body -->
    <div id="asset-table-body" style="overflow-x:auto;"></div>

  </div>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadAssets() {
  setTableLoading(true);
  try {
    allAssets = await getAssets();
    renderSummarySection();
    applyFilter();
  } catch (err) {
    console.error("Load assets error:", err);
    window.showToast("Gagal memuat data aset.", "error");
  } finally {
    setTableLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: SUMMARY SECTION
// ═══════════════════════════════════════════════════════
function renderSummarySection() {
  const el = document.getElementById("asset-summary-section");
  if (!el) return;

  const total      = allAssets.reduce((s, a) => s + (a.value || 0), 0);
  const prevTotal  = allAssets.reduce((s, a) => s + (a.prevValue || a.value || 0), 0);
  const totalDiff  = total - prevTotal;
  const totalDiffPct = prevTotal > 0 ? ((totalDiff / prevTotal) * 100).toFixed(1) : null;
  const isUp       = totalDiff >= 0;

  // Agregasi per tipe
  const typeMap = {};
  allAssets.forEach(a => {
    typeMap[a.type] = (typeMap[a.type] || 0) + (a.value || 0);
  });
  const typeSorted = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  el.innerHTML = `
  <div style="display:grid;grid-template-columns:300px 1fr;gap:14px;align-items:start;"
       id="asset-summary-grid">

    <!-- Total Nilai Aset -->
    <div class="card" style="border-color:rgba(251,191,36,0.25);
         background:linear-gradient(135deg,rgba(251,191,36,0.07),transparent);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span class="card-title" style="margin-bottom:0;">Total Nilai Aset</span>
        <div class="stat-icon si-warning" style="width:36px;height:36px;border-radius:9px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;
                  letter-spacing:-0.03em;color:var(--warning);margin-bottom:8px;">
        ${window.formatRupiah(total)}
      </div>
      ${totalDiffPct !== null && totalDiff !== 0 ? `
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="stat-badge ${isUp ? "badge-up" : "badge-down"}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.8">
              ${isUp
                ? `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                   <polyline points="17 6 23 6 23 12"/>`
                : `<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                   <polyline points="17 18 23 18 23 12"/>`}
            </svg>
            ${isUp ? "+" : ""}${window.formatRupiah(Math.abs(totalDiff))}
            (${isUp ? "+" : ""}${totalDiffPct}%)
          </span>
          <span style="font-size:0.72rem;color:var(--text-muted);">dari update terakhir</span>
        </div>` : `
        <div style="font-size:0.75rem;color:var(--text-muted);">
          ${allAssets.length} aset tercatat
        </div>`}
    </div>

    <!-- Breakdown Tipe -->
    <div class="card">
      <div class="card-title" style="margin-bottom:14px;">Proporsi per Tipe</div>
      ${typeSorted.length === 0
        ? `<div style="font-size:0.82rem;color:var(--text-muted);">Belum ada aset.</div>`
        : `<div style="display:flex;flex-direction:column;gap:10px;">
             ${typeSorted.map(([type, val]) => {
               const meta   = TYPE_META[type] || TYPE_META["Lainnya"];
               const pct    = total > 0 ? Math.round((val / total) * 100) : 0;
               const barW   = Math.max(2, pct);
               return `
                 <div>
                   <div style="display:flex;align-items:center;justify-content:space-between;
                               margin-bottom:5px;">
                     <div style="display:flex;align-items:center;gap:8px;">
                       <span style="font-size:13px;">${meta.icon}</span>
                       <span style="font-size:0.82rem;color:var(--text-secondary);">${type}</span>
                     </div>
                     <div style="display:flex;align-items:center;gap:10px;">
                       <span style="font-size:0.8rem;font-weight:600;
                                    color:var(--text-primary);">
                         ${window.formatRupiah(val)}
                       </span>
                       <span style="font-size:0.72rem;color:var(--text-muted);
                                    width:30px;text-align:right;">
                         ${pct}%
                       </span>
                     </div>
                   </div>
                   <div class="progress-track" style="height:5px;">
                     <div class="progress-fill"
                       style="width:${barW}%;background:${meta.color};"></div>
                   </div>
                 </div>`;
             }).join("")}
           </div>`}
    </div>

  </div>

  <style>
    @media (max-width: 768px) {
      #asset-summary-grid { grid-template-columns: 1fr !important; }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: TABEL
// ═══════════════════════════════════════════════════════
function applyFilter() {
  let filtered = allAssets;
  if (filterType !== "all") {
    filtered = filtered.filter(a => a.type === filterType);
  }
  const q = document.getElementById("asset-search")?.value?.toLowerCase().trim();
  if (q) {
    filtered = filtered.filter(a => a.name.toLowerCase().includes(q));
  }
  renderTable(filtered);
}

function renderTable(data) {
  const el      = document.getElementById("asset-table-body");
  const countEl = document.getElementById("asset-count");
  if (!el) return;
  if (countEl) countEl.textContent = `${data.length} aset`;

  if (data.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:52px 24px;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <h3>Belum Ada Aset</h3>
        <p style="margin-bottom:16px;">
          ${filterType !== "all"
            ? `Tidak ada aset tipe <strong>${filterType}</strong>.`
            : "Tambahkan aset pertamamu — emas, investasi, elektronik, dll."}
        </p>
        ${filterType === "all" ? `
          <button onclick="assetOpenAdd()"
            style="padding:8px 20px;background:linear-gradient(135deg,var(--warning),#d97706);
                   border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
                   font-size:0.84rem;font-weight:600;cursor:pointer;">
            + Tambah Sekarang
          </button>` : ""}
      </div>`;
    return;
  }

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nama Aset</th>
          <th>Tipe</th>
          <th>Nilai Sekarang</th>
          <th>Perubahan</th>
          <th>Terakhir Update</th>
          <th style="text-align:center;">Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => renderTableRow(item)).join("")}
      </tbody>
    </table>`;
}

function renderTableRow(item) {
  const meta      = TYPE_META[item.type] || TYPE_META["Lainnya"];
  const value     = item.value     || 0;
  const prevValue = item.prevValue || value;
  const diff      = value - prevValue;
  const diffPct   = prevValue > 0 ? ((diff / prevValue) * 100).toFixed(1) : null;
  const isUp      = diff > 0;
  const isFlat    = diff === 0;

  // Perubahan nilai
  let changeHtml = `<span style="font-size:0.78rem;color:var(--text-muted);
                                  font-style:italic;">—</span>`;
  if (!isFlat && diffPct !== null) {
    changeHtml = `
      <div style="display:flex;align-items:center;gap:5px;">
        <span class="stat-badge ${isUp ? "badge-up" : "badge-down"}"
          style="font-size:0.72rem;padding:2px 7px;">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3">
            ${isUp
              ? `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                 <polyline points="17 6 23 6 23 12"/>`
              : `<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                 <polyline points="17 18 23 18 23 12"/>`}
          </svg>
          ${isUp ? "+" : ""}${diffPct}%
        </span>
        <span style="font-size:0.75rem;color:${isUp ? "var(--success)" : "var(--danger)"};">
          ${isUp ? "+" : ""}${window.formatRupiah(Math.abs(diff))}
        </span>
      </div>`;
  }

  return `
    <tr id="asset-row-${item.id}">
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:9px;flex-shrink:0;
                      background:${meta.bg};display:flex;align-items:center;
                      justify-content:center;font-size:16px;">
            ${meta.icon}
          </div>
          <div>
            <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary);">
              ${item.name}
            </div>
            ${item.note
              ? `<div style="font-size:0.72rem;color:var(--text-muted);
                             white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                             max-width:160px;">
                   ${item.note}
                 </div>`
              : ""}
          </div>
        </div>
      </td>
      <td>
        <span class="chip"
          style="background:${meta.bg};color:${meta.color};font-size:0.76rem;">
          ${meta.icon} ${item.type}
        </span>
      </td>
      <td>
        <span style="font-family:'Syne',sans-serif;font-weight:800;
                     color:var(--warning);font-size:0.9rem;">
          ${window.formatRupiah(value)}
        </span>
      </td>
      <td>${changeHtml}</td>
      <td>
        <span style="font-size:0.8rem;color:var(--text-muted);">
          ${item.updatedAt ? formatDateDisplay(item.updatedAt) : "—"}
        </span>
      </td>
      <td>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
          <button class="action-btn edit" title="Update Nilai"
            onclick="assetOpenEdit('${item.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-btn del" title="Hapus"
            onclick="assetConfirmDelete('${item.id}','${escapeStr(item.name)}',${value})">
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
}

// ═══════════════════════════════════════════════════════
//  MODAL: TAMBAH ASET
// ═══════════════════════════════════════════════════════
function assetOpenAdd() {
  editingId = null;
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--warning)" stroke-width="2.2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Aset
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderAssetForm()}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="assetSave()" id="asset-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--warning),#d97706);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(251,191,36,0.3);">
        Simpan Aset
      </button>
    </div>`);
}

// ═══════════════════════════════════════════════════════
//  MODAL: EDIT / UPDATE NILAI ASET
// ═══════════════════════════════════════════════════════
function assetOpenEdit(id) {
  const item = allAssets.find(a => a.id === id);
  if (!item) return;
  editingId = id;

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--primary)" stroke-width="2.2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Update Aset
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Preview nilai lama -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                background:var(--surface-el);border-radius:9px;
                padding:10px 14px;margin-bottom:18px;">
      <span style="font-size:0.82rem;color:var(--text-secondary);">Nilai saat ini</span>
      <span style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;
                   color:var(--warning);">
        ${window.formatRupiah(item.value || 0)}
      </span>
    </div>

    ${renderAssetForm(item)}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="assetSave()" id="asset-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);">
        Simpan Perubahan
      </button>
    </div>`);
}

function renderAssetForm(data = {}) {
  const typeOptions = ASSET_TYPES.map(t => {
    const meta = TYPE_META[t] || TYPE_META["Lainnya"];
    return `<option value="${t}" ${data.type === t ? "selected" : ""}>${meta.icon} ${t}</option>`;
  }).join("");

  return `
    <div class="form-group">
      <label class="form-label">Nama Aset</label>
      <input type="text" id="f-asset-name" class="form-input"
        placeholder="Contoh: Emas 10 gram, Saham BBCA, MacBook Pro"
        value="${data.name || ""}" maxlength="80" />
    </div>
    <div class="form-group">
      <label class="form-label">Tipe Aset</label>
      <select id="f-asset-type" class="form-input" style="cursor:pointer;">
        ${typeOptions}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Nilai Sekarang (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-asset-value" class="form-input"
          style="padding-left:36px;" placeholder="0"
          value="${data.value || ""}" min="0" />
      </div>
      ${data.value ? `
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:5px;">
          Nilai sebelumnya (${window.formatRupiah(data.prevValue || data.value)})
          akan disimpan untuk tracking perubahan.
        </div>` : ""}
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">
        Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span>
      </label>
      <input type="text" id="f-asset-note" class="form-input"
        placeholder="Contoh: Di Pegadaian, Platform Ajaib"
        value="${data.note || ""}" maxlength="150" />
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════════════════
async function assetSave() {
  const name  = document.getElementById("f-asset-name")?.value?.trim();
  const type  = document.getElementById("f-asset-type")?.value;
  const value = parseFloat(document.getElementById("f-asset-value")?.value);
  const note  = document.getElementById("f-asset-note")?.value?.trim() || "";

  if (!name)              { window.showToast("Nama aset wajib diisi.", "error"); return; }
  if (!type)              { window.showToast("Tipe aset wajib dipilih.", "error"); return; }
  if (isNaN(value) || value < 0) { window.showToast("Nilai aset tidak valid.", "error"); return; }

  const btn = document.getElementById("asset-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    if (editingId) {
      await updateAsset(editingId, { name, type, value, note });
      window.showToast("Aset berhasil diperbarui! ✏️", "success");
    } else {
      await addAsset({ name, type, value, note });
      window.showToast("Aset berhasil ditambahkan! 💎", "success");
    }
    window.closeModal();
    await loadAssets();
  } catch (err) {
    console.error("Save asset error:", err);
    window.showToast("Gagal menyimpan aset.", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = editingId ? "Simpan Perubahan" : "Simpan Aset";
    }
  }
}

// ═══════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════
function assetConfirmDelete(id, name, value) {
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Aset
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);
                border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px;">
        Kamu akan menghapus aset:
      </div>
      <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);">${name}</div>
      <div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
                  color:var(--warning);margin-top:4px;">
        ${window.formatRupiah(value)}
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
      <button onclick="assetDelete('${id}')"
        style="flex:1;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Ya, Hapus
      </button>
    </div>`);
}

async function assetDelete(id) {
  try {
    await deleteAsset(id);
    window.closeModal();
    window.showToast("Aset berhasil dihapus.", "info");
    await loadAssets();
  } catch (err) {
    console.error("Delete asset error:", err);
    window.showToast("Gagal menghapus aset.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  FILTER & SEARCH
// ═══════════════════════════════════════════════════════
function assetFilterType(val) {
  filterType = val;
  applyFilter();
}

function assetSearch(query) {
  applyFilter();
}

// ═══════════════════════════════════════════════════════
//  EXPORT CSV
// ═══════════════════════════════════════════════════════
function assetExportCSV() {
  if (allAssets.length === 0) {
    window.showToast("Tidak ada data untuk diekspor.", "error");
    return;
  }

  const headers = ["Nama Aset", "Tipe", "Nilai Sekarang (Rp)", "Nilai Sebelumnya (Rp)", "Catatan", "Terakhir Update"];
  const rows    = allAssets.map(a => [
    `"${a.name}"`,
    `"${a.type}"`,
    a.value || 0,
    a.prevValue || a.value || 0,
    `"${(a.note || "").replace(/"/g, '""')}"`,
    `"${a.updatedAt || ""}"`,
  ]);

  const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `aset-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  window.showToast(`${allAssets.length} aset berhasil diekspor! 📥`, "success");
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function setTableLoading(loading) {
  const el = document.getElementById("asset-table-body");
  if (!el || !loading) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;
                padding:48px;color:var(--text-muted);font-size:0.85rem;">
      <div class="spinner" style="border-color:rgba(251,191,36,0.2);
           border-top-color:var(--warning);"></div>
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

function escapeStr(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
//  EXPOSE ke window
// ═══════════════════════════════════════════════════════
window.assetOpenAdd        = assetOpenAdd;
window.assetOpenEdit       = assetOpenEdit;
window.assetSave           = assetSave;
window.assetConfirmDelete  = assetConfirmDelete;
window.assetDelete         = assetDelete;
window.assetFilterType     = assetFilterType;
window.assetSearch         = assetSearch;
window.assetExportCSV      = assetExportCSV;
