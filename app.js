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
 * Builds the Open-Meteo forecast API URL for a given latitude and longitude.
 * @param {number} latitude - Geographic latitude
 * @param {number} longitude - Geographic longitude
 * @returns {string} Fully formed forecast API URL
 */
function buildWeatherUrl(latitude, longitude) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
}

/**
 * Builds the Open-Meteo geocoding search API URL for a location name.
 * @param {string} query - Location name or search query
 * @returns {string} Fully formed Geocoding API URL
 */
function buildGeocodingUrl(query) {
  return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a short weekday string (e.g., "Mon").
 * @param {string} dateStr - ISO date string
 * @returns {string} Short localized weekday
 */
function formatWeekday(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "short" });
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
 * Fetches geographic coordinates and normalized location details for a search query.
 * @param {string} query - Location name to search
 * @returns {Promise<object|null>} Location object { city, country, latitude, longitude } or null if not found
 * @throws {Error} If the network request fails
 */
async function fetchCoordinates(query) {
  const url = buildGeocodingUrl(query);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  return {
    city: result.name,
    country: result.country || "",
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

/**
 * Searches for a location and updates the weather display.
 */
async function searchLocation() {
  const query = locationInputEl.value.trim();
  if (!query) return;

  clearSearchError();
  try {
    const location = await fetchCoordinates(query);

    if (!location) {
      showSearchError(`Location "${query}" not found`);
      return;
    }

    WEATHER_LOCATION = location;
    locationInputEl.value = "";
    fetchWeather();
  } catch (error) {
    console.error("Location search failed:", error);
    showSearchError("Failed to search location. Please try again.");
  }
}

/**
 * Validates and transforms the Open-Meteo API response into a structured weather data model.
 * @param {object} data - Raw JSON response from Open-Meteo API
 * @returns {object} Parsed weather object with current, todayRange, and forecast properties
 * @throws {Error} If required data fields are missing or malformed
 */
function parseWeatherData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid weather data: response is empty or not an object");
  }

  if (
    !data.current ||
    typeof data.current.temperature_2m !== "number" ||
    typeof data.current.weather_code !== "number"
  ) {
    throw new Error("Invalid weather data: missing or invalid current weather fields");
  }

  if (
    !data.daily ||
    !Array.isArray(data.daily.time) ||
    !Array.isArray(data.daily.weather_code) ||
    !Array.isArray(data.daily.temperature_2m_max) ||
    !Array.isArray(data.daily.temperature_2m_min)
  ) {
    throw new Error("Invalid weather data: missing or invalid daily forecast arrays");
  }

  const isDay = data.current.is_day === 1 || data.current.is_day === true;
  const condition = getWeatherCondition(data.current.weather_code, isDay);
  const currentTemp = Math.round(data.current.temperature_2m);

  const forecast = data.daily.time.map((date, index) => ({
    date,
    code: data.daily.weather_code[index],
    max: Math.round(data.daily.temperature_2m_max[index]),
    min: Math.round(data.daily.temperature_2m_min[index]),
  }));

  const todayRange = forecast.length > 0
    ? { max: forecast[0].max, min: forecast[0].min }
    : null;

  return {
    current: {
      temperature: currentTemp,
      condition: condition.label,
      icon: condition.icon,
      isDay,
    },
    todayRange,
    forecast,
  };
}

/**
 * Renders the current weather and today's temperature range to the DOM.
 * @param {object} location - Location object with city and country
 * @param {object} weather - Parsed weather data containing current and todayRange
 */
function renderCurrentWeather(location, weather) {
  locationEl.textContent = location.country
    ? `${location.city}, ${location.country}`
    : location.city;
  temperatureEl.textContent = `${weather.current.temperature}°C`;
  conditionEl.textContent = weather.current.condition;
  weatherIconEl.textContent = weather.current.icon;
  weatherIconEl.setAttribute("aria-label", `${weather.current.condition} weather`);

  if (weather.todayRange) {
    temperatureRangeEl.textContent = `${weather.todayRange.max}° / ${weather.todayRange.min}°`;
  } else {
    temperatureRangeEl.textContent = "--° / --°";
  }
}

/**
 * Renders the 7-day forecast to the DOM using template literals.
 * @param {array} days - Array of daily forecast objects with date, code, max, min
 */
function renderForecast(days) {
  if (!days || days.length === 0) {
    forecastRowEl.innerHTML = '<div class="forecast-item forecast-error">Forecast unavailable</div>';
    return;
  }

  forecastRowEl.innerHTML = days
    .map((day) => {
      const condition = getWeatherCondition(day.code, true);
      const dayLabel = formatWeekday(day.date);
      return `
        <div class="forecast-item">
          <div class="forecast-day">${dayLabel}</div>
          <div class="forecast-icon" aria-label="${condition.label}">${condition.icon}</div>
          <div class="forecast-temp">${day.max}° / ${day.min}°</div>
        </div>
      `.trim();
    })
    .join("");
}

/**
 * Fetches weather data from Open-Meteo API for current location.
 * Orchestrates fetching, parsing, and rendering, or displays error state.
 */
async function fetchWeather() {
  const url = buildWeatherUrl(WEATHER_LOCATION.latitude, WEATHER_LOCATION.longitude);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo request failed: ${response.status}`);
    }

    const data = await response.json();
    const weather = parseWeatherData(data);

    renderCurrentWeather(WEATHER_LOCATION, weather);
    renderForecast(weather.forecast);
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
