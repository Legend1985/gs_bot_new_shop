from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
import os
import mimetypes

app = Flask(__name__)
CORS(app)

# Global cache for all scraped products
ALL_PRODUCTS_CACHE = None
CACHE_TIMESTAMP = None

def is_navigation_item(name):
    """Проверяет, является ли элемент навигационным (не товаром)"""
    navigation_keywords = [
        'войти в аккаунт', 'создать аккаунт', 'магазин', 'контакты', 
        'доставка', 'сравнить', 'статьи', 'новости', 'производители',
        'вход', 'регистрация', 'корзина', 'избранное', 'заказы',
        'кабинет', 'настройки', 'помощь', 'о нас', 'условия',
        'политика', 'права', 'безопасность', 'поддержка'
    ]
    
    name_lower = name.lower().strip()
    return any(keyword in name_lower for keyword in navigation_keywords)

def is_valid_product(item):
    """Проверяет, является ли элемент валидным товаром"""
    try:
        # Проверяем наличие обязательных элементов товара
        has_name = item.find('h3') or item.find('h2') or item.find('a', class_='title')
        has_image = item.find('img')
        has_price = item.find('div', class_='vm3pr-2') or item.find('div', class_='price')
        
        # Элемент должен иметь название и хотя бы изображение или цену
        if not has_name:
            return False
            
        # Проверяем название на навигационные элементы
        name_elem = has_name
        if hasattr(name_elem, 'get_text'):
            name = name_elem.get_text(strip=True)
        else:
            name = name_elem.get_text(strip=True) if hasattr(name_elem, 'get_text') else str(name_elem)
        
        if is_navigation_item(name):
            return False
            
        return True
        
    except Exception as e:
        print(f"Error validating product: {e}")
        return False

