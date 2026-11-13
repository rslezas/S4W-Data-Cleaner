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

        return watershedMatches && riverMatches;
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
        select.add(new Option(event.name, eventId(event)));
    }

    select.value = events.some(event =>
        eventId(event) === previousSelection
    ) ? previousSelection : "all";
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
