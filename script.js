// --- Constants and Setup ---
const searchButton = document.getElementById('search-button');
const cityInput = document.getElementById('city-input');
// IMPORTANT: Replace 'YOUR_API_KEY' with your actual OpenWeatherMap API key
const apiKey = '10bbd7f83cb2c130109469cc99a9f754';


// --- Event Listeners ---
if (searchButton && cityInput) {
    searchButton.addEventListener('click', onUserSearch);

    cityInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            onUserSearch();
        }
    });
} else {
    console.error("Search button or city input field not found in the DOM.");
}

// --- Core Logic ---

/**
 * Handles the user search action.
 */
function onUserSearch() {
    const city = cityInput.value.trim();
    if (!city) {
        displayError("Please enter a city name.");
        return;
    }
    cityInput.value = ''; // Clear input field after search

    // Fetch Data and then Display
    fetchWeatherData(city)
        .then(data => displayWeatherData(data)) // Changed function name for clarity
        .catch(err => {
            console.error("Error fetching or displaying weather data:", err);
            displayError(err.message || "Could not retrieve weather data.");
        });
}

/**
 * Fetches both current weather and forecast data from OpenWeatherMap.
 * @param {string} city - The name of the city.
 * @returns {Promise<{currentData: object, forecastData: object}>} A promise resolving with the weather data.
 */
function fetchWeatherData(city) {
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        return Promise.reject(new Error("API Key not configured. Please set the 'apiKey' variable."));
    }
    if (!city) {
        return Promise.reject(new Error("No city provided"));
    }

    // Use Promise.allSettled to get results even if one fails
    return Promise.allSettled([
        getCurrentWeather(city),
        fetchForecast(city)
    ]).then(results => {
        const currentResult = results[0];
        const forecastResult = results[1];

        // Basic check: ensure at least forecast data is available, as it's often more crucial for this display
        if (forecastResult.status === 'rejected') {
             throw new Error(forecastResult.reason?.message || 'Forecast data unavailable');
        }
        if (currentResult.status === 'rejected') {
             console.warn("Could not fetch current weather:", currentResult.reason?.message);
             // Potentially proceed with only forecast data, or throw error if current is essential
             // throw new Error(currentResult.reason?.message || 'Current weather unavailable');
        }

        return {
            currentData: currentResult.status === 'fulfilled' ? currentResult.value : null, // Allow null if current fails
            forecastData: forecastResult.value
        };
    });
}

/**
 * Fetches the current weather data from OpenWeatherMap.
 * @param {string} city - The name of the city.
 * @returns {Promise<object>} A promise resolving with the current weather data.
 */
async function getCurrentWeather(city) {
    const endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(endpoint);
    if (!response.ok) {
        if (response.status === 404) throw new Error(`City '${city}' not found.`);
        throw new Error(`Failed to fetch current weather (Status: ${response.status})`);
    }
    return await response.json();
}

/**
 * Fetches the 5-day/3-hour forecast data from OpenWeatherMap.
 * @param {string} city - The name of the city.
 * @returns {Promise<object>} A promise resolving with the forecast data.
 */
async function fetchForecast(city) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(forecastUrl);
    if (!response.ok) {
         if (response.status === 404) throw new Error(`Forecast for '${city}' not found.`);
        throw new Error(`Failed to fetch forecast (Status: ${response.status})`);
    }
    return await response.json();
}

// --- Data Processing Helper ---

/**
 * Converts the current weather data structure to match the forecast entry structure.
 * Ensures consistent data format for display functions.
 * @param {object} currentData - The current weather data object.
 * @returns {object} A forecast-like entry object.
 */
function convertCurrentToForecastLikeEntry(currentData) {
    if (!currentData) return null; // Handle case where current weather fetch failed

    // Create a Date object first to ensure dt_txt is consistent
    const now = currentData.dt ? new Date(currentData.dt * 1000) : new Date(); // Use fetched dt if available, else current time

    return {
        dt: currentData.dt || Math.floor(now.getTime() / 1000), // Use fetched dt or calculate from now
        // Format dt_txt similar to forecast API: YYYY-MM-DD HH:MM:SS
        dt_txt: now.toISOString().slice(0, 19).replace('T', ' '),
        main: currentData.main,
        weather: currentData.weather,
        wind: currentData.wind,
        // Add other fields if your display functions expect them (e.g., clouds, visibility)
        // clouds: currentData.clouds,
        // visibility: currentData.visibility,
    };
}


