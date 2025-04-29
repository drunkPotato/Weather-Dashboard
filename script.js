
const searchButton = document.getElementById('search-button');
const cityInput = document.getElementById('city-input');

const apiKey = '10bbd7f83cb2c130109469cc99a9f754';


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

function onUserSearch() {
    const city = cityInput.value.trim();
    if (!city) {
        displayError("Please enter a city name.");
        return;
    }
    cityInput.value = '';

    fetchWeatherData(city)
        .then(data => displayWeatherData(data))
        .catch(err => {
            console.error("Error fetching or displaying weather data:", err);
            displayError(err.message || "Could not retrieve weather data.");
        });
}


function fetchWeatherData(city) {
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        return Promise.reject(new Error("API Key not configured. Please set the 'apiKey' variable."));
    }
    if (!city) {
        return Promise.reject(new Error("No city provided"));
    }


    return Promise.allSettled([
        getCurrentWeather(city),
        fetchForecast(city)
    ]).then(results => {
        const currentResult = results[0];
        const forecastResult = results[1];


        if (forecastResult.status === 'rejected') {
             throw new Error(forecastResult.reason?.message || 'Forecast data unavailable');
        }
        if (currentResult.status === 'rejected') {
             console.warn("Could not fetch current weather:", currentResult.reason?.message);
        }

        return {
            currentData: currentResult.status === 'fulfilled' ? currentResult.value : null, // Allow null if current fails
            forecastData: forecastResult.value
        };
    });
}

async function getCurrentWeather(city) {
    const endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(endpoint);
    if (!response.ok) {
        if (response.status === 404) throw new Error(`City '${city}' not found.`);
        throw new Error(`Failed to fetch current weather (Status: ${response.status})`);
    }
    return await response.json();
}

async function fetchForecast(city) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(forecastUrl);
    if (!response.ok) {
         if (response.status === 404) throw new Error(`Forecast for '${city}' not found.`);
        throw new Error(`Failed to fetch forecast (Status: ${response.status})`);
    }
    return await response.json();
}

function convertCurrentToForecastLikeEntry(currentData) {
    if (!currentData) return null; 

    const now = currentData.dt ? new Date(currentData.dt * 1000) : new Date();

    return {
        dt: currentData.dt || Math.floor(now.getTime() / 1000), 
        dt_txt: now.toISOString().slice(0, 19).replace('T', ' '),
        main: currentData.main,
        weather: currentData.weather,
        wind: currentData.wind,
    };
}

function prepareForecastData(currentData, forecastData) {
    const dailyMap = {};

    forecastData.list.forEach(entry => {
        const date = entry.dt_txt.split(' ')[0];
        if (!dailyMap[date]) dailyMap[date] = [];
        dailyMap[date].push(entry);
    });

    const currentEntry = convertCurrentToForecastLikeEntry(currentData);

    if (currentEntry) {
        const todayKey = currentEntry.dt_txt.split(' ')[0]; 

        if (dailyMap[todayKey]) {
            dailyMap[todayKey].unshift(currentEntry);
            dailyMap[todayKey] = dailyMap[todayKey].filter((entry, index, self) =>
               index === self.findIndex((e) => e.dt === entry.dt)
            );
        } else {
            dailyMap[todayKey] = [currentEntry];
        }
    }

    return Object.keys(dailyMap)
        .sort()
        .slice(0, 5)
        .map(date => ({
            date: date,
            entries: dailyMap[date]
        }));
}

function updateWeatherDetails(detailsContainer, entry) {
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

function createTodaySection(todayData) {
    const { date, entries } = todayData;

    const section = document.createElement('div');
    section.id = 'today-weather';
    section.className = 'today-weather-section';

    const header = document.createElement('h3');
    const todayDate = new Date(date + 'T00:00:00'); 
    header.textContent = `Today (${todayDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;

    const details = document.createElement('div');
    details.className = 'today-slider-details';

    section.appendChild(header);

    if (entries.length > 1) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = entries.length - 1;
        slider.step = 1;
        slider.value = 0;
        slider.className = 'today-time-slider';

        slider.addEventListener('input', () => {
            updateWeatherDetails(details, entries[parseInt(slider.value, 10)]);
        });
        section.appendChild(slider);
    }

    section.appendChild(details);

    if (entries.length > 0) {
        updateWeatherDetails(details, entries[0]);
    } else {
        details.innerHTML = "<p>No specific time data for today.</p>";
    }

    return section;
}

function createForecastCard(dayData) {
    const { date, entries } = dayData;

    const card = document.createElement('div');
    card.className = 'forecast-card';

    const dateHeader = document.createElement('h4');
    const forecastDate = new Date(date + 'T00:00:00'); 
    dateHeader.textContent = forecastDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }); // Use 'short' weekday

    const details = document.createElement('div');
    details.className = 'forecast-slider-details';

    card.appendChild(dateHeader);

    if (entries.length > 1) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = entries.length - 1;
        slider.step = 1;
        slider.value = 0;
        slider.className = 'forecast-time-slider';

        slider.addEventListener('input', () => {
            updateWeatherDetails(details, entries[parseInt(slider.value, 10)]);
        });
        card.appendChild(slider);
    }

    card.appendChild(details);

     if (entries.length > 0) {
        updateWeatherDetails(details, entries[0]); 
    } else {
        details.innerHTML = "<p>No specific time data.</p>"; 
    }


    return card;
}

function displayWeatherData({ currentData, forecastData }) {
    const weatherDisplayArea = document.getElementById("weather-display");
    if (!weatherDisplayArea) {
        console.error("Element with ID 'weather-display' not found.");
        return;
    }
    weatherDisplayArea.innerHTML = ''; 
    weatherDisplayArea.style.display = 'none'; 

    const preparedData = prepareForecastData(currentData, forecastData);

    if (!preparedData || preparedData.length === 0) {
        displayError("No forecast data available to display.", weatherDisplayArea);
        return;
    }

    const todayData = preparedData[0];
    const todayElement = createTodaySection(todayData);
    weatherDisplayArea.appendChild(todayElement);

    const subsequentForecastData = preparedData.slice(1)

    if (subsequentForecastData.length > 0) {
        const forecastCardsContainer = document.createElement('div');
        forecastCardsContainer.id = 'forecast-cards'; 
        forecastCardsContainer.className = 'forecast-cards-container';

        subsequentForecastData.forEach(dayData => {
            const cardElement = createForecastCard(dayData);
            forecastCardsContainer.appendChild(cardElement);
        });
        weatherDisplayArea.appendChild(forecastCardsContainer);
    }

    weatherDisplayArea.style.display = "block";
}


function displayError(message, container = null) {
    const targetContainer = container || document.getElementById("weather-display");
     if (targetContainer) {
        targetContainer.innerHTML = `<p class="error-message">${message}</p>`;
        targetContainer.style.display = 'block';
     } else {

         alert("Error: " + message);
     }
    if (targetContainer && targetContainer.id === 'weather-display') {
        const cardContainer = document.getElementById('forecast-cards');
        if (cardContainer) cardContainer.innerHTML = '';
    }
}
