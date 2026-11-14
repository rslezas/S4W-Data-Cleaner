const placeholder_src = "https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg"

let galleryObservations = [];
let galleryEvents = [];
let galleryDhmReports = {};
let galleryBrokenGooglePhotos = new Set();
let galleryObservationMedia = {};

const desc_word_limit = 20;

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function getEvidenceType(observation) {
    return String(observation.evidence_type || "").trim() || "Not Provided";
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

const approvedObservations = galleryObservations.filter(observation => {
    const observationId = String(observation.observation_id || "").trim();

    const hasVerifiedLocalMedia =
        Array.isArray(galleryObservationMedia[observationId]) &&
        galleryObservationMedia[observationId].length > 0;

    return allowedFlags.includes(getQCFlag(observation)) ||
        hasVerifiedLocalMedia;
});




    let filteredObservations;

    try {
        // The shared function validates and applies the date range.
        filteredObservations = get_filtered_observations(
            approvedObservations,
            {
                event:
                    document.getElementById("event-select")?.value || "all",
                observationType:
                    document.getElementById("evidence-type")?.value || "all",
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

function createGalleryCard(observation) {

    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent =
        observation.observation_title || "Flood observation";

    card.appendChild(title);


    // Keep URL names distinct from HTML element names.
    const sourceURL = getSourceURL(observation.source_url);
    const imageURL = getSourceURL(observation.image_url);
    const videoURL = getSourceURL(observation.video_url);
    const type = normalize(getEvidenceType(observation));
    const localFiles =
        galleryObservationMedia[String(observation.observation_id || "").trim()] || [];

    if (localFiles.length > 0) {
        let current = 0;

        const mediaContainer = document.createElement("div");
        const controls = document.createElement("div");
        controls.style.cssText =
            "display:flex;justify-content:space-between;" +
            "align-items:center;gap:8px;margin:8px 0;";

        const previous = document.createElement("button");
        previous.textContent = "Previous";

        const counter = document.createElement("span");

        const next = document.createElement("button");
        next.textContent = "Next";

        function showLocalMedia() {
            const filename = localFiles[current];
            const eventId = String(observation.event_id || "").trim();
            const url =
                `media/${encodeURIComponent(eventId)}/` +
                encodeURIComponent(filename);

            const isVideo = /\.mp4$/i.test(filename);
            const element = document.createElement(isVideo ? "video" : "img");

            element.src = url;
            element.style.width = "100%";
            element.style.height = "220px";
            element.style.objectFit = "contain";

            if (isVideo) {
                element.controls = true;
                element.preload = "metadata";
            } else {
                element.alt = title.textContent;
                element.loading = "lazy";
            }

            mediaContainer.replaceChildren(element);
            counter.textContent =
                `${isVideo ? "Video" : "Photo"} ${current + 1} of ${localFiles.length}`;
        }

        previous.onclick = () => {
            current = (current - 1 + localFiles.length) % localFiles.length;
            showLocalMedia();
        };

        next.onclick = () => {
            current = (current + 1) % localFiles.length;
            showLocalMedia();
        };

        controls.append(previous, counter, next);
        card.append(mediaContainer, controls);
        showLocalMedia();
    } else if (type == "video" && videoURL) {



        if (videoURL.includes("youtube") || videoURL.includes("youtu.be"))
        {
            const youtubeURL = getYouTubeEmbedURL(videoURL)
            const embed = document.createElement("iframe");

            embed.title = observation.description || title.textContent;
            embed.style.width = "100%";
            embed.style.height = "auto";
            embed.style.display = "block";

            embed.src = youtubeURL

            card.appendChild(embed)
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
            card.appendChild(video);
        }
    }
    else if (type == "social media link" && sourceURL) {
        const image = document.createElement("img");

        image.alt = observation.description || title.textContent;
        image.style.width = "100%";
        image.style.display = "block";

        image.src = "images/social_media_placeholder.png";
        card.appendChild(image);
    }
else if (imageURL && !galleryBrokenGooglePhotos.has(imageURL)) {
    const image = document.createElement("img");

    image.alt = title.textContent;
    image.style.width = "100%";
    image.style.display = "block";

    image.onerror = function () {
        const fallback = document.createElement("div");

        fallback.textContent = "Image preview unavailable";
        fallback.style.cssText =
            "padding:28px 12px;" +
            "background:#f1f5f7;" +
            "color:#586b75;" +
            "text-align:center;" +
            "font-size:13px;" +
            "border-radius:6px;";

        image.replaceWith(fallback);
    };

    image.src = imageURL;
    card.appendChild(image);
}

    let details_str = [
        observation.author || "Author Unknown",
        observation.datetime,
        observation.location
    ].filter(Boolean).join(" · ");

    if (["social media link", "news report"].includes(type))
    {
        const site_name = sourceURL
            ? new URL(sourceURL).hostname.replace(/^www\./, "")
            : "Unknown Source";

        details_str =
        [
            site_name,
            observation.datetime
        ].filter(Boolean).join(" · ");;
    }

    const details = document.createElement("p");
    details.textContent = details_str

    card.appendChild(details);

    if (observation.description) {
        const maxWords = desc_word_limit;
        const words = String(observation.description).trim().split(/\s+/);

        const description = document.createElement("p");

        description.textContent = words.slice(0, maxWords).join(" ");

        if (words.length > maxWords) {
            description.textContent += "…";
        }

        card.appendChild(description);
    }

    if (sourceURL && !galleryBrokenGooglePhotos.has(sourceURL)) {
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
    // Add the DHM report associated with this observation's flood event.

    return card;
}

function renderGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    const observations = getFilteredObservations();
    const selectedEvent =
        document.getElementById("event-select")?.value || "all";

    gallery.replaceChildren();

    // Display observations matching the selected filters.
if (observations.length === 0) {
    const section = document.createElement("section");
    section.style.cssText =
        "grid-column:1/-1;padding:20px 24px;" +
        "background:#f5f8fa;border:1px solid #dce5e9;" +
        "border-radius:6px;";

    const heading = document.createElement("h3");
    heading.textContent = "Event Observations";

    const message = document.createElement("p");
    message.textContent =
        "No observation records are currently displayed " +
        "for this event under the selected filters.";

    const explanation = document.createElement("p");
    explanation.textContent =
        "This does not mean flooding did not occur. " +
        "DHM rainfall information may still be available " +
        "below as regional environmental context.";
    explanation.style.cssText =
        "font-size:13px;color:#586b75;margin-top:8px;";

    section.append(heading, message, explanation);
    gallery.appendChild(section);
}
    else {
        gallery.append(
            ...observations.map(createGalleryCard)
        );
    }

    // Display the DHM report for the selected event.
    if (selectedEvent !== "all") {
        const report = galleryDhmReports[selectedEvent];

        if (report) {
            const section = document.createElement("section");
            section.className = "panel report";
            section.style.gridColumn = "1 / -1";
            section.style.cssText =
                "grid-column:1/-1;display:flex;flex-direction:column;" +
                "align-items:flex-start;gap:12px;padding:24px;" +
                "border:1px solid #dce5e9;background:#fff;";

            const heading = document.createElement("h3");
            heading.textContent = "Environmental Context";

            const description = document.createElement("p");
            description.textContent =
                "DHM rainfall information associated with this " +
                "flood event. Regional reports do not necessarily " +
                "document rainfall at the exact flood location.";

            const link = document.createElement("a");
            link.href = report.url;
            link.textContent = report.label;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            section.append(heading, description, link);
            gallery.appendChild(section);
        }
    }
}

async function initializeGallery() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    gallery.textContent = "Loading observations and checking images…";

    try {
        const [observations, events, dhmReports, brokenLinks, observationMedia] = await Promise.all([
    loadCSV("data/processed_observations.csv"),
    loadCSV("data/events.csv"),
    loadCSV("data/event_dhm_reports.csv"),
    fetch("data/broken_google_photos.json").then(response => {
        if (!response.ok) {
            throw new Error(`Broken-link report HTTP ${response.status}`);
        }
                return response.json();
    }),
    fetch("data/observation_media.json").then(response => {
        if (!response.ok) {
            throw new Error(`Observation media HTTP ${response.status}`);
        }
        return response.json();
    })
]);

galleryBrokenGooglePhotos = new Set(brokenLinks);
galleryObservationMedia = observationMedia;

        galleryEvents = events;
        galleryObservations = observations;

galleryDhmReports = {};

dhmReports.forEach(report => {
    const eventId = String(report.event_id || "").trim();
    const url = getSourceURL(report.url);

    if (eventId && url) {
        galleryDhmReports[eventId] = {
            url: url,
            label: report.label || "View DHM rainfall report"
        };
    }
});
        populateGalleryFilters(galleryObservations);

        // Register one listener per dropdown.
        [
            "event-select",
            "evidence-type",
            "startDateFilter",
            "endDateFilter"
        ].forEach(id => {
            document.getElementById(id)?.addEventListener("change", renderGallery);
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