/**
 * Groups forecast entries by date and merges current weather data (if available).
 * @param {object | null} currentData - The current weather data object, or null if fetch failed.
 * @param {object} forecastData - The forecast data object from the API.
 * @returns {Array<object>} An array of daily forecast objects, sorted by date, limited to 5 days.
 */
function prepareForecastData(currentData, forecastData) {
    const dailyMap = {};

    // Group forecast entries by date
    forecastData.list.forEach(entry => {
        const date = entry.dt_txt.split(' ')[0]; // Get YYYY-MM-DD part
        if (!dailyMap[date]) dailyMap[date] = [];
        dailyMap[date].push(entry);
    });

    // Prepare and merge current weather data if available
    const currentEntry = convertCurrentToForecastLikeEntry(currentData);

    if (currentEntry) {
        const todayKey = currentEntry.dt_txt.split(' ')[0]; // Use converted entry's date

        if (dailyMap[todayKey]) {
            // Add current data to the beginning of today's entries
            dailyMap[todayKey].unshift(currentEntry);
            // Optional: Remove potential duplicate based on timestamp (dt) if API includes exact current time in forecast
            dailyMap[todayKey] = dailyMap[todayKey].filter((entry, index, self) =>
               index === self.findIndex((e) => e.dt === entry.dt)
            );
        } else {
            // If today wasn't in the forecast list yet (unlikely but possible), add it
            dailyMap[todayKey] = [currentEntry];
        }
    }

    // Sort dates chronologically and format the output
    return Object.keys(dailyMap)
        .sort() // Ensure YYYY-MM-DD strings sort correctly
        .slice(0, 5) // Limit to today + next 4 days = 5 total
        .map(date => ({
            date: date,
            entries: dailyMap[date]
        }));
}

// --- DOM Manipulation / Display Functions ---

/**
 * Updates the details section (time, icon, temp, etc.) within a weather display area.
 * @param {HTMLElement} detailsContainer - The container element for the details.
 * @param {object} entry - The specific weather entry (current or forecast) to display.
 */
