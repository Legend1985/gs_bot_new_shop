// Проверяем, находимся ли мы в Telegram Web App
let tg;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.MainButton.textColor = '#FFFFFF';
    tg.MainButton.color = '#2cab37';
} else {
    // Fallback для обычного браузера
    tg = {
        WebApp: {
            expand: () => console.log('Telegram WebApp не доступен'),
            MainButton: {
                textColor: '#FFFFFF',
                color: '#2cab37',
                text: '',
                show: () => console.log('Telegram MainButton не доступен'),
                onClick: (callback) => console.log('Telegram MainButton onClick не доступен')
            },
            ready: () => console.log('Telegram WebApp ready не доступен'),
            sendData: (data) => console.log('Telegram sendData не доступен:', data)
        }
    };
    console.log('Запущено в обычном браузере, Telegram функции недоступны');
}

// Переменные для загрузки товаров
let currentPage = 0;
let isLoading = false;
let hasMoreProducts = true;
const productsPerPage = 60;
let maxProducts = 0;
let loadedProductNames = new Set();
let savedScrollPosition = 0;

// Функция для получения текста статуса товара
function getStatusText(availability) {
    if (availability === 'В наличии в Одессе') {
        return 'В наличии';
    } else if (availability === 'Нет в наличии') {
        return 'Нет в наличии';
    } else if (availability === 'Снят с производства') {
        return 'Снят с производства';
    } else if (availability === 'Ожидается') {
        return 'Ожидается';
    } else if (availability === 'Под заказ') {
        return 'Под заказ';
    } else {
        return 'В наличии';
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
    
    // Скрываем индикатор загрузки
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    console.log('Показано сообщение о конце списка товаров');
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
        const response = await fetch(`http://localhost:8000/api.php?start=${start}&limit=${productsPerPage}`);
        
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
    
    // Проверяем, нужно ли показать сообщение о конце списка
    if (!hasMoreProducts) {
        showEndMessage();
    }
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
    let buttonText = 'Купить';
    
    if (product.availability === 'Нет в наличии') {
        statusClass = 'out-of-stock';
        buttonText = 'Нет в наличии';
    } else if (product.availability === 'Ожидается') {
        statusClass = 'expected';
        buttonText = 'Ожидается';
    } else if (product.availability === 'Под заказ') {
        statusClass = 'on-order';
        buttonText = 'Под заказ';
    } else if (product.availability === 'Снят с производства') {
        statusClass = 'discontinued';
        buttonText = 'Снят с производства';
    } else {
        // По умолчанию "В наличии"
        statusClass = 'in-stock';
        buttonText = 'Купить';
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
    
    // Создаем HTML для карточки товара в новом стиле
    card.innerHTML = `
        <div class="product-actions">
            <button class="favorite-btn" title="Добавить в избранное">
                <i class="far fa-heart"></i>
            </button>
            <button class="compare-btn" title="Добавить к сравнению">
                <i class="fas fa-balance-scale"></i>
            </button>
        </div>
        
        <div class="img-container">
            <img src="${product.image}" alt="${product.name}" class="img">
        </div>
        
        <h3 class="product-title">${product.name}</h3>
        
        <div class="product-status ${statusClass}">
            ${getStatusText(product.availability)}
        </div>
        
        <div class="compare-checkbox">
            <input type="checkbox" id="compare-${btnId}">
            <label for="compare-${btnId}">Сравнить</label>
        </div>
        
        <div class="product-prices">
            ${product.oldPrice && product.oldPrice !== '0' ? `<span class="old-price">Цена: ${product.oldPrice}грн</span>` : ''}
            <span class="new-price">Цена: ${product.newPrice}грн</span>
        </div>
        
        <div class="product-rating">
            ${generateRatingStars(product.rating)}
        </div>
        
        <button id="${btnId}" class="btn ${statusClass}">
            ${buttonText}
        </button>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        if (product.availability === 'Снят с производства') {
            showDiscontinuedPopup();
        } else if (product.availability === 'Нет в наличии') {
            showOutOfStockPopup();
        } else if (product.availability === 'Ожидается') {
            showExpectedPopup();
        } else if (product.availability === 'Под заказ') {
            showOnOrderPopup();
        } else {
            // Обычная покупка
            tg.MainButton.text = `Выбрано: ${product.name}`;
            tg.MainButton.show();
        }
    });
    
    // Добавляем обработчики для кнопок действий
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        favoriteBtn.classList.toggle('favorited');
        const icon = favoriteBtn.querySelector('i');
        if (favoriteBtn.classList.contains('favorited')) {
            icon.className = 'fas fa-heart';
        } else {
            icon.className = 'far fa-heart';
        }
    });
    
    const compareBtn = card.querySelector('.compare-btn');
    compareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        compareBtn.style.color = compareBtn.style.color === 'var(--primary-color)' ? 'var(--text-light)' : 'var(--primary-color)';
    });
    
    return card;
}

// Функция генерации звездочек рейтинга
function generateRatingStars(rating) {
    if (!rating || rating === 0) {
        rating = 4.0; // Дефолтный рейтинг если нет данных
    }
    
    // Если рейтинг пришел как строка с голосами (например "4.6 - 10 голосов")
    if (typeof rating === 'string' && rating.includes('-')) {
        const ratingMatch = rating.match(/(\d+\.?\d*)/);
        if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
        } else {
            rating = 4.0;
        }
    }
    
    // Округляем рейтинг для лучшего отображения
    // Если рейтинг имеет четверти (например 4.25), округляем до половины (4.5)
    const roundedRating = Math.round(rating * 2) / 2;
    
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 >= 0.5;
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
    if (isLoading || !hasMoreProducts) {
        console.log('loadMoreProducts: Загрузка уже идет или больше товаров нет');
        return;
    }
    
    console.log('loadMoreProducts: Начинаем загрузку дополнительных товаров...');
    isLoading = true;
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        const nextPage = currentPage + 1;
        const start = nextPage * productsPerPage;
        
        console.log(`loadMoreProducts: Загружаем страницу ${nextPage}, начиная с ${start}`);
        
        const response = await fetch(`http://localhost:8000/api.php?start=${start}&limit=${productsPerPage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`loadMoreProducts: Получен ответ, товаров: ${data.products ? data.products.length : 0}`);
        
        if (data.success && data.products && data.products.length > 0) {
            console.log(`loadMoreProducts: Получено ${data.products.length} товаров`);
            
            // Фильтруем дубликаты
            const newProducts = data.products.filter(product => !loadedProductNames.has(product.name));
            
            if (newProducts.length > 0) {
                console.log(`loadMoreProducts: Добавляем ${newProducts.length} новых товаров`);
                
                // Отображаем новые товары
                const container = document.querySelector('.inner');
                newProducts.forEach((product, index) => {
                    const productCard = createProductCardFromSiteData(product, `btn${loadedProductNames.size + index + 1}`);
                    container.appendChild(productCard);
                    loadedProductNames.add(product.name);
                });
                
                // Обновляем текущую страницу
                currentPage = nextPage;
                
                // Настраиваем обработчики для новых изображений
                setupImageHandlers();
                
                // Обновляем флаг наличия товаров
                if (data.hasMore === false || data.products.length < productsPerPage) {
                    hasMoreProducts = false;
                    console.log('loadMoreProducts: Больше товаров нет');
                    showEndMessage();
                } else {
                    hasMoreProducts = true;
                    console.log('loadMoreProducts: Есть еще товары для загрузки');
                }
                
                // Сохраняем состояние
                saveState();
                console.log('loadMoreProducts: Состояние сохранено');
            } else {
                console.log('loadMoreProducts: Все товары уже загружены');
                hasMoreProducts = false;
                showEndMessage();
            }
        } else {
            console.log('loadMoreProducts: Нет данных или ошибка API');
            hasMoreProducts = false;
            showEndMessage();
        }
    } catch (error) {
        console.error('loadMoreProducts: Ошибка загрузки дополнительных товаров:', error);
        hasMoreProducts = false;
        showEndMessage();
    } finally {
        isLoading = false;
        hideLoadingIndicator();
        console.log('loadMoreProducts: Загрузка завершена');
    }
}

// Функция обработки прокрутки для бесконечной загрузки
function handleScroll() {
    if (isLoading || !hasMoreProducts) {
        if (isLoading) {
            console.log('handleScroll: Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('handleScroll: Больше товаров нет, пропускаем...');
        }
        return;
    }
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Загружаем новые товары когда пользователь приближается к концу страницы
    // Уменьшаем порог для более плавной загрузки
    if (scrollTop + windowHeight >= documentHeight - 300) {
        console.log('handleScroll: Достигнут порог для загрузки новых товаров');
        console.log(`handleScroll: scrollTop=${scrollTop}, windowHeight=${windowHeight}, documentHeight=${documentHeight}`);
        loadMoreProducts();
    }
}

// Функция получения данных с сайта
async function fetchProductData(page = 0) {
    const start = page * 60;
    
    console.log(`fetchProductData: Загружаем страницу ${page + 1}, start: ${start}`);
    
    try {
        // Формируем правильный URL для пагинации
        let url = 'https://guitarstrings.com.ua/electro';
        if (start > 0) {
            url += `?start=${start}`;
        }
        
        console.log(`fetchProductData: Отправляем запрос к API: ${url}`);
        
        // Используем прокси через наш сервер для обхода CORS
        const response = await fetch(`http://localhost:8000/api.php?start=${start}&limit=60`);
        
        console.log(`fetchProductData: Получен ответ, статус: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('fetchProductData: Парсим JSON ответ...');
        const data = await response.json();
        console.log(`fetchProductData: JSON распарсен, получены данные:`, data);
        console.log(`fetchProductData: Количество товаров: ${data.products ? data.products.length : 0}`);
        
        // Проверяем, есть ли товары в ответе
        if (data.products && data.products.length > 0) {
            // Добавляем флаг success, если его нет
            if (data.success === undefined) {
                data.success = true;
            }
            // Добавляем общее количество товаров
            if (data.total === undefined) {
                data.total = data.products.length;
            }
        } else {
            data.success = false;
            data.products = [];
            data.total = 0;
        }
        
        return data;
    } catch (error) {
        console.error('fetchProductData: Ошибка получения данных:', error);
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
        console.log('loadFirstPage: Начинаем загрузку данных...');
        
        // Сохраняем текущую позицию прокрутки
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        console.log('loadFirstPage: Сохраняем позицию прокрутки:', currentScrollPosition);
        
        const data = await fetchProductData(0);
        console.log('loadFirstPage: Данные получены:', data);
        
        if (data && data.products && data.products.length > 0) {
            console.log(`loadFirstPage: Загружено ${data.products.length} товаров`);
            console.log('loadFirstPage: Первые товары:', data.products.slice(0, 3));
            
            // Ограничиваем отображение первыми 60 товарами
            const firstPageProducts = data.products.slice(0, 60);
            
            // Обновляем глобальные переменные
            maxProducts = data.total || data.products.length;
            hasMoreProducts = data.hasMore !== false && data.products.length >= 60;
            
            console.log(`loadFirstPage: maxProducts=${maxProducts}, hasMoreProducts=${hasMoreProducts}`);
            
            // Сохраняем названия загруженных товаров
            firstPageProducts.forEach(product => {
                loadedProductNames.add(product.name);
            });
            
            // Очищаем контейнер и отображаем товары
            const container = document.querySelector('.inner');
            console.log('loadFirstPage: Контейнер найден:', container);
            console.log('loadFirstPage: Размеры контейнера до очистки:', container.offsetWidth, 'x', container.offsetHeight);
            container.innerHTML = '';
            console.log('loadFirstPage: Контейнер очищен');
            console.log('loadFirstPage: Размеры контейнера после очистки:', container.offsetWidth, 'x', container.offsetHeight);
            
            firstPageProducts.forEach((product, index) => {
                console.log(`loadFirstPage: Создаем карточку для товара ${index + 1}:`, product.name);
                const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
                console.log('loadFirstPage: Карточка создана:', productCard);
                console.log('loadFirstPage: HTML карточки:', productCard.outerHTML);
                container.appendChild(productCard);
                console.log(`loadFirstPage: Карточка ${index + 1} добавлена в контейнер`);
            });
            
            console.log('loadFirstPage: Все карточки товаров добавлены');
            console.log('loadFirstPage: Количество карточек в контейнере:', container.children.length);
            console.log('loadFirstPage: Размеры контейнера после добавления карточек:', container.offsetWidth, 'x', container.offsetHeight);
            
            // Восстанавливаем позицию прокрутки
            setTimeout(() => {
                window.scrollTo(0, currentScrollPosition);
                console.log('loadFirstPage: Позиция прокрутки восстановлена:', currentScrollPosition);
            }, 100);
            
            // Сохраняем состояние
            saveState();
            console.log('loadFirstPage: Состояние сохранено');
            
            // Если есть еще товары, показываем индикатор загрузки
            if (hasMoreProducts) {
                const loadingIndicator = document.getElementById('loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'block';
                }
            } else {
                // Если товаров меньше 60, показываем сообщение о конце
                showEndMessage();
            }
        } else {
            console.error('loadFirstPage: Не удалось загрузить товары - нет данных');
            console.error('loadFirstPage: Полученные данные:', data);
            
            // Показываем сообщение об ошибке
            const container = document.querySelector('.inner');
            container.innerHTML = `
                <div class="error-message">
                    <p>Не удалось загрузить товары. API не вернул данные.</p>
                    <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('loadFirstPage: Ошибка загрузки товаров:', error);
        
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        container.innerHTML = `
            <div class="error-message">
                <p>Произошла ошибка при загрузке товаров: ${error.message}</p>
                <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
            </div>
        `;
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
    
    try {
        // Загружаем первую страницу товаров
        console.log('Начинаем загрузку первой страницы...');
        await loadFirstPage();
        console.log('Первая страница загружена');
        
        // Настраиваем обработчики для изображений
        setupImageHandlers();
        console.log('Обработчики изображений настроены');
        
        // Запускаем автосохранение состояния
        startAutoSave();
        console.log('Автосохранение запущено');
        
        // Настраиваем обработчик перед выгрузкой страницы
        setupBeforeUnload();
        console.log('Обработчик beforeunload настроен');
        
        // Настраиваем обработчик прокрутки для бесконечной загрузки
        window.addEventListener('scroll', handleScroll);
        console.log('Обработчик прокрутки настроен');
        
        console.log('Инициализация завершена успешно');
    } catch (error) {
        console.error('Ошибка во время инициализации:', error);
        
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        container.innerHTML = `
            <div class="error-message">
                <p>Произошла ошибка при загрузке товаров: ${error.message}</p>
                <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
            </div>
        `;
    }
});

// Обработчики событий Telegram
if (window.Telegram && window.Telegram.WebApp) {
    tg.ready();
    
    tg.MainButton.onClick(() => {
        tg.sendData("test");
    });
} else {
    console.log('Telegram WebApp не доступен, пропускаем инициализацию');
}

// Настройка обработчиков изображений
function setupImageHandlers() {
    const images = document.querySelectorAll('.product-card .img');
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
                container.style.minHeight = '150px';
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
    
    console.log('Показано всплывающее окно о снятии с производства');
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

// Функция показа сообщения о товаре в ожидании
function showExpectedPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="hideExpectedPopup(this)">&times;</button>
            <div class="popup-icon">
                <span style="font-size: 48px;">⏳</span>
            </div>
            <p class="popup-message">Товар ожидается в ближайшее время. Оставьте заявку!</p>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Добавляем класс для body
    document.body.classList.add('popup-open');
    
    // Закрытие по клику вне контента
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideExpectedPopup(popup.querySelector('.popup-close'));
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            hideExpectedPopup(popup.querySelector('.popup-close'));
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Функция скрытия сообщения о товаре в ожидании
function hideExpectedPopup(closeButton) {
    const popup = closeButton.closest('.popup-overlay');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
            document.body.classList.remove('popup-open');
        }, 300);
    }
}

// Функция показа сообщения о товаре под заказ
function showOnOrderPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="hideOnOrderPopup(this)">&times;</button>
            <div class="popup-icon">
                <span style="font-size: 48px;">📋</span>
            </div>
            <p class="popup-message">Товар доступен под заказ. Срок поставки уточняйте у менеджера.</p>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Добавляем класс для body
    document.body.classList.add('popup-open');
    
    // Закрытие по клику вне контента
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideOnOrderPopup(popup.querySelector('.popup-close'));
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            hideOnOrderPopup(popup.querySelector('.popup-close'));
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Функция скрытия сообщения о товаре под заказ
function hideOnOrderPopup(closeButton) {
    const popup = closeButton.closest('.popup-overlay');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
            document.body.classList.remove('popup-open');
        }, 300);
    }
}

