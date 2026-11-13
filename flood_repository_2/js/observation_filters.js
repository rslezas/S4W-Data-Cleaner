function normalizeFilterValue(value) {
    return String(value ?? "").trim().toLowerCase();
}

// Accept YYYY-MM-DD, ISO timestamps, or MM/DD/YYYY.
// Compare calendar dates without converting between timezones.
function observationDateKey(value) {
    const text = String(value ?? "").trim();

    let year;
    let month;
    let day;

    const iso = text.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ,])/
    );

    const american = text.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:$|[T ,])/
    );

    if (iso) {
        [, year, month, day] = iso.map(Number);
    } else if (american) {
        [, month, day, year] = american.map(Number);
    } else {
        return null;
    }

    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    // Reject invalid dates such as February 31.
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return year * 10000 + month * 100 + day;
}

// Return matching observations
function get_filtered_observations(
    observations,
    {
        event = "all",
        watershed = "all",
        river = "all",
        observationType = "all",
        brokenPhotoURLs = new Set(),
        startDate = "",
        endDate = "",
        recentEventIds = new Set(),
        riverNormalizer = normalizeFilterValue,
    } = {}
) {
    const selectedEvent = String(event ?? "all").trim();

    const start = startDate ? observationDateKey(startDate) : null;
    const end = endDate ? observationDateKey(endDate) : null;

    if (
        (startDate && start === null) ||
        (endDate && end === null)
    ) {
        throw new Error("Select valid start and end dates.");
    }

    if (start !== null && end !== null && start > end) {
        throw new Error("Start date must be on or before the end date.");
    }

    function matches(selected, actual) {
        return (
            normalizeFilterValue(selected) === "all" ||
            normalizeFilterValue(selected) === normalizeFilterValue(actual)
        );
    }

    return observations.filter(observation => {
        const eventId = String(observation.event_id ?? "").trim();

        const matchesEvent =
            selectedEvent === "all" ||
            (
                selectedEvent === "recent"
                    ? recentEventIds.has(eventId)
                    : eventId === selectedEvent
            );

        const originalType =
    String(observation.evidence_type ?? "").trim().toLowerCase();

const getValidURL = value => {
    try {
        const url = new URL(String(value ?? "").trim());
        return ["http:", "https:"].includes(url.protocol)
            ? url.href
            : null;
    } catch {
        return null;
    }
};

const imageURL =
    getValidURL(observation.image_url) ||
    getValidURL(observation.source_url);

const videoURL =
    getValidURL(observation.video_url) ||
    getValidURL(observation.source_url);

const brokenLinks =
    typeof galleryBrokenGooglePhotos !== "undefined"
        ? galleryBrokenGooglePhotos
        : brokenPhotoURLs;

const hasImage =
    originalType === "image" &&
    imageURL &&
    !brokenLinks.has(imageURL);

const hasVideo =
    originalType === "video" && videoURL;

const evidenceType =
    !hasImage && !hasVideo
        ? "Flood Observation"
        : originalType;

        const date = observationDateKey(observation.datetime);

        // Undated observations remain visible unless a date limit is applied.
        const matchesDate =
            (start === null && end === null) ||
            (
                date !== null &&
                (start === null || date >= start) &&
                (end === null || date <= end)
            );

        return (
            matchesEvent &&
            matches(watershed, observation.watershed) &&
            (
                normalizeFilterValue(river) === "all" ||
                riverNormalizer(river) === riverNormalizer(observation.river ?? "")
            ) &&
            (
    normalizeFilterValue(observationType) === "all" ||
    (
        normalizeFilterValue(observationType) === "flood observation"
            ? !hasImage && !hasVideo
            : normalizeFilterValue(observationType) === "image"
                ? Boolean(hasImage)
                : normalizeFilterValue(observationType) === "video"
                    ? Boolean(hasVideo)
                    : matches(observationType, originalType)
    )
) &&
            matchesDate
        );
    });
}