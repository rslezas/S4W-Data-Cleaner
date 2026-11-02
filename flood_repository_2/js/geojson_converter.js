function observationsToGeoJSON(rows) {
    return {
        type: "FeatureCollection",

        features: rows
            .filter(row => {
                // Reject blanks before converting them to numbers.
                if (
                    String(row.latitude ?? "").trim() === "" ||
                    String(row.longitude ?? "").trim() === ""
                ) {
                    return false;
                }

                const lat = Number(row.latitude);
                const lng = Number(row.longitude);

                return (
                    Number.isFinite(lat) &&
                    Number.isFinite(lng) &&
                    lat >= -90 && lat <= 90 &&
                    lng >= -180 && lng <= 180
                );
            })
            .map(row => {
                const { latitude, longitude, ...properties } = row;

                return {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [
                            Number(longitude),
                            Number(latitude)
                        ]
                    },
                    properties
                };
            })
    };
}