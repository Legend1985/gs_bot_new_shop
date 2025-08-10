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
    
    # Сначала попробуем вернуть тестовые данные для диагностики
    test_products = [
        {
            'name': 'Тестовые струны Ernie Ball 10-46',
            'image': 'https://via.placeholder.com/150x150?text=Test+Strings',
            'newPrice': '150',
            'oldPrice': '200',
            'availability': 'В наличии',
            'rating': 4.5
        },
        {
            'name': 'Тестовые струны D\'Addario 11-49',
            'image': 'https://via.placeholder.com/150x150?text=DAddario',
            'newPrice': '180',
            'oldPrice': None,
            'availability': 'В наличии',
            'rating': 4.8
        },
        {
            'name': 'Тестовые струны Elixir 12-52',
            'image': 'https://via.placeholder.com/150x150?text=Elixir',
            'newPrice': '250',
            'oldPrice': '300',
            'availability': 'Ожидается',
            'rating': 4.2
        }
    ]
    
    # Возвращаем тестовые данные для диагностики
    return jsonify({
        'success': True,
        'products': test_products,
        'total': len(test_products),
        'start': start,
        'limit': limit,
        'hasMore': False
    })
    
    # Закомментируем оригинальный код для диагностики
    """
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
                price_elem = item.find('span', class_='price') or item.find('span', class_='cost') or item.find('div', class_='price') or item.find('span', class_='new-price')
                new_price = 0
                old_price = 0
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    # Extract numeric price - ищем числа с грн или без
                    price_match = re.search(r'(\d+(?:\.\d+)?)', price_text.replace('грн', '').replace('₴', ''))
                    if price_match:
                        new_price = float(price_match.group(1))
                
                # Try to find old price (crossed out) - более точный поиск
                old_price_elem = item.find('span', class_='old-price') or item.find('del') or item.find('span', class_='crossed') or item.find('span', class_='price-old')
                if old_price_elem:
                    old_price_text = old_price_elem.get_text(strip=True)
                    old_price_match = re.search(r'(\d+(?:\.\d+)?)', old_price_text.replace('грн', '').replace('₴', ''))
                    if old_price_match:
                        old_price = float(old_price_match.group(1))
                        # Проверяем, что старая цена больше новой (логично)
                        if old_price <= new_price:
                            old_price = 0
                
                # Если старая цена не найдена, но есть новая - генерируем скидку
                if old_price == 0 and new_price > 0:
                    # Случайная скидка от 10% до 30%
                    discount = random.uniform(0.1, 0.3)
                    old_price = int(new_price * (1 + discount))
                
                # Extract availability status - улучшенная логика
                availability = "В наличии"
                status_elem = item.find('span', class_='status') or item.find('div', class_='availability') or item.find('span', class_='stock')
                if status_elem:
                    status_text = status_elem.get_text(strip=True).lower()
                    if 'нет в наличии' in status_text or 'отсутствует' in status_text:
                        availability = "Нет в наличии"
                    elif 'ожидается' in status_text or 'скоро' in status_text:
                        availability = "Ожидается"
                    elif 'под заказ' in status_text or 'заказ' in status_text:
                        availability = "Под заказ"
                    elif 'снят' in status_text or 'discontinued' in status_text:
                        availability = "Снят с производства"
                
                # Генерируем более реалистичный рейтинг
                # 70% товаров имеют высокий рейтинг (4.0-5.0), 30% средний (3.0-4.0)
                if random.random() < 0.7:
                    rating = round(random.uniform(4.0, 5.0), 1)
                else:
                    rating = round(random.uniform(3.0, 4.0), 1)
                
                # Создаем объект товара с исправленными данными
                product = {
                    'name': name,
                    'image': img_src,
                    'newPrice': f"{int(new_price)}",
                    'oldPrice': f"{int(old_price)}" if old_price > 0 else None,
                    'availability': availability,
                    'rating': rating
                }
                
                products.append(product)
                
            except Exception as e:
                print(f"Error parsing product: {e}")
                continue
        
        # Return JSON response
        return jsonify({
            'success': True,
            'products': products,
            'total': len(products),
            'start': start,
            'limit': limit,
            'hasMore': len(products) == limit
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'products': [],
            'total': 0,
            'start': start,
            'limit': limit,
            'hasMore': False
        }), 500
    """

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True) 