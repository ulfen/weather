const weatherData = {
  city: "Venlo",
  country: "Netherlands",
  condition: "Sunny",
  temperature: 23,
  low: 14,
  high: 23,
};

const locationEl = document.getElementById("location");
const temperatureEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const temperatureRangeEl = document.getElementById("temperature-range");
const weatherIconEl = document.getElementById("weather-icon");

locationEl.textContent = `${weatherData.city}, ${weatherData.country}`;
temperatureEl.textContent = `${weatherData.temperature}°C`;
conditionEl.textContent = weatherData.condition;
temperatureRangeEl.textContent = `${weatherData.high}° / ${weatherData.low}°`;
weatherIconEl.setAttribute("aria-label", `${weatherData.condition} weather`);
