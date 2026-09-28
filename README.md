# Sunshine State Weather 🌴

A retro Florida / Miami-themed weather app, defaulting to **Boca Raton, FL** (home of FAU).
It uses the free [Open-Meteo](https://open-meteo.com/) APIs, so there are no API keys, logins, or backend.

## Features
- Current conditions: temperature, feels-like, humidity, wind, rain chance, UV index, sunrise/sunset
- Next-24-hour and 7-day forecasts
- City search (Open-Meteo Geocoding API)
- "My location" via browser geolocation, plus a "Back to Boca" button
- °F / °C toggle (remembered in the browser)

## Files
| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | Retro Miami theme (neon sunset, palm trees, synth grid) |
| `app.js` | Fetches and renders weather data |
| `favicon.svg` | Sunset icon |
| `netlify.toml` | Netlify config (publish directory, security headers) |

## Run locally
It's a plain static site, with no build step:
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to Netlify
**Option A — connect the GitHub repo (auto-deploys on every push)**
1. Log in at [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Choose **GitHub** and pick this repository and the branch to deploy.
3. Leave **Build command** empty and set **Publish directory** to `.` (these are already set in `netlify.toml`).
4. Click **Deploy**.

**Option B — drag and drop**
Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag this project folder onto the page.

**Option C — Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir .
```

Weather data by Open-Meteo, licensed CC BY 4.0.
