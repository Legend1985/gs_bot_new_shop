#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

def analyze_products():
    try:
        with open('static_products_clean.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f'Всего товаров: {len(data["products"])}')

        brands = {}
        gauges = {}

        for product in data['products']:
            # Определение бренда
            brand = 'Unknown'
            name = product['name'].lower()

            if 'ernie ball' in name:
                brand = 'Ernie Ball'
            elif 'orphee' in name:
                brand = 'Orphee'
            elif 'd\'addario' in name or 'daddario' in name:
                brand = 'D\'Addario'
            elif 'fender' in name:
                brand = 'Fender'
            elif 'ghs' in name:
                brand = 'GHS'
            elif 'la bella' in name:
                brand = 'La Bella'
            elif 'musicians gear' in name:
                brand = 'Musicians Gear'
            elif 'dr' in name:
                brand = 'DR'
            elif 'elixir' in name:
                brand = 'Elixir'

            if brand not in brands:
                brands[brand] = 0
            brands[brand] += 1

            # Определение калибра
            gauge = product.get('gauge', 'Unknown')
            if gauge not in gauges:
                gauges[gauge] = 0
            gauges[gauge] += 1

        print('\nРаспределение по брендам:')
        for brand, count in sorted(brands.items()):
            print(f'  {brand}: {count}')

        print('\nРаспределение по калибрам:')
        for gauge, count in sorted(gauges.items()):
            print(f'  {gauge}: {count}')

        # Показать примеры товаров
        print('\nПримеры товаров:')
        for i, product in enumerate(data['products'][:5]):
            print(f'  {i+1}. {product["name"]} - {product["newPrice"]} ₴')

    except Exception as e:
        print(f'Ошибка: {e}')

if __name__ == '__main__':
    analyze_products()
