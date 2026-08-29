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
const weatherEventsEl = document.getElementById("weather-events");
const weatherIconEl = document.getElementById("weather-icon");
const hourlyRowEl = document.getElementById("hourly-row");
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
  weatherEventsEl.innerHTML = "";
  weatherIconEl.textContent = "⚠️";
  weatherIconEl.setAttribute("aria-label", "Weather unavailable");
  hourlyRowEl.innerHTML = '<div class="hourly-item hourly-error">Hourly forecast unavailable</div>';
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
  return `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,weather_code,is_day,precipitation,precipitation_probability,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,precipitation_probability_max,uv_index_max,moon_phase&timezone=auto&forecast_days=7`;
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
 * Formats an ISO date-time string (YYYY-MM-DDTHH:MM) into a 24-hour time string (e.g., "15:00").
 * @param {string} timeStr - ISO date-time string
 * @returns {string} 24-hour formatted time (HH:MM)
 */
function formatHour(timeStr) {
  if (typeof timeStr === "string" && timeStr.includes("T")) {
    return timeStr.split("T")[1].slice(0, 5);
  }
  const date = new Date(timeStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Formats precipitation amount and probability into "x mm (y%)" string if both are above 0.
 * @param {number} precipitation - Precipitation amount in mm
 * @param {number} probability - Precipitation probability percentage (0-100)
 * @returns {string} Formatted precipitation string or empty string
 */
function formatPrecipitation(precipitation, probability) {
  if (
    typeof precipitation !== "number" ||
    typeof probability !== "number" ||
    precipitation <= 0 ||
    probability <= 0
  ) {
    return "";
  }

  let amountStr = "";
  if (precipitation > 1) {
    const rounded = Math.round(precipitation);
    if (rounded <= 0) return "";
    amountStr = `${rounded}mm`;
  } else {
    const rounded = Math.round(precipitation * 10) / 10;
    if (rounded <= 0) return "";
    amountStr = `${rounded.toFixed(1)}mm`;
  }

  let probStr = "";
  if (probability > 10) {
    const rounded = Math.round(probability / 5) * 5;
    if (rounded <= 0) return "";
    probStr = `${rounded}%`;
  } else {
    const rounded = Math.round(probability);
    if (rounded <= 0) return "";
    probStr = `${rounded}%`;
  }

  return `${amountStr}<br>(${probStr})`;
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
 * @returns {object} Parsed weather object with current, todayRange, hourly, hourlyGraph, and forecast properties
 * @throws {Error} If required data fields are missing or malformed
 */
function parseWeatherData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid weather data: response is empty or not an object");
  }

  if (
    !data.current ||
    typeof data.current.temperature_2m !== "number" ||
    typeof data.current.weather_code !== "number" ||
    typeof data.current.apparent_temperature !== "number" ||
    typeof data.current.wind_speed_10m !== "number" ||
    typeof data.current.wind_direction_10m !== "number" ||
    typeof data.current.wind_gusts_10m !== "number"
  ) {
    throw new Error("Invalid weather data: missing or invalid current weather fields");
  }

  if (
    !data.hourly ||
    !Array.isArray(data.hourly.time) ||
    !Array.isArray(data.hourly.weather_code) ||
    !Array.isArray(data.hourly.temperature_2m) ||
    !Array.isArray(data.hourly.is_day) ||
    !Array.isArray(data.hourly.precipitation) ||
    !Array.isArray(data.hourly.precipitation_probability) ||
    !Array.isArray(data.hourly.visibility)
  ) {
    throw new Error("Invalid weather data: missing or invalid hourly forecast arrays");
  }

  if (
    !data.daily ||
    !Array.isArray(data.daily.time) ||
    !Array.isArray(data.daily.weather_code) ||
    !Array.isArray(data.daily.temperature_2m_max) ||
    !Array.isArray(data.daily.temperature_2m_min) ||
    !Array.isArray(data.daily.precipitation_sum) ||
    !Array.isArray(data.daily.precipitation_hours) ||
    !Array.isArray(data.daily.precipitation_probability_max) ||
    !Array.isArray(data.daily.uv_index_max) ||
    !Array.isArray(data.daily.moon_phase)
  ) {
    throw new Error("Invalid weather data: missing or invalid daily forecast arrays");
  }

  const isDay = data.current.is_day === 1 || data.current.is_day === true;
  const condition = getWeatherCondition(data.current.weather_code, isDay);
  const currentTemp = Math.round(data.current.temperature_2m);

  const currentTime = data.current && data.current.time ? data.current.time : "";
  let startIndex = data.hourly.time.findIndex((t) => t >= currentTime.slice(0, 13));
  if (startIndex === -1) {
    startIndex = 0;
  }

  // 1. Extract 24-hour temperature dataset (1-hour resolution) for the SVG line graph
  const hourlyGraph = [];
  const maxGraphHours = 24;
  for (
    let j = 0;
    j < maxGraphHours && (startIndex + j) < data.hourly.time.length;
    j++
  ) {
    const idx = startIndex + j;
    hourlyGraph.push({
      time: data.hourly.time[idx],
      temperature: Math.round(data.hourly.temperature_2m[idx]),
    });
  }

  // 2. Extract 8-item dataset (3-hour intervals) for the hourly forecast columns
  const hourly = [];
  const intervalHours = 3;
  const maxIntervals = 8;
  for (
    let k = 0;
    k < maxIntervals && (startIndex + k * intervalHours) < data.hourly.time.length;
    k++
  ) {
    const idx = startIndex + k * intervalHours;
    const precipHours = [];
    for (let offset = 0; offset < intervalHours; offset++) {
      const hIdx = idx + offset - 1;
      if (hIdx >= 0 && hIdx < data.hourly.time.length) {
        precipHours.push({
          time: data.hourly.time[hIdx],
          precipitation: data.hourly.precipitation[hIdx],
          precipitationProbability: data.hourly.precipitation_probability[hIdx],
        });
      }
    }

    hourly.push({
      time: data.hourly.time[idx],
      code: data.hourly.weather_code[idx],
      temperature: Math.round(data.hourly.temperature_2m[idx]),
      isDay: data.hourly.is_day[idx] === 1 || data.hourly.is_day[idx] === true,
      precipitation: data.hourly.precipitation[idx],
      precipitationProbability: data.hourly.precipitation_probability[idx],
      visibility: data.hourly.visibility[idx],
      precipHours,
    });
  }

  const forecast = data.daily.time.map((date, index) => ({
    date,
    code: data.daily.weather_code[index],
    max: Math.round(data.daily.temperature_2m_max[index]),
    min: Math.round(data.daily.temperature_2m_min[index]),
    precipitation: data.daily.precipitation_sum[index],
    precipitationHours: data.daily.precipitation_hours[index],
    precipitationProbability: data.daily.precipitation_probability_max[index],
  }));

  const todayRange = forecast.length > 0
    ? {
      max: forecast[0].max,
      min: forecast[0].min,
      difference: Math.round(data.daily.temperature_2m_max[0] - data.daily.temperature_2m_min[0]),
      precipitation: data.daily.precipitation_sum[0],
      precipitationHours: data.daily.precipitation_hours[0],
      precipitationProbability: data.daily.precipitation_probability_max[0],
      uvIndex: data.daily.uv_index_max[0],
      moonPhase: data.daily.moon_phase[0],
    }
    : null;

  const currentVisibilityIndex = data.hourly.time.findIndex((time) => time === currentTime);
  const visibilityIndex = currentVisibilityIndex === -1 ? startIndex : currentVisibilityIndex;

  return {
    current: {
      temperature: currentTemp,
      condition: condition.label,
      icon: condition.icon,
      isDay,
      apparentTemperature: data.current.apparent_temperature,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windGusts: data.current.wind_gusts_10m,
      visibility: data.hourly.visibility[visibilityIndex],
    },
    todayRange,
    todayHourly: data.hourly.time
      .map((time, index) => ({
        time,
        precipitation: data.hourly.precipitation[index],
        precipitationProbability: data.hourly.precipitation_probability[index],
      }))
      .filter((hour) => hour.time.startsWith(data.daily.time[0])),
    hourly,
    hourlyGraph,
    forecast,
  };
}

/**
 * Renders the current weather and any notable events to the DOM.
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

  renderWeatherEvents(weather);
}

/**
 * Converts a wind direction in degrees to a compass direction.
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} Eight-point compass direction
 */
function getCompassDirection(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % directions.length];
}

