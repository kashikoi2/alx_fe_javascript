// ===== Storage Keys =====
const LS_KEY_QUOTES = "dqg_quotes_v1";
const SS_KEY_LAST_QUOTE = "dqg_last_quote_v1";      // sessionStorage: last viewed quote
const SS_KEY_PREF_CATEGORY = "dqg_pref_cat_v1";      // sessionStorage: last selected category

// ===== In-memory model =====
let quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Wisdom" }
];

// ===== DOM refs (filled in init) =====
let quoteDisplay, newQuoteBtn, categorySelect, addQuoteBtn, exportJsonBtn, importFileInput;

document.addEventListener("DOMContentLoaded", init);

// ---------- Init ----------
function init() {
  // Cache DOM
  quoteDisplay = document.getElementById("quoteDisplay");
  newQuoteBtn = document.getElementById("newQuote");
  categorySelect = document.getElementById("categorySelect");
  addQuoteBtn = document.getElementById("addQuoteBtn");
  exportJsonBtn = document.getElementById("exportJsonBtn");
  importFileInput = document.getElementById("importFile");

  // Load persisted data
  loadQuotes();
  populateCategories();

  // Restore session prefs (optional requirement)
  const prefCat = sessionStorage.getItem(SS_KEY_PREF_CATEGORY);
  if (prefCat && hasCategory(prefCat)) categorySelect.value = prefCat;

  // Show last viewed quote if available (optional requirement)
  const last = sessionStorage.getItem(SS_KEY_LAST_QUOTE);
  if (last) {
    try {
      const q = JSON.parse(last);
      if (q && typeof q.text === "string" && typeof q.category === "string") {
        quoteDisplay.textContent = `"${q.text}" — (${q.category})`;
      }
    } catch {}
  }

  // Listeners
  newQuoteBtn.addEventListener("click", displayRandomQuote);
  addQuoteBtn.addEventListener("click", addQuote);
  exportJsonBtn.addEventListener("click", exportToJsonFile);
  // (Import is wired inline via onchange; function is defined globally below)
}

// ---------- Core UI ----------
function displayRandomQuote() {
  const selectedCategory = categorySelect.value;
  const pool = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (pool.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category.";
    return;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const quote = pool[idx];

  // Update DOM safely (no innerHTML)
  quoteDisplay.textContent = `"${quote.text}" — (${quote.category})`;

  // Persist session info
  sessionStorage.setItem(SS_KEY_LAST_QUOTE, JSON.stringify(quote));
  sessionStorage.setItem(SS_KEY_PREF_CATEGORY, selectedCategory);
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const newText = (textInput.value || "").trim();
  const newCategory = (categoryInput.value || "").trim();

  if (!newText || !newCategory) {
    alert("Please enter both a quote and a category.");
    return;
  }

  quotes.push({ text: newText, category: newCategory });
  saveQuotes();

  // Add category to dropdown if new
  if (!hasCategory(newCategory)) {
    const opt = document.createElement("option");
    opt.value = newCategory;
    opt.textContent = newCategory;
    categorySelect.appendChild(opt);
  }

  // Clear fields
  textInput.value = "";
  categoryInput.value = "";

  // (Optional) immediately show a new random quote from the selected filter
  displayRandomQuote();
}

// ---------- Categories ----------
function populateCategories() {
  const existing = new Set([...categorySelect.options].map(o => o.value));
  for (const cat of uniqueCategories(quotes)) {
    if (!existing.has(cat)) {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    }
  }
}

function uniqueCategories(list) {
  return [...new Set(list.map(q => q.category))];
}
function hasCategory(cat) {
  return [...categorySelect.options].some(o => o.value === cat);
}

// ---------- Local Storage (persist quotes) ----------
function saveQuotes() {
  try {
    localStorage.setItem(LS_KEY_QUOTES, JSON.stringify(quotes));
  } catch (e) {
    console.warn("Failed to save quotes to Local Storage:", e);
    alert("Warning: Unable to save quotes to Local Storage (storage full or blocked).");
  }
}

function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_KEY_QUOTES);
    if (!raw) {
      // Seed default if none in storage
      saveQuotes();
      return;
    }
    const parsed = JSON.parse(raw);
    if (isValidQuotesArray(parsed)) {
      quotes = parsed;
    } else {
      console.warn("Invalid quotes schema in Local Storage. Keeping defaults.");
    }
  } catch (e) {
    console.warn("Failed to load quotes from Local Storage:", e);
  }
}

function isValidQuotesArray(arr) {
  return Array.isArray(arr) && arr.every(
    o => o && typeof o.text === "string" && typeof o.category === "string"
          && o.text.trim() && o.category.trim()
  );
}

// ---------- JSON Export ----------
function exportToJsonFile() {
  try {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `quotes-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export failed:", e);
    alert("Export failed. See console for details.");
  }
}

// ---------- JSON Import (called by inline onchange on #importFile) ----------
function importFromJsonFile(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);

      if (!isValidQuotesArray(imported)) {
        alert("Invalid JSON format. Expect an array of { text: string, category: string }.");
        return;
      }

      // Merge with deduplication (by text|category)
      const seen = new Set(quotes.map(q => `${q.text}||${q.category}`));
      let added = 0;
      for (const q of imported) {
        const key = `${q.text}||${q.category}`;
        if (!seen.has(key)) {
          quotes.push({ text: q.text.trim(), category: q.category.trim() });
          seen.add(key);
          added++;
        }
      }

      saveQuotes();
      populateCategories();
      alert(added > 0 ? `Quotes imported successfully! (${added} new)` : "No new quotes to import (all were duplicates).");

    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import. Ensure the file is valid JSON.");
    } finally {
      // Clear the input so the same file can be selected again if needed
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// Expose for inline handler (just in case bundlers/scopes change)
window.importFromJsonFile = importFromJsonFile;
