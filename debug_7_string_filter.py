import requests
import json
import re

def fetch_all_products():
    """Fetch all products from the API"""
    try:
        response = requests.get('http://localhost:8000/api/products?page=1&per_page=1000')
        if response.status_code == 200:
            data = response.json()
            return data.get('products', [])
        else:
            print(f"Error fetching products: {response.status_code}")
            return []
    except Exception as e:
        print(f"Exception fetching products: {e}")
        return []

def apply_7_string_filter(products):
    """Apply the same 7-string filtering logic as in app.js"""
    filtered_products = []
    seen_names = set()
    
    for product in products:
        product_name = product.get('name', '').lower()
        
        # Check if product name contains 7-string indicators
        if ('7-string' in product_name or 
            '7 string' in product_name or
            '7струн' in product_name or
            '7 струн' in product_name):
            
            # Remove duplicates (same logic as in displayProducts)
            if product_name not in seen_names:
                seen_names.add(product_name)
                filtered_products.append(product)
            else:
                print(f"Duplicate removed: {product.get('name')}")
    
    return filtered_products

def get_expected_7_string_products():
    """Return the expected list of 46 7-string products"""
    return [
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

def analyze_7_string_products():
    """Analyze which 7-string products are missing"""
    print("=== Анализ 7-струнных товаров ===\n")
    
    # Fetch all products from API
    print("1. Загружаем все товары из API...")
    all_products = fetch_all_products()
    print(f"   Загружено товаров: {len(all_products)}")
    
    # Apply 7-string filter
    print("\n2. Применяем фильтр 7-струнных товаров...")
    filtered_products = apply_7_string_filter(all_products)
    print(f"   Найдено 7-струнных товаров: {len(filtered_products)}")
    
    # Get expected list
    expected_products = get_expected_7_string_products()
    print(f"   Ожидается 7-струнных товаров: {len(expected_products)}")
    
    # Create sets for comparison
    filtered_names = {product.get('name', '').lower() for product in filtered_products}
    expected_names = {name.lower() for name in expected_products}
    
    # Find missing products
    missing_products = expected_names - filtered_names
    extra_products = filtered_names - expected_names
    
    print(f"\n3. Результаты анализа:")
    print(f"   Отсутствующих товаров: {len(missing_products)}")
    print(f"   Лишних товаров: {len(extra_products)}")
    
    if missing_products:
        print(f"\n4. ОТСУТСТВУЮЩИЕ товары (не отображаются при нажатии кнопки в баннере):")
        for i, product_name in enumerate(sorted(missing_products), 1):
            print(f"   {i}. {product_name}")
    
    if extra_products:
        print(f"\n5. ЛИШНИЕ товары (отображаются, но не входят в список 46):")
        for i, product_name in enumerate(sorted(extra_products), 1):
            print(f"   {i}. {product_name}")
    
    # Show all filtered products for verification
    print(f"\n6. ВСЕ найденные 7-струнные товары ({len(filtered_products)}):")
    for i, product in enumerate(filtered_products, 1):
        print(f"   {i:2d}. {product.get('name')}")
    
    return missing_products, extra_products

if __name__ == "__main__":
    missing, extra = analyze_7_string_products()
