import requests

def check_la_bella_products():
    print("Проверяем наличие товаров La Bella...")
    
    # Получаем все товары
    response = requests.get("http://localhost:8000/api/products?start=0&limit=377")
    
    if response.status_code == 200:
        data = response.json()
        products = data.get('products', [])
        print(f"Всего товаров в базе: {len(products)}")
        
        # Ищем товары La Bella
        la_bella_products = []
        for product in products:
            name = product.get('name', '').lower()
            if 'la bella' in name or 'labella' in name or 'la bella' in name:
                la_bella_products.append(product)
        
        print(f"Товары La Bella найдены: {len(la_bella_products)}")
        
        if la_bella_products:
            print("\nПервые 5 товаров La Bella:")
            for i, product in enumerate(la_bella_products[:5], 1):
                print(f"{i}. {product.get('name')} - {product.get('availability')}")
        else:
            print("Товары La Bella не найдены!")
            
            # Проверим, есть ли товары с похожими названиями
            print("\nПоиск похожих названий...")
            similar_products = []
            for product in products:
                name = product.get('name', '').lower()
                if 'bella' in name or 'la' in name:
                    similar_products.append(product)
            
            if similar_products:
                print(f"Найдено {len(similar_products)} товаров с похожими названиями:")
                for i, product in enumerate(similar_products[:10], 1):
                    print(f"{i}. {product.get('name')}")
            else:
                print("Похожих товаров не найдено")
    else:
        print(f"Ошибка API: {response.status_code}")

if __name__ == "__main__":
    check_la_bella_products()
