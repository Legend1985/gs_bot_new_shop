import sys
import re
import requests
from bs4 import BeautifulSoup


def fetch(url: str) -> str:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_names(html: str):
    soup = BeautifulSoup(html, 'html.parser')
    names = []

    # Основные селекторы
    for h in soup.select('h3.product-title, h3.title, h3, h2, a.title, a.product-title'):
        txt = h.get_text(strip=True)
        if not txt:
            continue
        # Отсеиваем явные не-названия
        if len(txt) < 5:
            continue
        names.append(txt)

    # Удаляем дубли, сохраняем порядок
    seen = set()
    unique = []
    for n in names:
        if n not in seen:
            seen.add(n)
            unique.append(n)
    return unique


def main():
    url = 'https://guitarstrings.com.ua/electro/11-electric?limitstart=0&limit=150'
    if len(sys.argv) > 1:
        url = sys.argv[1]
    html = fetch(url)
    names = parse_names(html)
    print(f"Всего найдено (сырые заголовки): {len(names)}")
    for n in names:
        print(f"- {n}")


if __name__ == '__main__':
    main()


