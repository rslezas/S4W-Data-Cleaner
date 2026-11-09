import csv
import pandas as pd
import datetime as dt
import pathlib
import time
import requests
from pathlib import Path
from image_censor import censorImage, censorImages
from tqdm import tqdm

from observation_checks import common_passes, type_passes, populate_location

observations_path = Path(r"data/observations.csv")
observations_output_path = Path(r"data/processed_observations.csv")

observations = pd.read_csv(observations_path, low_memory=False)
records = observations.to_dict("records")

passed_entries = []
rejected_entries = []

# Create a function that only processes new observations every so often

def process_observation(entry):
    evidence_type = str(entry.get("evidence_type") or "").strip().lower()

    if evidence_type not in type_passes:
        return "Unsupported evidence type."

    passes = common_passes + type_passes[evidence_type]

    for processing_pass in passes:
        rejection_reason = processing_pass(entry)

        if rejection_reason is not None:
            return rejection_reason

    return None

for observation in tqdm(records, desc="Processing observations", unit="entry"):

    entry = observation.copy()

    rejection_reason = process_observation(entry)

    rejection_reason = process_observation(entry)

    if rejection_reason is None:
        populate_location(entry)

        entry["qc_flag"] = "AutoPassed"
        passed_entries.append(entry)
    else:
        entry["qc_flag"] = "AutoRejected"
        entry["rejection_reason"] = rejection_reason
        rejected_entries.append(entry)

processed_observations = (
    pd.DataFrame(passed_entries + rejected_entries)
    .reset_index(drop=True)
)

processed_observations.to_csv(observations_output_path, index=False, encoding="utf-8-sig")