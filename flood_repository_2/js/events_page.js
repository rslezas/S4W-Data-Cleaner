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

            const events = results.data.filter(e => e.event_id && e.event_name);
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

if (sources.length === 0) {
    sourcesContainer.textContent = "Evidence sources are being reviewed.";
} else {
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
                updateEventTimeline(event);
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
        gallery.textContent = "No photographs available for this event.";
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

        gallery.appendChild(previous);
        gallery.appendChild(next);
    }

    updatePhoto();
}


const dhmReports = {
    "FLOOD-2023-001": {
    url: "https://dhm.gov.np/uploads/dhm/climateService/August_2023-Preliminary_precipitation_and_temperature_summary.pdf",
    label: "Environmental Context: DHM August 2023 rainfall report"
    },
    "FLOOD-2023-002": {
    url: "https://dhm.gov.np/uploads/dhm/climateService/August_2023-Preliminary_precipitation_and_temperature_summary.pdf",
    label: "Environmental Context: DHM August 2023 rainfall report"
    },

    "FLOOD-2024-001": {
        url: "https://dhm.gov.np/uploads/dhm/downloads/Situational_Report_on_Extreme_Precipitation_and_Flooding_Event_of_27-29_September_2024.pdf",
        label: "Read DHM flood report"
    },
    "FLOOD-2024-002": {
        url: "https://dhm.gov.np/uploads/dhm/climateService/July_2024-Preliminary_precipitation_and_temperature_summary.pdf",
        label: "Environmental Context: DHM July 2024 rainfall report"
    },

    "FLOOD-2024-003": {
    url: "https://dhm.gov.np/uploads/dhm/climateService/July_2024-Preliminary_precipitation_and_temperature_summary.pdf",
    label: "Environmental Context: DHM July 2024 rainfall report"
    },

    "FLOOD-2024-004": {
    url: "https://dhm.gov.np/uploads/dhm/climateService/July_2024-Preliminary_precipitation_and_temperature_summary.pdf",
    label: "Environmental Context: DHM July 2024 rainfall report"
    },

    "FLOOD-2024-005": {
    url: "https://dhm.gov.np/uploads/dhm/climateService/July_2024-Preliminary_precipitation_and_temperature_summary.pdf",
    label: "Environmental Context: DHM July 2024 rainfall report"
    }
};

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


function updateEventTimeline(event) {
    const timeline = document.getElementById("event-timeline");
    if (!timeline) return;

    timeline.innerHTML = "";

    const entry = document.createElement("article");

    const date = document.createElement("span");
    date.textContent = event.datetime || "Date unavailable";

    const title = document.createElement("h3");
    title.textContent = "Documented flood event";

    const description = document.createElement("p");
    description.textContent =
        event.description || "No event description available.";

    entry.append(date, title, description);
    timeline.appendChild(entry);

    const report = dhmReports[event.event_id];

    if (report) {
        const context = document.createElement("article");

        const heading = document.createElement("h3");
        heading.textContent = "Environmental Context";

        const explanation = document.createElement("p");
        explanation.textContent =
            "Supporting DHM documentation. Regional rainfall information does not necessarily measure conditions at the exact flood location.";

        const link = document.createElement("a");
        link.href = report.url;
        link.textContent = report.label;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        context.append(heading, explanation, link);
        timeline.appendChild(context);
    }
}

