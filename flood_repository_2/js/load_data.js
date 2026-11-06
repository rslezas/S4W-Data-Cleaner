function loadJSON(path) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", path);
        request.timeout = 30000;
        request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
                reject(new Error(`${path}: HTTP ${request.status}`));
                return;
            }
            try {
                resolve(JSON.parse(request.responseText.replace(/^\uFEFF/, "")));
            } catch (error) {
                reject(new Error(`${path}: invalid JSON (${error.message})`));
            }
        };
        request.onerror = () => reject(new Error(`${path}: network error`));
        request.ontimeout = () => reject(new Error(`${path}: request timed out`));
        request.send();
    });
}

function loadCSV(path) {
    return new Promise((resolve, reject) => {
        Papa.parse(path, {
            download: true,
            header: true,
            skipEmptyLines: "greedy",

            // Remove surrounding spaces and any leading BOM.
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