import csv
import pandas as pd
import datetime as dt
import pathlib
import time
import requests
from pathlib import Path
from fetch_metadata import verify_image_location
from image_censor import censorImage, censorImages
from fetch_news_article import get_article_elements

observations_path = Path(r"data/observations.csv")
observations_output_path = Path(r"data/passed_observations.csv")

observations = pd.read_csv(observations_path, low_memory=False)

placeholder_src = r"https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg"

def get_youtube_info(video_url):
    response = requests.get(
        "https://www.youtube.com/oembed",
        params={
            "url": video_url,
            "format": "json"
        },
        timeout=15
    )

    response.raise_for_status()
    data = response.json()

    return data.get("author_name"), data.get("title")

passed_entries = []

records = len(observations)
i = 0

for _, entry in observations.iterrows():

    i += 1
    print(f"{i} / {records} observations processed")

    time.sleep(0.05)

    type = entry["evidence_type"].lower()
    link = entry["source_url"]

    entry["image_src"] = ""
    entry["video_src"] = ""

    if type == "image":

        entry["image_src"] = link

    elif type == "video":

        entry["video_src"] = link

        if "youtube" in link or "youtu.be" in link:
            channel, title = get_youtube_info(link)

            entry["observation_title"] = title
            entry["author"] = channel
             

    elif type == "news report":

        try:

            title, date, thumbnail, caption, attribution = get_article_elements(link)

            if title is not None: 
                entry["observation_title"] = title
            if date is not None:
                entry["datetime"] = date
            if thumbnail is not None:
                entry["image_src"] = thumbnail
            if caption is not None:
                entry["description"] = caption
            if attribution is not None:
                entry["author"] = attribution

        except Exception as e:

            print(f"Failed to get article elements: {e}")

            entry["image_src"] = placeholder_src
            entry["description"] = str(e)

    #elif type == "social media link":

        # Look into scraping images from social media links

    #elif type == "Other":

        # Figure out what to do here

    passed_entries.append(entry)

passed_observations = (
    pd.DataFrame(passed_entries)
    .reset_index(drop=True)
)

passed_observations.to_csv(observations_output_path, index=False, encoding="utf-8-sig")