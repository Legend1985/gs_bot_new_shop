#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Проверка категории «10 калибр электро» (аналогично скрипту для 09).

Функции:
- Загружает эталон из KNOWLEDGE_BASE_10_GAUGE.md (строки, начинающиеся с "- ").
- Загружает все товары из API.
- Показывает количество уникальных найденных, дубликаты и отсутствующие из эталона.

Запуск:
    python check_10_gauge_category.py
или с параметрами:
    python check_10_gauge_category.py --api http://localhost:8000 --kb KNOWLEDGE_BASE_10_GAUGE.md
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from typing import List, Dict, Set

import requests


def read_reference_list(kb_path: str) -> List[str]:
    items: List[str] = []
    with open(kb_path, "r", encoding="utf-8") as kb:
        for line in kb:
            line = line.rstrip("\n")
            if line.strip().startswith("- "):
                name = line.strip()[2:].strip()
                if name:
                    items.append(name)
    return items


def fetch_all_products(api_base: str) -> List[Dict]:
    products: List[Dict] = []
    start = 0
    limit = 1000
    session = requests.Session()
    while True:
        url = f"{api_base}/api/products?start={start}&limit={limit}"
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        page_products = data.get("products", []) or []
        products.extend(page_products)
        if not data.get("hasMore"):
            break
        start += limit
    return products


def normalize_exact(name: str) -> str:
    return (name or "").lower().strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Проверка категории 10 калибр электро")
    parser.add_argument("--api", default="http://localhost:8000", help="Базовый URL API (по умолчанию http://localhost:8000)")
    parser.add_argument("--kb", default="KNOWLEDGE_BASE_10_GAUGE.md", help="Путь к файлу базы знаний со списком 10-калибра")
    args = parser.parse_args()

    # Эталон
    try:
        ref_list = read_reference_list(args.kb)
    except Exception as e:
        print(f"[ERROR] Не удалось прочитать эталонный список из {args.kb}: {e}")
        return 2

    ref_exact: Set[str] = {normalize_exact(x) for x in ref_list if x.strip()}

    print("=== Эталон 10 калибр (из KB) ===")
    print(f"Файл: {args.kb}")
    print(f"Позиции в эталоне: {len(ref_list)} (уникальных по строгому сравнению: {len(ref_exact)})\n")

    # API
    try:
        products = fetch_all_products(args.api)
    except Exception as e:
        print(f"[ERROR] Не удалось получить товары из API {args.api}: {e}")
        return 3

    print("=== Данные API ===")
    print(f"Всего товаров в API: {len(products)}\n")

    # Совпадения и дубликаты
    matched_names: List[str] = []
    for p in products:
        name = p.get("name", "")
        if normalize_exact(name) in ref_exact:
            matched_names.append(name)

    counts = Counter(matched_names)
    unique_matched = sorted(counts.keys())
    duplicates = [(n, c) for n, c in counts.items() if c > 1]

    print("=== Результат по 10 калибр электро ===")
    print(f"Уникальных товаров (как на странице): {len(unique_matched)}")
    print(f"Совпадений всего (с учетом дублей): {len(matched_names)}")
    if duplicates:
        print("Дубликаты выявлены:")
        for name, cnt in sorted(duplicates, key=lambda x: (-x[1], x[0].lower())):
            print(f"  !! DUPLICATE x{cnt}: {name}")
    else:
        print("Дубликатов не найдено.")
    print()

    # Отсутствующие
    matched_exact_set = {normalize_exact(n) for n in unique_matched}
    missing = sorted([x for x in ref_exact if x not in matched_exact_set])
    if missing:
        print("Отсутствуют в выдаче (по строгому совпадению):")
        for m in missing:
            print(f"  - {m}")
        print(f"Всего отсутствует: {len(missing)}")
    else:
        print("Все позиции из эталона найдены в API (по строгому совпадению).")

    print("\nГотово.")
    return 0


if __name__ == "__main__":
    sys.exit(main())


