// ═══════════════════════════════════════════════════════
//  pages/todo.js
//  Halaman To-Do List — kelola task harian & target.
//
//  Fitur:
//   - Tambah task baru dengan prioritas (tinggi/sedang/rendah)
//   - Toggle done/undone langsung dari list
//   - Edit teks & prioritas task
//   - Hapus task (individual & hapus semua yang selesai)
//   - Filter: Semua / Belum Selesai / Sudah Selesai
//   - Sort by prioritas otomatis
//   - Progress bar penyelesaian task hari ini
//   - Quick add (tekan Enter langsung tambah)
//
//  Lifecycle:
//   init()    → dipanggil router
//   destroy() → cleanup state
// ═══════════════════════════════════════════════════════

import {
  getTodos,
  addTodo,
  toggleTodo,
  updateTodo,
  deleteTodo,
  clearDoneTodos,
} from "../core/storage.js";

// ── State lokal ────────────────────────────────────────
let allTodos    = [];
let activeFilter = "all";   // "all" | "pending" | "done"
let editingId   = null;

// ── Prioritas meta ─────────────────────────────────────
const PRIORITY = {
  high:   { label: "Tinggi",  color: "var(--danger)",  bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)",  dot: "#f87171" },
  medium: { label: "Sedang",  color: "var(--warning)", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",   dot: "#fbbf24" },
  low:    { label: "Rendah",  color: "var(--success)", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",   dot: "#34d399" },
};

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
export async function init() {
  const container = document.getElementById("page-todo");
  if (!container) return;

  container.innerHTML = renderShell();
  bindQuickAdd();
  await loadTodos();
}

// ═══════════════════════════════════════════════════════
//  DESTROY
// ═══════════════════════════════════════════════════════
export function destroy() {
  allTodos     = [];
  activeFilter = "all";
  editingId    = null;
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
        To-Do List
      </h2>
      <p style="font-size:0.83rem;color:var(--text-muted);">
        Catat tugas & target harianmu di sini.
      </p>
    </div>
    <button id="btn-clear-done" onclick="todoClearDone()"
      style="display:flex;align-items:center;gap:7px;padding:9px 16px;
             background:var(--surface-card);border:1px solid var(--border);border-radius:9px;
             color:var(--text-secondary);font-family:'DM Sans',sans-serif;font-size:0.84rem;
             font-weight:500;cursor:pointer;transition:all .2s;display:none;"
      onmouseover="this.style.borderColor='var(--danger)';this.style.color='var(--danger)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Selesai
    </button>
  </div>

  <!-- ── Progress + Stats ──────────────────────── -->
  <div id="todo-stats" style="margin-bottom:16px;"></div>

  <!-- ── Quick Add Input ───────────────────────── -->
  <div class="card" style="padding:16px 18px;margin-bottom:14px;">
    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <label class="form-label" style="margin-bottom:6px;">Task Baru</label>
        <input type="text" id="todo-quick-input" class="form-input"
          placeholder="Ketik task lalu Enter atau klik Tambah..."
          maxlength="200"
          style="margin-bottom:0;" />
      </div>
      <div style="min-width:140px;">
        <label class="form-label" style="margin-bottom:6px;">Prioritas</label>
        <select id="todo-quick-priority" class="form-input"
          style="cursor:pointer;margin-bottom:0;">
          <option value="medium">⚡ Sedang</option>
          <option value="high">🔴 Tinggi</option>
          <option value="low">🟢 Rendah</option>
        </select>
      </div>
      <button onclick="todoQuickAdd()"
        style="padding:11px 22px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;white-space:nowrap;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);transition:all .2s;height:42px;"
        onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(124,106,247,0.45)'"
        onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 14px rgba(124,106,247,0.3)'">
        + Tambah
      </button>
    </div>
  </div>

  <!-- ── Filter Tabs ────────────────────────────── -->
  <div style="display:flex;align-items:center;justify-content:space-between;
              flex-wrap:wrap;gap:10px;margin-bottom:12px;">
    <div style="display:flex;gap:4px;background:var(--surface-el);
                border-radius:10px;padding:3px;">
      ${["all","pending","done"].map(f => `
        <button id="todo-tab-${f}" onclick="todoSetFilter('${f}')"
          style="padding:7px 16px;border-radius:8px;border:none;cursor:pointer;
                 font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:600;
                 transition:all .2s;
                 background:${f === "all" ? "var(--primary)" : "transparent"};
                 color:${f === "all" ? "white" : "var(--text-secondary)"};">
          ${f === "all" ? "Semua" : f === "pending" ? "Belum Selesai" : "Sudah Selesai"}
        </button>`).join("")}
    </div>
    <span id="todo-count"
      style="font-size:0.78rem;color:var(--text-muted);"></span>
  </div>

  <!-- ── Todo List ─────────────────────────────── -->
  <div id="todo-list-container"></div>`;
}

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function loadTodos() {
  try {
    allTodos = await getTodos();
    renderStats();
    renderList();
    updateClearBtn();
  } catch (err) {
    console.error("Load todos error:", err);
    window.showToast("Gagal memuat to-do list.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: STATS / PROGRESS
// ═══════════════════════════════════════════════════════
function renderStats() {
  const el = document.getElementById("todo-stats");
  if (!el) return;

  const total   = allTodos.length;
  const done    = allTodos.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  const highPending   = allTodos.filter(t => !t.done && t.priority === "high").length;
  const mediumPending = allTodos.filter(t => !t.done && t.priority === "medium").length;
  const lowPending    = allTodos.filter(t => !t.done && t.priority === "low").length;

  const progressColor = pct >= 100
    ? "var(--success)" : pct >= 60
    ? "var(--primary)" : pct >= 30
    ? "var(--warning)"
    : "var(--danger)";

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;"
         id="todo-stats-grid">

      <!-- Progress Card -->
      <div class="card" style="border-color:rgba(124,106,247,0.2);
           background:linear-gradient(135deg,rgba(124,106,247,0.07),transparent);">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:12px;">
          <div>
            <div class="card-title" style="margin-bottom:2px;">Progress Hari Ini</div>
            <div style="font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:700;
                        color:var(--text-primary);">
              ${done} dari ${total} task selesai
            </div>
          </div>
          <div style="font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;
                      color:${progressColor};letter-spacing:-0.04em;">
            ${pct}%
          </div>
        </div>
        <div class="progress-track" style="height:8px;margin-bottom:10px;">
          <div style="height:100%;border-radius:99px;transition:width .6s ease;
                      width:${pct}%;background:linear-gradient(90deg,${progressColor},${progressColor}aa);">
          </div>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);">
          ${pct >= 100
            ? "🎉 Semua task selesai! Luar biasa!"
            : pending > 0
            ? `${pending} task belum selesai`
            : "Belum ada task hari ini."}
        </div>
      </div>

      <!-- Priority Breakdown -->
      <div class="card" style="min-width:180px;">
        <div class="card-title" style="margin-bottom:12px;">Prioritas Pending</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            ["high",   highPending,   "🔴"],
            ["medium", mediumPending, "⚡"],
            ["low",    lowPending,    "🟢"],
          ].map(([p, count, emoji]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:7px;">
                <span style="font-size:11px;">${emoji}</span>
                <span style="font-size:0.78rem;color:var(--text-secondary);">
                  ${PRIORITY[p].label}
                </span>
              </div>
              <span style="font-family:'Syne',sans-serif;font-size:0.9rem;font-weight:700;
                           color:${count > 0 ? PRIORITY[p].color : "var(--text-muted)"};">
                ${count}
              </span>
            </div>`).join("")}
        </div>
      </div>

    </div>

    <style>
      @media (max-width: 640px) {
        #todo-stats-grid { grid-template-columns: 1fr !important; }
      }
    </style>`;
}

// ═══════════════════════════════════════════════════════
//  RENDER: TODO LIST
// ═══════════════════════════════════════════════════════
function renderList() {
  const el      = document.getElementById("todo-list-container");
  const countEl = document.getElementById("todo-count");
  if (!el) return;

  // Filter
  let filtered = allTodos;
  if (activeFilter === "pending") filtered = allTodos.filter(t => !t.done);
  if (activeFilter === "done")    filtered = allTodos.filter(t => t.done);

  if (countEl) countEl.textContent = `${filtered.length} task`;

  if (filtered.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:52px 24px;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <h3>
          ${activeFilter === "done"
            ? "Belum Ada Task Selesai"
            : activeFilter === "pending"
            ? "Semua Task Sudah Selesai! 🎉"
            : "To-Do List Kosong"}
        </h3>
        <p>
          ${activeFilter === "all"
            ? "Tambahkan task pertamamu di atas."
            : activeFilter === "pending"
            ? "Kamu sudah menyelesaikan semua task!"
            : "Selesaikan beberapa task dulu."}
        </p>
      </div>`;
    return;
  }

  // Pisah pending & done untuk tampilan
  const pending = filtered.filter(t => !t.done);
  const done    = filtered.filter(t => t.done);

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${pending.map(t => renderTodoItem(t)).join("")}
      ${done.length > 0 && activeFilter !== "done" ? `
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0 4px;">
          <div style="flex:1;height:1px;background:var(--border);"></div>
          <span style="font-size:0.73rem;color:var(--text-muted);white-space:nowrap;
                       letter-spacing:0.05em;text-transform:uppercase;">
            Selesai (${done.length})
          </span>
          <div style="flex:1;height:1px;background:var(--border);"></div>
        </div>` : ""}
      ${done.map(t => renderTodoItem(t)).join("")}
    </div>`;
}

function renderTodoItem(todo) {
  const p       = PRIORITY[todo.priority] || PRIORITY.medium;
  const isDone  = todo.done;

  return `
    <div id="todo-item-${todo.id}"
      style="display:flex;align-items:center;gap:12px;padding:13px 16px;
             background:var(--surface-card);border:1px solid var(--border);
             border-radius:12px;transition:all .2s;
             ${isDone ? "opacity:0.6;" : ""}
             ${!isDone && todo.priority === "high"
               ? "border-left:3px solid var(--danger);" : ""}"
      onmouseover="this.style.borderColor='rgba(124,106,247,0.3)'"
      onmouseout="this.style.borderColor='${!isDone && todo.priority === "high"
        ? "var(--danger)" : "var(--border)"}'">

      <!-- Checkbox -->
      <button onclick="todoToggle('${todo.id}',${isDone})"
        style="width:22px;height:22px;border-radius:6px;flex-shrink:0;cursor:pointer;
               border:2px solid ${isDone ? "var(--success)" : p.dot};
               background:${isDone ? "var(--success)" : "transparent"};
               display:flex;align-items:center;justify-content:center;
               transition:all .2s;">
        ${isDone
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="white" stroke-width="3.5" stroke-linecap="round">
               <polyline points="20 6 9 17 4 12"/>
             </svg>`
          : ""}
      </button>

      <!-- Priority Dot (hanya saat pending) -->
      ${!isDone ? `
        <div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;
                    background:${p.dot};
                    box-shadow:0 0 6px ${p.dot}88;">
        </div>` : ""}

      <!-- Text -->
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.875rem;color:${isDone ? "var(--text-muted)" : "var(--text-primary)"};
                    text-decoration:${isDone ? "line-through" : "none"};
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                    font-weight:${!isDone && todo.priority === "high" ? "600" : "400"};">
          ${todo.text}
        </div>
        <div style="display:flex;align-items:center;gap:7px;margin-top:3px;">
          <span style="display:inline-flex;align-items:center;gap:4px;
                       font-size:0.7rem;font-weight:600;
                       color:${isDone ? "var(--text-muted)" : p.color};">
            <span style="width:5px;height:5px;border-radius:50%;
                         background:${isDone ? "var(--text-muted)" : p.dot};"></span>
            ${p.label}
          </span>
          ${isDone
            ? `<span style="font-size:0.7rem;color:var(--success);font-weight:600;">
                 ✓ Selesai
               </span>`
            : ""}
        </div>
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:5px;flex-shrink:0;opacity:0;transition:opacity .2s;"
           class="todo-actions-${todo.id}"
           onmouseenter="this.style.opacity='1'"
           onmouseleave="this.style.opacity='0'">
        ${!isDone ? `
          <button class="action-btn edit" title="Edit"
            onclick="todoOpenEdit('${todo.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>` : ""}
        <button class="action-btn del" title="Hapus"
          onclick="todoConfirmDelete('${todo.id}','${escapeStr(todo.text)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>

    </div>

    <style>
      #todo-item-${todo.id}:hover .todo-actions-${todo.id} { opacity: 1 !important; }
    </style>`;
}

// ═══════════════════════════════════════════════════════
//  QUICK ADD (Enter key)
// ═══════════════════════════════════════════════════════
function bindQuickAdd() {
  setTimeout(() => {
    const input = document.getElementById("todo-quick-input");
    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") todoQuickAdd();
      });
    }
  }, 100);
}

async function todoQuickAdd() {
  const input    = document.getElementById("todo-quick-input");
  const selPriority = document.getElementById("todo-quick-priority");
  const text     = input?.value?.trim();
  const priority = selPriority?.value || "medium";

  if (!text) {
    window.showToast("Tulis dulu task-nya! 😄", "error");
    input?.focus();
    return;
  }

  try {
    await addTodo({ text, priority });
    if (input)       input.value       = "";
    if (selPriority) selPriority.value = "medium";
    input?.focus();

    window.showToast("Task berhasil ditambahkan! ✅", "success");
    await loadTodos();
  } catch (err) {
    console.error("Add todo error:", err);
    window.showToast("Gagal menambahkan task.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  TOGGLE DONE / UNDONE
// ═══════════════════════════════════════════════════════
async function todoToggle(id, currentDone) {
  try {
    await toggleTodo(id, currentDone);
    if (!currentDone) {
      window.showToast("Task selesai! 🎉", "success");
    }
    await loadTodos();
  } catch (err) {
    console.error("Toggle todo error:", err);
    window.showToast("Gagal update status task.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  MODAL: EDIT TASK
// ═══════════════════════════════════════════════════════
function todoOpenEdit(id) {
  const todo = allTodos.find(t => t.id === id);
  if (!todo) return;
  editingId = id;

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--primary)" stroke-width="2.2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit Task
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="form-group">
      <label class="form-label">Teks Task</label>
      <input type="text" id="f-todo-text" class="form-input"
        value="${escapeStr(todo.text)}" maxlength="200"
        placeholder="Tulis task..." />
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Prioritas</label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${["high","medium","low"].map(p => {
          const meta    = PRIORITY[p];
          const checked = todo.priority === p;
          return `
            <label style="cursor:pointer;">
              <input type="radio" name="f-todo-priority" value="${p}"
                ${checked ? "checked" : ""}
                style="display:none;"
                onchange="todoUpdatePriorityPreview('${p}')"/>
              <div id="priority-opt-${p}"
                style="padding:10px 8px;border-radius:9px;text-align:center;
                       border:2px solid ${checked ? meta.dot : "var(--border)"};
                       background:${checked ? meta.bg : "transparent"};
                       transition:all .2s;">
                <div style="font-size:0.78rem;font-weight:700;
                            color:${checked ? meta.color : "var(--text-secondary)"};">
                  ${meta.label}
                </div>
                <div style="width:6px;height:6px;border-radius:50%;
                            background:${meta.dot};margin:4px auto 0;"></div>
              </div>
            </label>`;
        }).join("")}
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="todoSaveEdit()" id="todo-edit-save-btn"
        style="flex:2;padding:11px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 14px rgba(124,106,247,0.3);">
        Simpan
      </button>
    </div>`);
}

