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
            name: String(event.event_name || event.name || "").trim()
        }))
        .filter(event =>
            event.id &&
            !["all"].includes(event.id) &&
            event.name
        )
        .sort((a, b) => a.name.localeCompare(b.name));

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
        galleryObservations.map(getEvidenceType),
        "All Evidence Types"
    );

    populateEventFilter();
}