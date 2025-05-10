// City Quiz Application Logic

// Initialize the database
const db = new Dexie("CitiesDB");
db.version(2).stores({
  cities: "name, country, population",
  metadata: "key"
});

// Load city data from JSON
async function loadCitiesFromJSON() {
  try {
    // First fetch the cities.json file and calculate its checksum
    const res = await fetch('data/cities5000.json');
    const cities = await res.json();
    const jsonText = JSON.stringify(cities);
    const currentChecksum = await calculateChecksum(jsonText);
    
    // Check if we need to reload the data
    const needsReload = await shouldReloadData(currentChecksum);
    
    if (needsReload) {
      // Clear existing data and reload
      console.log("Cities data changed, reloading...");
      await db.cities.clear();
      await db.cities.bulkPut(cities);
      
      // Save the new checksum
      await db.metadata.put({ key: 'checksum', value: currentChecksum });
      console.log("Loaded cities into IndexedDB with new checksum");
    } else {
      console.log("Using existing cities data (checksum matches)");
    }
  } catch (error) {
    console.error("Error loading cities data:", error);
  }
}

async function shouldReloadData(currentChecksum) {
  // First time loading or force reload if no cities
  const cityCount = await db.cities.count();
  if (cityCount === 0) return true;
  
  // Check if checksum has changed
  const storedChecksumObj = await db.metadata.get('checksum');
  if (!storedChecksumObj) return true;
  
  return storedChecksumObj.value !== currentChecksum;
}

async function calculateChecksum(text) {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Search functionality
async function performSearch() {
  const patternInput = document.getElementById('patternInput');
  let pattern = patternInput.value.trim();
  
  const countryInput = document.getElementById('countryInput');
  let country = countryInput.value.trim().toUpperCase();
  
  console.log("Searching for pattern:", pattern, "in country:", country || "all");
  
  // Replace both _ and * with . for regex pattern matching
  const regex = new RegExp('^' + pattern.replace(/[_*]/g, '.') + '$', 'i');
  
  // First filter by name pattern
  let matches = await db.cities.filter(city => regex.test(city.name)).toArray();
  
  // Then optionally filter by country
  if (country) {
    matches = matches.filter(city => city.country.toUpperCase() === country);
  }
  
  // Sort by population (descending)
  matches.sort((a, b) => b.population - a.population);

  const resultsDiv = document.getElementById('results');
  if (matches.length) {
    // Add results count
    const resultsCount = `<div class="results-count">${matches.length} cities found</div>`;
    
    // Create compact grid layout for results
    const citiesHTML = matches.map(c => `
      <div class="city-card">
        <span class="city-name">${c.name}<span class="city-country">${c.country}</span></span>
        <span class="city-population">${formatPopulation(c.population)}</span>
      </div>
    `).join('');
    
    resultsDiv.innerHTML = resultsCount + citiesHTML;
  } else {
    resultsDiv.innerHTML = '<div class="no-results">No matches found</div>';
  }
}

// Format population with commas
function formatPopulation(population) {
  return population.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Initialize the application
function initApp() {
  // Add event listener for search button
  document.getElementById('searchBtn').addEventListener('click', performSearch);
  
  // Add event listener to allow searching by pressing Enter
  document.getElementById('patternInput').addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      performSearch();
    }
  });
  
  // Load the city data
  loadCitiesFromJSON();
}

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