// Update visual priority selector di modal
function todoUpdatePriorityPreview(selected) {
  ["high","medium","low"].forEach(p => {
    const el   = document.getElementById(`priority-opt-${p}`);
    const meta = PRIORITY[p];
    if (!el) return;
    const isSelected = p === selected;
    el.style.border     = `2px solid ${isSelected ? meta.dot : "var(--border)"}`;
    el.style.background = isSelected ? meta.bg : "transparent";
    el.querySelector("div").style.color = isSelected ? meta.color : "var(--text-secondary)";
  });
}

async function todoSaveEdit() {
  const text     = document.getElementById("f-todo-text")?.value?.trim();
  const priority = document.querySelector('input[name="f-todo-priority"]:checked')?.value || "medium";

  if (!text) { window.showToast("Teks task tidak boleh kosong.", "error"); return; }

  const btn = document.getElementById("todo-edit-save-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner" style="margin:0 auto;"></div>`; }

  try {
    await updateTodo(editingId, { text, priority });
    window.closeModal();
    window.showToast("Task berhasil diperbarui! ✏️", "success");
    await loadTodos();
  } catch (err) {
    console.error("Update todo error:", err);
    window.showToast("Gagal memperbarui task.", "error");
    if (btn) { btn.disabled = false; btn.innerHTML = "Simpan"; }
  }
}

// ═══════════════════════════════════════════════════════
//  DELETE TASK
// ═══════════════════════════════════════════════════════
function todoConfirmDelete(id, text) {
  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Task
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
        Kamu akan menghapus task:
      </div>
      <div style="font-weight:600;color:var(--text-primary);font-size:0.9rem;
                  line-height:1.5;">
        "${text}"
      </div>
    </div>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-bottom:20px;">
      Task yang dihapus tidak bisa dikembalikan.
    </p>
    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="todoDelete('${id}')"
        style="flex:1;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Ya, Hapus
      </button>
    </div>`);
}