function updateWeatherDetails(detailsContainer, entry) {
    // Use dt_txt for time calculation as it's present in both converted current and forecast
    const time = new Date(entry.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const iconUrl = `https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png`;

    detailsContainer.innerHTML = `
        <h5>${time}</h5>
        <img src="${iconUrl}" alt="${entry.weather[0].description}" title="${entry.weather[0].description}">
        <p><strong>${entry.weather[0].main}</strong>: ${entry.weather[0].description}</p>
        <p>Temp: ${entry.main.temp?.toFixed(1)}°C</p>
        <p>Humidity: ${entry.main.humidity}%</p>
        <p>Wind: ${entry.wind?.speed} m/s</p>
    `;
}

/**
 * Creates the DOM element for the "Today" weather section.
 * @param {object} todayData - An object containing the date and weather entries for today.
 * @returns {HTMLElement} The created "Today" weather section element.
 */
function createTodaySection(todayData) {
    const { date, entries } = todayData;

    const section = document.createElement('div');
    section.id = 'today-weather';
    section.className = 'today-weather-section'; // For specific styling

    const header = document.createElement('h3');
    const todayDate = new Date(date + 'T00:00:00'); // Ensure correct date parsing
    header.textContent = `Today (${todayDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;

    const details = document.createElement('div');
    details.className = 'today-slider-details'; // Use a potentially different class if styling differs

    section.appendChild(header);

    // --- Slider Logic (only if multiple entries for today) ---
    if (entries.length > 1) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = entries.length - 1;
        slider.step = 1;
        slider.value = 0;
        slider.className = 'today-time-slider'; // Specific class for today's slider

        slider.addEventListener('input', () => {
            updateWeatherDetails(details, entries[parseInt(slider.value, 10)]);
        });
        section.appendChild(slider); // Append slider before details
    }

    section.appendChild(details);

    // --- Initial Render ---
    if (entries.length > 0) {
        updateWeatherDetails(details, entries[0]); // Show the first entry (latest current or earliest forecast)
    } else {
        details.innerHTML = "<p>No specific time data for today.</p>"; // Fallback
    }

    return section;
}

/**
 * Creates a single forecast card element for a future day's data.
 * @param {object} dayData - An object containing the date and forecast entries for one day.
 * @returns {HTMLElement} The created forecast card element.
 */
function createForecastCard(dayData) {
    const { date, entries } = dayData;

    const card = document.createElement('div');
    card.className = 'forecast-card';

    const dateHeader = document.createElement('h4');
    const forecastDate = new Date(date + 'T00:00:00'); // Ensure correct date parsing
    dateHeader.textContent = forecastDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }); // Use 'short' weekday

    const details = document.createElement('div');
    details.className = 'forecast-slider-details'; // Consistent class name

    card.appendChild(dateHeader);

    // --- Slider Logic (only if multiple entries for the day) ---
    if (entries.length > 1) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = entries.length - 1;
        slider.step = 1;
        slider.value = 0; // Default to first entry
        slider.className = 'forecast-time-slider';

        slider.addEventListener('input', () => {
            updateWeatherDetails(details, entries[parseInt(slider.value, 10)]);
        });
        card.appendChild(slider); // Append slider before details
    } else if (entries.length === 1) {
        // Maybe add a small spacer or adjust styling if no slider
    }

    card.appendChild(details);

    // --- Initial Render ---
     if (entries.length > 0) {
        updateWeatherDetails(details, entries[0]); // Show the first forecast entry for that day
    } else {
        details.innerHTML = "<p>No specific time data.</p>"; // Fallback
    }


    return card;
}

/**
 * Displays the prepared weather data, separating today and future days.
 * @param {object} weatherApiResponse - Object containing { currentData, forecastData }.
 */
function displayWeatherData({ currentData, forecastData }) {
    // Assume a main container exists in HTML: <div id="weather-display"></div>
    const weatherDisplayArea = document.getElementById("weather-display");
    if (!weatherDisplayArea) {
        console.error("Element with ID 'weather-display' not found.");
        return;
    }
    weatherDisplayArea.innerHTML = ''; // Clear previous results
    weatherDisplayArea.style.display = 'none'; // Hide until populated

    // 1. Prepare the data structure
    const preparedData = prepareForecastData(currentData, forecastData);

    if (!preparedData || preparedData.length === 0) {
        displayError("No forecast data available to display.", weatherDisplayArea);
        return;
    }

    // 2. Create and Append Today's Section
    const todayData = preparedData[0]; // First element is always the earliest day (today)
    const todayElement = createTodaySection(todayData);
    weatherDisplayArea.appendChild(todayElement);

    // 3. Create and Append Subsequent Forecast Cards
    const subsequentForecastData = preparedData.slice(1); // Get days 2 to 5

    if (subsequentForecastData.length > 0) {
        const forecastCardsContainer = document.createElement('div');
        forecastCardsContainer.id = 'forecast-cards'; // Keep original ID for cards container
        forecastCardsContainer.className = 'forecast-cards-container'; // Add a class for styling (e.g., grid/flex)

        subsequentForecastData.forEach(dayData => {
            const cardElement = createForecastCard(dayData); // Reuse card creator
            forecastCardsContainer.appendChild(cardElement);
        });
        weatherDisplayArea.appendChild(forecastCardsContainer); // Append container with all cards
    }

    // 4. Make the whole weather display area visible
    weatherDisplayArea.style.display = "block";
}

/**
 * Displays an error message to the user.
 * @param {string} message - The error message to display.
 * @param {HTMLElement | null} container - Optional container to display the message in. Defaults to #weather-display.
 */
function displayError(message, container = null) {
    const targetContainer = container || document.getElementById("weather-display");
     if (targetContainer) {
        targetContainer.innerHTML = `<p class="error-message">${message}</p>`;
        targetContainer.style.display = 'block'; // Ensure container is visible for error
     } else {
         // Fallback if even the main container is missing
         alert("Error: " + message);
     }
    // Clear any previous forecast cards if error occurs after a successful display
    if (targetContainer && targetContainer.id === 'weather-display') {
        const cardContainer = document.getElementById('forecast-cards');
        if (cardContainer) cardContainer.innerHTML = '';
    }
}

// --- Initial Run (Optional) ---
// You might want to load weather for a default city on page load
// document.addEventListener('DOMContentLoaded', () => {
//     fetchWeatherData("London") // Example default city
//         .then(displayWeatherData)
//         .catch(displayError);
// });