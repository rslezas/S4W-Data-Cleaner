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
    const events = Array.from(eventRecords.values());

    events.sort(function (firstEvent, secondEvent) {
       return (firstEvent.name || "").localeCompare(secondEvent.name || "");
    });

    select.replaceChildren(new Option("All Events", "all"));

    for (const event of events) {
        const option = new Option(event.name, eventId(event));
        select.add(option);
    }

    if (eventRecords.has(previousSelection)) {
        select.value = previousSelection;
    } else {
        select.value = "all";
    }
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

    fillDropdown("riverFilter", riverNames, "All Rivers");
    fillDropdown("watershedFilter", watershedNames, "All Watersheds");
    fillDropdown("evidenceFilter", evidenceTypes, "All Evidence Types");

    // The event dropdown has its own function and data source.
    populateEventFilter();
}
