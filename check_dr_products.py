import requests

def check_dr_products():
    print("Проверяем наличие товаров DR...")
    
    response = requests.get("http://localhost:8000/api/products?start=0&limit=377")
    
    if response.status_code == 200:
        data = response.json()
        products = data.get('products', [])
        
        # Ищем товары DR
        dr_products = []
        for product in products:
            name = product.get('name', '').lower()
            if name.startswith('dr ') or ' dr ' in name:
                dr_products.append(product)
        
        print(f"Найдено товаров DR: {len(dr_products)}")
        
        if dr_products:
            print("\nТовары DR в базе:")
            for i, product in enumerate(dr_products, 1):
                print(f"{i}. '{product.get('name')}'")
        else:
            print("Товары DR не найдены!")
    else:
        print(f"Ошибка API: {response.status_code}")

if __name__ == "__main__":
    check_dr_products()
