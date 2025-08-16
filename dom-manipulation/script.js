// Initial quotes array (fallback if no localStorage data exists)
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
  { text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience" }
];

// DOM Elements
const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");

// --- Display a random quote ---
function displayRandomQuote() {
  const selectedCategory = localStorage.getItem("selectedCategory") || "all";
  const filteredQuotes = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const randomQuote = filteredQuotes[randomIndex];
  quoteDisplay.textContent = `"${randomQuote.text}" — ${randomQuote.category}`;
}

// --- Add a new quote ---
function addQuote(text, category) {
  quotes.push({ text, category });
  localStorage.setItem("quotes", JSON.stringify(quotes));
  populateCategories();
  displayRandomQuote();
}

// --- Populate categories dynamically ---
function populateCategories() {
  const uniqueCategories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  uniqueCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    if (localStorage.getItem("selectedCategory") === cat) {
      option.selected = true;
    }
    categoryFilter.appendChild(option);
  });
}

// --- Filter quotes based on selected category ---
function filterQuotes() {
  const selected = categoryFilter.value;
  localStorage.setItem("selectedCategory", selected);
  displayRandomQuote();
}

// --- Export quotes to JSON file ---
function exportQuotes() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// --- Fetch quotes from simulated server ---
async function fetchQuotesFromServer() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts"); // mock API
    const serverData = await response.json();

    // Simulate mapping server data to quotes
    const serverQuotes = serverData.slice(0, 5).map(item => ({
      text: item.title,
      category: "Server"
    }));

    // Conflict resolution: server overwrites local
    quotes = serverQuotes;
    localStorage.setItem("quotes", JSON.stringify(quotes));

    populateCategories();
    displayRandomQuote();
    console.log("Quotes synced with server.");
  } catch (error) {
    console.error("Error fetching quotes from server:", error);
  }
}

// --- Sync periodically (every 30s) ---
setInterval(fetchQuotesFromServer, 30000);

// --- Initialize on page load ---
document.addEventListener("DOMContentLoaded", () => {
  populateCategories();
  displayRandomQuote();
});
