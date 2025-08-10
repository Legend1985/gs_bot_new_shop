let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#2cab37';

// Переменные для загрузки товаров
let currentPage = 0;
let isLoading = false;
let hasMoreProducts = true;
const productsPerPage = 60;
let maxProducts = 0;
let loadedProductNames = new Set();
let savedScrollPosition = 0;

// Функция загрузки товаров
async function loadProducts(page = 0) {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    const start = page * productsPerPage;
    
    try {
        const response = await fetch(`api.php?start=${start}&limit=${productsPerPage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.products && data.products.length > 0) {
                renderProducts(data.products);
                currentPage = page;
                
                if (!data.hasMore) {
                    hasMoreProducts = false;
                }
            } else {
                hasMoreProducts = false;
            }
        } else {
            console.error('Ошибка API:', data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    } finally {
        isLoading = false;
    }
}

// Функция отображения товаров
function renderProducts(products) {
    const container = document.querySelector('.inner');
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product, `btn${currentPage * productsPerPage + index + 1}`);
        container.appendChild(productCard);
    });
}

// Функция создания карточки товара
function createProductCard(product, btnId) {
    const card = document.createElement('div');
    card.className = 'item';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">
            <span class="old-price">${product.oldPrice}</span>
            <span class="new-price">${product.newPrice} грн</span>
        </p>
        <p class="availability">${product.availability}</p>
        <button id="${btnId}" class="buy-btn">Купить</button>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        tg.MainButton.text = `Выбрано: ${product.name}`;
        tg.MainButton.show();
    });
    
    return card;
}

// Функция загрузки дополнительных товаров при прокрутке
function handleScroll() {
    if (isLoading || !hasMoreProducts) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 100) {
        loadMoreProducts();
    }
}

// Добавляем обработчик прокрутки
window.addEventListener('scroll', handleScroll);

// Функция создания экрана загрузки
function createLoadingScreen() {
    const container = document.querySelector('.inner');
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    loadingScreen.innerHTML = `
        <div class="loading-spinner"></div>
        <h3>Загружаем товары...</h3>
        <p>Пожалуйста, подождите</p>
    `;
    container.appendChild(loadingScreen);
}

// Функция скрытия экрана загрузки
function hideLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.remove();
    }
}

// Функция показа индикатора загрузки
function showLoadingIndicator() {
    let indicator = document.getElementById('loading-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.innerHTML = `
            <div class="loading-spinner-small"></div>
            <p>Загружаем еще товары...</p>
        `;
        document.querySelector('.inner').appendChild(indicator);
    }
    indicator.style.display = 'block';
}

// Функция скрытия индикатора загрузки
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Функция показа сообщения о конце списка
function showEndMessage() {
    let endMessage = document.querySelector('.end-message');
    if (!endMessage) {
        endMessage = document.createElement('div');
        endMessage.className = 'end-message';
        endMessage.innerHTML = `
            <p>Все товары загружены</p>
        `;
        document.querySelector('.inner').appendChild(endMessage);
    }
    endMessage.style.display = 'block';
}

// Функция загрузки реальных товаров с сайта
async function loadRealProducts() {
    try {
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            // Ограничиваем отображение первыми 60 товарами
            const firstPageProducts = data.products.slice(0, 60);
            
            // Обновляем глобальные переменные
            maxProducts = data.products.length;
            hasMoreProducts = data.products.length > 60;
            
            // Сохраняем названия загруженных товаров
            firstPageProducts.forEach(product => {
                loadedProductNames.add(product.name);
            });
            
            // Очищаем контейнер и отображаем товары
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            
            firstPageProducts.forEach((product, index) => {
                const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
                container.appendChild(productCard);
            });
            
            // Скрываем экран загрузки
            hideLoadingScreen();
            
            // Сохраняем состояние
            saveState();
        } else {
            console.error('Не удалось загрузить товары');
            hideLoadingScreen();
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        hideLoadingScreen();
    }
}

// Функция создания карточки товара из данных сайта
function createProductCardFromSiteData(product, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Создаем HTML для карточки товара
    card.innerHTML = `
        <div class="product-card-top">
            <div class="img-container">
                <img src="${product.image}" alt="${product.name}" class="img">
            </div>
            <h3 class="product-title">${product.name}</h3>
            <div class="product-rating">
                ${generateRatingStars(product.rating)}
            </div>
        </div>
        <div class="product-card-bottom">
            <p class="product-status ${product.availability === 'В наличии' ? '' : 'out-of-stock'}">${product.availability}</p>
            <div class="product-bottom-row">
                <div class="product-prices">
                    ${product.oldPrice ? `<span class="old-price">${product.oldPrice} грн</span>` : ''}
                    <span class="new-price ${product.availability === 'Снят с производства' ? 'discontinued' : ''}">${product.newPrice} грн</span>
                </div>
                <button id="${btnId}" class="btn ${product.availability === 'Снят с производства' ? 'discontinued' : ''}">
                    ${product.availability === 'Снят с производства' ? 'Снят' : 'Купить'}
                </button>
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        tg.MainButton.text = `Выбрано: ${product.name}`;
        tg.MainButton.show();
    });
    
    return card;
}

