
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OBSERVATIONS_DIR = ROOT / "flood_repository" / "data" / "observations"
MANIFEST = OBSERVATIONS_DIR / "manifest.json"

def main():
    observations = []

    for file in sorted(OBSERVATIONS_DIR.glob("*.json")):
        if file.name == "manifest.json":
            continue

        with file.open("r", encoding="utf-8") as f:
            data = json.load(f)

        if (
            data.get("publication_consent") is True
            and data.get("verified") is True
        ):
            observations.append(file.name)

    MANIFEST.write_text(
        json.dumps({"observations": observations}, indent=2) + "\n",
        encoding="utf-8"
    )

    print(f"Manifest updated: {len(observations)} approved observations")

if __name__ == "__main__":
    main()
