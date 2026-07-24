// ═══════════════════════════════════════════════════════
//  core/auth.js
// ═══════════════════════════════════════════════════════

import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── State user on──
let activeUser = null;

export function getActiveUser() {
  return activeUser;
}

// ═══════════════════════════════════════════════════════
//  AUTH STATE LISTENER
// ═══════════════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User sudah login
    activeUser = user;
    window.showApp(user);
    window.hideLoadingScreen();

    // Inisialisasi default page (dashboard)
    window.dispatchEvent(new CustomEvent("auth:ready", { detail: { user } }));

  } else {
    // User belum login / sudah logout
    activeUser = null;
    window.showLogin();
    window.hideLoadingScreen();
  }
});

// ═══════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════
async function handleLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn      = document.getElementById("btn-login");

  // Validasi input
  if (!email || !password) {
    window.showAuthError("Email dan password tidak boleh kosong.");
    return;
  }

  if (!isValidEmail(email)) {
    window.showAuthError("Format email tidak valid.");
    return;
  }

  // Set loading state
  setButtonLoading(btn, true, "Masuk ke Dashboard");

  try {
    await signInWithEmailAndPassword(auth, email, password);

    window.showToast("Selamat datang kembali di OFG.", "success");

  } catch (error) {
    console.error("Login error:", error.code);
    window.showAuthError(getAuthErrorMessage(error.code));
    setButtonLoading(btn, false, "Masuk ke Dashboard");
  }
}

// ═══════════════════════════════════════════════════════
//  REGISTER
// ═══════════════════════════════════════════════════════
async function handleRegister() {
  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const btn      = document.getElementById("btn-register");

  // Validasi input
  if (!name || !email || !password) {
    window.showAuthError("Semua field harus diisi.");
    return;
  }

  if (!isValidEmail(email)) {
    window.showAuthError("Format email tidak valid.");
    return;
  }

  if (password.length < 6) {
    window.showAuthError("Password minimal 6 karakter.");
    return;
  }

  setButtonLoading(btn, true, "Buat Akun");

  try {
    // Make account Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user           = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: name });

    // Simpan profil ke Firestore
    await createUserProfile(user, name);

    window.showToast(`Akun berhasil dibuat! Selamat datang, ${name} 🎉`, "success");
    // onAuthStateChanged otomatis redirect ke dashboard

  } catch (error) {
    console.error("Register error:", error.code);
    window.showAuthError(getAuthErrorMessage(error.code));
    setButtonLoading(btn, false, "Buat Akun");
  }
}

// ═══════════════════════════════════════════════════════
//  LOGOUT
// ═══════════════════════════════════════════════════════
async function handleLogout() {
  // Konfirmasi sebelum logout
  const confirmed = await showLogoutConfirm();
  if (!confirmed) return;

  try {
    await signOut(auth);
    window.showToast("Berhasil keluar. Sampai jumpa! 👋", "info");
  } catch (error) {
    console.error("Logout error:", error);
    window.showToast("Gagal keluar. Coba lagi.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  HELPER
// ═══════════════════════════════════════════════════════
async function createUserProfile(user, name) {
  const userRef = doc(db, "users", user.uid, "profile", "data");

  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      name,
      email:     user.email,
      uid:       user.uid,
      createdAt: serverTimestamp(),
      currency:  "IDR",
      theme:     "dark",
    });
  }
}

// ═══════════════════════════════════════════════════════
//  HELPER: confirm logout via Modal
// ═══════════════════════════════════════════════════════
function showLogoutConfirm() {
  return new Promise((resolve) => {
    window.openModal(`
      <div class="modal-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Konfirmasi Keluar
        <button class="modal-close" onclick="closeModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <p style="color:var(--text-secondary); font-size:0.88rem; margin-bottom:24px; line-height:1.7;">
        Kamu yakin ingin keluar dari Olskard Finance Group?<br>
        Semua data tersimpan di cloud dan aman.
      </p>
      <div style="display:flex; gap:10px;">
        <button onclick="closeModal(); window._logoutResolve(false);"
          style="flex:1; padding:10px; background:var(--surface-el); border:1px solid var(--border); border-radius:9px;
                 color:var(--text-secondary); font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:500; cursor:pointer;">
          Batal
        </button>
        <button onclick="closeModal(); window._logoutResolve(true);"
          style="flex:1; padding:10px; background:linear-gradient(135deg,var(--danger),#dc2626); border:none; border-radius:9px;
                 color:white; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; cursor:pointer;
                 box-shadow:0 4px 12px rgba(248,113,113,0.3);">
          Ya, Keluar
        </button>
      </div>
    `);

    // Simpan resolve ke window agar bisa dipanggil dari HTML inline
    window._logoutResolve = (val) => {
      delete window._logoutResolve;
      resolve(val);
    };
  });
}

// ═══════════════════════════════════════════════════════
//  HELPER: Set tombol ke loading state
// ═══════════════════════════════════════════════════════
function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled   = true;
    btn.innerHTML  = `<div class="spinner"></div><span>Memproses...</span>`;
  } else {
    btn.disabled   = false;
    btn.innerHTML  = `<span>${originalText}</span>`;
  }
}

// ═══════════════════════════════════════════════════════
//  HELPER: validate email
// ═══════════════════════════════════════════════════════
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══════════════════════════════════════════════════════
//  HELPER: error translated
// ═══════════════════════════════════════════════════════
function getAuthErrorMessage(code) {
  const messages = {
    "auth/invalid-email":            "Format email tidak valid.",
    "auth/user-disabled":            "Akun ini telah dinonaktifkan.",
    "auth/user-not-found":           "Email tidak terdaftar.",
    "auth/wrong-password":           "Password salah. Coba lagi.",
    "auth/invalid-credential":       "Email atau password salah.",
    "auth/email-already-in-use":     "Email sudah digunakan akun lain.",
    "auth/weak-password":            "Password terlalu lemah. Minimal 6 karakter.",
    "auth/too-many-requests":        "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/network-request-failed":   "Koneksi gagal. Periksa internet kamu.",
    "auth/popup-closed-by-user":     "Login dibatalkan.",
    "auth/operation-not-allowed":    "Metode login ini tidak diizinkan.",
  };
  return messages[code] || `Terjadi kesalahan. (${code})`;
}

// ═══════════════════════════════════════════════════════
//  EXPORT: Override stub functions
// ═══════════════════════════════════════════════════════
window.handleLogin    = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout   = handleLogout;

export { handleLogin, handleRegister, handleLogout };
