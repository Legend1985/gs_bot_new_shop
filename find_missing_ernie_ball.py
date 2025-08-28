#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для поиска пропущенного товара Ernie Ball
Сравнивает данные API с данными сайта
"""

import requests
import json
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Set

def get_api_products() -> List[Dict]:
    """Получает все товары из API"""
    try:
        response = requests.get('http://localhost:8000/api/products?start=0&limit=1000')
        response.raise_for_status()
        data = response.json()
        
        if data.get('success') and data.get('products'):
            return data['products']
        else:
            print(f"❌ Ошибка API: {data.get('error', 'Неизвестная ошибка')}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка соединения с API: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        return []

def scrape_website_ernie_ball() -> List[str]:
    """Скрапит товары Ernie Ball с сайта"""
    try:
        url = "https://guitarstrings.com.ua/electro/ernie-ball-electric?limit=150"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Ищем заголовки товаров (h2 с ссылками)
        product_headers = soup.find_all('h2')
        product_names = []
        
        for header in product_headers:
            link = header.find('a')
            if link and 'ernie ball' in link.text.lower():
                product_names.append(link.text.strip())
        
        return product_names
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка при скрапинге сайта: {e}")
        return []
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return []

def analyze_missing_products():
    """Анализирует пропущенные товары"""
    print("🔍 Анализ пропущенных товаров Ernie Ball...")
    print("=" * 60)
    
    # Получаем данные из API
    print("📡 Получаем данные из API...")
    api_products = get_api_products()
    
    if not api_products:
        print("❌ Не удалось получить данные из API")
        return
    
    # Фильтруем товары Ernie Ball из API
    api_ernie_ball = [
        product for product in api_products 
        if 'ernie ball' in product['name'].lower()
    ]
    
    print(f"📊 API: найдено {len(api_ernie_ball)} товаров Ernie Ball")
    print(f"📊 API: всего товаров {len(api_products)}")
    
    # Получаем данные с сайта
    print("\n🌐 Скрапим данные с сайта...")
    website_products = scrape_website_ernie_ball()
    
    if not website_products:
        print("❌ Не удалось получить данные с сайта")
        return
    
    print(f"🌐 Сайт: найдено {len(website_products)} товаров Ernie Ball")
    
    # Создаем множества для сравнения
    api_names = {product['name'].lower() for product in api_ernie_ball}
    website_names = {name.lower() for name in website_products}
    
    # Находим пропущенные товары
    missing_in_api = website_names - api_names
    extra_in_api = api_names - website_names
    
    print("\n" + "=" * 60)
    print("📋 РЕЗУЛЬТАТЫ АНАЛИЗА:")
    print("=" * 60)
    
    if missing_in_api:
        print(f"\n❌ ПРОПУЩЕНО В API ({len(missing_in_api)} товаров):")
        for i, name in enumerate(sorted(missing_in_api), 1):
            print(f"  {i}. {name}")
    else:
        print("\n✅ Все товары с сайта найдены в API")
    
    if extra_in_api:
        print(f"\n➕ ЛИШНИЕ В API ({len(extra_in_api)} товаров):")
        for i, name in enumerate(sorted(extra_in_api), 1):
            print(f"  {i}. {name}")
    else:
        print("\n✅ Лишних товаров в API нет")
    
    # Анализируем общее количество
    expected_total = 377
    actual_total = len(api_products)
    
    print(f"\n📊 ОБЩАЯ СТАТИСТИКА:")
    print(f"  Ожидается товаров: {expected_total}")
    print(f"  Найдено в API: {actual_total}")
    print(f"  Разница: {expected_total - actual_total}")
    
    if expected_total != actual_total:
        print(f"  ⚠️  Не хватает {expected_total - actual_total} товаров!")
    
    # Показываем примеры товаров для сравнения
    print(f"\n🎸 ПРИМЕРЫ ТОВАРОВ С САЙТА (первые 10):")
    for i, name in enumerate(website_products[:10], 1):
        print(f"  {i}. {name}")
    
    print(f"\n🎸 ПРИМЕРЫ ТОВАРОВ ИЗ API (первые 10):")
    for i, product in enumerate(api_ernie_ball[:10], 1):
        print(f"  {i}. {product['name']}")

if __name__ == "__main__":
    print("🚀 Запуск анализа пропущенных товаров Ernie Ball...")
    analyze_missing_products()
    print("\n✅ Анализ завершен!")
