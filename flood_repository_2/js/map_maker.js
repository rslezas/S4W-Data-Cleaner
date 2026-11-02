
const DATA_PATHS = {
    rivers: "data/geojson/rivers.geojson",
    watersheds: "data/geojson/watersheds.geojson",
    events: "data/events.csv",
    observations: "data/observations.csv"
};

const map = L.map("map").setView([27.7172, 85.3240], 11);
for (const [name, zIndex] of Object.entries({
    watershedsPane: 410,
    riversPane: 420,
    eventsPane: 430,
    observationsPane: 440
})) {
    map.createPane(name);
    map.getPane(name).style.zIndex = zIndex;
}
// map.createPane("municipalitiesPane");
// map.getPane("municipalitiesPane").style.zIndex = 400;

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
const layerControl = L.control.layers(null, null, {
    collapsed: true,
    position: "topright"
}).addTo(map);

function getFilters() {
    return {
        event: document.getElementById("eventFilter")?.value || "all",
        river: document.getElementById("riverFilter")?.value || "all",
        watershed: document.getElementById("watershedFilter")?.value || "all",
        evidence: document.getElementById("evidenceFilter")?.value || "all"
    };
}

function normalize(value) {
    return String(value ?? "").normalize("NFKC").trim()
        .toLowerCase().replace(/\s+/g, " ");
}

function normalizeRiverName(value) {
    const name = normalize(value);
    // Explicit aliases preserve multiword names and distinct waterways.
    const aliases = {
        bagmati: "bagmati river", bishnumati: "bishnumati river",
        dhobi: "dhobi khola", nakkhu: "nakkhu khola",
        hanumante: "hanumante khola", manohara: "manohara khola",
        manahara: "manohara khola", "manahara khola": "manohara khola"
    };
    return aliases[name] ?? name;
}

function matches(selected, value, normalizer = normalize) {
    return selected === "all" || normalizer(selected) === normalizer(value);
}

function featureName(feature, field) {
    const p = feature.properties || {};
    return [p[field], p["name:en"], p.name]
        .map(value => String(value ?? "").trim()).find(Boolean) || "";
}

function popup(title, fields = []) {
    const element = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = title;
    element.appendChild(heading);
    fields.forEach(([label, value]) => {
        if (value == null || value === "") {
            return;
        }
        const p = document.createElement("p");
        p.textContent = `${label}: ${value}`;
        element.appendChild(p);
    });
    return element;
}

// Create and register each layer once. Refreshes preserve layer-menu toggles.
const riversLayer = L.geoJSON(null, {
    pane: "riversPane",
    style: { color: "#0c5f9a", weight: 3, opacity: 1 },
    onEachFeature: (f, layer) => layer.bindPopup(popup("River/Stream: " + featureName(f, "river")))
}).addTo(map);

const watershedsLayer = L.geoJSON(null, {
    pane: "watershedsPane",
    style: { color: "#e18804", fillOpacity: 0.2, weight: 2, opacity: 0.8 },
    onEachFeature: (f, layer) => layer.bindPopup(popup("Watershed: " + featureName(f, "watershed")))
}).addTo(map);

// Pin colours for each evidence category.
const evidenceColors = {
    "image": "#2563eb",
    "video": "#dc2626",
    "social media link": "#9333ea",
    "news report": "#16a34a",
    "official report": "#d97706",
    "government report": "#d97706",
    "not provided": "#64748b"
};

const evidenceLegend = createEvidenceLegend(evidenceColors);
evidenceLegend.addTo(map);

// Reuse icons instead of rebuilding one for every point.
const pinIcons = new Map();

