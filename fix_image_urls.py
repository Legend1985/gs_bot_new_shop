#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

def fix_image_urls():
    """Исправляем URL изображений в JSON файле"""

    print("Исправляем URL изображений...")

    # Загружаем текущий JSON
    with open('static_products_clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Загружено {len(data['products'])} товаров")

    # Исправляем URL изображений
    for i, product in enumerate(data['products']):
        old_url = product['image']

        # Если URL не содержит полный домен, добавляем его
        if not old_url.startswith('https://'):
            # Извлекаем имя файла из старого URL
            if '/' in old_url:
                filename = old_url.split('/')[-1]
            else:
                filename = old_url

            # Создаем правильный URL
            new_url = f"https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/{filename}"

            # Обновляем товар
            data['products'][i]['image'] = new_url

            if i < 5:  # Показываем первые 5 изменений
                print(f"{i+1}. {product['name']}")
                print(f"   Старый: {old_url}")
                print(f"   Новый:  {new_url}")
                print()

    # Сохраняем обновленный JSON
    with open('static_products_clean.json', 'w', encoding='utf-8') as f:
        json.dump(data, indent=2, ensure_ascii=False)

    print(f"✅ Исправлено {len(data['products'])} URL изображений")

if __name__ == '__main__':
    fix_image_urls()
