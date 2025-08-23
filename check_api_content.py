import requests
import json

def check_api_content():
    try:
        response = requests.get('http://localhost:8000/api/products?page=1&per_page=1000')
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            print(f"Всего товаров в API: {len(products)}")
            
            # Ищем все товары D'Addario
            daddario_products = []
            for product in products:
                name = product.get('name', '')
                if 'daddario' in name.lower() or "d'addario" in name.lower():
                    daddario_products.append(name)
            
            print(f"\nНайдено товаров D'Addario: {len(daddario_products)}")
            if daddario_products:
                print("Товары D'Addario:")
                for i, product in enumerate(daddario_products, 1):
                    print(f"{i:2d}. {product}")
            
            # Ищем любые товары с "7" в названии
            seven_products = []
            for product in products:
                name = product.get('name', '')
                if '7' in name:
                    seven_products.append(name)
            
            print(f"\nНайдено товаров с '7' в названии: {len(seven_products)}")
            if seven_products:
                print("Товары с '7' в названии:")
                for i, product in enumerate(seven_products, 1):
                    print(f"{i:2d}. {product}")
            
            # Показываем первые 20 товаров для понимания структуры
            print(f"\nПервые 20 товаров в API:")
            for i, product in enumerate(products[:20], 1):
                print(f"{i:2d}. {product.get('name', 'Без названия')}")
                
        else:
            print(f"Ошибка API: {response.status_code}")
            
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    check_api_content()