// Функциональность для нового интерфейса
function setupNewInterface() {
    // Обработчики для нижней навигации
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Убираем активный класс у всех элементов
            navItems.forEach(nav => nav.classList.remove('active'));
            // Добавляем активный класс к выбранному элементу
            item.classList.add('active');
            
            // Здесь можно добавить логику для переключения между разделами
            const section = item.querySelector('span').textContent;
            console.log(`Переключение на раздел: ${section}`);
        });
    });
    
    // Обработчик для поиска
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterProducts(query);
        });
    }
    
    // Обработчик для кнопки настроек
    const settingsBtn = document.querySelector('.settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showSettingsPopup();
        });
    }
    
    // Обработчик для кнопки меню
    const menuBtn = document.querySelector('.menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            showMenuPopup();
        });
    }
    
    // Обработчик для кнопки закрытия
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            // Здесь можно добавить логику закрытия приложения
            console.log('Закрытие приложения');
        });
    }
    
    // Обработчик для онлайн статуса
    const onlineStatus = document.querySelector('.online-status');
    if (onlineStatus) {
        onlineStatus.addEventListener('click', () => {
            showContactPopup();
        });
    }
    
    // Добавляем обработчик прокрутки для бесконечной загрузки
    window.addEventListener('scroll', handleScroll);
    console.log('setupNewInterface: Обработчик прокрутки добавлен');
}

