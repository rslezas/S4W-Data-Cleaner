let dhmReports = {};
document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("event-select");

    Papa.parse("data/events.csv", {
        download: true,
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: header => header.replace(/^\uFEFF/, "").trim(),

        complete: async results => {
            if (results.errors.length) {
                console.error("Error loading events:", results.errors);
                return;
            }

           const events = results.data
    .filter(e => e.event_id && e.event_name)
    .sort((a, b) => {
        const dateA = Date.parse(a.datetime || "");
        const dateB = Date.parse(b.datetime || "");

        const validA = Number.isFinite(dateA);
        const validB = Number.isFinite(dateB);

        if (validA && validB) return dateB - dateA;
        if (validA) return -1;
        if (validB) return 1;

        return a.event_name.localeCompare(b.event_name);
    });
            // Load the 100-word event summaries from a separate CSV file.
const summaryResults = await new Promise((resolve, reject) => {
    Papa.parse("data/event_summaries.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject
    });
});

const eventSummaries = Object.fromEntries(
    summaryResults.data.map(row => [row.event_id, row.summary])
);
// Load DHM environmental context reports from CSV.
const dhmResults = await new Promise((resolve, reject) => {
    Papa.parse("data/event_dhm_reports.csv", {
        download: true,
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: header => header.replace(/^\uFEFF/, "").trim(),
        complete: resolve,
        error: reject
    });
});

if (dhmResults.errors.length) {
    console.error("Error parsing DHM reports:", dhmResults.errors);
}

dhmReports = Object.fromEntries(
    dhmResults.data
        .filter(row => row.event_id && row.url)
        .map(row => [
            row.event_id,
            {
                url: row.url,
                label: row.label
            }
        ])
);

            dropdown.innerHTML = "";

            events.forEach(event => {
                const option = document.createElement("option");
                option.value = event.event_id;
                option.textContent = event.event_name;
                dropdown.appendChild(option);
            });

            function showEvent(eventId) {
                const event = events.find(e => e.event_id === eventId);
                if (!event) return;

                document.getElementById("event-title").textContent = event.event_name;
                document.getElementById("event-date").textContent =
                    [event.datetime, event.location].filter(Boolean).join(" - ");
                document.getElementById("event-description").textContent =
                    event.description || "No description available.";
                // Display the event-specific summary on the Flood Events page.


document.getElementById("event-summary").textContent =
    eventSummaries[event.event_id] ||
    "An event summary is being prepared."; 
    // Original evidence links for each flood event.
const eventSources = {
    "FLOOD-2023-002": [
        {
            label: "Setopati - Siddhitol flood photograph",
            url: "https://en.setopati.com/uploads/editor/Kathmandu-Flood-2023/Bishnumati-Flood-03.jpeg"
        },
        {
            label: "Setopati - Tokha flood photograph",
            url: "https://en.setopati.com/uploads/editor/Kathmandu-Flood-2023/Bishnumati-Flood-13.jpeg"
        },
        {
            label: "DHM - August 2023 rainfall report",
            url: "https://dhm.gov.np/uploads/dhm/climateService/August_2023-Preliminary_precipitation_and_temperature_summary.pdf"
        }
    ]
};

// Display sources only on the Flood Events page.
const sourcesContainer = document.getElementById("event-sources");
sourcesContainer.replaceChildren();

const sources = [];

if (
    event.sourceUrl &&
    /^https?:\/\//i.test(event.sourceUrl.trim()) &&
    !(
        dhmReports[event.event_id] &&
        /dhm\.gov\.np/i.test(event.sourceUrl)
    )
) {
    sources.push({
        label: (() => {
            const url = event.sourceUrl.toLowerCase();

            if (url.includes("kathmandupost.com")) return "The Kathmandu Post - News Article";
            if (url.includes("onlinekhabar.com")) return "Onlinekhabar - News Article";
            if (url.includes("nepallive.com")) return "Nepal Live - News Article";
            if (url.includes("setopati.com")) return "Setopati - News Article";
            if (url.includes("youtube.com") || url.includes("youtu.be")) return "Watch Video Evidence";
            if (url.includes("dhm.gov.np")) return "Department of Hydrology and Meteorology - Report";
            if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) return "View Original Photograph";

            return event.evidenceSource || "View Original Evidence Source";
        })(),
        url: event.sourceUrl.trim()
    });
}

const sourcesSection = document.querySelector(".event-sources-section");

if (sources.length === 0) {
    sourcesSection.style.display = "none";
} else {
    sourcesSection.style.display = "";
    
    const sourceList = document.createElement("ul");

    sources.forEach(source => {
        const item = document.createElement("li");
        const link = document.createElement("a");

        link.href = source.url;
        link.textContent = source.label;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        item.appendChild(link);
        sourceList.appendChild(item);
    });

    sourcesContainer.appendChild(sourceList);
}
                showEventPhotos(event);
                updateDhmLink(event.event_id);
                
            }

            dropdown.addEventListener("change", () => {
                showEvent(dropdown.value);
            });

            if (events.length) showEvent(events[0].event_id);
        },

        error: error => console.error("Error loading events:", error)
    });
});

