const WEATHER_LOCATION = {
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

const WEATHER_CODES = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Light freezing drizzle", icon: "🌧️" },
  57: { label: "Heavy freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Light freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "❄️" },
  73: { label: "Moderate snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Heavy rain showers", icon: "🌧️" },
  82: { label: "Violent rain showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "🌨️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm", icon: "⛈️" },
};

function setWeatherFailure() {
  locationEl.textContent = `${WEATHER_LOCATION.city}, ${WEATHER_LOCATION.country}`;
  temperatureEl.textContent = "--°C";
  conditionEl.textContent = "Weather unavailable";
  temperatureRangeEl.textContent = "--° / --°";
  weatherIconEl.textContent = "⚠️";
  weatherIconEl.setAttribute("aria-label", "Weather unavailable");
}

function getWeatherCondition(code) {
  return WEATHER_CODES[code] || { label: "Unknown", icon: "❔" };
}

async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LOCATION.latitude}&longitude=${WEATHER_LOCATION.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;

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
    const weather = getWeatherCondition(currentData.weather_code);
    const currentTemp = Math.round(currentData.temperature_2m);
    const high = Math.round(dailyData.temperature_2m_max[0]);
    const low = Math.round(dailyData.temperature_2m_min[0]);

    locationEl.textContent = `${WEATHER_LOCATION.city}, ${WEATHER_LOCATION.country}`;
    temperatureEl.textContent = `${currentTemp}°C`;
    conditionEl.textContent = weather.label;
    temperatureRangeEl.textContent = `${high}° / ${low}°`;
    weatherIconEl.textContent = weather.icon;
    weatherIconEl.setAttribute("aria-label", `${weather.label} weather`);
  } catch (error) {
    console.error("Weather fetch failed:", error);
    setWeatherFailure();
  }
}

fetchWeather();
