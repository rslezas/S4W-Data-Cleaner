
const data_paths = {
    rivers: "data/geojson/rivers.geojson",
    watersheds: "data/geojson/watersheds.geojson",
    events: "data/events.csv",
    observations: "data/processed_observations.csv",
    dhmReports: "data/event_dhm_reports.csv"
};

const map = L.map("map").setView([27.7172, 85.3240], 11);
for (const [name, zIndex] of Object.entries({
    watershedsPane: 410,
    riversPane: 420,
    eventsPane: 450,
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
        evidence: document.getElementById("evidenceFilter")?.value || "all",
        startDate: document.getElementById("startDateFilter")?.value || "",
        endDate: document.getElementById("endDateFilter")?.value || "",
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
    "video": "#dc2626"
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

function createEventPhotoGallery(properties) {
    const gallery = document.createElement("div");
    const eventId = String(properties.event_id || "").trim();

    const photos = Object.keys(properties)
        .filter(key => /^photos\/\d+$/.test(key))
        .sort((a, b) => Number(a.split("/")[1]) - Number(b.split("/")[1]))
        .map(key => String(properties[key] || "").trim())
        .filter(Boolean);

    if (photos.length === 0) {
        return gallery;
    }

    let currentPhoto = 0;

    const image = document.createElement("img");
    image.style.width = "100%";
    image.style.height = "180px";
    image.style.objectFit = "contain";
    image.style.borderRadius = "8px";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.justifyContent = "space-between";
    controls.style.alignItems = "center";
    controls.style.marginTop = "8px";

    const previous = document.createElement("button");
    previous.textContent = "Previous";

    const counter = document.createElement("span");

    const next = document.createElement("button");
    next.textContent = "Next";

    function showPhoto() {
        const photo = photos[currentPhoto];

image.src = /^https?:\/\//i.test(photo)
    ? photo
    : `media/${encodeURIComponent(eventId)}/${encodeURIComponent(photo)}`;
        image.alt = `Flood event photo ${currentPhoto + 1}`;
        counter.textContent = `${currentPhoto + 1} / ${photos.length}`;
    }

    previous.onclick = () => {
        currentPhoto = (currentPhoto - 1 + photos.length) % photos.length;
        showPhoto();
    };

    next.onclick = () => {
        currentPhoto = (currentPhoto + 1) % photos.length;
        showPhoto();
    };

    controls.append(previous, counter, next);
    gallery.append(image, controls);

    showPhoto();
    return gallery;
}

// Return a valid HTTP/HTTPS URL, or null.
function getPopupURL(value) {
    try {
        const url = new URL(String(value ?? "").trim());

        return ["http:", "https:"].includes(url.protocol)
            ? url
            : null;
    } catch {
        return null;
    }
}

// Read the evidence type consistently for both pins and popups.
function getPopupEvidenceType(properties) {
    return String(
        properties.evidence_type ||
        properties.evidenceType ||
        "Not Provided"
    ).trim().toLowerCase();
}

// Add a YouTube embed or a directly hosted video.
function appendPopupVideo(container, url, title) {
    const hostname = url.hostname.toLowerCase();

    const isYouTube = [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtu.be",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com"
    ].includes(hostname);

    if (isYouTube) {
        const parts = url.pathname.split("/").filter(Boolean);
        let videoId = url.searchParams.get("v");

        // Handle short links, Shorts, live streams, and embed URLs.
        if (hostname === "youtu.be" || hostname === "www.youtu.be") {
            videoId = parts[0];
        } else if (["shorts", "live", "embed"].includes(parts[0])) {
            videoId = parts[1];
        }

        if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
            const message = document.createElement("p");
            message.textContent = "YouTube preview unavailable.";
            container.appendChild(message);
            return;
        }

        const iframe = document.createElement("iframe");

        iframe.src = "https://www.youtube-nocookie.com/embed/" + videoId;
        iframe.title = title;
        iframe.style.cssText = "width:100%;height:200px;border:0;";
        iframe.allow = "encrypted-media; picture-in-picture; fullscreen";
        iframe.allowFullscreen = true;

        container.appendChild(iframe);
        return;
    }

    // Direct video URLs do not always end with a file extension.
    const video = document.createElement("video");

    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.setAttribute("aria-label", title);
    video.style.cssText = "display:block;width:100%;max-height:240px;";

    video.addEventListener("error", () => {
        const message = document.createElement("p");
        message.textContent = "Video preview unavailable.";

        video.replaceWith(message);
    }, { once: true });

    video.src = url.href;
    container.appendChild(video);
}

// Create a point layer with coloured pins and custom popups.
function makePointLayer(pane, color, isEvent = false) {
    const layer = L.geoJSON(null, {
        pointToLayer: function (feature, latlng) {
            const properties = feature.properties || {};
            const evidenceType = getPopupEvidenceType(properties);

            // Events keep their assigned colour; observations use their type.
            const pinColor = isEvent
                ? color
                : evidenceColors[evidenceType] || evidenceColors.image || color;

            const label = isEvent
                ? "Flood event"
                : `Flood evidence: ${evidenceType}`;

            return L.marker(latlng, {
                pane: pane,
                icon: getPinIcon(pinColor),
                title: label,
                alt: label
            });
        },

        onEachFeature: function (feature, marker) {
            const properties = feature.properties || {};
            const evidenceType = getPopupEvidenceType(properties);

            const title = isEvent
                ? properties.event_name || "Untitled event"
                : properties.observation_title || "Flood observation";

            // Build the popup structure. Insert submitted text with textContent.
            const content = document.createElement("article");
            content.className = "evidence-card";

            content.innerHTML = `
                <h3 class="evidence-title"></h3>
                <div class="evidence-media"></div>
                <a
                    class="evidence-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    hidden
                >
                    View original source
                </a>
            `;

            const media = content.querySelector(".evidence-media");
            const link = content.querySelector(".evidence-link");

            content.querySelector(".evidence-title").textContent = title;

            // The source link is independent of image and video URLs.
            const sourceURL = getPopupURL(properties.source_url) ||
                getPopupURL(properties.sourceUrl);

            if (sourceURL) {
                link.href = sourceURL.href;
                link.hidden = false;
            }

            if (isEvent) {
                // Events display their photo gallery and environmental context.
                content.style.maxHeight = "260px";
                content.style.overflowY = "auto";
                content.style.paddingRight = "8px";

                media.appendChild(createEventPhotoGallery(properties));

                const dhmContext = createDhmContext(eventId(properties));

                if (dhmContext) {
                    content.appendChild(dhmContext);
                }
            } else if (evidenceType === "image") {
                // Prefer the processed image URL, falling back to the source.
                const imageURL = getPopupURL(properties.image_url) || sourceURL;

                if (imageURL) {
                    const image = document.createElement("img");

                    image.alt = properties.description || title;
                    image.loading = "lazy";
                    image.style.cssText =
                        "display:block;width:100%;max-height:240px;object-fit:contain;";

                    // Keep the card and source link if the image fails.
                    image.addEventListener("error", () => {
                        image.remove();
                    }, { once: true });

                    image.src = imageURL.href;
                    media.appendChild(image);
                }
            } else if (evidenceType === "video") {
                // Prefer the processed video URL, falling back to the source.
                const videoURL = getPopupURL(properties.video_url) || sourceURL;

                if (videoURL) {
                    appendPopupVideo(media, videoURL, title);
                }
            }

            marker.bindPopup(content, {
                className: "custom-popup",
                maxWidth: 420,
                maxHeight: 350
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
    const errorBox = document.getElementById("dateFilterError");

    // Clear the previous error message.
    if (errorBox) {
        errorBox.hidden = true;
        errorBox.textContent = "";
    }

    try {
        // Only images and videos belong on the map.
        // News reports and social media links remain available in the gallery.
        const supportedFeatures = layerData.observations.filter(feature => {
            const evidenceType = normalize(
                feature.properties?.evidence_type
            );

            return ["image", "video"].includes(evidenceType);
        });

        // Apply the shared event, river, watershed, type, and date filters.
        const filteredObservations = get_filtered_observations(
            supportedFeatures.map(feature => feature.properties),
            {
                event: selected.event,
                river: selected.river,
                watershed: selected.watershed,
                observationType: selected.evidence,
                startDate: selected.startDate,
                endDate: selected.endDate,
                riverNormalizer: normalizeRiverName
            }
        );

        // Preserve each matching observation's original GeoJSON geometry.
        const matchingProperties = new Set(filteredObservations);

        const matchingFeatures = supportedFeatures.filter(feature =>
            matchingProperties.has(feature.properties)
        );

        replaceFeatures(observationsLayer, matchingFeatures);
    } catch (error) {
        // Clear stale markers and display the error.
        replaceFeatures(observationsLayer, []);

        console.error("Could not display observations:", error);

        if (errorBox) {
            errorBox.hidden = false;
            errorBox.textContent = error.message;
        }
    }
}

function geographicFeatures(data) {
    if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("Expected a GeoJSON FeatureCollection.");
    }
    return data.features;
}

// Load independent files once. Each loader stores data in its own collection.
async function loadRivers() {
    const data = await loadJSON(data_paths.rivers);
    layerData.rivers = geographicFeatures(data);
}

async function loadWatersheds() {
    const data = await loadJSON(data_paths.watersheds);
    layerData.watersheds = geographicFeatures(data);
}

async function loadEvents() {
    const events = await loadCSV(data_paths.events);

    eventRecords.clear();
    events.forEach(function (event) {
        event.name = event.event_name || "Unnamed Event";
        eventRecords.set(event.event_id, event);
    });

    layerData.events = observationsToGeoJSON(events).features;
}

async function loadObservations() {
    const observations = await loadCSV(data_paths.observations);

    layerData.observations = observationsToGeoJSON(observations).features;
}

async function initializeLayers() {

    populateEventFilter();

    const loaders = [loadRivers, loadWatersheds, loadEvents, loadObservations, loadDhmReports];
    const labels = ["Rivers", "Watersheds", "Events", "Evidence", "DHM Reports"];
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

[
    "eventFilter",
    "riverFilter",
    "watershedFilter",
    "evidenceFilter",
    "startDateFilter",
    "endDateFilter",
].forEach(id => {
    document.getElementById(id)?.addEventListener(
        "change",
        refreshLayers
    );
});

initializeLayers();
// DHM environmental context reports are loaded from CSV.
const eventDhmReports = {};

async function loadDhmReports() {
    const reports = await loadCSV(data_paths.dhmReports);

    reports.forEach(report => {
        if (report.event_id && report.url) {
            eventDhmReports[report.event_id] = {
                url: report.url,
                label: report.label
            };
        }
    });
}


function createDhmContext(eventId) {
    const report = eventDhmReports[eventId];
    if (!report) return null;

    const section = document.createElement("div");
    section.style.cssText = "margin-top:12px;padding-top:10px;border-top:1px solid #ddd;";

    const heading = document.createElement("strong");
    heading.textContent = "Environmental Context";
    
    const explanation = document.createElement("p");
    explanation.textContent = eventId === "FLOOD-2023-001"
    ? "DHM monthly rainfall report for August 2023, providing regional monsoon rainfall context for the Hanumante Khola flood."
    : [
        "FLOOD-2023-002",
        "FLOOD-2024-002",
        "FLOOD-2024-003",
        "FLOOD-2024-004",
        "FLOOD-2024-005",
        "FLOOD-2024-006",
        "FLOOD-2024-007",
        "FLOOD-2025-001"
      ].includes(eventId)
    ? "Regional rainfall information from DHM; not a direct measurement at the flood location."
    : "DHM situational report documenting the September 2024 extreme precipitation and flooding.";

    const link = document.createElement("a");
    link.href = report.url;
    link.textContent = report.label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    section.append(heading, explanation, link);
    return section;
}