function showEventPhotos(event) {
    const gallery = document.getElementById("event-gallery");
    if (!gallery) return;

    const photos = Object.keys(event)
    .filter(key => /^photos\/\d+$/.test(key))
    .sort((a, b) => Number(a.split("/")[1]) - Number(b.split("/")[1]))
    .map(key => event[key])
    .filter(photo => photo && photo.trim());

if (
    photos.length === 0 &&
    event.evidenceType === "Image" &&
    /^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(event.sourceUrl || "")
) {
    photos.push(event.sourceUrl);
}
    gallery.innerHTML = "";

    if (!photos.length) {
        gallery.textContent = "";

        if (
            event.evidenceType === "Video" &&
            /^https?:\/\//i.test(event.sourceUrl || "")
        ) {
            const videoUrl = new URL(event.sourceUrl);
            let videoId = null;

            if (
                videoUrl.hostname === "www.youtube.com" ||
                videoUrl.hostname === "youtube.com"
            ) {
                videoId = videoUrl.searchParams.get("v");
            } else if (videoUrl.hostname === "youtu.be") {
                videoId = videoUrl.pathname.slice(1);
            }

            if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
                const iframe = document.createElement("iframe");
                iframe.src = "https://www.youtube-nocookie.com/embed/" + videoId;
                iframe.title = "Flood video evidence";
                iframe.style.cssText = "width:100%;aspect-ratio:16/9;border:0;";
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                iframe.allowFullscreen = true;
                iframe.loading = "lazy";
                gallery.appendChild(iframe);
            } else {
                gallery.textContent = "Video preview unavailable.";
            }
        } else {
            gallery.textContent = "No photographs available for this event.";
        }

        if (
            event.evidenceType === "Video" &&
            /^https?:\/\//i.test(event.sourceUrl || "")
        ) {
            const videoLink = document.createElement("a");
            videoLink.href = event.sourceUrl;
            videoLink.textContent = "Watch Video Evidence";
            videoLink.target = "_blank";
            videoLink.rel = "noopener noreferrer";
            videoLink.style.cssText = "display:block;margin-top:10px;";
            gallery.appendChild(videoLink);
        }
        return;
    }

    let current = 0;

    const image = document.createElement("img");
    image.style.cssText = "width:100%;max-height:280px;object-fit:contain;";
    image.alt = "Flood photograph: " + event.event_name;

    const counter = document.createElement("p");
    counter.style.textAlign = "center";

    function updatePhoto() {
        const photo = photos[current];

        image.src = /^https?:\/\//i.test(photo)
            ? photo
            : "media/" +
                encodeURIComponent(event.event_id) + "/" +
                encodeURIComponent(photo);

        counter.textContent = `Photo ${current + 1} of ${photos.length}`;
    }

    gallery.appendChild(image);
    gallery.appendChild(counter);

    if (photos.length > 1) {
        const previous = document.createElement("button");
        previous.textContent = "Previous";

        const next = document.createElement("button");
        next.textContent = "Next";

        previous.onclick = () => {
            current = (current - 1 + photos.length) % photos.length;
            updatePhoto();
        };

        next.onclick = () => {
            current = (current + 1) % photos.length;
            updatePhoto();
        };

        const navigation = document.createElement("div");
        navigation.style.cssText = "display:flex;justify-content:center;align-items:center;gap:12px;margin-top:8px;";

        previous.style.cssText = "padding:6px 14px;cursor:pointer;";
        next.style.cssText = "padding:6px 14px;cursor:pointer;";

        navigation.appendChild(previous);
        navigation.appendChild(next);
        gallery.appendChild(navigation);
    }

    updatePhoto();
}




function updateDhmLink(eventId) {
    const link = document.getElementById("event-dhm-link");
    if (!link) return;

    const report = dhmReports[eventId];

    if (report) {
        link.href = report.url;
        link.textContent = report.label;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.hidden = false;
        link.style.display = "";
    } else {
        link.removeAttribute("href");
        link.hidden = true;
        link.style.display = "none";
    }
}

