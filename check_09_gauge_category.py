#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Проверка категории «09 калибр электро».

Что делает скрипт:
- Загружает эталонный список из KNOWLEDGE_BASE_09_GAUGE.md (строки, начинающиеся с "- ").
- Загружает все товары из API (http://localhost:8000/api/products).
- Считает:
  * Сколько УНИКАЛЬНЫХ товаров на сайте помечены как «09 калибр электро» (по строгому совпадению имени с эталоном в нижнем регистре, как на фронтенде).
  * Дубликаты (товары с одинаковым именем, попавшие в выборку более 1 раза).
  * Какие позиции из эталона отсутствуют на сайте.

Запуск:
    python check_09_gauge_category.py

Дополнительно:
    python check_09_gauge_category.py --api http://localhost:8000 --kb KNOWLEDGE_BASE_09_GAUGE.md
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from typing import List, Dict, Set

import requests


def read_reference_list(kb_path: str) -> List[str]:
    """Читает KNOWLEDGE_BASE_09_GAUGE.md и возвращает список названий позиций.

    Берем все строки, начинающиеся с "- " и считаем остальной текст названием.
    """
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
    """Загружает все товары из API с постраничной выборкой.

    Ожидается ответ вида: {
        'products': [...], 'hasMore': bool, 'start': int, 'limit': int, 'total': int
    }
    """
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

        has_more = bool(data.get("hasMore"))
        if not has_more:
            break
        start += limit

    return products


def normalize_exact(name: str) -> str:
    """Фронтенд-логика пометки: toLowerCase().trim() без удаления пунктуации."""
    return (name or "").lower().strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Проверка категории 09 калибр электро")
    parser.add_argument("--api", default="http://localhost:8000", help="Базовый URL API (по умолчанию http://localhost:8000)")
    parser.add_argument("--kb", default="KNOWLEDGE_BASE_09_GAUGE.md", help="Путь к файлу базы знаний со списком 09-калибра")
    args = parser.parse_args()

    # 1) Эталон
    try:
        ref_list = read_reference_list(args.kb)
    except Exception as e:
        print(f"[ERROR] Не удалось прочитать эталонный список из {args.kb}: {e}")
        return 2

    ref_exact: Set[str] = {normalize_exact(x) for x in ref_list if x.strip()}

    print("=== Эталон 09 калибр (из KB) ===")
    print(f"Файл: {args.kb}")
    print(f"Позиции в эталоне: {len(ref_list)} (уникальных по строгому сравнению: {len(ref_exact)})")
    print()

    # 2) Товары из API
    try:
        products = fetch_all_products(args.api)
    except Exception as e:
        print(f"[ERROR] Не удалось получить товары из API {args.api}: {e}")
        return 3

    print("=== Данные API ===")
    print(f"Всего товаров в API: {len(products)}")
    print()

    # 3) Фильтруем товары, которые пометятся как 09-калибр по фронтенд-логике
    matched_names_exact: List[str] = []
    for p in products:
        name = p.get("name", "")
        if normalize_exact(name) in ref_exact:
            matched_names_exact.append(name)

    # Уникальные имена для соответствия отображению (displayProducts убирает дубли по имени)
    unique_matched_names = sorted({n for n in matched_names_exact})

    # Дубликаты (учитываем точные имена из API)
    counts = Counter(matched_names_exact)
    duplicates = [(n, c) for n, c in counts.items() if c > 1]

    print("=== Результат по 09 калибр электро ===")
    print(f"Уникальных товаров (как на странице): {len(unique_matched_names)}")
    print(f"Совпадений всего (с учетом дублей): {len(matched_names_exact)}")
    if duplicates:
        print("Дубликаты выявлены:")
        for name, cnt in sorted(duplicates, key=lambda x: (-x[1], x[0].lower())):
            print(f"  !! DUPLICATE x{cnt}: {name}")
    else:
        print("Дубликатов не найдено.")
    print()

    # 4) Отсутствующие позиции из эталона
    matched_exact_set = {normalize_exact(n) for n in matched_names_exact}
    missing = sorted([x for x in ref_exact if x not in matched_exact_set])
    if missing:
        print("Отсутствуют в выдаче (по строгому совпадению):")
        for m in missing:
            print(f"  - {m}")
        print(f"Всего отсутствует: {len(missing)}")
    else:
        print("Все позиции из эталона найдены в API (по строгому совпадению).")

    print()
    print("Готово.")
    return 0


if __name__ == "__main__":
    sys.exit(main())


