
import {
  getEwallets,
  addEwallet,
  updateEwallet,
  deleteEwallet,
  addEwalletTransaction,
  getEwalletTransactions,
  deleteEwalletTransaction,
} from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let allWallets = [];
let editingId  = null;

// ── Provider presets ───────────────────────────────────
const PROVIDERS = [
  { name: "GoPay",    color: "#00AED6", emoji: "💙" },
  { name: "Dana",     color: "#108EE9", emoji: "💳" },
  { name: "OVO",      color: "#4C3494", emoji: "💜" },
  { name: "ShopeePay",color: "#EE4D2D", emoji: "🧡" },
  { name: "LinkAja",  color: "#E82529", emoji: "❤️"  },
  { name: "PayPal",   color: "#003087", emoji: "🔵" },
  { name: "Jenius",   color: "#00B7C3", emoji: "🩵" },
  { name: "Kustom",   color: "#7c6af7", emoji: "👛" },
];

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-ewallet");
  if (!container) return;

  container.innerHTML = renderShell();
  await loadData();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  allWallets = [];
  editingId  = null;
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
        E-Wallet
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Pantau dan kelola saldo dompet digital Anda.
      </p>
    </div>
    <button onclick="ewalletOpenAdd()"
      style="display:flex;align-items:center;gap:7px;padding:9px 18px;
             background:linear-gradient(135deg,#108EE9,#0070CC);border:none;border-radius:9px;
             color:white;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.84rem;
             font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(16,142,233,0.3);
             transition:all .2s;"
      onmouseover="this.style.transform='translateY(-1px)'"
      onmouseout="this.style.transform='none'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah E-Wallet
    </button>
  </div>

  <!-- ── Total Banner ──────────────────────────── -->
  <div id="ewallet-total-banner" style="margin-bottom:16px;"></div>

  <!-- ── Wallet Cards ──────────────────────────── -->
  <div id="ewallet-cards-grid"
    style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadData() {
  setLoading(true);
  try {
    allWallets = await getEwallets();
    renderTotalBanner();
    renderCards();
  } catch (err) {
    console.error("Load ewallet error:", err);
    window.showToast("Gagal memuat data e-wallet.", "error");
  } finally {
    setLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: TOTAL BANNER
// ═══════════════════════════════════════════════════════
function renderTotalBanner() {
  const el = document.getElementById("ewallet-total-banner");
  if (!el) return;

  const total = allWallets.reduce((s, w) => s + (w.balance || 0), 0);
  const count = allWallets.length;

  if (count === 0) { el.innerHTML = ""; return; }

  el.innerHTML = `
    <div class="card" style="border-color:rgba(16,142,233,0.2);
         background:linear-gradient(135deg,rgba(16,142,233,0.07),transparent);
         padding:18px 22px;">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  flex-wrap:wrap;gap:12px;">
        <div>
          <div class="card-title" style="margin-bottom:5px;">Total Saldo E-Wallet</div>
          <div style="font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:700;
                      color:#60a5fa;letter-spacing:-0.02em;">
            ${window.formatRupiah(total)}
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;">
            ${count} e-wallet terdaftar &nbsp;·&nbsp; Tidak termasuk dalam saldo bersih
          </div>
        </div>
        <!-- Mini proporsi bar -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${allWallets.slice(0,4).map(w => {
            const pct   = total > 0 ? Math.round((w.balance / total) * 100) : 0;
            const color = w.color || "#60a5fa";
            return `
              <div style="display:flex;align-items:center;gap:5px;">
                <div style="width:6px;height:6px;border-radius:50%;background:${color};"></div>
                <span style="font-size:0.72rem;color:var(--text-muted);">
                  ${w.name} ${pct}%
                </span>
              </div>`;
          }).join("")}
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: WALLET CARDS
// ═══════════════════════════════════════════════════════
function renderCards() {
  const el = document.getElementById("ewallet-cards-grid");
  if (!el) return;

  if (allWallets.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:60px 24px;grid-column:1/-1;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="4" width="22" height="16" rx="3" ry="3"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        <h3>Belum Ada E-Wallet</h3>
        <p style="margin-bottom:18px;">
          Tambahkan GoPay, Dana, OVO, atau dompet digital lainnya.
        </p>
        <button onclick="ewalletOpenAdd()"
          style="padding:9px 22px;background:linear-gradient(135deg,#108EE9,#0070CC);
                 border:none;border-radius:9px;color:white;
                 font-family:'Plus Jakarta Sans',sans-serif;
                 font-size:0.84rem;font-weight:600;cursor:pointer;">
          + Tambah E-Wallet
        </button>
      </div>`;
    return;
  }

  el.innerHTML = allWallets.map(w => renderWalletCard(w)).join("");
}

function renderWalletCard(wallet) {
  const color    = wallet.color || "#60a5fa";
  const provider = PROVIDERS.find(p => p.name === wallet.provider);
  const emoji    = provider?.emoji || "💳";
  const balance  = wallet.balance || 0;

  return `
    <div class="card" style="padding:0;overflow:hidden;
                              box-shadow:0 4px 24px rgba(0,0,0,0.25);">
      <!-- Gradient header -->
      <div style="background:linear-gradient(135deg,${color}dd,${color}88);
                  padding:20px 22px;position:relative;overflow:hidden;">
        <!-- Decorative circle -->
        <div style="position:absolute;right:-20px;top:-20px;width:100px;height:100px;
                    border-radius:50%;background:rgba(255,255,255,0.06);"></div>
        <div style="position:absolute;right:20px;bottom:-30px;width:80px;height:80px;
                    border-radius:50%;background:rgba(255,255,255,0.04);"></div>

        <div style="position:relative;z-index:1;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">${emoji}</span>
              <div>
                <div style="font-family:'Playfair Display',serif;font-size:1rem;
                            font-weight:700;color:white;">${wallet.name}</div>
                <div style="font-size:0.72rem;color:rgba(255,255,255,0.7);margin-top:1px;">
                  ${wallet.provider}
                </div>
              </div>
            </div>
            <!-- Edit/Delete -->
            <div style="display:flex;gap:5px;">
              <button onclick="ewalletOpenEdit('${wallet.id}')"
                style="width:28px;height:28px;border-radius:7px;border:1px solid rgba(255,255,255,0.2);
                       background:rgba(255,255,255,0.1);color:white;cursor:pointer;
                       display:flex;align-items:center;justify-content:center;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button onclick="ewalletConfirmDelete('${wallet.id}','${escapeStr(wallet.name)}')"
                style="width:28px;height:28px;border-radius:7px;border:1px solid rgba(255,255,255,0.2);
                       background:rgba(255,255,255,0.1);color:white;cursor:pointer;
                       display:flex;align-items:center;justify-content:center;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              </button>
            </div>
          </div>
          <!-- Balance -->
          <div style="margin-top:16px;">
            <div style="font-size:0.68rem;color:rgba(255,255,255,0.6);
                        letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">
              Saldo
            </div>
            <div style="font-family:'Playfair Display',serif;font-size:1.6rem;
                        font-weight:700;color:white;letter-spacing:-0.02em;">
              ${window.formatRupiah(balance)}
            </div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div style="padding:14px 18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <button onclick="ewalletOpenTx('${wallet.id}','in','${escapeStr(wallet.name)}')"
          style="padding:9px 4px;background:rgba(52,211,153,0.1);
                 border:1px solid rgba(52,211,153,0.25);border-radius:8px;
                 color:var(--success);font-family:'Plus Jakarta Sans',sans-serif;
                 font-size:0.78rem;font-weight:600;cursor:pointer;
                 display:flex;align-items:center;justify-content:center;gap:4px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.8">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Top-Up
        </button>

        <button onclick="ewalletOpenTx('${wallet.id}','out','${escapeStr(wallet.name)}')"
          style="padding:9px 4px;background:rgba(248,113,113,0.08);
                 border:1px solid rgba(248,113,113,0.22);border-radius:8px;
                 color:var(--danger);font-family:'Plus Jakarta Sans',sans-serif;
                 font-size:0.78rem;font-weight:600;cursor:pointer;
                 display:flex;align-items:center;justify-content:center;gap:4px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.8">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Bayar
        </button>

        <button onclick="ewalletOpenHistory('${wallet.id}','${escapeStr(wallet.name)}')"
          style="padding:9px 4px;background:var(--surface-el);
                 border:1px solid var(--border);border-radius:8px;
                 color:var(--text-secondary);font-family:'Plus Jakarta Sans',sans-serif;
                 font-size:0.78rem;font-weight:500;cursor:pointer;
                 display:flex;align-items:center;justify-content:center;gap:4px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Riwayat
        </button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  MODAL: TAMBAH / EDIT E-WALLET
// ═══════════════════════════════════════════════════════
function ewalletOpenAdd() {
  editingId = null;
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="#108EE9" stroke-width="2.2">
        <rect x="1" y="4" width="22" height="16" rx="3" ry="3"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
      Tambah E-Wallet
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderWalletForm()}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="ewalletSave()" id="ewallet-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,#108EE9,#0070CC);
               border:none;border-radius:9px;color:white;
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(16,142,233,0.3);">
        Tambahkan
      </button>
    </div>`);
}

function ewalletOpenEdit(id) {
  const wallet = allWallets.find(w => w.id === id);
  if (!wallet) return;
  editingId = id;

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--primary)" stroke-width="2.2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit E-Wallet
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${renderWalletForm(wallet)}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="ewalletSave()" id="ewallet-save-btn"
        style="flex:2;padding:11px;
               background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(201,168,76,0.3);">
        Simpan Perubahan
      </button>
    </div>`);
}

function renderWalletForm(data = {}) {
  const providerOpts = PROVIDERS.map(p =>
    `<option value="${p.name}" ${data.provider === p.name ? "selected" : ""}>${p.emoji} ${p.name}</option>`
  ).join("");

  return `
    <div class="form-group">
      <label class="form-label">Nama Wallet</label>
      <input type="text" id="f-ew-name" class="form-input"
        placeholder="Contoh: GoPay Utama, Dana Belanja..."
        value="${data.name || ""}" maxlength="40" />
    </div>
    <div class="form-group">
      <label class="form-label">Provider</label>
      <select id="f-ew-provider" class="form-input" style="cursor:pointer;"
        onchange="ewalletProviderChange(this.value)">
        ${providerOpts}
      </select>
    </div>
    ${!data.id ? `
    <div class="form-group">
      <label class="form-label">Saldo Awal (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-ew-balance" class="form-input"
          style="padding-left:36px;" placeholder="0"
          value="" min="0" />
      </div>
    </div>` : ""}
    <input type="hidden" id="f-ew-color" value="${data.color || "#108EE9"}" />`;
}

