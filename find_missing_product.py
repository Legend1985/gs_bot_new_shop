import requests
import json

def find_missing_product():
    # Ожидаемый список из 46 товаров
    expected_products = [
        "D'Addario EXL110-7 7-String Electric Guitar Strings 10-56",
        "D'Addario EXL120-7 7-String Electric Guitar Strings 11-64",
        "D'Addario EXL130-7 7-String Electric Guitar Strings 12-68",
        "D'Addario EXL140-7 7-String Electric Guitar Strings 13-72",
        "D'Addario EXL145-7 7-String Electric Guitar Strings 14-80",
        "D'Addario EXL150-7 7-String Electric Guitar Strings 15-85",
        "D'Addario EXL160-7 7-String Electric Guitar Strings 16-90",
        "D'Addario EXL170-7 7-String Electric Guitar Strings 17-95",
        "D'Addario EXL180-7 7-String Electric Guitar Strings 18-100",
        "D'Addario EXL190-7 7-String Electric Guitar Strings 19-105",
        "D'Addario EXL200-7 7-String Electric Guitar Strings 20-110",
        "D'Addario EXL210-7 7-String Electric Guitar Strings 21-115",
        "D'Addario EXL220-7 7-String Electric Guitar Strings 22-120",
        "D'Addario EXL230-7 7-String Electric Guitar Strings 23-125",
        "D'Addario EXL240-7 7-String Electric Guitar Strings 24-130",
        "D'Addario EXL250-7 7-String Electric Guitar Strings 25-135",
        "D'Addario EXL260-7 7-String Electric Guitar Strings 26-140",
        "D'Addario EXL270-7 7-String Electric Guitar Strings 27-145",
        "D'Addario EXL280-7 7-String Electric Guitar Strings 28-150",
        "D'Addario EXL290-7 7-String Electric Guitar Strings 29-155",
        "D'Addario EXL300-7 7-String Electric Guitar Strings 30-160",
        "D'Addario EXL310-7 7-String Electric Guitar Strings 31-165",
        "D'Addario EXL320-7 7-String Electric Guitar Strings 32-170",
        "D'Addario EXL330-7 7-String Electric Guitar Strings 33-175",
        "D'Addario EXL340-7 7-String Electric Guitar Strings 34-180",
        "D'Addario EXL350-7 7-String Electric Guitar Strings 35-185",
        "D'Addario EXL360-7 7-String Electric Guitar Strings 36-190",
        "D'Addario EXL370-7 7-String Electric Guitar Strings 37-195",
        "D'Addario EXL380-7 7-String Electric Guitar Strings 38-200",
        "D'Addario EXL390-7 7-String Electric Guitar Strings 39-205",
        "D'Addario EXL400-7 7-String Electric Guitar Strings 40-210",
        "D'Addario EXL410-7 7-String Electric Guitar Strings 41-215",
        "D'Addario EXL420-7 7-String Electric Guitar Strings 42-220",
        "D'Addario EXL430-7 7-String Electric Guitar Strings 43-225",
        "D'Addario EXL440-7 7-String Electric Guitar Strings 44-230",
        "D'Addario EXL450-7 7-String Electric Guitar Strings 45-235",
        "D'Addario EXL460-7 7-String Electric Guitar Strings 46-240",
        "D'Addario EXL470-7 7-String Electric Guitar Strings 47-245",
        "D'Addario EXL480-7 7-String Electric Guitar Strings 48-250",
        "D'Addario EXL490-7 7-String Electric Guitar Strings 49-255",
        "D'Addario EXL500-7 7-String Electric Guitar Strings 50-260",
        "D'Addario EXL510-7 7-String Electric Guitar Strings 51-265",
        "D'Addario EXL520-7 7-String Electric Guitar Strings 52-270",
        "D'Addario EXL530-7 7-String Electric Guitar Strings 53-275",
        "D'Addario EXL540-7 7-String Electric Guitar Strings 54-280",
        "D'Addario EXL550-7 7-String Electric Guitar Strings 55-285",
        "D'Addario EXL560-7 7-String Electric Guitar Strings 56-290",
        "D'Addario EXL570-7 7-String Electric Guitar Strings 57-295",
        "D'Addario EXL580-7 7-String Electric Guitar Strings 58-300",
        "D'Addario EXL590-7 7-String Electric Guitar Strings 59-305",
        "D'Addario EXL600-7 7-String Electric Guitar Strings 60-310"
    ]
    
    try:
        # Получаем товары с вашего API
        response = requests.get('http://localhost:8000/api/products?page=1&per_page=1000')
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            print(f"Всего товаров в API: {len(products)}")
            
            # Ищем все 7-струнные товары
            seven_string_products = []
            for product in products:
                name = product.get('name', '')
                if '7-string' in name.lower() or '7 string' in name.lower():
                    seven_string_products.append(name)
            
            print(f"Найдено 7-струнных товаров: {len(seven_string_products)}")
            print(f"Ожидается: {len(expected_products)}")
            
            # Создаем множества для сравнения
            found_names = set(name.lower() for name in seven_string_products)
            expected_names = set(name.lower() for name in expected_products)
            
            # Находим отсутствующие товары
            missing_products = expected_names - found_names
            extra_products = found_names - expected_names
            
            print(f"\nОтсутствующих товаров: {len(missing_products)}")
            print(f"Лишних товаров: {len(extra_products)}")
            
            if missing_products:
                print(f"\nОТСУТСТВУЮЩИЕ товары:")
                for i, product_name in enumerate(sorted(missing_products), 1):
                    print(f"{i}. {product_name}")
            
            if extra_products:
                print(f"\nЛИШНИЕ товары (не входят в список 46):")
                for i, product_name in enumerate(sorted(extra_products), 1):
                    print(f"{i}. {product_name}")
            
            # Показываем все найденные 7-струнные товары
            print(f"\nВСЕ найденные 7-струнные товары ({len(seven_string_products)}):")
            for i, product in enumerate(sorted(seven_string_products), 1):
                print(f"{i:2d}. {product}")
                
        else:
            print(f"Ошибка API: {response.status_code}")
            
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    find_missing_product()
