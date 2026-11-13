function fillDropdown(id, values, label) {
    const select = document.getElementById(id);
    if (!select) return;

    const previousSelection = select.value;

    const names = [...new Set(
        values
            .map(value => String(value ?? "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    select.replaceChildren(new Option(label, "all"));

    for (const name of names) {
        select.add(new Option(name, name));
    }

    select.value = names.includes(previousSelection)
        ? previousSelection
        : "all";
}

function populateEventFilter() {
    const select = document.getElementById("event-select");
    if (!select) return;

    const previousSelection = select.value;

    const options = galleryEvents
    .map(event => ({
        id: String(event.event_id || "").trim(),
        name: String(event.event_name || event.name || "").trim(),
        date: String(event.datetime || "").trim()
    }))
    .filter(event =>
        event.id &&
        event.id !== "all" &&
        event.name
    )
    .sort((a, b) => {
        const dateA = Date.parse(a.date);
        const dateB = Date.parse(b.date);

        const validA = Number.isFinite(dateA);
        const validB = Number.isFinite(dateB);

        if (validA && validB) return dateB - dateA;
        if (validA) return -1;
        if (validB) return 1;

        return a.name.localeCompare(b.name);
    });
    
    select.replaceChildren(
        new Option("All Events", "all"),
    );

    for (const event of options) {
        select.add(new Option(event.name, event.id));
    }

    const selectionExists =
        options.some(event => event.id === previousSelection);

    select.value = selectionExists ? previousSelection : "all";
}

function populateGalleryFilters(galleryObservations) {
    fillDropdown(
        "evidence-type",
        [
            ...galleryObservations.map(getEvidenceType),
            "Flood Observation"
        ],
        "All Evidence Types"
    );
    
    populateEventFilter();
}