/* S4W Nepal — Map and geographic layers */

// Create a map centered on Kathmandu.
const map = L.map("map").setView(
    [27.7172, 85.3240],
    11
);

// Municipality boundaries below rivers.
map.createPane("municipalitiesPane");
map.getPane("municipalitiesPane").style.zIndex = 400;

// Municipality boundaries below rivers.
map.createPane("watershedsPane");
map.getPane("watershedsPane").style.zIndex = 410;

// Rivers above municipality boundaries.
map.createPane("riversPane");
map.getPane("riversPane").style.zIndex = 420;


// Add OpenStreetMap background tiles.
L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

// Keep this at the top level so flood_observations.js can
// register its evidence layer with the same menu.
const layerControl = L.control.layers(null, null, {
    collapsed: true,
    position: "topright"
}).addTo(map);

// Load rivers and streams.
fetch("data/geojson/rivers.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load river GeoJSON file");
        }

        return response.json();
    })
    .then(data => {
        // This variable is local to this callback, avoiding conflicts
        // with filter variables in flood_observations.js.
        const riverSelect = document.getElementById("riverFilter");

        // Prefer the English name, then fall back to the local name.
        function getRiverName(feature) {
            const properties = feature.properties || {};

            const name = (
                String(properties["river"] ?? "").trim()
            )
            return name
        }

        function normalizeRiverName(value) {
            return String(value ?? "")
                .normalize("NFKC")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ")       // Collapse repeated spaces.
                .replace(/\s+river$/, "")  // Remove a trailing " river".
                .trim()
                .split(" ")[0];
        }

        const riverLayer = L.geoJSON(data, {
            pane: "riversPane",
            style: {
                color: "#56a7e0",
                weight: 3,
                opacity: 1
            },
            filter: function(feature) {
                const isLine = [
                    "LineString",
                    "MultiLineString"
                ].includes(feature.geometry?.type);

                const name = normalizeRiverName(getRiverName(feature));
                const selected = normalizeRiverName(riverSelect?.value || "all");

                return (
                    isLine &&
                    name !== "" &&
                    name !== "unnamed waterway" &&
                    (selected === "all" || name === selected)
                );
            },
            onEachFeature: function(feature, layer) {
                const popup = document.createElement("div");

                popup.textContent =
                    "River/Stream: " + getRiverName(feature);

                layer.bindPopup(popup);
            }
        }).addTo(map);

        layerControl.addOverlay(
            riverLayer,
            "Rivers and streams"
        );

        // Leaflet applies the filter when features are added.
        // Reuse the downloaded data to redraw matching rivers.
        riverSelect?.addEventListener("change", function() {
            riverLayer.clearLayers();
            riverLayer.addData(data);
        });

        console.log("Kathmandu Valley river layer loaded successfully");
    })
    .catch(error => {
        console.error("Error loading river data:", error);
    });

fetch("data/geojson/watersheds.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load watershed GeoJSON file");
        }

        return response.json();
    })
    .then(data => {
        // This variable is local to this callback, avoiding conflicts
        // with filter variables in flood_observations.js.
        const watershedSelect = document.getElementById("watershedFilter");

        // Prefer the English name, then fall back to the local name.
        function getWatershedName(feature) {
            const properties = feature.properties || {};

            const name = (
                String(properties["watershed"] ?? "").trim()
            )
            return name
        }

        function normalizeWatershedName(value) {
            return String(value ?? "")
                .normalize("NFKC")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ")       // Collapse repeated spaces.
        }

        const watershedLayer = L.geoJSON(data, {
            pane: "watershedsPane",
            style: {
                color: "#e18804",
                fillOpacity: 0.2,
                weight: 2,
                opacity: 0.8
            },
            filter: function(feature) {
                const isLine = [
                    "Polygon",
                    "MultiPolygon"
                ].includes(feature.geometry?.type);

                const name = normalizeWatershedName(getWatershedName(feature));
                const selected = normalizeWatershedName(watershedSelect?.value || "all");

                return (
                    isLine &&
                    name !== "" &&
                    name !== "unnamed waterway" &&
                    (selected === "all" || name === selected)
                );
            },
            onEachFeature: function(feature, layer) {
                const popup = document.createElement("div");

                popup.textContent =
                    "Watershed: " + getWatershedName(feature);

                layer.bindPopup(popup);
            }
        }).addTo(map);

        layerControl.addOverlay(
            watershedLayer,
            "Watersheds"
        );

        // Leaflet applies the filter when features are added.
        // Reuse the downloaded data to redraw matching watersheds.
        watershedSelect?.addEventListener("change", function() {
            watershedLayer.clearLayers();
            watershedLayer.addData(data);
        });

        console.log("Kathmandu Valley watershed layer loaded successfully");
        })
        .catch(error => {
            console.error("Error loading watershed data:", error);
    });


// Load municipality boundaries.
fetch("data/geojson/kathmandu_municipalities.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load municipality GeoJSON file");
        }

        return response.json();
    })
    .then(data => {
        const municipalityLayer = L.geoJSON(data, {
            pane: "municipalitiesPane",
            style: {
                color: "#8b5cf6",
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.03
            },

            // Exclude point features so this layer adds no markers.
            filter: function(feature) {
                return [
                    "Polygon",
                    "MultiPolygon"
                ].includes(feature.geometry?.type);
            },

            onEachFeature: function(feature, layer) {
                const properties = feature.properties || {};

                const name =
                    String(properties["name:en"] ?? "").trim() ||
                    String(properties.name ?? "").trim() ||
                    "Unnamed administrative area";

                const popup = document.createElement("div");
                popup.textContent = "Municipality: " + name;

                layer.bindPopup(popup);
            }
        });

        layerControl.addOverlay(
            municipalityLayer,
            "Municipalities"
        );

        console.log("Municipality boundaries loaded successfully");
    })
    .catch(error => {
        console.error("Error loading municipality boundaries:", error);
    });

// Load documented flood events for the map.
let floodEvents = [];

fetch("data/events.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load flood events");
        }
        return response.json();
    })
    .then(events => {
        floodEvents = events;
        displayEvents();
    })
    .catch(error => {
        console.error("Error loading flood events:", error);
    });
