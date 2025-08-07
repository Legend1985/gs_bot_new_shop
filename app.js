let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

let item = "";

let btn1 = document.getElementById("btn1");
let btn2 = document.getElementById("btn2");
let btn3 = document.getElementById("btn3");
let btn4 = document.getElementById("btn4");
let btn5 = document.getElementById("btn5");
let btn6 = document.getElementById("btn6");

// Переменные для бесконечной прокрутки
let currentPage = 0;
let isLoading = false;
let hasMoreProducts = true;
const productsPerPage = 60;
const maxProducts = 377;

// Функция загрузки товаров с сайта
async function loadProducts(page = 0) {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    const start = page * productsPerPage;
    
    try {
        // API запрос к серверу для получения товаров
        const response = await fetch(`api.php?start=${start}&limit=${productsPerPage}`);
        const data = await response.json();
        
        if (data.success) {
            if (data.products.length === 0 || !data.hasMore) {
                hasMoreProducts = false;
            }
            
            renderProducts(data.products);
            currentPage = page;
        } else {
            console.error('Ошибка API:', data.error);
            // Если API недоступен, используем моковые данные
            const products = generateMockProducts(start, productsPerPage);
            renderProducts(products);
            currentPage = page;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        // При ошибке используем моковые данные
        const products = generateMockProducts(start, productsPerPage);
        renderProducts(products);
        currentPage = page;
    } finally {
        isLoading = false;
    }
}

// Генерация моковых товаров для демонстрации
function generateMockProducts(start, limit) {
    const products = [];
    const productNames = [
        'Ernie Ball 2221 Regular Slinky 10-46',
        'Rotosound R13 Roto Greys 13-54',
        'Dunlop DEN1046 Nickel Wound Light 10-46',
        'GHS Boomers GBTM 11-50 Medium',
        'Fender 250M Nickel-Plated Steel 11-49 Medium'
    ];
    
    for (let i = 0; i < limit && (start + i) < maxProducts; i++) {
        const productIndex = (start + i) % productNames.length;
        products.push({
            id: start + i + 1,
            name: productNames[productIndex],
            oldPrice: 400 + Math.floor(Math.random() * 100),
            newPrice: 350 + Math.floor(Math.random() * 50),
            image: 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
            inStock: true
        });
    }
    
    return products;
}

// Функция рендеринга товаров
function renderProducts(products) {
    const container = document.querySelector('.inner');
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product, currentPage * productsPerPage + index + 1);
        container.appendChild(productCard);
    });
}

// Создание карточки товара
function createProductCard(product, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Проверяем наличие изображения
    const imageSrc = product.image || 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg';
    
    // Проверяем наличие цен
    const oldPrice = product.oldPrice || 400;
    const newPrice = product.newPrice || 350;
    
    // Статус товара
    const status = product.inStock ? 'В наличии' : 'Нет в наличии';
    const statusClass = product.inStock ? 'product-status' : 'product-status out-of-stock';
    
    card.innerHTML = `
        <img src="${imageSrc}" alt="${product.name}" class="img">
        <div class="product-title" style="text-align:center;">${product.name}</div>
        <div class="${statusClass}">${status}</div>
        <div class="product-bottom-row">
            <div class="product-prices">
                <div class="old-price">${oldPrice} грн</div>
                <div class="new-price">${newPrice} грн</div>
            </div>
            <button class="btn" id="btn${btnId}">Купить</button>
        </div>
    `;
    
    // Добавляем обработчик для кнопки
    const btn = card.querySelector(`#btn${btnId}`);
    btn.addEventListener("click", function(){
        if (tg.MainButton.isVisible) {
            tg.MainButton.hide();
        }
        else {
            tg.MainButton.setText(`Вы выбрали товар ${btnId}!`);
            item = btnId.toString();
            tg.MainButton.show();
        }
    });
    
    return card;
}

// Обработчик прокрутки для бесконечной загрузки
function handleScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        if (!isLoading && hasMoreProducts) {
            loadProducts(currentPage + 1);
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем первую страницу товаров
    loadProducts(0);
    
    // Добавляем обработчик прокрутки
    window.addEventListener('scroll', handleScroll);
});

Telegram.WebApp.onEvent("mainButtonClicked", function(){
	tg.sendData(item);
});

let usercard = document.getElementById("usercard");

let p = document.createElement("p");

p.innerText = `${tg.initDataUnsafe.user.first_name}
${tg.initDataUnsafe.user.last_name}`;

usercard.appendChild(p);


// Функция для автоматического обновления цен товаров
async function updateProductPrices() {
    try {
        console.log('Начинаем обновление цен...');
        
        // 1. Получение данных с сайта
        const siteData = await fetchProductData();
        console.log('Данные с сайта получены:', siteData);
        
        // 2. Парсинг текущего HTML
        const currentData = parseCurrentHTML();
        console.log('Текущие данные:', currentData);
        
        // 3. Сравнение и обновление
        const updatedData = compareAndUpdate(siteData, currentData);
        
        // 4. Применение изменений к DOM
        applyUpdatesToDOM(updatedData);
        
        console.log('Цены успешно обновлены!');
        
    } catch (error) {
        console.error('Ошибка обновления цен:', error);
    }
}

