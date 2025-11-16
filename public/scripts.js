/**
 * Transport for Rory - Dashboard JavaScript
 */

const STORAGE_KEY_LINES = 'tfr-selected-lines';
const STORAGE_KEY_STATIONS = 'tfr-configured-stations';

let allLines = [];
let allStations = [];
let selectedLines = [];
let configuredStations = [];
let refreshInterval = null;
let isInitialized = false;
let selectedSuggestionIndex = -1;
let currentStationForLineFilter = null;

/**
 * Fetches all available lines from the API
 */
async function fetchAllLines() {
  try {
    const response = await fetch('/api/lines');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allLines = await response.json();
    console.log(`Loaded ${allLines.length} lines from API`);
  } catch (error) {
    console.error('Error fetching lines:', error);
    // Fallback to empty array
    allLines = [];
  }
}

/**
 * Fetches popular stations from the API
 */
async function fetchAllStations() {
  try {
    const response = await fetch('/api/stations');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allStations = await response.json();
    console.log(`Loaded ${allStations.length} stations from API`);
  } catch (error) {
    console.error('Error fetching stations:', error);
    // Fallback to empty array
    allStations = [];
  }
}

/**
 * Gets selected lines from local storage
 */
function getSelectedLinesFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LINES);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that stored lines are valid
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading from local storage:', error);
  }
  // Return empty array - will be populated with all lines after fetch
  return [];
}

/**
 * Saves selected lines to local storage
 */
function saveSelectedLinesToStorage(lines) {
  try {
    localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(lines));
  } catch (error) {
    console.error('Error saving to local storage:', error);
  }
}

/**
 * Gets selected station from local storage
 */
function getConfiguredStationsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STATIONS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading configured stations from local storage:', error);
  }
  return [];
}

/**
 * Saves configured stations to local storage
 */
function saveConfiguredStationsToStorage(stations) {
  try {
    localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(stations));
  } catch (error) {
    console.error('Error saving configured stations to local storage:', error);
  }
}

/**
 * Fetches and displays tube line status
 */
