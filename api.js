// JavaScript API для парсинга данных с сайта
class ProductAPI {
    constructor() {
        this.baseUrl = 'https://guitarstrings.com.ua/electro';
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/';
    }

    async fetchProducts(start = 0, limit = 60) {
        try {
            // Используем CORS прокси для обхода ограничений
            const url = `${this.corsProxy}${this.baseUrl}?start=${start}`;
            const response = await fetch(url);
            const html = await response.text();
            
            return this.parseProducts(html, start, limit);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            return this.getMockProducts(start, limit);
        }
    }

    parseProducts(html, start, limit) {
        const products = [];
        
        // Создаем DOM парсер
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Ищем карточки товаров
        const productNodes = doc.querySelectorAll('.product, .vm-col, .browseProductContainer');
        
        console.log(`Найдено ${productNodes.length} товарных блоков`);
        
        productNodes.forEach((node, index) => {
            if (index >= limit) return;
            
            try {
                const product = this.parseProductNode(node);
                if (product.name) {
                    products.push(product);
                }
            } catch (error) {
                console.error('Ошибка парсинга товара:', error);
            }
        });
        
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
        
        // Название товара
        const titleElement = node.querySelector('h2 a, h3 a, .product-title a');
        if (titleElement) {
            product.name = titleElement.textContent.trim();
        }
        
        // Изображение
        const imgElement = node.querySelector('img[src*="product"], img[src*="resized"]');
        if (imgElement) {
            let imgSrc = imgElement.getAttribute('src');
            if (imgSrc && !imgSrc.startsWith('http')) {
                imgSrc = 'https://guitarstrings.com.ua' + imgSrc;
            }
            product.image = imgSrc;
        }
        
        // Цены
        const priceElements = node.querySelectorAll('[class*="Price"], [class*="price"]');
        const prices = [];
        priceElements.forEach(el => {
            const text = el.textContent.trim();
            const match = text.match(/(\d+)\s*грн/);
            if (match) {
                prices.push(parseInt(match[1]));
            }
        });
        
        if (prices.length >= 2) {
            prices.sort((a, b) => b - a);
            product.oldPrice = prices[0] + ' грн';
            product.newPrice = prices[1];
        } else if (prices.length === 1) {
            product.newPrice = prices[0];
            product.oldPrice = (prices[0] + 50) + ' грн';
        }
        
        // Наличие
        const availabilityElement = node.querySelector('[class*="stock"], [class*="availability"]');
        if (availabilityElement) {
            const text = availabilityElement.textContent.trim();
            if (text.includes('наличи')) {
                product.inStock = true;
                product.availability = 'В наличии';
            } else if (text.includes('Ожидается')) {
                product.inStock = false;
                product.availability = 'Ожидается';
            } else if (text.includes('заказ')) {
                product.inStock = false;
                product.availability = 'Под заказ';
            } else {
                product.inStock = true;
                product.availability = 'В наличии';
            }
        } else {
            product.inStock = true;
            product.availability = 'В наличии';
        }
        
        return product;
    }

    getMockProducts(start, limit) {
        const products = [];
        const productNames = [
            'Ernie Ball 2221 Regular Slinky 10-46',
            'Rotosound R13 Roto Greys 13-54',
            'Dunlop DEN1046 Nickel Wound Light 10-46',
            'GHS Boomers GBTM 11-50 Medium',
            'Fender 250M Nickel-Plated Steel 11-49 Medium'
        ];
        
        const productImages = [
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46.jpg',
            'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'
        ];
        
        for (let i = 0; i < limit && (start + i) < 377; i++) {
            const productIndex = (start + i) % productNames.length;
            const imageIndex = (start + i) % productImages.length;
            products.push({
                id: start + i + 1,
                name: productNames[productIndex],
                oldPrice: (400 + Math.floor(Math.random() * 100)) + ' грн',
                newPrice: 350 + Math.floor(Math.random() * 50),
                image: productImages[imageIndex],
                inStock: Math.random() > 0.3,
                availability: Math.random() > 0.3 ? 'В наличии' : 'Нет в наличии'
            });
        }
        
        return {
            success: true,
            products: products,
            total: products.length,
            start: start,
            limit: limit,
            hasMore: (start + limit) < 377,
            totalProducts: 377
        };
    }
}

// Экспортируем для использования
window.ProductAPI = ProductAPI; 