// Initial quotes array
let quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Wisdom" }
];

// DOM Elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteBtn = document.getElementById("addQuoteBtn");

/**
 * Display a random quote (with category filtering)
 */
function displayRandomQuote() {
  let selectedCategory = categorySelect.value;

  // Filter quotes if a category is selected
  let filteredQuotes = (selectedCategory === "all")
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category.";
    return;
  }

  // Pick a random quote
  let randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  let quote = filteredQuotes[randomIndex];

  // Update DOM (no innerHTML used)
  quoteDisplay.textContent = `"${quote.text}" — (${quote.category})`;
}

/**
 * Add a new quote dynamically
 */
function addQuote() {
  let textInput = document.getElementById("newQuoteText");
  let categoryInput = document.getElementById("newQuoteCategory");

  let newText = textInput.value.trim();
  let newCategory = categoryInput.value.trim();

  if (newText && newCategory) {
    // Add to quotes array
    quotes.push({ text: newText, category: newCategory });

    // Add new category to dropdown if it doesn't exist
    if (![...categorySelect.options].some(opt => opt.value === newCategory)) {
      let option = document.createElement("option");
      option.value = newCategory;
      option.textContent = newCategory;
      categorySelect.appendChild(option);
    }

    // Reset form
    textInput.value = "";
    categoryInput.value = "";

    alert("New quote added successfully!");
  } else {
    alert("Please enter both a quote and a category.");
  }
}

/**
 * Populate categories on load
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

// Event Listeners
newQuoteBtn.addEventListener("click", displayRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);

// Initialize categories when page loads
populateCategories();
