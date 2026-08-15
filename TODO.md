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

## Phase 1c: Foundation & Code Polish
- [ ] Remove "Weather" h1 title from header (already in todo)
- [ ] Convert search UI from \<div\> to \<form\> (semantic + better accessibility)
- [ ] Refactor fetchWeather() → separate data layer from rendering
  - [ ] Create parseWeatherData(apiResponse) function
  - [ ] Create renderCurrentWeather(data) function
  - [ ] Keep fetchWeather() as orchestrator only
- [ ] Refactor searchLocation() into steps (validate → fetch → update → render)
- [ ] Simplify renderForecast() with template literals or cleaner DOM builder
- [ ] Add data validation layer — check API responses have required fields
- [ ] Improve error messaging (display actual error context, not generic text)
- [ ] Document WEATHER_LOCATION data structure (JSDoc or inline comment)
- [ ] Test error cases: no results, network failure, missing fields
- [ ] Update CSS .weather-card from fixed width to max-width
- [ ] Add function comments describing inputs/outputs

## Phase 2a: Horizontal Hourly Timeline
- [ ] Extend Open-Meteo API request to include hourly data
- [ ] Implement renderHourlyForecast() function
- [ ] Create horizontal scrollable container for hourly cards
- [ ] Display time, icon, and temperature for each hour (3-6 hour intervals)
- [ ] Test horizontal scroll

## Phase 2b: Vertical 7-Day Forecast
- [ ] Refactor forecast layout from horizontal flex-wrap to vertical stack
- [ ] Update card styling for vertical presentation
- [ ] Ensure day/date, icon, high/low temps display clearly

## Phase 2c: Add Precipitation to Forecast
- [ ] Extend API request to include precipitation_probability
- [ ] Add rain % to hourly forecast cards
- [ ] Add rain % to daily 7-day cards
- [ ] Update card layout to accommodate precipitation data
- [ ] Test data accuracy and display

## Phase 3a: Static Favorites List
- [ ] Hardcode 3-4 favorite locations
- [ ] Create favorites dropdown/list UI
- [ ] Display current location highlighted
- [ ] Test favorites dropdown appearance

## Phase 3b: Dynamic Favorites & localStorage
- [ ] Implement localStorage helpers (loadLocations, saveLocations, addFavorite, removeFavorite)
- [ ] Create data model for saved locations
- [ ] Implement switching between saved locations (fetch weather for new location)
- [ ] Auto-save last viewed location
- [ ] Test: Save location, close browser, reopen, verify restoration

## Phase 3c: Search & Favorites UI Polish
- [ ] Replace search button with search icon (🔍)
- [ ] Implement collapsible header menu (click icon to toggle)
- [ ] Add star icon toggle (★/☆) next to location name
- [ ] Auto-add newly searched locations to history
- [ ] Test collapsible menu and star toggle functionality

## Phase 4: Polish, Enhancements & Validation
- [ ] API error handling and edge cases
- [ ] Accessibility audit (keyboard nav, color contrast, aria labels)
- [ ] Visual refinements and cross-browser testing
- [ ] (Bonus) Add subtle gradient/lighting shifts based on sunrise/sunset times

## Design Decisions
- Theme: System preference (prefers-color-scheme) — respects user accessibility and control
- Icons: Sunrise/sunset times from API (sun ☀️ daytime, moon 🌙 nighttime) — independent of theme
- Storage: Browser localStorage (no backend)
- Search UX: Collapsible icon-based menu
- Forecasts: Hourly (3–6 hour intervals) + vertical 7-day cards
- No new dependencies: vanilla HTML/CSS/JS only
- Approach: Small, self-contained iterations (~1-2 hours per step)