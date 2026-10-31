/* S4W Nepal - CSV Flood Observations */

const floodObservationLayer = L.layerGroup().addTo(map);
// Separate map layer for sponsor observations awaiting review.
const sponsorPreviewLayer = L.layerGroup().addTo(map);

const sponsorPreviewIcon = L.divIcon({
    className: "sponsor-preview-marker",
    html: '<div style="background:#0077cc;width:16px;height:16px;border:2px solid white;border-radius:50%;box-shadow:0 1px 5px #555;"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

layerControl.addOverlay(floodObservationLayer, "Flood evidence");
layerControl.addOverlay(sponsorPreviewLayer, "Sponsor observations (Pending Review)");

let approvedObservations = [];
// Sponsor observations awaiting verification or permission approval.
// Keep these separate from the public map markers.
let pendingSponsorObservations = [];

const watershedFilter = document.getElementById("watershedFilter");
const riverFilter = document.getElementById("riverFilter");
const locationFilter = document.getElementById("locationFilter");
const evidenceFilter = document.getElementById("evidenceFilter");

const evidenceTypes = [
    "Image",
    "Video",
    "News Report",
    "Official Report",
    "Not Provided"
]

if (evidenceFilter) {
    evidenceFilter.replaceChildren(
        new Option("All Evidence Types", "all")
    );

    evidenceTypes.forEach(type => {
        evidenceFilter.add(new Option(type, type));
    });
}

// Cache each request so dropdown updates do not repeatedly fetch the files.
const filterGeojsonCache = new Map();

function loadFilterGeojson(path) {
    if (!filterGeojsonCache.has(path)) {
        const request = fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(
                        `Could not load ${path}: HTTP ${response.status}`
                    );
                }

                return response.json();
            })
            .then(data => {
                if (
                    data.type !== "FeatureCollection" ||
                    !Array.isArray(data.features)
                ) {
                    throw new Error(`Invalid GeoJSON: ${path}`);
                }

                return data;
            })
            .catch(error => {
                // Allow a later call to retry a failed request.
                filterGeojsonCache.delete(path);
                throw error;
            });

        filterGeojsonCache.set(path, request);
    }

    return filterGeojsonCache.get(path);
}

