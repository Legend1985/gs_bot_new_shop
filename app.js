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

// Функция показа индикатора загрузки для бесконечной прокрутки
function showLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'block';
        console.log('Показан индикатор загрузки для бесконечной прокрутки');
    } else {
        console.warn('Индикатор загрузки не найден');
    }
}

// Функция скрытия индикатора загрузки для бесконечной прокрутки
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
        console.log('Скрыт индикатор загрузки для бесконечной прокрутки');
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
        console.log('Начинаем загрузку товаров...');
        
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            console.log(`Загружено ${data.products.length} товаров`);
            
            // Ограничиваем отображение первыми 60 товарами
            const firstPageProducts = data.products.slice(0, 60);
            
            // Обновляем глобальные переменные
            maxProducts = data.total || data.products.length;
            hasMoreProducts = data.products.length === 60 && maxProducts > 60;
            
            console.log(`Максимум товаров: ${maxProducts}, есть еще: ${hasMoreProducts}`);
            
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
            
            // Настраиваем обработчики для изображений
            setupImageHandlers();
            
            console.log('Товары успешно загружены и отображены');
        } else {
            console.error('Не удалось загрузить товары - нет данных');
            hideLoadingScreen();
            // Показываем сообщение об ошибке
            const container = document.querySelector('.inner');
            container.innerHTML = `
                <div class="error-message">
                    <p>Не удалось загрузить товары. Попробуйте обновить страницу.</p>
                    <button onclick="location.reload()" class="btn">Обновить страницу</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        hideLoadingScreen();
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        container.innerHTML = `
            <div class="error-message">
                <p>Ошибка загрузки товаров: ${error.message}</p>
                <button onclick="location.reload()" class="btn">Обновить страницу</button>
            </div>
        `;
    }
}

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
                
                // Устанавливаем максимальное количество товаров
                if (data.total) {
                    maxProducts = data.total;
                }
                
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
        const productCard = createProductCardFromSiteData(product, `btn${loadedProductNames.size + index + 1}`);
        container.appendChild(productCard);
        
        // Добавляем название в множество загруженных
        loadedProductNames.add(product.name);
    });
    
    // Настраиваем обработчики для новых изображений
    setupImageHandlers();
    
    console.log(`Отображено ${products.length} товаров. Всего загружено: ${loadedProductNames.size}`);
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

// Функция создания карточки товара из данных сайта
function createProductCardFromSiteData(product, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Определяем CSS класс для статуса
    let statusClass = '';
    if (product.availability === 'Нет в наличии') {
        statusClass = 'out-of-stock';
    } else if (product.availability === 'Ожидается') {
        statusClass = 'expected';
    } else if (product.availability === 'Под заказ') {
        statusClass = 'on-order';
    } else if (product.availability === 'Снят с производства') {
        statusClass = 'discontinued';
    }
    
    // Определяем CSS класс для цены
    let priceClass = '';
    if (product.availability === 'Нет в наличии' || product.availability === 'Ожидается') {
        priceClass = 'out-of-stock';
    } else if (product.availability === 'Под заказ') {
        priceClass = 'on-order';
    } else if (product.availability === 'Снят с производства') {
        priceClass = 'discontinued';
    }
    
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
            <p class="product-status ${statusClass}">${product.availability}</p>
            <div class="product-bottom-row">
                <div class="product-prices">
                    ${product.oldPrice && product.oldPrice !== '0' ? `<span class="old-price">${product.oldPrice} грн</span>` : ''}
                    <span class="new-price ${priceClass}">${product.newPrice}</span>
                </div>
                <button id="${btnId}" class="btn ${statusClass}">
                    ${product.availability === 'Нет в наличии' ? 'Нет в наличии' : 
                      product.availability === 'Ожидается' ? 'Ожидается' :
                      product.availability === 'Под заказ' ? 'Под заказ' : 
                      product.availability === 'Снят с производства' ? 'Снят с производства' : 'Купить'}
                </button>
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        if (product.availability === 'Снят с производства') {
            showDiscontinuedPopup();
        } else if (product.availability === 'Нет в наличии') {
            showOutOfStockPopup();
        } else {
            tg.MainButton.text = `Выбрано: ${product.name}`;
            tg.MainButton.show();
        }
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
    
    try {
        const nextPage = currentPage + 1;
        const start = nextPage * productsPerPage;
        
        console.log(`Загружаем страницу ${nextPage}, начиная с ${start}`);
        
        const response = await fetch(`api.php?start=${start}&limit=${productsPerPage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.products && data.products.length > 0) {
            console.log(`Получено ${data.products.length} товаров`);
            
            // Фильтруем дубликаты
            const newProducts = data.products.filter(product => !loadedProductNames.has(product.name));
            
            if (newProducts.length > 0) {
                renderProducts(newProducts);
                currentPage = nextPage;
                
                // Обновляем флаг наличия товаров
                if (!data.hasMore) {
                    hasMoreProducts = false;
                    console.log('Больше товаров нет');
                }
                
                // Сохраняем состояние
                saveState();
            } else {
                console.log('Все товары уже загружены');
                hasMoreProducts = false;
            }
        } else {
            console.log('Нет данных или ошибка API');
            hasMoreProducts = false;
        }
    } catch (error) {
        console.error('Ошибка загрузки дополнительных товаров:', error);
        hasMoreProducts = false;
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

// Функция обработки прокрутки для бесконечной загрузки
function handleScroll() {
    if (isLoading || !hasMoreProducts) {
        if (isLoading) {
            console.log('Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('Больше товаров нет, пропускаем...');
        }
        return;
    }
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    console.log(`Прокрутка: ${scrollTop}, высота окна: ${windowHeight}, высота документа: ${documentHeight}`);
    
    // Загружаем новые товары когда пользователь приближается к концу страницы
    if (scrollTop + windowHeight >= documentHeight - 200) {
        console.log('Достигнут порог для загрузки новых товаров');
        loadMoreProducts();
    }
}

// Функция получения данных с сайта
async function fetchProductData(page = 0) {
    const start = page * 60;
    
    console.log(`Загружаем страницу ${page + 1}, start: ${start}`);
    
    try {
        const response = await fetch(`api.php?start=${start}&limit=60`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Получены данные: ${data.products ? data.products.length : 0} товаров`);
        
        if (!data.success) {
            console.warn('API вернул ошибку:', data.error);
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        return {
            success: false,
            error: error.message,
            products: [],
            total: 0,
            start: start,
            limit: 60
        };
    }
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена, начинаем инициализацию...');
    
    // Показываем экран загрузки
    createLoadingScreen();
    
    // Загружаем первую страницу товаров
    await loadFirstPage();
    
    // Настраиваем обработчики для изображений
    setupImageHandlers();
    
    // Запускаем автосохранение состояния
    startAutoSave();
    
    // Настраиваем обработчик перед выгрузкой страницы
    setupBeforeUnload();
    
    console.log('Инициализация завершена');
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
        // Проверяем, есть ли src у изображения
        if (!img.src || img.src === '' || img.src.includes('undefined')) {
            console.warn('Изображение без src:', img);
            img.style.display = 'none';
            return;
        }
        
        img.addEventListener('load', () => {
            img.classList.add('loaded');
            console.log('Изображение загружено:', img.src);
        });
        
        img.addEventListener('error', () => {
            console.error('Ошибка загрузки изображения:', img.src);
            img.style.display = 'none';
            // Показываем placeholder
            const container = img.closest('.img-container');
            if (container) {
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.style.backgroundColor = '#f5f5f5';
                container.style.borderRadius = '8px';
            }
        });
        
        // Добавляем timeout для изображений, которые долго загружаются
        setTimeout(() => {
            if (!img.complete) {
                console.warn('Изображение не загрузилось за 5 секунд:', img.src);
                img.style.display = 'none';
            }
        }, 5000);
    });
}

// Вызываем настройку обработчиков изображений после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    setupImageHandlers();
});

// Функция показа сообщения о снятии с производства
function showDiscontinuedPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="hideDiscontinuedPopup(this)">&times;</button>
            <div class="popup-icon">
                <img src="images/Discontinued.jpg" alt="Извиняющийся котик" title="Sorry!">
            </div>
            <p class="popup-message">Товар снят с производства. Не расстраивайтесь.</p>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Добавляем класс для body
    document.body.classList.add('popup-open');
    
    // Закрытие по клику вне контента
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideDiscontinuedPopup(popup.querySelector('.popup-close'));
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            hideDiscontinuedPopup(popup.querySelector('.popup-close'));
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Функция скрытия сообщения о снятии с производства
function hideDiscontinuedPopup(closeButton) {
    const popup = closeButton.closest('.popup-overlay');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
            document.body.classList.remove('popup-open');
        }, 300);
    }
}

// Функция показа сообщения о товаре не в наличии
function showOutOfStockPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="hideOutOfStockPopup(this)">&times;</button>
            <div class="popup-icon">
                <span style="font-size: 48px;">📦</span>
            </div>
            <p class="popup-message">Товар временно отсутствует на складе. Попробуйте позже.</p>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Добавляем класс для body
    document.body.classList.add('popup-open');
    
    // Закрытие по клику вне контента
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideOutOfStockPopup(popup.querySelector('.popup-close'));
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            hideOutOfStockPopup(popup.querySelector('.popup-close'));
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Функция скрытия сообщения о товаре не в наличии
function hideOutOfStockPopup(closeButton) {
    const popup = closeButton.closest('.popup-overlay');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
            document.body.classList.remove('popup-open');
        }, 300);
    }
}








