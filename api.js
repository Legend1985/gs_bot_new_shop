// JavaScript API для парсинга данных с сайта
class ProductAPI {
    constructor() {
        this.baseUrl = 'https://guitarstrings.com.ua/electro';
        // Используем несколько CORS прокси для надежности
        this.corsProxies = [
            'https://cors-anywhere.herokuapp.com/',
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?'
        ];
        this.currentProxyIndex = 0;
    }

    async fetchProducts(start = 0, limit = 60) {
        try {
            console.log('Пробуем локальный PHP API...');
            const response = await fetch(`api.php?start=${start}&limit=${limit}`);
            if (response.ok) {
                const data = await response.json();
                console.log('PHP API ответ:', data);
                if (data.success && data.products && data.products.length > 0) {
                    return data;
                }
            }
        } catch (error) {
            console.log('PHP API недоступен:', error.message);
        }

        // Если PHP API не работает, используем CORS прокси
        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
                const proxy = this.corsProxies[proxyIndex];
                console.log(`Пробуем CORS прокси ${proxyIndex + 1}: ${proxy}`);
                
                const url = `${proxy}${this.baseUrl}?start=${start}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                
                if (response.ok) {
                    const html = await response.text();
                    console.log(`CORS прокси ${proxyIndex + 1} успешен, получено ${html.length} символов`);
                    this.currentProxyIndex = proxyIndex;
                    return this.parseProducts(html, start, limit);
                }
            } catch (error) {
                console.log(`CORS прокси ${i + 1} не работает:`, error.message);
            }
        }

        // Если все прокси не работают, используем моковые данные
        console.log('Все API недоступны, используем моковые данные');
        return this.getMockProducts(start, limit);
    }

    parseProducts(html, start, limit) {
        const products = [];
        
        // Создаем DOM парсер
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Ищем карточки товаров - используем несколько селекторов
        const productNodes = doc.querySelectorAll('.product, .vm-col, .browseProductContainer, .product-item, [class*="product"]');
        
        console.log(`Найдено ${productNodes.length} товарных блоков`);
        
        if (productNodes.length === 0) {
            console.log('Товары не найдены, используем моковые данные');
            return this.getMockProducts(start, limit);
        }
        
        productNodes.forEach((node, index) => {
            if (index >= limit) return;
            
            try {
                const product = this.parseProductNode(node);
                if (product.name) {
                    products.push(product);
                    console.log(`Парсинг товара ${index + 1}:`, product);
                }
            } catch (error) {
                console.error('Ошибка парсинга товара:', error);
            }
        });
        
        if (products.length === 0) {
            console.log('Не удалось распарсить товары, используем моковые данные');
            return this.getMockProducts(start, limit);
        }
        
        return {
            success: true,
            products: products,
            total: products.length,
            start: start,
            limit: limit,
            hasMore: products.length === limit,
            totalProducts: 377
        };
    }

    parseProductNode(node) {
        const product = {};
        
        console.log('Парсинг узла товара:', node.outerHTML.substring(0, 200) + '...');
        
        // Название товара - пробуем разные селекторы
        const titleSelectors = [
            'h2 a', 'h3 a', '.product-title a', '.product-name a', 
            'a[title]', '.title a', '[class*="title"] a'
        ];
        
        for (const selector of titleSelectors) {
            const titleElement = node.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
                product.name = titleElement.textContent.trim();
                console.log('Найдено название:', product.name);
                break;
            }
        }
        
        // Изображение - пробуем разные селекторы
        const imgSelectors = [
            'img[src*="product"]', 'img[src*="resized"]', 'img[src*="goods"]',
            'img[src*="Ernie"]', 'img[src*="string"]', 'img'
        ];
        
        for (const selector of imgSelectors) {
            const imgElement = node.querySelector(selector);
            if (imgElement) {
                let imgSrc = imgElement.getAttribute('src');
                if (imgSrc) {
                    if (!imgSrc.startsWith('http')) {
                        imgSrc = 'https://guitarstrings.com.ua' + imgSrc;
                    }
                    product.image = imgSrc;
                    console.log('Найдено изображение:', product.image);
                    break;
                }
            }
        }
        
        // Цены - ищем все элементы с ценами
        const priceElements = node.querySelectorAll('[class*="Price"], [class*="price"], [class*="cost"]');
        const prices = [];
        
        console.log('Найдено элементов с ценами:', priceElements.length);
        
        priceElements.forEach(el => {
            const text = el.textContent.trim();
            console.log('Текст элемента с ценой:', text);
            const match = text.match(/(\d+)\s*грн/);
            if (match) {
                const price = parseInt(match[1]);
                prices.push(price);
                console.log('Извлечена цена:', price);
            }
        });
        
        if (prices.length >= 2) {
            prices.sort((a, b) => b - a);
            product.oldPrice = prices[0].toString();
            product.newPrice = prices[1];
            console.log('Установлены цены - старая:', product.oldPrice, 'новая:', product.newPrice);
        } else if (prices.length === 1) {
            product.newPrice = prices[0];
            product.oldPrice = (prices[0] + 50).toString();
            console.log('Установлена одна цена - новая:', product.newPrice, 'старая (вычислена):', product.oldPrice);
        } else {
            console.log('Цены не найдены, используем значения по умолчанию');
            product.oldPrice = '450';
            product.newPrice = 380;
        }
        
        // Наличие - пробуем разные селекторы
        const availabilitySelectors = [
            '[class*="stock"]', '[class*="availability"]', '[class*="status"]',
            '.product-status', '.availability', '.stock'
        ];
        
        let availabilityFound = false;
        for (const selector of availabilitySelectors) {
            const availabilityElement = node.querySelector(selector);
            if (availabilityElement) {
                const text = availabilityElement.textContent.trim().toLowerCase();
                console.log('Найден элемент доступности:', text);
                if (text.includes('наличи') || text.includes('есть') || text.includes('доступен')) {
                    product.inStock = true;
                    product.availability = 'В наличии';
                    availabilityFound = true;
                    console.log('Товар в наличии');
                    break;
                } else if (text.includes('ожидается') || text.includes('нет') || text.includes('заказ')) {
                    product.inStock = false;
                    product.availability = text.includes('ожидается') ? 'Ожидается' : 'Нет в наличии';
                    availabilityFound = true;
                    console.log('Товар не в наличии:', product.availability);
                    break;
                }
            }
        }
        
        if (!availabilityFound) {
            product.inStock = true;
            product.availability = 'В наличии';
            console.log('Статус доступности не найден, устанавливаем "В наличии"');
        }
        
        console.log('Итоговый товар:', product);
        return product;
    }

    getMockProducts(start, limit) {
        const products = [];
        const productNames = [
            'Ernie Ball 2221 Regular Slinky 10-46',
            'Rotosound R13 Roto Greys 13-54',
            'Dunlop DEN1046 Nickel Wound Light 10-46',
            'GHS Boomers GBTM 11-50 Medium',
            'Fender 250M Nickel-Plated Steel 11-49 Medium',
            'D\'Addario EXL110 Nickel Wound 10-46',
            'Elixir 12002 Nanoweb Electric 10-46',
            'DR Strings DDT-10 Nickel Plated 10-46'
        ];
        
        const productImages = [
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg'
        ];
        
        const statuses = [
            'В наличии',
            'Нет в наличии',
            'Ожидается',
            'В наличии',
            'Нет в наличии',
            'В наличии',
            'Ожидается',
            'Снят с производства'
        ];
        
        // Фиксированные цены для каждого товара
        const productPrices = [
            { old: '450', new: 380 },
            { old: '520', new: 420 },
            { old: '480', new: 400 },
            { old: '550', new: 450 },
            { old: '500', new: 420 },
            { old: '470', new: 390 },
            { old: '600', new: 480 },
            { old: '530', new: 440 }
        ];
        
        for (let i = 0; i < limit && (start + i) < 377; i++) {
            const productIndex = (start + i) % productNames.length;
            const imageIndex = (start + i) % productImages.length;
            const statusIndex = (start + i) % statuses.length;
            const priceIndex = (start + i) % productPrices.length;
            
            const status = statuses[statusIndex];
            const isInStock = status === 'В наличии';
            const prices = productPrices[priceIndex];
            
            products.push({
                id: start + i + 1,
                name: productNames[productIndex],
                oldPrice: prices.old,
                newPrice: prices.new,
                image: productImages[imageIndex],
                inStock: isInStock,
                availability: status,
                rating: 4 + Math.random() // Рейтинг от 4 до 5
            });
        }
        
        return {
            success: true,
            products: products,
            totalProducts: 377,
            hasMore: (start + limit) < 377
        };
    }
}

// Экспортируем для использования
window.ProductAPI = ProductAPI; 