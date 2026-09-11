// Base URL of the FastAPI backend. Set REACT_APP_API_URL in .env for
// production; falls back to a typical local dev port.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * POST /chart — asks the backend to calculate the birth chart.
 */
export async function fetchBirthChart({ year, month, day, hour, minute, latitude, longitude }) {
  const res = await fetch(`${API_BASE_URL}/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, day, hour, minute, latitude, longitude }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(detail || `Chart request failed (${res.status})`);
  }

  return res.json();
}

/**
 * POST /chat — asks the backend's Gemini-powered assistant a question
 * about a previously generated chart.
 */
export async function fetchChatReply({ chart, question, history }) {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chart, question, history }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(detail || `Chat request failed (${res.status})`);
  }

  const data = await res.json();
  return data.reply;
}

/**
 * Looks up cities by name using Open-Meteo's free geocoding API
 * (no API key required) so we can turn a typed city name into
 * latitude/longitude for the backend.
 */
export async function searchCities(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=6&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).map((r) => ({
    id: String(r.id),
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
  }));
}