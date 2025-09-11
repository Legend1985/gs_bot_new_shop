#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests

def test_specific_urls():
    """Проверяем конкретные URL изображений"""

    # Список URL для проверки
    test_urls = [
        "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/orphee_rx15-9-42_0x170.png",
        "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2221_10-46_0x170.png",
        "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl110_10-46_0x170.png",
        "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/fender_250r_10-46_0x170.png",
        "https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_gbtm_11-50_0x170.png"
    ]

    print("Проверяем конкретные URL изображений:")
    print("=" * 50)

    for i, url in enumerate(test_urls, 1):
        print(f"{i}. Проверяем: {url}")

        try:
            response = requests.head(url, timeout=10)
            print(f"   Статус: {response.status_code}")

            if response.status_code == 200:
                print("   ✅ ДОСТУПНО"            else:
                print(f"   ❌ НЕ ДОСТУПНО (код: {response.status_code})")

        except requests.exceptions.RequestException as e:
            print(f"   ❌ ОШИБКА: {str(e)}")

        print()

if __name__ == '__main__':
    test_specific_urls()
