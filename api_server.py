from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
import os
import mimetypes
from datetime import datetime
import threading

app = Flask(__name__)
CORS(app)

# Global cache for all scraped products
ALL_PRODUCTS_CACHE = None
CACHE_TIMESTAMP = None
# Preprocessed lightweight JSON cache for fast API responses
PROCESSED_PRODUCTS_CACHE = None
# Concurrency guards
CACHE_LOCK = None  # lazy init to avoid issues at import time
CACHE_REFRESH_IN_PROGRESS = False
# Verbose server-side debug (turn off for speed)
DEBUG = False

def scrape_all_pages():
    """Scrape all pages from guitarstrings.com.ua/electro and return combined product list"""
    global ALL_PRODUCTS_CACHE, CACHE_TIMESTAMP
    
    # Check if we have recent cache (less than 30 minutes old)
    import time
    current_time = time.time()
    if ALL_PRODUCTS_CACHE is not None and CACHE_TIMESTAMP is not None:
        if current_time - CACHE_TIMESTAMP < 1800:  # 30 minutes cache
            print(f"Using cached products: {len(ALL_PRODUCTS_CACHE)} items")
            return ALL_PRODUCTS_CACHE
    
    print("Scraping all pages...")
    
    all_product_items = []
    page_urls = [
        "https://guitarstrings.com.ua/electro",
        "https://guitarstrings.com.ua/electro?start=60",
        "https://guitarstrings.com.ua/electro?start=120", 
        "https://guitarstrings.com.ua/electro?start=180",
        "https://guitarstrings.com.ua/electro?start=240",
        "https://guitarstrings.com.ua/electro?start=300",
        "https://guitarstrings.com.ua/electro?start=360"
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    for i, url in enumerate(page_urls, 1):
        try:
            print(f"Scraping page {i}/7...")
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find product items using the correct selector for this site
            product_items = soup.find_all('div', class_='spacer')
            
            if not product_items:
                # Fallback selectors
                product_items = soup.find_all('div', class_='product-item')
            
            if not product_items:
                product_items = soup.find_all('div', class_='item')
            
            all_product_items.extend(product_items)
            
            # Add a small delay between requests to be respectful
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error scraping page {i} ({url}): {e}")
            continue
    
    print(f"Total products scraped from all pages: {len(all_product_items)}")
    
    # Cache the results
    ALL_PRODUCTS_CACHE = all_product_items
    CACHE_TIMESTAMP = current_time
    # Build processed JSON cache for fast responses
    try:
        build_processed_products()
    except Exception as e:
        print(f"Warning: could not build processed products cache: {e}")
    
    return all_product_items

# Build a lightweight list of product dicts from cached BeautifulSoup items
def build_processed_products():
    global PROCESSED_PRODUCTS_CACHE, ALL_PRODUCTS_CACHE
    items = ALL_PRODUCTS_CACHE or []
    processed = []

    def extract_number(text):
        import re
        m = re.search(r"(\d+(?:\.\d+)?)", (text or '').replace('грн', '').replace('₴', '').replace(' ', ''))
        return float(m.group(1)) if m else 0.0

    for item in items:
        try:
            # name
            name_elem = item.find('h3', class_='product-title') or item.find('h3', class_='title') or item.find('h3') or item.find('h2') or item.find('a', class_='title')
            name = name_elem.get_text(strip=True) if name_elem else "Unknown Product"

            # image
            img_elem = item.find('img')
            img_src = ""
            if img_elem:
                img_src = img_elem.get('src') or img_elem.get('data-src') or img_elem.get('data-original')
                if img_src and not img_src.startswith('http'):
                    img_src = 'https://guitarstrings.com.ua' + img_src
            if not img_src:
                img_src = 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'

            # prices
            new_price = 0.0
            old_price = 0.0
            price_container = item.find('div', class_='vm3pr-2')
            if price_container:
                sales_price_elem = price_container.find('span', class_='PricesalesPrice')
                if sales_price_elem:
                    new_price = extract_number(sales_price_elem.get_text(strip=True))
                base_price_div = price_container.find('div', class_='PricebasePrice')
                if base_price_div:
                    base_price_elem = base_price_div.find('span', class_='PricebasePrice')
                    if base_price_elem:
                        old_price = extract_number(base_price_elem.get_text(strip=True))
                if old_price == 0.0:
                    base_price_elem = price_container.find('span', class_='PricebasePrice')
                    if base_price_elem:
                        old_price = extract_number(base_price_elem.get_text(strip=True))
            if new_price == 0.0:
                price_elem = item.find('span', class_='Price') or item.find('span', class_='price') or item.find('div', class_='price')
                if price_elem:
                    new_price = extract_number(price_elem.get_text(strip=True))
            if new_price == 0.0:
                new_price = 350.0

            # availability
            availability = None
            availability_elem = item.find('div', class_='availability')
            if availability_elem:
                status_elem = availability_elem.find('span')
                if status_elem:
                    status_text = status_elem.get_text(strip=True).lower()
                    if any(w in status_text for w in ['снят с производства', 'знятий з виробництва', 'discontinued', 'знято з виробництва']):
                        availability = 'Снят с производства'
                    elif any(w in status_text for w in ['доступно под заказ', 'под заказ', 'заказ', 'по заказу', 'під замовлення']):
                        availability = 'Под заказ'
                    elif any(w in status_text for w in ['ожидается', 'скоро', 'предзаказ', 'очікується']):
                        availability = 'Ожидается'
                    elif any(w in status_text for w in ['нет в наличии', 'отсутствует', 'недоступен', 'немає в наявності', 'немає']):
                        availability = 'Нет в наличии'
                    elif any(w in status_text for w in ['в наличии', 'есть', 'доступен', 'в наявності', 'в одессе']):
                        availability = 'В наличии'
            if availability is None:
                status_icon = item.find('span', class_='vmicon')
                if status_icon:
                    icon_class = status_icon.get('class', [])
                    if 'vm2-nostock' in icon_class:
                        availability = 'Снят с производства'
            if availability is None:
                availability = 'В наличии'

            # subtitle
            subtitle_elem = item.find('div', class_='subtitle') or item.find('span', class_='subtitle') or item.find('p', class_='subtitle')
            subtitle = subtitle_elem.get_text(strip=True) if subtitle_elem else ''

            # rating
            rating_str = 'Нет рейтинга'
            try:
                rating_elem = item.find('span', class_='vrvote-count')
                if rating_elem:
                    rating_text = rating_elem.get_text(strip=True)
                    # pattern like "4.3 - 10 голосов"
                    m = re.search(r'(\d+\.?\d*)\s*-\s*\d+\s*голос', rating_text)
                    if not m:
                        # fallback: first number in text
                        m = re.search(r'(\d+\.?\d*)', rating_text)
                    if m:
                        val = float(m.group(1))
                        if 0 <= val <= 5:
                            # round to nearest 0.5 like earlier logic
                            if val >= 4.75:
                                rating_str = '5.0'
                            elif val >= 4.25:
                                rating_str = '4.5'
                            elif val >= 3.75:
                                rating_str = '4.0'
                            elif val >= 3.25:
                                rating_str = '3.5'
                            elif val >= 2.75:
                                rating_str = '3.0'
                            elif val >= 2.25:
                                rating_str = '2.5'
                            elif val >= 1.75:
                                rating_str = '2.0'
                            elif val >= 1.25:
                                rating_str = '1.5'
                            else:
                                rating_str = '1.0'
            except Exception:
                pass

            processed.append({
                'name': name,
                'image': img_src,
                'newPrice': f"{int(new_price)}",
                'oldPrice': f"{int(old_price)}" if old_price > 0 else None,
                'availability': availability,
                'rating': rating_str,
                'subtitle': subtitle,
                'status': availability
            })
        except Exception as e:
            if DEBUG:
                print(f"Process item error: {e}")
            continue

    PROCESSED_PRODUCTS_CACHE = processed
    if DEBUG:
        print(f"Processed products cache built: {len(PROCESSED_PRODUCTS_CACHE)} items")


def ensure_lock():
    global CACHE_LOCK
    if CACHE_LOCK is None:
        import threading
        CACHE_LOCK = threading.Lock()


def scrape_initial_page():
    """Quickly fetch the first catalog page to populate cache for fast initial response."""
    global ALL_PRODUCTS_CACHE, CACHE_TIMESTAMP
    ensure_lock()
    with CACHE_LOCK:
        try:
            print("Quick preload: scraping first page...")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            url = "https://guitarstrings.com.ua/electro"
            r = requests.get(url, headers=headers, timeout=10)
            r.raise_for_status()
            soup = BeautifulSoup(r.content, 'html.parser')
            items = soup.find_all('div', class_='spacer') or soup.find_all('div', class_='product-item') or soup.find_all('div', class_='item') or []
            import time
            ALL_PRODUCTS_CACHE = items
            CACHE_TIMESTAMP = time.time()
            build_processed_products()
            print(f"Quick preload ready: {len(items)} items")
        except Exception as e:
            print(f"Quick preload failed: {e}")


def trigger_background_refresh():
    """Start full refresh in background if not already running."""
    global CACHE_REFRESH_IN_PROGRESS
    ensure_lock()
    if CACHE_REFRESH_IN_PROGRESS:
        return
    import threading
    def _refresh():
        global CACHE_REFRESH_IN_PROGRESS
        CACHE_REFRESH_IN_PROGRESS = True
        try:
            scrape_all_pages()
        finally:
            CACHE_REFRESH_IN_PROGRESS = False
    threading.Thread(target=_refresh, daemon=True).start()

# Serve static files from the current directory
@app.route('/')
def index():
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()
        return content, 200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': '0',
            'ETag': f'"{hash("index.html")}"',
            'Vary': '*',
            'Surrogate-Control': 'no-store'
        }
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
        
        # Добавляем заголовки для предотвращения кеширования
        headers = {
            'Content-Type': content_type,
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
        
        # Для JavaScript, CSS и HTML файлов добавляем заголовки против кеширования
        if filename.endswith('.js') or filename.endswith('.css') or filename.endswith('.html'):
            headers.update({
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': '0',
                'ETag': f'"{hash(filename)}"',
                'Vary': '*',
                'Surrogate-Control': 'no-store'
            })
        
        return content, 200, headers
    except Exception as e:
        # Fallback to send_from_directory for binary files or errors
        return send_from_directory('.', filename)

@app.route('/api/products')
def api_products():
    start = request.args.get('start', 0, type=int)
    limit = request.args.get('limit', 60, type=int)
    search = request.args.get('search', '').lower().strip()
    if DEBUG:
        print(f"API Products: start={start}, limit={limit}, search='{search}'")
    
    try:
        # Ensure caches without blocking request: quick trigger only
        global ALL_PRODUCTS_CACHE, CACHE_TIMESTAMP, PROCESSED_PRODUCTS_CACHE
        import time
        current_time = time.time()
        if ALL_PRODUCTS_CACHE is None or CACHE_TIMESTAMP is None:
            # No cache yet → trigger async quick preload and full refresh
            scrape_initial_page()
            trigger_background_refresh()
        elif (current_time - CACHE_TIMESTAMP >= 1800):
            # Cache stale → serve stale, refresh in background
            trigger_background_refresh()
        if PROCESSED_PRODUCTS_CACHE is None:
            build_processed_products()

        # Work with lightweight processed cache
        product_dicts = PROCESSED_PRODUCTS_CACHE or []

        # Search filtering (by name/subtitle)
        if search:
            tokens = [t for t in search.split() if t]
            def matches(p):
                name = (p.get('name') or '').lower()
                subtitle = (p.get('subtitle') or '').lower()
                if not tokens:
                    return True
                return any((t in name) or (t in subtitle) for t in tokens)
            product_dicts = [p for p in product_dicts if matches(p)]
            if DEBUG:
                print(f"Debug: After filtering, {len(product_dicts)} products match search term")

        total_products = len(product_dicts)
        if DEBUG:
            print(f"Debug: Pagination - start: {start}, limit: {limit}, total products: {total_products}")

        if start >= total_products:
            # If start is beyond available products, return empty list
            if DEBUG:
                print(f"Debug: start ({start}) >= total products ({total_products}), returning empty list")
            return jsonify({
                'success': True,
                'products': [],
                'total': total_products,
                'start': start,
                'limit': limit,
                'hasMore': False
            }), 200, {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        end_index = min(start + limit, total_products)
        products = product_dicts[start:end_index]
        has_more = (start + limit) < total_products
        if DEBUG:
            print(f"Debug: products returned: {len(products)}, hasMore={has_more}")

        return jsonify({
            'success': True,
            'products': products,
            'total': total_products,  # Общее количество всех товаров
            'start': start,
            'limit': limit,
            'hasMore': has_more  # Есть ли еще товары после текущей страницы
        }), 200, {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        
    except Exception as e:
        print(f"Error in API: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'products': [],
            'total': 0,
            'start': start,
            'limit': limit,
            'hasMore': False
        }), 500, {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }

@app.route('/proxy_fetch')
def proxy_fetch():
    """Прокси для загрузки HTML с guitarstrings.com.ua, чтобы обойти CORS в браузере.
    Пример: /proxy_fetch?url=https://guitarstrings.com.ua/electro/11-electric?limitstart=0&limit=150
    Разрешаем только домен guitarstrings.com.ua.
    """
    src_url = request.args.get('url', '').strip()
    if not src_url:
        return 'Missing url', 400
    if not src_url.startswith('https://guitarstrings.com.ua/'):
        return 'URL not allowed', 403
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        r = requests.get(src_url, headers=headers, timeout=20)
        r.raise_for_status()
        html = r.text
        return html, 200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        }
    except Exception as e:
        return f'Proxy error: {e}', 502, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        }

