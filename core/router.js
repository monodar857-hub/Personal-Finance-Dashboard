// ═══════════════════════════════════════════════════════
//  core/router.js
// ═══════════════════════════════════════════════════════

const ROUTES = {
  dashboard : "../pages/dashboard.js",
  income    : "../pages/income.js",
  expense   : "../pages/expense.js",
  savings   : "../pages/savings.js",
  emergency : "../pages/emergency.js",
  assets    : "../pages/assets.js",
  analytics  : "../pages/analytics.js",
  todo       : "../pages/todo.js",
  allocation : "../pages/allocation.js",
  ewallet    : "../pages/ewallet.js",
};

// page title
const PAGE_TITLES = {
  dashboard : "Dashboard",
  income    : "Pemasukan",
  expense   : "Pengeluaran",
  savings   : "Tabungan",
  emergency : "Dana Darurat",
  assets    : "Aset",
  analytics  : "Analitik",
  todo       : "To-Do List",
  allocation : "Alokasi Dana",
  ewallet    : "E-Wallet",
};

// ── Cache module ─────────────────────
const moduleCache = {};

// ── Halaman yang sedang aktif ──────────────────────────
let currentPage = null;

// ── Flag apakah user sudah auth ────────────────────────
let isAuthenticated = false;

// ═══════════════════════════════════════════════════════
//  INISIALISASI ROUTER
// ═══════════════════════════════════════════════════════
window.addEventListener("auth:ready", async (e) => {
  isAuthenticated = true;

  // Ambil halaman terakhir dari sessionStorage, default: dashboard
  const lastPage = sessionStorage.getItem("ofg-current-page") || "dashboard";
  router.navigate(lastPage, false);

  // Pre-load all page in background
  preloadAllPages(lastPage);
});

// ═══════════════════════════════════════════════════════
//  PRE-LOAD ALL PAGE IN BACKGROUND
// ═══════════════════════════════════════════════════════
async function preloadAllPages(activePage) {
  // Tunggu halaman aktif selesai render dulu
  await new Promise(r => setTimeout(r, 800));

  const otherPages = Object.keys(ROUTES).filter(p => p !== activePage);

  for (const page of otherPages) {
    try {
      // Import modul jika belum di-cache
      if (!moduleCache[page]) {
        moduleCache[page] = await import(ROUTES[page]);
      }

      if (moduleCache[page].init) {
        await moduleCache[page].init();
      }

      console.log(`Router: ✅ preloaded ${page}`);

      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
 
      console.warn(`Router: preload "${page}" gagal, akan di-load saat dikunjungi.`, err);
    }
  }

  console.log("Router: ✅ semua halaman sudah di-preload.");
}

// ═══════════════════════════════════════════════════════
//  NAVIGATE EVENT
// ═══════════════════════════════════════════════════════
window.addEventListener("navigate", async (e) => {
  if (!isAuthenticated) return;
  const { page } = e.detail;
  await loadPage(page);
});

// ═══════════════════════════════════════════════════════
//  LOAD PAGE
// ═══════════════════════════════════════════════════════
async function loadPage(page) {
  if (!ROUTES[page]) {
    console.warn(`Router: halaman "${page}" tidak ditemukan, redirect ke dashboard.`);
    page = "dashboard";
  }

  if (page === currentPage) return;

  const prevPage = currentPage;
  currentPage    = page;

  // Save to sessionStorage
  sessionStorage.setItem("ofg-current-page", page);

  // Update browser tab title
  document.title = `${PAGE_TITLES[page]} — OFG`;

  try {
    // Lazy load module
    if (!moduleCache[page]) {
      console.log(`Router: loading module pages/${page}.js`);
      moduleCache[page] = await import(ROUTES[page]);
    }

    const mod = moduleCache[page];

    if (prevPage && moduleCache[prevPage]?.destroy) {
      moduleCache[prevPage].destroy();
    }

    if (mod.init) {
      await mod.init();
    }

    requestAnimationFrame(() => {
      const el = document.getElementById("page-content");
      if (el) el.scrollTo({ top: 0, behavior: "instant" });
    });

    console.log(`Router: ✅ ${page} loaded`);

  } catch (err) {
    console.error(`Router: gagal load halaman "${page}"`, err);
    showPageError(page, err);
  }
}

// ═══════════════════════════════════════════════════════
//  SHOW PAGE ERROR
// ═══════════════════════════════════════════════════════
function showPageError(page, err) {
  const el = document.getElementById(`page-${page}`);
  if (!el) return;

  el.innerHTML = `
    <div class="empty-state" style="padding-top:80px;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3 style="color:var(--danger);">Gagal Memuat Halaman</h3>
      <p style="margin-bottom:16px;">${err.message || "Terjadi kesalahan tidak diketahui."}</p>
      <button onclick="window.navigateTo('${page}')"
        style="padding:8px 18px; background:var(--surface-el); border:1px solid var(--border);
               border-radius:8px; color:var(--text-secondary); font-family:'DM Sans',sans-serif;
               font-size:0.85rem; cursor:pointer;">
        Coba Lagi
      </button>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
//  ROUTER OBJECT
// ═══════════════════════════════════════════════════════
const router = {
  navigate(page, triggerNavUI = true) {
    if (triggerNavUI) {
      window.navigateTo(page);
    } else {
      loadPage(page);

      document.querySelectorAll(".nav-item").forEach(el => {
        el.classList.toggle("active", el.dataset.page === page);
      });
      document.querySelectorAll(".page-view").forEach(el => {
        el.classList.toggle("active", el.id === "page-" + page);
      });

      const titles = {
        dashboard:"Dashboard", income:"Pemasukan", expense:"Pengeluaran",
        savings:"Tabungan", emergency:"Dana Darurat", assets:"Aset",
        analytics:"Analitik", todo:"To-Do List", allocation:"Alokasi Dana", ewallet:"E-Wallet"
      };
      const titleEl = document.getElementById("page-title");
      if (titleEl) titleEl.textContent = titles[page] || page;
    }
  },

  getCurrentPage() { return currentPage; },

  reload(page) {
    if (moduleCache[page]) delete moduleCache[page];
    currentPage = null;
    this.navigate(page);
  },
};

window.router = router;
export { router, loadPage };