// Получение данных с сайта guitarstrings.com.ua
async function fetchProductData() {
    try {
        // Используем прокси для обхода CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = 'https://guitarstrings.com.ua/electro';
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        return parseSiteHTML(html);
        
    } catch (error) {
        console.error('Ошибка получения данных с сайта:', error);
        throw error;
    }
}

// Парсинг HTML с сайта
function parseSiteHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const products = [];
    
    // Находим все карточки товаров
    const productCards = doc.querySelectorAll('.product.vm-col');
    
    productCards.forEach((card, index) => {
        try {
            // Извлечение названия товара
            const titleElement = card.querySelector('h2 a');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Извлечение изображения
            const imgElement = card.querySelector('.browseProductImage');
            const imageSrc = imgElement ? imgElement.src : '';
            const fullImageUrl = imageSrc.startsWith('http') ? imageSrc : `https://guitarstrings.com.ua${imageSrc}`;
            
            // Извлечение статуса наличия
            const availabilityElement = card.querySelector('.availability span');
            const availability = availabilityElement ? availabilityElement.textContent.trim() : 'В наличии';
            
            // Извлечение цен
            const oldPriceElement = card.querySelector('.PricebasePrice');
            const newPriceElement = card.querySelector('.PricesalesPrice');
            
            const oldPrice = oldPriceElement ? oldPriceElement.textContent.trim() : '';
            const newPrice = newPriceElement ? newPriceElement.textContent.trim() : '';
            
            if (title) {
                products.push({
                    index: index,
                    title: title,
                    imageSrc: fullImageUrl,
                    availability: availability,
                    oldPrice: oldPrice,
                    newPrice: newPrice
                });
            }
            
        } catch (error) {
            console.error(`Ошибка парсинга товара ${index}:`, error);
        }
    });
    
    return products;
}

// Парсинг текущего HTML
function parseCurrentHTML() {
    const products = [];
    
    // Находим все карточки товаров в текущем DOM
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach((card, index) => {
        const titleElement = card.querySelector('.product-title');
        const imgElement = card.querySelector('.img');
        const statusElement = card.querySelector('.product-status');
        const oldPriceElement = card.querySelector('.old-price');
        const newPriceElement = card.querySelector('.new-price');
        
        products.push({
            index: index,
            title: titleElement ? titleElement.textContent.trim() : '',
            imageSrc: imgElement ? imgElement.src : '',
            availability: statusElement ? statusElement.textContent.trim() : '',
            oldPrice: oldPriceElement ? oldPriceElement.textContent.trim() : '',
            newPrice: newPriceElement ? newPriceElement.textContent.trim() : ''
        });
    });
    
    return products;
}

// Сравнение и обновление данных
function compareAndUpdate(siteData, currentData) {
    const updates = [];
    
    siteData.forEach((siteProduct, index) => {
        if (index < currentData.length) {
            const currentProduct = currentData[index];
            
            // Проверяем, нужно ли обновлять товар
            const needsUpdate = 
                siteProduct.title !== currentProduct.title ||
                siteProduct.oldPrice !== currentProduct.oldPrice ||
                siteProduct.newPrice !== currentProduct.newPrice ||
                siteProduct.availability !== currentProduct.availability ||
                siteProduct.imageSrc !== currentProduct.imageSrc;
            
            if (needsUpdate) {
                updates.push({
                    index: index,
                    siteData: siteProduct,
                    currentData: currentProduct
                });
            }
        }
    });
    
    return updates;
}

// Применение обновлений к DOM
function applyUpdatesToDOM(updates) {
    updates.forEach(update => {
        const cardIndex = update.index;
        const productCard = document.querySelectorAll('.product-card')[cardIndex];
        
        if (productCard) {
            const siteData = update.siteData;
            
            // Обновление изображения
            const imgElement = productCard.querySelector('.img');
            if (imgElement && siteData.imageSrc) {
                imgElement.src = siteData.imageSrc;
                imgElement.alt = siteData.title;
            }
            
            // Обновление названия
            const titleElement = productCard.querySelector('.product-title');
            if (titleElement && siteData.title) {
                titleElement.textContent = siteData.title;
            }
            
            // Обновление статуса
            const statusElement = productCard.querySelector('.product-status');
            if (statusElement && siteData.availability) {
                statusElement.textContent = siteData.availability;
            }
            
            // Обновление цен
            const oldPriceElement = productCard.querySelector('.old-price');
            const newPriceElement = productCard.querySelector('.new-price');
            
            if (oldPriceElement && siteData.oldPrice) {
                oldPriceElement.textContent = siteData.oldPrice;
            }
            
            if (newPriceElement && siteData.newPrice) {
                newPriceElement.textContent = siteData.newPrice;
            }
            
            console.log(`Обновлена карточка товара ${cardIndex + 1}: ${siteData.title}`);
        }
    });
}

// Функция для ручного запуска обновления
function manualUpdate() {
    console.log('Запуск ручного обновления цен...');
    updateProductPrices();
}

// Автоматическое обновление каждые 30 минут
function startAutoUpdate() {
    console.log('Запуск автоматического обновления цен...');
    updateProductPrices();
    
    // Обновление каждые 30 минут
    setInterval(updateProductPrices, 30 * 60 * 1000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Система обновления цен инициализирована');
    
    // Автоматическое обновление при загрузке страницы
    updateProductPrices();
});

// Экспорт функций для использования в консоли
window.updateProductPrices = updateProductPrices;
window.manualUpdate = manualUpdate;
window.startAutoUpdate = startAutoUpdate;








