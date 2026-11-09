import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image

from fetch_news_article import get_article_elements
from fetch_metadata import verify_media_location
from fetch_geodata import get_location_details

min_width = 200
min_height = 150

request_timeout = 15
download_timeout = 120
max_download_bytes = 100 * 1024 * 1024  # 100 MiB per file.

###### Shared Helpers ######

def is_youtube_url(url):
    hostname = (urlparse(url).hostname or "").lower()

    return hostname in {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtu.be",
    }

def download_media(url, destination):
    downloaded_bytes = 0
    started = time.monotonic()

    with requests.get(
        url,
        stream=True,
        timeout=request_timeout,
    ) as response:
        response.raise_for_status()

        # Reject oversized files early when a size is provided.
        content_length = response.headers.get("Content-Length", "")

        if content_length.isdigit():
            if int(content_length) > max_download_bytes:
                raise ValueError("Media exceeds the download size limit.")

        content_type = (
            response.headers.get("Content-Type", "")
            .split(";")[0]
            .strip()
            .lower()
        )

        with destination.open("wb") as file:
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if time.monotonic() - started > download_timeout:
                    raise TimeoutError("Media download exceeded the time limit.")

                if not chunk:
                    continue

                downloaded_bytes += len(chunk)

                # Enforce the limit even when Content-Length is absent.
                if downloaded_bytes > max_download_bytes:
                    raise ValueError("Media exceeds the download size limit.")

                file.write(chunk)

    return content_type


###### Source URL Checks ######

def check_source_url(entry):
    url = str(entry.get("source_url") or "").strip()

    try:
        parsed = urlparse(url)

        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return "Missing or invalid source URL."

        # Accessing port checks for invalid port values.
        parsed.port

        with requests.get(
            url,
            timeout=request_timeout,
            stream=True,
            allow_redirects=True,
        ) as response:
            if not 200 <= response.status_code < 300:

                if response.status_code == 403:
                    return f"Manual entry required."
                
                return f"HTTP return: {response.status_code}."

    except Exception:
        return "Source URL could not be checked."

    return None


###### Media Location Checks ######

def check_media_location(entry, media_path):
    try:
        result = verify_media_location(
            entry.get("latitude"),
            entry.get("longitude"),
            media_path,
        )

        if result is True:
            return None

        if result is False:
            return "Media failed location verification."

        return "Media location could not be verified."

    except Exception:
        return "Media location check failed."


###### Image Processing ######

def check_image(entry, media_path, check_location=True):
    try:
        with Image.open(media_path) as image:
            image.load()
            width, height = image.size

        if width < min_width or height < min_height:
            return "Image is too small to display."

    except Exception:
        return "Image could not be decoded."

    if check_location:
        return check_media_location(entry, media_path)

    return None


def populate_image(entry):
    entry["image_url"] = str(entry["source_url"]).strip()


def process_image(entry, check_location=True):
    try:
        # Delete the downloaded file when this block exits.
        with tempfile.TemporaryDirectory() as temp_dir:
            media_path = Path(temp_dir) / "media"

            download_media(
                str(entry["source_url"]).strip(),
                media_path,
            )

            rejection_reason = check_image(
                entry,
                media_path,
                check_location=check_location,
            )

            if rejection_reason is not None:
                return rejection_reason

            populate_image(entry)

    except ValueError:
        return "Image exceeds the download size limit."

    except TimeoutError:
        return "Image download exceeded the time limit."

    except Exception:
        return "Image processing failed."

    return None


###### Video Processing ######

def get_youtube_info(video_url):
    response = requests.get(
        "https://www.youtube.com/oembed",
        params={
            "url": video_url,
            "format": "json",
        },
        timeout=request_timeout,
    )

    response.raise_for_status()
    data = response.json()

    return {
        "provider": "youtube",
        "type": data.get("type"),
        "title": data.get("title"),
        "author": data.get("author_name"),
    }


def check_video(entry, video_data, media_path=None):
    if video_data["provider"] == "youtube":
        if video_data.get("type") != "video":
            return "YouTube video metadata is unavailable."

        if not (video_data.get("title") or "").strip():
            return "YouTube video title is missing."

        # YouTube links do not provide original-file GPS metadata.
        return None

    # This checks the server's declared type, not video decoding.
    content_type = video_data.get("content_type", "")

    if not content_type.startswith("video/"):
        return "Video file type could not be confirmed."

    if media_path is None:
        return "Video file is unavailable for location verification."

    return check_media_location(entry, media_path)


def populate_video(entry, video_data):
    entry["video_url"] = str(entry["source_url"]).strip()

    if video_data["provider"] == "youtube":
        if video_data.get("title"):
            entry["observation_title"] = video_data["title"]

        if video_data.get("author"):
            entry["author"] = video_data["author"]


def process_video(entry):
    video_url = str(entry["source_url"]).strip()

    try:
        if is_youtube_url(video_url):
            video_data = get_youtube_info(video_url)

            rejection_reason = check_video(entry, video_data)

            if rejection_reason is not None:
                return rejection_reason

            populate_video(entry, video_data)

        else:
            # Direct video files need a local copy for GPS inspection.
            with tempfile.TemporaryDirectory() as temp_dir:
                media_path = Path(temp_dir) / "media"

                content_type = download_media(video_url, media_path)

                video_data = {
                    "provider": "direct",
                    "content_type": content_type,
                }

                rejection_reason = check_video(
                    entry,
                    video_data,
                    media_path=media_path,
                )

                if rejection_reason is not None:
                    return rejection_reason

                populate_video(entry, video_data)

    except ValueError:
        return "Video size or metadata is invalid."

    except TimeoutError:
        return "Video download exceeded the time limit."

    except Exception:
        return "Video processing failed."

    return None


###### News Report Processing ######

def check_news_report(article_data):
    title, _, _, _, source = article_data

    if not (title or "").strip() or not (source or "").strip():
        return "Headline or source missing."

    return None


def populate_news_report(entry, article_data):
    title, date, thumbnail, description, source = article_data

    entry["observation_title"] = title
    entry["author"] = source

    if date is not None:
        entry["publication_date"] = date

    if description:
        entry["description"] = description

    if thumbnail:
        thumbnail_entry = {"source_url": thumbnail}

        # A news thumbnail does not need to match submitted GPS.
        thumbnail_reason = process_image(
            thumbnail_entry,
            check_location=False,
        )

        if thumbnail_reason is None:
            entry["image_url"] = thumbnail_entry["image_url"]

def process_news_report(entry):
    try:
        article_data = get_article_elements(
            str(entry["source_url"]).strip()
        )

        rejection_reason = check_news_report(article_data)

        if rejection_reason is not None:
            return rejection_reason

        populate_news_report(entry, article_data)

    except Exception:
        return "News report processing failed."

    return None

###### Populate Location Fields ######

def populate_location(entry):
    details = get_location_details(
        entry.get("latitude"),
        entry.get("longitude"),
        max_river_distance_m=1000,
    )

    entry["watershed"] = details["watershed"]
    entry["river"] = details["river"]

    #if not entry.get("location"):
    #    entry["location"] = details["location_name"]

###### Processing Passes ######

common_passes = [
    check_source_url,
]

type_passes = {
    "image": [
        process_image,
    ],
    "video": [
        process_video,
    ],
    "news report": [
        process_news_report,
    ],
    "social media link": []
}