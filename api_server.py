from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
import os
import mimetypes
from datetime import datetime
import threading
import time
import hashlib
import json
from pathlib import Path
import random

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')
CORS(app, supports_credentials=True)

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

# In-memory demo stores (not for production)
REGISTERED_USERS = {}
CAPTCHA_STORE = {}
USERS_DB_FILE = Path('users.db.json')

# SMS one-time codes store (not production; replace with persistent/redis in real env)
SMS_CODE_STORE = {}

# TurboSMS configuration via environment variables
TURBOSMS_LOGIN = os.environ.get('TURBOSMS_LOGIN', 'guitarstrings2')
TURBOSMS_PASSWORD = os.environ.get('TURBOSMS_PASSWORD')  # may be None until provided
TURBOSMS_SENDER = os.environ.get('TURBOSMS_SENDER', 'String&Pick')
TURBOSMS_AUTH_URL = os.environ.get('TURBOSMS_AUTH_URL', 'https://api.turbosms.ua/auth/login')
TURBOSMS_SEND_URL = os.environ.get('TURBOSMS_SEND_URL', 'https://api.turbosms.ua/message/send')
_TURBOSMS_TOKEN = None
_TURBOSMS_TOKEN_TS = 0

# =======================
# SMS helpers
# =======================

SMS_CODE_TTL_SECONDS = 5 * 60
SMS_RESEND_MIN_INTERVAL = 60  # seconds
SMS_MAX_ATTEMPTS = 5
SMS_MAX_PER_HOUR = 5

def _normalize_phone_international_ua(raw: str) -> str:
    """Return phone in +380XXXXXXXXX format or raise ValueError."""
    if not raw:
        raise ValueError('empty phone')
    digits = re.sub(r'\D+', '', raw)
    if digits.startswith('380') and len(digits) == 12:
        return '+' + digits
    if digits.startswith('0') and len(digits) == 10:
        return '+38' + digits
    if digits.startswith('80') and len(digits) == 11:
        return '+3' + digits
    if digits.startswith('38') and len(digits) == 11:
        return '+' + digits
    # As a fallback, accept already +380...
    if raw.startswith('+') and len(digits) == 12 and digits.startswith('380'):
        return '+' + digits
    raise ValueError('Некорректный номер. Используйте формат +380XXXXXXXXX')


def _generate_sms_code() -> str:
    return f"{random.randint(100000, 999999)}"


def _turbosms_get_token() -> str:
    global _TURBOSMS_TOKEN, _TURBOSMS_TOKEN_TS
    if not TURBOSMS_LOGIN or not TURBOSMS_PASSWORD:
        return None
    now = time.time()
    # Refresh token every 25 minutes
    if _TURBOSMS_TOKEN and (now - _TURBOSMS_TOKEN_TS) < (25 * 60):
        return _TURBOSMS_TOKEN
    try:
        r = requests.post(TURBOSMS_AUTH_URL, json={
            'login': TURBOSMS_LOGIN,
            'password': TURBOSMS_PASSWORD,
        }, timeout=10)
        r.raise_for_status()
        data = r.json()
        token = data.get('token') or data.get('access_token')
        if token:
            _TURBOSMS_TOKEN = token
            _TURBOSMS_TOKEN_TS = now
            return token
    except Exception as e:
        print(f"TurboSMS auth failed: {e}")
    return None