// Функция фильтрации товаров по поиску
function filterProducts(query) {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const title = card.querySelector('.product-title').textContent.toLowerCase();
        
        if (title.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Показ попапа настроек
function showSettingsPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="hideSettingsPopup(this)">&times;</button>
            <h3>Настройки</h3>
            <div class="settings-options">
                <div class="setting-item">
                    <label>Уведомления</label>
                    <input type="checkbox" checked>
                </div>
                <div class="setting-item">
                    <label>Темная тема</label>
                    <input type="checkbox">
                </div>
                <div class="setting-item">
                    <label>Автообновление цен</label>
                    <input type="checkbox" checked>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    
    document.body.classList.add('popup-open');
    
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideSettingsPopup(popup.querySelector('.popup-close'));
        }
    });
}

// Скрытие попапа настроек
function hideSettingsPopup(closeButton) {
    const popup = closeButton.closest('.popup-overlay');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
            document.body.classList.remove('popup-open');
        }, 300);
    }
}

// Показ попапа меню
function showMenuPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="hideMenuPopup(this)">&times;</button>
            <h3>Меню</h3>
            <div class="menu-options">
                <div class="menu-item">
                    <i class="fas fa-user"></i>
                    <span>Профиль</span>
                </div>
                <div class="menu-item">
                    <i class="fas fa-cog"></i>
                    <span>Настройки</span>
                </div>
                <div class="menu-item">
                    <i class="fas fa-question-circle"></i>
                    <span>Помощь</span>
                </div>
                <div class="menu-item">
                    <i class="fas fa-info-circle"></i>
                    <span>О приложении</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    
    document.body.classList.add('popup-open');
    
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideMenuPopup(popup.querySelector('.popup-close'));
        }
    });
}