/**
 * Builds notable weather events from parsed weather data.
 * @param {object} weather - Parsed weather data
 * @returns {object[]} Events with icon and text properties
 */
function getWeatherEvents(weather) {
  const events = [];
  const { current, todayRange, todayHourly, forecast } = weather;

  if (todayRange && todayRange.difference >= 15) {
    events.push({ icon: "🌡️", text: `Temperature range of ${todayRange.difference}° today` });
  }

  const heavyRain = todayHourly.some((hour) => hour.precipitation > 5);
  if (heavyRain && todayRange) {
    events.push({
      icon: "🌧️",
      text: `Heavy rain: ${todayRange.precipitation.toFixed(1)} mm, ${todayRange.precipitationHours} hours, ${todayRange.precipitationProbability}% chance`,
    });
  }

  if (todayRange && todayRange.precipitationHours >= 16 && todayRange.precipitation >= 5) {
    events.push({ icon: "🌧️", text: `Rain expected for ${todayRange.precipitationHours} hours today` });
  }

  let rainyDays = 0;
  for (const day of forecast) {
    if (day.precipitation < 5) break;
    rainyDays += 1;
  }
  if (rainyDays >= 3) {
    events.push({ icon: "🌧️", text: `Rain expected for ${rainyDays} consecutive days` });
  }

  if (current.windSpeed >= 40) {
    events.push({
      icon: "💨",
      text: `Strong wind: ${Math.round(current.windSpeed)} km/h ${getCompassDirection(current.windDirection)}`,
    });
  }

  if (current.windGusts >= 60) {
    events.push({ icon: "💨", text: `Storm-like gusts up to ${Math.round(current.windGusts)} km/h` });
  }

  const feelsDifference = Math.round(current.apparentTemperature) - Math.round(current.temperature);
  if (Math.abs(feelsDifference) >= 5) {
    const feelsDirection = feelsDifference > 0 ? "warmer" : "colder";
    events.push({ icon: "🌡️", text: `Feels ${Math.abs(feelsDifference)}° ${feelsDirection} than the actual temperature` });
  }

  if (todayRange && todayRange.uvIndex >= 7) {
    events.push({ icon: "☀️", text: `High UV index: ${todayRange.uvIndex}` });
  }

  if (current.visibility < 1000) {
    const visibilityText = current.visibility < 100
      ? "less than 100 m"
      : `${Math.round(current.visibility / 100) * 100} m`;
    events.push({ icon: "🌫️", text: `Low visibility: ${visibilityText}` });
  }

  if (todayRange && Math.abs(todayRange.moonPhase - 0.5) <= 0.03) {
    events.push({ icon: "🌕", text: "Full moon tonight" });
  }

  return events;
}

