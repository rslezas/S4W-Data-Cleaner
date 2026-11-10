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