// Скрытие попапа меню
function hideMenuPopup(closeButton) {
    const popup = closeButton.closest('.popup-overlay');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
            document.body.classList.remove('popup-open');
        }, 300);
    }
}

// Показ попапа контактов
function showContactPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay show';
    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="hideContactPopup(this)">&times;</button>
            <h3>Свяжитесь с нами</h3>
            <div class="contact-info">
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <span>+380 (99) 123-45-67</span>
                </div>
                <div class="contact-item">
                    <i class="fab fa-telegram"></i>
                    <span>@guitarstrings_ua</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <span>info@guitarstrings.com.ua</span>
                </div>
            </div>
            <p>Мы онлайн и готовы помочь!</p>
        </div>
    `;
    document.body.appendChild(popup);
    
    document.body.classList.add('popup-open');
    
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            hideContactPopup(popup.querySelector('.popup-close'));
        }
    });
}

// Скрытие попапа контактов
function hideContactPopup(closeButton) {
    const popup = closeButton.closest('.popup-overlay');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
            document.body.classList.remove('popup-open');
        }, 300);
    }
}

// Инициализация нового интерфейса при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    setupNewInterface();
    // Убираем дублирующий вызов loadFirstPage() - он уже вызывается в setupNewInterface
});

// Добавляем стили для новых попапов
const newStyles = `
<style>
.settings-options, .menu-options, .contact-info {
    margin: 20px 0;
}

.setting-item, .menu-item, .contact-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child, .menu-item:last-child, .contact-item:last-child {
    border-bottom: none;
}

.menu-item, .contact-item {
    cursor: pointer;
    transition: background 0.2s ease;
    padding: 12px;
    border-radius: var(--border-radius-small);
}

.menu-item:hover, .contact-item:hover {
    background: var(--bg-secondary);
}

.menu-item i, .contact-item i {
    margin-right: 12px;
    color: var(--primary-color);
    width: 20px;
    text-align: center;
}

.popup-content h3 {
    margin-bottom: 20px;
    color: var(--text-primary);
}

.popup-content p {
    margin-top: 20px;
    color: var(--text-secondary);
    font-style: italic;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', newStyles);








