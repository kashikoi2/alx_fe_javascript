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

// Show Random Quote
function showRandomQuote() {
  let selectedCategory = categorySelect.value;
  let filteredQuotes = (selectedCategory === "all")
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category.";
    return;
  }

  let randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  let quote = filteredQuotes[randomIndex];
  quoteDisplay.textContent = `"${quote.text}" — (${quote.category})`;
}

// Add Quote
function addQuote() {
  let textInput = document.getElementById("newQuoteText");
  let categoryInput = document.getElementById("newQuoteCategory");

  let newText = textInput.value.trim();
  let newCategory = categoryInput.value.trim();

  if (newText && newCategory) {
    quotes.push({ text: newText, category: newCategory });

    // Add new category to dropdown if not already there
    if (![...categorySelect.options].some(opt => opt.value === newCategory)) {
      let option = document.createElement("option");
      option.value = newCategory;
      option.textContent = newCategory;
      categorySelect.appendChild(option);
    }

    // Clear input fields
    textInput.value = "";
    categoryInput.value = "";

    alert("New quote added successfully!");
  } else {
    alert("Please enter both a quote and a category.");
  }
}

// Populate dropdown with existing categories
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
newQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);

// Initialize categories
populateCategories();
