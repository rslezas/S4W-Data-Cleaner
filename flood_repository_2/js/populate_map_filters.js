function fillDropdown(id, values, label) {
    const select = document.getElementById(id);
    if (!select) {
        return;
    }
    const previous = select.value;
    const names = [...new Set(values.map(v => String(v ?? "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    select.replaceChildren(new Option(label, "all"));
    names.forEach(name => select.add(new Option(name, name)));
    select.value = names.includes(previous) ? previous : "all";
}

function populateEventFilter() {
    const select = document.getElementById("eventFilter");

    if (!select) {
        return;
    }

    const previousSelection = select.value;
    const selectedRiver = document.getElementById("riverFilter")?.value || "all";
    const selectedWatershed = document.getElementById("watershedFilter")?.value || "all";

    const events = Array.from(eventRecords.values()).filter(event => {
        const id = eventId(event);

        const observations = layerData.observations.filter(feature =>
            eventId(feature.properties) === id
        );

        const watershedMatches = selectedWatershed === "all" ||
            observations.some(feature =>
                matches(selectedWatershed, feature.properties.watershed)
            );

        const riverMatches = selectedRiver === "all" ||
            observations.some(feature =>
                matches(
                    selectedRiver,
                    feature.properties.river,
                    normalizeRiverName
                )
            ) ||
            String(event.river || "").split(";").some(river =>
                matches(selectedRiver, river, normalizeRiverName)
            );

        const qualifyingObservationIds = new Set(observations.filter(feature => {
            const p = feature.properties || {};
            const observationId = String(p.observation_id || "").trim();
            if (!observationId) return false;

            const localFiles = observationMedia[observationId] || [];
            const hasLocalMedia = localFiles.some(file =>
                /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i.test(file)
            );

            const type = normalize(p.evidence_type);
            const imageURL = getPopupURL(p.image_url) || getPopupURL(p.source_url);
            const videoURL = getPopupURL(p.video_url) || getPopupURL(p.source_url);

            return hasLocalMedia ||
                (type === "image" && imageURL && !isBrokenGooglePhotosURL(imageURL)) ||
                (type === "video" && videoURL && !isBrokenGooglePhotosURL(videoURL));
        }).map(feature => String(feature.properties.observation_id).trim()));

        return watershedMatches && riverMatches && qualifyingObservationIds.size >= 2;
    });

    events.sort((a, b) => {
    const dateA = Date.parse(a.datetime || a.date || "");
    const dateB = Date.parse(b.datetime || b.date || "");

    const validA = Number.isFinite(dateA);
    const validB = Number.isFinite(dateB);

    if (validA && validB) return dateB - dateA;
    if (validA) return -1;
    if (validB) return 1;

    return (a.name || "").localeCompare(b.name || "");
});

    select.replaceChildren(new Option("All Events", "all"));

    for (const event of events) {
        select.add(new Option("EVENT — " + event.name, eventId(event)));
    }

    const observations = layerData.observations
        .map(feature => feature.properties || {})
        .filter(observation => String(observation.observation_id || "").trim());

    const observationGroup = document.createElement("optgroup");
    observationGroup.label = "INDIVIDUAL OBSERVATIONS";

    observations.sort((a, b) =>
        String(a.observation_title || a.location || "").localeCompare(
            String(b.observation_title || b.location || "")
        )
    );

    const seenObservations = new Set();

    for (const observation of observations) {
        const id = String(observation.observation_id).trim();

        if (seenObservations.has(id)) continue;
        seenObservations.add(id);

        const name = String(
            observation.observation_title || observation.location || id
        ).trim();

        observationGroup.appendChild(
            new Option("OBSERVATION — " + name, "observation:" + id)
        );
    }

    select.appendChild(observationGroup);

    select.value = (events.some(event => eventId(event) === previousSelection) || (previousSelection.startsWith("observation:") && seenObservations.has(previousSelection.slice(12)))) ? previousSelection : "all";
}

function populateFilters() {
    const riverNames = [];
    const watershedNames = [];
    const evidenceTypes = [];

    for (const feature of layerData.rivers) {
        const name = featureName(feature, "river");
        const isRiver = ["LineString", "MultiLineString"].includes(
            feature.geometry?.type
        );

        if (isRiver && name && !/^unnamed\b/i.test(name)) {
            riverNames.push(name);
        }
    }

    for (const feature of layerData.watersheds) {
        watershedNames.push(featureName(feature, "watershed"));
    }

    for (const feature of layerData.observations) {
        const type = String(feature.properties.evidence_type || "")
    .trim()
    .toLowerCase();

if (type === "image" || type === "video") {
    evidenceTypes.push(type === "image" ? "Image" : "Video");
}
    }
evidenceTypes.push("Flood Observation");

    fillDropdown("riverFilter", riverNames, "All Rivers");
    fillDropdown("watershedFilter", watershedNames, "All Watersheds");
    fillDropdown("evidenceFilter", evidenceTypes, "All Evidence Types");

    // The event dropdown has its own function and data source.
    populateEventFilter();
}





