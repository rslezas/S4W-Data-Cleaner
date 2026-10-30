/* S4W Nepal - CSV Flood Observations */

const floodObservationLayer = L.layerGroup().addTo(map);

layerControl.addOverlay(floodObservationLayer, "Flood evidence");

let approvedObservations = [];

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

function populateObservationFilters() {
    const allRecords = approvedObservations;

    function fillDropdown(select, field, defaultLabel) {
        if (!select) return;

        const previousValue = select.value;

        const names = [...new Set(
            allRecords
                .map(obs => String(obs[field] || "").trim())
                .filter(Boolean)
        )].sort();

        select.replaceChildren(new Option(defaultLabel, "all"));

        names.forEach(name => {
            const capitalized = name.replace(/\b\w/g, c => c.toUpperCase())
            select.add(new Option(capitalized, name));
        });

        select.value = names.includes(previousValue)
            ? previousValue
            : "all";
    }

    fillDropdown(watershedFilter, "watershed", "All Watersheds");
    fillDropdown(riverFilter, "river", "All Rivers");
    fillDropdown(locationFilter, "location_name", "All Locations")
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

function loadFloodObservations() {
    Papa.parse("data/evidence/flood_observations.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,

        complete: function(results) {
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