// Функция генерации звездочек рейтинга
function generateRatingStars(rating) {
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
        stars += '<span class="star-half">☆</span>';
    }
    
    // Пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star-empty">☆</span>';
    }
    
    return stars;
}

// Функция загрузки дополнительных товаров при прокрутке
async function loadMoreProducts() {
    if (isLoading || !hasMoreProducts) return;
    
    console.log('Начинаем загрузку дополнительных товаров...');
    isLoading = true;
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    const nextPage = Math.floor(loadedProductNames.size / 60);
    
    try {
        const data = await fetchProductData(nextPage);
        
        if (data && data.products && data.products.length > 0) {
            // Фильтруем только новые товары
            const newProducts = data.products.filter(product => !loadedProductNames.has(product.name));
            
            if (newProducts.length > 0) {
                // Добавляем новые товары в контейнер
                const container = document.querySelector('.inner');
                
                newProducts.forEach((product, index) => {
                    const productCard = createProductCardFromSiteData(product, `btn${loadedProductNames.size + index + 1}`);
                    container.appendChild(productCard);
                    
                    // Добавляем название в множество загруженных
                    loadedProductNames.add(product.name);
                });
                
                // Обновляем состояние
                hasMoreProducts = loadedProductNames.size < maxProducts;
                saveState();
                
                console.log(`Загружено ${newProducts.length} новых товаров. Всего: ${loadedProductNames.size}`);
                
                // Скрываем индикатор загрузки
                hideLoadingIndicator();
                
                // Настраиваем обработчики для новых изображений
                setupImageHandlers();
            } else {
                hasMoreProducts = false;
                hideLoadingIndicator();
                showEndMessage();
            }
        } else {
            hasMoreProducts = false;
            hideLoadingIndicator();
            showEndMessage();
        }
    } catch (error) {
        console.error('Ошибка загрузки дополнительных товаров:', error);
        hideLoadingIndicator();
    } finally {
        isLoading = false;
    }
}

