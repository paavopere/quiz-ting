// City Quiz Application Logic

// Initialize the database with a compound key
const db = new Dexie("CitiesDB");
const DB_VERSION = 5;  // Increment version number
db.version(DB_VERSION).stores({
  cities: "[name+country+lat+lon], name, country, population", // Compound primary key
  metadata: "key"
});

// Force delete the database before opening if schema version changed
async function ensureFreshDatabase() {
  try {
    // Check if we need to delete the old database
    const existingDBVersion = localStorage.getItem('cities_db_version');

    console.log(`Current DB version: ${DB_VERSION}, Existing DB version: ${existingDBVersion}`);
    
    if (existingDBVersion && parseInt(existingDBVersion) < DB_VERSION) {
      console.log(`Database schema changed (${existingDBVersion} -> ${DB_VERSION}). Deleting old database...`);
      
      // Close the database connection
      await db.close();
      
      // Delete the database entirely
      await Dexie.delete("CitiesDB");
      
      console.log("Old database deleted successfully");
    }
    
    // Save current version to localStorage
    localStorage.setItem('cities_db_version', DB_VERSION);
    
  } catch (error) {
    console.error("Error managing database version:", error);
  }
}

// Load city data from JSON
async function loadCitiesFromJSON() {
  try {
    // Ensure we have a fresh database when schema changes
    await ensureFreshDatabase();
    
    // First fetch the cities.json file and calculate its checksum
    const res = await fetch('data/cities5000.min.json');
    const cities = await res.json();
    const jsonText = JSON.stringify(cities);
    
    // Include DB_VERSION in the checksum
    const currentChecksum = await calculateChecksum(jsonText + DB_VERSION);
    
    // Check if we need to reload the data
    const needsReload = await shouldReloadData(currentChecksum);
    
    if (needsReload) {
      // Clear existing data and reload
      console.log("Cities data changed or schema updated, reloading...");
      await db.cities.clear();
      await db.cities.bulkPut(cities);
      
      // Save the new checksum
      await db.metadata.put({ key: 'checksum', value: currentChecksum });
      console.log(`Loaded cities into IndexedDB with new checksum (DB version: ${DB_VERSION})`);
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
  
  const useRegexMode = document.getElementById('regexMode').checked;
  
  console.log(`Searching for ${useRegexMode ? 'regex' : 'wildcard'} pattern:`, pattern, "in country:", country || "all");
  
  // Create regex based on mode
  let regex;
  try {
    if (useRegexMode) {
      // Add anchors to regex pattern if they're not already there
      if (!pattern.startsWith('^')) pattern = '^' + pattern;
      if (!pattern.endsWith('$')) pattern = pattern + '$';
      regex = new RegExp(pattern, 'i');
    } else {
      // Convert wildcards to regex pattern
      // * becomes . (single character)
      // ? becomes .+ (one or more characters)
      const regexPattern = pattern
        .replace(/\*/g, '.') // * matches any single character
        .replace(/\?/g, '.+'); // ? matches one or more characters
      
      regex = new RegExp('^' + regexPattern + '$', 'i');
    }
    
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
  } catch (error) {
    // Display error for invalid regex
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error-message">Invalid regex pattern: ${error.message}</div>`;
  }
}

// Format population with commas
function formatPopulation(population) {
  return population.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Update regex display with anchors
function updateRegexDisplay() {
  const patternInput = document.getElementById('patternInput');
  const regexMode = document.getElementById('regexMode').checked;
  const regexPrefix = document.getElementById('regexPrefix');
  const regexSuffix = document.getElementById('regexSuffix');
  
  if (regexMode) {
    regexPrefix.style.display = 'block';
    regexSuffix.style.display = 'block';
    patternInput.classList.add('regex-mode');
  } else {
    regexPrefix.style.display = 'none';
    regexSuffix.style.display = 'none';
    patternInput.classList.remove('regex-mode');
  }
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
  
  // Add event listener for regex mode toggle
  document.getElementById('regexMode').addEventListener('change', updateRegexDisplay);
  
  // Initialize regex display
  updateRegexDisplay();
  
  // Load the city data
  loadCitiesFromJSON();
}

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
