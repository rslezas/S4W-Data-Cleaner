import trafilatura
from newspaper import Article
from dateutil.parser import parse
from urllib.parse import urlparse
import re

word_limit = 100

def clean_text(text):
    if text is None:
        return None

    # Decode selected literal Unicode escapes without altering Nepali letters.
    replacements = {
        "200b": "\u200b",  # Zero-width space.
        "200c": "\u200c",  # Zero-width non-joiner.
        "200d": "\u200d",  # Zero-width joiner.
        "feff": "\ufeff",  # BOM / zero-width no-break space.
    }

    text = re.sub(
        r"\\u(200b|200c|200d|feff)",
        lambda match: replacements[match.group(1).lower()],
        str(text),
        flags=re.IGNORECASE,
    )

    # Remove BOM characters, but preserve joining characters.
    return text.replace("\ufeff", "").strip()

def get_article_elements(url):
    article = Article(url)
    article.download()
    article.parse()

    title = clean_text(article.title)
    thumbnail = article.top_image or None
    date = article.publish_date

    if isinstance(date, str):
        date = parse(date, dayfirst=True) if date.strip() else None

    description = trafilatura.extract(
        article.html,
        url=url,
        output_format="txt",
        include_comments=False,
        include_tables=False,
        include_images=False,
        favor_precision=True,
    )

    description = ' '.join(description.split()[:word_limit])

    description = clean_text(description)

    source = (urlparse(url).hostname or "").removeprefix("www.")

    return title, date, thumbnail, description, source