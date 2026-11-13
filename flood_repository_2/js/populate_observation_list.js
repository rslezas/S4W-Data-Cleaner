const placeholder_src = "https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-observationsList-or-album-flat.jpg"

let listedObservations = [];
let observationListBrokenGooglePhotos = new Set();

const desc_word_limit = 50;

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function getEvidenceType(observation) {
    return String(observation.evidence_type || "").trim() || "Other";
}

function getQCFlag(observation) {
    return String(observation.qc_flag || "").trim() || "None";
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

function getFilteredObservations() {
    const allowedFlags = ["AutoPassed", "HumanPassed"];
    const errorElement = document.getElementById("dateFilterError");

    // Clear any previous date-range error.
    if (errorElement) {
        errorElement.hidden = true;
        errorElement.textContent = "";
    }

    const approvedObservations = listedObservations.filter(observation =>
        allowedFlags.includes(getQCFlag(observation))
    );

    let filteredObservations;

    try {
        // The shared function validates and applies the date range.
        filteredObservations = get_filtered_observations(
            approvedObservations,
            {
                event:
                    document.getElementById("eventFilter")?.value || "all",
                observationType:
                    document.getElementById("evidenceFilter")?.value || "all",
                river:
                    document.getElementById("riverFilter")?.value || "all",
                watershed:
                    document.getElementById("watershedFilter")?.value || "all",
                startDate:
                    document.getElementById("startDateFilter")?.value || "",
                endDate:
                    document.getElementById("endDateFilter")?.value || ""
            }
        );
    } catch (error) {
        if (errorElement) {
            errorElement.textContent = error.message;
            errorElement.hidden = false;
        }

        return [];
    }

    // Show newest observations first, with missing or invalid dates last.
    return filteredObservations.sort((a, b) => {
        const dateA = parseDate(a.datetime);
        const dateB = parseDate(b.datetime);

        const missingA = dateA == null || Number.isNaN(dateA);
        const missingB = dateB == null || Number.isNaN(dateB);

        if (missingA && missingB) return 0;
        if (missingA) return 1;
        if (missingB) return -1;

        return dateB - dateA;
    });
}

function createObservationCard(observation) {

    const card = document.createElement("article");
    card.className = "observation";

    const title = document.createElement("h3");
    title.textContent = observation.observation_title || "Flood observation";

    card.appendChild(title);

    const textContent = document.createElement("div");
    textContent.className = "observation-text";

    const mediaContent = document.createElement("div");
    mediaContent.className = "observation-media";

    card.append(textContent, mediaContent);

    // Keep URL names distinct from HTML element names.
    const sourceURL = getSourceURL(observation.source_url);
    const imageURL = getSourceURL(observation.image_url);
    const videoURL = getSourceURL(observation.video_url);
    const type = normalize(getEvidenceType(observation));

    if (type == "video" && videoURL) {

        if (videoURL.includes("youtube") || videoURL.includes("youtu.be"))
        {
            const youtubeURL = getYouTubeEmbedURL(videoURL)
            const embed = document.createElement("iframe");

            embed.title = observation.description || title.textContent;
            embed.style.width = "100%";
            embed.style.display = "block";

            embed.src = youtubeURL

            mediaContent.appendChild(embed)
        }
        else
        {
            const video = document.createElement("video");

            video.controls = true;
            video.preload = "metadata";
            video.playsInline = true;
            video.setAttribute(
                "aria-label",
                title.textContent
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
            mediaContent.appendChild(video);
        }
    }
    else if (imageURL && !observationListBrokenGooglePhotos.has(imageURL)) {
        const image = document.createElement("img");

        image.alt = title.textContent;
        image.style.width = "100%";
        image.style.display = "block";

        image.src = imageURL;
        mediaContent.appendChild(image);
    }

    let details_str = [
        observation.author || "Author Unknown",
        observation.datetime,
        observation.location
    ].filter(Boolean).join(" · ");

    const details = document.createElement("p");
    details.textContent = details_str

    textContent.appendChild(details);

    if (observation.description) {
        const maxWords = desc_word_limit;
        const words = String(observation.description).trim().split(/\s+/);

        const description = document.createElement("p");

        description.textContent = words.slice(0, maxWords).join(" ");

        if (words.length > maxWords) {
            description.textContent += "…";
        }

        textContent.appendChild(description);
    }

    if (sourceURL && !observationListBrokenGooglePhotos.has(sourceURL)) {
        const typeName = type.replace(
            /\b[a-z]/gi,
            letter => letter.toUpperCase()
        );

        const link = document.createElement("a");

        link.href = sourceURL;
        link.textContent = `${typeName} | View source ↗`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        textContent.appendChild(link);
    }

    return card;
}

function renderObservationsList() {
    const observationsList = document.getElementById("observation-list");
    if (!observationsList) return;

    const observations = getFilteredObservations().filter(observation =>
        ["image", "video"].includes(
            normalize(getEvidenceType(observation))
        )
    );

    if (observations.length === 0) {
        observationsList.textContent = "No observations match the selected filters.";
        return;
    }

    observationsList.replaceChildren(
        ...observations.map(createObservationCard)
    );
}

async function initializeObservations() {
    const observationsList = document.getElementById("observation-list");

    if (!observationsList) {
        console.error('Missing HTML element: id="observation-list".');
        return;
    }

    observationsList.textContent = "Loading observations…";

    try {
        // Load observations and the broken-link report together.
const [observations, brokenLinks] = await Promise.all([
    loadCSV("data/processed_observations.csv"),
    fetch("data/broken_google_photos.json").then(response => {
        if (!response.ok) {
            throw new Error(`Broken-link report HTTP ${response.status}`);
        }
        return response.json();
    })
]);

listedObservations = observations;
observationListBrokenGooglePhotos = new Set(brokenLinks);

        // Refresh the list whenever a filter changes.
        [
            "eventFilter",
            "evidenceFilter",
            "riverFilter",
            "watershedFilter",
            "startDateFilter",
            "endDateFilter"
        ].forEach(id => {
            document.getElementById(id)?.addEventListener(
                "change",
                renderObservationsList
            );
        });

        renderObservationsList();
    } catch (error) {
        console.error("Could not load observations:", error);

        observationsList.textContent =
            "The observations could not load. Please try refreshing the page.";
    }
}

// Start after the page's HTML elements exist.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeObservations);
} else {
    initializeObservations();
}