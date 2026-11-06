const recent_days = 365;
const image_timeout = 10000;
const placeholder_src = "https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg"

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
            image_timeout
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
    cutoff.setDate(cutoff.getDate() - recent_days);

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
    }).sort((a, b) => {
        const dateA = parseDate(a.datetime);
        const dateB = parseDate(b.datetime);

        if (Number.isNaN(dateA) && Number.isNaN(dateB)) return 0;
        if (Number.isNaN(dateA)) return 1;
        if (Number.isNaN(dateB)) return -1;

        return dateB - dateA; // Newest first.
    });
}

function parseDate(value) {
    const [month, day, year] = String(value ?? "").trim().split("/");
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function createGalleryCard(observation) {

    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent =
        observation.observation_title || "Flood observation";

    card.appendChild(title);

    // Keep URL names distinct from HTML element names.
    const sourceURL = getSourceURL(observation.source_url);
    const imageURL = getSourceURL(observation.image_src);
    const videoURL = getSourceURL(observation.video_url);
    const type = normalize(getEvidenceType(observation));


    if (type == "video" && videoURL) {
        const video = document.createElement("video");

        video.controls = true;
        video.preload = "metadata";
        video.playsInline = true;
        video.setAttribute(
            "aria-label",
            observation.description || title.textContent
        );

        video.style.width = "100%";
        video.style.display = "block";

        // Remove failed media while keeping the observation card.
        video.addEventListener("error", () => {
            video.remove();
            const message = document.createElement("p");
            message.textContent = "Video currently unavailable.";
            card.appendChild(message)
        }, { once: true });

        video.src = videoURL;
        card.appendChild(video);
    }
    else if (type == "social media link" && sourceURL) {

        if (sourceURL.includes("youtube") || sourceURL.includes("youtu.be"))
        {
            const embed = document.createElement("iframe");

            embed.alt = observation.description || title.textContent;
            embed.style.width = "100%";
            embed.style.height = "auto";
            embed.style.display = "block";

            embed.addEventListener("error", () => {
                embed.remove();
                const message = document.createElement("p");
                message.textContent = "Embed currently unavailable.";
                card.appendChild(message)
            }, { once: true });

            embed.src = sourceURL

            card.appendChild(embed)
        }
    }
    else if (imageURL) {
        const image = document.createElement("img");

        image.alt = observation.description || title.textContent;
        image.style.width = "100%";
        image.style.height = "auto";
        image.style.display = "block";

        image.addEventListener("load", () => {
            console.log("Image loaded:", image.src);
        }, { once: true });

        image.addEventListener("error", () => {
            console.error("Image failed:", image.src);

            // Keep the card and show why its preview is missing.
            image.src = placeholder_src;
        }, { once: true });

        image.src = imageURL;
        card.appendChild(image);

        image.src = imageURL;
        card.appendChild(image);
    }

    details_str = details_str = [
        observation.author || "Author Unknown",
        observation.datetime,
        observation.location
    ].filter(Boolean).join(" · ");

    if (type == "news report")
    {
        details_str = observation.author || "Author Unknown";
    }
    else if (type == "social media link")
    {
        site_name = (new URL(sourceURL).hostname || "").replace(/^www\./, '');

        details_str = site_name || "Unknown Source";
    }

    const details = document.createElement("p");
    details.textContent = details_str

    card.appendChild(details);

    if (observation.description)
    {
        const description = document.createElement("p");
        description.textContent = observation.description;

        card.appendChild(description);
    }

    if (sourceURL) {
        const typeName = type.replace(
            /\b[a-z]/gi,
            letter => letter.toUpperCase()
        );

        const link = document.createElement("a");

        link.href = sourceURL;
        link.textContent = `${typeName} | View source ↗`;
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
            loadCSV("data/passed_observations.csv"),
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