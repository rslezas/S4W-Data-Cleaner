import json
import math
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform

max_river_distance = 1000 # meters

# Assumes this script is inside the project's py folder.
project_root = Path(__file__).resolve().parent.parent
geodata_dir = project_root / "data" / "geojson"

# Convert longitude/latitude to metres for Kathmandu Valley.
to_meters = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:32645",
    always_xy=True,
).transform

# Load and prepare each dataset once.
def load_features(filename, name_fields, allowed_types):
    with (geodata_dir / filename).open(
        encoding="utf-8-sig"
    ) as file:
        data = json.load(file)

    features = []

    for feature in data["features"]:
        geometry_data = feature.get("geometry")

        if not geometry_data:
            continue

        if geometry_data["type"] not in allowed_types:
            continue

        properties = feature.get("properties") or {}

        # Use the first available name without changing its capitalization.
        name = next(
            (
                str(properties[field]).strip()
                for field in name_fields
                if properties.get(field) is not None
                and str(properties[field]).strip()
            ),
            None,
        )

        if name is None:
            continue

        geometry = shape(geometry_data)

        if geometry.is_empty:
            continue

        if not geometry.is_valid:
            raise ValueError(f"Invalid geometry in {filename}.")

        features.append({
            "name": name,
            "geometry": geometry,
            "geometry_metres": transform(to_meters, geometry),
        })

    return features


watersheds = load_features(
    "watersheds.geojson",
    ["watershed", "name"],
    {"Polygon", "MultiPolygon"},
)
"""
municipalities = load_features(
    "kathmandu_municipalities.geojson",
    ["name:en", "name"],
    {"Polygon", "MultiPolygon"},
)
"""
rivers = load_features(
    "rivers.geojson",
    ["river", "name:en", "name"],
    {"LineString", "MultiLineString"},
)


def find_containing_name(point, features):
    for feature in features:
        if feature["geometry"].covers(point):
            return feature["name"]

    return None

def get_location_details(latitude, longitude, max_river_distance_m=None):
    result = {
        "watershed": None,
        "location_name": None,
        "river": None,
        "river_distance_m": None,
    }

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return result

    if not (
        math.isfinite(latitude)
        and math.isfinite(longitude)
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    ):
        return result

    # GeoJSON and Shapely use longitude first.
    point = Point(longitude, latitude)

    result["watershed"] = find_containing_name(point, watersheds)
    #result["location_name"] = find_containing_name(point, municipalities)

    if rivers:
        point_metres = transform(to_meters, point)

        nearest = min(
            rivers,
            key=lambda river: river["geometry_metres"].distance(point_metres),
        )

        distance = nearest["geometry_metres"].distance(point_metres)
        result["river_distance_m"] = round(distance, 1)

        # Optionally avoid assigning a river that is too far away.
        if max_river_distance_m is None or distance <= max_river_distance_m:
            result["nearest_river"] = nearest["name"]

    return result