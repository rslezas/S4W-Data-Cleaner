const markers = [];

function displayEvents() {

    // Read the current filter selections.
    const eventList = document.getElementById("eventList");
    const eventCount = document.getElementById("eventCount");
    const selectedWatershed =
        document.getElementById("watershedFilter")?.value || "all";

    const selectedRiver =
        document.getElementById("riverFilter")?.value || "all";

    const selectedLocation =
        document.getElementById("locationFilter")?.value || "all";

    const selectedEvidence =
        document.getElementById("evidenceFilter")?.value || "all";

    const startDate =
        document.getElementById("startDateFilter")?.value || "";

    const endDate =
        document.getElementById("endDateFilter")?.value || "";

    // Validate dates before clearing the existing markers.
    const errorElement = document.getElementById("dateFilterError");
    const invalidRange = Boolean(
        startDate && endDate && startDate > endDate
    );

    if (errorElement) {
        errorElement.hidden = !invalidRange;
        errorElement.textContent = invalidRange
            ? "Start date must be on or before the end date."
            : "";
    }

    if (invalidRange) {
        return;
    }

    // Select events matching every active filter.
    // event.date must be YYYY-MM-DD.
    const filteredEvents = floodEvents.filter(function(event) {
        const matchesWatershed =
            selectedWatershed === "all" ||
            event.watershed === selectedWatershed;

        const matchesRiver =
            selectedRiver === "all" ||
            event.river === selectedRiver;

        const matchesLocation =
            selectedLocation === "all" ||
            event.location === selectedLocation;

        const matchesEvidence =
            selectedEvidence === "all" ||
            (event.evidenceType || "Not provided") === selectedEvidence;

        const date = event.date || "";

        const matchesDate =
            (!startDate && !endDate) ||
            (
                date !== "" &&
                (!startDate || date >= startDate) &&
                (!endDate || date <= endDate)
            );

        return (
            matchesWatershed &&
            matchesRiver &&
            matchesLocation &&
            matchesEvidence &&
            matchesDate
        );
    });

    // Clear previous markers only after validation succeeds.
    markers.forEach(function(marker) {
        map.removeLayer(marker);
    });

    markers.length = 0;

// Continue with your existing timeline, markers, count, and cards.

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
        title.textContent = event.name || event.title || event.eventId || "Flood event";

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

if (Array.isArray(event.photos) && event.photos.length > 0) {
    const photos = event.photos.filter(filename =>
        /^[a-zA-Z0-9_() -]+\.jpg$/i.test(filename)
    );

    if (photos.length > 0) {
        let currentPhoto = 0;

        const gallery = document.createElement("div");
        gallery.style.width = "280px";
        gallery.style.maxWidth = "100%";
        gallery.style.marginTop = "12px";

        const img = document.createElement("img");
        img.alt = "September 2024 flood photograph";
        img.style.width = "100%";
        img.style.height = "180px";
        img.style.objectFit = "contain";
        img.style.borderRadius = "8px";

        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.justifyContent = "space-between";
        controls.style.alignItems = "center";
        controls.style.marginTop = "8px";

        const previous = document.createElement("button");
        previous.textContent = "← Previous";
        previous.type = "button";

        const counter = document.createElement("span");

        const next = document.createElement("button");
        next.textContent = "Next →";
        next.type = "button";

        function showPhoto() {
            img.src = "media/" + encodeURIComponent(event.eventId) + "/" +
                encodeURIComponent(photos[currentPhoto]);
            counter.textContent = (currentPhoto + 1) + " / " + photos.length;
        }

        previous.addEventListener("click", function(e) {
            L.DomEvent.stopPropagation(e);
            currentPhoto = (currentPhoto - 1 + photos.length) % photos.length;
            showPhoto();
        });

        next.addEventListener("click", function(e) {
            L.DomEvent.stopPropagation(e);
            currentPhoto = (currentPhoto + 1) % photos.length;
            showPhoto();
        });

        controls.append(previous, counter, next);
        gallery.append(img, controls);
        container.appendChild(gallery);

        L.DomEvent.disableClickPropagation(gallery);
        L.DomEvent.disableScrollPropagation(gallery);

        showPhoto();
    }
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
        const marker = L.marker([latitude, longitude]);

marker.bindPopup(createEventContent(event), {
    maxWidth: 280,
    minWidth: 250,
    maxHeight: 220,
    autoPan: false,
    keepInView: false
});
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

[
    "watershedFilter",
    "riverFilter",
    "locationFilter",
    "evidenceFilter",
    "startDateFilter",
    "endDateFilter"
].forEach(function(id) {
    document.getElementById(id)?.addEventListener(
        "change",
        displayEvents
    );
});