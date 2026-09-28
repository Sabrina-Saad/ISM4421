"use strict";

const BOCA = {
  name: "Boca Raton",
  region: "Florida, United States",
  latitude: 26.3683,
  longitude: -80.1289,
};

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

// WMO weather codes → [description, day icon, night icon]
const WEATHER_CODES = {
  0: ["Clear sky", "☀️", "🌙"],
  1: ["Mainly clear", "🌤️", "🌙"],
  2: ["Partly cloudy", "⛅", "☁️"],
  3: ["Overcast", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"],
  48: ["Freezing fog", "🌫️", "🌫️"],
  51: ["Light drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Heavy drizzle", "🌧️", "🌧️"],
  56: ["Freezing drizzle", "🌧️", "🌧️"],
  57: ["Freezing drizzle", "🌧️", "🌧️"],
  61: ["Light rain", "🌦️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy rain", "🌧️", "🌧️"],
  66: ["Freezing rain", "🌧️", "🌧️"],
  67: ["Freezing rain", "🌧️", "🌧️"],
  71: ["Light snow", "🌨️", "🌨️"],
  73: ["Snow", "🌨️", "🌨️"],
  75: ["Heavy snow", "❄️", "❄️"],
  77: ["Snow grains", "🌨️", "🌨️"],
  80: ["Rain showers", "🌦️", "🌧️"],
  81: ["Rain showers", "🌧️", "🌧️"],
  82: ["Violent showers", "⛈️", "⛈️"],
  85: ["Snow showers", "🌨️", "🌨️"],
  86: ["Snow showers", "🌨️", "🌨️"],
  95: ["Thunderstorm", "⛈️", "⛈️"],
  96: ["Thunderstorm w/ hail", "⛈️", "⛈️"],
  99: ["Thunderstorm w/ hail", "⛈️", "⛈️"],
};

const $ = (id) => document.getElementById(id);

const state = {
  place: BOCA,
  unit: loadPref("unit", "fahrenheit"),
};

function loadPref(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable; ignore */
  }
}

function describe(code, isDay = true) {
  const entry = WEATHER_CODES[code] || ["Unknown", "🌡️", "🌡️"];
  return { text: entry[0], icon: isDay ? entry[1] : entry[2] };
}