function ewalletProviderChange(provider) {
  const found = PROVIDERS.find(p => p.name === provider);
  const colorInput = document.getElementById("f-ew-color");
  if (found && colorInput) colorInput.value = found.color;
}

async function ewalletSave() {
  const name     = document.getElementById("f-ew-name")?.value?.trim();
  const provider = document.getElementById("f-ew-provider")?.value;
  const color    = document.getElementById("f-ew-color")?.value ||
                   PROVIDERS.find(p => p.name === provider)?.color || "#108EE9";
  const balanceEl = document.getElementById("f-ew-balance");
  const balance  = balanceEl ? (parseFloat(balanceEl.value) || 0) : undefined;

  if (!name) { window.showToast("Nama wallet wajib diisi.", "error"); return; }

  const btn = document.getElementById("ewallet-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    if (editingId) {
      await updateEwallet(editingId, { name, provider, color });
      window.showToast("E-wallet berhasil diperbarui! ✏️", "success");
    } else {
      await addEwallet({ name, provider, balance, color });
      window.showToast(`${name} berhasil ditambahkan! 💳`, "success");
    }
    window.closeModal();
    await loadData();
  } catch (err) {
    console.error("Save ewallet error:", err);
    window.showToast("Gagal menyimpan e-wallet.", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = editingId ? "Simpan Perubahan" : "Tambahkan";
    }
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: TOP-UP / BAYAR
// ═══════════════════════════════════════════════════════
function ewalletOpenTx(walletId, type, walletName) {
  const wallet  = allWallets.find(w => w.id === walletId);
  const isTopUp = type === "in";
  const color   = wallet?.color || "#108EE9";
  const balance = wallet?.balance || 0;
  const today   = new Date().toISOString().split("T")[0];

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="${isTopUp ? "var(--success)" : "var(--danger)"}" stroke-width="2.2">
        ${isTopUp
          ? `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`
          : `<line x1="5" y1="12" x2="19" y2="12"/>`}
      </svg>
      ${isTopUp ? "Top-Up" : "Bayar / Keluar"} — ${walletName}
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Saldo saat ini -->
    <div style="display:flex;align-items:center;justify-content:space-between;
                background:${color}18;border:1px solid ${color}33;
                border-radius:9px;padding:10px 14px;margin-bottom:18px;">
      <span style="font-size:0.82rem;color:var(--text-secondary);">Saldo saat ini</span>
      <span style="font-family:'Playfair Display',serif;font-size:0.95rem;font-weight:700;
                   color:${color};">
        ${window.formatRupiah(balance)}
      </span>
    </div>

    ${!isTopUp && balance === 0 ? `
      <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);
                  border-radius:9px;padding:12px;margin-bottom:16px;
                  font-size:0.82rem;color:var(--danger);">
        ⚠️ Saldo e-wallet ini kosong.
      </div>` : ""}

    <div class="form-group">
      <label class="form-label">Tanggal</label>
      <input type="date" id="f-ew-tx-date" class="form-input"
        value="${today}" max="${today}" />
    </div>
    <div class="form-group">
      <label class="form-label">Jumlah (Rp)</label>
      <div style="position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);
                     font-size:0.84rem;color:var(--text-muted);font-weight:600;">Rp</span>
        <input type="number" id="f-ew-tx-amount" class="form-input"
          style="padding-left:36px;" placeholder="0" min="1" />
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">
        Catatan <span style="color:var(--text-muted);font-weight:400;">(opsional)</span>
      </label>
      <input type="text" id="f-ew-tx-note" class="form-input"
        placeholder="${isTopUp ? "Contoh: Top-up dari BCA" : "Contoh: Bayar Gojek"}"
        maxlength="100" />
    </div>

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="ewalletSaveTx('${walletId}','${type}')" id="ew-tx-save-btn"
        style="flex:2;padding:11px;
               background:linear-gradient(135deg,${isTopUp ? "var(--success),#059669" : "var(--danger),#dc2626"});
               border:none;border-radius:9px;color:white;
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px ${isTopUp ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"};">
        ${isTopUp ? "Simpan Top-Up" : "Konfirmasi Pembayaran"}
      </button>
    </div>`);
}

async function ewalletSaveTx(walletId, type) {
  const date   = document.getElementById("f-ew-tx-date")?.value;
  const amount = parseFloat(document.getElementById("f-ew-tx-amount")?.value);
  const note   = document.getElementById("f-ew-tx-note")?.value?.trim() || "";

  if (!date)              { window.showToast("Tanggal wajib diisi.", "error"); return; }
  if (!amount || amount <= 0) { window.showToast("Jumlah harus lebih dari 0.", "error"); return; }

  // Validasi saldo cukup untuk pembayaran
  if (type === "out") {
    const wallet = allWallets.find(w => w.id === walletId);
    if (wallet && amount > (wallet.balance || 0)) {
      window.showToast(
        `Saldo tidak cukup! Saldo: ${window.formatRupiah(wallet.balance || 0)}`,
        "error"
      );
      return;
    }
  }

  const btn = document.getElementById("ew-tx-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    await addEwalletTransaction({ walletId, type, amount, date, note });
    window.showToast(
      type === "in"
        ? `Top-up ${window.formatRupiah(amount)} berhasil! 💳`
        : `Pembayaran ${window.formatRupiah(amount)} tercatat.`,
      type === "in" ? "success" : "info"
    );
    window.closeModal();
    await loadData();
  } catch (err) {
    console.error("Save ewallet tx error:", err);
    window.showToast("Gagal menyimpan transaksi.", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = type === "in" ? "Simpan Top-Up" : "Konfirmasi Pembayaran";
    }
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: RIWAYAT TRANSAKSI
// ═══════════════════════════════════════════════════════
async function ewalletOpenHistory(walletId, walletName) {
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--primary)" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Riwayat — ${walletName}
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div style="text-align:center;padding:32px;">
      <div class="spinner" style="margin:0 auto 10px;border-color:rgba(16,142,233,0.2);
           border-top-color:#108EE9;"></div>
      <div style="font-size:0.82rem;color:var(--text-muted);">Memuat riwayat...</div>
    </div>`);

  try {
    const txs    = await getEwalletTransactions(walletId);
    const wallet = allWallets.find(w => w.id === walletId);
    renderHistoryModal(walletId, walletName, txs, wallet);
  } catch (err) {
    window.showToast("Gagal memuat riwayat.", "error");
  }
}

function renderHistoryModal(walletId, walletName, txs, wallet) {
  const modal = document.getElementById("global-modal-body");
  if (!modal) return;

  const color   = wallet?.color || "#108EE9";
  const balance = wallet?.balance || 0;

  modal.innerHTML = `
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="${color}" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Riwayat — ${walletName}
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;
                background:${color}18;border:1px solid ${color}33;
                border-radius:9px;padding:10px 14px;margin-bottom:14px;">
      <span style="font-size:0.82rem;color:var(--text-secondary);">Saldo saat ini</span>
      <span style="font-family:'Playfair Display',serif;font-size:0.95rem;
                   font-weight:700;color:${color};">
        ${window.formatRupiah(balance)}
      </span>
    </div>

    <div style="max-height:320px;overflow-y:auto;">
      ${txs.length === 0
        ? `<div class="empty-state" style="padding:32px;">
             <h3>Belum ada transaksi</h3>
             <p>Lakukan top-up atau catat pembayaran.</p>
           </div>`
        : txs.map(tx => {
            const isIn  = tx.type === "in";
            const tColor = isIn ? "var(--success)" : "var(--danger)";
            const sign   = isIn ? "+" : "-";
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:11px 0;
                          border-bottom:1px solid rgba(42,42,69,0.5);">
                <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;
                            background:${isIn ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.1)"};
                            display:flex;align-items:center;justify-content:center;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="${tColor}" stroke-width="2.5">
                    ${isIn
                      ? `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`
                      : `<line x1="5" y1="12" x2="19" y2="12"/>`}
                  </svg>
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.84rem;font-weight:500;color:var(--text-primary);">
                    ${isIn ? "Top-Up" : "Pembayaran"}
                  </div>
                  <div style="font-size:0.73rem;color:var(--text-muted);">
                    ${tx.note || formatDateDisplay(tx.date)}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-family:'Playfair Display',serif;font-size:0.88rem;
                               font-weight:700;color:${tColor};">
                    ${sign}${window.formatRupiah(tx.amount)}
                  </div>
                  ${tx.note
                    ? `<div style="font-size:0.7rem;color:var(--text-muted);">
                         ${formatDateDisplay(tx.date)}
                       </div>`
                    : ""}
                </div>
                <button class="action-btn del" title="Hapus"
                  onclick="ewalletDeleteTx('${tx.id}','${walletId}','${escapeStr(walletName)}')"
                  style="flex-shrink:0;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>`;
          }).join("")}
    </div>

    <button onclick="closeModal()"
      style="width:100%;margin-top:14px;padding:10px;background:var(--surface-el);
             border:1px solid var(--border);border-radius:9px;color:var(--text-secondary);
             font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
             font-weight:500;cursor:pointer;">
      Tutup
    </button>`;
}

async function ewalletDeleteTx(txId, walletId, walletName) {
  try {
    await deleteEwalletTransaction(txId);
    window.showToast("Transaksi dihapus.", "info");
    const txs    = await getEwalletTransactions(walletId);
    await loadData();
    const wallet = allWallets.find(w => w.id === walletId);
    renderHistoryModal(walletId, walletName, txs, wallet);
  } catch (err) {
    window.showToast("Gagal menghapus transaksi.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: HAPUS E-WALLET
// ═══════════════════════════════════════════════════════
function ewalletConfirmDelete(id, name) {
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus E-Wallet
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
        Anda akan menghapus e-wallet:
      </div>
      <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);">${name}</div>
    </div>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-bottom:20px;line-height:1.6;">
      ⚠️ Semua riwayat transaksi wallet ini juga akan dihapus.
    </p>
    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);
               font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
               font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="ewalletDelete('${id}')"
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

async function ewalletDelete(id) {
  try {
    await deleteEwallet(id);
    window.closeModal();
    window.showToast("E-wallet berhasil dihapus.", "info");
    await loadData();
  } catch (err) {
    window.showToast("Gagal menghapus e-wallet.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function setLoading(loading) {
  const el = document.getElementById("ewallet-cards-grid");
  if (!el || !loading) return;
  el.innerHTML = Array(2).fill(`
    <div style="background:var(--surface-card);border:1px solid var(--border);
                border-radius:14px;overflow:hidden;animation:skPulse 1.4s ease infinite;">
      <div style="height:120px;background:var(--surface-el);"></div>
      <div style="padding:14px 18px;">
        <div style="height:9px;width:80%;background:var(--surface-el);
                    border-radius:6px;margin-bottom:8px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          ${Array(3).fill(`<div style="height:36px;background:var(--surface-el);border-radius:8px;"></div>`).join("")}
        </div>
      </div>
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
window.ewalletOpenAdd       = ewalletOpenAdd;
window.ewalletOpenEdit      = ewalletOpenEdit;
window.ewalletSave          = ewalletSave;
window.ewalletProviderChange = ewalletProviderChange;
window.ewalletOpenTx        = ewalletOpenTx;
window.ewalletSaveTx        = ewalletSaveTx;
window.ewalletOpenHistory   = ewalletOpenHistory;
window.ewalletDeleteTx      = ewalletDeleteTx;
window.ewalletConfirmDelete = ewalletConfirmDelete;
window.ewalletDelete        = ewalletDelete;
