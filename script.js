// Logic: 
// Step 1: Measure input
// Step 2: Fetch Data
// Step 3: Display Information

//Get Input
document.addEventListener('DOMContentLoaded', () => {

  //Set up 
  const searchButton = document.getElementById('search-button');
  const cityInput = document.getElementById('city-input');


  //Execute Search on input submission
  searchButton.addEventListener('click', CitySearch);

  cityInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        CitySearch();
      }
    });

  });

    // Search logic
    function CitySearch(){
      const city = document.getElementById('city-input').value.trim();
      if (!city) return;
    
      //Set the elements visible
      document.getElementById("current-weather").style.display = "block";
      document.getElementById("detailed-hourly").style.display = "block";
      document.getElementById("forecast").style.display = "block";
    
      //Call the API
      getCurrentWeather(city)
      .then(data => displayCurrentWeather(data))
      .catch(err => showError(err.message));
      fetchForecast(city);
    }
  

  async function getCurrentWeather(city) {
    //Consume Endpoint
    const endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  
    //Return Data if OK or Error else
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('City not found');
    }
  
    const data = await response.json();
    return data;
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
  
  const todayHourly = data.list.filter(entry => {
    const entryDate = new Date(entry.dt_txt);
    return (
      entryDate.getDate() === localDay &&
      entryDate.getMonth() === localMonth
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
    if (!dailyMap[date]) dailyMap[date] = [];
    dailyMap[date].push(entry);
  });

  Object.keys(dailyMap).slice(1, 5).forEach(date => {
    const entries = dailyMap[date]; // entries: array of 3-hour forecast objects for that day
  
    const card = document.createElement('div');
    card.className = 'forecast-card';
  
    const dateHeader = document.createElement('h4');
    dateHeader.textContent = new Date(date).toDateString();
  
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = entries.length - 1;
    slider.step = 1;
    slider.value = 4;
  
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
  
    renderSliderContent(4);

    slider.addEventListener('input', () => {
      renderSliderContent(slider.value);
    });
  
    card.appendChild(dateHeader);
    card.appendChild(slider);
    card.appendChild(details);
  
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
    
    // Update on slider change
    slider.addEventListener('input', () => {
      renderDetails(slider.value);
    });
  }
}
