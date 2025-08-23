import requests
import json

def check_7_string_products():
    try:
        # Получаем все товары
        response = requests.get('http://localhost:8000/api/products?page=1&per_page=1000')
        data = response.json()
        
        print(f"API ответ: {type(data)}")
        print(f"Ключи в ответе: {list(data.keys()) if isinstance(data, dict) else 'не словарь'}")
        
        if isinstance(data, dict) and 'products' in data:
            products = data['products']
            print(f"Всего товаров в API: {len(products)}")
            
            # Ищем товары с "7-string" или "7 string" в названии
            seven_string_products = []
            for product in products:
                name = product.get('name', '').lower()
                if '7-string' in name or '7 string' in name:
                    seven_string_products.append(product)
            
            print(f"Найдено товаров с '7-string' в названии: {len(seven_string_products)}")
            
            if seven_string_products:
                print("Примеры 7-струнных товаров:")
                for product in seven_string_products[:5]:
                    print(f"  - {product['name']}")
            else:
                print("Товаров с '7-string' в названии не найдено")
                print("\nПримеры названий товаров:")
                for i, product in enumerate(products[:10]):
                    print(f"  {i+1}. {product['name']}")
                    
        else:
            print("Ошибка: неверный формат данных из API")
            print(f"Полученные данные: {data}")
            
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    check_7_string_products()
