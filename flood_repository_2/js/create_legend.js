function createEvidenceLegend(evidenceColors)
{
    const evidenceLegend = L.control({
        position: "bottomright"
    });

    evidenceLegend.onAdd = function () {
        const container = L.DomUtil.create("div", "map-legend");

        container.setAttribute("role", "group");
        container.setAttribute("aria-label", "Map marker legend");

        const heading = document.createElement("strong");
        heading.textContent = "Observation Types";
        container.appendChild(heading);

        // Use the same colours as the marker icons.
        const entries = [
            ["Flood Event", "#000000"],
            ["Image", evidenceColors["image"]],
            ["Video", evidenceColors["video"]],
            ["Social Media Link", evidenceColors["social media link"]],
            ["News Report", evidenceColors["news report"]],
            ["Official Report", evidenceColors["official report"]],
            ["Other", evidenceColors["not provided"]]
        ];

        entries.forEach(function ([label, color]) {
            const row = document.createElement("div");
            row.className = "map-legend-row";

            const symbol = document.createElement("span");
            symbol.className = "map-legend-symbol";
            symbol.style.backgroundColor = color;
            symbol.setAttribute("aria-hidden", "true");

            const text = document.createElement("span");
            text.textContent = label;

            row.append(symbol, text);
            container.appendChild(row);
        });

        // Interacting with the legend should not move or zoom the map.
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
    };

    return evidenceLegend
}