// Quotes array with text and category
let quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Wisdom" }
];

// DOM references
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteBtn = document.getElementById("addQuoteBtn");

/**
 * Display a random quote, with optional category filtering
 */
function displayRandomQuote() {
  let category = categorySelect.value;

  // Filter quotes if category selected
  let availableQuotes = (category === "all")
    ? quotes
    : quotes.filter(q => q.category === category);

  if (availableQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category.";
    return;
  }

  // Pick random
  let randomIndex = Math.floor(Math.random() * availableQuotes.length);
  let quote = availableQuotes[randomIndex];

  // Update DOM safely (no innerHTML)
  quoteDisplay.textContent = `"${quote.text}" — (${quote.category})`;
}

/**
 * Add a new quote
 */
function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  let newText = textInput.value.trim();
  let newCategory = categoryInput.value.trim();

  if (newText && newCategory) {
    // Push into array
    quotes.push({ text: newText, category: newCategory });

    // Add new category to dropdown if missing
    if (![...categorySelect.options].some(opt => opt.value === newCategory)) {
      let option = document.createElement("option");
      option.value = newCategory;
      option.textContent = newCategory;
      categorySelect.appendChild(option);
    }

    // Clear inputs
    textInput.value = "";
    categoryInput.value = "";

    alert("New quote added!");
  } else {
    alert("Please provide both a quote and a category.");
  }
}

/**
 * Populate category dropdown
 */
function populateCategories() {
  let categories = [...new Set(quotes.map(q => q.category))];
  categories.forEach(cat => {
    if (![...categorySelect.options].some(opt => opt.value === cat)) {
      let option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    }
  });
}

// Event listeners
newQuoteBtn.addEventListener("click", displayRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);

// Initialize
populateCategories();

