// Theme is automatically applied via CSS @media (prefers-color-scheme: dark)

/**
 * Current location data
 * @property {string} city - City name from geocoding API
 * @property {string} country - Country name from geocoding API
 * @property {number} latitude - Geographic latitude for Open-Meteo API
 * @property {number} longitude - Geographic longitude for Open-Meteo API
 */
const DEFAULT_LOCATION = {
  city: "Venlo",
  country: "Netherlands",
  latitude: 51.37,
  longitude: 6.17,
  isGps: false,
};

let WEATHER_LOCATION = { ...DEFAULT_LOCATION };
let LAST_GPS_LOCATION = null;

const locationEl = document.getElementById("location");
const locationBtnEl = document.getElementById("location-btn");
const locationFormEl = document.getElementById("location-form");
const favoriteToggleBtnEl = document.getElementById("favorite-toggle");
const favoritesMenuEl = document.getElementById("favorites-menu");
const favoritesListEl = document.getElementById("favorites-list");
const currentLocationBtnEl = document.getElementById("current-location-btn");
const currentLocationLabelEl = document.getElementById("current-location-label");
const temperatureEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const weatherEventsEl = document.getElementById("weather-events");
const weatherIconEl = document.getElementById("weather-icon");
const hourlyRowEl = document.getElementById("hourly-row");
const forecastRowEl = document.getElementById("forecast-row");
const locationInputEl = document.getElementById("location-input");
const searchButtonEl = document.getElementById("search-button");
const searchErrorEl = document.getElementById("search-error");
const modelPickerBtnEl = document.getElementById("model-picker-btn");
const modelPickerValueEl = document.getElementById("model-picker-value");
const modelPickerMenuEl = document.getElementById("model-picker-menu");
const modelOptionEls = Array.from(document.querySelectorAll(".model-option"));

const FAVORITES_STORAGE_KEY = "weather_favorites";
const MODEL_FUSION_ID = "fusion";
const WEATHER_MODEL_IDS = [
  "knmi_seamless",
  "dwd_icon_seamless",
  "meteofrance_seamless",
  "ukmo_seamless",
  "ncep_gfs_seamless",
];
const ALL_MODEL_CHOICES = [
  MODEL_FUSION_ID,
  ...WEATHER_MODEL_IDS,
];
const MODEL_LABELS = {
  fusion: "Model Fusion",
  knmi_seamless: "KNMI",
  dwd_icon_seamless: "DWD",
  meteofrance_seamless: "Météo France",
  ukmo_seamless: "UKMO",
  ncep_gfs_seamless: "NCEP",
};
const WEATHER_MODEL_CACHE = new Map();
const WEATHER_MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
let ACTIVE_MODEL_ID = MODEL_FUSION_ID;

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
  updateFavoriteButton();
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
function buildWeatherUrl(latitude, longitude, modelId = ACTIVE_MODEL_ID) {
  const safeModelId = WEATHER_MODEL_IDS.includes(modelId) ? modelId : ACTIVE_MODEL_ID;
  return `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,weather_code,is_day,precipitation,precipitation_probability,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,precipitation_probability_max,uv_index_max,moon_phase&timezone=auto&past_days=1&forecast_days=16&models=${encodeURIComponent(safeModelId)}`;
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
 * Rounds a numeric value while preserving missing or invalid values.
 * @param {number} value
 * @returns {number|null}
 */
function roundFinite(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
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
    typeof probability !== "number"
  ) {
    return "";
  }

  let amountStr = "";
  if (precipitation > 2.5) {
    const rounded = Math.round(precipitation);
    amountStr = `${rounded}mm`;
  } else {
    const rounded = Math.round(precipitation * 10) / 10;
    if (rounded <= 0) return "";
    amountStr = `${rounded.toFixed(1)}mm`;
  }

  let probStr = "";
  if (probability > 10) {
    const rounded = Math.round(probability / 5) * 5;
    probStr = `${rounded}%`;
  } else {
    const rounded = Math.round(probability);
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
 * Wraps browser navigator.geolocation in a Promise.
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
function getGpsCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
}

/**
 * Formats coordinates into readable shorthand (e.g., "N51.37, E6.17").
 * @param {number} latitude - Geographic latitude
 * @param {number} longitude - Geographic longitude
 * @param {number} decimals - Number of decimal digits (default 2)
 * @returns {string} Formatted coordinate string
 */
function formatCoordinates(latitude, longitude, decimals = 2) {
  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  return `${latDir}${Math.abs(latitude).toFixed(decimals)}, ${lonDir}${Math.abs(longitude).toFixed(decimals)}`;
}

/**
 * Extracts a representative place name from a Nominatim address object.
 * @param {object} address - Address object from Nominatim
 * @returns {string|null} City, town, village, or administrative name
 */
function getPlaceName(address) {
  if (!address || typeof address !== "object") return null;
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    null
  );
}

/**
 * Builds the Nominatim reverse geocoding API URL.
 * @param {number} latitude - Geographic latitude
 * @param {number} longitude - Geographic longitude
 * @returns {string} URL string
 */
