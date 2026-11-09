const placeholder_src = "https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg"

let galleryObservations = [];
let galleryEvents = [];

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

function getYouTubeEmbedURL(source) {
    try {
        const url = new URL(source);
        const host = url.hostname.replace(/^www\./, "");
        let videoId;

        // Shortened links: https://youtu.be/VIDEO_ID
        if (host === "youtu.be") {
            videoId = url.pathname.split("/")[1];
        } else if (["youtube.com", "m.youtube.com"].includes(host)) {
            // Standard links: https://youtube.com/watch?v=VIDEO_ID
            if (url.pathname === "/watch") {
                videoId = url.searchParams.get("v");
            } else if (/^\/(shorts|embed)\//.test(url.pathname)) {
                // Shorts and existing embed links.
                videoId = url.pathname.split("/")[2];
            }
        }

        // YouTube video IDs contain 11 letters, numbers, underscores, or hyphens.
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoId || "")) {
            return `https://www.youtube.com/embed/${videoId}`;
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

    const approvedObservations = galleryObservations.filter(observation =>
        allowedFlags.includes(getQCFlag(observation))
    );

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

    if (type == "video" && videoURL) {

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
    else if (imageURL) {
        const image = document.createElement("img");

        image.alt = title.textContent;
        image.style.width = "100%";
        image.style.display = "block";

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
            loadCSV("data/processed_observations.csv"),
            loadCSV("data/events.csv")
        ]);

        galleryEvents = events;
        galleryObservations = observations;

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