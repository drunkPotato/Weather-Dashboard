// Ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const cityInput = document.getElementById('city-input');

    searchButton.addEventListener('click', () => {
      const city = document.getElementById('city-input').value.trim();
      if (!city) return;
  
      fetchCurrentWeather(city);
      fetchForecast(city);
    });

    cityInput.addEventListener('keydown', (event) => {
      const city = document.getElementById('city-input').value.trim();
      if (event.key === 'Enter') {
        fetchCurrentWeather(city);
        fetchForecast(city);
      }
    });
  });
  
function fetchCurrentWeather(city) {
  const endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  fetch(endpoint)
    .then(response => {
      if (!response.ok) {
        throw new Error('City not found');
      }
      return response.json();
    })
    .then(data => displayCurrentWeather(data))
    .catch(err => {
      document.getElementById('current-details').innerHTML = `<p>Error: ${err.message}</p>`;
      console.error(err);
    });
}

function fetchForecast(city) {
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  fetch(forecastUrl)
    .then(response => {
      if (!response.ok) throw new Error('Forecast data unavailable');
      return response.json();
    })
    .then(data => displayForecast(data))
    .catch(err => {
      document.getElementById('forecast-cards').innerHTML = `<p>Error: ${err.message}</p>`;
    });
}
  
  
function displayCurrentWeather(data) {
  const container = document.getElementById('current-details');

  const html = `
    <h3>${data.name}, ${data.sys.country}</h3>
    <p><strong>${data.weather[0].main}</strong>: ${data.weather[0].description}</p>
    <p>Temperature: ${data.main.temp} °C</p>
    <p>Humidity: ${data.main.humidity}%</p>
    <p>Wind: ${data.wind.speed} m/s</p>
    <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" 
      alt="Weather icon" 
      style="width: 100px; height: 100px;" />
  `;
  container.innerHTML = html;
}

function displayForecast(data) {
  // Filter entries for today
  const localDate = new Date();
  const localDay = localDate.getDate();
  const localMonth = localDate.getMonth();
  const localYear = localDate.getFullYear();
  
  const todayHourly = data.list.filter(entry => {
    const entryDate = new Date(entry.dt_txt);
    return (
      entryDate.getDate() === localDay &&
      entryDate.getMonth() === localMonth &&
      entryDate.getFullYear() === localYear
    );
  });

  if (todayHourly.length === 0) {
    document.getElementById('hourly-details').innerHTML = '<p>No hourly data available for today.</p>';
    return;
  }

  setupHourlySlider(todayHourly);

  const forecastContainer = document.getElementById('forecast-cards');
  forecastContainer.innerHTML = '';

  const dailyMap = {};

  data.list.forEach(entry => {
    const date = entry.dt_txt.split(' ')[0];
    const hour = parseInt(entry.dt_txt.split(' ')[1].split(':')[0]);

    // Use 12:00 as a representative snapshot of each day
    if (hour === 12 && !dailyMap[date]) {
      dailyMap[date] = entry;
    }
  });

  Object.keys(dailyMap).slice(0, 5).forEach(date => {
    const entry = dailyMap[date];

    const card = document.createElement('div');
    card.className = 'forecast-card';

    card.innerHTML = `
      <h4>${new Date(date).toDateString()}</h4>
      <img src="https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png" alt="icon">
      <p><strong>${entry.weather[0].main}</strong>: ${entry.weather[0].description}</p>
      <p>Temp: ${entry.main.temp_min.toFixed(1)}°C – ${entry.main.temp_max.toFixed(1)}°C</p>
      <p>Humidity: ${entry.main.humidity}%</p>
    `;

    forecastContainer.appendChild(card);
  });

  function setupHourlySlider(hourlyData) {
    const slider = document.getElementById('hour-slider');
    const details = document.getElementById('hourly-details');

    // Initialize slider
    slider.max = hourlyData.length - 1;
    slider.value = 0;
    
    function renderDetails(index) {
      const entry = hourlyData[index];
      const time = new Date(entry.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      details.innerHTML = `
        <h4>${time}</h4>
        <img src="https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png" alt="icon">
        <p><strong>${entry.weather[0].main}</strong>: ${entry.weather[0].description}</p>
        <p>Temp: ${entry.main.temp.toFixed(1)}°C</p>
        <p>Humidity: ${entry.main.humidity}%</p>
        <p>Wind: ${entry.wind.speed} m/s</p>
      `;
    }

    // Initial render
    renderDetails(0);
    
    console.log("Local Date:", localDate.toString());
    console.log("Filtered hourly forecasts:", todayHourly);
    // Update on slider change
    slider.addEventListener('input', () => {
      renderDetails(slider.value);
    });
  }
}
