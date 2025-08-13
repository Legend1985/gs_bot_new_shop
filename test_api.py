import requests
import json
import time

def test_api():
    print("Testing API server...")
    
    # Test first page
    print("\n1. Testing first page (0-60):")
    response = requests.get("http://localhost:8000/api/products?start=0&limit=60")
    if response.status_code == 200:
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Products returned: {len(data.get('products', []))}")
        print(f"Has more: {data.get('hasMore', False)}")
        print(f"Total: {data.get('total', 0)}")
        
        if data.get('products'):
            first_product = data['products'][0]
            print(f"First product: {first_product.get('name', 'Unknown')}")
            print(f"Availability: {first_product.get('availability', 'Unknown')}")
            print(f"Rating: {first_product.get('rating', 'Unknown')}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
    
    # Test second page
    print("\n2. Testing second page (60-120):")
    response = requests.get("http://localhost:8000/api/products?start=60&limit=60")
    if response.status_code == 200:
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Products returned: {len(data.get('products', []))}")
        print(f"Has more: {data.get('hasMore', False)}")
        print(f"Total: {data.get('total', 0)}")
        
        if data.get('products'):
            first_product = data['products'][0]
            print(f"First product: {first_product.get('name', 'Unknown')}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
    
    # Test third page
    print("\n3. Testing third page (120-180):")
    response = requests.get("http://localhost:8000/api/products?start=120&limit=60")
    if response.status_code == 200:
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Products returned: {len(data.get('products', []))}")
        print(f"Has more: {data.get('hasMore', False)}")
        print(f"Total: {data.get('total', 0)}")
        
        if data.get('products'):
            first_product = data['products'][0]
            print(f"First product: {first_product.get('name', 'Unknown')}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(5)
    test_api() 