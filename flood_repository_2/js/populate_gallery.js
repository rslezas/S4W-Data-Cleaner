const RECENT_DAYS = 365;
const IMAGE_TIMEOUT = 10000;

let galleryObservations = [];
let galleryEvents = [];

function loadCSV(path) {
    return new Promise((resolve, reject) => {
        Papa.parse(path, {
            download: true,
            header: true,
            skipEmptyLines: "greedy",

            transformHeader: header =>
                header.replace(/^\uFEFF/, "").trim(),

            complete: results => {
                if (results.errors.length > 0) {
                    reject(new Error(
                        `${path}: ${results.errors[0].message}`
                    ));
                    return;
                }

                resolve(results.data);
            },

            error: error => {
                reject(new Error(`${path}: ${error.message}`));
            }
        });
    });
}

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function getEvidenceType(observation) {
    return String(observation.evidence_type || "").trim() || "Not Provided";
}

// Accept online URLs only, not names or local file paths.
function getSourceURL(source) {
    try {
        const url = new URL(String(source || "").trim());

        if (["https:", "http:"].includes(url.protocol)) {
            return url.href;
        }
    } catch {
        // Missing or invalid URL.
    }

    return null;
}

// Accept YYYY-MM-DD or M/D/YYYY dates.
function parseDate(value) {
    const text = String(value || "").trim();

    let year;
    let month;
    let day;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        [year, month, day] = text.split("-").map(Number);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
        [month, day, year] = text.split("/").map(Number);
    } else {
        return null;
    }

    const date = new Date(year, month - 1, day);

    // Reject invalid dates such as February 31.
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

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
            !["all", "recent"].includes(event.id) &&
            event.name
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    select.replaceChildren(
        new Option("All Events", "all"),
        new Option("Recent Events", "recent")
    );

    for (const event of options) {
        select.add(new Option(event.name, event.id));
    }

    const selectionExists =
        previousSelection === "recent" ||
        options.some(event => event.id === previousSelection);

    select.value = selectionExists ? previousSelection : "all";
}

function populateFilters() {
    fillDropdown(
        "evidence-type",
        galleryObservations.map(getEvidenceType),
        "All Evidence Types"
    );

    populateEventFilter();
}

function imageIsAccessible(source) {
    const url = getSourceURL(source);

    if (!url) {
        return Promise.resolve(false);
    }

    return new Promise(resolve => {
        const image = new Image();

        const timeout = setTimeout(
            () => finish(false),
            IMAGE_TIMEOUT
        );

        function finish(accessible) {
            clearTimeout(timeout);
            image.onload = null;
            image.onerror = null;
            resolve(accessible);
        }

        image.onload = () => finish(image.naturalWidth > 0);
        image.onerror = () => finish(false);
        image.src = url;
    });
}

async function removeUnavailableImages(observations) {
    // Reuse the same check when multiple observations share an image URL.
    const checks = new Map();

    const results = await Promise.all(
        observations.map(observation => {
            if (normalize(getEvidenceType(observation)) !== "image") {
                return true;
            }

            const source = String(observation.source_url || "").trim();

            if (!checks.has(source)) {
                checks.set(source, imageIsAccessible(source));
            }

            return checks.get(source);
        })
    );

    return observations.filter((observation, index) => results[index]);
}

function getRecentEventIds() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

    return new Set(
        galleryEvents
            .filter(event => {
                const date = parseDate(event.datetime || event.date);

                return date && date >= cutoff && date <= today;
            })
            .map(event => String(event.event_id || "").trim())
            .filter(Boolean)
    );
}

function getFilteredObservations() {
    const selectedEvent =
        document.getElementById("event-select")?.value || "all";

    const selectedEvidence =
        document.getElementById("evidence-type")?.value || "all";

    const recentEventIds = getRecentEventIds();

    return galleryObservations.filter(observation => {
        const eventId = String(observation.event_id || "").trim();

        const matchesEvent =
            selectedEvent === "all" ||
            (
                selectedEvent === "recent"
                    ? recentEventIds.has(eventId)
                    : eventId === selectedEvent
            );

        const matchesEvidence =
            selectedEvidence === "all" ||
            normalize(getEvidenceType(observation)) ===
                normalize(selectedEvidence);

        return matchesEvent && matchesEvidence;
    });
}

function createGalleryCard(observation) {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = observation.observation_title || "Flood observation";

    card.appendChild(title);

    const source = getSourceURL(observation.source_url);
    const type = normalize(getEvidenceType(observation));

    if (type === "image" && source) {
        const image = document.createElement("img");

        image.src = source;
        image.alt = observation.description || title.textContent;
        image.loading = "lazy";

        // If a previously checked image later fails, exclude its entire card.
        image.addEventListener("error", () => {
            galleryObservations = galleryObservations.filter(
                entry => entry !== observation
            );

            renderGallery();
        }, { once: true });

        card.appendChild(image);
    }

    if (type == "video" && source)
    {

    }

    const details = document.createElement("p");
    details.textContent = [
        observation.author || "Author Unknown",
        observation.datetime,
        observation.location
    ].filter(Boolean).join(" · ");

    card.appendChild(details);

    // Non-image evidence remains accessible through its source link.

    function capitalizeWords(text) {
        return String(text ?? "").replace(/\b[a-z]/gi, letter =>
            letter.toUpperCase()
        );
    }

    type_name = capitalizeWords(type)

    if (source) {
        const link = document.createElement("a");

        link.href = source;
        link.textContent = `${type_name} | View source ↗`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        card.appendChild(link);
    }

    return card;
}

function renderGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    const observations = getFilteredObservations();

    if (observations.length === 0) {
        gallery.textContent = "No observations match the selected filters.";
        return;
    }

    gallery.replaceChildren(
        ...observations.map(createGalleryCard)
    );
}

async function initializeGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    gallery.textContent = "Loading observations and checking images…";

    try {
        const [observations, events] = await Promise.all([
            loadCSV("data/observations.csv"),
            loadCSV("data/events.csv")
        ]);

        galleryEvents = events;
        galleryObservations = await removeUnavailableImages(observations);

        populateFilters();

        // Register one listener per dropdown.
        ["event-select", "evidence-type"].forEach(id => {
            document.getElementById(id)?.addEventListener(
                "change",
                renderGallery
            );
        });

        renderGallery();
    } catch (error) {
        console.error("Could not load the gallery:", error);

        gallery.textContent =
            "The gallery could not load. Please try refreshing the page.";
    }
}

// Start after the page's HTML elements exist.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGallery);
} else {
    initializeGallery();
}