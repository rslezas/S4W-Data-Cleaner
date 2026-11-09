from newspaper import Article
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from dateutil.parser import parse
import datetime as dt
import pandas as pd
import re

def get_article_elements(url):

    article = Article(url)
    article.download()
    article.parse()

    title = repr(article.title).replace(r"\u200d", "")

    date = article.publish_date

    if isinstance(date, str):
        date = parse(date, dayfirst=True) if date.strip() else None

    parsed_date = date.strftime("%Y-%m-%d, %H:%M:%S") if date is not None else None

    thumbnail, caption = fetch_thumbnail(article)
    attribution = fetch_attribution(article, url)

    # Removed parsed date for now
    return title, None, thumbnail, caption, attribution

def fetch_thumbnail(article):
    # Accept an Article that has already been downloaded and parsed.

    image_url = repr(article.top_image).strip("'")

    if not image_url:
        return None, None

    soup = BeautifulSoup(article.html, "html.parser")

    for image in soup.find_all("img"):
        sources = [
            image.get("src"),
            image.get("data-src")
        ]

        matches = any(
            urljoin(article.url, source) == image_url
            for source in sources
            if source
        )

        if matches:
            figure = image.find_parent("figure")
            caption = figure.find("figcaption") if figure else None

            if caption:
                return image_url, caption.get_text(" ", strip=True)

    # A missing caption should not discard the image.
    return image_url, None

def fetch_attribution(article, url):

    #site_name = article.meta_data.get("og", {}).get("site_name")

    #if not site_name:
    site_name = (urlparse(url).hostname or "").removeprefix("www.")

    # Use the publication alone when no author was found.
    return site_name