#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
from bs4 import BeautifulSoup
import json

def check_real_urls():
    """Проверяем реальные URL изображений с сайта guitarstrings.com.ua"""

    print("Проверяем реальные URL изображений...")

    # Получаем список товаров с первой страницы
    url = "https://guitarstrings.com.ua/electro"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Ищем изображения товаров
        product_images = soup.find_all('img', {'class': 'browseProductImage'})

        print(f"Найдено изображений на странице: {len(product_images)}")

        for i, img in enumerate(product_images[:10]):  # Проверяем первые 10
            img_src = img.get('src')
            if img_src:
                # Если относительный путь, делаем абсолютный
                if img_src.startswith('/'):
                    img_src = f"https://guitarstrings.com.ua{img_src}"

                print(f"{i+1}. {img_src}")

                # Проверяем доступность
                try:
                    img_response = requests.head(img_src, headers=headers, timeout=5)
                    if img_response.status_code == 200:
                        print("   ✅ Доступно")
                    else:
                        print(f"   ❌ Статус: {img_response.status_code}")
                except Exception as e:
                    print(f"   ❌ Ошибка: {str(e)}")

    except Exception as e:
        print(f"Ошибка при получении страницы: {e}")

if __name__ == '__main__':
    check_real_urls()