def _turbosms_send_sms(phone: str, text: str) -> bool:
    token = _turbosms_get_token()
    if not token:
        # dev fallback — считаем отправленным, но пишем лог
        print(f"[DEV SMS] {phone}: {text}")
        return True
    try:
        headers = { 'Authorization': f'Bearer {token}' }
        payload = {
            'recipients': [phone],
            'sms': {
                'sender': TURBOSMS_SENDER or 'GuitarStr',
                'text': text
            }
        }
        r = requests.post(TURBOSMS_SEND_URL, json=payload, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
        # TurboSMS returns status per recipient; assume ok if no error
        return True
    except Exception as e:
        print(f"TurboSMS send failed: {e}")
        return False


def _format_otp_message(lang: str, code: str) -> str:
    lang = (lang or 'uk').lower()
    if lang == 'ru':
        return f'Код для входа: {code}. Никому не сообщайте его.'
    if lang == 'en':
        return f'Login code: {code}. Do not share it.'
    # default uk
    return f'Код для входу: {code}. Нікому не повідомляйте його.'

def _load_users_from_disk() -> None:
    global REGISTERED_USERS
    try:
        if USERS_DB_FILE.exists():
            with USERS_DB_FILE.open('r', encoding='utf-8') as f:
                data = json.load(f)
            # basic validation
            if isinstance(data, dict):
                REGISTERED_USERS = data
            else:
                REGISTERED_USERS = {}
        else:
            REGISTERED_USERS = {}
    except Exception:
        REGISTERED_USERS = {}

def _save_users_to_disk() -> None:
    try:
        with USERS_DB_FILE.open('w', encoding='utf-8') as f:
            json.dump(REGISTERED_USERS, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def _generate_captcha():
    a = int(time.time() * 1000) % 10
    b = (int(time.time()) * 7) % 10
    if a < 3: a = a + 3
    if b < 3: b = b + 2
    question = f"{a} + {b}"
    answer = str(a + b)
    captcha_id = hashlib.sha256(f"{time.time()}:{a}:{b}".encode('utf-8')).hexdigest()[:16]
    CAPTCHA_STORE[captcha_id] = { 'answer': answer, 'expires': time.time() + 300 }
    return captcha_id, question

def _verify_and_consume_captcha(captcha_id: str, user_answer: str) -> bool:
    entry = CAPTCHA_STORE.get(captcha_id)
    if not entry:
        return False
    if time.time() > entry['expires']:
        CAPTCHA_STORE.pop(captcha_id, None)
        return False
    ok = (str(entry['answer']).strip() == str(user_answer).strip())
    CAPTCHA_STORE.pop(captcha_id, None)
    return ok

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

@app.route('/api/captcha')
def api_captcha():
    try:
        cid, question = _generate_captcha()
        return jsonify({'success': True, 'captchaId': cid, 'question': question}), 200, {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        }
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

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
            response = requests.get(url, headers=headers, timeout=30)
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

    # If scraping failed or returned too few products, use static fallback data
    if len(all_product_items) < 50:
        print("Warning: Too few products scraped, using static fallback data")
        all_product_items = get_static_products_fallback()

    # Cache the results
    ALL_PRODUCTS_CACHE = all_product_items
    CACHE_TIMESTAMP = current_time
    # Build processed JSON cache for fast responses
    try:
        build_processed_products()
    except Exception as e:
        print(f"Warning: could not build processed products cache: {e}")

    return all_product_items

def get_static_products_fallback():
    """Return static fallback product data when scraping fails"""
    from bs4 import BeautifulSoup

    static_html = """
    <div class="spacer">
        <h3 class="product-title">Ernie Ball 2221 Regular Slinky 10-46</h3>
        <img src="Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg" alt="Ernie Ball 2221">
        <div class="vm3pr-2">
            <span class="PricesalesPrice">350.00 ₴</span>
        </div>
        <div class="availability">
            <span class="instock">В наличии</span>
        </div>
    </div>
    <div class="spacer">
        <h3 class="product-title">D'Addario EXL120 Nickel Wound Super Light 9-42</h3>
        <img src="Goods/Electric_guitar_strings/EXL120/DAddario_EXL120_9-42.jpg" alt="D'Addario EXL120">
        <div class="vm3pr-2">
            <span class="PricesalesPrice">320.00 ₴</span>
        </div>
        <div class="availability">
            <span class="instock">В наличии</span>
        </div>
    </div>
    <div class="spacer">
        <h3 class="product-title">Elixir 12002 Nanoweb Light 10-47</h3>
        <img src="Goods/Electric_guitar_strings/12002/Elixir_12002_10-47.jpg" alt="Elixir 12002">
        <div class="vm3pr-2">
            <span class="PricesalesPrice">450.00 ₴</span>
        </div>
        <div class="availability">
            <span class="instock">В наличии</span>
        </div>
    </div>
    <div class="spacer">
        <h3 class="product-title">Ernie Ball 2620 7-String Power Slinky 11-58</h3>
        <img src="Goods/Electric_guitar_strings/2620/Ernie_Ball_2620_7-string.jpg" alt="Ernie Ball 2620">
        <div class="vm3pr-2">
            <span class="PricesalesPrice">380.00 ₴</span>
        </div>
        <div class="availability">
            <span class="instock">В наличии</span>
        </div>
    </div>
    <div class="spacer">
        <h3 class="product-title">Ernie Ball 3121 Titanium Regular Slinky 10-46</h3>
        <img src="Goods/Electric_guitar_strings/3121/Ernie_Ball_3121_Titanium.jpg" alt="Ernie Ball 3121">
        <div class="vm3pr-2">
            <span class="PricesalesPrice">550.00 ₴</span>
        </div>
        <div class="availability">
            <span class="instock">В наличии</span>
        </div>
    </div>
    """

    soup = BeautifulSoup(static_html, 'html.parser')
    return soup.find_all('div', class_='spacer')

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
    # if DEBUG:
    #     print(f"API Products: start={start}, limit={limit}, search='{search}'")
    
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
        # 1) Если пользователь уже залогинен через сессию браузера — возвращаем его
        user = session.get('user')
        if user:
            profile = {
                'success': True,
                'userId': user.get('userId', 'session-user'),
                'displayName': user.get('displayName') or user.get('username') or 'User',
                'username': user.get('username'),
                'bonuses': 100,
                'photoUrl': user.get('photoUrl'),
                'language': user.get('language', 'uk')
            }
            return jsonify(profile), 200, {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*'
            }

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
    """Возвращает список заказов пользователя и сводку из базы данных."""
    try:
        # Получаем текущего пользователя из сессии или параметров
        user = session.get('user')
        tg_id = request.args.get('tg_id')

        if not user and not tg_id:
            return jsonify({
                'success': False,
                'error': 'Пользователь не авторизован',
                'orders': [],
                'summary': {'totalOrders': 0, 'bonuses': 0, 'totalAmount': 0}
            }), 401

        # Получаем заказы пользователя
        user_orders = []
        user_identifier = None

        # Определяем идентификатор пользователя
        if user:
            user_identifier = user.get('username') or user.get('displayName') or user.get('email')
        elif tg_id:
            user_identifier = tg_id

        print(f"API user_orders: Получаем заказы для пользователя: {user_identifier}")
        print(f"API user_orders: Всего заказов в базе: {len(ORDERS_DB)}")

        for order in ORDERS_DB:
            # Фильтруем заказы по пользователю
            order_belongs_to_user = False

            if user_identifier:
                # Проверяем различные поля, которые могут содержать идентификатор пользователя
                # Ищем в customer данных или в самом заказе
                print(f"API user_orders: Проверяем заказ {order.get('id', 'unknown')}: userId={order.get('userId')}, customer.name={order.get('customer', {}).get('name')}, customer.phone={order.get('customer', {}).get('phone')}")

                if order.get('customer', {}).get('phone') and user_identifier in str(order['customer']['phone']):
                    order_belongs_to_user = True
                    print(f"API user_orders: Заказ принадлежит пользователю по телефону")
                elif order.get('customer', {}).get('name') and user_identifier in str(order['customer']['name']):
                    order_belongs_to_user = True
                    print(f"API user_orders: Заказ принадлежит пользователю по имени")
                elif order.get('userId') and str(order['userId']) == str(user_identifier):
                    order_belongs_to_user = True
                    print(f"API user_orders: Заказ принадлежит пользователю по userId")
                elif order.get('username') and order['username'] == user_identifier:
                    order_belongs_to_user = True
                    print(f"API user_orders: Заказ принадлежит пользователю по username")
                # Для демо - если пользователь just_a_legend, показываем все заказы (как было раньше)
                elif user_identifier == 'just_a_legend':
                    order_belongs_to_user = True
                    print(f"API user_orders: Заказ принадлежит just_a_legend (демо режим)")
            else:
                # Если нет идентификатора пользователя, показываем все заказы (демо режим)
                order_belongs_to_user = True
                print(f"API user_orders: Нет идентификатора пользователя, показываем все заказы")

            if order_belongs_to_user:
                user_orders.append(order)
                print(f"API user_orders: Заказ {order.get('id', 'unknown')} добавлен в результат")

        print(f"API user_orders: Найдено {len(user_orders)} заказов для пользователя {user_identifier}")
        print(f"API user_orders: Возвращаемые заказы: {[order.get('id', 'unknown') for order in user_orders[:5]]}...")  # Показать первые 5 ID

        # Подсчитаем статистику по заказам
        total_amount = 0
        completed_orders = 0
        for order in user_orders:
            amount = order.get('finalTotal') or order.get('total') or order.get('amount', 0)
            total_amount += float(amount) if amount else 0
            if order.get('status') in ['completed', 'принято', 'завершен', 'выполнен']:
                completed_orders += 1

        print(f"API user_orders: Статистика - всего заказов: {len(user_orders)}, завершенных: {completed_orders}, общая сумма: {total_amount}")

        # Если заказов нет, возвращаем пустой результат
        if not user_orders:
            return jsonify({
                'success': True,
                'orders': [],
                'summary': {'totalOrders': 0, 'bonuses': 0, 'totalAmount': 0}
            }), 200, {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*'
            }

        # Форматируем заказы для фронтенда
        formatted_orders = []
        total_amount = 0

        for order in user_orders:
            # Рассчитываем итоговую сумму с учетом бонусов и доставки
            order_total = order.get('total', 0)
            delivery_cost = calculate_delivery_cost(order.get('deliveryMethod', 'pickup'), order_total)
            bonuses_used = order.get('bonusesUsed', 0)
            coupon_discount = order.get('couponDiscount', 0)
            final_amount = max(0, order_total + delivery_cost - bonuses_used - coupon_discount)

            # Получаем адрес доставки
            customer = order.get('customer', {})
            settlement = customer.get('settlement', '')
            branch = customer.get('branch', '')
            address = f"{settlement}, {branch}".strip(', ')

            # Получаем статус заказа
            status = order.get('status', 'accepted')
            status_text = get_order_status_text(status)

            formatted_order = {
                'orderId': order.get('id', ''),
                'date': order.get('date', '').split('T')[0] if 'T' in str(order.get('date', '')) else str(order.get('date', '')),
                'address': address or 'Адрес не указан',
                'amount': final_amount,
                'status': status_text
            }

            formatted_orders.append(formatted_order)
            total_amount += final_amount

        # Сортируем заказы по дате (новые выше)
        formatted_orders.sort(key=lambda x: x.get('date', ''), reverse=True)

        # Рассчитываем бонусы пользователя на основе заказов
        bonuses = 0
        for order in formatted_orders:
            # Начисляем 1% от суммы каждого заказа
            order_amount = order.get('amount', 0)
            bonus_earned = int(order_amount * 0.01)  # 1% от суммы заказа
            bonuses += bonus_earned

        # Добавляем начальный бонус для новых пользователей
        if len(formatted_orders) == 0:
            bonuses = 10  # Начальный бонус для новых пользователей

        # Проверяем сохраненные бонусы пользователя
        if user and 'bonuses' in user:
            saved_bonuses = user.get('bonuses', 0)
            if saved_bonuses > bonuses:
                bonuses = saved_bonuses  # Используем сохраненное значение, если оно больше

        payload = {
            'success': True,
            'summary': {
                'totalOrders': len(formatted_orders),
                'bonuses': bonuses,
                'totalAmount': total_amount
            },
            'orders': formatted_orders
        }

        return jsonify(payload), 200, {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        }
    except Exception as e:
        print(f"Error in api_user_orders: {e}")
        return jsonify({'success': False, 'error': str(e), 'orders': [], 'summary': {'totalOrders': 0, 'bonuses': 0, 'totalAmount': 0}}), 500


def calculate_delivery_cost(delivery_method, order_total):
    """Рассчитывает стоимость доставки в зависимости от метода и суммы заказа."""
    try:
        if delivery_method == 'pickup':
            return 0
        elif delivery_method == 'nova':
            return 50 if order_total < 1000 else 0  # Бесплатная доставка от 1000 грн
        elif delivery_method == 'ukrposhta':
            return 30 if order_total < 500 else 0   # Бесплатная доставка от 500 грн
        elif delivery_method == 'meest':
            return 45 if order_total < 800 else 0   # Бесплатная доставка от 800 грн
        else:
            return 50  # Стоимость по умолчанию
    except Exception:
        return 50


def get_order_status_text(status):
    """Возвращает текстовое представление статуса заказа."""
    status_map = {
        'accepted': 'Принят',
        'processing': 'В обработке',
        'shipped': 'Отправлен',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен',
        'completed': 'Выполнен'
    }
    return status_map.get(status, 'Неизвестный статус')


@app.route('/api/login', methods=['POST'])
def api_login():
    """Примитивный логин для браузера: сохраняем данные пользователя в сессию."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        display_name = (data.get('displayName') or '').strip()
        username = (data.get('username') or '').strip() or display_name
        photo_url = (data.get('photoUrl') or '').strip() or data.get('avatarUrl') or data.get('image')
        if not display_name and not username:
            return jsonify({'success': False, 'error': 'Missing displayName/username'}), 400
        # Проверка капчи
        captcha_id = (data.get('captchaId') or '').strip()
        captcha_answer = (data.get('captchaAnswer') or '').strip()
        if not _verify_and_consume_captcha(captcha_id, captcha_answer):
            return jsonify({'success': False, 'error': 'Неверная капча'}), 400
        # Проверка пароля: допускаем вход ТОЛЬКО для зарегистрированных пользователей
        password = (data.get('password') or '').strip()
        if not password:
            return jsonify({'success': False, 'error': 'Требуется пароль'}), 400

        # Поддержка входа по логину или email
        user_record = REGISTERED_USERS.get(username)
        found_by_email = False
        if not user_record:
            # поиск по email
            for uname, record in REGISTERED_USERS.items():
                if record.get('email') and record['email'].lower() == username.lower():
                    user_record = record
                    username = uname
                    found_by_email = True
                    break

        if not user_record:
            return jsonify({'success': False, 'error': 'Пользователь не зарегистрирован'}), 404

        # Если нашли по email, но пароль не совпал — сообщаем именно про пароль
        if user_record.get('passwordHash') != _hash_password(password):
            return jsonify({'success': False, 'error': 'Неверный пароль'}), 401

        display_name = user_record.get('displayName') or username
        photo_url = user_record.get('photoUrl') or photo_url

        session['user'] = {
            'userId': username or 'session-user',
            'displayName': display_name or username,
            'username': username,
            'photoUrl': photo_url,
            'language': 'uk'
        }
        # Remember: увеличить срок жизни сессии (простая имитация)
        remember = data.get('remember') in (True, 'true', '1', 1)
        if remember:
            session.permanent = True
            from datetime import timedelta
            app.permanent_session_lifetime = timedelta(days=14)
        return jsonify({'success': True, 'profile': session['user']}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/logout', methods=['POST', 'GET'])
def api_logout():
    """Выход из кабинета: очищаем сессию браузера."""
    try:
        session.pop('user', None)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def api_register():
    """Регистрация пользователя (демо, без БД)."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        username = (data.get('username') or '').strip()
        password = (data.get('password') or '').strip()
        captcha_id = (data.get('captchaId') or '').strip()
        captcha_answer = (data.get('captchaAnswer') or '').strip()

        if not email or not username or not password:
            return jsonify({'success': False, 'error': 'Заполните все поля'}), 400
        if '@' not in email:
            return jsonify({'success': False, 'error': 'Некорректный email'}), 400
        if len(username) < 3:
            return jsonify({'success': False, 'error': 'Логин слишком короткий'}), 400
        if len(password) < 6:
            return jsonify({'success': False, 'error': 'Пароль слишком короткий'}), 400
        if not _verify_and_consume_captcha(captcha_id, captcha_answer):
            return jsonify({'success': False, 'error': 'Неверная капча'}), 400
        if username in REGISTERED_USERS:
            return jsonify({'success': False, 'error': 'Логин уже занят'}), 409

        # Уникальность e-mail (вне зависимости от регистра)
        for existing_username, record in REGISTERED_USERS.items():
            try:
                if (record.get('email') or '').lower() == email.lower():
                    return jsonify({'success': False, 'error': 'E-mail уже используется'}), 409
            except Exception:
                continue

        REGISTERED_USERS[username] = {
            'email': email,
            'passwordHash': _hash_password(password),
            'displayName': username,
            'createdAt': time.time(),
            'photoUrl': None
        }

        _save_users_to_disk()

        session['user'] = {
            'userId': username,
            'displayName': username,
            'username': username,
            'photoUrl': None,
            'language': 'uk'
        }
        return jsonify({'success': True, 'profile': session['user']}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sms/request_code', methods=['POST'])
def sms_request_code():
    try:
        data = request.get_json(force=True, silent=True) or {}
        raw_phone = (data.get('phone') or '').strip()
        lang = (data.get('lang') or 'uk').strip().lower()
        if not raw_phone:
            return jsonify({'success': False, 'error': 'Укажите номер телефона'}), 400
        try:
            phone = _normalize_phone_international_ua(raw_phone)
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400

        now = time.time()
        rec = SMS_CODE_STORE.get(phone)
        if rec:
            # rate limit: minimal resend interval
            if (now - rec.get('last_sent', 0)) < SMS_RESEND_MIN_INTERVAL:
                return jsonify({'success': False, 'error': 'Слишком часто. Повторите позже'}), 429
            # hourly limit
            hourly = [t for t in rec.get('history', []) if (now - t) < 3600]
            if len(hourly) >= SMS_MAX_PER_HOUR:
                return jsonify({'success': False, 'error': 'Лимит SMS исчерпан. Попробуйте позже'}), 429

        code = _generate_sms_code()
        SMS_CODE_STORE[phone] = {
            'code': code,
            'expires': now + SMS_CODE_TTL_SECONDS,
            'attempts': 0,
            'last_sent': now,
            'history': (rec.get('history') if rec else []) + [now]
        }

        text = _format_otp_message(lang, code)
        ok = _turbosms_send_sms(phone, text)
        if not ok:
            return jsonify({'success': False, 'error': 'Не удалось отправить SMS'}), 502
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/sms/confirm', methods=['POST'])
def sms_confirm():
    try:
        data = request.get_json(force=True, silent=True) or {}
        raw_phone = (data.get('phone') or '').strip()
        code = (data.get('code') or '').strip()
        lang = (data.get('lang') or 'uk').strip().lower()
        tg_phone_raw = (data.get('tg_phone') or '').strip()
        tg_photo_url = (data.get('tg_photo_url') or '').strip() or None
        if not raw_phone or not code:
            return jsonify({'success': False, 'error': 'Телефон и код обязательны'}), 400
        try:
            phone = _normalize_phone_international_ua(raw_phone)
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400

        rec = SMS_CODE_STORE.get(phone)
        now = time.time()
        if not rec:
            return jsonify({'success': False, 'error': 'Код не запрошен'}), 400
        if now > rec.get('expires', 0):
            SMS_CODE_STORE.pop(phone, None)
            return jsonify({'success': False, 'error': 'Код просрочен'}), 400
        if rec.get('attempts', 0) >= SMS_MAX_ATTEMPTS:
            SMS_CODE_STORE.pop(phone, None)
            return jsonify({'success': False, 'error': 'Слишком много попыток'}), 429
        rec['attempts'] = rec.get('attempts', 0) + 1

        if code != rec.get('code'):
            return jsonify({'success': False, 'error': 'Неверный код'}), 401

        # success — consume code
        SMS_CODE_STORE.pop(phone, None)

        # Upsert a lightweight user by phone
        username = f"user_{hashlib.sha1(phone.encode('utf-8')).hexdigest()[:8]}"
        if username not in REGISTERED_USERS:
            REGISTERED_USERS[username] = {
                'email': None,
                'passwordHash': None,
                'displayName': phone,
                'createdAt': now,
                'photoUrl': None,
                'phone': phone
            }
            _save_users_to_disk()

        # Optional: verify that Telegram phone matches
        try:
            tg_phone_norm = _normalize_phone_international_ua(tg_phone_raw) if tg_phone_raw else None
        except Exception:
            tg_phone_norm = None

        session['user'] = {
            'userId': username,
            'displayName': phone,
            'username': username,
            'photoUrl': tg_photo_url if tg_phone_norm and tg_phone_norm == phone else None,
            'language': lang,
            'phone': phone
        }
        return jsonify({'success': True, 'profile': session['user']}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# =======================
# ORDER MANAGEMENT
# =======================

# Global orders storage (in production, use database)
ORDERS_DB = []
ORDERS_FILE = Path('orders.db.json')

def load_orders_from_disk():
    """Load orders from disk on startup."""
    global ORDERS_DB
    try:
        if ORDERS_FILE.exists():
            with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
                ORDERS_DB = json.load(f)
            print(f"Loaded {len(ORDERS_DB)} orders from disk")
        else:
            ORDERS_DB = []
            print("No orders file found, starting with empty orders database")
    except Exception as e:
        print(f"Error loading orders from disk: {e}")
        ORDERS_DB = []

def save_orders_to_disk():
    """Save orders to disk."""
    try:
        with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(ORDERS_DB, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(ORDERS_DB)} orders to disk")
    except Exception as e:
        print(f"Error saving orders to disk: {e}")

@app.route('/api/save_order', methods=['POST'])
def save_order():
    """Save order to server database."""
    try:
        print("📦 Получен запрос на сохранение заказа")
        print(f"📦 Content-Type: {request.content_type}")
        print(f"📦 Request data type: {type(request.data)}")
        
        # Попытка получения JSON данных с обработкой ошибок кодировки
        order_data = None
        
        try:
            # Сначала пробуем стандартный способ
            order_data = request.get_json(force=True)
        except Exception as json_error:
            print(f"❌ Ошибка get_json: {json_error}")
            
            # Пробуем получить raw data и декодировать вручную
            try:
                raw_data = request.get_data()
                print(f"📦 Raw data length: {len(raw_data)}")
                
                # Пробуем разные кодировки
                text_data = None
                for encoding in ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']:
                    try:
                        text_data = raw_data.decode(encoding)
                        print(f"✅ Успешно декодировано с {encoding}")
                        break
                    except UnicodeDecodeError:
                        continue
                
                if text_data:
                    # Очищаем данные от проблемных символов
                    cleaned_data = clean_json_string(text_data)
                    order_data = json.loads(cleaned_data)
                else:
                    raise ValueError("Не удалось декодировать данные ни с одной кодировкой")
                    
            except Exception as decode_error:
                print(f"❌ Ошибка декодирования: {decode_error}")
                return jsonify({'success': False, 'error': f'Ошибка декодирования данных: {str(decode_error)}'}), 400

        if not order_data:
            return jsonify({'success': False, 'error': 'No order data provided'}), 400

        print(f"📦 Получены данные заказа: ID={order_data.get('id', 'unknown')}")

        # Validate required fields
        required_fields = ['id', 'date', 'customer', 'items']
        for field in required_fields:
            if field not in order_data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

        # Ensure we have either 'total' or 'finalTotal'
        if 'total' not in order_data and 'finalTotal' not in order_data:
            return jsonify({'success': False, 'error': 'Missing required field: total or finalTotal'}), 400

        # Очищаем данные заказа от проблемных символов
        cleaned_order_data = clean_order_data_python(order_data)

        # Check if order with this ID already exists
        existing_order = next((order for order in ORDERS_DB if order['id'] == cleaned_order_data['id']), None)
        if existing_order:
            # Update existing order instead of returning error
            print(f"📦 Обновляем существующий заказ {cleaned_order_data['id']}")
            existing_order.update(cleaned_order_data)
            save_orders_to_disk()
            return jsonify({
                'success': True,
                'message': f'Order {cleaned_order_data["id"]} updated successfully',
                'order_id': cleaned_order_data['id'],
                'updated': True
            }), 200

        # Add order to database
        ORDERS_DB.append(cleaned_order_data)
        save_orders_to_disk()

        total_amount = cleaned_order_data.get('total') or cleaned_order_data.get('finalTotal') or cleaned_order_data.get('amount', 0)
        user_id = cleaned_order_data.get('userId', 'unknown')
        customer_name = cleaned_order_data.get('customer', {}).get('name', 'unknown')

        print(f"📦 Заказ сохранен: {cleaned_order_data['id']} - User: {user_id} - Customer: {customer_name} - Total: {total_amount} UAH")

        return jsonify({
            'success': True,
            'message': f'Order {cleaned_order_data["id"]} saved successfully',
            'order_id': cleaned_order_data['id']
        }), 201

    except Exception as e:
        print(f"❌ Error saving order: {e}")
        print(f"❌ Exception type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

def clean_json_string(text):
    """Очистка JSON строки от проблемных символов"""
    import re
    
    # Удаляем управляющие символы, кроме разрешенных
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)
    
    # Заменяем проблемные кавычки
    text = text.replace('"', '"').replace('"', '"').replace('„', '"').replace('"', '"')
    
    # Удаляем лишние пробелы и переносы
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def clean_order_data_python(order_data):
    """Очистка данных заказа от проблемных символов в Python"""
    import json
    
    def clean_value(obj):
        if isinstance(obj, str):
            # Удаляем управляющие символы
            cleaned = ''.join(char for char in obj if ord(char) >= 32 or char in '\t\n\r')
            # Удаляем лишние пробелы
            return cleaned.strip()
        elif isinstance(obj, dict):
            return {key: clean_value(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [clean_value(item) for item in obj]
        else:
            return obj
    
    return clean_value(order_data)

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all orders (admin endpoint)."""
    try:
        # In production, add authentication check here
        return jsonify({
            'success': True,
            'orders': ORDERS_DB,
            'total': len(ORDERS_DB)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

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
    print("Starting server... (версия 13.03 - добавлена система заказов)")
    # Load users DB from disk
    _load_users_from_disk()
    # Load orders DB from disk
    load_orders_from_disk()
    # Do not block startup; build cache in the background
    preload_cache_async()
    print("Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True) 