/**
 * Renders notable weather events for the current forecast.
 * @param {object} weather - Parsed weather data
 */
function renderWeatherEvents(weather) {
  weatherEventsEl.replaceChildren();
  for (const event of getWeatherEvents(weather)) {
    const row = document.createElement("div");
    row.className = "weather-event";

    const icon = document.createElement("span");
    icon.className = "weather-event-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = event.icon;

    const text = document.createElement("span");
    text.textContent = event.text;

    row.append(icon, text);
    weatherEventsEl.append(row);
  }
}

/**
 * Generates an SVG polyline string representing the temperature curve across the hourly columns.
 * @param {array} graphData - Array of 1-hour temperature data points
 * @param {number} numCols - Number of columns (default: 8)
 * @param {number} colWidth - Width of each column in pixels (default: 58)
 * @param {number} graphHeight - Height of SVG canvas in pixels (default: 48)
 * @param {number} pad - Vertical padding in pixels (default: 6)
 * @returns {string} SVG HTML string
 */
function generateHourlySvg(graphData, numCols = 8, colWidth = 58, graphHeight = 48, pad = 6) {
  if (!graphData || graphData.length === 0) {
    return "";
  }

  const totalWidth = numCols * colWidth;
  // Span the graph from the center of column 0 to the center of column (numCols - 1)
  const maxSpanHours = (numCols - 1) * 3; // 21 hours for 8 columns (hours 0 to 21)
  const pointsData = graphData.slice(0, maxSpanHours + 1);

  const temps = pointsData.map((d) => d.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempDelta = maxTemp - minTemp;

  const startX = colWidth / 2;
  const hourStepX = colWidth / 3;

  const points = pointsData.map((d, index) => {
    const x = startX + index * hourStepX;
    let y = graphHeight / 2;
    if (tempDelta > 0) {
      y = pad + ((maxTemp - d.temperature) / tempDelta) * (graphHeight - 2 * pad);
    }
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pointsString = points.join(" ");

  return `
    <svg class="hourly-graph" viewBox="0 0 ${totalWidth} ${graphHeight}" width="${totalWidth}" height="${graphHeight}" aria-hidden="true">
      <polyline class="hourly-graph-line" points="${pointsString}" />
    </svg>
  `.trim();
}

/**
 * Renders an HTML precipitation bar container with 3 hourly bars for a timeslot.
 * @param {array} precipHours - Array of up to 3 1-hour precipitation objects
 * @returns {string} HTML string for the bar container
 */
function renderHourlyPrecipBars(precipHours) {
  if (!Array.isArray(precipHours) || precipHours.length === 0) {
    return '';
  }

  const numBars = precipHours
    .reduce((count, hour) => {
      const precipitation = hour.precipitation;
      const probability = hour.precipitationProbability;

      if (
        typeof precipitation !== "number" ||
        typeof probability !== "number" ||
        precipitation <= 0 ||
        probability <= 0
      ) {
        return count;
      }
      else {
        return count + 1;
      }
    }, 0);

  if (numBars === 0) {
    return '';
  }

  const maxScale = 15.0; // maxScale mm or above reaches 100% height

  const barsHtml = precipHours
    .map((hour) => {
      const precipitation = hour.precipitation;
      const probability = hour.precipitationProbability;

      if (
        typeof precipitation !== "number" ||
        typeof probability !== "number" ||
        precipitation <= 0 ||
        probability <= 0
      ) {
        return '<div class="hourly-precip-bar empty" style="height: 0%;" aria-hidden="true"></div>';
      }

      // Scale height: 0 to maxScale mm maps to 2% - 100% of container height (28px)
      const p = Math.min(Math.max(0.0, precipitation / maxScale), 1.0);
      const heightPercent = Math.min(100, 2 + 75 * Math.log10(1.0 + 20.0 * p));

      // Opacity: map probability (25-75) to 0.125 - 0.875
      const opacity = Math.min(Math.max(0.125, 3.0 * probability / 200 - 0.25), 0.875);

      // Intensity class
      let intensity = "light";
      if (precipitation >= 7.5) {
        intensity = "heavy";
      } else if (precipitation >= 2.5) {
        intensity = "moderate";
      }

      const timeLabel = formatHour(hour.time);
      const title = `${timeLabel}: ${precipitation}mm (${probability}%)`;

      return `<div class="hourly-precip-bar ${intensity}" style="height: ${heightPercent}%; opacity: ${opacity};" title="${title}"></div>`;
    })
    .join("");

  return `
    <div class="hourly-bar-container">
      ${barsHtml}
    </div>
  `.trim();
}

/**
 * Renders the hourly timeline forecast with 8 columns and a 1-hour resolution temperature graph.
 * @param {array} hours - Array of 8 hourly forecast objects with time, code, temperature, isDay
 * @param {array} hourlyGraph - Array of 1-hour resolution temperature data points
 */
function renderHourlyForecast(hours, hourlyGraph) {
  if (!hours || hours.length === 0) {
    hourlyRowEl.innerHTML = '<div class="hourly-item hourly-error">Hourly forecast unavailable</div>';
    return;
  }

  const columnsHtml = hours
    .map((hour) => {
      const condition = getWeatherCondition(hour.code, hour.isDay);
      const timeLabel = formatHour(hour.time);
      const precipBars = renderHourlyPrecipBars(hour.precipHours);
      const precipText = formatPrecipitation(hour.precipitation, hour.precipitationProbability);
      return `
        <div class="hourly-item">
          <div class="hourly-time">${timeLabel}</div>
          <div class="hourly-icon" aria-label="${condition.label}">${condition.icon}</div>
          <div class="hourly-graph-spacer"></div>
          <div class="hourly-temp">${hour.temperature}°</div>
          ${precipBars}
          <div class="hourly-precip">${precipText}</div>
        </div>
      `.trim();
    })
    .join("");

  const svgHtml = generateHourlySvg(hourlyGraph, hours.length);

  hourlyRowEl.innerHTML = columnsHtml + svgHtml;
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
    .map((day, index) => {
      const condition = getWeatherCondition(day.code, true);
      const dayLabel = index === 0 ? "Today" : formatWeekday(day.date);
      const precipText = formatPrecipitation(day.precipitation, day.precipitationProbability);
      return `
        <div class="forecast-item">
          <div class="forecast-day">${dayLabel}</div>
          <div class="forecast-icon" aria-label="${condition.label}">${condition.icon}</div>
          <div class="forecast-precip">${precipText}</div>
          <div class="forecast-temp">
            <span class="forecast-temp-max">${day.max}°</span>
            <span class="forecast-temp-min">${day.min}°</span>
          </div>
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
    renderHourlyForecast(weather.hourly, weather.hourlyGraph);
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
