import requests

def quick_check():
    try:
        response = requests.get('http://localhost:8000/api/products?page=1&per_page=1000')
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            print(f"Всего товаров в API: {len(products)}")
            
            # Ищем 7-струнные товары
            seven_string_products = []
            for product in products:
                name = product.get('name', '').lower()
                if '7-string' in name or '7 string' in name:
                    seven_string_products.append(product.get('name'))
            
            print(f"\nНайдено 7-струнных товаров: {len(seven_string_products)}")
            
            # Проверяем конкретные товары
            ernie_ball_2621 = any('ernie ball 2621' in p.lower() for p in seven_string_products)
            print(f"\nErnie Ball 2621 найден: {'ДА' if ernie_ball_2621 else 'НЕТ'}")
            
            # Показываем все найденные 7-струнные товары
            print(f"\nВсе 7-струнные товары:")
            for i, product in enumerate(seven_string_products, 1):
                print(f"{i:2d}. {product}")
                
        else:
            print(f"Ошибка API: {response.status_code}")
            
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    quick_check()
