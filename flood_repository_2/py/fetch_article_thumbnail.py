from newspaper import Article
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

def fetch_thumbnail(url):
    article = Article(url)

    thumbnail = article.top_image
    caption = get_image_caption(article)

    return thumbnail, caption

def get_image_caption(article):

    soup = BeautifulSoup(article.html, "html.parser")

    for image in soup.find_all("img"):
        # Some websites load images through data-src instead of src.
        sources = [
            image.get("src"),
            image.get("data-src")
        ]

        matches_top_image = any(
            urljoin(article.url, source) == article.top_image
            for source in sources
            if source
        )

        if not matches_top_image:
            continue

        figure = image.find_parent("figure")

        if figure:
            caption = figure.find("figcaption")

            if caption:
                return caption.get_text(" ", strip=True)

    return None

def get_publisher(url):
    article = Article(url)
    article.download()
    article.parse()

    site_name = article.meta_data.get("og", {}).get("site_name")

    if site_name:
        return site_name

    # Fallback: "www.cnn.com" becomes "cnn.com".
    return (urlparse(url).hostname or "").removeprefix("www.")