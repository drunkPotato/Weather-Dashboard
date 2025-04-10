// Ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
  
    searchButton.addEventListener('click', () => {
      const city = document.getElementById('city-input').value.trim();
      if (!city) return;
  
      fetchCurrentWeather(city);
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
  