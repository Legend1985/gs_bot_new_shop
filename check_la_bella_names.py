import requests

def check_la_bella_exact_names():
    print("Проверяем точные названия товаров La Bella...")
    
    response = requests.get("http://localhost:8000/api/products?start=0&limit=377")
    
    if response.status_code == 200:
        data = response.json()
        products = data.get('products', [])
        
        # Ищем товары La Bella
        la_bella_products = []
        for product in products:
            name = product.get('name', '').lower()
            if 'la bella' in name or 'labella' in name:
                la_bella_products.append(product)
        
        print(f"Найдено товаров La Bella: {len(la_bella_products)}")
        
        if la_bella_products:
            print("\nТочные названия товаров La Bella в базе:")
            for i, product in enumerate(la_bella_products, 1):
                print(f"{i}. '{product.get('name')}'")
                
            print("\nСравнение с ожидаемыми названиями:")
            expected_names = [
                'La Bella HRS-XL Hard Rockin\' Steel Nickel-Plated Extra Light 9-42',
                'La Bella HRS-L Hard Rockin\' Steel Nickel-Plated Light 9-46',
                'La Bella HRS-R Hard Rockin\' Steel Nickel-Plated Regular 10-46',
                'La Bella HRS-71 Hard Rockin\' Steel Nickel-Plated 7-String 9-64',
                'La Bella HRS-72 Hard Rockin\' Steel Nickel-Plated 7-String 10-64',
                'La Bella HRS-81 Hard Rockin\' Steel Nickel-Plated 8-String 9-74',
                'La Bella HRS-90 Hard Rockin\' Steel Nickel-Plated 9-String 9-90'
            ]
            
            for expected in expected_names:
                found = any(expected.lower() == p.get('name', '').lower() for p in la_bella_products)
                status = "✓ НАЙДЕН" if found else "✗ НЕ НАЙДЕН"
                print(f"{status}: '{expected}'")
    else:
        print(f"Ошибка API: {response.status_code}")

if __name__ == "__main__":
    check_la_bella_exact_names()
