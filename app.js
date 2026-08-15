// Theme is automatically applied via CSS @media (prefers-color-scheme: dark)

/**
 * Current location data
 * @property {string} city - City name from geocoding API
 * @property {string} country - Country name from geocoding API
 * @property {number} latitude - Geographic latitude for Open-Meteo API
 * @property {number} longitude - Geographic longitude for Open-Meteo API
 */
let WEATHER_LOCATION = {
  city: "Venlo",
  country: "Netherlands",
  latitude: 51.37,
  longitude: 6.17,
};

const locationEl = document.getElementById("location");
const temperatureEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const temperatureRangeEl = document.getElementById("temperature-range");
const weatherIconEl = document.getElementById("weather-icon");
const forecastRowEl = document.getElementById("forecast-row");
const locationInputEl = document.getElementById("location-input");
const searchButtonEl = document.getElementById("search-button");
const searchErrorEl = document.getElementById("search-error");

const WEATHER_CODES = {
  0: { label: "Clear sky", day: "☀️", night: "🌙" },
  1: { label: "Mainly clear", day: "🌤️", night: "🌙" },
  2: { label: "Partly cloudy", day: "⛅", night: "☁️" },
  3: { label: "Overcast", day: "☁️", night: "☁️" },
  45: { label: "Fog", day: "🌫️", night: "🌫️" },
  48: { label: "Rime fog", day: "🌫️", night: "🌫️" },
  51: { label: "Light drizzle", day: "🌦️", night: "🌧️" },
  53: { label: "Moderate drizzle", day: "🌦️", night: "🌧️" },
  55: { label: "Dense drizzle", day: "🌧️", night: "🌧️" },
  56: { label: "Light freezing drizzle", day: "🌧️", night: "🌧️" },
  57: { label: "Heavy freezing drizzle", day: "🌧️", night: "🌧️" },
  61: { label: "Slight rain", day: "🌧️", night: "🌧️" },
  63: { label: "Moderate rain", day: "🌧️", night: "🌧️" },
  65: { label: "Heavy rain", day: "🌧️", night: "🌧️" },
  66: { label: "Light freezing rain", day: "🌧️", night: "🌧️" },
  67: { label: "Heavy freezing rain", day: "🌧️", night: "🌧️" },
  71: { label: "Slight snow", day: "❄️", night: "❄️" },
  73: { label: "Moderate snow", day: "❄️", night: "❄️" },
  75: { label: "Heavy snow", day: "❄️", night: "❄️" },
  77: { label: "Snow grains", day: "❄️", night: "❄️" },
  80: { label: "Rain showers", day: "🌦️", night: "🌧️" },
  81: { label: "Heavy rain showers", day: "🌧️", night: "🌧️" },
  82: { label: "Violent rain showers", day: "⛈️", night: "⛈️" },
  85: { label: "Snow showers", day: "🌨️", night: "🌨️" },
  86: { label: "Heavy snow showers", day: "🌨️", night: "🌨️" },
  95: { label: "Thunderstorm", day: "⛈️", night: "⛈️" },
  96: { label: "Thunderstorm with hail", day: "⛈️", night: "⛈️" },
  99: { label: "Severe thunderstorm", day: "⛈️", night: "⛈️" },
};

/**
 * Displays error state when weather data cannot be fetched.
 */
function setWeatherFailure() {
  locationEl.textContent = `${WEATHER_LOCATION.city}, ${WEATHER_LOCATION.country}`;
  temperatureEl.textContent = "--°C";
  conditionEl.textContent = "Weather unavailable";
  temperatureRangeEl.textContent = "--° / --°";
  weatherIconEl.textContent = "⚠️";
  weatherIconEl.setAttribute("aria-label", "Weather unavailable");
  forecastRowEl.innerHTML = '<div class="forecast-item forecast-error">Forecast unavailable</div>';
}

/**
 * Returns weather condition label and icon for a given WMO code.
 * @param {number} code - WMO weather code
 * @param {boolean} isDay - Whether it is daytime (true) or nighttime (false)
 * @returns {object} Object with label and icon properties
 */
