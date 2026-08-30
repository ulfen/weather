# Project rules

- This is a learning project.
- Use plain HTML, CSS and JavaScript.
- Do not introduce a framework without asking.
- Keep dependencies to a minimum.
- Prefer simple code over abstractions.
- Don't rewrite working code unnecessarily.
- Explain significant architectural changes before making them.
- Run/test the application after meaningful changes.
- If something fails, investigate the actual cause rather than hiding the error.
- Open-Meteo is the weather data source.

# Working Practice

After completing each phase:
1. Run/test the application to verify changes
2. Mark completed items with [x]
3. Mark phase as ✅ in the Completed section (move it out of active phases)
4. This ensures continuous visibility of progress and prevents regressions

# Project ToDo

## Completed
- Static UI with mock weather data
- Data model with static values
- Dynamic HTML population from model
- Single hardcoded latitude/longitude
- 7-day forecast UI
- Location search with Open-Meteo geocoding API

- **Phase 1a: Dark/Light Theme (System Preference)** ✅
  - [x] Add dark mode CSS variables with prefers-color-scheme media query
  - [x] Implement theme switching via CSS (no JS needed)
  - [x] Test theme switching in browser DevTools (working ✓)
  - [x] Verified: No errors, theme toggles correctly between light/dark

- **Phase 1b: Day/Night Icons** ✅
  - [x] Extend WEATHER_CODES with day/night icon variants (moon 🌙 for night)
  - [x] Add is_day to current API request
  - [x] Update getWeatherCondition() to accept isDay parameter
  - [x] Use is_day for current weather icon (shows night moon if is_day=false)
  - [x] Use day icons for 7-day forecast (full day includes both day and night, so use day icon)
  - [x] Verified: No errors, icons update based on is_day parameter

- **Phase 1c: Simple Visual & Documentation** ✅
  - [x] Remove "Weather" h1 title from header
  - [x] Convert search UI from \<div\> to \<form\> (semantic + accessibility)
  - [x] Update CSS .weather-card from fixed width to max-width

- **Phase 1d: Data Validation & Parsing** ✅
  - [x] Create parseWeatherData(apiResponse) function (extracts transformation logic)
  - [x] Add data validation layer (check required fields exist)
  - [x] Improve error messaging (preserve actual error context)
  - [x] Test error cases: no results, network failure, missing fields

- **Phase 1e: Render & Orchestration** ✅
  - [x] Create renderCurrentWeather(location, weather) function
  - [x] Refactor fetchWeather() to use parseWeatherData() and renderCurrentWeather()
  - [x] Keep fetchWeather() as clean orchestrator only
  - [x] Verified: Clean data pipeline established and tested

- **Phase 1f: Forecast & Search Cleanup** ✅
  - [x] Simplify renderForecast() with template literals or cleaner DOM builder
  - [x] Refactor searchLocation() into logical steps (validate → fetch → parse → update → render)
  - [x] Extract modular URL builders (buildWeatherUrl, buildGeocodingUrl) and date formatters (formatWeekday)
  - [x] Verified: Unit tests passed for template literals, URL building, weekday formatting, and search logic

- **Phase 2a: Horizontal Hourly Timeline** ✅
  - [x] Extend Open-Meteo API request to include hourly data
  - [x] Implement renderHourlyForecast() function
  - [x] Create horizontal scrollable container for hourly cards
  - [x] Display time (24-hour format), icon (day/night aware), and temperature for each hour (3-hour intervals)
  - [x] Verified: Unit and parsing tests passed; 24-hour formatting ("15:00") and data pipeline verified

- **Phase 2b: Vertical 7-Day Forecast** ✅
  - [x] Refactor forecast layout from horizontal flex-wrap to vertical stack
  - [x] Update card styling for vertical presentation
  - [x] Ensure day/date, icon, high/low temps display clearly
  - [x] Verified: 7-day forecast renders as a vertical stack with clear row alignment, "Today" label for current day, and high/low temperature styling contrast

- **Phase 2c: Single-Container 7-Day Forecast** ✅
  - [x] Consolidate 7 vertical cards with individual borders into a single container
  - [x] Render as a single card with a single border
  - [x] Keep all existing information (day label, icon, min/max temperatures)
  - [x] Remove redundant border-to-border and text-to-border stacking spacing
  - [x] Maintain vertical column alignment across all rows
  - [x] Verified: 7-day forecast displays inside a single card with subtle row dividers and aligned columns

