#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
from bs4 import BeautifulSoup

def get_real_product_urls():
    """Получаем реальные URL изображений товаров с сайта guitarstrings.com.ua"""

    print("Получаем реальные URL изображений с сайта...")

    # URL страницы с товарами
    url = "https://guitarstrings.com.ua/electro"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Находим все изображения товаров
        product_images = soup.find_all('img', {'class': 'browseProductImage'})

        print(f"Найдено {len(product_images)} изображений на странице")

        real_images = []

        for img in product_images:
            img_src = img.get('src')
            alt_text = img.get('alt', '')

            if img_src:
                # Преобразуем относительный URL в абсолютный
                if img_src.startswith('/'):
                    img_src = f"https://guitarstrings.com.ua{img_src}"

                real_images.append({
                    'url': img_src,
                    'alt': alt_text
                })

                print(f"  {alt_text}: {img_src}")

        return real_images

    except Exception as e:
        print(f"Ошибка при получении данных с сайта: {e}")
        return []

def update_json_with_real_urls():
    """Обновляем JSON файл с реальными URL изображений"""

    print("\nОбновляем JSON файл...")

    # Загружаем текущий JSON
    with open('static_products_clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Текущих товаров: {len(data['products'])}")

    # Получаем реальные URL
    real_images = get_real_product_urls()

    if not real_images:
        print("Не удалось получить реальные URL. Используем текущие.")
        return

    print(f"Получено реальных изображений: {len(real_images)}")

    # Обновляем товары с реальными URL
    updated_count = 0

    for i, product in enumerate(data['products']):
        if i < len(real_images):
            old_url = product['image']
            new_url = real_images[i]['url']

            data['products'][i]['image'] = new_url
            updated_count += 1

            if i < 5:  # Показываем первые 5 изменений
                print(f"{i+1}. Обновлено: {product['name']}")
                print(f"   Новый URL: {new_url}")

    # Сохраняем обновленный JSON
    with open('static_products_clean.json', 'w', encoding='utf-8') as f:
        json.dump(data, indent=2, ensure_ascii=False)

    print(f"\n✅ Обновлено {updated_count} товаров с реальными URL изображений")

if __name__ == '__main__':
    update_json_with_real_urls()
