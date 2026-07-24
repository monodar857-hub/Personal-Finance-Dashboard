

import { db } from "./firebase.js";
import { getActiveUser } from "./auth.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ═══════════════════════════════════════════════════════
//  HELPER: get reference collection
// ═══════════════════════════════════════════════════════
function userCol(colName) {
  const user = getActiveUser();
  if (!user) throw new Error("User belum login.");
  return collection(db, "users", user.uid, colName);
}

function userDoc(colName, docId) {
  const user = getActiveUser();
  if (!user) throw new Error("User belum login.");
  return doc(db, "users", user.uid, colName, docId);
}

// ═══════════════════════════════════════════════════════
//  HELPER: Convert Firestore Timestamp → JS Date string
// ═══════════════════════════════════════════════════════
function tsToDateStr(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

// ═══════════════════════════════════════════════════════
//  HELPER: Convert string date "YYYY-MM-DD" → Timestamp
// ═══════════════════════════════════════════════════════
function dateStrToTs(dateStr) {
  return Timestamp.fromDate(new Date(dateStr + "T00:00:00"));
}

// ═══════════════════════════════════════════════════════
//  HELPER: Map Firestore snapshot → array objek
// ═══════════════════════════════════════════════════════
function snapToArray(snapshot) {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ───────────────────────────────────────────────────────
//  INCOME
// ───────────────────────────────────────────────────────

 {{ date:string, source:string, amount:number, note?:string }} data
 */
export async function addIncome(data) {
  const col = userCol("income");
  const ref = await addDoc(col, {
    date:      dateStrToTs(data.date),
    source:    data.source.trim(),
    amount:    Number(data.amount),
    note:      data.note?.trim() || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}


export async function getIncomes() {
  const col  = userCol("income");
  const q    = query(col, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({
    ...d,
    date: tsToDateStr(d.date),
  }));
}

/**
 * @param {number} month - 1-12
 * @param {number} year
 */
export async function getIncomesByMonth(month, year) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  const col   = userCol("income");
  const q     = query(
    col,
    where("date", ">=", Timestamp.fromDate(start)),
    where("date", "<=", Timestamp.fromDate(end)),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({ ...d, date: tsToDateStr(d.date) }));
}

/**
 * Update income date
 * @param {string} id
 * @param {{ date?:string, source?:string, amount?:number, note?:string }} data
 */
export async function updateIncome(id, data) {
  const ref     = userDoc("income", id);
  const updated = {};
  if (data.date)   updated.date   = dateStrToTs(data.date);
  if (data.source) updated.source = data.source.trim();
  if (data.amount !== undefined) updated.amount = Number(data.amount);
  if (data.note   !== undefined) updated.note   = data.note.trim();
  updated.updatedAt = serverTimestamp();
  await updateDoc(ref, updated);
}

/**
 * delete input data
 */
export async function deleteIncome(id) {
  await deleteDoc(userDoc("income", id));
}

/**
 * count total income
 */
export async function getTotalIncomeThisMonth() {
  const now    = new Date();
  const items  = await getIncomesByMonth(now.getMonth() + 1, now.getFullYear());
  return items.reduce((sum, i) => sum + i.amount, 0);
}

// ───────────────────────────────────────────────────────
//  EXPENSE
// ───────────────────────────────────────────────────────

/**
 * Tambah pengeluaran baru
 * @param {{ date:string, category:string, amount:number, note?:string }} data
 */
export async function addExpense(data) {
  const col = userCol("expense");
  const ref = await addDoc(col, {
    date:      dateStrToTs(data.date),
    category:  data.category.trim(),
    amount:    Number(data.amount),
    note:      data.note?.trim() || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}


export async function getExpenses() {
  const col  = userCol("expense");
  const q    = query(col, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({ ...d, date: tsToDateStr(d.date) }));
}


export async function getExpensesByMonth(month, year) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  const col   = userCol("expense");
  const q     = query(
    col,
    where("date", ">=", Timestamp.fromDate(start)),
    where("date", "<=", Timestamp.fromDate(end)),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({ ...d, date: tsToDateStr(d.date) }));
}


export async function updateExpense(id, data) {
  const ref     = userDoc("expense", id);
  const updated = {};
  if (data.date)     updated.date     = dateStrToTs(data.date);
  if (data.category) updated.category = data.category.trim();
  if (data.amount !== undefined) updated.amount = Number(data.amount);
  if (data.note   !== undefined) updated.note   = data.note.trim();
  updated.updatedAt = serverTimestamp();
  await updateDoc(ref, updated);
}


export async function deleteExpense(id) {
  await deleteDoc(userDoc("expense", id));
}


export async function getTotalExpenseThisMonth() {
  const now   = new Date();
  const items = await getExpensesByMonth(now.getMonth() + 1, now.getFullYear());
  return items.reduce((sum, i) => sum + i.amount, 0);
}

/**
 * Summary of expenses per category this month
 * @returns {{ category:string, total:number }[]}
 */
export async function getExpenseByCategoryThisMonth() {
  const now   = new Date();
  const items = await getExpensesByMonth(now.getMonth() + 1, now.getFullYear());
  const map   = {};
  items.forEach(i => {
    map[i.category] = (map[i.category] || 0) + i.amount;
  });
  return Object.entries(map).map(([category, total]) => ({ category, total }));
}

// ───────────────────────────────────────────────────────
//  SAVINGS
// ───────────────────────────────────────────────────────

/**
 * add goal new savings
 * @param {{ label:string, target:number, note?:string }} data
 */
export async function addSavingGoal(data) {
  const col = userCol("savings_goals");
  const ref = await addDoc(col, {
    label:     data.label.trim(),
    target:    Number(data.target) || 0,
    total:     0,
    note:      data.note?.trim() || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}


export async function getSavingGoals() {
  const col  = userCol("savings_goals");
  const q    = query(col, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Update goal saving
 */
export async function updateSavingGoal(id, data) {
  const ref     = userDoc("savings_goals", id);
  const updated = {};
  if (data.label  !== undefined) updated.label  = data.label.trim();
  if (data.target !== undefined) updated.target = Number(data.target);
  if (data.note   !== undefined) updated.note   = data.note.trim();
  updated.updatedAt = serverTimestamp();
  await updateDoc(ref, updated);
}

/**
 * delete goal savings
 */
export async function deleteSavingGoal(goalId) {
 
  const txCol  = userCol("savings_tx");
  const q      = query(txCol, where("goalId", "==", goalId));
  const snap   = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  // delete goal
  await deleteDoc(userDoc("savings_goals", goalId));
}

/**
 * add savings transactions
 * @param {{ goalId:string, type:'in'|'out', amount:number, date:string, note?:string }} data
 */
export async function addSavingTransaction(data) {
  const col = userCol("savings_tx");
  const ref = await addDoc(col, {
    goalId:    data.goalId,
    type:      data.type,         // "in" = setor, "out" = tarik
    amount:    Number(data.amount),
    date:      dateStrToTs(data.date),
    note:      data.note?.trim() || "",
    createdAt: serverTimestamp(),
  });

  
  const goalRef  = userDoc("savings_goals", data.goalId);
  const goalSnap = await getDoc(goalRef);
  if (goalSnap.exists()) {
    const current = goalSnap.data().total || 0;
    const delta   = data.type === "in" ? Number(data.amount) : -Number(data.amount);
    await updateDoc(goalRef, { total: Math.max(0, current + delta) });
  }

  return ref.id;
}


export async function getSavingTransactions(goalId = null) {
  const col = userCol("savings_tx");
  const q   = goalId
    ? query(col, where("goalId", "==", goalId), orderBy("date", "desc"))
    : query(col, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({ ...d, date: tsToDateStr(d.date) }));
}

export async function deleteSavingTransaction(txId) {
  const txRef  = userDoc("savings_tx", txId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) return;

  const tx       = txSnap.data();
  const goalRef  = userDoc("savings_goals", tx.goalId);
  const goalSnap = await getDoc(goalRef);

  if (goalSnap.exists()) {
    const current = goalSnap.data().total || 0;
    const delta   = tx.type === "in" ? -tx.amount : tx.amount;
    await updateDoc(goalRef, { total: Math.max(0, current + delta) });
  }

  await deleteDoc(txRef);
}


export async function getTotalSavings() {
  const goals = await getSavingGoals();
  return goals.reduce((sum, g) => sum + (g.total || 0), 0);
}

// ───────────────────────────────────────────────────────
//  EMERGENCY FUND
// ───────────────────────────────────────────────────────

export async function getEmergencyData() {
  const ref  = userDoc("emergency", "data");
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();


  const defaults = { total: 0, target: 0, updatedAt: serverTimestamp() };
  await setDoc(ref, defaults);
  return defaults;
}


export async function setEmergencyTarget(target) {
  const ref = userDoc("emergency", "data");
  await setDoc(ref, { target: Number(target), updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * add emergency fund transaction
 * @param {{ type:'in'|'out', amount:number, date:string, note?:string }} data
 */
export async function addEmergencyTransaction(data) {
  const col = userCol("emergency_tx");
  await addDoc(col, {
    type:      data.type,
    amount:    Number(data.amount),
    date:      dateStrToTs(data.date),
    note:      data.note?.trim() || "",
    createdAt: serverTimestamp(),
  });

  const ref  = userDoc("emergency", "data");
  const snap = await getDoc(ref);
  const current = snap.exists() ? (snap.data().total || 0) : 0;
  const delta   = data.type === "in" ? Number(data.amount) : -Number(data.amount);
  await setDoc(ref, { total: Math.max(0, current + delta), updatedAt: serverTimestamp() }, { merge: true });
}


export async function getEmergencyTransactions() {
  const col  = userCol("emergency_tx");
  const q    = query(col, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({ ...d, date: tsToDateStr(d.date) }));
}


export async function deleteEmergencyTransaction(txId) {
  const txRef  = userDoc("emergency_tx", txId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) return;

  const tx      = txSnap.data();
  const mainRef = userDoc("emergency", "data");
  const mainSnap = await getDoc(mainRef);

  if (mainSnap.exists()) {
    const current = mainSnap.data().total || 0;
    const delta   = tx.type === "in" ? -tx.amount : tx.amount;
    await setDoc(mainRef, { total: Math.max(0, current + delta), updatedAt: serverTimestamp() }, { merge: true });
  }

  await deleteDoc(txRef);
}

// ───────────────────────────────────────────────────────
//  ASSETS
// ───────────────────────────────────────────────────────

/**
 * Tambah aset baru
 * @param {{ name:string, type:string, value:number, note?:string }} data
 */
export async function addAsset(data) {
  const col = userCol("assets");
  const ref = await addDoc(col, {
    name:      data.name.trim(),
    type:      data.type.trim(),
    value:     Number(data.value),
    prevValue: Number(data.value), // nilai awal = nilai sekarang
    note:      data.note?.trim() || "",
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Ambil semua aset
 */
export async function getAssets() {
  const col  = userCol("assets");
  const q    = query(col, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({
    ...d,
    updatedAt: d.updatedAt ? tsToDateStr(d.updatedAt) : "",
    createdAt: d.createdAt ? tsToDateStr(d.createdAt) : "",
  }));
}

/**
 * Update nilai aset (menyimpan prevValue untuk indikator naik/turun)
 */
export async function updateAsset(id, data) {
  const ref      = userDoc("assets", id);
  const snap     = await getDoc(ref);
  const current  = snap.exists() ? snap.data() : {};
  const updated  = {};

  if (data.name  !== undefined) updated.name  = data.name.trim();
  if (data.type  !== undefined) updated.type  = data.type.trim();
  if (data.note  !== undefined) updated.note  = data.note.trim();

  if (data.value !== undefined) {
    updated.prevValue = current.value || Number(data.value);
    updated.value     = Number(data.value);
  }

  updated.updatedAt = serverTimestamp();
  await updateDoc(ref, updated);
}

/**
 * Hapus aset
 */
export async function deleteAsset(id) {
  await deleteDoc(userDoc("assets", id));
}

/**
 * Hitung total nilai semua aset
 */
export async function getTotalAssets() {
  const assets = await getAssets();
  return assets.reduce((sum, a) => sum + (a.value || 0), 0);
}

// ───────────────────────────────────────────────────────
//  TODO LIST
// ───────────────────────────────────────────────────────

/**
 * Tambah task baru
 * @param {{ text:string, priority:'low'|'medium'|'high' }} data
 */
export async function addTodo(data) {
  const col = userCol("todo");
  const ref = await addDoc(col, {
    text:      data.text.trim(),
    priority:  data.priority || "medium",
    done:      false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Ambil semua task
 */
export async function getTodos() {
  const col  = userCol("todo");
  const q    = query(col, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const items = snapToArray(snap);

  // Sort: undone first, then by priority (high→medium→low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });
}

/**
 * Toggle status done/undone
 */
export async function toggleTodo(id, currentDone) {
  const ref = userDoc("todo", id);
  await updateDoc(ref, {
    done:      !currentDone,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update teks atau prioritas task
 */
export async function updateTodo(id, data) {
  const ref     = userDoc("todo", id);
  const updated = {};
  if (data.text     !== undefined) updated.text     = data.text.trim();
  if (data.priority !== undefined) updated.priority = data.priority;
  updated.updatedAt = serverTimestamp();
  await updateDoc(ref, updated);
}

/**
 * Hapus task
 */
export async function deleteTodo(id) {
  await deleteDoc(userDoc("todo", id));
}

/**
 * Hapus semua task yang sudah selesai
 */
export async function clearDoneTodos() {
  const todos    = await getTodos();
  const doneTodos = todos.filter(t => t.done);
  await Promise.all(doneTodos.map(t => deleteDoc(userDoc("todo", t.id))));
  return doneTodos.length;
}

// ───────────────────────────────────────────────────────
//  ANALYTICS HELPERS
// ───────────────────────────────────────────────────────

/**
 * Ambil ringkasan keuangan N bulan terakhir
 * @param {number} months -
 * @returns {{ label:string, income:number, expense:number, balance:number }[]}
 */
export async function getMonthlySummary(months = 6) {
  const result = [];
  const now    = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year  = date.getFullYear();

    const [incomes, expenses] = await Promise.all([
      getIncomesByMonth(month, year),
      getExpensesByMonth(month, year),
    ]);

    const totalIncome  = incomes.reduce((s, x) => s + x.amount, 0);
    const totalExpense = expenses.reduce((s, x) => s + x.amount, 0);

    const label = date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

    result.push({
      label,
      income:  totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    });
  }

  return result;
}

/**
 * Ambil ringkasan dashboard (semua data utama sekaligus)
 * @returns {{ incomeThisMonth, expenseThisMonth, totalSavings, totalAssets,
 *             balance, recentTransactions }}
 */
export async function getDashboardSummary() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Ambil semua data secara paralel
  const [incomes, expenses, savingsGoals, assets, todos] = await Promise.all([
    getIncomesByMonth(month, year),
    getExpensesByMonth(month, year),
    getSavingGoals(),
    getAssets(),
    getTodos(),
  ]);

  const incomeThisMonth  = incomes.reduce((s, x) => s + x.amount, 0);
  const expenseThisMonth = expenses.reduce((s, x) => s + x.amount, 0);
  const totalSavings     = savingsGoals.reduce((s, g) => s + (g.total || 0), 0);
  const totalAssets      = assets.reduce((s, a) => s + (a.value || 0), 0);

  // 5 transaksi terbaru (gabungan income + expense)
  const allTx = [
    ...incomes.map(i  => ({ ...i, txType: "income"  })),
    ...expenses.map(e => ({ ...e, txType: "expense" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return {
    incomeThisMonth,
    expenseThisMonth,
    balance:            incomeThisMonth - expenseThisMonth,
    totalSavings,
    totalAssets,
    recentTransactions: allTx,
    pendingTodos:       todos.filter(t => !t.done).length,
  };
}

export {
  tsToDateStr,
  dateStrToTs,
};


// ───────────────────────────────────────────────────────
//  ALLOCATION 
// ───────────────────────────────────────────────────────

/**
 * Tambah item alokasi baru
 * @param {{ name:string, amount:number, note?:string }} data
 */
export async function addAllocation(data) {
  const col = userCol("allocation");
  const ref = await addDoc(col, {
    name:      data.name.trim(),
    amount:    Number(data.amount),
    note:      data.note?.trim() || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Ambil semua alokasi
 */
export async function getAllocations() {
  const col  = userCol("allocation");
  const q    = query(col, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Update alokasi
 */
export async function updateAllocation(id, data) {
  const ref     = userDoc("allocation", id);
  const updated = {};
  if (data.name   !== undefined) updated.name   = data.name.trim();
  if (data.amount !== undefined) updated.amount = Number(data.amount);
  if (data.note   !== undefined) updated.note   = data.note.trim();
  updated.updatedAt = serverTimestamp();
  await updateDoc(ref, updated);
}

/**
 * Hapus alokasi
 */
export async function deleteAllocation(id) {
  await deleteDoc(userDoc("allocation", id));
}

/**
 * Hitung total semua alokasi
 */
export async function getTotalAllocation() {
  const items = await getAllocations();
  return items.reduce((s, a) => s + (a.amount || 0), 0);
}

// ───────────────────────────────────────────────────────
//  ██  E-WALLET
// ───────────────────────────────────────────────────────

/**
 * add new e-wallet
 * @param {{ name:string, provider:string, balance:number, color?:string }} data
 */
export async function addEwallet(data) {
  const col = userCol("ewallet");
  const ref = await addDoc(col, {
    name:      data.name.trim(),
    provider:  data.provider.trim(),
    balance:   Number(data.balance) || 0,
    color:     data.color || "#7c6af7",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 */
export async function getEwallets() {
  const col  = userCol("ewallet");
  const q    = query(col, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snapToArray(snap);
}

/**
 * Update e-wallet data
 */
export async function updateEwallet(id, data) {
  const ref     = userDoc("ewallet", id);
  const updated = {};
  if (data.name     !== undefined) updated.name     = data.name.trim();
  if (data.provider !== undefined) updated.provider = data.provider.trim();
  if (data.color    !== undefined) updated.color    = data.color;
  updated.updatedAt = serverTimestamp();
  await updateDoc(ref, updated);
}

/**
 * Hapus e-wallet beserta semua transaksinya
 */
export async function deleteEwallet(walletId) {
  const txCol = userCol("ewallet_tx");
  const q     = query(txCol, where("walletId", "==", walletId));
  const snap  = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(userDoc("ewallet", walletId));
}

/**
 * add transaction e-walletion
 * @param {{ walletId:string, type:'in'|'out', amount:number, date:string, note?:string }} data
 */
export async function addEwalletTransaction(data) {
  const col = userCol("ewallet_tx");
  await addDoc(col, {
    walletId:  data.walletId,
    type:      data.type,
    amount:    Number(data.amount),
    date:      dateStrToTs(data.date),
    note:      data.note?.trim() || "",
    createdAt: serverTimestamp(),
  });


  const walletRef  = userDoc("ewallet", data.walletId);
  const walletSnap = await getDoc(walletRef);
  if (walletSnap.exists()) {
    const current = walletSnap.data().balance || 0;
    const delta   = data.type === "in" ? Number(data.amount) : -Number(data.amount);
    await updateDoc(walletRef, { balance: Math.max(0, current + delta) });
  }
}


export async function getEwalletTransactions(walletId = null) {
  const col = userCol("ewallet_tx");
  const q   = walletId
    ? query(col, where("walletId", "==", walletId), orderBy("date", "desc"))
    : query(col, orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snapToArray(snap).map(d => ({ ...d, date: tsToDateStr(d.date) }));
}


export async function deleteEwalletTransaction(txId) {
  const txRef  = userDoc("ewallet_tx", txId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) return;

  const tx         = txSnap.data();
  const walletRef  = userDoc("ewallet", tx.walletId);
  const walletSnap = await getDoc(walletRef);

  if (walletSnap.exists()) {
    const current = walletSnap.data().balance || 0;
    const delta   = tx.type === "in" ? -tx.amount : tx.amount;
    await updateDoc(walletRef, { balance: Math.max(0, current + delta) });
  }

  await deleteDoc(txRef);
}

export async function getTotalEwalletBalance() {
  const wallets = await getEwallets();
  return wallets.reduce((s, w) => s + (w.balance || 0), 0);
}
