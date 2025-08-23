import requests
import json

def test_simple_api():
    print("Testing API with start=0&limit=5...")
    
    response = requests.get("http://localhost:8000/api/products?start=0&limit=5")
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Products found: {len(data.get('products', []))}")
        print(f"Total products: {data.get('total', 0)}")
        print(f"Has more: {data.get('hasMore', False)}")
        
        print("\nProduct names:")
        for i, product in enumerate(data.get('products', []), 1):
            name = product.get('name', 'Unknown')
            availability = product.get('availability', 'Unknown')
            print(f"{i}. {name} - {availability}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_simple_api()
