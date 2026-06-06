const GAS_URL = "https://script.google.com/macros/s/AKfycbx7o_tLvIskYeT2hag4yT0sdY2g8DTvHBoMCBNYXxZ3Xv5UA8Z9wroQhGAIGKXprXrpFw/exec";

const WEATHER_ROWS = [
  "Wind",
  "Cloud_cover_low(%)",
  "Temperature",
  "Dew_point",
  "Precipitation_probability(%)",
  "Precipitation(mm/hr)",
  "Rain(mm/hr)",
  "Snowfall(cm/hr)",
  "Weather_code",
  "Visibility(m)"
];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loadBtn").addEventListener("click", loadForecast);
  document.getElementById("refreshBtn").addEventListener("click", loadForecast);

  loadForecast();
});

async function loadForecast() {
  const aircraft = document.getElementById("aircraftSelect").value;
  const status = document.getElementById("status");
  const result = document.getElementById("result");

  status.textContent = "조회 중...";
  result.innerHTML = "";

  try {
    const url =
      `${GAS_URL}?action=timelineForecast&aircraft=${encodeURIComponent(aircraft)}&t=${Date.now()}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "조회 실패");
    }

    renderSets(data.sets || []);

    status.textContent =
      `${data.aircraft} / ${data.sets.length} SET 조회 완료 / Generated UTC ${data.generatedAtUtc}`;

  } catch (err) {
    status.textContent = "오류 발생";
    result.innerHTML = `
      <div class="error-box">
        ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function renderSets(sets) {
  const result = document.getElementById("result");

  if (!sets.length) {
    result.innerHTML = `<div class="empty-box">표시할 스케줄이 없습니다.</div>`;
    return;
  }

  result.innerHTML = sets.map(renderSet).join("");
}

function renderSet(set) {
  return `
    <section class="set-card">
      <div class="set-header">
        <div>
          <span class="set-no">SET ${set.setNo}</span>
          <span class="aircraft">${escapeHtml(set.aircraft)}</span>
          <span class="match">${escapeHtml(set.matchStatus || "")}</span>
        </div>
        <div class="row-info">
          Local Row ${escapeHtml(set.localRowNumber)} / UTC Row ${escapeHtml(set.utcRowNumber)}
        </div>
      </div>

      <div class="schedule-box">
        <div>
          <span class="label">Local</span>
          ${escapeHtml(set.localScheduleText)}
        </div>
        <div>
          <span class="label">UTC</span>
          ${escapeHtml(set.utcScheduleText)}
        </div>
      </div>

      <div class="forecast-pair">
        ${renderWeatherTable("DEP", set.dep)}
        ${renderWeatherTable("ARR", set.arr)}
      </div>
    </section>
  `;
}

function renderWeatherTable(type, item) {
  const forecast = item.forecast || {};
  const display = forecast.display || {};

  const timeText = `${item.localDate} ${item.localTime}`;
  const roundedText = `${forecast.roundedLocalDate || ""} ${forecast.roundedLocalTime || ""}`;

  const rows = WEATHER_ROWS.map(key => {
    const value = display[key] ?? "-";
    const cls = getValueClass(key, value);

    return `
      <tr>
        <th>${escapeHtml(key)}</th>
        <td class="${cls}">${escapeHtml(value)}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="wx-table">
      <thead>
        <tr>
          <th class="airport-cell">
            <div class="airport">${escapeHtml(item.airport)}</div>
            <div class="type">${escapeHtml(type)}</div>
          </th>
          <th>
            <div>${escapeHtml(timeText)}</div>
            <div class="rounded">Rounded: ${escapeHtml(roundedText)}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function getValueClass(key, value) {
  const text = String(value || "");

  if (key === "Wind") {
    const gust = extractGust(text);
    if (gust >= 25) return "danger";
    if (gust >= 20) return "caution";
  }

  if (key === "Cloud_cover_low(%)") {
    const n = parseFloat(text);
    if (n >= 80) return "caution";
  }

  if (key === "Precipitation_probability(%)") {
    const n = parseFloat(text);
    if (n >= 60) return "danger";
    if (n >= 40) return "caution";
  }

  if (key === "Precipitation(mm/hr)" || key === "Rain(mm/hr)") {
    const n = parseFloat(text);
    if (n >= 0.3) return "danger";
    if (n > 0) return "caution";
  }

  if (key === "Weather_code") {
    if (
      text.includes("비") ||
      text.includes("눈") ||
      text.includes("뇌우") ||
      text.includes("안개") ||
      text.includes("이슬비")
    ) {
      return "danger";
    }
  }

  if (key === "Visibility(m)") {
    const n = parseFloat(text);
    if (n > 0 && n < 5000) return "danger";
    if (n >= 5000 && n < 8000) return "caution";
  }

  return "";
}

function extractGust(windText) {
  const m = String(windText || "").match(/G(\d{2,3})KT/);
  if (!m) return 0;
  return Number(m[1]);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}