# =======================
# Account API (mock)
# =======================

@app.route('/api/user_profile')
def api_user_profile():
    """Возвращает данные профиля пользователя.
    Если фронтенд передает Telegram-поля, можем проксировать их обратно.
    Параметры (query):
      - tg_id, tg_username, tg_first_name, tg_last_name, tg_photo_url
    """
    try:
        tg_id = request.args.get('tg_id')
        username = request.args.get('tg_username')
        first_name = request.args.get('tg_first_name')
        last_name = request.args.get('tg_last_name')
        photo_url = request.args.get('tg_photo_url')

        # Если не пришло с фронта — используем значения по умолчанию
        display_name = (f"{first_name or ''} {last_name or ''}" ).strip() or username or "Guest"

        profile = {
            'success': True,
            'userId': tg_id or 'local-guest',
            'displayName': display_name,
            'username': username,
            'bonuses': 100,
            'photoUrl': photo_url,
            'language': 'uk'
        }
        return jsonify(profile), 200, {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        }
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/user_orders')
def api_user_orders():
    """Возвращает список заказов пользователя и сводку. Демо-данные."""
    try:
        # Можно фильтровать по tg_id, если будет использоваться
        # tg_id = request.args.get('tg_id')

        demo_orders = [
            {
                'orderId': '13346',
                'date': '2025-02-03',
                'address': 'Одесса, НП №1',
                'amount': 680,
                'status': 'Оплачен'
            },
            {
                'orderId': '10547',
                'date': '2022-12-13',
                'address': 'Одесса, НП №1',
                'amount': 1140,
                'status': 'Оплачен'
            },
            {
                'orderId': '7158',
                'date': '2020-12-02',
                'address': 'Одесса, НП №1',
                'amount': 1,
                'status': 'Оплачен'
            }
        ]

        total_orders = len(demo_orders)
        total_amount = sum(o.get('amount', 0) for o in demo_orders)

        payload = {
            'success': True,
            'summary': {
                'totalOrders': total_orders,
                'bonuses': 100,
                'totalAmount': total_amount
            },
            'orders': demo_orders
        }
        return jsonify(payload), 200, {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        }
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'orders': [], 'summary': {'totalOrders': 0, 'bonuses': 0, 'totalAmount': 0}}), 500

def preload_cache_async():
    """Kick off product cache build in a background thread without blocking server startup."""
    def _worker():
        try:
            print("Pre-loading product cache in background...")
            scrape_all_pages()
            print("Cache pre-loaded successfully!")
        except Exception as e:
            print(f"Warning: Could not pre-load cache: {e}")

    t = threading.Thread(target=_worker, daemon=True)
    t.start()


if __name__ == '__main__':
    print("Starting server... (версия 13.02 - исправление цен La Bella)")
    # Do not block startup; build cache in the background
    preload_cache_async()
    print("Starting Flask server on port 8000...")
    app.run(host='0.0.0.0', port=8000, debug=True)