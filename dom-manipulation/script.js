// ===== Keys & server config =====
const LS_KEY_QUOTES = "dqg_quotes_v2";
const LS_KEY_SELECTED_CATEGORY = "dqg_selectedCategory_v2";
const LS_KEY_LAST_SYNC = "dqg_lastSync_v2";
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts?_limit=5"; // mock server
const AUTO_SYNC_MS = 30000;

// ===== Model =====
// Using rich objects for sync/merge/conflicts
// { id, text, category, updatedAt, source }
let quotes = [];
let currentQuoteId = null;
let autoSyncTimer = null;

// Keep local backups for manual conflict override
const conflictBackups = new Map(); // id -> {local, server}

// ===== DOM refs =====
let quoteDisplay, newQuoteBtn, categoryFilter, addQuoteBtn, exportJsonBtn, importFileInput;
let syncNowBtn, autoSyncToggle, lastSyncAtEl, notificationsEl, editCurrentBtn;

// ---------- Utilities ----------
function uid() {
  return "local-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function nowTs() {
  return Date.now();
}
function notify(message, actions = []) {
  const wrap = document.createElement("div");
  wrap.className = "note";
  const p = document.createElement("p");
  p.textContent = message;
  wrap.appendChild(p);

  if (actions.length) {
    const btnRow = document.createElement("div");
    for (const a of actions) {
      const b = document.createElement("button");
      b.textContent = a.label;
      b.addEventListener("click", a.onClick);
      btnRow.appendChild(b);
    }
    wrap.appendChild(btnRow);
  }
  notificationsEl.appendChild(wrap);
}
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ---------- Storage ----------
function saveQuotes() {
  try {
    localStorage.setItem(LS_KEY_QUOTES, JSON.stringify(quotes));
  } catch (e) {
    notify("⚠️ Could not save quotes to Local Storage.");
    console.warn(e);
  }
}
function loadQuotes() {
  const raw = localStorage.getItem(LS_KEY_QUOTES);
  if (!raw) {
    // Seed defaults (add ids/updatedAt)
    quotes = [
      { id: uid(), text: "The best way to predict the future is to create it.", category: "Motivation", updatedAt: nowTs(), source: "local" },
      { id: uid(), text: "Life is what happens when you’re busy making other plans.", category: "Life", updatedAt: nowTs(), source: "local" },
      { id: uid(), text: "Do or do not. There is no try.", category: "Wisdom", updatedAt: nowTs(), source: "local" }
    ];
    saveQuotes();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    // Migrate items that might lack id/updatedAt/source
    quotes = (Array.isArray(parsed) ? parsed : []).map(q => ({
      id: q.id || uid(),
      text: String(q.text || "").trim(),
      category: String(q.category || "General").trim(),
      updatedAt: typeof q.updatedAt === "number" ? q.updatedAt : nowTs(),
      source: q.source || "local"
    }));
  } catch (e) {
    console.warn("Failed parsing stored quotes:", e);
    quotes = [];
    saveQuotes();
  }
}
function saveSelectedCategory(value) {
  localStorage.setItem(LS_KEY_SELECTED_CATEGORY, value);
}
function loadSelectedCategory() {
  return localStorage.getItem(LS_KEY_SELECTED_CATEGORY) || "all";
}
function saveLastSync(ts) {
  localStorage.setItem(LS_KEY_LAST_SYNC, String(ts));
  lastSyncAtEl.textContent = `Last sync: ${new Date(ts).toLocaleString()}`;
}
function loadLastSync() {
  const raw = localStorage.getItem(LS_KEY_LAST_SYNC);
  if (raw) lastSyncAtEl.textContent = `Last sync: ${new Date(Number(raw)).toLocaleString()}`;
}

// ---------- Categories & filtering ----------
function uniqueCategories() {
  return [...new Set(quotes.map(q => q.category))];
}
function populateCategories() {
  const selected = loadSelectedCategory();
  const cats = ["all", ...uniqueCategories()];
  clearChildren(categoryFilter);
  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    if (c === selected) opt.selected = true;
    categoryFilter.appendChild(opt);
  }
}
function getFilteredQuotes() {
  const cat = categoryFilter.value;
  if (cat === "all") return quotes;
  return quotes.filter(q => q.category === cat);
}
function filterQuotes() {
  saveSelectedCategory(categoryFilter.value);
  displayRandomQuote();
}

// ---------- UI actions ----------
function displayRandomQuote() {
  const pool = getFilteredQuotes();
  if (pool.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    currentQuoteId = null;
    return;
  }
  const randomIdx = Math.floor(Math.random() * pool.length);
  const q = pool[randomIdx];
  quoteDisplay.textContent = `"${q.text}" — (${q.category})`;
  currentQuoteId = q.id;
}
function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");
  const text = (textInput.value || "").trim();
  const category = (categoryInput.value || "").trim();
  if (!text || !category) {
    notify("Please enter both a quote and a category.");
    return;
  }
  quotes.push({ id: uid(), text, category, updatedAt: nowTs(), source: "local" });
  saveQuotes();

  // If new category, reflect immediately
  const existingCats = new Set([...categoryFilter.options].map(o => o.value));
  if (!existingCats.has(category)) {
    const opt = document.createElement("option");
    opt.value = category;
    opt.textContent = category;
    categoryFilter.appendChild(opt);
  }

  textInput.value = "";
  categoryInput.value = "";
  notify("✅ New quote added.");
  displayRandomQuote();
}
function editCurrentQuote() {
  if (!currentQuoteId) {
    notify("No current quote to edit. Click “Show New Quote” first.");
    return;
  }
  const qIdx = quotes.findIndex(q => q.id === currentQuoteId);
  if (qIdx < 0) return;

  const q = quotes[qIdx];
  const newText = prompt("Edit quote text:", q.text);
  if (newText === null) return; // cancelled
  const trimmed = newText.trim();
  if (!trimmed) {
    notify("Text cannot be empty.");
    return;
  }
  q.text = trimmed;
  q.updatedAt = nowTs();
  q.source = "local";
  quotes[qIdx] = q;
  saveQuotes();
  displayRandomQuote();
  notify("✏️ Quote edited locally. Run “Sync Now” to test conflicts.");
}

