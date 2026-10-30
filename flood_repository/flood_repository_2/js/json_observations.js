
/* S4W Nepal - JSON Flood Observations */

const jsonObservationLayer = L.layerGroup().addTo(map);

let approvedJsonObservations = [];

function renderJsonObservations() {
    jsonObservationLayer.clearLayers();

    const selectedWatershed = watershedFilter?.value || "all";
    const selectedRiver = riverFilter?.value || "all";

    approvedJsonObservations.forEach(observation => {
        if (
            selectedWatershed !== "all" &&
            observation.watershed !== selectedWatershed
        ) return;

        if (
            selectedRiver !== "all" &&
            observation.river !== selectedRiver
        ) return;

        const latitude = Number(observation.latitude);
        const longitude = Number(observation.longitude);

        const marker = L.marker([latitude, longitude]);

        const popup = document.createElement("div");
        popup.className = "flood-observation-popup";

        const title = document.createElement("h3");
        title.textContent =
            observation.title ||
            observation.event_name ||
            "Flood Observation";
        popup.appendChild(title);

        const fields = [
            ["Event", observation.event_name],
            ["Date", observation.date],
            ["River", observation.river],
            ["Watershed", observation.watershed],
            ["Location", observation.location_name],
            ["Description", observation.description],
            ["Impacts", observation.impact],
            ["Photo credit", observation.photo_credit]
        ];

        fields.forEach(([label, value]) => {
            if (value == null || value === "") return;

            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = label + ": ";
            paragraph.appendChild(strong);
            paragraph.appendChild(
                document.createTextNode(String(value))
            );

            popup.appendChild(paragraph);
        });

        if (
            typeof observation.photo === "string" &&
            /^(?!\/)(?!.*\.\.)(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(
                observation.photo
            )
        ) {
            const image = document.createElement("img");

            image.src = observation.photo;
            image.alt = observation.location_name
                ? "Flooding at " + observation.location_name
                : "Flood observation photograph";
            image.loading = "lazy";
            image.style.maxWidth = "300px";
            image.style.width = "100%";

            popup.appendChild(image);
        }

        if (typeof observation.source_url === "string") {
            try {
                const source = new URL(observation.source_url);

                if (["http:", "https:"].includes(source.protocol)) {
                    const link = document.createElement("a");
                    link.href = source.href;
                    link.textContent = "View supporting source";
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    popup.appendChild(link);
                }
            } catch (_) {
                // Ignore invalid source URLs.
            }
        }

        marker.bindPopup(popup);
        marker.addTo(jsonObservationLayer);
    });

    console.log(
        "S4W JSON observation markers displayed:",
        jsonObservationLayer.getLayers().length
    );
}

async function loadJsonObservations() {
    try {
        const response = await fetch(
            "data/observations/manifest.json"
        );

        if (!response.ok) {
            throw new Error("Could not load observation manifest");
        }

        const manifest = await response.json();

        if (!Array.isArray(manifest.observations)) {
            throw new Error("Invalid observation manifest");
        }

        const loadedObservations = [];

        for (const filename of manifest.observations) {
            if (
                typeof filename !== "string" ||
                !/^[a-zA-Z0-9_-]+\.json$/i.test(filename)
            ) {
                continue;
            }

            const observationResponse = await fetch(
                "data/observations/" + filename
            );

            if (!observationResponse.ok) continue;

            const observation = await observationResponse.json();

            if (
                observation.publication_consent !== true ||
                observation.verified !== true
            ) {
                continue;
            }

            const latitude = Number(observation.latitude);
            const longitude = Number(observation.longitude);

            if (
                observation.latitude == null ||
                observation.longitude == null ||
                String(observation.latitude).trim() === "" ||
                String(observation.longitude).trim() === "" ||
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                latitude < -90 || latitude > 90 ||
                longitude < -180 || longitude > 180
            ) {
                continue;
            }

            loadedObservations.push(observation);
        }

        approvedJsonObservations = loadedObservations;

        window.approvedJsonObservations = approvedJsonObservations;

        populateObservationFilters();
        renderFloodObservations();
        renderJsonObservations();

    } catch (error) {
        console.error("JSON observation loading failed:", error);
    }
}

watershedFilter?.addEventListener(
    "change",
    renderJsonObservations
);

riverFilter?.addEventListener(
    "change",
    renderJsonObservations
);

loadJsonObservations();
