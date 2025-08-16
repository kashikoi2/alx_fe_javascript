// ===== Model & Storage =====
const LS_KEY_QUOTES = "dqg_quotes";
const LS_KEY_SELECTED_CATEGORY = "dqg_selectedCategory";

let quotes = JSON.parse(localStorage.getItem(LS_KEY_QUOTES)) || [
  { id: 1, text: "The best way to get started is to quit talking and begin doing.", category: "Motivation", updatedAt: Date.now(), source: "local" },
  { id: 2, text: "Don’t let yesterday take up too much of today.", category: "Inspiration", updatedAt: Date.now(), source: "local" },
  { id: 3, text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience", updatedAt: Date.now(), source: "local" }
];

let currentQuoteId = null;

// ===== DOM Elements =====
const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const importFileInput = document.getElementById("importFile");
const newQuoteBtn = document.getElementById("newQuote");

// ===== Utilities =====
function saveQuotes() {
  localStorage.setItem(LS_KEY_QUOTES, JSON.stringify(quotes));
}

function loadSelectedCategory() {
  return localStorage.getItem(LS_KEY_SELECTED_CATEGORY) || "all";
}

function saveSelectedCategory(value) {
  localStorage.setItem(LS_KEY_SELECTED_CATEGORY, value);
}

function uid() {
  return "id-" + Math.random().toString(36).slice(2, 9);
}

// ===== Display & Filtering =====
function populateCategories() {
  const uniqueCategories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  uniqueCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    if (cat === loadSelectedCategory()) option.selected = true;
    categoryFilter.appendChild(option);
  });
}

function getFilteredQuotes() {
  const cat = categoryFilter.value;
  return cat === "all" ? quotes : quotes.filter(q => q.category === cat);
}

function displayRandomQuote() {
  const pool = getFilteredQuotes();
  if (!pool.length) {
    quoteDisplay.textContent = "No quotes available for this category.";
    currentQuoteId = null;
    return;
  }
  const random = pool[Math.floor(Math.random() * pool.length)];
  quoteDisplay.textContent = `"${random.text}" — (${random.category})`;
  currentQuoteId = random.id;
}

// ===== Add Quote =====
function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();
  if (!text || !category) {
    alert("Please enter both quote and category.");
    return;
  }
  const newQuoteObj = { id: uid(), text, category, updatedAt: Date.now(), source: "local" };
  quotes.push(newQuoteObj);
  saveQuotes();
  populateCategories();
  displayRandomQuote();
  newQuoteText.value = "";
  newQuoteCategory.value = "";
}

// ===== JSON Export / Import =====
function exportQuotes() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const importedQuotes = JSON.parse(e.target.result);
      if (!Array.isArray(importedQuotes)) throw new Error("Invalid JSON");
      quotes.push(...importedQuotes.map(q => ({ ...q, id: q.id || uid(), updatedAt: Date.now(), source: "import" })));
      saveQuotes();
      populateCategories();
      displayRandomQuote();
      alert("Quotes imported successfully!");
    } catch (err) {
      alert("Failed to import JSON: " + err.message);
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

// ===== Server Sync =====
// GET: fetch server quotes
async function fetchQuotesFromServer() {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
    const data = await res.json();
    const serverQuotes = data.map(p => ({
      id: "srv-" + p.id,
      text: p.title,
      category: "Server",
      updatedAt: Date.now(),
      source: "server"
    }));

    // Simple conflict resolution: server overwrites local quotes with same id
    const merged = [...quotes];
    serverQuotes.forEach(srv => {
      const idx = merged.findIndex(q => q.id === srv.id);
      if (idx >= 0) merged[idx] = srv;
      else merged.push(srv);
    });

    quotes = merged;
    saveQuotes();
    populateCategories();
    displayRandomQuote();
    console.log("Fetched and merged server quotes.");
  } catch (err) {
    console.error("Failed to fetch from server:", err);
  }
}

// POST: send local quotes to server
async function postQuotesToServer() {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",                 // Required
      headers: {                       // Required
        "Content-Type": "application/json"
      },
      body: JSON.stringify(quotes)     // Send local quotes
    });
    const data = await res.json();
    console.log("Local quotes posted to server:", data);
  } catch (err) {
    console.error("Failed to post quotes:", err);
  }
}

// ===== Event Listeners =====
newQuoteBtn.addEventListener("click", displayRandomQuote);
categoryFilter.addEventListener("change", () => {
  saveSelectedCategory(categoryFilter.value);
  displayRandomQuote();
});
document.getElementById("addQuoteBtn").addEventListener("click", addQuote);
exportJsonBtn.addEventListener("click", exportQuotes);
importFileInput.addEventListener("change", importFromJsonFile);

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", () => {
  populateCategories();
  displayRandomQuote();

  // Periodic server sync every 30s
  setInterval(fetchQuotesFromServer, 30000);
});
