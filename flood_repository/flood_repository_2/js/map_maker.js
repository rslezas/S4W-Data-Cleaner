// Create a map centered on Kathmandu
const map = L.map('map').setView(
    [27.7172, 85.3240], 11
);

// Add OpenStreetMap map tiles
L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '&copy; OpenStreetMap contributors'
    }
).addTo(map);

// Load Kathmandu Valley rivers and streams from OpenStreetMap
fetch("data/geojson/kathmandu_rivers.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load river GeoJSON file");
        }
        return response.json();
})
    .then(data => {
        L.geoJSON(data, {
                style: {
                    color: "#0077cc",
                    weight: 2,
                    opacity: 0.8
                },
                onEachFeature: function(feature, layer) {
                    const name = feature.properties?.name || "Unnamed waterway";
                    layer.bindPopup("<strong>River/Stream:</strong> " + name);
                }
        }).addTo(map);

        console.log("Kathmandu Valley river layer loaded successfully");
})
    .catch(error => {
        console.error("Error loading river data:", error);
});
// Example location marker (NOT a verified flood event)

// Load municipality boundaries from OpenStreetMap
fetch("data/geojson/kathmandu_municipalities.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load municipality GeoJSON file");
        }
        return response.json();
})
    .then(data => {
        L.geoJSON(data, {
                style: {
                    color: "#8b5cf6",
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.03
                },
                onEachFeature: function(feature, layer) {
                    const properties = feature.properties || {};
                    const name =
                        properties["name:en"] ||
                        properties.name ||
                        "Unnamed administrative area";

                    layer.bindPopup(
                        "<strong>Administrative area:</strong> " +
                        name
                    );
                }
        }).addTo(map);

        console.log("Municipality boundaries loaded successfully");
})
    .catch(error => {
        console.error("Error loading municipality boundaries:", error);
});

// Load approved flood evidence from GeoJSON
const evidenceLayer = L.geoJSON(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng);
        },
        onEachFeature: function(feature, layer) {
            const properties = feature.properties || {};

            const title = document.createElement("strong");
            title.textContent =
                properties.description || "Flood evidence";

            const popup = document.createElement("div");
            popup.appendChild(title);

            const details = document.createElement("p");
            details.textContent =
                "Type: " + (properties.evidence_type || "Not specified") +
                " | Date: " + (properties.observed_date || "Unknown");

            popup.appendChild(details);
            layer.bindPopup(popup);
        }
}).addTo(map);

fetch("./data/evidence.geojson")
    .then(function(response) {
        if (!response.ok) {
            throw new Error("Could not load evidence.geojson");
        }
        return response.json();
})
    .then(function(data) {
        
        const publicEvidence = {
            type: "FeatureCollection",
            features: (data.features || []).filter(function(feature) {
                    return feature.properties?.verification_status === "approved" &&
                    feature.properties?.publication_consent === true;
            })
        };

        evidenceLayer.addData(publicEvidence);

        approvedEvidence = (data.features || []).filter(function(feature) {
                return feature.properties?.verification_status === "approved" &&
                feature.properties?.publication_consent === true;
        });

        displayEvidence();

        console.log("Approved flood evidence loaded successfully");
})
    .catch(function(error) {
        console.error("Error loading flood evidence:", error);
});

let floodEvents = [];

let approvedEvidence = [];