function buildReverseGeocodingUrl(latitude, longitude) {
  return `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
}

/**
 * Performs reverse geocoding to retrieve place name for coordinates, falling back to formatted coordinates on error.
 * @param {number} latitude - Geographic latitude
 * @param {number} longitude - Geographic longitude
 * @returns {Promise<{city: string, country: string}>}
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const url = buildReverseGeocodingUrl(latitude, longitude);
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding request failed: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.address) {
      const place = getPlaceName(data.address);
      const country = data.address.country || "";
      if (place) {
        return { city: place, country };
      }
    }
  } catch (error) {
    console.warn("Reverse geocoding unavailable; falling back to coordinates:", error);
  }

  return {
    city: formatCoordinates(latitude, longitude),
    country: "",
  };
}

/**
 * Fetches the user's current GPS position and performs reverse geocoding.
 * @returns {Promise<object>} Location object { city, country, latitude, longitude, isGps: true }
 */
async function fetchGpsLocation() {
  const coords = await getGpsCoordinates();
  const place = await reverseGeocode(coords.latitude, coords.longitude);
  const location = {
    city: place.city,
    country: place.country || "",
    latitude: coords.latitude,
    longitude: coords.longitude,
    isGps: true,
  };
  LAST_GPS_LOCATION = location;
  return location;
}

/**
 * Switches the active forecast to the physical GPS location.
 */
async function selectGpsLocation() {
  closeFavoritesMenu();
  setModelLoading(true);
  if (currentLocationLabelEl) {
    currentLocationLabelEl.textContent = "Detecting location...";
  }

  try {
    const location = await fetchGpsLocation();
    WEATHER_LOCATION = location;
    if (currentLocationLabelEl) {
      currentLocationLabelEl.textContent = "Current Location";
    }
    updateFavoriteButton();
    await fetchWeather();
  } catch (error) {
    console.error("GPS location detection failed:", error);
    if (currentLocationLabelEl) {
      currentLocationLabelEl.textContent = "Current Location";
    }
    showSearchError("Could not access physical GPS location.");
  } finally {
    setModelLoading(false);
  }
}

/**
 * Initializes the application location on startup (attempts GPS, falls back to default).
 */
async function initAppLocation() {
  setModelLoading(true);
  try {
    const gpsLoc = await fetchGpsLocation();
    WEATHER_LOCATION = gpsLoc;
  } catch (error) {
    console.warn("Initial GPS detection failed or was denied; using default location:", error);
    WEATHER_LOCATION = { ...DEFAULT_LOCATION };
  }
  try {
    updateFavoriteButton();
    await fetchWeather();
  } finally {
    setModelLoading(false);
  }
}

/**
 * Loads favorites array from localStorage.
 * @returns {Array<object>} Array of saved location objects
 */
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load favorites from localStorage:", error);
    return [];
  }
}

/**
 * Saves favorites array to localStorage.
 * @param {Array<object>} favorites - Array of location objects
 */
function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Failed to save favorites to localStorage:", error);
  }
}

/**
 * Checks if two location objects refer to the same location.
 * @param {object} locA - First location
 * @param {object} locB - Second location
 * @returns {boolean} True if matching
 */
function isSameLocation(locA, locB) {
  if (!locA || !locB) return false;
  if (
    typeof locA.latitude === "number" &&
    typeof locB.latitude === "number" &&
    typeof locA.longitude === "number" &&
    typeof locB.longitude === "number"
  ) {
    const latDiff = Math.abs(locA.latitude - locB.latitude);
    const lonDiff = Math.abs(locA.longitude - locB.longitude);
    if (latDiff < 0.05 && lonDiff < 0.05) return true;
  }
  return (
    String(locA.city).toLowerCase() === String(locB.city).toLowerCase() &&
    String(locA.country || "").toLowerCase() === String(locB.country || "").toLowerCase()
  );
}

/**
 * Checks if a location is in the favorites list.
 * @param {object} location - Location to check (defaults to WEATHER_LOCATION)
 * @returns {boolean}
 */
function isFavorite(location = WEATHER_LOCATION) {
  const favorites = loadFavorites();
  return favorites.some((fav) => isSameLocation(fav, location));
}

/**
 * Adds a location to favorites if not already present.
 * @param {object} location - Location to add (defaults to WEATHER_LOCATION)
 */
function addFavorite(location = WEATHER_LOCATION) {
  const favorites = loadFavorites();
  if (!favorites.some((fav) => isSameLocation(fav, location))) {
    favorites.push({
      city: location.city,
      country: location.country || "",
      latitude: location.latitude,
      longitude: location.longitude,
    });
    saveFavorites(favorites);
  }
  updateFavoriteButton();
  renderFavoritesMenu();
}

/**
 * Removes a location from favorites.
 * @param {object} location - Location to remove (defaults to WEATHER_LOCATION)
 */
function removeFavorite(location = WEATHER_LOCATION) {
  let favorites = loadFavorites();
  favorites = favorites.filter((fav) => !isSameLocation(fav, location));
  saveFavorites(favorites);
  updateFavoriteButton();
  renderFavoritesMenu();
}

/**
 * Toggles the favorite status of the current WEATHER_LOCATION.
 */
function toggleFavorite() {
  if (isFavorite(WEATHER_LOCATION)) {
    removeFavorite(WEATHER_LOCATION);
  } else {
    addFavorite(WEATHER_LOCATION);
  }
}

/**
 * Updates the star button icon and aria-pressed state based on current location.
 */
function updateFavoriteButton() {
  if (!favoriteToggleBtnEl) return;
  const isFav = isFavorite(WEATHER_LOCATION);
  const favoriteIconEl = favoriteToggleBtnEl.querySelector(".location-menu-action-icon");
  if (favoriteIconEl) {
    favoriteIconEl.textContent = isFav ? "★" : "☆";
  } else {
    favoriteToggleBtnEl.textContent = isFav ? "★" : "☆";
  }
  const favoriteLabelEl = favoriteToggleBtnEl.querySelector(".location-menu-action-label");
  if (favoriteLabelEl) {
    favoriteLabelEl.textContent = isFav ? "Remove from favorites" : "Add to favorites";
  }
  favoriteToggleBtnEl.setAttribute("aria-pressed", isFav ? "true" : "false");
  favoriteToggleBtnEl.setAttribute("aria-label", isFav ? "Remove from favorites" : "Add to favorites");
  favoriteToggleBtnEl.classList.toggle("is-favorite", isFav);
}

/**
 * Opens the favorites dropdown menu.
 */
function openFavoritesMenu() {
  if (favoritesMenuEl && locationBtnEl) {
    renderFavoritesMenu();
    favoritesMenuEl.classList.remove("hidden");
    locationBtnEl.setAttribute("aria-expanded", "true");
  }
}

/**
 * Closes the favorites dropdown menu.
 */
function closeFavoritesMenu() {
  if (favoritesMenuEl && locationBtnEl) {
    closeSearch();
    favoritesMenuEl.classList.add("hidden");
    locationBtnEl.setAttribute("aria-expanded", "false");
  }
}

/**
 * Toggles the favorites dropdown menu.
 */
function toggleFavoritesMenu() {
  if (favoritesMenuEl && !favoritesMenuEl.classList.contains("hidden")) {
    closeFavoritesMenu();
  } else {
    openFavoritesMenu();
  }
}

/**
 * Selects a favorite location and loads its weather.
 * @param {object} fav - Saved favorite location object
 */
function selectFavoriteLocation(fav) {
  WEATHER_LOCATION = {
    city: fav.city,
    country: fav.country || "",
    latitude: fav.latitude,
    longitude: fav.longitude,
    isGps: false,
  };
  closeFavoritesMenu();
  updateFavoriteButton();
  setModelLoading(true);
  fetchWeather().finally(() => {
    setModelLoading(false);
  });
}

/**
 * Renders the saved favorites list in the dropdown menu.
 */
function renderFavoritesMenu() {
  if (currentLocationBtnEl) {
    const isGpsActive = !!WEATHER_LOCATION.isGps;
    currentLocationBtnEl.classList.toggle("is-active", isGpsActive);
  }

  if (!favoritesListEl) return;
  const favorites = loadFavorites();
  if (favorites.length === 0) {
    favoritesListEl.innerHTML = '<div class="favorites-empty">No favorite locations saved.<br>Click the star ★ to save this city.</div>';
    return;
  }

  favoritesListEl.replaceChildren();
  favorites.forEach((fav) => {
    const isCurrent = !WEATHER_LOCATION.isGps && isSameLocation(fav, WEATHER_LOCATION);
    const itemEl = document.createElement("div");
    itemEl.className = `favorite-item${isCurrent ? " is-active" : ""}`;

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "favorite-item-btn";
    nameBtn.textContent = fav.country ? `${fav.city}, ${fav.country}` : fav.city;
    nameBtn.setAttribute("aria-label", `Select ${fav.city}`);
    nameBtn.addEventListener("click", () => {
      selectFavoriteLocation(fav);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "favorite-item-remove";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${fav.city} from favorites`);
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFavorite(fav);
    });

    itemEl.append(nameBtn, removeBtn);
    favoritesListEl.append(itemEl);
  });
}

/**
 */
function closeSearch() {
  clearSearchError();
}

/**
 * Searches for a location and updates the weather display.
 */
