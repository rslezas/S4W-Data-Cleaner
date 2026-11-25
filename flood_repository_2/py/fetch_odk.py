"""
from pyodk.client import Client
import pandas as pd

form_id = 'insert_form_id_here'

with Client() as client:
    data = client.submissions.get_table(form_id=form_id)
    responses = pd.json_normalize(data["value"], sep="/")
"""

import os
import requests
import json
import pandas as pd
from pathlib import Path
from image_censor import censorImage
from concurrent.futures import ThreadPoolExecutor

KOBO_URL = "https://kf.kobotoolbox.org"
TOKEN = os.environ["KOBO_TOKEN"]
ASSET_UID = "aT26khDKpxRHvRcqzgEo5x"

headers = {"Authorization": f"Token {TOKEN}"}

out_path = Path(r"data\observations.csv")

def has_value(v):
    return pd.notna(v) and str(v).strip() != ""

def get_source_url(observation):
    local = observation.get("local_filename")
    if has_value(local):
        return f"media/downloads/{local}"
    for field in ("Link_to_Social_Media_Post", "Link_to_News_Report"):
        value = observation.get(field)
        if has_value(value):
            return str(value).strip()
    return ""

def safe_download(row):
    try:
        download_attachment(row)
        return None
    except Exception as e:
        print(f"Download failed for {row['observation_id']}: {e}")
        return row["observation_id"]

def download_attachment(observation):
    save_path = Path("media") / "downloads" / observation["local_filename"]
    if save_path.exists():
        return
    save_path.parent.mkdir(parents=True, exist_ok=True)

    with requests.get(observation["attachment_url"], headers=headers,
                      stream=True, timeout=120) as r:
        r.raise_for_status()                      # currently an error page gets saved as the file
        tmp = save_path.with_name(save_path.name + ".part")
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(64 * 1024):
                f.write(chunk)
        tmp.replace(save_path)

def submissions_to_attachment_rows(submissions):
    # Accept a JSON string, a full API response, or a single submission
    if isinstance(submissions, str):
        submissions = json.loads(submissions)
    if isinstance(submissions, dict):
        submissions = submissions.get("results", [submissions])

    records = []
    for sub in submissions:
        base = {k: v for k, v in sub.items() if k != "_attachments"}
        atts = [a for a in sub.get("_attachments", []) if not a.get("is_deleted")]

        if not atts:
            records.append({**base, "observation_id": f"{sub['_id']}-1"})
            continue

        for i, a in enumerate(atts, start=1):
            ext = os.path.splitext(a["filename"])[1].lower()
            records.append({
                **base,
                "observation_id": f"{sub['_id']}-{i}",
                "attachment_uid": a["uid"],
                "attachment_url": a["download_url"],
                "local_filename": f"{a['uid']}{ext}",
            })

    return pd.json_normalize(records, sep="/")

def fetch_submissions():

    url = f"{KOBO_URL}/api/v2/assets/{ASSET_UID}/data/?format=json&limit=1000"

    rows = []
    while url:
        r = requests.get(url, headers=headers, timeout=60)
        r.raise_for_status()
        page = r.json()
        rows.extend(page["results"])
        url = page["next"]

    observations = submissions_to_attachment_rows(rows)

    existing_observations = pd.read_csv(out_path, low_memory=False)

    existing_ids = set(existing_observations["observation_id"])
    new_rows = observations[~observations["observation_id"].isin(existing_ids)]
    to_download = new_rows[new_rows["local_filename"].notna()]

    entries = []

    with ThreadPoolExecutor(max_workers=6) as pool:
        failed_ids = {i for i in pool.map(safe_download, (r for _, r in to_download.iterrows())) if i}
    new_rows = new_rows[~new_rows["observation_id"].isin(failed_ids)]

    for _, observation in new_rows.iterrows():

        if observation["observation_id"] in existing_ids:
            continue

        source_url = get_source_url(observation)

        loc = observation.get("Evidence_Location")
        parts = str(loc).split() if has_value(loc) else []
        latitude, longitude = (parts[0], parts[1]) if len(parts) >= 2 else ("", "")

        evidence_type = observation["Select_Evidence_Type"]

        new_entry = {
            "observation_id": observation["observation_id"],
            "event_id": "",
            "observation_title": observation["Name_of_Observation"],
            "event_name": "",
            "datetime": observation["Date_and_Time_of_Observation"],
            "river": "",
            "watershed": "",
            "location": "",
            "latitude": latitude,
            "longitude": longitude,
            "description": observation["textEvidence"],
            "source_url": source_url,
            "author": observation["author"],
            "evidence_type": evidence_type,
            "qc_flag": "Unchecked"
        }

        entries.append(new_entry)

    out_path.parent.mkdir(exist_ok=True)

    new_observations = pd.DataFrame(entries)

    existing_observations = pd.concat([existing_observations, new_observations], ignore_index=True)

    existing_observations.to_csv(out_path, index=False)

    print(f"Saved {len(new_observations)} rows from {len(rows)} submissions to {out_path}")

if __name__ == "__main__":
    fetch_submissions()