- **Phase 2d: Change the hourly forecast layout & Temperature Graph** ✅

  - **Phase 2d-i: Single Container for Hourly Forecast** ✅
    - [x] Consolidate 8 horizontal cards into a single scrollable container with a single outer border
    - [x] Remove individual borders and backgrounds from hourly column items
    - [x] Maintain horizontal scrolling, time labels, icons, and temperature values
    - [x] Ensure consistent column width and alignment across time, icon, and temperature
  
  - **Phase 2d-ii: 24-Hour Data Pipeline & SVG Line Graph Foundation** ✅
    - [x] Extract full 24-hour temperature dataset (1-hour resolution) in `parseWeatherData`
    - [x] Add an SVG line graph container situated between the weather icons and temperature text
    - [x] Calculate SVG coordinates aligned horizontally with the hourly column positions (8 columns @ 3h intervals with 24-point 1h graph)
    - [x] Render initial polyline connecting the temperature points (no extra axis labels needed)
    - [x] Verified: SVG temperature curve connects 24 hourly points with vertices aligning with the 8 column centers, situated directly between icons and temperatures

- **Phase 2e: Change the current weather layout** ✅

  - **Phase 2e-i: Optional Weather Event Card** ✅
    - [x] Do not display high and low temperatures for current weather
    - [x] Show an optional event card only when notable weather exists
    - [x] Hide the card when there are no notable weather events
    - [x] Render one text row with an appropriate icon for each event
    - [x] Show the rounded daily temperature difference when it is 15 degrees or more
    - [x] Add a border to the card when visible
  
  - **Phase 2e-ii: Expanded Weather Event Card** ✅
    - [x] Heavy rain today (any hourly precipitation above 5 mm): show daily sum, hours and probability
    - [x] Rain today (16 or more precipitation hours and 5 mm or more total): show forecasted hours
    - [x] Rain this week (3 or more consecutive days with 5 mm or more, starting today): show forecasted days
    - [x] Strong wind now (40 km/h or greater): show speed and direction
    - [x] Storm-like wind gusts now (60 km/h or greater): show maximum gusts
    - [x] Temperature now feels (rounded) 5 degrees or more different from actual temperature: show rounded difference
    - [x] UV index 7 or greater today: show UV index
    - [x] Visibility now less than 1 km: show visibility in 100 m; less than 100 m shows less than 100 m
    - [x] Full moon tonight: detect the documented moon phase near 0.5

## Phase 2f: Add Precipitation to Forecast

- **Phase 2f-i: Add Precipitation text to both 7-day and hourly forecasts** ✅
  - [x] Extend API requests to include precipitation and precipitation_probability
  - [x] Round precipitation to mm if above 1mm. round to 0.1 mm if below 1mm
  - [x] Round percentage to 5% if above 10%. round to 1% if below 10%
  - [x] Add rounded rain amount (mm) and probability (%) to hourly forecast cards, if both above 0
  - [x] Add rounded rain amount (mm) and probability (%) to daily 7-day cards, if both above 0
  - [x] Update card layout to accommodate precipitation data: x mm (y%)

- **Phase 2f-ii: Precipitation graphic in 7-day forecast**
  - [ ] Combine precipitation and precipitation_probability into a single graphic
  - [ ] Use the precipitation graphic in the 7-day forecast
  - [ ] The graphic should indicate both the amount of rain and the probability of rain
  - [ ] Make it appear as a small bar of fixed height
  - [ ] The width of the bar indicates the amount of rain (light, moderate, heavy)
  - [ ] The shade of the bar indicates the probability of rain (low, medium, high)

- **Phase 2f-iii: Precipitation graphic in hourly forecast** ✅
  - [x] Add precipitation amount under the temperature in the hourly forecast (if not 0)
  - [x] Add a bar chart with precipitation amount to the hourly forecast (if not 0)
  - [x] Combine precipitation and precipitation_probability into the bar chart
  - [x] The bar chart should indicate both the amount of rain and the probability of rain
  - [x] The height of the bar indicates the amount of rain (mm)
  - [x] The shade of the bar indicates the probability of rain (low, medium, high)