async function searchLocation() {
  const query = locationInputEl.value.trim();
  if (!query) return;

  clearSearchError();
  setModelLoading(true);
  try {
    const location = await fetchCoordinates(query);

    if (!location) {
      showSearchError(`Location "${query}" not found`);
      return;
    }

    WEATHER_LOCATION = {
      ...location,
      isGps: false,
    };
    locationInputEl.value = "";
    closeSearch();
    closeFavoritesMenu();
    await fetchWeather();
  } catch (error) {
    console.error("Location search failed:", error);
    showSearchError("Failed to search location. Please try again.");
  } finally {
    setModelLoading(false);
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
  let currentHourIndex = data.hourly.time.findIndex((t) => t >= currentTime.slice(0, 13));
  if (currentHourIndex === -1) {
    currentHourIndex = 0;
  }

  // Hourly timeline: 1 past slot (-3h) + 17 slots (0h to 48h at 3h intervals)
  // Last printed hour (+48h) equals the first future hour (0h).
  const hourly = [];
  const intervalHours = 3;
  const pastOffsetHours = 3;
  const futureHoursSpan = 48; // 0 to 48h (17 slots)

  // 1. Past column (-3 hours)
  const pastIdx = currentHourIndex - pastOffsetHours;
  if (pastIdx >= 0 && pastIdx < data.hourly.time.length) {
    const precipHours = [];
    for (let offset = 0; offset < intervalHours; offset++) {
      const hIdx = pastIdx + offset - 1;
      if (hIdx >= 0 && hIdx < data.hourly.time.length) {
        precipHours.push({
          time: data.hourly.time[hIdx],
          precipitation: data.hourly.precipitation[hIdx],
          precipitationProbability: data.hourly.precipitation_probability[hIdx],
        });
      }
    }
    hourly.push({
      time: data.hourly.time[pastIdx],
      code: data.hourly.weather_code[pastIdx],
      temperature: Math.round(data.hourly.temperature_2m[pastIdx]),
      isDay: data.hourly.is_day[pastIdx] === 1 || data.hourly.is_day[pastIdx] === true,
      precipitation: data.hourly.precipitation[pastIdx],
      precipitationProbability: data.hourly.precipitation_probability[pastIdx],
      visibility: data.hourly.visibility[pastIdx],
      precipHours,
      isCurrent: false,
    });
  }

  // 2. Future columns (0h, 3h, ..., 48h)
  const numFutureSlots = Math.floor(futureHoursSpan / intervalHours) + 1; // 17 slots
  for (let k = 0; k < numFutureSlots; k++) {
    const idx = currentHourIndex + k * intervalHours;
    if (idx >= data.hourly.time.length) break;

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
      isCurrent: k === 0,
    });
  }

  // 3. Extract 1-hour resolution temperature dataset for the SVG line graph
  // Spanning from the first column's hour to the last column's hour
  const hourlyGraph = [];
  const graphStartIdx = Math.max(0, currentHourIndex - (pastIdx >= 0 ? pastOffsetHours : 0));
  const graphEndIdx = Math.min(data.hourly.time.length - 1, currentHourIndex + futureHoursSpan);
  for (let idx = graphStartIdx; idx <= graphEndIdx; idx++) {
    hourlyGraph.push({
      time: data.hourly.time[idx],
      temperature: Math.round(data.hourly.temperature_2m[idx]),
    });
  }

  // Find today's index in daily arrays (typically index 1 when past_days=1)
  const todayDateStr = currentTime ? currentTime.slice(0, 10) : "";
  let todayIndex = data.daily.time.findIndex((d) => d === todayDateStr);
  if (todayIndex === -1) {
    todayIndex = data.daily.time.length > 1 ? 1 : 0;
  }

  // Daily forecast: Yesterday (-1 day), Today (0), and up to 14 days ahead (total 16 days)
  // Last weekday equals Today's weekday (+14 days)
  const maxDailyDays = 16;
  const forecast = data.daily.time.slice(0, maxDailyDays).map((date, index) => ({
    date,
    code: data.daily.weather_code[index],
    max: roundFinite(data.daily.temperature_2m_max[index]),
    min: roundFinite(data.daily.temperature_2m_min[index]),
    precipitation: data.daily.precipitation_sum[index],
    precipitationHours: data.daily.precipitation_hours[index],
    precipitationProbability: data.daily.precipitation_probability_max[index],
    isYesterday: index < todayIndex,
    isToday: index === todayIndex,
  }));

  const todayRange = data.daily.time.length > todayIndex && todayIndex >= 0
    ? {
      max: roundFinite(data.daily.temperature_2m_max[todayIndex]),
      min: roundFinite(data.daily.temperature_2m_min[todayIndex]),
      difference: Number.isFinite(data.daily.temperature_2m_max[todayIndex]) && Number.isFinite(data.daily.temperature_2m_min[todayIndex])
        ? Math.round(data.daily.temperature_2m_max[todayIndex] - data.daily.temperature_2m_min[todayIndex])
        : null,
      precipitation: data.daily.precipitation_sum[todayIndex],
      precipitationHours: data.daily.precipitation_hours[todayIndex],
      precipitationProbability: data.daily.precipitation_probability_max[todayIndex],
      uvIndex: data.daily.uv_index_max[todayIndex],
      moonPhase: data.daily.moon_phase[todayIndex],
    }
    : null;

  const currentVisibilityIndex = data.hourly.time.findIndex((time) => time === currentTime);
  const visibilityIndex = currentVisibilityIndex === -1 ? currentHourIndex : currentVisibilityIndex;

  return {
    current: {
      temperature: currentTemp,
      code: data.current.weather_code,
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
      .filter((hour) => hour.time.startsWith(data.daily.time[todayIndex])),
    hourly,
    hourlyGraph,
    forecast,
  };
}

/**
 * Calculates mathematical mean of a numeric array.
 * @param {number[]} values
 * @returns {number}
 */
function calculateMean(values) {
  if (!Array.isArray(values)) return 0;
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return 0;
  const sum = finiteValues.reduce((acc, value) => acc + value, 0);
  return sum / finiteValues.length;
}

/**
 * Calculates the consensus (mode / severity weighted) weather code from multiple models.
 * @param {number[]} codes
 * @returns {number}
 */