def scrape_all_pages():
    """Scrape all pages from guitarstrings.com.ua/electro and return combined product list with duplicate removal"""
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
    seen_products = set()  # Для отслеживания дубликатов
    
    # Расширенный список страниц для более полного покрытия
    page_urls = [
        "https://guitarstrings.com.ua/electro",
        "https://guitarstrings.com.ua/electro?start=60",
        "https://guitarstrings.com.ua/electro?start=120", 
        "https://guitarstrings.com.ua/electro?start=180",
        "https://guitarstrings.com.ua/electro?start=240",
        "https://guitarstrings.com.ua/electro?start=300",
        "https://guitarstrings.com.ua/electro?start=360",
        "https://guitarstrings.com.ua/electro?start=420",  # Добавляем еще страницы
        "https://guitarstrings.com.ua/electro?start=480",
        "https://guitarstrings.com.ua/electro?start=540",  # Еще больше страниц
        "https://guitarstrings.com.ua/electro?start=600"
    ]
    
    # Также добавляем прямую страницу 7-струнных товаров
    seven_string_urls = [
        "https://guitarstrings.com.ua/electro/7-string-electric",
        "https://guitarstrings.com.ua/electro/7-string-electric?start=30",
        "https://guitarstrings.com.ua/electro/7-string-electric?start=60",
        "https://guitarstrings.com.ua/electro/7-string-electric?start=90"  # Добавляем еще страницы
    ]
    
    # Добавляем страницы с упаковками (6 sets, packs)
    pack_urls = [
        "https://guitarstrings.com.ua/electro?start=660",
        "https://guitarstrings.com.ua/electro?start=720",
        "https://guitarstrings.com.ua/electro?start=780"
    ]
    
    all_urls = page_urls + seven_string_urls + pack_urls
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    for i, url in enumerate(all_urls, 1):
        try:
            print(f"Scraping page {i}/{len(all_urls)}: {url}")
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Расширенные селекторы для поиска товаров
            product_items = []
            
            # Основные селекторы
            selectors = [
                'div.spacer',
                'div.product-item', 
                'div.item',
                'div.product',
                'div.vm-product',
                'div.vm-product-container'
            ]
            
            for selector in selectors:
                items = soup.find_all('div', class_=selector)
                if items:
                    product_items.extend(items)
                    print(f"Found {len(items)} items with selector '{selector}'")
                    break
            
            # Если не нашли по классам, ищем по структуре
            if not product_items:
                # Ищем любые div с заголовками h3 или h2
                potential_items = soup.find_all('div')
                for div in potential_items:
                    if div.find('h3') or div.find('h2') or div.find('a', class_='title'):
                        product_items.append(div)
                
                print(f"Found {len(product_items)} potential items by structure")
            
            # Проверяем на дубликаты и валидность перед добавлением
            new_items = []
            for item in product_items:
                try:
                    # Проверяем, является ли элемент валидным товаром
                    if not is_valid_product(item):
                        print(f"Skipped invalid product item")
                        continue
                    
                    # Извлекаем название для проверки дубликатов
                    name_elem = item.find('h3', class_='product-title') or \
                               item.find('h3', class_='title') or \
                               item.find('h3') or \
                               item.find('h2') or \
                               item.find('a', class_='title') or \
                               item.find('a', class_='product-title')
                    
                    if name_elem:
                        name = name_elem.get_text(strip=True)
                        
                        # Дополнительная проверка на навигационные элементы
                        if is_navigation_item(name):
                            print(f"Skipped navigation item: {name}")
                            continue
                        
                        # Создаем уникальный ключ для товара
                        product_key = name.lower().strip()
                        
                        if product_key not in seen_products:
                            seen_products.add(product_key)
                            new_items.append(item)
                            print(f"Added new product: {name}")
                        else:
                            print(f"Skipped duplicate: {name}")
                    else:
                        # Если не можем извлечь название, пропускаем
                        print(f"Skipped item without name")
                        continue
                        
                except Exception as e:
                    print(f"Error processing item: {e}")
                    continue
            
            all_product_items.extend(new_items)
            print(f"Page {i}: found {len(product_items)} items, added {len(new_items)} new valid items")
            
            # Add a small delay between requests to be respectful
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error scraping page {i} ({url}): {e}")
            continue
    
    print(f"Total unique valid products scraped: {len(all_product_items)}")
    
    # Cache the results
    ALL_PRODUCTS_CACHE = all_product_items
    CACHE_TIMESTAMP = current_time
    
    return all_product_items

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
            'Last-Modified': f'"{hash("index.html")}"',
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
                'Last-Modified': f'"{hash(filename)}"',
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
    
    print(f"API Products: start={start}, limit={limit}, search='{search}'")
    
    try:
        # Get all products from cache (don't re-scrape on every request)
        global ALL_PRODUCTS_CACHE, CACHE_TIMESTAMP
        
        # Check if cache is valid
        import time
        current_time = time.time()
        if ALL_PRODUCTS_CACHE is None or CACHE_TIMESTAMP is None or (current_time - CACHE_TIMESTAMP >= 1800):
            print("Cache expired or missing, refreshing...")
            product_items = scrape_all_pages()
        else:
            print(f"Using cached products: {len(ALL_PRODUCTS_CACHE)} items")
            product_items = ALL_PRODUCTS_CACHE
        
        print(f"Debug: Total products available: {len(product_items)}")
        
        # Если есть поисковый запрос, фильтруем товары
        if search:
            print(f"Debug: Filtering products for search term: '{search}'")
            filtered_items = []
            for item in product_items:
                try:
                    # Извлекаем название товара для поиска
                    name_elem = item.find('h3', class_='product-title') or \
                               item.find('h3', class_='title') or \
                               item.find('h3') or \
                               item.find('h2') or \
                               item.find('a', class_='title') or \
                               item.find('a', class_='product-title')
                    name = name_elem.get_text(strip=True) if name_elem else ""
                    
                    # Ищем в названии товара (частичное совпадение)
                    if search in name.lower() or any(word in name.lower() for word in search.split()):
                        filtered_items.append(item)
                        continue
                    
                    # Также можно искать в описании, если оно есть
                    desc_elem = item.find('div', class_='product-description') or \
                               item.find('p', class_='description') or \
                               item.find('div', class_='desc')
                    if desc_elem:
                        description = desc_elem.get_text(strip=True)
                        if search in description.lower() or any(word in description.lower() for word in search.split()):
                            filtered_items.append(item)
                            continue
                            
                except Exception as e:
                    print(f"Error filtering product: {e}")
                    continue
            
            product_items = filtered_items
            print(f"Debug: After filtering, {len(product_items)} products match search term")
        
        # Apply pagination to the combined product list
        print(f"Debug: Pagination - start: {start}, limit: {limit}, total products: {len(product_items)}")
        
        if start >= len(product_items):
            # If start is beyond available products, return empty list
            print(f"Debug: start ({start}) >= total products ({len(product_items)}), returning empty list")
            return jsonify({
                'success': True,
                'products': [],
                'total': len(product_items),
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
        
        end_index = min(start + limit, len(product_items))
        paginated_items = product_items[start:end_index]
        print(f"Debug: Pagination result - start: {start}, end: {end_index}, items to process: {len(paginated_items)}")
        
        products = []
        for item in paginated_items:
            try:
                # Extract product name - try different selectors
                name_elem = item.find('h3', class_='product-title') or \
                           item.find('h3', class_='title') or \
                           item.find('h3') or \
                           item.find('h2') or \
                           item.find('a', class_='title') or \
                           item.find('a', class_='product-title')
                name = name_elem.get_text(strip=True) if name_elem else "Unknown Product"
                
                # Extract image URL - try different selectors
                img_elem = item.find('img')
                img_src = ""
                if img_elem:
                    img_src = img_elem.get('src') or img_elem.get('data-src') or img_elem.get('data-original')
                    if img_src and not img_src.startswith('http'):
                        img_src = 'https://guitarstrings.com.ua' + img_src
                
                # Fallback на локальные изображения, если внешние недоступны
                if not img_src or img_src == "":
                    img_src = 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'
                
                # Extract price - try different selectors based on actual HTML structure
                price_elem = None
                new_price = 0
                old_price = 0
                
                # Ищем цены в правильной структуре HTML
                price_container = item.find('div', class_='vm3pr-2')
                if price_container:
                    # Ищем новую цену (акционную) - исправленная логика
                    sales_price_elem = price_container.find('span', class_='PricesalesPrice')
                    if sales_price_elem:
                        price_text = sales_price_elem.get_text(strip=True)
                        price_match = re.search(r'(\d+(?:\.\d+)?)', price_text.replace('грн', '').replace('₴', '').replace(' ', ''))
                        if price_match:
                            new_price = float(price_match.group(1))
                            print(f"Found sales price: {new_price} for product: {name}")
                    
                    # Ищем старую цену (зачеркнутую) - исправленная логика
                    # Сначала ищем span внутри div с классом PricebasePrice
                    base_price_div = price_container.find('div', class_='PricebasePrice')
                    if base_price_div:
                        base_price_elem = base_price_div.find('span', class_='PricebasePrice')
                        if base_price_elem:
                            price_text = base_price_elem.get_text(strip=True)
                            price_match = re.search(r'(\d+(?:\.\d+)?)', price_text.replace('грн', '').replace('₴', '').replace(' ', ''))
                            if price_match:
                                old_price = float(price_match.group(1))
                                print(f"Found base price: {old_price} for product: {name}")
                    
                    # Если не нашли в div, ищем span напрямую (fallback)
                    if old_price == 0:
                        base_price_elem = price_container.find('span', class_='PricebasePrice')
                        if base_price_elem:
                            price_text = base_price_elem.get_text(strip=True)
                            price_match = re.search(r'(\d+(?:\.\d+)?)', price_text.replace('грн', '').replace('₴', '').replace(' ', ''))
                            if price_match:
                                old_price = float(price_match.group(1))
                                print(f"Found base price (fallback): {old_price} for product: {name}")
                
                # Если не нашли цены в vm3pr-2, ищем в других местах
                if new_price == 0:
                    # Ищем любую цену
                    price_elem = item.find('span', class_='Price') or \
                                item.find('span', class_='price') or \
                                item.find('div', class_='price')
                    if price_elem:
                        price_text = price_elem.get_text(strip=True)
                        price_match = re.search(r'(\d+(?:\.\d+)?)', price_text.replace('грн', '').replace('₴', '').replace(' ', ''))
                        if price_match:
                            new_price = float(price_match.group(1))
                            print(f"Found fallback price: {new_price} for product: {name}")
                
                # Если все еще нет цены, устанавливаем дефолтную
                if new_price == 0:
                    new_price = 350
                    print(f"Using default price: {new_price} for product: {name}")
                
                # Extract availability status - исправленная логика
                availability = None
                status_found = False
                
                # Сначала проверяем текст статуса в div.availability - это приоритетный источник
                availability_elem = item.find('div', class_='availability')
                if availability_elem:
                    status_elem = availability_elem.find('span')
                    if status_elem:
                        status_text = status_elem.get_text(strip=True).lower()
                        print(f"Found status text: '{status_text}' for product: {name}")
                        
                        # Определяем статус по тексту - расширенная логика
                        if any(word in status_text for word in ['снят с производства', 'знятий з виробництва', 'discontinued', 'знято з виробництва']):
                            availability = "Снят с производства"
                            status_found = True
                            print(f"Set status to 'Снят с производства' for product: {name}")
                        elif any(word in status_text for word in ['доступно под заказ', 'под заказ', 'заказ', 'по заказу', 'під замовлення']):
                            availability = "Под заказ"
                            status_found = True
                            print(f"Set status to 'Под заказ' for product: {name}")
                        elif any(word in status_text for word in ['ожидается', 'скоро', 'предзаказ', 'очікується']):
                            availability = "Ожидается"
                            status_found = True
                            print(f"Set status to 'Ожидается' for product: {name}")
                        elif any(word in status_text for word in ['нет в наличии', 'отсутствует', 'недоступен', 'немає в наявності', 'немає']):
                            availability = "Нет в наличии"
                            status_found = True
                            print(f"Set status to 'Нет в наличии' for product: {name}")
                        elif any(word in status_text for word in ['в наличии', 'есть', 'доступен', 'в наявності', 'в одессе']):
                            # По новому правилу: "В наличии в Одессе" всегда отображается как "В наличии" (зеленый)
                            availability = "В наличии"
                            print(f"Set status to 'В наличии' for product: {name}")
                            status_found = True
                
                # Если статус не найден по тексту, проверяем иконку vm2-nostock
                if not status_found:
                    status_icon = item.find('span', class_='vmicon')
                    if status_icon:
                        icon_class = status_icon.get('class', [])
                        if 'vm2-nostock' in icon_class:
                            # Проверяем title атрибут иконки для более точного определения
                            icon_title = status_icon.get('title', '').lower()
                            print(f"Found vm2-nostock icon with title: '{icon_title}' for product: {name}")
                            
                            # ИСПРАВЛЕНИЕ: vm2-nostock иконка означает "Снят с производства"
                            availability = "Снят с производства"
                            print(f"Found 'Снят с производства' from vm2-nostock icon for product: {name}")
                            status_found = True
                
                # Если статус все еще не найден, ищем по ключевым словам в любом тексте элемента
                if not status_found:
                    print(f"Status not found with selectors for product: {name}, searching in all text...")
                    all_text = item.get_text().lower()
                    
                    # Проверяем наличие ключевых слов в любом тексте
                    if any(word in all_text for word in ['снят с производства', 'знятий з виробництва', 'discontinued', 'знято з виробництва']):
                        availability = "Снят с производства"
                        print(f"Found 'Снят с производства' in text for product: {name}")
                    elif any(word in all_text for word in ['нет в наличии', 'немає в наявності', 'немає']):
                        availability = "Нет в наличии"
                        print(f"Found 'Нет в наличии' in text for product: {name}")
                    elif any(word in all_text for word in ['ожидается', 'очікується']):
                        availability = "Ожидается"
                        print(f"Found 'Ожидается' in text for product: {name}")
                    elif any(word in all_text for word in ['под заказ', 'під замовлення']):
                        availability = "Под заказ"
                        print(f"Found 'Под заказ' in text for product: {name}")
                
                # Если статус не найден, устанавливаем "В наличии" по умолчанию
                if availability is None:
                    availability = "В наличии"
                    print(f"Status not found, using default: {availability} for product: {name}")
                
                print(f"Final availability for '{name}': {availability}")
                
                # Extract rating - исправленная логика с правильным округлением
                rating = None  # Убираем дефолтный рейтинг
                rating_found = False
                
                # Ищем рейтинг в рамках текущего товара
                rating_elem = item.find('span', class_='vrvote-count')
                if rating_elem:
                    rating_text = rating_elem.get_text(strip=True)
                    print(f"Found rating text: '{rating_text}' for product: {name}")
                    
                    # Извлекаем числовой рейтинг - улучшенная логика
                    # Ищем паттерн типа "4.3 - 10 голосов" или "5 - 1 голос"
                    rating_match = re.search(r'(\d+\.?\d*)\s*-\s*\d+\s*голос', rating_text)
                    if rating_match:
                        rating_value = float(rating_match.group(1))
                        if 0 <= rating_value <= 5:
                            # Правильное округление рейтингов до ближайших 0.5
                            if rating_value >= 4.75:
                                rating = "5.0"
                            elif rating_value >= 4.25:
                                rating = "4.5"
                            elif rating_value >= 3.75:
                                rating = "4.0"
                            elif rating_value >= 3.25:
                                rating = "3.5"
                            elif rating_value >= 2.75:
                                rating = "3.0"
                            elif rating_value >= 2.25:
                                rating = "2.5"
                            elif rating_value >= 1.75:
                                rating = "2.0"
                            elif rating_value >= 1.25:
                                rating = "1.5"
                            else:
                                rating = "1.0"
                            rating_found = True
                            print(f"Extracted and rounded rating: {rating} from {rating_value} for product: {name}")
                    
                    # Если не нашли по первому паттерну, ищем просто число
                    if not rating_found:
                        rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                        if rating_match:
                            rating_value = float(rating_match.group(1))
                            if 0 <= rating_value <= 5:
                                # Правильное округление рейтингов до ближайших 0.5
                                if rating_value >= 4.75:
                                    rating = "5.0"
                                elif rating_value >= 4.25:
                                    rating = "4.5"
                                elif rating_value >= 3.75:
                                    rating = "4.0"
                                elif rating_value >= 3.25:
                                    rating = "3.5"
                                elif rating_value >= 2.75:
                                    rating = "3.0"
                                elif rating_value >= 2.25:
                                    rating = "2.5"
                                elif rating_value >= 1.75:
                                    rating = "2.0"
                                elif rating_value >= 1.25:
                                    rating = "1.5"
                                else:
                                    rating = "1.0"
                                rating_found = True
                                print(f"Extracted and rounded rating: {rating} from {rating_value} for product: {name}")
                
                # Если рейтинг не найден, устанавливаем "Нет рейтинга"
                if not rating_found:
                    rating = "Нет рейтинга"
                    print(f"No rating found, setting to 'Нет рейтинга' for product: {name}")
                
                # Extract subtitle if available
                subtitle_elem = item.find('div', class_='subtitle') or \
                               item.find('span', class_='subtitle') or \
                               item.find('p', class_='subtitle')
                subtitle = subtitle_elem.get_text(strip=True) if subtitle_elem else ""
                
                product = {
                    'name': name,
                    'image': img_src,
                    'newPrice': f"{int(new_price)}",
                    'oldPrice': f"{int(old_price)}" if old_price > 0 else None,
                    'availability': availability,
                    'rating': rating,
                    'subtitle': subtitle,
                    'status': availability
                }
                
                products.append(product)
                
            except Exception as e:
                print(f"Error processing product item: {e}")
                continue
        
        # Determine if there are more products available
        # Check if we've reached the end of the total product list
        has_more = (start + limit) < len(product_items)
        
        print(f"Debug: total products available: {len(product_items)}")
        print(f"Debug: start: {start}, limit: {limit}")
        print(f"Debug: products returned: {len(products)}")
        print(f"Debug: hasMore calculation: start+limit={start+limit}, total_items={len(product_items)}, hasMore={has_more}")
        print(f"Debug: start + products = {start + len(products)}")
        print(f"Debug: total field in response: {len(product_items)}")
        print(f"Debug: hasMore field in response: {has_more}")
        
        return jsonify({
            'success': True,
            'products': products,
            'total': len(product_items),  # ИСПРАВЛЕНИЕ: Общее количество всех товаров, а не на текущей странице
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

if __name__ == '__main__':
    print("Starting server... (версия 13.18 - исправление парсинга навигационных элементов)")
    print("Pre-loading product cache...")
    try:
        # Pre-load cache on startup
        scrape_all_pages()
        print("Cache pre-loaded successfully!")
    except Exception as e:
        print(f"Warning: Could not pre-load cache: {e}")
    
    print("Starting Flask server on port 8000...")
    app.run(host='0.0.0.0', port=8000, debug=True)