- **Phase 2g: Extend the forecast timelines** ✅
  - [x] Extend the hourly forecast to be two days (48 hours)
  - [x] Extend the hourly forecast such the last printed hour equals the first (+3 hours?)
  - [x] Extend the hourly forecast to contain a past timestamp (-3 hours?)
  - [x] If possible, make the hourly forecast show now at left after loading (past timestamp not directly visible)
  - [x] Extend the daily forecast to be two weeks (14 days)
  - [x] Extend the daily forecast such the last weekday equals the first (+1 day?)
  - [x] Extend the daily forecast to include yesterday (-1 day?)
  - [x] Make the daily forecast scrollable (about 8 days visible at the same time)
  - [x] If possible, make the daily forecast show today at top after loading (yesterday not directly visible)
  - [x] Verified: Live Open-Meteo test verified 18 hourly columns (-3h to +48h), 52-point SVG temperature graph, 16 daily forecast rows (Yesterday, Today, +14 days with matching weekday), event detection aligned with Today, and scroll positioning on render

## Phase 3: Location Search, Favorites & Current Location

- **Phase 3a: Condensed Search UI** ✅
  - [x] Replace permanent search box with compact search icon (🔍)
  - [x] Implement collapsible header search input (toggle open/close on click/submit)
  - [x] Maintain clean, condensed header aesthetic
  - [x] Verified: Header displays city name with search icon button in collapsed state, opens auto-focused input on toggle, closes on Escape/close button, and auto-collapses on search success

- **Phase 3b: Dynamic Favorites & localStorage**
  - [ ] Implement localStorage helpers (loadFavorites, saveFavorites, addFavorite, removeFavorite)
  - [ ] Add star icon toggle (★/☆) next to current location name to add/remove favorites
  - [ ] Auto-save last viewed location and restore on startup

- **Phase 3c: Favorites Dropdown & Physical GPS Location**
  - [ ] Create favorites dropdown/menu UI displaying saved locations
  - [ ] Add "📍 Current Location" option at top of favorites list using `navigator.geolocation`
  - [ ] Allow switching between saved favorites and GPS location smoothly

## Phase 4: Weather Model Selection & Caching

- **Phase 4a: Multi-Model API & Local Caching**
  - [ ] Extend API requests to fetch data from specific provider models:
    - [ ] `knmi_seamless` (Netherlands)
    - [ ] `dwd_icon_seamless` (Germany)
    - [ ] `meteofrance_seamless` (France)
    - [ ] `ukmo_seamless` (UK)
    - [ ] `ncep_gfs_seamless` (US)
  - [ ] Cache model data in-memory per location to allow instant switching without refetching

- **Phase 4b: Model Selector UI**
  - [ ] Create compact UI element in header/card showing active model
  - [ ] Implement model picker dropdown/selector to switch active forecast
  - [ ] Update temperature, precipitation text, and graphs according to selected model

## Phase 5: Weather Model Fusion

- **Phase 5a: Model Fusion Data Processing**
  - [ ] Add "Model Fusion" as a selectable option (and default option)
  - [ ] Calculate multi-model average temperature and min/max envelope per hour
  - [ ] Calculate multi-model rain amounts, probabilities, and model agreement metrics

- **Phase 5b: Temperature Graph Fusion**
  - [ ] Render average temperature curve for the main graph line
  - [ ] Render shaded uncertainty area between min and max bounds from all models
  - [ ] Keep graph clean and responsive

- **Phase 5c: Rain Forecast Fusion**
  - [ ] Display blended rain amount and probability in forecast text
  - [ ] Render rain bars based on model with highest probability
  - [ ] Visualize model agreement by adjusting bar brightness/opacity (lighter = less agreement)

## Phase 6: Installable Progressive Web App (PWA)

- **Phase 6a: Web App Manifest & App Icons**
  - [ ] Create `manifest.json` with app name, theme colors, icons, and display mode
  - [ ] Add favicon and apple-touch-icon assets in HTML header
  - [ ] Configure standalone viewport settings for mobile

- **Phase 6b: Service Worker & Offline App Shell**
  - [ ] Implement lightweight Service Worker to cache core assets (`index.html`, `style.css`, `app.js`, icons)
  - [ ] Register Service Worker on app load
  - [ ] Verify offline app shell loading and mobile browser installability

## Design Decisions
- Theme: System preference (prefers-color-scheme) — respects user accessibility and control
- Icons: Sunrise/sunset times from API (sun ☀️ daytime, moon 🌙 nighttime) — independent of theme
- Storage: Browser localStorage (no backend)
- Search UX: Collapsible icon-based menu
- Forecasts: Hourly (3–6 hour intervals) + vertical 7-day cards
- No new dependencies: vanilla HTML/CSS/JS only
- Approach: Small, self-contained iterations (~1-2 hours per step)