async function populateObservationFilters() {
    // Populate a dropdown from an array of names.
    function fillDropdown(
        select,
        values,
        defaultLabel,
        normalize = value => String(value ?? "").trim()
    ) {
        if (!select) return;

        const previousValue = select.value;
        const normalizedPrevious = normalize(previousValue);

        const names = [...new Set(
            values.map(normalize).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        select.replaceChildren(new Option(defaultLabel, "all"));

        names.forEach(name => {
            const label = name.replace(/\b\w/g, c => c.toUpperCase());
            select.add(new Option(label, name));
        });

        select.value = names.includes(normalizedPrevious)
            ? normalizedPrevious
            : "all";

        if (select.value !== previousValue) {
            select.dispatchEvent(new Event("change"));
        }
    }

    // Locations still come from the approved CSV observations.
    fillDropdown(
        locationFilter,
        approvedObservations.map(observation => observation.location_name),
        "All Locations"
    );

    // Load each dropdown independently so one failure does not block another.
    await Promise.all([
        populateFromGeojson(
            riverFilter,
            "data/geojson/rivers.geojson",
            ["river", "name:en", "name"],
            "All Rivers"
        ),

        populateFromGeojson(
            watershedFilter,
            "data/geojson/watersheds.geojson", // Use your actual filename.
            ["watershed", "name:en", "name"],  // Use its actual name property.
            "All Watersheds"
        )
    ]);

    function normalizeRiverName(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    }

    async function populateFromGeojson(
        select,
        path,
        propertyNames,
        defaultLabel
    ) {
        if (!select) return;

        try {
            const data = await loadFilterGeojson(path);

            const names = data.features.map(feature => {
                const properties = feature.properties || {};

                // Use the first available, nonblank name property.
                for (const property of propertyNames) {
                    const value = String(properties[property] ?? "").trim();

                    if (value !== "") {
                        return value;
                    }
                }

                return "";
            });

            fillDropdown(
                select, 
                names, 
                defaultLabel, 
                select.id === "riverFilter" ? normalizeRiverName : undefined
            );
        } catch (error) {
            console.error(`Unable to populate ${select.id}:`, error);
        }
    }
}

function filterObservations() {
    const selectedWatershed = watershedFilter?.value || "all";
    const selectedRiver = riverFilter?.value || "all";
    const selectedLocation = locationFilter?.value || "all";
    const selectedEvidence = evidenceFilter?.value || "all";

    const startDate =
        document.getElementById("startDateFilter")?.value || "";

    const endDate =
        document.getElementById("endDateFilter")?.value || "";

    // Show an error if the date range is reversed.
    const invalidRange = Boolean(
        startDate && endDate && startDate > endDate
    );

    const errorElement = document.getElementById("dateFilterError");

    if (errorElement) {
        errorElement.hidden = !invalidRange;
        errorElement.textContent = invalidRange
            ? "Start date must be on or before the end date."
            : "";
    }

    if (invalidRange) {
        return [];
    }

    // Ignore capitalization and surrounding spaces when comparing values.
    function normalize(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function matches(selected, actual) {
        return selected === "all" ||
            normalize(actual) === normalize(selected);
    }

    return approvedObservations.filter(obs => {
        const evidenceType =
            String(obs.evidence_type ?? "").trim() || "Not Provided";

        const date = String(obs.date ?? "").trim();

        // Include both boundary dates.
        // Exclude undated observations when a date limit is selected.
        const matchesDate =
            (!startDate && !endDate) ||
            (
                date !== "" &&
                (!startDate || date >= startDate) &&
                (!endDate || date <= endDate)
            );

        return (
            matches(selectedWatershed, obs.watershed) &&
            matches(selectedRiver, obs.river) &&
            matches(selectedLocation, obs.location_name) &&
            matches(selectedEvidence, evidenceType) &&
            matchesDate
        );
    });
}

function renderFloodObservations() {
    floodObservationLayer.clearLayers();

    filterObservations().forEach(observation => {
        const lat = Number(observation.latitude);
        const lng = Number(observation.longitude);

        if (
            !observation.latitude?.trim() ||
            !observation.longitude?.trim() ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180
        ) {
            return;
        }

        const marker = L.marker([lat, lng]);
        const popup = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent =
            observation.event_name || "Flood Observation";
        popup.appendChild(title);

        const fields = [
            ["Date", "date"],
            ["River", "river"],
            ["Watershed", "watershed"],
            ["Location", "location_name"],
            ["Description", "description"],
            ["Impact", "impact"],
            ["Photo credit", "photo_credit"]
        ];

        fields.forEach(([label, key]) => {
            if (!observation[key]) return;

            const p = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = label + ": ";
            p.appendChild(strong);
            p.appendChild(
                document.createTextNode(observation[key])
            );

            popup.appendChild(p);
        });

        const filename =
            (observation.photo_filename || "").trim();

        if (/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
            const img = document.createElement("img");

            img.src = "media/observations/" + filename;
            img.alt = observation.location_name
                ? "Flooding at " + observation.location_name
                : "Flood observation photograph";

            img.loading = "lazy";
            img.style.width = "100%";
            img.style.maxWidth = "320px";
            img.style.maxHeight = "240px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "8px";
            img.style.marginTop = "10px";

            popup.appendChild(img);
        }

        if (observation.source_url) {
            try {
                const url = new URL(observation.source_url);

                if (
                    url.protocol === "https:" ||
                    url.protocol === "http:"
                ) {
                    const link = document.createElement("a");

                    link.href = url.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = "View original source";

                    popup.appendChild(link);
                }
            } catch (error) {
                console.warn(
                    "Invalid source URL:",
                    observation.source_url
                );
            }
        }

        marker.bindPopup(popup);
        marker.addTo(floodObservationLayer);
    });

    console.log(
        "S4W flood observations displayed:",
        floodObservationLayer.getLayers().length
    );
}

function renderSponsorObservations() {
    sponsorPreviewLayer.clearLayers();

    pendingSponsorObservations.forEach(function(observation) {
        const lat = Number(observation.latitude);
        const lng = Number(observation.longitude);

        if (
            !String(observation.latitude ?? "").trim() ||
            !String(observation.longitude ?? "").trim() ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180
        ) {
            return;
        }

        const marker = L.marker([lat, lng]);

        const popup = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent = observation.location_name || "Sponsor observation";

        const status = document.createElement("p");
        status.textContent = "Pending verification — sponsor-provided observation";

        const details = document.createElement("p");
        details.textContent =
            "Date: " + (observation.date || "Unknown") +
            " | River: " + (observation.river || "Unknown");

        popup.append(title, status, details);

        if (observation.source_url) {
            try {
                const url = new URL(observation.source_url);

                if (["https:", "http:"].includes(url.protocol)) {
                    const link = document.createElement("a");
                    link.href = url.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = "View original source";
                    popup.appendChild(link);
                }
            } catch (error) {
                console.warn("Invalid sponsor source URL");
            }
        }

        marker.bindPopup(popup);
        marker.addTo(sponsorPreviewLayer);
    });
}
function loadFloodObservations() {
    Papa.parse("data/evidence/flood_observations.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,

        complete: function(results) {
            // Keep public observations restricted to approved records.
            // Sponsor records marked pending will be previewed separately.
            pendingSponsorObservations = results.data.filter(
                observation =>
                    observation.observation_id?.startsWith("SPONSOR-") &&
                    (
                        observation.permission_status?.trim().toLowerCase() !== "approved" ||
                        observation.verification_status?.trim().toLowerCase() !== "approved"
                    )
            );
            console.log(
                "Pending sponsor observations:",
                pendingSponsorObservations.length
            );
            approvedObservations = results.data.filter(
                observation =>
                    observation.permission_status
                        ?.trim()
                        .toLowerCase() === "approved" &&
                    observation.verification_status
                        ?.trim()
                        .toLowerCase() === "approved"
            );

            populateObservationFilters();
            renderFloodObservations();
            renderSponsorObservations();
        },

        error: function(error) {
            console.error("CSV loading error:", error);
        }
    });
}


["startDateFilter", "endDateFilter"].forEach(id => {
    document.getElementById(id)?.addEventListener(
        "change",
        renderFloodObservations
    );
});

[
    watershedFilter,
    riverFilter,
    locationFilter,
    evidenceFilter
].forEach(select => {
    select?.addEventListener("change", renderFloodObservations);
});

loadFloodObservations();
