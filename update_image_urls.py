#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests

def update_image_urls():
    """Обновляем URL изображений в JSON файле"""

    print("Обновляем URL изображений...")

    # Загружаем текущий JSON
    with open('static_products_clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Загружено {len(data['products'])} товаров")

    # Обновляем URL изображений
    for i, product in enumerate(data['products']):
        old_url = product['image']

        # Создаем новый URL на основе имени товара
        name = product['name'].lower()

        # Очищаем имя для создания URL
        clean_name = name.replace("'", "").replace('"', '').replace(' ', '_').replace('-', '_')

        # Убираем специальные символы и оставляем только буквы, цифры и подчеркивания
        import re
        clean_name = re.sub(r'[^a-zA-Z0-9_]', '', clean_name)

        # Создаем новый URL
        new_url = f"https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/{clean_name}_0x170.png"

        # Обновляем товар
        data['products'][i]['image'] = new_url

        if i < 10:  # Показываем первые 10 изменений
            print(f"{i+1}. {product['name']}")
            print(f"   Старый: {old_url}")
            print(f"   Новый:  {new_url}")
            print()

    # Сохраняем обновленный JSON
    with open('static_products_clean.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Обновлено {len(data['products'])} URL изображений")

if __name__ == '__main__':
    update_image_urls()
