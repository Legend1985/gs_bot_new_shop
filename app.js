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
let maxProducts = 377; // Будет обновляться из API
let loadedProductNames = new Set(); // Для отслеживания уже загруженных товаров
let savedScrollPosition = 0; // Сохраненная позиция прокрутки

// Функция для загрузки товаров
async function loadProducts(page = 0) {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        const response = await fetch(`api.php?start=${page * productsPerPage}&limit=${productsPerPage}`);
        const data = await response.json();
        
        if (data.success && data.products) {
            // Фильтруем дубликаты
            const newProducts = data.products.filter(product => {
                const productName = product.name || product.title;
                if (!loadedProductNames.has(productName)) {
                    loadedProductNames.add(productName);
                    return true;
                }
                return false;
            });
            
            if (newProducts.length > 0) {
                renderProducts(newProducts);
                currentPage = page;
                hasMoreProducts = data.hasMore;
            }
        } else {
            console.error('Ошибка загрузки товаров:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

// Функция для генерации моковых товаров (если API недоступен)
function generateMockProducts(start, limit) {
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
    
    for (let i = 0; i < limit && (start + i) < maxProducts; i++) {
        const productIndex = (start + i) % productNames.length;
        const imageIndex = (start + i) % productImages.length;
        const isInStock = Math.random() > 0.3;
        
        products.push({
            id: start + i + 1,
            name: productNames[productIndex],
            oldPrice: (450 + Math.random() * 100).toFixed(0),
            newPrice: 380 + Math.floor(Math.random() * 100),
            image: productImages[imageIndex],
            inStock: isInStock,
            availability: isInStock ? 'В наличии' : 'Нет в наличии',
            rating: 4 + Math.random()
        });
    }
    return products;
}

// Функция для отображения товаров
function renderProducts(products) {
    const container = document.querySelector('.inner');
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product, index + 1);
        container.appendChild(productCard);
    });
}

// Функция для создания карточки товара
function createProductCard(product, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const productName = product.name || product.title;
    const oldPrice = product.oldPrice || '450';
    const newPrice = product.newPrice || 380;
    const availability = product.availability || 'В наличии';
    const inStock = product.inStock !== undefined ? product.inStock : true;
    const rating = product.rating || 4.5;
    
    // Определяем классы для статуса
    let statusClass = 'in-stock';
    let buttonClass = 'buy-btn';
    let buttonText = 'Купить';
    
    if (availability.includes('Нет в наличии')) {
        statusClass = 'out-of-stock';
        buttonClass = 'out-of-stock-btn';
        buttonText = 'Нет в наличии';
    } else if (availability.includes('Ожидается')) {
        statusClass = 'expected';
        buttonClass = 'expected-btn';
        buttonText = 'Ожидается';
    } else if (availability.includes('производства') || availability.includes('снят')) {
        statusClass = 'discontinued';
        buttonClass = 'discontinued-btn';
        buttonText = 'Снят с производства';
    }
    
    // Форматируем цены
    const oldPriceFormatted = oldPrice.toString().replace(' грн', '');
    const newPriceClass = newPrice < parseInt(oldPriceFormatted) ? 'new-price' : 'price';
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${productName}" onerror="this.src='Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg'">
        </div>
        <div class="product-info">
            <h3 class="product-title">${productName}</h3>
            <div class="product-rating">
                ${createRatingStars(rating)}
            </div>
            <div class="product-status ${statusClass}">${availability}</div>
            <div class="product-prices">
                <div class="old-price">${oldPriceFormatted} грн</div>
                <div class="${newPriceClass}">${newPrice} грн</div>
            </div>
            <button class="${buttonClass}" onclick="handleBuyClick(${btnId})">${buttonText}</button>
        </div>
    `;
    
    return card;
}

// Функция для создания звездочек рейтинга
function createRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Полные звезды
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star-filled">★</span>';
    }
    
    // Половина звезды
    if (hasHalfStar) {
        stars += '<span class="star-half">★</span>';
    }
    
    // Пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star-empty">☆</span>';
    }
    
    return stars;
}

// Обработчик прокрутки для бесконечной загрузки
function handleScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        if (!isLoading && hasMoreProducts) {
            loadMoreProducts();
        }
    }
}

// Функция для загрузки дополнительных товаров
async function loadMoreProducts() {
    if (isLoading || !hasMoreProducts) return;
    
    const nextPage = currentPage + 1;
    await loadProducts(nextPage);
}

// Функция для показа индикатора загрузки
function showLoadingIndicator() {
    let loadingDiv = document.getElementById('loading');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Загрузка товаров...</p>
        `;
        document.body.appendChild(loadingDiv);
    }
    loadingDiv.style.display = 'block';
}

