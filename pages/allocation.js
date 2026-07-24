

import {
  getAllocations,
  addAllocation,
  updateAllocation,
  deleteAllocation,
} from "../core/storage.js";
import { getDashboardSummary } from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let allAllocations = [];
let netBalance     = 0;
let editingId      = null;

// ── Warna preset untuk alokasi ────────────────────────
const PRESET_COLORS = [
  "#c9a84c","#34d399","#f87171","#60a5fa",
  "#f472b6","#a78bfa","#fb923c","#34d3d3",
];

const PRESET_NAMES = [
  "Makan & Minum","Bensin / Transport","Hiburan",
  "Belanja Kebutuhan","Tagihan","Tabungan Rutin",
  "Pendidikan","Kesehatan","Sosial","Lainnya",
];

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-allocation");
  if (!container) return;

  container.innerHTML = renderShell();
  await loadData();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  allAllocations = [];
  editingId      = null;
  netBalance     = 0;
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
      <h2 style="font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;
                 color:var(--text-primary);letter-spacing:-0.01em;margin-bottom:4px;">
        Alokasi Dana
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Rencanakan penggunaan saldo bersih Anda secara terstruktur.
      </p>
    </div>
    <button onclick="allocOpenAdd()"
      style="display:flex;align-items:center;gap:7px;padding:9px 18px;
             background:linear-gradient(135deg,var(--primary),var(--primary-dark));
             border:none;border-radius:9px;color:white;font-family:'Plus Jakarta Sans',sans-serif;
             font-size:0.84rem;font-weight:600;cursor:pointer;
             box-shadow:0 4px 14px rgba(201,168,76,0.3);transition:all .2s;"
      onmouseover="this.style.transform='translateY(-1px)'"
      onmouseout="this.style.transform='none'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Alokasi
    </button>
  </div>

  <!-- ── Summary Banner ────────────────────────── -->
  <div id="alloc-summary" style="margin-bottom:16px;"></div>

  <!-- ── Alokasi List ──────────────────────────── -->
  <div id="alloc-list"></div>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadData() {
  setLoading(true);
  try {
    const [allocations, summary] = await Promise.all([
      getAllocations(),
      getDashboardSummary(),
    ]);
    allAllocations = allocations;
    netBalance     = summary.balance || 0;
    renderSummary();
    renderList();
  } catch (err) {
    console.error("Load allocation error:", err);
    window.showToast("Gagal memuat data alokasi.", "error");
  } finally {
    setLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: SUMMARY BANNER
// ═══════════════════════════════════════════════════════
function renderSummary() {
  const el = document.getElementById("alloc-summary");
  if (!el) return;

  const totalAlloc   = allAllocations.reduce((s, a) => s + (a.amount || 0), 0);
  const remaining    = netBalance - totalAlloc;
  const pct          = netBalance > 0 ? Math.min(100, (totalAlloc / netBalance) * 100) : 0;
  const isOver       = totalAlloc > netBalance;
  const barColor     = isOver ? "var(--danger)" : pct >= 90 ? "var(--warning)" : "var(--success)";
  const count        = allAllocations.length;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;"
         id="alloc-stat-grid">

      <!-- Saldo Bersih -->
      <div class="card" style="border-color:rgba(52,211,153,0.2);
           background:linear-gradient(135deg,rgba(52,211,153,0.06),transparent);">
        <div class="card-title" style="margin-bottom:6px;">Saldo Bersih</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;
                    color:${netBalance >= 0 ? "var(--success)" : "var(--danger)"};
                    letter-spacing:-0.02em;">
          ${window.formatRupiah(Math.abs(netBalance))}
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;">
          Income − Pengeluaran bulan ini
        </div>
      </div>

      <!-- Total Dialokasikan -->
      <div class="card" style="border-color:${isOver ? "rgba(248,113,113,0.3)" : "rgba(201,168,76,0.2)"};
           background:linear-gradient(135deg,${isOver ? "rgba(248,113,113,0.06)" : "rgba(201,168,76,0.06)"},transparent);">
        <div class="card-title" style="margin-bottom:6px;">Total Dialokasikan</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;
                    color:${isOver ? "var(--danger)" : "var(--primary)"};letter-spacing:-0.02em;">
          ${window.formatRupiah(totalAlloc)}
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;">
          ${count} pos alokasi aktif
        </div>
      </div>

      <!-- Sisa Belum Dialokasikan -->
      <div class="card" style="border-color:${isOver ? "rgba(248,113,113,0.3)" : "rgba(96,165,250,0.2)"};
           background:linear-gradient(135deg,${isOver ? "rgba(248,113,113,0.06)" : "rgba(96,165,250,0.06)"},transparent);">
        <div class="card-title" style="margin-bottom:6px;">
          ${isOver ? "Kelebihan Alokasi" : "Belum Dialokasikan"}
        </div>
        <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;
                    color:${isOver ? "var(--danger)" : "#60a5fa"};letter-spacing:-0.02em;">
          ${isOver ? "−" : ""}${window.formatRupiah(Math.abs(remaining))}
        </div>
        <div style="font-size:0.72rem;color:${isOver ? "var(--danger)" : "var(--text-muted)"};margin-top:3px;">
          ${isOver ? "⚠️ Melebihi saldo bersih!" : "Sisa saldo yang belum direncanakan"}
        </div>
      </div>

    </div>

    <!-- Progress Bar -->
    <div class="card" style="padding:18px 22px;${isOver ? "border-color:rgba(248,113,113,0.3);" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);">
          Progress Alokasi
        </span>
        <span style="font-size:0.82rem;font-weight:700;color:${barColor};">
          ${pct.toFixed(1)}% dari saldo bersih
        </span>
      </div>
      <div class="progress-track" style="height:10px;">
        <div style="height:100%;border-radius:99px;transition:width .6s ease;
                    width:${Math.min(100, pct)}%;
                    background:linear-gradient(90deg,${barColor},${barColor}aa);">
        </div>
      </div>
      ${isOver ? `
        <div style="margin-top:10px;padding:10px 14px;background:rgba(248,113,113,0.08);
                    border:1px solid rgba(248,113,113,0.2);border-radius:9px;
                    font-size:0.8rem;color:var(--danger);line-height:1.6;">
          ⚠️ Total alokasi melebihi saldo bersih sebesar
          <strong>${window.formatRupiah(Math.abs(remaining))}</strong>.
          Harap kurangi nominal beberapa alokasi.
        </div>` : pct >= 90 ? `
        <div style="margin-top:10px;font-size:0.78rem;color:var(--warning);">
          ⚡ Hampir semua saldo sudah dialokasikan.
        </div>` : ""}
    </div>

    <style>
      @media (max-width: 640px) {
        #alloc-stat-grid { grid-template-columns: 1fr !important; }
      }
    </style>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: LIST ALOKASI
// ═══════════════════════════════════════════════════════
function renderList() {
  const el = document.getElementById("alloc-list");
  if (!el) return;

  if (allAllocations.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:52px 24px;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <h3>Belum Ada Alokasi</h3>
        <p style="margin-bottom:18px;">
          Buat rencana penggunaan saldo Anda — makan, bensin, hiburan, dll.
        </p>
        <button onclick="allocOpenAdd()"
          style="padding:9px 22px;
                 background:linear-gradient(135deg,var(--primary),var(--primary-dark));
                 border:none;border-radius:9px;color:white;
                 font-family:'Plus Jakarta Sans',sans-serif;
                 font-size:0.84rem;font-weight:600;cursor:pointer;">
          + Buat Alokasi Pertama
        </button>
      </div>`;
    return;
  }

  const totalAlloc = allAllocations.reduce((s, a) => s + (a.amount || 0), 0);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
      ${allAllocations.map((item, idx) => renderAllocCard(item, idx, totalAlloc)).join("")}
    </div>`;
}

function renderAllocCard(item, idx, totalAlloc) {
  const color   = item.color || PRESET_COLORS[idx % PRESET_COLORS.length];
  const pctOfBalance = netBalance > 0 ? Math.min(100, (item.amount / netBalance) * 100) : 0;
  const pctOfTotal   = totalAlloc > 0 ? Math.round((item.amount / totalAlloc) * 100) : 0;

  return `
    <div class="card" style="padding:0;overflow:hidden;
                              box-shadow:0 4px 20px rgba(0,0,0,0.25);">
      <!-- Top accent bar -->
      <div style="height:3px;background:${color};"></div>

      <div style="padding:18px 20px;">
        <!-- Header -->
        <div style="display:flex;align-items:flex-start;
                    justify-content:space-between;gap:10px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="width:36px;height:36px;border-radius:9px;flex-shrink:0;
                        background:${color}22;display:flex;align-items:center;
                        justify-content:center;">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
            </div>
            <div style="min-width:0;">
              <div style="font-size:0.9rem;font-weight:600;color:var(--text-primary);
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${item.name}
              </div>
              ${item.note ? `
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:1px;
                             white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${item.note}
                </div>` : ""}
            </div>
          </div>
          <!-- Actions -->
          <div style="display:flex;gap:5px;flex-shrink:0;">
            <button class="action-btn edit" onclick="allocOpenEdit('${item.id}')" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn del"
              onclick="allocConfirmDelete('${item.id}','${escapeStr(item.name)}')"
              title="Hapus">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Nominal -->
        <div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;
                    color:${color};letter-spacing:-0.02em;margin-bottom:12px;">
          ${window.formatRupiah(item.amount)}
        </div>

        <!-- Progress bar: proporsi dari saldo bersih -->
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:0.72rem;color:var(--text-muted);">
              ${pctOfTotal}% dari total alokasi
            </span>
            <span style="font-size:0.72rem;color:var(--text-muted);">
              ${pctOfBalance.toFixed(1)}% dari saldo
            </span>
          </div>
          <div class="progress-track" style="height:5px;">
            <div style="height:100%;border-radius:99px;width:${pctOfBalance}%;
                        background:${color};transition:width .5s ease;"></div>
          </div>
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  MODAL: TAMBAH ALOKASI
// ═══════════════════════════════════════════════════════
function allocOpenAdd() {
  editingId = null;
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--primary)" stroke-width="2.2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Alokasi Dana
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Saldo tersedia -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                background:var(--surface-el);border-radius:9px;
                padding:10px 14px;margin-bottom:18px;">
      <span style="font-size:0.82rem;color:var(--text-secondary);">Saldo bersih tersedia</span>
      <span style="font-family:'Playfair Display',serif;font-size:0.95rem;font-weight:700;
                   color:${netBalance >= 0 ? "var(--success)" : "var(--danger)"};">
        ${window.formatRupiah(netBalance)}
      </span>
    </div>

    ${renderAllocForm()}

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);
               font-family:'Plus Jakarta Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="allocSave()" id="alloc-save-btn"
        style="flex:2;padding:11px;
               background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;
               font-family:'Plus Jakarta Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(201,168,76,0.3);">
        Simpan Alokasi
      </button>
    </div>`);
}

// ═══════════════════════════════════════════════════════
//  MODAL: EDIT ALOKASI
// ═══════════════════════════════════════════════════════
function allocOpenEdit(id) {
  const item = allAllocations.find(a => a.id === id);
  if (!item) return;
  editingId = id;

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--primary)" stroke-width="2.2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit Alokasi
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Saldo tersedia -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                background:var(--surface-el);border-radius:9px;
                padding:10px 14px;margin-bottom:18px;">
      <span style="font-size:0.82rem;color:var(--text-secondary);">Saldo bersih tersedia</span>
      <span style="font-family:'Playfair Display',serif;font-size:0.95rem;font-weight:700;
                   color:${netBalance >= 0 ? "var(--success)" : "var(--danger)"};">
        ${window.formatRupiah(netBalance)}
      </span>
    </div>

    ${renderAllocForm(item)}

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);
               font-family:'Plus Jakarta Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="allocSave()" id="alloc-save-btn"
        style="flex:2;padding:11px;
               background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;
               font-family:'Plus Jakarta Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(201,168,76,0.3);">
        Simpan Perubahan
      </button>
    </div>`);
}

function renderAllocForm(data = {}) {
  const presetOpts = PRESET_NAMES.map(n =>
    `<option value="${n}">${n}</option>`
  ).join("");

  const currentColor = data.color || PRESET_COLORS[0];

  return `
    <div class="form-group">
      <label class="form-label">Nama Alokasi</label>
      <input type="text" id="f-alloc-name" class="form-input"
        placeholder="Contoh: Makan, Bensin, Hiburan..."
        value="${data.name || ""}" maxlength="60"
        list="alloc-name-suggestions" />
      <datalist id="alloc-name-suggestions">
        ${presetOpts}
      </datalist>
    </div>

    <div class="form-group">
      <label class="form-label">Nominal (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-alloc-amount" class="form-input"
          style="padding-left:36px;" placeholder="0"
          value="${data.amount || ""}" min="1" />
      </div>
    </div>

    <!-- Pilih Warna -->
    <div class="form-group">
      <label class="form-label">Warna Label</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${PRESET_COLORS.map(c => `
          <button type="button" onclick="allocSelectColor('${c}')"
            id="color-opt-${c.replace('#','')}"
            style="width:28px;height:28px;border-radius:50%;background:${c};
                   border:3px solid ${c === currentColor ? "white" : "transparent"};
                   cursor:pointer;transition:all .15s;outline:2px solid ${c === currentColor ? c : "transparent"};
                   outline-offset:2px;">
          </button>`).join("")}
      </div>
      <input type="hidden" id="f-alloc-color" value="${currentColor}" />
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">
        Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span>
      </label>
      <input type="text" id="f-alloc-note" class="form-input"
        placeholder="Keterangan tambahan..."
        value="${data.note || ""}" maxlength="100" />
    </div>`;
}

function allocSelectColor(color) {
  // Update hidden input
  const inp = document.getElementById("f-alloc-color");
  if (inp) inp.value = color;

  // Update visual
  PRESET_COLORS.forEach(c => {
    const btn = document.getElementById(`color-opt-${c.replace('#','')}`);
    if (!btn) return;
    btn.style.border        = `3px solid ${c === color ? "white" : "transparent"}`;
    btn.style.outlineColor  = c === color ? c : "transparent";
  });
}

// ═══════════════════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════════════════
async function allocSave() {
  const name   = document.getElementById("f-alloc-name")?.value?.trim();
  const amount = parseFloat(document.getElementById("f-alloc-amount")?.value);
  const color  = document.getElementById("f-alloc-color")?.value || PRESET_COLORS[0];
  const note   = document.getElementById("f-alloc-note")?.value?.trim() || "";

  if (!name)              { window.showToast("Nama alokasi wajib diisi.", "error"); return; }
  if (!amount || amount <= 0) { window.showToast("Nominal harus lebih dari 0.", "error"); return; }

  // Hitung total alokasi baru
  const currentTotal = allAllocations
    .filter(a => a.id !== editingId)
    .reduce((s, a) => s + (a.amount || 0), 0);
  const newTotal = currentTotal + amount;

  // Validasi: tidak boleh melebihi saldo bersih
  if (newTotal > netBalance && netBalance > 0) {
    const over = newTotal - netBalance;
    window.openModal(`
      <div class="modal-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="var(--danger)" stroke-width="2.2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Alokasi Melebihi Saldo
        <button class="modal-close" onclick="closeModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.25);
                  border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px;">
              Saldo Bersih
            </div>
            <div style="font-family:'Playfair Display',serif;font-size:1rem;
                        font-weight:700;color:var(--success);">
              ${window.formatRupiah(netBalance)}
            </div>
          </div>
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px;">
              Total Setelah Ditambah
            </div>
            <div style="font-family:'Playfair Display',serif;font-size:1rem;
                        font-weight:700;color:var(--danger);">
              ${window.formatRupiah(newTotal)}
            </div>
          </div>
        </div>
        <div style="padding:10px;background:rgba(248,113,113,0.1);border-radius:8px;
                    font-size:0.8rem;color:var(--danger);text-align:center;">
          Melebihi saldo bersih sebesar <strong>${window.formatRupiah(over)}</strong>
        </div>
      </div>

      <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:20px;line-height:1.6;">
        Total alokasi tidak dapat melebihi saldo bersih Anda.
        Kurangi nominal alokasi ini atau hapus alokasi lain terlebih dahulu.
      </p>

      <button onclick="closeModal()"
        style="width:100%;padding:11px;
               background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;
               font-family:'Plus Jakarta Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;">
        Mengerti
      </button>`);
    return;
  }

  const btn = document.getElementById("alloc-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    if (editingId) {
      await updateAllocation(editingId, { name, amount, color, note });
      window.showToast("Alokasi berhasil diperbarui! ✏️", "success");
    } else {
      await addAllocation({ name, amount, color, note });
      window.showToast("Alokasi berhasil ditambahkan! 📊", "success");
    }
    window.closeModal();
    await loadData();
  } catch (err) {
    console.error("Save allocation error:", err);
    window.showToast("Gagal menyimpan alokasi.", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = editingId ? "Simpan Perubahan" : "Simpan Alokasi";
    }
  }
}

// ═══════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════
function allocConfirmDelete(id, name) {
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Alokasi
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
        Anda akan menghapus alokasi:
      </div>
      <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);">${name}</div>
    </div>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-bottom:20px;">
      Data alokasi yang dihapus tidak dapat dikembalikan.
    </p>
    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="allocDelete('${id}')"
        style="flex:1;padding:11px;
               background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Ya, Hapus
      </button>
    </div>`);
}

async function allocDelete(id) {
  try {
    await deleteAllocation(id);
    window.closeModal();
    window.showToast("Alokasi berhasil dihapus.", "info");
    await loadData();
  } catch (err) {
    console.error("Delete allocation error:", err);
    window.showToast("Gagal menghapus alokasi.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function setLoading(loading) {
  const el = document.getElementById("alloc-list");
  if (!el || !loading) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;
                padding:60px;color:var(--text-muted);font-size:0.85rem;">
      <div class="spinner" style="border-color:rgba(201,168,76,0.2);
           border-top-color:var(--primary);"></div>
      Memuat alokasi...
    </div>`;
}

function escapeStr(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
//  EXPOSE ke window
// ═══════════════════════════════════════════════════════
window.allocOpenAdd        = allocOpenAdd;
window.allocOpenEdit       = allocOpenEdit;
window.allocSave           = allocSave;
window.allocSelectColor    = allocSelectColor;
window.allocConfirmDelete  = allocConfirmDelete;
window.allocDelete         = allocDelete;