function getPinIcon(color) {
    if (pinIcons.has(color)) {
        return pinIcons.get(color);
    }

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="33"
            viewBox="0 0 32 44"
        >
            <path
                d="M16 1
                   C8 1 1 8 1 16
                   C1 27 16 42 16 42
                   C16 42 31 27 31 16
                   C31 8 24 1 16 1 Z"
                fill="${color}"
                stroke="white"
                stroke-width="2"
            />
            <circle cx="16" cy="16" r="5" fill="white" />
        </svg>
    `;

    const icon = L.icon({
        iconUrl: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
        iconSize: [24, 33],
        iconAnchor: [12, 31.5],
        popupAnchor: [0, -28]
    });

    pinIcons.set(color, icon);

    return icon;
}

function makePointLayer(pane, color, isEvent = false) {
    const layer = L.geoJSON(null, {
        pointToLayer: function (feature, latlng) {
            const properties = feature.properties || {};

            const evidenceType = String(
                properties.evidence_type ||
                properties.evidenceType ||
                "Not Provided"
            )
                .trim()
                .toLowerCase();

            // Events retain their layer colour.
            // Evidence receives a colour based on its type.
            const pinColor = isEvent ? color : evidenceColors[evidenceType] || evidenceColors["not provided"];

            return L.marker(latlng, {
                pane: pane,
                icon: getPinIcon(pinColor),

                // Text available on hover and to assistive technology.
                title: isEvent ? "Flood event" : `Flood evidence: ${evidenceType}`,
                alt: isEvent ? "Flood event" : `Flood evidence: ${evidenceType}`
            });
        },

        onEachFeature: function (feature, marker) {
            const properties = feature.properties;
            const id = eventId(properties);
            const parentEvent = eventRecords.get(id);
            const fields = [];

            let title = isEvent ? 
                properties.event_name || "Untitled event" : 
                properties.observation_title || properties.event_name + " observation";

            const content = document.createElement("article");
            content.className = "evidence-card";

            content.innerHTML = `
                <h3 class="evidence-title"></h3>
                <div class="evidence-media"></div>
                <a class="evidence-link" target="_blank"
                rel="noopener noreferrer" hidden>
                    View original source ↗
                </a>
            `;

            content.querySelector(".evidence-title").textContent = title;

            const media = content.querySelector(".evidence-media");
            const link = content.querySelector(".evidence-link");
            const evidenceType =
                String(properties.evidence_type || "").trim().toLowerCase();

            try {
                const url = new URL(properties.source_url);

                if (["https:", "http:"].includes(url.protocol)) {
                    // Always provide a link to the original source.
                    link.href = url.href;
                    link.hidden = false;

                    if (evidenceType === "image") {
                        const image = document.createElement("img");

                        image.src = url.href;
                        image.alt = properties.description || "Flood evidence";
                        image.loading = "lazy";

                        // Keep the source link if the image cannot load.
                        image.addEventListener("error", () => image.remove());

                        media.appendChild(image);
                    } else if (evidenceType === "video") {
                        const video = document.createElement("video");

                        video.src = url.href;
                        video.controls = true;
                        video.preload = "metadata";

                        media.appendChild(video);
                    }
                }
            } catch {
                console.warn("Missing or invalid source URL:", properties.source_url);
            }

            // Display your custom element inside Leaflet's popup.
            marker.bindPopup(content, {
                className: "custom-popup",
                maxWidth: 420
            });
        }
    });

    return layer.addTo(map);
}

const eventsLayer = makePointLayer("eventsPane", "#000000", true);
const observationsLayer = makePointLayer("observationsPane", "#56a7e0");

[
    [riversLayer, "Rivers and streams"], [watershedsLayer, "Watersheds"],
    [eventsLayer, "Flood Events"], [observationsLayer, "Flood Observations"]
].forEach(([layer, label]) => layerControl.addOverlay(layer, label));

// Registry includes documented events even when their coordinates are missing.
const eventRecords = new Map();

function eventId(record) {
    return String(record.event_id ?? "").trim();
}

function matchesEvent(selected, record) {
    return selected === "all" || eventId(record) === selected;
}

const layerData = {
    rivers: [],
    watersheds: [],
    events: [],
    observations: []
};

// Shared refresh reads the controls once; no network calls or new layers.
function refreshLayers() {
    const selected = getFilters();

    renderRiversLayer(selected);
    renderWatershedsLayer(selected);
    renderEventsLayer(selected);
    renderObservationsLayer(selected);

    // Automatically zoom to the selected flood event's observations.
    if (selected.event !== "all" && observationsLayer.getLayers().length > 0) {
        map.invalidateSize();
        map.fitBounds(observationsLayer.getBounds(), {
            padding: [30, 30],
            maxZoom: 14
        });
    }
}

function replaceFeatures(layer, features) {
    layer.clearLayers();
    layer.addData({ type: "FeatureCollection", features });
}

function renderRiversLayer(selected) {
    replaceFeatures(riversLayer, layerData.rivers.filter(feature => {
        const name = featureName(feature, "river");
        return ["LineString", "MultiLineString"].includes(feature.geometry?.type)
            && name !== "" && !/^unnamed\b/i.test(name)
            && matches(selected.river, name, normalizeRiverName);
    }));
}

function renderWatershedsLayer(selected) {
    replaceFeatures(watershedsLayer, layerData.watersheds.filter(feature =>
        ["Polygon", "MultiPolygon"].includes(feature.geometry?.type)
        && matches(selected.watershed, featureName(feature, "watershed"))
    ));
}

function renderEventsLayer(selected) {
    // Event selection controls regional event references; evidence-specific
    // filters apply to observations, not the regional reference marker.
    replaceFeatures(eventsLayer, layerData.events.filter(feature =>
        matchesEvent(selected.event, feature.properties)
    ));
}

function renderObservationsLayer(selected) {
    const matchingEvidence = layerData.observations.filter(function (feature) {
        const properties = feature.properties;

        // Link evidence to its parent event by ID, never by its title.
        const matchesParentEvent = matchesEvent(selected.event, properties);
        const matchesRiver = matches(
            selected.river,
            properties.river,
            normalizeRiverName
        );
        const matchesWatershed = matches(selected.watershed, properties.watershed);
        const matchesEvidenceType = matches(
            selected.evidence,
            properties.evidence_type || "Not Provided"
        );

        return matchesParentEvent && matchesRiver &&
            matchesWatershed && matchesEvidenceType;
    });

    replaceFeatures(observationsLayer, matchingEvidence);
}

// Papa Parse cannot parse JSON/GeoJSON. XMLHttpRequest avoids fetch while
// retaining the original geographic files and events.json without conversion.
function loadJSON(path) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", path);
        request.timeout = 30000;
        request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
                reject(new Error(`${path}: HTTP ${request.status}`));
                return;
            }
            try {
                resolve(JSON.parse(request.responseText.replace(/^\uFEFF/, "")));
            } catch (error) {
                reject(new Error(`${path}: invalid JSON (${error.message})`));
            }
        };
        request.onerror = () => reject(new Error(`${path}: network error`));
        request.ontimeout = () => reject(new Error(`${path}: request timed out`));
        request.send();
    });
}

function loadCSV(path) {
    return new Promise((resolve, reject) => {
        Papa.parse(path, {
            download: true,
            header: true,
            skipEmptyLines: "greedy",

            // Remove surrounding spaces and any leading BOM.
            transformHeader: header =>
                header.replace(/^\uFEFF/, "").trim(),

            complete: results => {
                if (results.errors.length > 0) {
                    reject(new Error(
                        `${path}: ${results.errors[0].message}`
                    ));
                    return;
                }

                resolve(results.data);
            },

            error: error => {
                reject(new Error(`${path}: ${error.message}`));
            }
        });
    });
}

function geographicFeatures(data) {
    if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("Expected a GeoJSON FeatureCollection.");
    }
    return data.features;
}

// Load independent files once. Each loader stores data in its own collection.
async function loadRivers() {
    const data = await loadJSON(DATA_PATHS.rivers);
    layerData.rivers = geographicFeatures(data);
}

async function loadWatersheds() {
    const data = await loadJSON(DATA_PATHS.watersheds);
    layerData.watersheds = geographicFeatures(data);
}

async function loadEvents() {
    const events = await loadCSV(DATA_PATHS.events);

    eventRecords.clear();
    events.forEach(function (event) {
        event.name = event.event_name || "Unnamed Event";
        eventRecords.set(event.event_id, event);
    });

    layerData.events = observationsToGeoJSON(events).features;
}

async function loadObservations() {
    const observations = await loadCSV(DATA_PATHS.observations);

    layerData.observations = observationsToGeoJSON(observations).features;
}

async function initializeLayers() {

    populateEventFilter();

    const loaders = [loadRivers, loadWatersheds, loadEvents, loadObservations];
    const labels = ["Rivers", "Watersheds", "Events", "Evidence"];
    const results = await Promise.allSettled(loaders.map(function (load) {
        return load();
    }));
    const errors = [];

    results.forEach(function (result, index) {
        if (result.status === "rejected") {
            errors.push(`${labels[index]}: ${result.reason.message}`);
        }
    });

    if (errors.length > 0) {
        console.error("Map loading errors:", errors);

        const errorBox = document.createElement("p");
        errorBox.setAttribute("role", "alert");
        errorBox.textContent = "Some map data could not load. " + errors.join("; ");
        document.getElementById("map").insertAdjacentElement("afterend", errorBox);
    }

    const unlinkedEvidence = layerData.observations.filter(function (feature) {
        return !eventRecords.has(eventId(feature.properties));
    });

    if (unlinkedEvidence.length > 0) {
        console.warn(
            `${unlinkedEvidence.length} evidence records have missing or unknown event_id. ` +
            "They appear under All Events, but not under a specific event."
        );
    }

    populateFilters();
    refreshLayers();
}

["eventFilter", "riverFilter", "watershedFilter", "evidenceFilter"]
    .forEach(id => document.getElementById(id)?.addEventListener("change", refreshLayers));
initializeLayers();

/* Municipality loading remains disabled.
loadJSON("data/geojson/kathmandu_municipalities.geojson")
    .then(data => {
        const municipalityLayer = L.geoJSON(data, {
            pane: "municipalitiesPane",
            style: { color: "#8b5cf6", weight: 2, opacity: 0.8, fillOpacity: 0.03 },
            filter: feature => ["Polygon", "MultiPolygon"].includes(feature.geometry?.type),
            onEachFeature: (feature, layer) => layer.bindPopup(
                popup("Municipality: " + featureName(feature, "name"))
            )
        });
        layerControl.addOverlay(municipalityLayer, "Municipalities");
    })
    .catch(error => console.error("Municipality loading error:", error));
*/
