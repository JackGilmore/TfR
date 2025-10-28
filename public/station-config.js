/**
 * Station configuration functions
 */

/**
 * Opens the station configuration modal
 */
function openStationConfig() {
  document.getElementById('station-config-modal').style.display = 'flex';
  renderConfiguredStations();
}

/**
 * Closes the station configuration modal
 */
function closeStationConfig() {
  document.getElementById('station-config-modal').style.display = 'none';
  hideSuggestions('station-config');
}

/**
 * Sets up the station configuration search
 */
function setupStationConfigSearch() {
  const searchInput = document.getElementById('station-config-search');
  const suggestionsDropdown = document.getElementById('station-config-suggestions');
  let searchTimeout;

  if (!searchInput || !suggestionsDropdown) {
    console.error('Station config search elements not found');
    return;
  }

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(searchTimeout);

    if (query.length < 2) {
      suggestionsDropdown.style.display = 'none';
      suggestionsDropdown.innerHTML = '';
      return;
    }

    // Debounce the search
    searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/stations?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');

        const stations = await response.json();
        showStationConfigSuggestions(stations);
      } catch (error) {
        console.error('Error searching stations:', error);
      }
    }, 300);
  });

  // Handle clicks on suggestions with mousedown to prevent blur
  suggestionsDropdown.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent input blur
  });

  // Close suggestions when clicking outside
  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      suggestionsDropdown.style.display = 'none';
      suggestionsDropdown.innerHTML = '';
    }, 200);
  });
}

/**
 * Shows suggestions in the station config search
 */
function showStationConfigSuggestions(stations) {
  const suggestionsDropdown = document.getElementById('station-config-suggestions');

  if (stations.length === 0) {
    suggestionsDropdown.innerHTML = '<div class="no-suggestions">No stations found</div>';
    suggestionsDropdown.style.display = 'block';
    return;
  }

  suggestionsDropdown.innerHTML = '';

  for (const station of stations) {
    // Skip if already configured
    if (configuredStations.find(s => s.id === station.id)) {
      continue;
    }

    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = station.name;

    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the document click handler
      addStation(station);
    });

    suggestionsDropdown.appendChild(item);
  }

  suggestionsDropdown.style.display = 'block';
}

/**
 * Hides suggestions dropdown
 */
function hideSuggestions(type) {
  const id = type === 'station-config' ? 'station-config-suggestions' : 'station-suggestions';
  const suggestionsDropdown = document.getElementById(id);
  if (suggestionsDropdown) {
    suggestionsDropdown.style.display = 'none';
    suggestionsDropdown.innerHTML = '';
  }
}

/**
 * Adds a station to the configured list
 */
async function addStation(station) {
  console.log('Adding station:', station);

  // Fetch station info to get available lines
  try {
    const response = await fetch(`/api/station-info/${station.id}`);
    if (!response.ok) throw new Error('Failed to fetch station info');

    const stationInfo = await response.json();

    configuredStations.push({
      id: station.id,
      name: station.name,
      selectedLines: [], // Empty means all lines
      availableLines: stationInfo.lines || [] // Store which lines serve this station
    });
  } catch (error) {
    console.error('Error fetching station info:', error);
    // Fallback: add station without line info
    configuredStations.push({
      id: station.id,
      name: station.name,
      selectedLines: [],
      availableLines: []
    });
  }

  console.log('Configured stations:', configuredStations);

  const searchInput = document.getElementById('station-config-search');
  if (searchInput) {
    searchInput.value = '';
  }

  // Force hide and clear the dropdown
  const suggestionsDropdown = document.getElementById('station-config-suggestions');
  if (suggestionsDropdown) {
    suggestionsDropdown.style.display = 'none';
    suggestionsDropdown.innerHTML = '';
  }

  renderConfiguredStations();
}

/**
 * Removes a station from the configured list
 */
function removeStation(stationId) {
  configuredStations = configuredStations.filter(s => s.id !== stationId);
  renderConfiguredStations();
}

/**
 * Renders the list of configured stations
 */
function renderConfiguredStations() {
  const container = document.getElementById('configured-stations-list');

  if (configuredStations.length === 0) {
    container.innerHTML = '<div class="no-arrivals">No stations configured yet. Search and add stations above.</div>';
    return;
  }

  container.innerHTML = '';

  for (const station of configuredStations) {
    const item = document.createElement('div');
    item.className = 'configured-station-item';

    const lineCount = station.selectedLines && station.selectedLines.length > 0
      ? `${station.selectedLines.length} lines`
      : 'All lines';

    item.innerHTML = `
      <div class="configured-station-info">
        <div class="configured-station-name">${station.name}</div>
        <div class="configured-station-lines">${lineCount}</div>
      </div>
      <div class="configured-station-actions">
        <button class="btn-icon" onclick="openLineFilter('${station.id}')" title="Filter lines">⚙️</button>
        <button class="btn-icon btn-danger" onclick="removeStation('${station.id}')" title="Remove">✕</button>
      </div>
    `;

    container.appendChild(item);
  }
}

