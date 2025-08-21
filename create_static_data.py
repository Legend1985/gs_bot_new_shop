#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для создания статического JSON файла с данными товаров
для работы на GitHub Pages без сервера
"""

import json
import os
from api_server import scrape_all_pages

def create_static_products_file():
    """Создает статический JSON файл с данными товаров"""
    
    print("Начинаем сбор данных товаров...")
    
    try:
        # Получаем данные товаров
        products = scrape_all_pages()
        
        # Преобразуем в JSON-совместимый формат
        products_data = []
        for product in products:
            # Извлекаем данные из BeautifulSoup объекта
            product_data = {
                "name": product.get_text().strip() if hasattr(product, 'get_text') else str(product),
                "image": "./images/Discontinued.jpg",  # Заглушка
                "price": 0,
                "newPrice": 0,
                "oldPrice": 0,
                "availability": "В наличии",
                "rating": "5.0"
            }
            products_data.append(product_data)
        
        # Создаем структуру данных
        data = {
            "products": products_data,
            "total": len(products_data),
            "hasMore": False
        }
        
        # Сохраняем в JSON файл
        with open('static_products.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Статический файл создан успешно!")
        print(f"📊 Всего товаров: {len(products_data)}")
        print(f"💾 Файл: static_products.json")
        
    except Exception as e:
        print(f"❌ Ошибка при создании файла: {e}")

if __name__ == "__main__":
    create_static_products_file()
