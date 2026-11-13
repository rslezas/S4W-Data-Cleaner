
import csv
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Locate the repository data folder.
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"

INPUT_FILE = DATA_DIR / "processed_observations.csv"
OUTPUT_FILE = DATA_DIR / "google_photos_link_report.csv"

BROKEN_MESSAGES = [
    "photo not found",
    "album not found",
    "this album is no longer available",
    "this photo is no longer available",
]

def collect_links():
    links = set()

    with INPUT_FILE.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            for field in ("source_url", "image_url", "additional_source_urls"):
                value = (row.get(field) or "").strip()

                # Additional photo URLs are separated by |.
                for item in value.split("|"):
                    url = item.strip()

                    if url.startswith("https://photos.google.com/"):
                        links.add(url)

    return sorted(links)



def check_link(page, url):
    try:
        # Monitor temporary Google Photos error messages.
        page.add_init_script("""
            window.detectedPhotoErrors = [];

            const observer = new MutationObserver(() => {
                const text = document.body?.innerText?.toLowerCase() || "";

                const messages = [
                    "photo not found",
                    "album not found",
                    "this album is no longer available",
                    "this photo is no longer available"
                ];

                for (const message of messages) {
                    if (text.includes(message) &&
                        !window.detectedPhotoErrors.includes(message)) {
                        window.detectedPhotoErrors.push(message);
                    }
                }
            });

            observer.observe(document, {
                childList: true,
                subtree: true,
                characterData: true
            });
        """)

        response = page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=30000,
        )

        page.wait_for_timeout(10000)

        errors = page.evaluate("window.detectedPhotoErrors || []")

        if errors:
            return "BROKEN", "Google Photos displayed: " + ", ".join(errors)

        if response and response.status >= 400:
            return "UNCERTAIN", f"HTTP status {response.status}"

        return "UNCERTAIN", "No missing-photo message detected"

    except PlaywrightTimeoutError:
        return "UNCERTAIN", "Page timed out"

    except Exception as error:
        return "UNCERTAIN", str(error)[:200]



def main():
    links = collect_links()

    print(f"Found {len(links)} unique Google Photos links.")

    results = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()

        for index, url in enumerate(links, start=1):
            status, reason = check_link(page, url)

            results.append({
                "url": url,
                "status": status,
                "reason": reason,
            })

            print(f"[{index}/{len(links)}] {status}: {url}")

        browser.close()

    with OUTPUT_FILE.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["url", "status", "reason"],
        )
        writer.writeheader()
        writer.writerows(results)

    print(f"\nReport saved to: {OUTPUT_FILE}")
    print(f"Broken: {sum(r['status'] == 'BROKEN' for r in results)}")
    print(f"Uncertain: {sum(r['status'] == 'UNCERTAIN' for r in results)}")


if __name__ == "__main__":
    main()