async function todoDelete(id) {
  try {
    await deleteTodo(id);
    window.closeModal();
    window.showToast("Task dihapus.", "info");
    await loadTodos();
  } catch (err) {
    console.error("Delete todo error:", err);
    window.showToast("Gagal menghapus task.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  HAPUS SEMUA YANG SELESAI
// ═══════════════════════════════════════════════════════
async function todoClearDone() {
  const doneCount = allTodos.filter(t => t.done).length;
  if (doneCount === 0) {
    window.showToast("Tidak ada task yang selesai.", "error");
    return;
  }

  window.openModal(`
    <div class="modal-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="var(--danger)" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
      Hapus Task Selesai
      <button class="modal-close" onclick="closeModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:20px;line-height:1.7;">
      Kamu akan menghapus <strong style="color:var(--text-primary);">${doneCount} task</strong>
      yang sudah selesai. Tindakan ini tidak bisa dibatalkan.
    </p>
    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()"
        style="flex:1;padding:11px;background:var(--surface-el);border:1px solid var(--border);
               border-radius:9px;color:var(--text-secondary);font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:500;cursor:pointer;">
        Batal
      </button>
      <button onclick="todoConfirmClearDone()"
        style="flex:1;padding:11px;background:linear-gradient(135deg,var(--danger),#dc2626);
               border:none;border-radius:9px;color:white;font-family:'DM Sans',sans-serif;
               font-size:0.875rem;font-weight:600;cursor:pointer;
               box-shadow:0 4px 12px rgba(248,113,113,0.3);">
        Hapus ${doneCount} Task
      </button>
    </div>`);
}

async function todoConfirmClearDone() {
  try {
    const count = await clearDoneTodos();
    window.closeModal();
    window.showToast(`${count} task selesai berhasil dihapus.`, "info");
    await loadTodos();
  } catch (err) {
    console.error("Clear done error:", err);
    window.showToast("Gagal menghapus task.", "error");
  }
}

// ═══════════════════════════════════════════════════════
//  FILTER TABS
// ═══════════════════════════════════════════════════════
function todoSetFilter(filter) {
  activeFilter = filter;

  ["all","pending","done"].forEach(f => {
    const btn = document.getElementById(`todo-tab-${f}`);
    if (!btn) return;
    btn.style.background = f === filter ? "var(--primary)" : "transparent";
    btn.style.color      = f === filter ? "white" : "var(--text-secondary)";
  });

  renderList();
}

// ═══════════════════════════════════════════════════════
//  UPDATE "HAPUS SELESAI" BUTTON VISIBILITY
// ═══════════════════════════════════════════════════════
function updateClearBtn() {
  const btn      = document.getElementById("btn-clear-done");
  const doneCount = allTodos.filter(t => t.done).length;
  if (btn) btn.style.display = doneCount > 0 ? "flex" : "none";
}

// ═══════════════════════════════════════════════════════
//  HELPER
// ═══════════════════════════════════════════════════════
function escapeStr(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
//  EXPOSE ke window
// ═══════════════════════════════════════════════════════
window.todoQuickAdd            = todoQuickAdd;
window.todoToggle              = todoToggle;
window.todoOpenEdit            = todoOpenEdit;
window.todoUpdatePriorityPreview = todoUpdatePriorityPreview;
window.todoSaveEdit            = todoSaveEdit;
window.todoConfirmDelete       = todoConfirmDelete;
window.todoDelete              = todoDelete;
window.todoClearDone           = todoClearDone;
window.todoConfirmClearDone    = todoConfirmClearDone;
window.todoSetFilter           = todoSetFilter;
