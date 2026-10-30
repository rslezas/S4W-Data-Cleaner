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

document.getElementById("evidenceEventFilter")
    .addEventListener("change", displayEvidence);

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

const markers = [];

function displayEvents() {
    // Read the selected filters.
    // Missing inputs default to "all" or an unrestricted date range.
    const location =
        document.getElementById("locationFilter")?.value || "all";

    const evidenceType =
        document.getElementById("evidenceFilter")?.value || "all";

    const startDate =
        document.getElementById("startDateFilter")?.value || "";

    const endDate =
        document.getElementById("endDateFilter")?.value || "";

    const errorElement = document.getElementById("dateFilterError");
    const eventCount = document.getElementById("eventCount");
    const eventList = document.getElementById("eventList");

    // Dates must use YYYY-MM-DD, for example: "2024-09-28".
    // ISO date strings can be compared directly.
    const invalidRange =
        startDate !== "" &&
        endDate !== "" &&
        startDate > endDate;

    if (errorElement) {
        errorElement.hidden = !invalidRange;
        errorElement.textContent = invalidRange
            ? "Start date must be on or before the end date."
            : "";
    }

    // Keep the current results visible while the user fixes the range.
    if (invalidRange) {
        return;
    }

    // Apply all filters together.
    const filteredEvents = floodEvents.filter((event) => {
        const matchesLocation =
            location === "all" ||
            event.location === location;

        const matchesEvidence =
            evidenceType === "all" ||
            (event.evidenceType || "Not provided") === evidenceType;

        const eventDate =
            typeof event.date === "string" ? event.date.trim() : "";

        const hasDateRange = startDate !== "" || endDate !== "";

        // Both boundaries are inclusive.
        // Undated events remain visible only when no date range is set.
        const matchesDate =
            !hasDateRange ||
            (
                eventDate !== "" &&
                (!startDate || eventDate >= startDate) &&
                (!endDate || eventDate <= endDate)
            );

        return matchesLocation && matchesEvidence && matchesDate;
    });

    // Remove the previous event markers and regional circles.
    // This leaves the GeoJSON boundary and evidence layers intact.
    markers.forEach((marker) => {
        map.removeLayer(marker);
    });

    markers.length = 0;

    // Update the number of matching records.
    if (eventCount) {
        const noun = filteredEvents.length === 1 ? "event" : "events";

        eventCount.textContent =
            `${filteredEvents.length} matching ${noun}`;
    }

    // Update the timeline only on pages that contain one.
    if (
        document.getElementById("eventTimeline") &&
        typeof displayTimeline === "function"
    ) {
        displayTimeline(filteredEvents);
    }

    // Clear the previous event cards.
    if (eventList) {
        eventList.replaceChildren();

        if (filteredEvents.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No events match the selected filters.";
            eventList.appendChild(message);
        }
    }

    // Create safe text content for both cards and map popups.
    function createEventContent(event) {
        const container = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent =
            event.title || event.eventId || "Flood event";

        container.appendChild(title);

        function addDetail(label, value) {
            const paragraph = document.createElement("p");
            const heading = document.createElement("strong");

            heading.textContent = `${label}: `;

            paragraph.appendChild(heading);
            paragraph.appendChild(
                document.createTextNode(
                    value === null || value === undefined || value === ""
                        ? "Not provided"
                        : String(value)
                )
            );

            container.appendChild(paragraph);
        }

        addDetail("Date", event.date);
        addDetail("Location", event.location);
        addDetail("Evidence type", event.evidenceType);

        if (event.description) {
            addDetail("Description", event.description);
        }

        if (event.coordinateNote) {
            addDetail("Location note", event.coordinateNote);
        }

        return container;
    }

    filteredEvents.forEach((event) => {
        // Create a card even when an event has no usable coordinates.
        if (eventList) {
            const card = createEventContent(event);
            card.classList.add("event-item");
            eventList.appendChild(card);
        }

        // Reject missing coordinates before converting numeric strings.
        const hasCoordinates =
            event.latitude !== null &&
            event.latitude !== undefined &&
            String(event.latitude).trim() !== "" &&
            event.longitude !== null &&
            event.longitude !== undefined &&
            String(event.longitude).trim() !== "";

        if (!hasCoordinates) {
            return;
        }

        const latitude = Number(event.latitude);
        const longitude = Number(event.longitude);

        const validCoordinates =
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180;

        if (!validCoordinates) {
            return;
        }

        // Preserve the existing convention:
        // events with a coordinate note use an illustrative regional circle.
        const marker = event.coordinateNote
            ? L.circle([latitude, longitude], {
                radius: 3000,
                color: "#155e75",
                fillColor: "#155e75",
                fillOpacity: 0.15,
                weight: 2
            })
            : L.marker([latitude, longitude]);

        marker.bindPopup(createEventContent(event));
        marker.addTo(map);

        markers.push(marker);
    });

    // Fit the map to the matching events that have valid coordinates.
    if (markers.length > 0) {
        const bounds = L.featureGroup(markers).getBounds();

        map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 12
        });
    } else {
        // Default view when no matching events can be mapped.
        map.setView([27.7172, 85.3240], 11);
    }
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


// Update the map when the user selects a location

document.getElementById("locationFilter")
    .addEventListener("change", displayEvents);

document.getElementById("evidenceFilter")
    .addEventListener("change", displayEvents);

document.getElementById("startDateFilter")
    ?.addEventListener("change", displayEvents);

document.getElementById("endDateFilter")
    ?.addEventListener("change", displayEvents);

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