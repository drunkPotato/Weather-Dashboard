// Logic: 
// Step 1: Get input
// Step 2: Fetch Data
// Step 3: Display Information

//Set up 
const searchButton = document.getElementById('search-button');
const cityInput = document.getElementById('city-input');

//Listen for submission
searchButton.addEventListener('click', onUserSearch);

cityInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    onUserSearch();
  }
});

//Call Logic Chain on Input
function onUserSearch() {
  const city = cityInput.value.trim();
  if (!city) return;

  //Fetch Data
  fetchWeatherData(city)
    //Display Data
    .then(data => displayData(data))
    .catch(err => {
      document.getElementById('hourly-details').innerHTML = `<p>Error: ${err.message}</p>`;
    });
}

function fetchWeatherData(city) {
  if (!city) return Promise.reject(new Error("No city provided"));

  return Promise.all([
    getCurrentWeather(city),
    fetchForecast(city)
  ]).then(([currentData, forecastData]) => ({ currentData, forecastData }));
}

async function getCurrentWeather(city) {
  const endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('City not found');
  return await response.json();
}

async function fetchForecast(city) {
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const response = await fetch(forecastUrl);
  if (!response.ok) throw new Error('Forecast data unavailable');
  return await response.json();
}

function convertCurrentToForecastLikeEntry(data) {
  return {
    dt_txt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    main: data.main,
    weather: data.weather,
    wind: data.wind
  };
}

function displayData({ currentData, forecastData }) {
  const forecastContainer = document.getElementById('forecast-cards');
  forecastContainer.innerHTML = '';

  const currentEntry = convertCurrentToForecastLikeEntry(currentData);

  const dailyMap = {};
  forecastData.list.forEach(entry => {
    const date = entry.dt_txt.split(' ')[0];
    if (!dailyMap[date]) dailyMap[date] = [];
    dailyMap[date].push(entry);
  });

  const todayKey = new Date().toISOString().split('T')[0];
  if (dailyMap[todayKey]) {
    dailyMap[todayKey][0] = currentEntry;
  } else {
    dailyMap[todayKey] = [currentEntry];
  }

  Object.keys(dailyMap).slice(0, 5).forEach(date => {
    const entries = dailyMap[date];
    const card = document.createElement('div');
    card.className = 'forecast-card';

    const dateHeader = document.createElement('h4');
    dateHeader.textContent = new Date(date).toDateString();

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = entries.length - 1;
    slider.step = 1;
    slider.value = 0;

    const details = document.createElement('div');
    details.className = 'slider-details';

    function renderSliderContent(index) {
      const entry = entries[index];
      const time = new Date(entry.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      details.innerHTML = `
        <h5>${time}</h5>
        <img src="https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png" alt="icon">
        <p><strong>${entry.weather[0].main}</strong>: ${entry.weather[0].description}</p>
        <p>Temp: ${entry.main.temp.toFixed(1)}°C</p>
        <p>Humidity: ${entry.main.humidity}%</p>
        <p>Wind: ${entry.wind.speed} m/s</p>
      `;
    }

    renderSliderContent(0);

    slider.addEventListener('input', () => {
      renderSliderContent(slider.value);
    });

    card.appendChild(dateHeader);
    card.appendChild(slider);
    card.appendChild(details);

    forecastContainer.appendChild(card);
  });

  document.getElementById("forecast").style.display = "block";
} 