function displayEvidence() {
    const selectedEvent =
        document.getElementById("evidenceEventFilter").value;

    const evidenceList =
        document.getElementById("evidenceList");

    evidenceList.innerHTML = "";

    const filteredEvidence = approvedEvidence.filter(function(feature) {
            return selectedEvent === "all" ||
            feature.properties?.eventId === selectedEvent;
    });

    // Update map markers to match the selected flood event
    evidenceLayer.clearLayers();

    evidenceLayer.addData({
            type: "FeatureCollection",
            features: filteredEvidence
    });


    if (filteredEvidence.length === 0) {
        evidenceList.textContent =
            "No approved evidence is available for this flood event yet.";
        return;
    }

    filteredEvidence.forEach(function(feature) {
            const properties = feature.properties || {};

            const item = document.createElement("div");
            item.className = "event-item";

            const title = document.createElement("h3");
            title.textContent =
                properties.description || "Flood evidence";

            const details = document.createElement("p");
            details.textContent =
                "Type: " + (properties.evidence_type || "Not specified") +
                " | Date: " + (properties.observed_date || "Unknown");

            if (properties.photoUrl) {
                const photo = document.createElement("img");
                photo.src = properties.photoUrl;
                photo.alt = properties.description || "Flood evidence photograph";
                photo.loading = "lazy";
                photo.style.maxWidth = "100%";
                photo.style.maxHeight = "300px";
                photo.style.borderRadius = "6px";
                photo.style.marginTop = "10px";

                if (properties.videoUrl) {
                    const video = document.createElement("video");
                    video.src = properties.videoUrl;
                    video.controls = true;
                    video.preload = "metadata";
                    video.style.maxWidth = "100%";
                    video.style.maxHeight = "300px";
                    video.style.borderRadius = "6px";
                    video.style.marginTop = "10px";

                    item.appendChild(video);
                }

                if (properties.sourceUrl) {
                    const source = document.createElement("a");
                    source.href = properties.sourceUrl;
                    source.textContent = "View Supporting Source";
                    source.target = "_blank";
                    source.rel = "noopener noreferrer";
                    source.style.display = "block";
                    source.style.marginTop = "10px";

                    item.appendChild(source);
                }

                item.appendChild(photo);
            }

            item.append(title, details);
            evidenceList.appendChild(item);
    });
}

// Add a marker for every demonstration record

function displayTimeline(events) {
    const timeline = document.getElementById("eventTimeline");
    timeline.innerHTML = "";

    // Sort dated events from newest to oldest.
    // Events without dates appear at the bottom.
    const sortedEvents = [...events].sort(function(a, b) {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;

            return b.date.localeCompare(a.date);
    });

    if (sortedEvents.length === 0) {
        timeline.textContent =
            "No flood events match the selected filters.";
        return;
    }

    sortedEvents.forEach(function(event) {
            const item = document.createElement("div");
            item.className = "timeline-item";

            const date = document.createElement("p");
            date.className = "timeline-date";
            date.textContent =
                event.date || "Date not assigned";

            const title = document.createElement("h3");
            title.textContent = event.name;

            const location = document.createElement("p");
            location.textContent =
                "Location: " + event.location;

            const eventId = document.createElement("p");
            eventId.textContent =
                "Event ID: " + (event.eventId || "Not assigned");

            item.append(date, title, location, eventId);
            timeline.appendChild(item);
    });
}

// Display all events when the page first loads

fetch("./data/events.json")
    .then(
    function(response) {
        if (!response.ok) throw new Error("Could not load events.json");
        return response.json();
})

    .then(function(data) {
        floodEvents = data;

        // Populate the evidence dropdown from events.json
        const evidenceEventFilter =
            document.getElementById("evidenceEventFilter");

        evidenceEventFilter.innerHTML =
            '<option value="all">All Flood Events</option>';

        floodEvents.filter(function(event) {
                return !event.eventId.startsWith("DEMO-");
        })
            .forEach(function(event) {
                const option = document.createElement("option");
                option.value = event.eventId;
                option.textContent = event.name;
                evidenceEventFilter.appendChild(option);
        });

        displayEvents();
})
    .catch(function(error) {
        console.error(error);
        document.getElementById("eventCount").textContent =
            "Unable to load event data.";
});


document.getElementById("downloadDataBtn").addEventListener("click", function() {
        const jsonData = JSON.stringify(floodEvents, null, 2);

        const blob = new Blob([jsonData], {
                type: "application/json"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "s4w_flood_events.json";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
});

document.getElementById("downloadCsvBtn").addEventListener("click", function() {

        const columns = [
            "eventId",
            "name",
            "location",
            "date",
            "description",
            "status",
            "evidenceType",
            "evidenceSource",
            "sourceUrl",
            "evidenceDate",
            "verifiedBy",
            "verificationDate",
            "photoUrl",
            "latitude",
            "longitude"
        ];

        // Put quotes around values so commas don't break CSV columns.
        function escapeCSV(value) {
            if (value === null || value === undefined) {
                return "";
            }

            const text = String(value);
            return '"' + text.replace(/"/g, '""') + '"';
        }

        const rows = [
            columns.map(escapeCSV).join(",")
        ];

        floodEvents.forEach(function(event) {
                const row = columns.map(function(column) {
                        return escapeCSV(event[column]);
                });

                rows.push(row.join(","));
        });

        const csvContent = rows.join("\r\n");

        const blob = new Blob(["\uFEFF", csvContent], {
                type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "s4w_flood_events.csv";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
});