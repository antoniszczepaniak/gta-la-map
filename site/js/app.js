// Kategorie miejsc: nazwa wyświetlana i kolor znacznika
const CATEGORIES = {
  landmark:  { label: "Zabytki",    color: "#e8b923" },
  district:  { label: "Dzielnice",  color: "#6cbf4b" },
  culture:   { label: "Kultura",    color: "#c86bdb" },
  transport: { label: "Transport",  color: "#4aa3df" },
};

// Mapa wycentrowana na Los Angeles
const map = L.map("map").setView([34.03, -118.35], 11);

// Klucz Google Maps przychodzi z /config.js, który generuje kontener
// na podstawie zmiennej środowiskowej GOOGLE_MAPS_API_KEY (patrz README).
const GOOGLE_KEY = (window.APP_CONFIG && window.APP_CONFIG.googleMapsKey) || "";

// Darmowe podkłady mapy, które nie wymagają klucza
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const freeLayers = {
  "Mapa (Esri)": L.tileLayer(`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, {
    attribution: "Tiles &copy; Esri", maxZoom: 19,
  }),
  "Satelita (Esri)": L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
    attribution: "Tiles &copy; Esri", maxZoom: 19,
  }),
  "OpenStreetMap": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors", maxZoom: 19,
  }),
};

// Ładuje skrypt Google Maps i czeka, aż będzie gotowy
function loadGoogleMaps(key) {
  return new Promise((resolve, reject) => {
    window.__onGoogleMapsLoaded = resolve;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=__onGoogleMapsLoaded`;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function setupBaseLayers() {
  let layers = { ...freeLayers };
  let defaultLayer = freeLayers["Mapa (Esri)"];

  if (GOOGLE_KEY) {
    try {
      await loadGoogleMaps(GOOGLE_KEY);
      const google = {
        "Google – mapa":    L.gridLayer.googleMutant({ type: "roadmap" }),
        "Google – satelita": L.gridLayer.googleMutant({ type: "satellite" }),
        "Google – hybryda":  L.gridLayer.googleMutant({ type: "hybrid" }),
      };
      layers = { ...google, ...freeLayers };
      defaultLayer = google["Google – mapa"];
    } catch (err) {
      console.error("Nie udało się załadować Google Maps, używam darmowej mapy.", err);
    }
  }

  defaultLayer.addTo(map);
  L.control.layers(layers, null, { position: "topright" }).addTo(map);
}

let places = [];
const markers = {};                       // id miejsca -> znacznik na mapie
const activeCategories = new Set(Object.keys(CATEGORIES));

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Jedno zdjęcie w okienku: obrazek + podpis. Jeśli pliku nie ma, pokazuje się zaślepka.
function photoHtml(image, label, placeholder) {
  const caption = image && image.author
    ? `<a href="${escapeHtml(image.source)}" target="_blank" rel="noopener">
         ${escapeHtml(image.author)} · ${escapeHtml(image.license)}</a>`
    : "";
  const img = image
    ? `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(label)}" loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('div'),
             {className:'photo-missing', textContent:'${placeholder}'}))">`
    : `<div class="photo-missing">${placeholder}</div>`;
  return `
    <figure class="photo">
      ${img}
      <figcaption><strong>${escapeHtml(label)}</strong>${caption}</figcaption>
    </figure>`;
}

function popupHtml(place) {
  const real = place.images && place.images.real;
  const realLabel = real && real.year ? `Zdjęcie z ${real.year} r.` : "Zdjęcie";
  return `
    <div class="popup">
      <h3>${escapeHtml(place.gtaName)}</h3>
      <div class="real">📍 ${escapeHtml(place.realName)}</div>
      <p>${escapeHtml(place.description)}</p>
      ${real ? photoHtml(real, realLabel, "Brak zdjęcia") : ""}
    </div>`;
}

// Powiększanie zdjęcia po kliknięciu
const lightbox = document.getElementById("lightbox");
document.addEventListener("click", (e) => {
  if (e.target.matches(".photo img")) {
    lightbox.querySelector("img").src = e.target.src;
    lightbox.hidden = false;
  } else if (e.target.closest("#lightbox")) {
    lightbox.hidden = true;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") lightbox.hidden = true;
});

function createMarker(place) {
  const { color } = CATEGORIES[place.category];
  const marker = L.circleMarker([place.lat, place.lng], {
    radius: 9,
    color: "#111",
    weight: 2,
    fillColor: color,
    fillOpacity: 0.95,
  });
  marker.bindPopup(() => popupHtml(place), { maxWidth: 360, minWidth: 300 });
  marker.bindTooltip(place.gtaName);
  return marker;
}

function renderFilters() {
  const container = document.getElementById("filters");
  container.innerHTML = "";
  for (const [key, { label, color }] of Object.entries(CATEGORIES)) {
    const btn = document.createElement("button");
    btn.className = "filter" + (activeCategories.has(key) ? " active" : "");
    btn.textContent = label;
    if (activeCategories.has(key)) btn.style.background = color;
    btn.onclick = () => {
      activeCategories.has(key) ? activeCategories.delete(key) : activeCategories.add(key);
      renderFilters();
      update();
    };
    container.appendChild(btn);
  }
}

// Pokazuje tylko miejsca pasujące do wyszukiwania i włączonych filtrów
function update() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  const list = document.getElementById("place-list");
  list.innerHTML = "";

  for (const place of places) {
    const matchesText =
      place.gtaName.toLowerCase().includes(query) ||
      place.realName.toLowerCase().includes(query);
    const visible = matchesText && activeCategories.has(place.category);
    const marker = markers[place.id];

    if (!visible) {
      map.removeLayer(marker);
      continue;
    }
    marker.addTo(map);

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="gta"><span class="dot" style="background:${CATEGORIES[place.category].color}"></span>${escapeHtml(place.gtaName)}</div>
      <div class="real">${escapeHtml(place.realName)}</div>
    `;
    li.onclick = () => {
      map.flyTo([place.lat, place.lng], 15);
      marker.openPopup();
    };
    list.appendChild(li);
  }
}

async function init() {
  setupBaseLayers();

  const response = await fetch("data/places.json");
  places = await response.json();
  places.sort((a, b) => a.gtaName.localeCompare(b.gtaName));

  for (const place of places) markers[place.id] = createMarker(place);

  document.getElementById("search").addEventListener("input", update);
  renderFilters();
  update();
}

init();