function getConsensusWeatherCode(codes) {
  if (!Array.isArray(codes) || codes.length === 0) return 0;
  const counts = new Map();
  for (const code of codes) {
    if (typeof code === "number") {
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }
  let bestCode = codes[0];
  let maxCount = -1;
  for (const [code, count] of counts.entries()) {
    if (count > maxCount || (count === maxCount && code > bestCode)) {
      maxCount = count;
      bestCode = code;
    }
  }
  return bestCode;
}

/**
 * Computes multi-model agreement score (0.25 to 1.0) for precipitation forecast.
 * @param {number[]} probabilities - Array of model probabilities (0-100)
 * @param {number[]} amounts - Array of model precipitation amounts (mm)
 * @returns {number} Value between 0.25 and 1.0
 */
function calculatePrecipAgreement(probabilities, amounts) {
  if (!Array.isArray(probabilities) || probabilities.length === 0) return 1.0;
  const total = probabilities.length;
  const rainCount = probabilities.filter((prob, idx) => {
    const amt = amounts[idx];
    return (typeof amt === "number" && amt >= 0.1) || (typeof prob === "number" && prob >= 20);
  }).length;

  const rainRatio = rainCount / total;
  const consensusRatio = rainRatio >= 0.5 ? rainRatio : 1 - rainRatio;
  return Math.min(1.0, Math.max(0.25, consensusRatio));
}

/**
 * Fuses weather forecast data from multiple models into an ensemble data model.
 * @param {Object.<string, object>} modelWeatherMap - Map of modelId -> parsed weather data
 * @returns {object|null} Fused weather object matching parseWeatherData structure with ensemble statistics
 */
function computeFusedWeatherData(modelWeatherMap) {
  if (!modelWeatherMap || typeof modelWeatherMap !== "object") return null;
  const validModels = Object.values(modelWeatherMap).filter(
    (m) => m && typeof m === "object" && m.current && Array.isArray(m.hourly) && Array.isArray(m.forecast)
  );
  if (validModels.length === 0) return null;
  if (validModels.length === 1) return validModels[0];

  const primary = validModels[0];

  // 1. Current Weather Fusion
  const currentTemps = validModels.map((m) => m.current.temperature).filter((t) => typeof t === "number");
  const currentApparent = validModels.map((m) => m.current.apparentTemperature).filter((t) => typeof t === "number");
  const currentWinds = validModels.map((m) => m.current.windSpeed).filter((w) => typeof w === "number");
  const currentGusts = validModels.map((m) => m.current.windGusts).filter((g) => typeof g === "number");
  const currentDirections = validModels.map((m) => m.current.windDirection).filter((d) => typeof d === "number");
  const currentVisibilities = validModels.map((m) => m.current.visibility).filter((v) => typeof v === "number");
  const currentCodes = validModels.map((m) => m.current.code).filter((cd) => typeof cd === "number");

  const isDay = primary.current.isDay;
  const consensusCurrentCode = getConsensusWeatherCode(currentCodes.length > 0 ? currentCodes : [0]);
  const condition = getWeatherCondition(consensusCurrentCode, isDay);

  const fusedCurrent = {
    temperature: Math.round(calculateMean(currentTemps)),
    minTemp: Math.min(...currentTemps),
    maxTemp: Math.max(...currentTemps),
    code: consensusCurrentCode,
    condition: condition.label,
    icon: condition.icon,
    isDay,
    apparentTemperature: calculateMean(currentApparent),
    windSpeed: calculateMean(currentWinds),
    windDirection: calculateMean(currentDirections),
    windGusts: calculateMean(currentGusts),
    visibility: calculateMean(currentVisibilities),
  };

  // 2. Hourly Timeline Columns Fusion
  const numHourlyCols = primary.hourly.length;
  const fusedHourly = [];

  for (let c = 0; c < numHourlyCols; c++) {
    const colTime = primary.hourly[c].time;
    const isCurrent = primary.hourly[c].isCurrent;
    const colIsDay = primary.hourly[c].isDay;

    const colTemps = validModels.map((m) => m.hourly[c]?.temperature).filter((t) => typeof t === "number");
    const colCodes = validModels.map((m) => m.hourly[c]?.code).filter((cd) => typeof cd === "number");
    const colVis = validModels.map((m) => m.hourly[c]?.visibility).filter((v) => typeof v === "number");
    const colPrecips = validModels.map((m) => m.hourly[c]?.precipitation).filter((p) => typeof p === "number");
    const colProbs = validModels.map((m) => m.hourly[c]?.precipitationProbability).filter((pr) => typeof pr === "number");

    // Sub-hour precipitation breakdown (up to 3 hours per timeslot)
    const numSubHours = primary.hourly[c].precipHours ? primary.hourly[c].precipHours.length : 0;
    const fusedPrecipHours = [];

    for (let s = 0; s < numSubHours; s++) {
      const subTime = primary.hourly[c].precipHours[s].time;
      const validModelsForSlot = validModels.map((m) => {
        const precip = m.hourly[c]?.precipHours?.[s]?.precipitation;
        const prob = m.hourly[c]?.precipHours?.[s]?.precipitationProbability;
        return {
          precipitation: typeof precip === "number" ? precip : 0,
          probability: typeof prob === "number" ? prob : 0,
        };
      });

      const maxSubProb = validModelsForSlot.length > 0
        ? Math.max(...validModelsForSlot.map((m) => m.probability))
        : 0;

      // Group models within 5% of max probability (cluster near-peak probability)
      const nearMaxProbModels = validModelsForSlot.filter(
        (m) => m.probability >= maxSubProb - 5
      );
      const probAmount = calculateMean(nearMaxProbModels.map((m) => m.precipitation));

      // Remaining models that were NOT used in calculating the near-max probability amount
      const remainingModels = validModelsForSlot.filter(
        (m) => m.probability < maxSubProb - 5
      );

      let peakAmount = 0;
      let peakProb = maxSubProb;

      if (remainingModels.length > 0) {
        peakAmount = Math.max(...remainingModels.map((m) => m.precipitation));
        const peakModel = remainingModels.find((m) => m.precipitation === peakAmount);
        if (peakModel) {
          peakProb = peakModel.probability;
        }
      }

      // Determine if remaining peak risk is notable (subdued if close to probable amount)
      const amountDiff = peakAmount - probAmount;
      const hasNotablePeak =
        remainingModels.length > 0 &&
        amountDiff >= 0.5 &&
        peakAmount >= 1.3 * probAmount &&
        peakAmount >= 0.3;

      fusedPrecipHours.push({
        time: subTime,
        precipitation: probAmount,
        probability: maxSubProb,
        peakPrecipitation: peakAmount,
        peakProbability: peakProb,
        hasNotablePeak,
      });
    }

    fusedHourly.push({
      time: colTime,
      code: getConsensusWeatherCode(colCodes),
      temperature: Math.round(calculateMean(colTemps)),
      minTemp: Math.min(...colTemps),
      maxTemp: Math.max(...colTemps),
      isDay: colIsDay,
      precipitation: calculateMean(colPrecips),
      precipitationProbability: Math.round(calculateMean(colProbs)),
      visibility: calculateMean(colVis),
      precipHours: fusedPrecipHours,
      isCurrent,
    });
  }

  // 3. Hourly Temperature Graph Fusion (1-hour resolution)
  const numGraphPoints = primary.hourlyGraph ? primary.hourlyGraph.length : 0;
  const fusedHourlyGraph = [];

  for (let p = 0; p < numGraphPoints; p++) {
    const ptTime = primary.hourlyGraph[p].time;
    const ptTemps = validModels.map((m) => m.hourlyGraph?.[p]?.temperature).filter((t) => typeof t === "number");
    const avgTemp = Math.round(calculateMean(ptTemps));
    const minTemp = ptTemps.length > 0 ? Math.min(...ptTemps) : avgTemp;
    const maxTemp = ptTemps.length > 0 ? Math.max(...ptTemps) : avgTemp;

    fusedHourlyGraph.push({
      time: ptTime,
      temperature: avgTemp,
      minTemp,
      maxTemp,
      tempDelta: maxTemp - minTemp,
    });
  }

  // 4. Daily Forecast Fusion
  const numDays = primary.forecast.length;
  const fusedForecast = [];

  for (let d = 0; d < numDays; d++) {
    const dayDate = primary.forecast[d].date;
    const isYesterday = primary.forecast[d].isYesterday;
    const isToday = primary.forecast[d].isToday;

    const dayCodes = validModels.map((m) => m.forecast[d]?.code).filter((code) => Number.isFinite(code));
    const dayMaxes = validModels.map((m) => m.forecast[d]?.max).filter((temperature) => Number.isFinite(temperature));
    const dayMins = validModels.map((m) => m.forecast[d]?.min).filter((temperature) => Number.isFinite(temperature));
    const dayPrecips = validModels.map((m) => m.forecast[d]?.precipitation).filter((precipitation) => Number.isFinite(precipitation));
    const dayPrecipHours = validModels.map((m) => m.forecast[d]?.precipitationHours).filter((hours) => Number.isFinite(hours));
    const dayProbs = validModels.map((m) => m.forecast[d]?.precipitationProbability).filter((probability) => Number.isFinite(probability));

    const avgMax = Math.round(calculateMean(dayMaxes));
    const avgMin = Math.round(calculateMean(dayMins));

    fusedForecast.push({
      date: dayDate,
      code: getConsensusWeatherCode(dayCodes),
      max: avgMax,
      min: avgMin,
      minBound: dayMins.length > 0 ? Math.min(...dayMins) : avgMin,
      maxBound: dayMaxes.length > 0 ? Math.max(...dayMaxes) : avgMax,
      precipitation: calculateMean(dayPrecips),
      precipitationHours: Math.round(calculateMean(dayPrecipHours)),
      precipitationProbability: Math.round(calculateMean(dayProbs)),
      isYesterday,
      isToday,
    });
  }

  // 5. Today Range Fusion
  const todayMaxes = validModels.map((m) => m.todayRange?.max).filter((v) => typeof v === "number");
  const todayMins = validModels.map((m) => m.todayRange?.min).filter((v) => typeof v === "number");
  const todayPrecips = validModels.map((m) => m.todayRange?.precipitation).filter((v) => typeof v === "number");
  const todayPrecipHours = validModels.map((m) => m.todayRange?.precipitationHours).filter((v) => typeof v === "number");
  const todayProbs = validModels.map((m) => m.todayRange?.precipitationProbability).filter((v) => typeof v === "number");
  const todayUv = validModels.map((m) => m.todayRange?.uvIndex).filter((v) => typeof v === "number");

  const todayMax = Math.round(calculateMean(todayMaxes));
  const todayMin = Math.round(calculateMean(todayMins));

  const fusedTodayRange = {
    max: todayMax,
    min: todayMin,
    difference: todayMax - todayMin,
    precipitation: calculateMean(todayPrecips),
    precipitationHours: Math.round(calculateMean(todayPrecipHours)),
    precipitationProbability: Math.round(calculateMean(todayProbs)),
    uvIndex: Math.round(calculateMean(todayUv)),
    moonPhase: primary.todayRange?.moonPhase ?? 0,
  };

  // 6. Today Hourly Fusion
  const numTodayHourly = primary.todayHourly ? primary.todayHourly.length : 0;
  const fusedTodayHourly = [];
  for (let th = 0; th < numTodayHourly; th++) {
    const thTime = primary.todayHourly[th].time;
    const thPrecips = validModels.map((m) => m.todayHourly?.[th]?.precipitation).filter((p) => typeof p === "number");
    const thProbs = validModels.map((m) => m.todayHourly?.[th]?.precipitationProbability).filter((pr) => typeof pr === "number");
    fusedTodayHourly.push({
      time: thTime,
      precipitation: calculateMean(thPrecips),
      precipitationProbability: Math.round(calculateMean(thProbs)),
    });
  }

  return {
    current: fusedCurrent,
    todayRange: fusedTodayRange,
    todayHourly: fusedTodayHourly,
    hourly: fusedHourly,
    hourlyGraph: fusedHourlyGraph,
    forecast: fusedForecast,
    isFusion: true,
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

  updateFavoriteButton();
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
  const todayOrFutureDays = forecast.filter((day) => !day.isYesterday);
  for (const day of todayOrFutureDays) {
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

  if (typeof current.visibility === "number" && current.visibility < 1000) {
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

let WEATHER_EVENTS_EXPANDED = false;

function closeWeatherEvents() {
  WEATHER_EVENTS_EXPANDED = false;
  const drawerEl = weatherEventsEl?.querySelector(".weather-events-drawer");
  const triggerBtn = weatherEventsEl?.querySelector(".weather-events-trigger");
  if (drawerEl) {
    drawerEl.classList.add("hidden");
    drawerEl.classList.remove("is-open");
  }
  if (triggerBtn) {
    triggerBtn.setAttribute("aria-expanded", "false");
    const chevron = triggerBtn.querySelector(".weather-events-trigger-chevron");
    if (chevron) chevron.textContent = "▾";
  }
}

/**
 * Renders notable weather events as a compact trigger with collapsible drawer.
 * Defaults to collapsed state on render to avoid layout shifts.
 * @param {object} weather - Parsed weather data
 */
function renderWeatherEvents(weather) {
  weatherEventsEl.replaceChildren();
  const events = getWeatherEvents(weather);
  if (events.length === 0) {
    weatherEventsEl.classList.add("hidden");
    return;
  }

  weatherEventsEl.classList.remove("hidden");

  // Compact trigger button displaying up to 3 notable event icons
  const triggerBtn = document.createElement("button");
  triggerBtn.type = "button";
  triggerBtn.className = "weather-events-trigger";
  triggerBtn.setAttribute("aria-expanded", String(WEATHER_EVENTS_EXPANDED));
  triggerBtn.setAttribute("aria-label", `${events.length} notable weather event${events.length > 1 ? "s" : ""}. Click to toggle details.`);

  const iconsSpan = document.createElement("span");
  iconsSpan.className = "weather-events-trigger-icons";
  events.slice(0, 3).forEach((ev) => {
    const iconBadge = document.createElement("span");
    iconBadge.className = "weather-events-badge";
    iconBadge.textContent = ev.icon;
    iconsSpan.append(iconBadge);
  });

  const labelSpan = document.createElement("span");
  labelSpan.className = "weather-events-trigger-label";
  labelSpan.textContent = `${events.length} alert${events.length > 1 ? "s" : ""}`;

  const chevronSpan = document.createElement("span");
  chevronSpan.className = "weather-events-trigger-chevron";
  chevronSpan.textContent = WEATHER_EVENTS_EXPANDED ? "▴" : "▾";

  triggerBtn.append(iconsSpan, labelSpan, chevronSpan);

  // Collapsible details drawer
  const drawerEl = document.createElement("div");
  drawerEl.className = `weather-events-drawer${WEATHER_EVENTS_EXPANDED ? " is-open" : " hidden"}`;

  for (const event of events) {
    const row = document.createElement("div");
    row.className = "weather-event";

    const icon = document.createElement("span");
    icon.className = "weather-event-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = event.icon;

    const text = document.createElement("span");
    text.textContent = event.text;

    row.append(icon, text);
    drawerEl.append(row);
  }

  triggerBtn.addEventListener("click", () => {
    if (!WEATHER_EVENTS_EXPANDED) {
      closeModelMenu();
    }
    WEATHER_EVENTS_EXPANDED = !WEATHER_EVENTS_EXPANDED;
    triggerBtn.setAttribute("aria-expanded", String(WEATHER_EVENTS_EXPANDED));
    chevronSpan.textContent = WEATHER_EVENTS_EXPANDED ? "▴" : "▾";
    drawerEl.classList.toggle("hidden", !WEATHER_EVENTS_EXPANDED);
    drawerEl.classList.toggle("is-open", WEATHER_EVENTS_EXPANDED);
  });

  weatherEventsEl.append(triggerBtn, drawerEl);
}

/**
 * Computes a smooth SVG path definition using the Fritsch-Carlson monotone cubic spline algorithm.
 * Guarantees that the interpolated curve does not overshoot local minima or maxima.
 * @param {Array<{x: number, y: number}>} points - Array of coordinate points sorted by x
 * @returns {string} SVG path string
 */
function generateMonotoneSplinePath(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  const n = points.length;
  const dx = [];
  const dy = [];
  const slopes = [];

  for (let i = 0; i < n - 1; i++) {
    const dX = points[i + 1].x - points[i].x;
    const dY = points[i + 1].y - points[i].y;
    dx.push(dX);
    dy.push(dY);
    slopes.push(dX === 0 ? 0 : dY / dX);
  }

  const tangents = [slopes[0]];
  for (let i = 0; i < n - 2; i++) {
    const s0 = slopes[i];
    const s1 = slopes[i + 1];
    if (s0 * s1 <= 0) {
      tangents.push(0);
    } else {
      const dx0 = dx[i];
      const dx1 = dx[i + 1];
      const common = dx0 + dx1;
      tangents.push((3 * common) / ((common + dx1) / s0 + (common + dx0) / s1));
    }
  }
  tangents.push(slopes[n - 2]);

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = points[i].x;
    const y0 = points[i].y;
    const x1 = points[i + 1].x;
    const y1 = points[i + 1].y;
    const dX = dx[i];

    const cp1x = x0 + dX / 3;
    const cp1y = y0 + (tangents[i] * dX) / 3;
    const cp2x = x1 - dX / 3;
    const cp2y = y1 - (tangents[i + 1] * dX) / 3;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }

  return path;
}

/**
 * Computes a smooth closed ribbon path for uncertainty bounds.
 * @param {Array<{x: number, y: number}>} upperPoints
 * @param {Array<{x: number, y: number}>} lowerPoints
 * @returns {string} Closed SVG path string
 */
function generateUncertaintyRibbonPath(upperPoints, lowerPoints) {
  if (!upperPoints || upperPoints.length < 2 || !lowerPoints || lowerPoints.length < 2) {
    return "";
  }
  const upperPath = generateMonotoneSplinePath(upperPoints);
  const lowerReversed = [...lowerPoints].reverse();
  const lowerPath = generateMonotoneSplinePath(lowerReversed);
  const lowerCubicPart = lowerPath.replace(/^M\s+[\d.-]+\s+[\d.-]+/, "");
  const lastLower = lowerReversed[0];

  return `${upperPath} L ${lastLower.x.toFixed(1)} ${lastLower.y.toFixed(1)} ${lowerCubicPart} Z`;
}

/**
 * Returns a thermal color corresponding to a temperature in Celsius.
 * @param {number} temp - Temperature in Celsius
 * @returns {string} Hex color string
 */
function getTemperatureColor(temp) {
  if (temp <= -5) return "#38bdf8"; // deep ice blue
  if (temp <= 0) return "#60a5fa";  // cool blue
  if (temp <= 7) return "#06b6d4";  // cyan
  if (temp <= 14) return "#10b981"; // emerald green
  if (temp <= 21) return "#84cc16"; // lime green
  if (temp <= 27) return "#f59e0b"; // warm amber
  if (temp <= 33) return "#f97316"; // orange
  return "#ef4444";                 // hot coral/red
}

/**
 * Generates an SVG linearGradient definition for temperature line graph coloring.
 * @param {number} minTemp - Minimum temperature in viewport
 * @param {number} maxTemp - Maximum temperature in viewport
 * @param {number} tempDelta - Difference between maxTemp and minTemp
 * @param {string} gradientId - Gradient identifier
 * @returns {string} SVG <defs> block
 */
function generateTemperatureGradient(minTemp, maxTemp, tempDelta, gradientId = "tempGradient") {
  if (tempDelta <= 0) {
    const singleColor = getTemperatureColor(minTemp);
    return `<defs><linearGradient id="${gradientId}" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stop-color="${singleColor}" /><stop offset="100%" stop-color="${singleColor}" /></linearGradient></defs>`;
  }

  const keyTemps = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35];
  const stops = [
    { offset: 0, color: getTemperatureColor(minTemp) }
  ];

  for (const t of keyTemps) {
    if (t > minTemp && t < maxTemp) {
      const offset = ((t - minTemp) / tempDelta) * 100;
      stops.push({ offset, color: getTemperatureColor(t) });
    }
  }

  stops.push({ offset: 100, color: getTemperatureColor(maxTemp) });
  stops.sort((a, b) => a.offset - b.offset);

  const stopsHtml = stops
    .map((s) => `<stop offset="${s.offset.toFixed(1)}%" stop-color="${s.color}" />`)
    .join("");

  return `<defs><linearGradient id="${gradientId}" x1="0%" y1="100%" x2="0%" y2="0%">${stopsHtml}</linearGradient></defs>`;
}

/**
 * Returns 5-tier color definitions for a given temperature spread in Celsius.
 * @param {number} spread - Temperature spread (maxTemp - minTemp)
 * @returns {{fill: string, stroke: string}}
 */
function getUncertaintyColor(spread) {
  if (spread <= 1.0) {
    return {
      fill: "rgba(16, 185, 129, 0.20)",
      stroke: "rgba(16, 185, 129, 0.40)",
    };
  }
  if (spread <= 2.0) {
    return {
      fill: "rgba(6, 182, 212, 0.20)",
      stroke: "rgba(6, 182, 212, 0.40)",
    };
  }
  if (spread <= 3.0) {
    return {
      fill: "rgba(59, 130, 246, 0.20)",
      stroke: "rgba(59, 130, 246, 0.40)",
    };
  }
  if (spread <= 4.0) {
    return {
      fill: "rgba(245, 158, 11, 0.24)",
      stroke: "rgba(245, 158, 11, 0.45)",
    };
  }
  return {
    fill: "rgba(239, 68, 68, 0.26)",
    stroke: "rgba(239, 68, 68, 0.50)",
  };
}

/**
 * Generates horizontal linearGradient definitions for 5-tier dynamic uncertainty ribbon coloring.
 * @param {Array<object>} pointsData
 * @param {number} totalWidth
 * @param {number} startX
 * @param {number} hourStepX
 * @returns {string} SVG <linearGradient> defs
 */
function generateUncertaintyGradients(pointsData, totalWidth, startX, hourStepX) {
  if (!pointsData || pointsData.length === 0 || totalWidth <= 0) return "";

  const fillStops = [];
  const strokeStops = [];

  pointsData.forEach((d, index) => {
    const minT = typeof d.minTemp === "number" ? d.minTemp : d.temperature;
    const maxT = typeof d.maxTemp === "number" ? d.maxTemp : d.temperature;
    const spread = Math.max(0, maxT - minT);
    const colors = getUncertaintyColor(spread);

    const pointRatio = pointsData.length === 1
      ? 0
      : index / (pointsData.length - 1);
    const offsetPct = pointRatio * 100;

    fillStops.push(`<stop offset="${offsetPct.toFixed(1)}%" stop-color="${colors.fill}" />`);
    strokeStops.push(`<stop offset="${offsetPct.toFixed(1)}%" stop-color="${colors.stroke}" />`);
  });

  return `
    <linearGradient id="uncertaintyFillGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      ${fillStops.join("")}
    </linearGradient>
    <linearGradient id="uncertaintyStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      ${strokeStops.join("")}
    </linearGradient>
  `;
}

/**
 * Generates an SVG path string representing the smoothed temperature curve and dynamic uncertainty band.
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
  const maxSpanHours = (numCols - 1) * 3;
  const pointsData = graphData.slice(0, maxSpanHours + 1);

  const minTemps = pointsData.map((d) => (typeof d.minTemp === "number" ? d.minTemp : d.temperature));
  const maxTemps = pointsData.map((d) => (typeof d.maxTemp === "number" ? d.maxTemp : d.temperature));
  const minTemp = Math.min(...minTemps);
  const maxTemp = Math.max(...maxTemps);
  const tempDelta = maxTemp - minTemp;

  const startX = colWidth / 2;
  const hourStepX = colWidth / 3;

  const meanPoints = [];
  const upperPoints = [];
  const lowerPoints = [];

  const hasUncertainty = pointsData.some(
    (d) => typeof d.minTemp === "number" && typeof d.maxTemp === "number" && d.maxTemp > d.minTemp
  );

  pointsData.forEach((d, index) => {
    const x = startX + index * hourStepX;
    let y = graphHeight / 2;
    if (tempDelta > 0) {
      y = pad + ((maxTemp - d.temperature) / tempDelta) * (graphHeight - 2 * pad);
    }
    meanPoints.push({ x, y });

    if (hasUncertainty) {
      const minT = typeof d.minTemp === "number" ? d.minTemp : d.temperature;
      const maxT = typeof d.maxTemp === "number" ? d.maxTemp : d.temperature;
      let yUpper = y;
      let yLower = y;
      if (tempDelta > 0) {
        yUpper = pad + ((maxTemp - maxT) / tempDelta) * (graphHeight - 2 * pad);
        yLower = pad + ((maxTemp - minT) / tempDelta) * (graphHeight - 2 * pad);
      }
      upperPoints.push({ x, y: yUpper });
      lowerPoints.push({ x, y: yLower });
    }
  });

  let uncertaintySvg = "";
  let uncertaintyDefs = "";
  if (hasUncertainty) {
    uncertaintyDefs = generateUncertaintyGradients(pointsData, totalWidth, startX, hourStepX);
    const ribbonPath = generateUncertaintyRibbonPath(upperPoints, lowerPoints);
    uncertaintySvg = `<path class="hourly-graph-uncertainty" d="${ribbonPath}" fill="url(#uncertaintyFillGradient)" stroke="url(#uncertaintyStrokeGradient)" />`;
  }

  const linePath = generateMonotoneSplinePath(meanPoints);
  const defsHtml = generateTemperatureGradient(minTemp, maxTemp, tempDelta);

  return `
    <svg class="hourly-graph" viewBox="0 0 ${totalWidth} ${graphHeight}" width="${totalWidth}" height="${graphHeight}" aria-hidden="true">
      <defs>
        ${defsHtml.replace("<defs>", "").replace("</defs>", "")}
        ${uncertaintyDefs}
      </defs>
      ${uncertaintySvg}
      <path class="hourly-graph-line" d="${linePath}" />
    </svg>
  `.trim();
}

/**
 * Renders an HTML precipitation bar container with layered hourly bars for a timeslot.
 * Displays the most probable forecast as base bar, with an underlaid peak risk bar when notable.
 * @param {array} precipHours - Array of up to 3 1-hour precipitation objects
 * @returns {string} HTML string for the bar container
 */
function renderHourlyPrecipBars(precipHours) {
  if (!Array.isArray(precipHours) || precipHours.length === 0) {
    return '';
  }

  const hasAnyRain = precipHours.some((hour) => {
    const p = typeof hour.precipitation === "number" ? hour.precipitation : 0;
    const pr = typeof hour.probability === "number"
      ? hour.probability
      : (typeof hour.precipitationProbability === "number" ? hour.precipitationProbability : 0);
    const peakP = typeof hour.peakPrecipitation === "number" ? hour.peakPrecipitation : p;
    return (p > 0 && pr > 0) || (hour.hasNotablePeak && peakP > 0);
  });

  if (!hasAnyRain) {
    return '';
  }

  const maxScale = 15.0; // maxScale mm or above reaches 100% height

  function getBarHeightPct(amount) {
    if (typeof amount !== "number" || amount <= 0) return 0;
    const p = Math.min(Math.max(0.0, amount / maxScale), 1.0);
    return Math.min(100, Math.max(4, 2 + 75 * Math.log10(1.0 + 20.0 * p)));
  }

  function getProbOpacity(prob) {
    if (typeof prob !== "number" || prob <= 0) return 0.20;
    // Map probability (0-100%) to opacity (0.20 - 0.95)
    return Math.min(Math.max(0.20, 0.20 + 0.75 * (prob / 100)), 0.95);
  }

  function getIntensityClass(amount) {
    if (amount >= 15) return "veryheavy";
    if (amount >= 7.5) return "heavy";
    if (amount >= 2.5) return "moderate";
    if (amount >= 1.0) return "light";
    if (amount >= 0.25) return "verylight";
    if (amount >= 0.1) return "drizzle";
    return "trace";
  }

  const slotsHtml = precipHours
    .map((hour) => {
      const precipitation = typeof hour.precipitation === "number" ? hour.precipitation : 0;
      const probability = typeof hour.probability === "number"
        ? hour.probability
        : (typeof hour.precipitationProbability === "number" ? hour.precipitationProbability : 0);

      const hasNotablePeak = !!hour.hasNotablePeak;
      const peakPrecipitation = typeof hour.peakPrecipitation === "number" ? hour.peakPrecipitation : precipitation;
      const peakProbability = typeof hour.peakProbability === "number" ? hour.peakProbability : probability;

      if (
        (precipitation <= 0 || probability <= 0) &&
        (!hasNotablePeak || peakPrecipitation <= 0)
      ) {
        return '<div class="hourly-bar-slot empty" aria-hidden="true"></div>';
      }

      const timeLabel = formatHour(hour.time);
      const probAmountStr = precipitation > 2.5 ? Math.round(precipitation) : (Math.round(precipitation * 10) / 10).toFixed(1);
      const probPctStr = Math.round(probability);

      let title = `${timeLabel}: ${probAmountStr}mm (${probPctStr}%)`;
      let peakBarHtml = "";

      if (hasNotablePeak && peakPrecipitation > 0) {
        const peakAmountStr = peakPrecipitation > 2.5 ? Math.round(peakPrecipitation) : (Math.round(peakPrecipitation * 10) / 10).toFixed(1);
        const peakPctStr = Math.round(peakProbability);
        title += ` · Peak risk: ${peakAmountStr}mm (${peakPctStr}%)`;

        const peakHeight = getBarHeightPct(peakPrecipitation).toFixed(1);
        const peakOpacity = getProbOpacity(peakProbability).toFixed(3);
        const peakIntensity = getIntensityClass(peakPrecipitation);
        peakBarHtml = `<div class="hourly-precip-bar peak ${peakIntensity}" style="height: ${peakHeight}%; opacity: ${peakOpacity};" aria-hidden="true"></div>`;
      }

      const baseHeight = getBarHeightPct(precipitation).toFixed(1);
      const baseOpacity = getProbOpacity(probability).toFixed(3);
      const baseIntensity = getIntensityClass(precipitation);
      const baseBarHtml = `<div class="hourly-precip-bar base ${baseIntensity}" style="height: ${baseHeight}%; opacity: ${baseOpacity};" aria-hidden="true"></div>`;

      return `
        <div class="hourly-bar-slot" title="${title}">
          ${peakBarHtml}
          ${baseBarHtml}
        </div>
      `.trim();
    })
    .join("");

  return `
    <div class="hourly-bar-container">
      ${slotsHtml}
    </div>
  `.trim();
}

/**
 * Renders the hourly timeline forecast with columns and a 1-hour resolution temperature graph.
 * Positions the horizontal scrollbar so that 'Now' is shown on the left on load.
 * @param {array} hours - Array of hourly forecast objects with time, code, temperature, isDay, isCurrent
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
      const maxPrecip = Array.isArray(hour.precipHours)
        ? hour.precipHours.reduce((max, h) => Math.max(max, typeof h.precipitation === 'number' ? h.precipitation : 0), 0)
        : hour.precipitation;
      const maxProb = Array.isArray(hour.precipHours)
        ? hour.precipHours.reduce((max, h) => Math.max(max, typeof h.probability === 'number' ? h.probability : (typeof h.precipitationProbability === 'number' ? h.precipitationProbability : 0)), 0)
        : hour.precipitationProbability;
      const precipText = formatPrecipitation(maxPrecip, maxProb);
      const currentAttr = hour.isCurrent ? ' data-current="true"' : '';
      const dayClass = hour.isDay ? 'is-day' : 'is-night';
      return `
        <div class="hourly-item ${dayClass}"${currentAttr}>
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

  const currentCol = hourlyRowEl.querySelector('[data-current="true"]');
  if (currentCol) {
    hourlyRowEl.scrollLeft = currentCol.offsetLeft;
  }
}

/**
 * Renders the daily forecast to the DOM using template literals.
 * Positions the vertical scrollbar so that 'Today' is shown at the top on load.
 * @param {array} days - Array of daily forecast objects with date, code, max, min, isYesterday, isToday
 */
function renderForecast(days) {
  if (!days || days.length === 0) {
    forecastRowEl.innerHTML = '<div class="forecast-item forecast-error">Forecast unavailable</div>';
    return;
  }

  forecastRowEl.innerHTML = days
    .map((day) => {
      const condition = getWeatherCondition(day.code, true);
      const dayLabel = day.isYesterday ? "Yesterday" : day.isToday ? "Today" : formatWeekday(day.date);
      const precipText = formatPrecipitation(day.precipitation, day.precipitationProbability);
      const todayAttr = day.isToday ? ' data-today="true"' : '';
      return `
        <div class="forecast-item"${todayAttr}>
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

  const todayRow = forecastRowEl.querySelector('[data-today="true"]');
  if (todayRow) {
    const top = todayRow.offsetParent === forecastRowEl
      ? todayRow.offsetTop
      : todayRow.offsetTop - forecastRowEl.offsetTop;
    forecastRowEl.scrollTop = top;
  }
}

/**
 * Fetches weather data from Open-Meteo API for current location.
 * Orchestrates fetching, parsing, and rendering, or displays error state.
 */
function getModelCacheKey(location, modelId) {
  return `${Number(location.latitude).toFixed(4)}:${Number(location.longitude).toFixed(4)}:${modelId}`;
}

function setActiveModel(modelId) {
  const nextModel = ALL_MODEL_CHOICES.includes(modelId) ? modelId : MODEL_FUSION_ID;
  ACTIVE_MODEL_ID = nextModel;

  if (modelPickerBtnEl) {
    modelPickerBtnEl.classList.add("is-active");
    modelPickerBtnEl.setAttribute("aria-pressed", "true");
  }

  if (modelPickerValueEl) {
    modelPickerValueEl.textContent = MODEL_LABELS[nextModel] || nextModel;
  }

  modelOptionEls.forEach((optionEl) => {
    const isActive = optionEl.dataset.model === nextModel;
    optionEl.classList.toggle("is-active", isActive);
    optionEl.setAttribute("aria-checked", String(isActive));
  });

  return nextModel;
}

function toggleModelMenu() {
  if (!modelPickerMenuEl || !modelPickerBtnEl) return;
  const isHidden = modelPickerMenuEl.classList.contains("hidden");
  if (isHidden) {
    closeWeatherEvents();
  }
  modelPickerMenuEl.classList.toggle("hidden", !isHidden);
  modelPickerBtnEl.setAttribute("aria-expanded", String(isHidden));
}

function closeModelMenu() {
  if (!modelPickerMenuEl || !modelPickerBtnEl) return;
  modelPickerMenuEl.classList.add("hidden");
  modelPickerBtnEl.setAttribute("aria-expanded", "false");
}

function renderActiveModel() {
  if (modelPickerBtnEl) {
    modelPickerBtnEl.classList.toggle("is-active", true);
    modelPickerBtnEl.setAttribute("aria-pressed", "true");
  }

  if (modelPickerValueEl) {
    modelPickerValueEl.textContent = MODEL_LABELS[ACTIVE_MODEL_ID] || ACTIVE_MODEL_ID;
  }

  modelOptionEls.forEach((optionEl) => {
    const isActive = optionEl.dataset.model === ACTIVE_MODEL_ID;
    optionEl.classList.toggle("is-active", isActive);
    optionEl.setAttribute("aria-checked", String(isActive));
  });
}

function setModelLoading(isLoading) {
  if (modelPickerBtnEl) {
    modelPickerBtnEl.classList.toggle("is-loading", isLoading);
    modelPickerBtnEl.setAttribute("aria-busy", String(isLoading));
  }
  if (weatherIconEl) {
    weatherIconEl.classList.toggle("is-loading", isLoading);
    weatherIconEl.setAttribute("aria-busy", String(isLoading));
    if (isLoading) {
      weatherIconEl.setAttribute("aria-label", "Loading weather");
    } else if (weatherIconEl.getAttribute("aria-label") === "Loading weather") {
      weatherIconEl.setAttribute("aria-label", "Weather forecast");
    }
  }
}

async function fetchWeatherModel(location, modelId = ACTIVE_MODEL_ID) {
  const cacheKey = getModelCacheKey(location, modelId);
  const cachedEntry = WEATHER_MODEL_CACHE.get(cacheKey);

  if (cachedEntry && Date.now() - cachedEntry.timestamp < WEATHER_MODEL_CACHE_TTL_MS) {
    return cachedEntry.data;
  }

  const url = buildWeatherUrl(location.latitude, location.longitude, modelId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed for ${modelId}: ${response.status}`);
  }

  const data = await response.json();
  const weather = parseWeatherData(data);

  WEATHER_MODEL_CACHE.set(cacheKey, {
    data: weather,
    timestamp: Date.now(),
  });

  return weather;
}

async function fetchWeatherModels(location = WEATHER_LOCATION) {
  const modelResults = await Promise.all(
    WEATHER_MODEL_IDS.map(async (modelId) => {
      try {
        const weather = await fetchWeatherModel(location, modelId);
        return [modelId, weather];
      } catch (error) {
        console.error(`Weather fetch failed for model ${modelId}:`, error);
        return [modelId, null];
      }
    })
  );

  const modelWeather = Object.fromEntries(
    modelResults.filter(([, weather]) => weather)
  );

  let activeWeather = null;
  if (ACTIVE_MODEL_ID === MODEL_FUSION_ID) {
    activeWeather = computeFusedWeatherData(modelWeather);
  } else {
    activeWeather = modelWeather[ACTIVE_MODEL_ID] || computeFusedWeatherData(modelWeather);
  }

  return {
    modelWeather,
    activeWeather,
  };
}

function selectModel(modelId) {
  closeWeatherEvents();
  const nextModel = setActiveModel(modelId);
  closeModelMenu();

  if (nextModel === MODEL_FUSION_ID) {
    const allCached = WEATHER_MODEL_IDS.every((id) => {
      const cacheKey = getModelCacheKey(WEATHER_LOCATION, id);
      const entry = WEATHER_MODEL_CACHE.get(cacheKey);
      return entry && Date.now() - entry.timestamp < WEATHER_MODEL_CACHE_TTL_MS;
    });

    if (allCached) {
      const modelWeather = {};
      WEATHER_MODEL_IDS.forEach((id) => {
        const cacheKey = getModelCacheKey(WEATHER_LOCATION, id);
        modelWeather[id] = WEATHER_MODEL_CACHE.get(cacheKey)?.data;
      });
      const fusedWeather = computeFusedWeatherData(modelWeather);
      if (fusedWeather) {
        setModelLoading(false);
        renderCurrentWeather(WEATHER_LOCATION, fusedWeather);
        renderHourlyForecast(fusedWeather.hourly, fusedWeather.hourlyGraph);
        renderForecast(fusedWeather.forecast);
        return;
      }
    }

    setModelLoading(true);
    fetchWeather().finally(() => {
      setModelLoading(false);
    });
    return;
  }

  const cacheKey = getModelCacheKey(WEATHER_LOCATION, nextModel);
  const cachedWeather = WEATHER_MODEL_CACHE.get(cacheKey)?.data;

  if (!cachedWeather) {
    setModelLoading(true);
    fetchWeather().finally(() => {
      setModelLoading(false);
    });
    return;
  }

  setModelLoading(false);
  renderCurrentWeather(WEATHER_LOCATION, cachedWeather);
  renderHourlyForecast(cachedWeather.hourly, cachedWeather.hourlyGraph);
  renderForecast(cachedWeather.forecast);
}

async function fetchWeather() {
  try {
    const { activeWeather } = await fetchWeatherModels(WEATHER_LOCATION);

    if (!activeWeather) {
      throw new Error("No weather model data available.");
    }

    renderCurrentWeather(WEATHER_LOCATION, activeWeather);
    renderHourlyForecast(activeWeather.hourly, activeWeather.hourlyGraph);
    renderForecast(activeWeather.forecast);
  } catch (error) {
    console.error("Weather fetch failed:", error);
    setWeatherFailure();
  } finally {
    setModelLoading(false);
  }
}

locationFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  searchLocation();
});

modelPickerBtnEl?.addEventListener("click", () => {
  toggleModelMenu();
});

modelOptionEls.forEach((optionEl) => {
  optionEl.addEventListener("click", () => {
    selectModel(optionEl.dataset.model);
  });
});

document.addEventListener("click", (event) => {
  if (!modelPickerBtnEl || !modelPickerMenuEl) return;
  const clickedInside = modelPickerBtnEl.contains(event.target) || modelPickerMenuEl.contains(event.target);
  if (!clickedInside) {
    closeModelMenu();
  }
});

document.addEventListener("click", (event) => {
  if (!weatherEventsEl || !WEATHER_EVENTS_EXPANDED) return;
  if (!weatherEventsEl.contains(event.target)) {
    closeWeatherEvents();
  }
});

favoriteToggleBtnEl?.addEventListener("click", () => {
  toggleFavorite();
});

locationBtnEl?.addEventListener("click", () => {
  toggleFavoritesMenu();
});

currentLocationBtnEl?.addEventListener("click", () => {
  selectGpsLocation();
});

document.addEventListener("click", (event) => {
  if (favoritesMenuEl && !favoritesMenuEl.classList.contains("hidden")) {
    const header = document.querySelector(".weather-header");
    if (header && !header.contains(event.target)) {
      closeFavoritesMenu();
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModelMenu();
    closeWeatherEvents();
    if (favoritesMenuEl && !favoritesMenuEl.classList.contains("hidden")) {
      closeFavoritesMenu();
    }
  }
});

initAppLocation();
