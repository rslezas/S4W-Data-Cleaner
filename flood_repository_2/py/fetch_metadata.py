from pathlib import Path
import math
import json
import subprocess

request_timeout = 30

project_root = Path(__file__).resolve().parent.parent
exiftool_path = project_root / "tools" / "exiftool" / "exiftool.exe"

def get_gps(path):
    media_path = Path(path).resolve()

    if not media_path.is_file():
        return None

    try:
        result = subprocess.run(
            [
                str(exiftool_path),
                "-json",
                "-n",  # Return numeric coordinates in decimal degrees.
                "-GPSLatitude",
                "-GPSLongitude",
                str(media_path),
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=True,
            timeout=request_timeout,
        )

        metadata = json.loads(result.stdout)[0]

        latitude = metadata.get("GPSLatitude")
        longitude = metadata.get("GPSLongitude")

        if latitude is None or longitude is None:
            return None

        return {
            "Latitude": float(latitude),
            "Longitude": float(longitude),
        }

    except FileNotFoundError:
        raise RuntimeError(f"ExifTool executable not found: {exiftool_path}")

    except (
        subprocess.CalledProcessError,
        subprocess.TimeoutExpired,
        ValueError,
        IndexError,
    ) as error:
        return "Cannot read GPS metadata."

def verify_media_location(latitude, longitude, path):

    data = get_gps(path)

    if not data:
        return "No GPS data found."
    
    media_latitude = data.get("Latitude")
    media_longitude = data.get("Longitude")

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return "Invalid GPS coordinates submitted."
    
    if latitude is None or longitude is None:
        return "No GPS data found."

    error = pow(pow(latitude - media_latitude, 2) + pow(longitude - media_longitude, 2), 1/2)
    margin = 0.005 # ~525 meters

    return (error < margin)