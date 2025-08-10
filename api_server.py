from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import random
import re
import os

app = Flask(__name__)
CORS(app)

# Serve static files from the current directory
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/api.php')
def api():
    start = request.args.get('start', 0, type=int)
    limit = request.args.get('limit', 60, type=int)
    
    try:
        # Fetch HTML from the guitar strings website
        url = "https://guitarstrings.com.ua/electro"
        if start > 0:
            url += f"?start={start}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all product items
        product_items = soup.find_all('div', class_='product-item')
        
        products = []
        for item in product_items[:limit]:
            try:
                # Extract product name
                name_elem = item.find('h3', class_='product-title')
                name = name_elem.get_text(strip=True) if name_elem else "Unknown Product"
                
                # Extract image URL
                img_elem = item.find('img')
                if img_elem:
                    img_src = img_elem.get('src') or img_elem.get('data-src')
                    if img_src and not img_src.startswith('http'):
                        img_src = 'https://guitarstrings.com.ua' + img_src
                else:
                    img_src = ""
                
                # Extract price
                price_elem = item.find('span', class_='price')
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    # Extract numeric price
                    price_match = re.search(r'(\d+)', price_text)
                    new_price = int(price_match.group(1)) if price_match else 0
                else:
                    new_price = 0
                
                # Generate old price (randomly higher)
                old_price = new_price + random.randint(50, 150) if new_price > 0 else 0
                
                # Check availability
                availability_elem = item.find('span', class_='availability')
                availability = "В наличии" if availability_elem else "Нет в наличии"
                
                # Generate random rating (1-5 stars)
                rating = random.randint(3, 5)
                
                product = {
                    'name': name,
                    'image': img_src,
                    'newPrice': new_price,
                    'oldPrice': old_price,
                    'availability': availability,
                    'rating': rating
                }
                products.append(product)
                
            except Exception as e:
                print(f"Error parsing product: {e}")
                continue
        
        # If no products found from scraping, return test data
        if not products:
            products = [
                {
                    'name': 'Test Product 1',
                    'image': 'https://via.placeholder.com/150x150?text=Product+1',
                    'newPrice': 1500,
                    'oldPrice': 1800,
                    'availability': 'В наличии',
                    'rating': 4
                },
                {
                    'name': 'Test Product 2',
                    'image': 'https://via.placeholder.com/150x150?text=Product+2',
                    'newPrice': 2000,
                    'oldPrice': 2400,
                    'availability': 'В наличии',
                    'rating': 5
                }
            ]
        
        response_data = {
            'success': True,
            'products': products,
            'total': len(products),
            'start': start,
            'limit': limit
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        # Return test data on error
        test_products = [
            {
                'name': 'Error Fallback Product 1',
                'image': 'https://via.placeholder.com/150x150?text=Error+1',
                'newPrice': 1000,
                'oldPrice': 1200,
                'availability': 'В наличии',
                'rating': 3
            },
            {
                'name': 'Error Fallback Product 2',
                'image': 'https://via.placeholder.com/150x150?text=Error+2',
                'newPrice': 1500,
                'oldPrice': 1800,
                'availability': 'В наличии',
                'rating': 4
            }
        ]
        
        return jsonify({
            'success': False,
            'error': str(e),
            'products': test_products,
            'total': len(test_products),
            'start': start,
            'limit': limit
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True) 