// Функция для скрытия индикатора загрузки
function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

// Функция для показа сообщения о конце списка
function showEndMessage() {
    const container = document.querySelector('.inner');
    const endMessage = document.createElement('div');
    endMessage.className = 'end-message';
    endMessage.innerHTML = '<p>Все товары загружены</p>';
    container.appendChild(endMessage);
}

// Функция для создания экрана загрузки
function createLoadingScreen() {
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>Загрузка товаров...</p>
        </div>
    `;
    document.body.appendChild(loadingScreen);
    
    // Удаляем экран загрузки через 2 секунды
    setTimeout(() => {
        if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
        }
    }, 2000);
}

// Функция для загрузки реальных товаров с сайта
async function loadRealProducts() {
    try {
        const response = await fetch('api.php?start=0&limit=60');
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            renderProducts(data.products);
            maxProducts = data.totalProducts || 377;
            hasMoreProducts = data.hasMore;
        } else {
            // Если API недоступен, используем моковые данные
            const mockProducts = generateMockProducts(0, 60);
            renderProducts(mockProducts);
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        // Используем моковые данные в случае ошибки
        const mockProducts = generateMockProducts(0, 60);
        renderProducts(mockProducts);
    }
}

// Функция для загрузки первой страницы
async function loadFirstPage() {
    try {
        const response = await fetch('api.php?start=0&limit=60');
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            // Очищаем контейнер
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            
            // Фильтруем дубликаты
            const newProducts = data.products.filter(product => {
                const productName = product.name || product.title;
                if (!loadedProductNames.has(productName)) {
                    loadedProductNames.add(productName);
                    return true;
                }
                return false;
            });
            
            renderProducts(newProducts);
            maxProducts = data.totalProducts || 377;
            hasMoreProducts = data.hasMore;
            currentPage = 0;
        } else {
            // Если API недоступен, используем моковые данные
            const mockProducts = generateMockProducts(0, 60);
            renderProducts(mockProducts);
        }
    } catch (error) {
        console.error('Ошибка загрузки первой страницы:', error);
        // Используем моковые данные в случае ошибки
        const mockProducts = generateMockProducts(0, 60);
        renderProducts(mockProducts);
    }
}

// Функция для восстановления всех товаров
async function restoreAllProducts() {
    try {
        const response = await fetch('api.php?start=0&limit=377');
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            // Очищаем контейнер и загруженные имена
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            loadedProductNames.clear();
            
            // Фильтруем дубликаты
            const newProducts = data.products.filter(product => {
                const productName = product.name || product.title;
                if (!loadedProductNames.has(productName)) {
                    loadedProductNames.add(productName);
                    return true;
                }
                return false;
            });
            
            renderProducts(newProducts);
            maxProducts = data.totalProducts || 377;
            hasMoreProducts = false; // Все товары загружены
            currentPage = 0;
        } else {
            // Если API недоступен, используем моковые данные
            const mockProducts = generateMockProducts(0, 377);
            renderProducts(mockProducts);
        }
    } catch (error) {
        console.error('Ошибка восстановления товаров:', error);
        // Используем моковые данные в случае ошибки
        const mockProducts = generateMockProducts(0, 377);
        renderProducts(mockProducts);
    }
}

// Функция для обработки клика по кнопке покупки
function handleBuyClick(productId) {
    console.log(`Клик по товару с ID: ${productId}`);
    // Здесь можно добавить логику для обработки покупки
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем первую страницу товаров
    loadFirstPage();
    
    // Добавляем обработчик прокрутки
    window.addEventListener('scroll', handleScroll);
    
    // Создаем экран загрузки
    createLoadingScreen();
});








