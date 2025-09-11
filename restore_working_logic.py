#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

def restore_working_logic():
    """Восстанавливаем рабочую логику получения данных из api.py"""

    print("Восстанавливаем рабочую логику...")

    # Данные из api.py (база знаний)
    working_database = [
        # 09 калибр (электрогитара)
        {
            'name': 'Orphee RX15 Nickel Alloy Super Light 9-42',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/orphee_rx15-9-42_0x170.png',
            'newPrice': 173,
            'oldPrice': 200,
            'availability': 'В наличии',
            'rating': 4.5,
            'category': 'electro',
            'gauge': '09'
        },
        {
            'name': 'Ernie Ball 2248 Custom Gauge Stainless Steel 9-42',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2248_9-42_0x170.png',
            'newPrice': 426,
            'oldPrice': 500,
            'availability': 'В наличии',
            'rating': 4.8,
            'category': 'electro',
            'gauge': '09'
        },
        {
            'name': 'Ernie Ball 2223 Super Slinky 9-42',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2223_9-42_0x170.png',
            'newPrice': 225,
            'oldPrice': 250,
            'availability': 'В наличии',
            'rating': 4.7,
            'category': 'electro',
            'gauge': '09'
        },
        {
            'name': 'GHS Boomers GBXL Extra Light 9-42',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_gbxl_9-42_0x170.png',
            'newPrice': 391,
            'oldPrice': 450,
            'availability': 'В наличии',
            'rating': 4.3,
            'category': 'electro',
            'gauge': '09'
        },
        {
            'name': "D'Addario EXL120-10P Nickel Wound Super Light 9-42",
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl120_9-42_0x170.png',
            'newPrice': 280,
            'oldPrice': 320,
            'availability': 'В наличии',
            'rating': 4.5,
            'category': 'electro',
            'gauge': '09'
        },
        {
            'name': 'Fender 250L-3 Nickel Plated Steel Light 9-42',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/fender_250l_9-42_0x170.jpg',
            'newPrice': 315,
            'oldPrice': 350,
            'availability': 'В наличии',
            'rating': 4.1,
            'category': 'electro',
            'gauge': '09'
        },

        # 10 калибр (электрогитара)
        {
            'name': 'Ernie Ball 2221 Hybrid Slinky 10-46',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2221_10-46_0x170.png',
            'newPrice': 225,
            'oldPrice': 250,
            'availability': 'В наличии',
            'rating': 4.9,
            'category': 'electro',
            'gauge': '10'
        },
        {
            'name': 'Ernie Ball 2215 Power Slinky 10-46',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2215_10-46_0x170.png',
            'newPrice': 225,
            'oldPrice': 250,
            'availability': 'В наличии',
            'rating': 4.6,
            'category': 'electro',
            'gauge': '10'
        },
        {
            'name': "D'Addario EXL110-3D Nickel Wound Regular Light 10-46",
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl110_10-46_0x170.png',
            'newPrice': 280,
            'oldPrice': 320,
            'availability': 'В наличии',
            'rating': 4.7,
            'category': 'electro',
            'gauge': '10'
        },
        {
            'name': 'Fender 250R-3 Nickel Plated Steel Regular 10-46',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/fender_250r_10-46_0x170.jpg',
            'newPrice': 315,
            'oldPrice': 350,
            'availability': 'В наличии',
            'rating': 4.3,
            'category': 'electro',
            'gauge': '10'
        },
        {
            'name': 'GHS Boomers GBM Medium 11-50',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_gbm_11-50_0x170.png',
            'newPrice': 391,
            'oldPrice': 450,
            'availability': 'В наличии',
            'rating': 4.5,
            'category': 'electro',
            'gauge': '10'
        },
        {
            'name': 'Musicians Gear MG10-46 Nickel-Plated Light 10-46',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/musicians_gear_mg10_10-46_0x170.png',
            'newPrice': 280,
            'oldPrice': 320,
            'availability': 'В наличии',
            'rating': 4.1,
            'category': 'electro',
            'gauge': '10'
        },

        # 11 калибр (электрогитара)
        {
            'name': 'Ernie Ball 2222 M-Steel Regular Slinky 11-49',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ernie_ball_2222_11-49_0x170.png',
            'newPrice': 225,
            'oldPrice': 250,
            'availability': 'В наличии',
            'rating': 4.4,
            'category': 'electro',
            'gauge': '11'
        },
        {
            'name': 'GHS Boomers GBH Heavy 12-52',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/ghs_boomers_gbh_12-52_0x170.png',
            'newPrice': 391,
            'oldPrice': 450,
            'availability': 'В наличии',
            'rating': 4.2,
            'category': 'electro',
            'gauge': '11'
        },
        {
            'name': "D'Addario EXL115-3D Nickel Wound Blues/Jazz Medium 11-49",
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/daddario_exl115_11-49_0x170.png',
            'newPrice': 280,
            'oldPrice': 320,
            'availability': 'В наличии',
            'rating': 4.6,
            'category': 'electro',
            'gauge': '11'
        },

        # Дополнительные товары
        {
            'name': 'Orphee RX19 Nickel Alloy Medium 11-50',
            'image': 'https://guitarstrings.com.ua/images/stories/virtuemart/product/resized/orphee_rx19_11-50_0x170.png',
            'newPrice': 195,
            'oldPrice': 230,
            'availability': 'В наличии',
            'rating': 4.7,
            'category': 'electro',
            'gauge': '11'
        }
    ]

    # Сохраняем в JSON файл
    data = {
        'products': working_database
    }

    with open('static_products_clean.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Восстановлена рабочая логика с {len(working_database)} товарами")
    print("📝 Исправлены URL изображений для Fender (.jpg вместо .png)")
    print("🎯 Теперь сайт должен правильно загружать изображения!")

if __name__ == '__main__':
    restore_working_logic()