function setStatus(message, isError = false) {
  const el = $("status");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

// Open-Meteo returns local times as "YYYY-MM-DDTHH:MM" in the location's timezone.
// Parse them as-is (no timezone conversion) so labels show the location's local time.
function parseLocal(iso) {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

function fmtHour(iso) {
  return parseLocal(iso).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" });
}

function fmtClock(iso) {
  return parseLocal(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

function fmtDay(iso, index) {
  if (index === 0) return "Today";
  return parseLocal(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function fmtLocalNow(iso) {
  return parseLocal(iso).toLocaleString("en-US", {
    weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  });
}

async function fetchForecast(place, unit) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m,precipitation",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    temperature_unit: unit,
    wind_speed_unit: unit === "fahrenheit" ? "mph" : "kmh",
    precipitation_unit: unit === "fahrenheit" ? "inch" : "mm",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
  return res.json();
}

async function searchPlaces(query) {
  const params = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" });
  const res = await fetch(`${GEOCODE_URL}?${params}`);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

function compass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function render(data) {
  const { current, hourly, daily, current_units: cu } = data;
  const deg = "°";
  const now = describe(current.weather_code, current.is_day === 1);

  $("place-name").textContent = state.place.region ? `${state.place.name}, ${shortRegion(state.place.region)}` : state.place.name;
  $("local-time").textContent = `Local time: ${fmtLocalNow(current.time)}`;
  $("current-icon").textContent = now.icon;
  $("current-temp").textContent = `${Math.round(current.temperature_2m)}${deg}`;
  $("current-desc").textContent = now.text;
  $("current-feels").textContent = `Feels like ${Math.round(current.apparent_temperature)}${deg}`;

  $("stat-hilo").textContent = `${Math.round(daily.temperature_2m_max[0])}${deg} / ${Math.round(daily.temperature_2m_min[0])}${deg}`;
  $("stat-humidity").textContent = `${current.relative_humidity_2m}%`;
  $("stat-wind").textContent = `${Math.round(current.wind_speed_10m)} ${cu.wind_speed_10m.replace("mp/h", "mph")} ${compass(current.wind_direction_10m)}`;
  $("stat-precip").textContent = daily.precipitation_probability_max[0] == null ? "—" : `${daily.precipitation_probability_max[0]}%`;
  $("stat-uv").textContent = daily.uv_index_max[0] == null ? "—" : uvLabel(daily.uv_index_max[0]);
  $("stat-sun").textContent = `${fmtClock(daily.sunrise[0])} / ${fmtClock(daily.sunset[0])}`;

  // Hourly: start at the current hour, show the next 24.
  const currentHour = current.time.slice(0, 13);
  let start = hourly.time.findIndex((t) => t.slice(0, 13) === currentHour);
  if (start < 0) start = 0;
  const hourlyList = $("hourly");
  hourlyList.replaceChildren();
  for (let i = start; i < Math.min(start + 24, hourly.time.length); i++) {
    const d = describe(hourly.weather_code[i], hourly.is_day[i] === 1);
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="h-time">${i === start ? "Now" : fmtHour(hourly.time[i])}</div>
      <div class="h-icon" title="${d.text}">${d.icon}</div>
      <div class="h-temp">${Math.round(hourly.temperature_2m[i])}${deg}</div>
      <div class="h-pop">💧 ${hourly.precipitation_probability[i] ?? 0}%</div>`;
    hourlyList.append(li);
  }

  const dailyList = $("daily");
  dailyList.replaceChildren();
  daily.time.forEach((t, i) => {
    const d = describe(daily.weather_code[i]);
    const pop = daily.precipitation_probability_max[i];
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="d-day">${fmtDay(t, i)}</span>
      <span class="d-icon" aria-hidden="true">${d.icon}</span>
      <span class="d-desc">${d.text}${pop != null ? `<span class="d-pop">💧${pop}%</span>` : ""}</span>
      <span class="d-temps">${Math.round(daily.temperature_2m_max[i])}${deg}<span class="lo">${Math.round(daily.temperature_2m_min[i])}${deg}</span></span>`;
    dailyList.append(li);
  });

  ["current", "hourly-card", "daily-card"].forEach((id) => { $(id).hidden = false; });
}

function shortRegion(region) {
  // "Florida, United States" → "Florida"; keep country for places outside the US.
  const parts = region.split(", ");
  if (parts.length > 1 && parts[parts.length - 1] === "United States") return parts.slice(0, -1).join(", ");
  return region;
}

function uvLabel(uv) {
  const v = Math.round(uv);
  const level = v >= 11 ? "Extreme" : v >= 8 ? "Very high" : v >= 6 ? "High" : v >= 3 ? "Moderate" : "Low";
  return `${v} · ${level}`;
}

let requestId = 0;
async function loadWeather() {
  const id = ++requestId;
  setStatus(`Tuning in to ${state.place.name}… 📻`);
  try {
    const data = await fetchForecast(state.place, state.unit);
    if (id !== requestId) return; // a newer request superseded this one
    render(data);
    setStatus("");
  } catch (err) {
    if (id !== requestId) return;
    console.error(err);
    setStatus("Couldn't reach the weather service. Check your connection and try again.", true);
  }
}

function setPlace(place) {
  state.place = place;
  loadWeather();
}

// ---------- Search ----------
const form = $("search-form");
const input = $("search-input");
const resultsEl = $("search-results");

function hideResults() {
  resultsEl.hidden = true;
  resultsEl.replaceChildren();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (q.length < 2) {
    setStatus("Type at least 2 letters to search.", true);
    return;
  }
  setStatus(`Searching for “${q}”…`);
  try {
    const places = await searchPlaces(q);
    resultsEl.replaceChildren();
    if (places.length === 0) {
      hideResults();
      setStatus(`No places found for “${q}”.`, true);
      return;
    }
    setStatus("");
    for (const p of places) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "option");
      btn.innerHTML = `<strong></strong><br /><small></small>`;
      btn.querySelector("strong").textContent = p.name;
      btn.querySelector("small").textContent = p.region;
      btn.addEventListener("click", () => {
        hideResults();
        input.value = "";
        setPlace(p);
      });
      li.append(btn);
      resultsEl.append(li);
    }
    resultsEl.hidden = false;
    resultsEl.querySelector("button").focus();
  } catch (err) {
    console.error(err);
    setStatus("Search is unavailable right now. Try again in a moment.", true);
  }
});

document.addEventListener("click", (e) => {
  if (!form.contains(e.target)) hideResults();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideResults();
});

// ---------- Buttons ----------
$("boca-btn").addEventListener("click", () => setPlace(BOCA));

$("locate-btn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Your browser doesn't support location.", true);
    return;
  }
  setStatus("Finding you… 🛰️");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setPlace({
        name: "Your location",
        region: "",
        latitude: Number(pos.coords.latitude.toFixed(4)),
        longitude: Number(pos.coords.longitude.toFixed(4)),
      });
    },
    () => setStatus("Couldn't get your location. Showing the current place instead.", true),
    { timeout: 10000, maximumAge: 600000 },
  );
});

document.querySelectorAll(".unit").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.unit === state.unit) return;
    state.unit = btn.dataset.unit;
    savePref("unit", state.unit);
    syncUnitButtons();
    loadWeather();
  });
});

function syncUnitButtons() {
  document.querySelectorAll(".unit").forEach((b) => {
    const active = b.dataset.unit === state.unit;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
}

// ---------- Init ----------
(function init() {
  syncUnitButtons();
  loadWeather();
})();