async function fetchLineStatus() {
  const container = document.getElementById('line-status');

  if (selectedLines.length === 0) {
    container.innerHTML = '<div class="no-arrivals">No lines selected. Click "Configure Lines" to select lines to display.</div>';
    return;
  }

  try {
    container.innerHTML = '<div class="loading">Loading line status...</div>';

    // Build URL with selected lines
    const linesParam = selectedLines.join(',');
    const response = await fetch(`/api/status?lines=${linesParam}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const lines = await response.json();
    displayLineStatus(lines);
  } catch (error) {
    console.error('Error fetching line status:', error);
    container.innerHTML = `<div class="error">Failed to load line status: ${error.message}</div>`;
  }
}

/**
 * Generates TfL URL for a line based on its mode
 * @param {object} line - Line object with id and modeName
 * @returns {string} TfL URL for the line
 */
function getTfLLineUrl(line) {
  const modeName = line.modeName ? line.modeName.toLowerCase() : 'tube';

  // Map mode names to URL segments
  if (modeName === 'overground') {
    return `https://tfl.gov.uk/overground/route/${line.id}/`;
  } else if (modeName === 'tube') {
    return `https://tfl.gov.uk/tube/route/${line.id}/`;
  } else if (modeName === 'elizabeth-line') {
    return `https://tfl.gov.uk/modes/elizabeth-line/`;
  } else if (modeName === 'dlr') {
    return `https://tfl.gov.uk/modes/dlr/`;
  } else if (modeName === 'tram') {
    return `https://tfl.gov.uk/modes/trams/`;
  } else {
    // Default to tube format
    return `https://tfl.gov.uk/tube/route/${line.id}/`;
  }
}

/**
 * Displays line status in the UI
 */
function displayLineStatus(lines) {
  const container = document.getElementById('line-status');

  if (!lines || lines.length === 0) {
    container.innerHTML = '<div class="no-arrivals">No line status available</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'line-status-grid';

  for (const line of lines) {
    const card = document.createElement('a');
    card.className = 'line-status-card';
    card.setAttribute('data-line', line.id);
    card.href = getTfLLineUrl(line);
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const severity = getStatusClass(line.statusSeverity);

    card.innerHTML = `
      <div class="line-header">
        <div class="line-name">${line.name}</div>
        <div class="status-badge status-${severity}">${line.status}</div>
      </div>
      ${line.reason ? `<div class="status-reason">${line.reason}</div>` : ''}
    `;

    grid.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(grid);
}

/**
 * Gets CSS class for status severity
 */
function getStatusClass(severity) {
  if (severity >= 10) return 'good';
  if (severity >= 5) return 'minor';
  return 'severe';
}

/**
 * Fetches and displays station arrivals for all configured stations
 */
async function fetchAllStationArrivals() {
  const container = document.getElementById('arrivals');

  if (configuredStations.length === 0) {
    container.innerHTML = '<div class="no-arrivals">No stations configured. Click "Configure Stations" to add stations.</div>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading arrivals...</div>';

  const arrivalsHtml = [];

  for (const stationConfig of configuredStations) {
    try {
      const response = await fetch(`/api/arrivals/${stationConfig.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const html = renderStationArrivals(stationConfig, data);
      arrivalsHtml.push(html);
    } catch (error) {
      console.error(`Error fetching arrivals for ${stationConfig.name}:`, error);
      arrivalsHtml.push(`
        <div class="station-arrivals-card">
          <div class="station-card-header">
            <h3 class="station-card-name">${stationConfig.name}</h3>
          </div>
          <div class="error">Failed to load arrivals</div>
        </div>
      `);
    }
  }

  container.innerHTML = `<div class="arrivals-grid">${arrivalsHtml.join('')}</div>`;
}

/**
 * Renders arrivals for a single station
 */
function renderStationArrivals(stationConfig, data) {
  if (!data.lines || Object.keys(data.lines).length === 0) {
    return `
      <div class="station-arrivals-card">
        <div class="station-card-header">
          <h3 class="station-card-name">${stationConfig.name}</h3>
          <button class="btn-icon" onclick="openLineFilter('${stationConfig.id}')" title="Filter lines">⚙️</button>
        </div>
        <div class="no-arrivals">No arrivals available</div>
      </div>
    `;
  }

  let html = `
    <div class="station-arrivals-card">
      <div class="station-card-header">
        <h3 class="station-card-name">${data.stationName || stationConfig.name}</h3>
        <button class="btn-icon" onclick="openLineFilter('${stationConfig.id}')" title="Filter lines">⚙️</button>
      </div>
      <div class="station-arrivals-lines-container">
  `;

  // Filter lines based on station config
  const selectedLineIds = stationConfig.selectedLines || [];
  const sortedLines = Object.entries(data.lines)
    .filter(([lineId]) => selectedLineIds.length === 0 || selectedLineIds.includes(lineId))
    .sort((a, b) => a[1].lineName.localeCompare(b[1].lineName));

  if (sortedLines.length === 0) {
    html += '<div class="no-arrivals">No arrivals for selected lines</div>';
  }

  for (const [lineId, lineData] of sortedLines) {
    html += `
      <div class="line-arrivals-compact">
        <div class="line-arrivals-header-compact">${lineData.lineName} Line</div>
        <ul class="arrivals-list">
    `;

    const arrivals = lineData.arrivals.slice(0, 3);

    for (const arrival of arrivals) {
      const timeText = formatTimeToStation(arrival.timeToStation);
      const isDue = timeText === 'Due';

      html += `
        <li class="arrival-item">
          <div class="arrival-info">
            <div class="arrival-destination">${arrival.destination}</div>
            <div class="arrival-platform">${arrival.platform}</div>
          </div>
          <div class="arrival-time ${isDue ? 'due' : ''}">${timeText}</div>
        </li>
      `;
    }

    html += `
        </ul>
      </div>
    `;
  }

  html += '</div></div>';
  return html;
}

/**
 * Displays station arrivals in the UI
 */
function displayStationArrivals(data) {
  // This function is no longer needed - using renderStationArrivals instead
}

/**
 * Formats time to station in human-readable format
 */
function formatTimeToStation(seconds) {
  if (seconds < 30) {
    return 'Due';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) {
    return '1 min';
  }

  return `${minutes} mins`;
}

/**
 * Populates the station selector dropdown
 */
function setupStationSearch() {
  const searchInput = document.getElementById('station-search');
  const suggestionsDropdown = document.getElementById('station-suggestions');

  // Set initial value if station is selected
  if (currentStation && currentStationName) {
    searchInput.value = currentStationName;
  }

  // Handle input events for autocomplete
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();

    if (query.length === 0) {
      hideSuggestions();
      return;
    }

    // Filter stations based on query
    const matches = allStations.filter(station =>
      station.name.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 suggestions

    showSuggestions(matches);
  });

  // Handle keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    const suggestions = suggestionsDropdown.querySelectorAll('.suggestion-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
      updateSelectedSuggestion(suggestions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSelectedSuggestion(suggestions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        suggestions[selectedSuggestionIndex].click();
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
      hideSuggestions();
    }
  });
}

/**
 * Shows station suggestions in the dropdown
 */
function showSuggestions(stations) {
  const suggestionsDropdown = document.getElementById('station-suggestions');
  selectedSuggestionIndex = -1;

  if (stations.length === 0) {
    suggestionsDropdown.innerHTML = '<div class="no-suggestions">No stations found</div>';
    suggestionsDropdown.style.display = 'block';
    return;
  }

  suggestionsDropdown.innerHTML = '';

  for (const station of stations) {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = station.name;
    item.dataset.stationId = station.id;
    item.dataset.stationName = station.name;

    item.addEventListener('click', () => {
      selectStation(station.id, station.name);
    });

    suggestionsDropdown.appendChild(item);
  }

  suggestionsDropdown.style.display = 'block';
}

/**
 * Hides the suggestions dropdown
 */
function hideSuggestions() {
  const suggestionsDropdown = document.getElementById('station-suggestions');
  suggestionsDropdown.style.display = 'none';
  selectedSuggestionIndex = -1;
}

/**
 * Updates the visual selection in suggestions
 */
function updateSelectedSuggestion(suggestions) {
  suggestions.forEach((item, index) => {
    if (index === selectedSuggestionIndex) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Selects a station and updates the UI
 */
function selectStation(stationId, stationName) {
  const searchInput = document.getElementById('station-search');

  currentStation = stationId;
  currentStationName = stationName;
  searchInput.value = stationName;

  saveSelectedStationToStorage(stationId);
  hideSuggestions();
  fetchStationArrivals(stationId);
}

/**
 * Starts auto-refresh for arrivals
 */
function startAutoRefresh() {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Refresh arrivals every 20 seconds
  refreshInterval = setInterval(() => {
    fetchAllStationArrivals();
  }, 20000);
}

/**
 * Populates the line selector modal with checkboxes
 */
function populateLineSelector() {
  const container = document.getElementById('line-checkboxes');
  container.innerHTML = '';

  if (allLines.length === 0) {
    container.innerHTML = '<div class="no-arrivals">No lines available</div>';
    return;
  }

  for (const line of allLines) {
    const label = document.createElement('label');
    label.className = 'line-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = line.id;
    checkbox.id = `line-${line.id}`;
    checkbox.checked = selectedLines.includes(line.id);

    const span = document.createElement('span');
    span.textContent = `${line.name} ${line.modeName ? `(${line.modeName})` : ''}`;

    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);
  }
}

/**
 * Opens the line selector modal
 */
function openLineSelector() {
  populateLineSelector();
  document.getElementById('line-selector-modal').style.display = 'flex';
}

/**
 * Closes the line selector modal
 */
function closeLineSelector() {
  document.getElementById('line-selector-modal').style.display = 'none';
}

/**
 * Saves the selected lines and refreshes the display
 */
function saveLineSelection() {
  const checkboxes = document.querySelectorAll('#line-checkboxes input[type="checkbox"]');
  const newSelection = [];

  for (const checkbox of checkboxes) {
    if (checkbox.checked) {
      newSelection.push(checkbox.value);
    }
  }

  // Ensure at least one line is selected
  if (newSelection.length === 0) {
    alert('Please select at least one line to display.');
    return;
  }

  selectedLines = newSelection;
  saveSelectedLinesToStorage(selectedLines);
  closeLineSelector();
  fetchLineStatus();
}

/**
 * Selects all lines in the modal
 */
function selectAllLines() {
  const checkboxes = document.querySelectorAll('#line-checkboxes input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    checkbox.checked = true;
  }
}

/**
 * Deselects all lines in the modal
 */
function deselectAllLines() {
  const checkboxes = document.querySelectorAll('#line-checkboxes input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    checkbox.checked = false;
  }
}

/**
 * Sets up event listeners for the line selector modal
 */
function setupLineSelector() {
  document.getElementById('configure-lines-btn').addEventListener('click', openLineSelector);
  document.getElementById('close-modal').addEventListener('click', closeLineSelector);
  document.getElementById('save-lines').addEventListener('click', saveLineSelection);
  document.getElementById('select-all-lines').addEventListener('click', selectAllLines);
  document.getElementById('deselect-all-lines').addEventListener('click', deselectAllLines);

  // Close modal when clicking outside of it
  document.getElementById('line-selector-modal').addEventListener('click', (e) => {
    if (e.target.id === 'line-selector-modal') {
      closeLineSelector();
    }
  });
}

/**
 * Initialize the dashboard
 */
async function init() {
  if (isInitialized) return;
  isInitialized = true;

  // Show loading state
  document.getElementById('line-status').innerHTML = '<div class="loading">Loading lines...</div>';
  document.getElementById('arrivals').innerHTML = '<div class="loading">Loading...</div>';

  // Fetch lines and stations from API
  await Promise.all([fetchAllLines(), fetchAllStations()]);

  // Load saved preferences or use defaults
  const savedLines = getSelectedLinesFromStorage();
  selectedLines = savedLines.length > 0 ? savedLines : ['jubilee', 'windrush'];

  const savedStations = getConfiguredStationsFromStorage();
  configuredStations = savedStations;

  // Set up UI
  setupLineSelector();
  setupStationConfiguration();

  // Fetch initial data
  fetchLineStatus();
  fetchAllStationArrivals();

  startAutoRefresh();

  // Refresh line status every 30 seconds
  setInterval(fetchLineStatus, 30000);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
