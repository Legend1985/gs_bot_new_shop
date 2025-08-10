from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import random
import re
import os
import mimetypes

app = Flask(__name__)
CORS(app)

# Serve static files from the current directory
@app.route('/')
def index():
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/html; charset=utf-8'}
    except Exception as e:
        return f"Error loading index.html: {str(e)}", 500

@app.route('/<path:filename>')
def static_files(filename):
    try:
        # Determine content type based on file extension
        content_type, _ = mimetypes.guess_type(filename)
        
        # Set default content type for common file types
        if filename.endswith('.css'):
            content_type = 'text/css; charset=utf-8'
        elif filename.endswith('.js'):
            content_type = 'application/javascript; charset=utf-8'
        elif filename.endswith('.html'):
            content_type = 'text/html; charset=utf-8'
        elif filename.endswith('.txt'):
            content_type = 'text/plain; charset=utf-8'
        
        # Read file with proper encoding
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content, 200, {'Content-Type': content_type}
    except Exception as e:
        # Fallback to send_from_directory for binary files or errors
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all product items - try different selectors
        product_items = soup.find_all('div', class_='product-item')
        if not product_items:
            product_items = soup.find_all('div', class_='item')
        if not product_items:
            product_items = soup.find_all('div', class_='product')
        
        products = []
        for item in product_items[:limit]:
            try:
                # Extract product name - try different selectors
                name_elem = item.find('h3', class_='product-title') or item.find('h3', class_='title') or item.find('h3') or item.find('h2') or item.find('a', class_='title')
                name = name_elem.get_text(strip=True) if name_elem else "Unknown Product"
                
                # Extract image URL - try different selectors
                img_elem = item.find('img')
                img_src = ""
                if img_elem:
                    img_src = img_elem.get('src') or img_elem.get('data-src') or img_elem.get('data-original')
                    if img_src and not img_src.startswith('http'):
                        img_src = 'https://guitarstrings.com.ua' + img_src
                
                # Extract price - try different selectors
                price_elem = item.find('span', class_='price') or item.find('span', class_='cost') or item.find('div', class_='price')
                new_price = 0
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    # Extract numeric price
                    price_match = re.search(r'(\d+)', price_text)
                    new_price = int(price_match.group(1)) if price_match else 0
                
                # Generate old price (always higher than new price)
                if new_price > 0:
                    # Старая цена должна быть больше новой на 20-40%
                    markup = random.uniform(1.2, 1.4)
                    old_price = int(new_price * markup)
                else:
                    # Если цена не найдена, генерируем случайную
                    new_price = random.randint(500, 2000)
                    old_price = int(new_price * random.uniform(1.2, 1.4))
                
                # Check availability - более реалистичные статусы
                availability_elem = item.find('span', class_='availability') or item.find('span', class_='stock')
                if availability_elem:
                    availability_text = availability_elem.get_text(strip=True).lower()
                    if 'нет' in availability_text or 'закончился' in availability_text:
                        availability = "Нет в наличии"
                    elif 'ожидается' in availability_text or 'скоро' in availability_text:
                        availability = "Ожидается"
                    elif 'под заказ' in availability_text:
                        availability = "Под заказ"
                    else:
                        availability = "В наличии"
                else:
                    # Случайно распределяем статусы для реалистичности
                    rand_status = random.random()
                    if rand_status < 0.7:  # 70% товаров в наличии
                        availability = "В наличии"
                    elif rand_status < 0.85:  # 15% нет в наличии
                        availability = "Нет в наличии"
                    elif rand_status < 0.95:  # 10% ожидается
                        availability = "Ожидается"
                    else:  # 5% под заказ
                        availability = "Под заказ"
                
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
        
        # If no products found from scraping, return test data with better images
        if not products:
            products = [
                {
                    'name': 'Ernie Ball 2221 10-46 Electric Guitar Strings',
                    'image': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop&crop=center',
                    'newPrice': 1500,
                    'oldPrice': 1950,
                    'availability': 'В наличии',
                    'rating': 4
                },
                {
                    'name': 'D\'Addario EXL110 10-46 Electric Guitar Strings',
                    'image': 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=150&h=150&fit=crop&crop=center',
                    'newPrice': 2000,
                    'oldPrice': 2600,
                    'availability': 'В наличии',
                    'rating': 5
                },
                {
                    'name': 'GHS Boomers 10-46 Electric Guitar Strings',
                    'image': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150&h=150&fit=crop&crop=center',
                    'newPrice': 1800,
                    'oldPrice': 2340,
                    'availability': 'Нет в наличии',
                    'rating': 4
                },
                {
                    'name': 'Elixir Nanoweb 10-46 Electric Guitar Strings',
                    'image': 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&h=150&fit=crop&crop=center',
                    'newPrice': 2500,
                    'oldPrice': 3250,
                    'availability': 'Ожидается',
                    'rating': 5
                },
                {
                    'name': 'DR Strings Hi-Beam 10-46 Electric Guitar Strings',
                    'image': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150&h=150&fit=crop&crop=center',
                    'newPrice': 2200,
                    'oldPrice': 2860,
                    'availability': 'Под заказ',
                    'rating': 4
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
        # Return test data on error with better images
        test_products = [
            {
                'name': 'Ernie Ball 2221 10-46 Electric Guitar Strings',
                'image': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop&crop=center',
                'newPrice': 1000,
                'oldPrice': 1300,
                'availability': 'В наличии',
                'rating': 3
            },
            {
                'name': 'D\'Addario EXL110 10-46 Electric Guitar Strings',
                'image': 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=150&h=150&fit=crop&crop=center',
                'newPrice': 1500,
                'oldPrice': 1950,
                'availability': 'Нет в наличии',
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