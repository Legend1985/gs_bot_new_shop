#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для проверки 7-струнных товаров
Проверяет, какие из 46 товаров не находятся функцией поиска
"""

import requests
import json
import re

# Список всех 7-струнных товаров из базы знаний
EXPECTED_7_STRING_PRODUCTS = [
    "Dunlop DEN1056-7 Nickel Wound 7-String 10-56",
    "GHS Boomers GB7MH 7-String Medium Heavy 11-64",
    "GHS Boomers GB7L 7-String Light 9-58",
    "GHS Boomers GB7M 7-String Medium 10-60",
    "DAddario EXL110-7 7-String Nickel Wound Regular Light 10-59",
    "DAddario EXL120-7 Nickel Wound 7-String Super Light 9-54",
    "GHS Boomers GB7H 7-String Heavy 13-74",
    "Ernie Ball 2620 7-String Power Slinky 11-58",
    "Ernie Ball 2621 7-String Regular Slinky 10-56",
    "Ernie Ball 2623 7-String Super Slinky 9-52",
    "Ernie Ball 2615 7-String Skinny Top Heavy Bottom 10-62",
    "Dunlop DHCN1060-7 Heavy Core 7-String 10-60",
    "La Bella HRS-72 Hard Rockin Steel Nickel-Plated 7-String 10-64",
    "Cleartone 9410-7 Light 7-String 10-56 Nickel-Plated Monster",
    "Ernie Ball 2728 7-String Cobalt Slinky 10-56",
    "Dunlop BEHN1162-7 String Lab Behemoth Custom 7-String 11-62",
    "Dunlop KRHCN1065 Korn Heavy Core Custom Set 7-String 10-65",
    "DAddario NYXL1059 Nickel Wound Carbon Core Light 7-String 10-59",
    "Dunlop TVMN1063-7 Trivium Heavy Core Custom Set 7-String 10-63",
    "DAddario NYXL1164 Nickel Wound Carbon Core Medium 7-String 11-64",
    "Ernie Ball 2729 7-String Cobalt Slinky 11-58",
    "Ernie Ball 2730 7-String Cobalt Slinky 10-62",
    "DR BKE7-11 Black Beauties K3 Coated 7-String Extra Heavy 11-60",
    "DAddario XTE1059 XT Extended Life 7-String Regular Light 10-59",
    "Ernie Ball 2028 Paradigm 7-String Regular Slinky 10-56",
    "La Bella HRS-71 Hard Rockin Steel Nickel-Plated 7-String 9-64",
    "Ernie Ball 2030 Paradigm 7-String STHB 10-62",
    "DAddario XSE1056 XS Coated Nickel Plated 7-String Regular Light 10-56",
    "Elixir 12106 NanoWeb 7-String Medium 11-59",
    "Elixir 12057 Nanoweb 7-String Light 10-56",
    "Elixir 12007 Nanoweb 7-String Super Light 9-52",
    "Elixir 12074 Nanoweb 7-String Light/Heavy 10-59",
    "Elixir 19057 Optiweb Nickel Plated Steel 7-String Light 10-56",
    "Elixir 19074 Optiweb Nickel Plated Steel 7-String Light/Heavy 10-59",
    "Elixir 19007 Optiweb Nickel Plated Steel 7-String Super Light 9-52",
    "Elixir 19106 Optiweb Nickel Plated Steel 7-String Medium 11-59",
    "DAddario ECG24-7 Chromes Flat Wound Jazz Light 7-String 11-65",
    "Ernie Ball Synyster Gates Signature Stainless Steel RPS 7-String 10-60",
    "Ernie Ball 2730 7-String Cobalt Slinky 10-62 6 sets",
    "GHS Boomers GB7CL 7-String Custom Light 9-62",
    "Dean Markley 2508C Nickel Steel 7-String 9-56 Signature",
    "Dean Markley 2552A Blue Steel 7-String 9-54",
    "Dean Markley 2554A Blue Steel 7-String 9-56",
    "Dean Markley 2556A Blue Steel 7-String 10-56",
    "Dean Markley 2558A Blue Steel 7-String LTHB 10-60",
    "Dean Markley 2562A Blue Steel 7-String 11-60"
]

def check_7_string_products():
    """Проверяет 7-струнные товары в API"""
    print("🔍 Проверяем 7-струнные товары...")
    
    try:
        # Запрашиваем все товары
        response = requests.get('http://localhost:8000/api/products?start=0&limit=1000')
        response.raise_for_status()
        
        data = response.json()
        products = data.get('products', [])
        
        print(f"✅ Получено {len(products)} товаров из API")
        
        # Ищем 7-струнные товары по названию
        found_7_string = []
        for product in products:
            product_name = product.get('name', '').lower()
            
            # Проверяем различные варианты 7-струнных
            if any(pattern in product_name for pattern in [
                '7-string', '7 string', '7-струн', '7 струн'
            ]):
                found_7_string.append(product['name'])
        
        print(f"📊 Найдено {len(found_7_string)} товаров с '7-string' в названии:")
        for i, name in enumerate(found_7_string, 1):
            print(f"  {i}. {name}")
        
        # Сравниваем с ожидаемым списком
        print(f"\n📋 Ожидается: {len(EXPECTED_7_STRING_PRODUCTS)} товаров")
        print(f"🔍 Найдено: {len(found_7_string)} товаров")
        
        if len(found_7_string) < len(EXPECTED_7_STRING_PRODUCTS):
            print(f"❌ Не хватает: {len(EXPECTED_7_STRING_PRODUCTS) - len(found_7_string)} товаров")
            
            # Ищем, какие именно товары отсутствуют
            found_names_lower = [name.lower() for name in found_7_string]
            missing_products = []
            
            for expected in EXPECTED_7_STRING_PRODUCTS:
                expected_lower = expected.lower()
                # Проверяем, есть ли похожий товар
                found = False
                for found_name in found_names_lower:
                    # Ищем совпадения по ключевым словам
                    if any(keyword in found_name for keyword in expected_lower.split() if len(keyword) > 2):
                        found = True
                        break
                
                if not found:
                    missing_products.append(expected)
            
            if missing_products:
                print("\n❌ Отсутствующие товары:")
                for i, missing in enumerate(missing_products, 1):
                    print(f"  {i}. {missing}")
        
        # Проверяем, есть ли дубликаты в найденных
        duplicates = []
        seen = set()
        for name in found_7_string:
            if name in seen:
                duplicates.append(name)
            seen.add(name)
        
        if duplicates:
            print(f"\n⚠️ Дубликаты в найденных товарах ({len(duplicates)}):")
            for dup in duplicates:
                print(f"  • {dup}")
        
        # Анализируем названия товаров для понимания паттернов
        print(f"\n🔍 Анализ названий найденных товаров:")
        for name in found_7_string:
            # Ищем ключевые слова
            keywords = re.findall(r'\b\w+\b', name.lower())
            seven_string_keywords = [kw for kw in keywords if '7' in kw or 'string' in kw or 'струн' in kw]
            print(f"  • {name}")
            print(f"    Ключевые слова: {seven_string_keywords}")
        
        return found_7_string, missing_products if 'missing_products' in locals() else []
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка при обращении к API: {e}")
        return [], []
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return [], []

if __name__ == "__main__":
    print("=" * 60)
    print("🔍 ПРОВЕРКА 7-СТРУННЫХ ТОВАРОВ")
    print("=" * 60)
    
    found, missing = check_7_string_products()
    
    print("\n" + "=" * 60)
    print("📊 ИТОГИ ПРОВЕРКИ")
    print("=" * 60)
    print(f"Ожидается: {len(EXPECTED_7_STRING_PRODUCTS)}")
    print(f"Найдено: {len(found)}")
    print(f"Отсутствует: {len(missing)}")
    
    if missing:
        print(f"\n🎯 Для исправления нужно найти {len(missing)} товаров:")
        for missing_product in missing:
            print(f"  • {missing_product}")