function getWeatherCondition(code, isDay = true) {
  const condition = WEATHER_CODES[code] || { label: "Unknown", day: "❔", night: "❔" };
  return {
    label: condition.label,
    icon: isDay ? condition.day : condition.night
  };
}

/**
 * Displays an error message in the search error element.
 * @param {string} message - Error message to display
 */
function showSearchError(message) {
  searchErrorEl.textContent = message;
  searchErrorEl.classList.add("visible");
}

/**
 * Clears the search error message and hides the error element.
 */
function clearSearchError() {
  searchErrorEl.textContent = "";
  searchErrorEl.classList.remove("visible");
}

/**
 * Searches for a location using Open-Meteo geocoding API and fetches weather.
 */
async function searchLocation() {
  const query = locationInputEl.value.trim();
  if (!query) return;

  clearSearchError();
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      showSearchError(`Location "${query}" not found`);
      return;
    }

    const result = data.results[0];
    WEATHER_LOCATION = {
      city: result.name,
      country: result.country || "",
      latitude: result.latitude,
      longitude: result.longitude,
    };

    locationInputEl.value = "";
    fetchWeather();
  } catch (error) {
    console.error("Location search failed:", error);
    showSearchError("Failed to search location. Please try again.");
  }
}

/**
 * Renders the 7-day forecast to the DOM.
 * @param {array} days - Array of daily forecast objects with date, code, max, min
 */
function renderForecast(days) {
  forecastRowEl.innerHTML = "";

  days.forEach((day) => {
    const item = document.createElement("div");
    item.className = "forecast-item";

    const dayLabel = document.createElement("div");
    dayLabel.className = "forecast-day";
    const date = new Date(`${day.date}T00:00:00`);
    dayLabel.textContent = date.toLocaleDateString("en-US", { weekday: "short" });

    const icon = document.createElement("div");
    icon.className = "forecast-icon";
    // Use day icons for forecast (full day includes both day and night)
    const condition = getWeatherCondition(day.code, true);
    icon.textContent = condition.icon;
    icon.setAttribute("aria-label", condition.label);

    const temp = document.createElement("div");
    temp.className = "forecast-temp";
    temp.textContent = `${day.max}° / ${day.min}°`;

    item.appendChild(dayLabel);
    item.appendChild(icon);
    item.appendChild(temp);
    forecastRowEl.appendChild(item);
  });
}

/**
 * Fetches weather data from Open-Meteo API for current location.
 * Updates DOM with current weather and forecast, or displays error state.
 */
async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LOCATION.latitude}&longitude=${WEATHER_LOCATION.longitude}&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.current || !data.daily) {
      throw new Error("Open-Meteo response missing weather data");
    }

    const currentData = data.current;
    const dailyData = data.daily;
    const isDay = currentData.is_day; // true = day, false = night
    const weather = getWeatherCondition(currentData.weather_code, isDay);
    const currentTemp = Math.round(currentData.temperature_2m);

    const forecastDays = dailyData.time.map((date, index) => ({
      date,
      code: dailyData.weather_code[index],
      max: Math.round(dailyData.temperature_2m_max[index]),
      min: Math.round(dailyData.temperature_2m_min[index]),
    }));

    locationEl.textContent = `${WEATHER_LOCATION.city}, ${WEATHER_LOCATION.country}`;
    temperatureEl.textContent = `${currentTemp}°C`;
    conditionEl.textContent = weather.label;
    weatherIconEl.textContent = weather.icon;
    weatherIconEl.setAttribute("aria-label", `${weather.label} weather`);

    const firstDay = forecastDays[0];
    if (firstDay) {
      temperatureRangeEl.textContent = `${firstDay.max}° / ${firstDay.min}°`;
    } else {
      temperatureRangeEl.textContent = "--° / --°";
    }

    renderForecast(forecastDays);
  } catch (error) {
    console.error("Weather fetch failed:", error);
    setWeatherFailure();
  }
}

document.getElementById("location-form").addEventListener("submit", (event) => {
  event.preventDefault();
  searchLocation();
});

fetchWeather();
