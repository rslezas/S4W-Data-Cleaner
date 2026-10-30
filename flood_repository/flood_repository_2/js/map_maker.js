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
                filter: function(feature) {
                    return ["LineString", "MultiLineString"].includes(feature.geometry?.type);
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
                filter: function(feature) {
                    return ["Polygon", "MultiPolygon"].includes(feature.geometry?.type);
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

let floodEvents = [];

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
