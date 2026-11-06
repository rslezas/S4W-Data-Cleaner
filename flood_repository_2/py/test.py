from newspaper import Article
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from dateutil.parser import parse
import datetime as dt
import pandas as pd

article = Article(r"https://nepalitimes.com/when-it-rains-it-pours-ksqprbu3")
article.download()
article.parse()

print("Downloaded HTML length:", len(article.html or ""))
print("Title:", repr(article.title))
print("Image:", repr(article.top_image))

# Save the response so you can inspect what the script received.
with open("downloaded_article.html", "w", encoding="utf-8") as file:
    file.write(article.html or "")