// Функция получения данных с сайта
async function fetchProductData(page = 0) {
    const start = page * 60;
    const targetUrl = `https://guitarstrings.com.ua/electro${page > 0 ? `?start=${start}` : ''}`;
    
    console.log(`Загружаем страницу ${page + 1}, URL: ${targetUrl}`);
    
    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Получен HTML размером: ${html.length} символов`);
        
        const result = parseSiteHTML(html);
        console.log(`Результат парсинга: ${result.products.length} товаров`);
        
        return result;
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        return null;
    }
}

// Функция парсинга HTML сайта
function parseSiteHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const products = [];
    
    // Попробуем разные селекторы для поиска товаров
    let productElements = doc.querySelectorAll('.product-item, .item, .product, [class*="product"], .catalog-item');
    
    // Если не нашли, попробуем более общие селекторы
    if (productElements.length === 0) {
        productElements = doc.querySelectorAll('[class*="item"], [class*="product"], [class*="catalog"], .goods-item, .product-box');
    }
    
    // Если все еще не нашли, попробуем найти по структуре
    if (productElements.length === 0) {
        // Ищем элементы, которые содержат изображение и название
        const allElements = doc.querySelectorAll('div, article, section');
        productElements = Array.from(allElements).filter(el => {
            const hasImage = el.querySelector('img');
            const hasName = el.querySelector('h1, h2, h3, h4, .title, .name, [class*="title"], [class*="name"]');
            return hasImage && hasName;
        });
    }
    
    console.log(`Найдено элементов товаров: ${productElements.length}`);
    console.log('HTML документа:', doc.documentElement.outerHTML.substring(0, 1000));
    
    productElements.forEach((element, index) => {
        try {
            // Ищем название товара в различных возможных местах
            const nameElement = element.querySelector('h1, h2, h3, h4, .product-title, .title, .item-title, .name, [class*="title"], [class*="name"]');
            const imageElement = element.querySelector('img');
            const priceElement = element.querySelector('.price, .product-price, .item-price, [class*="price"], .cost, .value');
            const availabilityElement = element.querySelector('.availability, .status, .stock, [class*="stock"], [class*="availability"], .presence');
            
            if (nameElement && imageElement) {
                const name = nameElement.textContent.trim();
                let image = imageElement.src;
                
                // Если изображение относительное, делаем абсолютным
                if (image && !image.startsWith('http')) {
                    image = 'https://guitarstrings.com.ua' + image;
                }
                
                const price = priceElement ? priceElement.textContent.trim() : 'Цена не указана';
                const availability = availabilityElement ? availabilityElement.textContent.trim() : 'В наличии';
                
                // Извлекаем числовую цену
                const priceMatch = price.match(/(\d+)/);
                const numericPrice = priceMatch ? priceMatch[1] : '0';
                
                // Определяем статус товара
                let status = 'В наличии';
                if (availability.toLowerCase().includes('нет') || availability.toLowerCase().includes('закончился')) {
                    status = 'Нет в наличии';
                } else if (availability.toLowerCase().includes('ожидается')) {
                    status = 'Ожидается';
                } else if (availability.toLowerCase().includes('под заказ')) {
                    status = 'Под заказ';
                } else if (availability.toLowerCase().includes('снят') || availability.toLowerCase().includes('производства')) {
                    status = 'Снят с производства';
                }
                
                products.push({
                    name: name,
                    image: image,
                    newPrice: numericPrice,
                    oldPrice: null,
                    availability: status,
                    rating: Math.random() * 5 // Случайный рейтинг для демонстрации
                });
                
                console.log(`Товар ${index + 1}: ${name} - ${numericPrice} грн - ${status}`);
            }
        } catch (error) {
            console.error('Ошибка парсинга товара:', error);
        }
    });
    
    console.log(`Всего обработано товаров: ${products.length}`);
    
    // Если товары не найдены, возвращаем тестовые данные
    if (products.length === 0) {
        console.log('Товары не найдены, возвращаем тестовые данные');
        return {
            success: true,
            products: [
                {
                    name: 'Ernie Ball 2221 Regular Slinky 10-46',
                    image: 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
                    newPrice: '350',
                    oldPrice: null,
                    availability: 'В наличии',
                    rating: 4.5
                },
                {
                    name: 'D\'Addario EXL110 Nickel Wound 10-46',
                    image: 'Goods/Electric_guitar_strings/2221/Ernie_Ball_2221_10-46_150.jpg',
                    newPrice: '390',
                    oldPrice: null,
                    availability: 'В наличии',
                    rating: 4.8
                }
            ],
            hasMore: false
        };
    }
    
    return {
        success: true,
        products: products,
        hasMore: products.length >= 60
    };
}

// Функция обновления цен товаров
async function updateProductPrices() {
    try {
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            // Обновляем цены существующих товаров
            const existingProducts = document.querySelectorAll('.product-card');
            
            existingProducts.forEach((card, index) => {
                if (data.products[index]) {
                    const priceElement = card.querySelector('.new-price');
                    if (priceElement) {
                        priceElement.textContent = data.products[index].newPrice;
                    }
                }
            });
            
            console.log('Цены товаров обновлены');
        }
    } catch (error) {
        console.error('Ошибка обновления цен:', error);
    }
}

// Функция сохранения состояния
function saveState() {
    const state = {
        currentPage: currentPage,
        loadedProductNames: Array.from(loadedProductNames),
        maxProducts: maxProducts,
        hasMoreProducts: hasMoreProducts,
        scrollPosition: window.pageYOffset || document.documentElement.scrollTop,
        timestamp: Date.now()
    };
    
    localStorage.setItem('gs_bot_state', JSON.stringify(state));
    console.log('Состояние сохранено:', state);
}

// Функция загрузки состояния
function loadState() {
    try {
        const savedState = localStorage.getItem('gs_bot_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Проверяем, не устарело ли состояние (24 часа)
            if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                return state;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния:', error);
    }
    return null;
}

// Функция восстановления всех товаров
async function restoreAllProducts() {
    const state = loadState();
    if (!state) {
        return false;
    }
    
    try {
        // Восстанавливаем переменные
        currentPage = state.currentPage;
        loadedProductNames = new Set(state.loadedProductNames);
        maxProducts = state.maxProducts;
        hasMoreProducts = state.hasMoreProducts;
        
        // Загружаем все страницы товаров
        const totalPages = Math.ceil(loadedProductNames.size / 60);
        const container = document.querySelector('.inner');
        container.innerHTML = '';
        
        for (let page = 0; page < totalPages; page++) {
            const data = await fetchProductData(page);
            if (data && data.products && data.products.length > 0) {
                data.products.forEach((product, index) => {
                    if (loadedProductNames.has(product.name)) {
                        const productCard = createProductCardFromSiteData(product, `btn${page * 60 + index + 1}`);
                        container.appendChild(productCard);
                    }
                });
            }
        }
        
        // Восстанавливаем позицию скролла
        if (state.scrollPosition > 0) {
            window.scrollTo(0, state.scrollPosition);
        }
        
        // Проверяем, есть ли еще товары для загрузки
        const totalLoadedProducts = loadedProductNames.size;
        const expectedProductsOnCurrentPages = Math.ceil(totalLoadedProducts / 60) * 60;
        hasMoreProducts = totalLoadedProducts < maxProducts && totalLoadedProducts >= expectedProductsOnCurrentPages;
        
        console.log(`Восстановлено ${totalLoadedProducts} товаров. Есть еще: ${hasMoreProducts}`);
        
        // Скрываем экран загрузки
        hideLoadingScreen();
        
        // Сбрасываем флаг загрузки
        isLoading = false;
        
        return true;
    } catch (error) {
        console.error('Ошибка восстановления товаров:', error);
        return false;
    }
}

// Функция загрузки первой страницы
async function loadFirstPage() {
    try {
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            // Ограничиваем отображение первыми 60 товарами
            const firstPageProducts = data.products.slice(0, 60);
            
            // Обновляем глобальные переменные
            maxProducts = data.products.length;
            hasMoreProducts = data.products.length > 60;
            
            // Сохраняем названия загруженных товаров
            firstPageProducts.forEach(product => {
                loadedProductNames.add(product.name);
            });
            
            // Очищаем контейнер и отображаем товары
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            
            firstPageProducts.forEach((product, index) => {
                const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
                container.appendChild(productCard);
            });
            
            // Скрываем экран загрузки
            hideLoadingScreen();
            
            // Сохраняем состояние
            saveState();
        } else {
            console.error('Не удалось загрузить товары');
            hideLoadingScreen();
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        hideLoadingScreen();
    }
}

// Функция очистки состояния
function clearState() {
    localStorage.removeItem('gs_bot_state');
    console.log('Состояние очищено');
}

// Функция автоматического сохранения
function startAutoSave() {
    setInterval(() => {
        if (loadedProductNames.size > 0) {
            saveState();
        }
    }, 30000); // Сохраняем каждые 30 секунд
}

// Функция настройки сохранения перед закрытием
function setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
        if (loadedProductNames.size > 0) {
            saveState();
        }
    });
}

// Функция сброса состояния
function resetState() {
    clearState();
    location.reload();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Показываем экран загрузки
    createLoadingScreen();
    
    // Небольшая задержка для отображения экрана загрузки
    setTimeout(async () => {
        // Пытаемся восстановить состояние
        const restored = await restoreAllProducts();
        
        if (!restored) {
            // Если восстановление не удалось, загружаем первую страницу
            await loadRealProducts();
        }
        
        // Запускаем автоматическое сохранение
        startAutoSave();
        
        // Настраиваем сохранение перед закрытием
        setupBeforeUnload();
    }, 100);
});

// Обработчики событий Telegram
tg.ready();

tg.MainButton.onClick(() => {
    tg.sendData("test");
});

// Настройка обработчиков изображений
function setupImageHandlers() {
    const images = document.querySelectorAll('.img');
    images.forEach(img => {
        img.addEventListener('load', () => {
            img.classList.add('loaded');
        });
        
        img.addEventListener('error', () => {
            img.style.display = 'none';
        });
    });
}

// Вызываем настройку обработчиков изображений после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    setupImageHandlers();
});