// ---------- Import / Export ----------
function exportToJsonFile() {
  try {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quotes.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify("⬇️ Exported quotes to JSON.");
  } catch (e) {
    console.error(e);
    notify("Export failed. See console for details.");
  }
}
function importFromJsonFile(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const incoming = JSON.parse(e.target.result);
      if (!Array.isArray(incoming)) {
        notify("Invalid JSON. Expect an array of quotes.");
        return;
      }
      // Normalize + dedupe by (text|category)
      const seen = new Set(quotes.map(q => `${q.text}||${q.category}`));
      let added = 0;
      for (const it of incoming) {
        const text = String(it.text || "").trim();
        const category = String(it.category || "General").trim();
        if (!text || !category) continue;
        const key = `${text}||${category}`;
        if (!seen.has(key)) {
          quotes.push({
            id: it.id || uid(),
            text,
            category,
            updatedAt: typeof it.updatedAt === "number" ? it.updatedAt : nowTs(),
            source: it.source || "import"
          });
          seen.add(key);
          added++;
        }
      }
      saveQuotes();
      populateCategories();
      displayRandomQuote();
      notify(added > 0 ? `📥 Imported ${added} quote(s).` : "No new quotes to import.");
    } catch (err) {
      console.error(err);
      notify("Failed to import JSON.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// ---------- Server Sync ----------
async function fetchServerQuotes() {
  // Simulate server: map posts -> quotes
  const res = await fetch(SERVER_URL);
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
  const posts = await res.json();
  // Give them stable ids and a server category; updatedAt mimics server time
  const serverTime = nowTs();
  return posts.map(p => ({
    id: "srv-" + p.id,
    text: String(p.title || "").trim() || "(untitled)",
    category: "Server",
    updatedAt: serverTime,   // treat as latest from server
    source: "server"
  }));
}
async function syncWithServer() {
  try {
    const serverQuotes = await fetchServerQuotes();
    let merges = 0;
    let conflicts = 0;

    const byId = new Map(quotes.map(q => [q.id, q]));
    for (const srv of serverQuotes) {
      const local = byId.get(srv.id);
      if (!local) {
        // New from server
        quotes.push(srv);
        merges++;
        continue;
      }

      // Same id exists locally
      const contentEqual = local.text === srv.text && local.category === srv.category;
      if (contentEqual) {
        // No content change; refresh server metadata
        local.updatedAt = Math.max(local.updatedAt, srv.updatedAt);
        local.source = "server";
      } else {
        // Conflict: server wins by default, but allow manual override
        conflicts++;
        conflictBackups.set(srv.id, { local: { ...local }, server: { ...srv } });

        // Apply server version
        const idx = quotes.findIndex(q => q.id === srv.id);
        quotes[idx] = { ...srv };

        // Create notification with "Keep Local" button (manual resolve)
        notify(
          `⚠️ Conflict on ${srv.id}. Server version applied.`,
          [
            {
              label: "Keep Local Instead (Undo)",
              onClick: () => {
                const backup = conflictBackups.get(srv.id);
                if (!backup) return;
                const j = quotes.findIndex(q => q.id === srv.id);
                if (j >= 0) {
                  quotes[j] = { ...backup.local, updatedAt: nowTs(), source: "local" };
                  saveQuotes();
                  displayRandomQuote();
                  notify(`↩️ Reverted to local version for ${srv.id}.`);
                  conflictBackups.delete(srv.id);
                }
              }
            },
            {
              label: "Keep Server",
              onClick: () => {
                conflictBackups.delete(srv.id);
                notify(`✅ Kept server version for ${srv.id}.`);
              }
            }
          ]
        );
      }
    }

    saveQuotes();
    populateCategories();
    if (currentQuoteId) displayRandomQuote();
    saveLastSync(nowTs());

    if (merges) notify(`🔄 Synced ${merges} new/updated server quote(s).`);
    if (!merges && !conflicts) notify("✔️ Sync complete. No changes.");

  } catch (e) {
    console.error(e);
    notify("❌ Sync failed. Check console/network.");
  }
}
function startAutoSync() {
  if (autoSyncTimer) return;
  autoSyncTimer = setInterval(syncWithServer, AUTO_SYNC_MS);
}
function stopAutoSync() {
  if (!autoSyncTimer) return;
  clearInterval(autoSyncTimer);
  autoSyncTimer = null;
}

// ---------- Init ----------
function init() {
  // Cache DOM
  quoteDisplay = document.getElementById("quoteDisplay");
  newQuoteBtn = document.getElementById("newQuote");
  categoryFilter = document.getElementById("categoryFilter");
  addQuoteBtn = document.getElementById("addQuoteBtn");
  exportJsonBtn = document.getElementById("exportJsonBtn");
  importFileInput = document.getElementById("importFile");
  syncNowBtn = document.getElementById("syncNowBtn");
  autoSyncToggle = document.getElementById("autoSyncToggle");
  lastSyncAtEl = document.getElementById("lastSyncAt");
  notificationsEl = docu