/**
 * Saves station configuration
 */
function saveStationConfig() {
  saveConfiguredStationsToStorage(configuredStations);
  closeStationConfig();
  fetchAllStationArrivals();
}

/**
 * Opens the line filter modal for a station
 */
function openLineFilter(stationId) {
  const station = configuredStations.find(s => s.id === stationId);
  if (!station) return;

  currentStationForLineFilter = stationId;
  document.getElementById('line-filter-station-name').textContent = `Filter Lines - ${station.name}`;

  populateStationLineCheckboxes(station);
  document.getElementById('station-line-filter-modal').style.display = 'flex';
}

/**
 * Closes the line filter modal
 */
function closeLineFilter() {
  document.getElementById('station-line-filter-modal').style.display = 'none';
  currentStationForLineFilter = null;
}

/**
 * Populates line checkboxes for station filter
 */
function populateStationLineCheckboxes(station) {
  const container = document.getElementById('station-line-checkboxes');
  container.innerHTML = '';

  // Get available lines for this station
  const availableLines = station.availableLines || [];

  if (availableLines.length === 0) {
    container.innerHTML = '<div class="no-arrivals">No line information available for this station</div>';
    return;
  }

  // Sort available lines alphabetically
  const sortedLines = [...availableLines].sort((a, b) => a.name.localeCompare(b.name));

  for (const line of sortedLines) {
    const label = document.createElement('label');
    label.className = 'line-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = line.id;
    checkbox.id = `station-line-${line.id}`;

    // If no lines selected, all are shown (checked)
    // If lines are selected, only check those in the list
    const selectedLines = station.selectedLines || [];
    checkbox.checked = selectedLines.length === 0 || selectedLines.includes(line.id);

    const span = document.createElement('span');
    span.textContent = `${line.name} ${line.modeName ? `(${line.modeName})` : ''}`;

    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);
  }
}

/**
 * Selects all lines in the station filter
 */
function selectAllStationLines() {
  const checkboxes = document.querySelectorAll('#station-line-checkboxes input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    checkbox.checked = true;
  }
}

/**
 * Deselects all lines in the station filter
 */
function deselectAllStationLines() {
  const checkboxes = document.querySelectorAll('#station-line-checkboxes input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    checkbox.checked = false;
  }
}

/**
 * Saves the line filter for a station
 */
function saveStationLineFilter() {
  if (!currentStationForLineFilter) return;

  const station = configuredStations.find(s => s.id === currentStationForLineFilter);
  if (!station) return;

  const checkboxes = document.querySelectorAll('#station-line-checkboxes input[type="checkbox"]');
  const selectedLines = [];
  const availableLineCount = station.availableLines ? station.availableLines.length : 0;

  for (const checkbox of checkboxes) {
    if (checkbox.checked) {
      selectedLines.push(checkbox.value);
    }
  }

  // If all available lines are selected, store empty array (means show all)
  station.selectedLines = selectedLines.length === availableLineCount ? [] : selectedLines;

  saveConfiguredStationsToStorage(configuredStations);
  closeLineFilter();
  renderConfiguredStations();
  fetchAllStationArrivals();
}

/**
 * Sets up event listeners for station configuration
 */
function setupStationConfiguration() {
  document.getElementById('configure-stations-btn').addEventListener('click', openStationConfig);
  document.getElementById('close-station-modal').addEventListener('click', closeStationConfig);
  document.getElementById('save-station-config').addEventListener('click', saveStationConfig);

  document.getElementById('close-line-filter-modal').addEventListener('click', closeLineFilter);
  document.getElementById('save-station-line-filter').addEventListener('click', saveStationLineFilter);
  document.getElementById('select-all-station-lines').addEventListener('click', selectAllStationLines);
  document.getElementById('deselect-all-station-lines').addEventListener('click', deselectAllStationLines);

  setupStationConfigSearch();

  // Close modals when clicking outside
  document.getElementById('station-config-modal').addEventListener('click', (e) => {
    if (e.target.id === 'station-config-modal') {
      closeStationConfig();
    }
  });

  document.getElementById('station-line-filter-modal').addEventListener('click', (e) => {
    if (e.target.id === 'station-line-filter-modal') {
      closeLineFilter();
    }
  });
}
