// Инициализация системы переводов
if (typeof window.translations !== 'undefined') {
    window.translations.initTranslations();
    console.log('Система переводов инициализирована');
} else {
    console.warn('Система переводов не найдена');
}

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

// Переменные для поиска
let allProducts = []; // Массив всех загруженных товаров
let searchTerm = ''; // Текущий поисковый запрос
let isSearchActive = false; // Флаг активного поиска

// Счетчик обновлений страницы (F5)
let refreshCounter = 0;
const MAX_REFRESHES_BEFORE_CLEAR = 5; // После 5-го F5 (т.е. при 6-м F5) очищаем кеш

// Функция для получения текста статуса товара
function getStatusText(availability) {
    if (availability === 'В наличии в Одессе' || availability === 'В наличии') {
        return 'В наличии';
    } else if (availability === 'Нет в наличии') {
        return 'Нет в наличии';
    } else if (availability === 'Снят с производства') {
        return 'Снят с производства';
    } else if (availability === 'Ожидается' || availability === 'Ожидается поставка') {
        return 'Ожидается';
    } else if (availability === 'Под заказ') {
        return 'Под заказ';
    } else {
        return 'В наличии';
    }
}

// Функция для переключения меню (удалена, так как используется toggleAvatarMenu)
function toggleMenu() {
    // Эта функция больше не используется, так как меню аватара обрабатывается toggleAvatarMenu
    console.log('toggleMenu: Функция устарела, используйте toggleAvatarMenu');
}

// Функция для переключения меню аватара
function toggleAvatarMenu() {
    const dropdown = document.getElementById('avatarDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        console.log('toggleAvatarMenu: Меню аватара переключено');
    } else {
        console.error('toggleAvatarMenu: Выпадающее меню аватара не найдено');
    }
}

// Закрытие меню аватара при клике вне его
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('avatarDropdown');
    const profilePic = document.querySelector('.profile-pic');
    
    if (dropdown && profilePic) {
        if (!profilePic.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    }
});

// Функция для очистки localStorage и перезагрузки данных
function clearLocalStorage() {
    console.log('=== clearLocalStorage: Функция вызвана ===');
    
    try {
        console.log('clearLocalStorage: Очищаем localStorage...');
        localStorage.removeItem('gs_bot_state');
        console.log('clearLocalStorage: localStorage очищен');
        
        // Сбрасываем счетчик обновлений
        refreshCounter = 0;
        console.log('clearLocalStorage: Счетчик обновлений сброшен');
        
        // Сбрасываем глобальные переменные
        currentPage = 0;
        isLoading = false;
        hasMoreProducts = true;
        maxProducts = 0;
        loadedProductNames.clear();
        savedScrollPosition = 0;
        
        // Сбрасываем переменные поиска
        allProducts = [];
        searchTerm = '';
        isSearchActive = false;
        
        console.log('clearLocalStorage: Глобальные переменные сброшены');
        
        // Очищаем кеш браузера
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
                console.log('clearLocalStorage: Кеш браузера очищен');
            });
        }
        
        // Принудительная перезагрузка страницы
        console.log('clearLocalStorage: Выполняем принудительную перезагрузку...');
        window.location.reload(true);
        
    } catch (error) {
        console.error('clearLocalStorage: Ошибка при очистке:', error);
        // Даже при ошибке пытаемся перезагрузить
        window.location.reload(true);
    }
}

// Функция для поиска товаров
async function searchProducts(query) {
    console.log(`=== ПОИСК ТОВАРОВ: "${query}" ===`);
    
    searchTerm = query.toLowerCase().trim();
    isSearchActive = searchTerm.length > 0;
    
    console.log(`Поисковый запрос: "${searchTerm}"`);
    console.log(`Активный поиск: ${isSearchActive}`);
    console.log(`Всего товаров для поиска: ${allProducts.length}`);
    
    if (!isSearchActive) {
        // Если поиск отменен, показываем все загруженные товары
        console.log('Поиск отменен, показываем все загруженные товары');
        displayProducts(allProducts);
        return;
    }
    
    // Сначала фильтруем уже загруженные товары
    const filteredProducts = allProducts.filter(product => {
        const name = product.name.toLowerCase();
        const description = (product.description || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               description.includes(searchTerm) || 
               category.includes(searchTerm);
    });
    
    console.log(`Найдено товаров в загруженных: ${filteredProducts.length}`);
    
    // Если найдены товары, показываем их
    if (filteredProducts.length > 0) {
        await displayProducts(filteredProducts);
    } else {
        // Если товары не найдены в загруженных, сначала попробуем загрузить больше товаров
        // с сервера, а затем искать в них
        console.log('Товары не найдены в загруженных, загружаем больше товаров с сервера...');
        
        // Если у нас меньше 500 товаров загружено, попробуем загрузить больше
        if (allProducts.length < 500) {
            await loadMoreProductsForSearch(searchTerm);
        } else {
            // Если уже много товаров загружено, но ничего не найдено, 
            // делаем прямой поиск на сервере
            await searchProductsFromServer(searchTerm);
        }
    }
}

// Функция для загрузки дополнительных товаров для поиска
async function loadMoreProductsForSearch(searchTerm) {
    try {
        console.log(`loadMoreProductsForSearch: Загружаем больше товаров для поиска "${searchTerm}"...`);
        
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        // Загружаем больше товаров без поиска, чтобы расширить базу для поиска
        const response = await fetch(`http://localhost:8000/api/products?start=${allProducts.length}&limit=500`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`loadMoreProductsForSearch: Получено ${data.products ? data.products.length : 0} дополнительных товаров`);
        
        if (data.success && data.products && data.products.length > 0) {
            // Создаем временный массив для поиска, НЕ добавляя в allProducts
            const tempProducts = [...allProducts];
            
            // Добавляем новые товары только во временный массив
            data.products.forEach(product => {
                const exists = tempProducts.some(existing => existing.name === product.name);
                if (!exists) {
                    tempProducts.push(product);
                }
            });
            
            console.log(`loadMoreProductsForSearch: Временный массив содержит ${tempProducts.length} товаров`);
            
            // Ищем в расширенном временном списке
            const filteredProducts = tempProducts.filter(product => {
                const name = product.name.toLowerCase();
                const description = (product.description || '').toLowerCase();
                const category = (product.category || '').toLowerCase();
                
                return name.includes(searchTerm) || 
                       description.includes(searchTerm) || 
                       category.includes(searchTerm);
            });
            
            console.log(`loadMoreProductsForSearch: После загрузки найдено товаров: ${filteredProducts.length}`);
            
            if (filteredProducts.length > 0) {
                await displayProducts(filteredProducts);
            } else {
                // Если все еще не найдено, делаем прямой поиск на сервере
                console.log('loadMoreProductsForSearch: Товары все еще не найдены, делаем прямой поиск на сервере');
                await searchProductsFromServer(searchTerm);
            }
        } else {
            // Если больше товаров нет, делаем прямой поиск на сервере
            console.log('loadMoreProductsForSearch: Больше товаров нет, делаем прямой поиск на сервере');
            await searchProductsFromServer(searchTerm);
        }
    } catch (error) {
        console.error('loadMoreProductsForSearch: Ошибка загрузки дополнительных товаров:', error);
        // В случае ошибки делаем прямой поиск на сервере
        await searchProductsFromServer(searchTerm);
    } finally {
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
    }
}

// Функция для поиска товаров на сервере
async function searchProductsFromServer(searchTerm) {
    try {
        console.log(`searchProductsFromServer: Ищем "${searchTerm}" на сервере...`);
        
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        // Сначала пробуем поиск с большим лимитом
        let response = await fetch(`http://localhost:8000/api/products?search=${encodeURIComponent(searchTerm)}&start=0&limit=2000`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let data = await response.json();
        console.log(`searchProductsFromServer: Первый запрос, товаров: ${data.products ? data.products.length : 0}`);
        
        // Если получили 2000 товаров, возможно есть еще больше
        if (data.success && data.products && data.products.length === 2000) {
            console.log('searchProductsFromServer: Получено 2000 товаров, загружаем еще...');
            
            // Загружаем еще товары без поиска, чтобы расширить базу
            const additionalResponse = await fetch(`http://localhost:8000/api/products?start=2000&limit=2000`);
            if (additionalResponse.ok) {
                const additionalData = await additionalResponse.json();
                if (additionalData.success && additionalData.products) {
                    // Фильтруем дополнительные товары локально
                    const additionalFiltered = additionalData.products.filter(product => {
                        const name = product.name.toLowerCase();
                        const description = (product.description || '').toLowerCase();
                        const category = (product.category || '').toLowerCase();
                        
                        return name.includes(searchTerm.toLowerCase()) || 
                               description.includes(searchTerm.toLowerCase()) || 
                               category.includes(searchTerm.toLowerCase());
                    });
                    
                    // Объединяем результаты
                    data.products = [...data.products, ...additionalFiltered];
                    console.log(`searchProductsFromServer: После добавления дополнительных товаров: ${data.products.length}`);
                }
            }
        }
        
        if (data.success && data.products && data.products.length > 0) {
            console.log(`searchProductsFromServer: Найдено ${data.products.length} товаров на сервере`);
            
            // Показываем найденные товары (НЕ добавляем в allProducts)
            await displayProducts(data.products);
        } else {
            // Товары не найдены на сервере
            console.log('searchProductsFromServer: Товары не найдены на сервере');
            await displayProducts([]);
        }
    } catch (error) {
        console.error('searchProductsFromServer: Ошибка поиска на сервере:', error);
        // Показываем пустой результат
        await displayProducts([]);
    } finally {
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
    }
}

// Функция для отображения товаров (с поддержкой поиска)
async function displayProducts(products) {
    const container = document.querySelector('.inner');
    if (!container) {
        console.error('displayProducts: Контейнер .inner не найден');
        return;
    }
    
    // Сохраняем loading indicator перед очисткой
    const loadingIndicator = container.querySelector('#loading-indicator');
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Восстанавливаем loading indicator если он был
    if (loadingIndicator) {
        container.appendChild(loadingIndicator);
    }
    
    if (products.length === 0) {
        // Показываем сообщение о том, что товары не найдены
        const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
        const noProductsFoundText = window.translations ? window.translations.getTranslation('noProductsFound', currentLanguage) : 'Товары не найдены';
        const noProductsForQueryText = window.translations ? window.translations.getTranslationWithParams('noProductsForQuery', { query: searchTerm }, currentLanguage) : `По запросу "${searchTerm}" ничего не найдено`;
        const clearSearchText = window.translations ? window.translations.getTranslation('clearSearch', currentLanguage) : 'Очистить поиск';
        
        container.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 40px; color: var(--text-light);">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>${noProductsFoundText}</h3>
                <p>${noProductsForQueryText}</p>
                <button class="btn" onclick="clearSearch()" style="margin-top: 20px;">
                    <i class="fas fa-times"></i> ${clearSearchText}
                </button>
            </div>
        `;
        
        // Восстанавливаем loading indicator если он был
        if (loadingIndicator) {
            container.appendChild(loadingIndicator);
        }
        return;
    }

    // Оптимизация: показываем все товары сразу для ускорения загрузки
    const fragment = document.createDocumentFragment();
    
    products.forEach((product, index) => {
        const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
        fragment.appendChild(productCard);
    });
    
    // Добавляем все товары в контейнер сразу
    container.appendChild(fragment);
}

// Функция для очистки поиска
async function clearSearch() {
    console.log('=== ОЧИСТКА ПОИСКА ===');
    
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    searchTerm = '';
    isSearchActive = false;
    
    console.log('Поиск очищен, показываем все загруженные товары');
    console.log(`Всего загружено товаров: ${allProducts.length}`);
    
    // Показываем все загруженные товары (не только первые 60)
    await displayProducts(allProducts);
    
    // Восстанавливаем индикатор загрузки для бесконечной прокрутки
    if (hasMoreProducts) {
        showLoadingIndicator();
        console.log('clearSearch: Восстановлен индикатор загрузки для бесконечной прокрутки');
    }
    
    // Восстанавливаем обычный режим загрузки товаров
    console.log('clearSearch: Восстановлен обычный режим загрузки товаров');
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

// Функция скрытия экрана загрузки
function hideLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        console.log('Экран загрузки скрыт');
    }
    
    // Скрываем индикатор загрузки
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        console.log('Индикатор загрузки скрыт');
    }
}

// Функция показа экрана загрузки
function showLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        console.log('Экран загрузки показан');
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
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}`);
        
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
    console.log('renderProducts: Начинаем отображение товаров:', products);
    
    const container = document.querySelector('.inner');
    console.log('renderProducts: Контейнер найден:', container);
    
    if (!container) {
        console.error('renderProducts: Контейнер .inner не найден!');
        return;
    }
    
    products.forEach((product, index) => {
        console.log(`renderProducts: Обрабатываем товар ${index + 1}:`, product);
        const productCard = createProductCardFromSiteData(product, `btn${loadedProductNames.size + index + 1}`);
        console.log(`renderProducts: Карточка создана для товара ${index + 1}:`, productCard);
        container.appendChild(productCard);
        console.log(`renderProducts: Карточка ${index + 1} добавлена в контейнер`);
        
        // Добавляем название в множество загруженных
        loadedProductNames.add(product.name);
    });
    
    console.log(`renderProducts: Всего товаров в контейнере после добавления:`, container.children.length);
    
    // Настраиваем обработчики для новых изображений
    setupImageHandlers();
    
    console.log(`Отображено ${products.length} товаров. Всего загружено: ${loadedProductNames.size}`);
    
    // Сохраняем состояние после добавления новых товаров (только если это не восстановление)
    if (!window.isRestoring) {
        saveState();
    }
    
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

// Функция создания карточки товара из сохраненных данных
function createProductCardFromSavedData(productData, btnId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-name', productData.name);
    
    // Определяем CSS класс для статуса
    let statusClass = '';
    let buttonText = 'Купить';
    
    // Отладка для конкретного товара
    if (productData.name && productData.name.includes('Dean Markley 2558A')) {
        console.log(`=== FRONTEND DEBUG: Creating card from saved data for Dean Markley 2558A ===`);
        console.log(`ProductData availability: ${productData.availability}`);
        console.log(`Full productData:`, productData);
    }
    
    if (productData.availability === 'Нет в наличии') {
        statusClass = 'out-of-stock';
        buttonText = 'Нет в наличии';
    } else if (productData.availability === 'Ожидается') {
        statusClass = 'expected';
        buttonText = 'Ожидается';
    } else if (productData.availability === 'Под заказ') {
        statusClass = 'on-order';
        buttonText = 'Под заказ';
    } else if (productData.availability === 'Снят с производства') {
        statusClass = 'discontinued';
        buttonText = 'Снят с производства';
    } else {
        // По умолчанию "В наличии"
        statusClass = 'in-stock';
        buttonText = 'Купить';
    }
    
    // Определяем CSS класс для цены
    let priceClass = '';
    if (productData.availability === 'Нет в наличии' || productData.availability === 'Ожидается') {
        priceClass = 'out-of-stock';
    } else if (productData.availability === 'Под заказ') {
        priceClass = 'on-order';
    } else if (productData.availability === 'Снят с производства') {
        priceClass = 'discontinued';
    }
    
    // Создаем HTML для карточки товара
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
            <img src="${productData.image}" alt="${productData.name}" class="img">
        </div>
        
        <h3 class="product-title">${productData.name}</h3>
        
        <div class="product-status ${statusClass}">
            ${getStatusText(productData.availability)}
        </div>
        
        <div class="compare-checkbox">
            <input type="checkbox" id="compare-${btnId}">
            <label for="compare-${btnId}">Сравнить</label>
        </div>
        
        <div class="product-prices">
            ${productData.oldPrice && productData.oldPrice !== '0' && !productData.oldPrice.includes('грн') ? `<span class="old-price">${productData.oldPrice} грн</span>` : 
              productData.oldPrice && productData.oldPrice !== '0' ? `<span class="old-price">${productData.oldPrice}</span>` : ''}
            <span class="new-price">${productData.newPrice.includes('грн') ? productData.newPrice : productData.newPrice + ' грн'}</span>
        </div>
        
        <div class="product-rating" data-numeric-rating="${productData.rating}">
            ${generateRatingStars(productData.rating)}
        </div>
        
        <button id="${btnId}" class="btn ${statusClass}">
            ${buttonText}
        </button>
    `;
    
    // Добавляем обработчик для кнопки
    const button = card.querySelector(`#${btnId}`);
    button.addEventListener('click', () => {
        if (productData.availability === 'Снят с производства') {
            showDiscontinuedPopup();
        } else if (productData.availability === 'Нет в наличии') {
            showOutOfStockPopup();
        } else if (productData.availability === 'Ожидается') {
            showExpectedPopup();
        } else if (productData.availability === 'Под заказ') {
            showOnOrderPopup();
        } else {
            // Обычная покупка
            tg.MainButton.text = `Выбрано: ${productData.name}`;
            tg.MainButton.show();
        }
    });
    
    // Добавляем обработчики для кнопок действий
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        favoriteBtn.classList.toggle('favorited');
        if (favoriteBtn.classList.contains('favorited')) {
            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        }
    });
    
    const compareBtn = card.querySelector('.compare-btn');
    compareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        compareBtn.classList.toggle('active');
        if (compareBtn.classList.contains('active')) {
            compareBtn.style.color = 'var(--primary-color)';
        } else {
            compareBtn.style.color = 'var(--text-light)';
        }
    });
    
    return card;
}

// Функция создания карточки товара из данных сайта
function createProductCardFromSiteData(product, btnId) {
    // console.log('createProductCardFromSiteData: Создаем карточку для товара:', product);
    // console.log('createProductCardFromSiteData: btnId:', btnId);
    
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-name', product.name);
    // Сохраняем исходные данные в data-атрибутах для корректного восстановления
    card.setAttribute('data-original-availability', product.availability);
    card.setAttribute('data-original-rating', product.rating);
    
    // Определяем CSS класс для статуса
    let statusClass = '';
    let buttonText = '';
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    
    // Отладка для конкретного товара
    if (product.name && product.name.includes('Dean Markley 2558A')) {
        console.log(`=== FRONTEND DEBUG: Creating card for Dean Markley 2558A ===`);
        console.log(`Product availability: ${product.availability}`);
        console.log(`Product status: ${product.status}`);
        console.log(`Full product data:`, product);
    }
    
    if (product.availability === 'Нет в наличии') {
        statusClass = 'out-of-stock';
        buttonText = 'Нет в наличии';
    } else if (product.availability === 'Ожидается') {
        statusClass = 'expected';
        buttonText = window.translations ? window.translations.getTranslation('expectedButton', currentLanguage) : 'Ожидается';
    } else if (product.availability === 'Под заказ') {
        statusClass = 'on-order';
        buttonText = window.translations ? window.translations.getTranslation('orderButton', currentLanguage) : 'Под заказ';
    } else if (product.availability === 'Снят с производства') {
        statusClass = 'discontinued';
        buttonText = window.translations ? window.translations.getTranslation('discontinuedButton', currentLanguage) : 'Снят с производства';
    } else {
        // По умолчанию "В наличии"
        statusClass = 'in-stock';
        buttonText = window.translations ? window.translations.getTranslation('buyButton', currentLanguage) : 'Купить';
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
            <button class="favorite-btn" title="Добавить в избранное" data-product-id="${btnId}">
                <i class="far fa-heart"></i>
            </button>
            <button class="compare-btn" title="Добавить к сравнению" data-product-id="${btnId}">
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
            ${product.oldPrice && product.oldPrice !== '0' && product.oldPrice !== 'null' ? `<span class="old-price">${product.oldPrice} грн</span>` : ''}
            <span class="new-price">${product.newPrice} грн</span>
        </div>
        
        <div class="product-rating" data-numeric-rating="${product.rating}">
            ${generateRatingStars(product.rating)}
        </div>
        
        <button id="${btnId}" class="btn ${statusClass}" data-product-availability="${product.availability}" data-product-name="${product.name}">
            ${buttonText}
        </button>
    `;
    
    return card;
}

// Функция генерации звездочек рейтинга
function generateRatingStars(rating) {
    console.log('generateRatingStars: Входной рейтинг:', rating);
    
    // Если рейтинг "Нет рейтинга", показываем пустые звезды
    if (rating === 'Нет рейтинга' || rating === 'null' || rating === null || rating === undefined) {
        console.log('generateRatingStars: Нет рейтинга, показываем пустые звезды');
        return '<span class="no-rating">Нет рейтинга</span>';
    }
    
    let numericRating = 0;
    
    // Если рейтинг пришел как строка с голосами (например "4.6 - 10 голосов")
    if (typeof rating === 'string') {
        if (rating.includes('-')) {
            const ratingMatch = rating.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
                numericRating = parseFloat(ratingMatch[1]);
            }
        } else {
            // Пытаемся извлечь число из строки
            const ratingMatch = rating.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
                numericRating = parseFloat(ratingMatch[1]);
            }
        }
    } else if (typeof rating === 'number') {
        numericRating = rating;
    }
    
    // Проверяем валидность рейтинга
    if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
        console.log('generateRatingStars: Невалидный рейтинг, показываем "Нет рейтинга"');
        return '<span class="no-rating">Нет рейтинга</span>';
    }
    
    console.log('generateRatingStars: Числовой рейтинг:', numericRating);
    
    // Округляем рейтинг до ближайшей половины
    const roundedRating = Math.round(numericRating * 2) / 2;
    
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    console.log(`generateRatingStars: fullStars=${fullStars}, hasHalfStar=${hasHalfStar}, emptyStars=${emptyStars}`);
    
    let stars = '';
    
    // Полные звезды (слева направо)
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star-filled">★</span>';
    }
    
    // Половина звезды
    if (hasHalfStar) {
        stars += '<span class="star-half">★</span>';
    }
    
    // Пустые звезды (справа)
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star-empty">☆</span>';
    }
    
    console.log('generateRatingStars: Сгенерированные звезды:', stars);
    return stars;
}

// Функция загрузки дополнительных товаров при прокрутке
async function loadMoreProducts() {
    console.log(`loadMoreProducts: Проверка условий - isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}, isSearchActive=${isSearchActive}`);
    
    // Не загружаем дополнительные товары во время поиска
    if (isSearchActive) {
        console.log('loadMoreProducts: Поиск активен, пропускаем загрузку дополнительных товаров...');
        return;
    }
    
    if (isLoading || !hasMoreProducts) {
        if (isLoading) {
            console.log('loadMoreProducts: Загрузка уже идет, пропускаем...');
        } else if (!hasMoreProducts) {
            console.log('loadMoreProducts: Больше товаров нет, пропускаем...');
        }
        return;
    }
    
    console.log('loadMoreProducts: Начинаем загрузку дополнительных товаров...');
    console.log(`loadMoreProducts: Текущая страница: ${currentPage}, загружено товаров: ${loadedProductNames.size}`);
    isLoading = true;
    
    // Показываем индикатор загрузки
    showLoadingIndicator();
    
    try {
        const nextPage = currentPage + 1;
        const start = nextPage * productsPerPage;
        
        console.log(`loadMoreProducts: Загружаем страницу ${nextPage}, начиная с ${start}`);
        console.log(`loadMoreProducts: URL: http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}`);
        
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=${productsPerPage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`loadMoreProducts: Получен ответ, товаров: ${data.products ? data.products.length : 0}`);
        console.log(`loadMoreProducts: Данные API:`, data);
        
        if (data.success) {
            if (data.products && data.products.length > 0) {
                console.log(`loadMoreProducts: Получено ${data.products.length} товаров`);
                
                // НЕ фильтруем дубликаты для разных страниц - каждая страница содержит уникальные товары
                // Фильтруем только если это действительно дубликаты в рамках одной страницы
                const newProducts = data.products;
                
                // Отладка для конкретного товара
                data.products.forEach(product => {
                    if (product.name && product.name.includes('Dean Markley 2558A')) {
                        console.log(`=== FRONTEND DEBUG: Dean Markley 2558A found in loadMoreProducts API response ===`);
                        console.log(`Product: ${product.name}`);
                        console.log(`Availability: ${product.availability}`);
                        console.log(`Status: ${product.status}`);
                        console.log(`Full product data:`, product);
                        console.log(`=== END FRONTEND DEBUG ===`);
                    }
                });
                
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
                hasMoreProducts = data.hasMore;
                
                console.log(`loadMoreProducts: Обновлено - currentPage=${currentPage}, hasMoreProducts=${hasMoreProducts}`);
                
                if (!hasMoreProducts) {
                    console.log('loadMoreProducts: Больше товаров нет');
                    showEndMessage();
                }
                
                // Сохраняем состояние
                saveState();
                console.log('loadMoreProducts: Состояние сохранено');
                
                console.log('loadMoreProducts: Товары добавлены успешно');
            } else {
                // Пустой список товаров означает конец пагинации
                console.log('loadMoreProducts: Получен пустой список товаров - конец пагинации');
                hasMoreProducts = false;
                showEndMessage();
            }
        } else {
            console.log('loadMoreProducts: Ошибка API');
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

// Функция загрузки всех товаров
async function loadAllProducts() {
    console.log('=== loadAllProducts: Загружаем все товары ===');
    
    if (isLoading) {
        console.log('loadAllProducts: Загрузка уже идет, пропускаем...');
        return;
    }
    
    try {
        isLoading = true;
        showLoadingIndicator();
        
        // Скрываем кнопку "Загрузить все" во время загрузки
        const loadAllBtn = document.getElementById('load-all-btn');
        if (loadAllBtn) {
            loadAllBtn.disabled = true;
            loadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загружаем все товары...';
        }
        
        console.log('loadAllProducts: Отправляем запрос на загрузку всех товаров...');
        
        // Загружаем все товары через API
        const response = await fetch('http://localhost:8000/api/products?start=0&limit=377');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('loadAllProducts: Получены данные:', data);
        
        if (data.products && data.products.length > 0) {
            console.log(`loadAllProducts: Получено ${data.products.length} товаров`);
            
            // Очищаем контейнер
            const container = document.querySelector('.inner');
            container.innerHTML = '';
            loadedProductNames.clear();
            
            // Отображаем все товары
            data.products.forEach((product, index) => {
                const productCard = createProductCardFromSiteData(product, `btn${index + 1}`);
                container.appendChild(productCard);
                loadedProductNames.add(product.name);
            });
            
            // Обновляем состояние
            currentPage = 0;
            hasMoreProducts = false;
            maxProducts = data.products.length;
            
            // Настраиваем обработчики для всех изображений
            setupImageHandlers();
            
            // Показываем сообщение о завершении
            showEndMessage();
            
            // Сохраняем состояние
            saveState();
            
            console.log('loadAllProducts: Все товары загружены успешно');
        } else {
            console.log('loadAllProducts: Получен пустой список товаров');
            showEndMessage();
        }
        
    } catch (error) {
        console.error('loadAllProducts: Ошибка загрузки всех товаров:', error);
        showEndMessage();
    } finally {
        isLoading = false;
        hideLoadingIndicator();
        
        // Восстанавливаем кнопку "Загрузить все"
        if (loadAllBtn) {
            loadAllBtn.disabled = false;
            loadAllBtn.innerHTML = '<i class="fas fa-download"></i> Загрузить все 377 товаров категории Струны для электрогитары';
        }
        
        console.log('loadAllProducts: Загрузка завершена');
    }
}

// Функция обработки прокрутки для бесконечной загрузки
function handleScroll() {
    console.log(`handleScroll: Проверка - isLoading=${isLoading}, hasMoreProducts=${hasMoreProducts}, currentPage=${currentPage}`);
    
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
    
    console.log(`handleScroll: scrollTop=${scrollTop}, windowHeight=${windowHeight}, documentHeight=${documentHeight}`);
    console.log(`handleScroll: Порог для загрузки: ${documentHeight - 300}`);
    
    // Загружаем новые товары когда пользователь приближается к концу страницы
    if (scrollTop + windowHeight >= documentHeight - 300) {
        console.log('handleScroll: Достигнут порог для загрузки новых товаров!');
        console.log(`handleScroll: currentPage=${currentPage}, hasMoreProducts=${hasMoreProducts}, loadedProducts=${loadedProductNames.size}`);
        loadMoreProducts();
    }
    
    // Сохраняем позицию скролла при прокрутке (с дебаунсингом)
    if (loadedProductNames.size > 0) {
        clearTimeout(window.scrollSaveTimeout);
        window.scrollSaveTimeout = setTimeout(() => {
            saveState();
        }, 100); // Сохраняем через 100ms после остановки прокрутки
    }
}

// Функция получения данных с сайта
async function fetchProductData(page = 0) {
    const start = page * 60;
    
    try {
        // Используем прокси через наш сервер для обхода CORS
        const response = await fetch(`http://localhost:8000/api/products?start=${start}&limit=60`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
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
    console.log('saveState: Начинаем сохранение состояния...');
    
    // Сохраняем только имена товаров и позицию скролла
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    const state = {
        currentPage: currentPage,
        loadedProductNames: Array.from(loadedProductNames),
        maxProducts: maxProducts,
        hasMoreProducts: hasMoreProducts,
        scrollPosition: currentScrollPosition,
        timestamp: Date.now(),
        refreshCounter: refreshCounter
    };
    
    localStorage.setItem('gs_bot_state', JSON.stringify(state));
    console.log('Состояние сохранено:', state);
    console.log('Позиция скролла сохранена:', currentScrollPosition);
    
    // Дополнительная отладка позиции скролла
    console.log('saveState: Текущая позиция скролла:', currentScrollPosition);
    console.log('saveState: window.pageYOffset:', window.pageYOffset);
    console.log('saveState: document.documentElement.scrollTop:', document.documentElement.scrollTop);
    console.log('saveState: document.body.scrollTop:', document.body.scrollTop);
}

// Функция загрузки состояния
function loadState() {
    try {
        const savedState = localStorage.getItem('gs_bot_state');
        console.log('loadState: Сырые данные из localStorage:', savedState);
        
        if (savedState) {
            const state = JSON.parse(savedState);
            console.log('loadState: Распарсенные данные:', state);
            
            // Проверяем, не устарело ли состояние (24 часа)
            if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                console.log('loadState: Состояние актуально, возвращаем');
                
                // Проверяем счетчик обновлений
                if (state.refreshCounter !== undefined) {
                    refreshCounter = state.refreshCounter;
                    console.log(`loadState: Счетчик обновлений загружен из localStorage: ${refreshCounter}`);
                    console.log(`loadState: MAX_REFRESHES_BEFORE_CLEAR: ${MAX_REFRESHES_BEFORE_CLEAR}`);
                    
                    // Если это третье F5 или больше, автоматически очищаем кеш
                    if (refreshCounter >= MAX_REFRESHES_BEFORE_CLEAR) {
                        console.log('loadState: Достигнут лимит обновлений, автоматически очищаем кеш');
                        setTimeout(() => {
                            clearLocalStorage();
                        }, 100);
                        return null;
                    }
                } else {
                    console.log('loadState: Счетчик обновлений не найден в состоянии, устанавливаем 0');
                    refreshCounter = 0;
                }
                
                return state;
            } else {
                console.log('loadState: Состояние устарело');
            }
        } else {
            console.log('loadState: Нет сохраненного состояния');
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния:', error);
    }
    return null;
}

// Функция восстановления всех товаров
async function restoreAllProducts() {
    console.log('restoreAllProducts: Начинаем восстановление...');
    const state = loadState();
    if (!state) {
        console.log('restoreAllProducts: Состояние не найдено в localStorage');
        return false;
    }
    
    console.log('restoreAllProducts: Состояние найдено:', state);
    
    // Проверяем, есть ли товары для восстановления
    if (!state.loadedProductNames || state.loadedProductNames.length === 0) {
        console.log('restoreAllProducts: Нет товаров в сохраненном состоянии, очищаем localStorage');
        localStorage.removeItem('gs_bot_state');
        return false;
    }
    
    try {
        // Восстанавливаем переменные
        currentPage = state.currentPage || 0;
        loadedProductNames = new Set(state.loadedProductNames || []);
        maxProducts = state.maxProducts || 0;
        hasMoreProducts = state.hasMoreProducts || false;
        
        // Загружаем свежие данные с сервера
        console.log('restoreAllProducts: Загружаем свежие данные с сервера...');
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            console.log(`restoreAllProducts: Загружено ${data.products.length} товаров с сервера`);
            
            // Фильтруем товары, которые были загружены ранее
            const previouslyLoadedProducts = data.products.filter(product => 
                state.loadedProductNames.has(product.name)
            );
            
            console.log(`restoreAllProducts: Найдено ${previouslyLoadedProducts.length} ранее загруженных товаров`);
            
            // Восстанавливаем товары из свежих данных
            const container = document.querySelector('.inner');
            if (!container) {
                console.error('restoreAllProducts: Контейнер .inner не найден');
                return false;
            }
            container.innerHTML = '';
            
            if (previouslyLoadedProducts.length > 0) {
                console.log('restoreAllProducts: Начинаем восстановление товаров из свежих данных...');
                
                previouslyLoadedProducts.forEach((productData, index) => {
                    console.log(`restoreAllProducts: Создаем карточку для товара ${index + 1}:`, productData.name);
                    const productCard = createProductCardFromSiteData(productData, `btn${index + 1}`);
                    container.appendChild(productCard);
                    console.log(`restoreAllProducts: Карточка ${index + 1} добавлена в контейнер`);
                });
                
                console.log(`Восстановлено ${previouslyLoadedProducts.length} товаров из свежих данных`);
            } else {
                console.log('restoreAllProducts: Нет товаров для восстановления');
                return false;
            }
            
            // Восстанавливаем позицию скролла
            if (state.scrollPosition > 0) {
                console.log('restoreAllProducts: Восстанавливаем позицию скролла:', state.scrollPosition);
                
                // Функция для надежного восстановления позиции скролла
                const restoreScrollPosition = (position) => {
                    try {
                        console.log('=== ВОССТАНОВЛЕНИЕ СКРОЛЛА ===');
                        console.log('Пытаемся восстановить позицию:', position);
                        console.log('Текущая позиция до восстановления:', window.pageYOffset || document.documentElement.scrollTop);
                        console.log('Высота документа:', document.documentElement.scrollHeight);
                        console.log('Высота окна:', window.innerHeight);
                        
                        // Проверяем, что позиция не превышает максимальную высоту страницы
                        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                        const safePosition = Math.min(position, maxScroll);
                        
                        if (safePosition !== position) {
                            console.log(`Позиция скорректирована с ${position} на ${safePosition} (максимум: ${maxScroll})`);
                        }
                        
                        // Проверяем, что страница достаточно загружена
                        if (document.documentElement.scrollHeight < window.innerHeight + 100) {
                            console.log('Страница еще не полностью загружена, откладываем восстановление');
                            return false;
                        }
                        
                        window.scrollTo(0, safePosition);
                        console.log('Позиция скролла восстановлена:', safePosition);
                        
                        // Проверяем, что скролл действительно восстановился
                        setTimeout(() => {
                            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                            console.log('Проверка после восстановления. Текущая позиция:', currentScroll);
                            if (Math.abs(currentScroll - safePosition) > 10) {
                                console.log('Позиция скролла не восстановилась корректно, повторяем...');
                                window.scrollTo(0, safePosition);
                                return false;
                            } else {
                                console.log('Позиция скролла восстановлена успешно!');
                                return true;
                            }
                        }, 50);
                        
                        return true;
                    } catch (error) {
                        console.error('Ошибка при восстановлении позиции скролла:', error);
                        return false;
                    }
                };
                
                // Функция для попыток восстановления с проверкой успеха
                const attemptRestoreScroll = (position, attempts = 0) => {
                    if (attempts >= 10) {
                        console.log('Достигнуто максимальное количество попыток восстановления скролла');
                        return;
                    }
                    
                    const success = restoreScrollPosition(position);
                    if (!success) {
                        console.log(`Попытка ${attempts + 1} не удалась, повторяем через 500мс...`);
                        setTimeout(() => attemptRestoreScroll(position, attempts + 1), 500);
                    }
                };
                
                // Используем улучшенную логику восстановления
                attemptRestoreScroll(state.scrollPosition);
            }
            
            // Скрываем экран загрузки
            hideLoadingScreen();
            
            // Сбрасываем флаг загрузки
            isLoading = false;
            
            // Правильно обрабатываем индикатор загрузки и сообщение о конце
            if (hasMoreProducts) {
                // Если есть еще товары, показываем индикатор загрузки
                showLoadingIndicator();
                console.log('restoreAllProducts: Показан индикатор загрузки для следующих страниц');
            } else {
                // Если товаров больше нет, скрываем индикатор и показываем сообщение о конце
                hideLoadingIndicator();
                showEndMessage();
                console.log('restoreAllProducts: Показано сообщение о конце списка');
            }
            
            // Дополнительная проверка: если все товары загружены, убеждаемся что индикатор скрыт
            if (!hasMoreProducts) {
                const loadingIndicator = document.getElementById('loading-indicator');
                if (loadingIndicator && loadingIndicator.style.display !== 'none') {
                    loadingIndicator.style.display = 'none';
                    console.log('restoreAllProducts: Принудительно скрыт индикатор загрузки');
                }
            }
            
            console.log(`Восстановлено ${state.loadedProductNames.length} товаров. Есть еще: ${hasMoreProducts}`);
            
            // Отладка статусов товаров
            state.loadedProductNames.forEach((product, index) => {
                if (product.name && product.name.includes('Dean Markley 2558A')) {
                    console.log(`=== FRONTEND DEBUG: Dean Markley 2558A found in restored data ===`);
                    console.log(`Product: ${product.name}`);
                    console.log(`Status: ${product.status}`);
                    console.log(`Availability: ${product.availability}`);
                    console.log(`Full product data:`, product);
                    console.log(`=== END FRONTEND DEBUG ===`);
                }
            });
            
            return true;
        } else {
            console.log('restoreAllProducts: Нет данных с сервера');
            return false;
        }
    } catch (error) {
        console.error('Ошибка восстановления товаров:', error);
        return false;
    }
}

// Функция загрузки первой страницы
async function loadFirstPage() {
    try {
        const container = document.querySelector('.inner');
        if (!container) {
            console.error('loadFirstPage: КРИТИЧЕСКАЯ ОШИБКА - контейнер .inner не найден!');
            return;
        }
        
        const data = await fetchProductData(0);
        
        if (data && data.products && data.products.length > 0) {
            // Обновляем глобальные переменные
            maxProducts = data.total || data.products.length;
            hasMoreProducts = data.hasMore;
            currentPage = 0; // Сбрасываем страницу на первую
            
            // Сохраняем товары в массив для поиска
            allProducts = [...data.products];
            
            // Сохраняем названия загруженных товаров
            data.products.forEach(product => {
                loadedProductNames.add(product.name);
            });
            
            // Отображаем товары с поддержкой поиска
            displayProducts(allProducts);
            
            // Скрываем экран загрузки
            hideLoadingScreen();
            
            // Сохраняем состояние
            saveState();
            
            // Скрываем индикатор загрузки после загрузки первых товаров
            // Он будет показан только при прокрутке вниз для бесконечной загрузки
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Если товаров больше нет, показываем сообщение о конце
            if (!hasMoreProducts) {
                showEndMessage();
            }
        } else {
            console.error('loadFirstPage: Не удалось загрузить товары - нет данных');
            
            // Скрываем индикатор загрузки
            hideLoadingScreen();
            
            // Показываем сообщение об ошибке
            const container = document.querySelector('.inner');
            
            // Сохраняем loading indicator перед очисткой
            const loadingIndicator = container.querySelector('#loading-indicator');
            
            container.innerHTML = `
                <div class="error-message">
                    <p>Не удалось загрузить товары. API не вернул данные.</p>
                    <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
                </div>
            `;
            
            // Восстанавливаем loading indicator если он был
            if (loadingIndicator) {
                container.appendChild(loadingIndicator);
            }
        }
    } catch (error) {
        console.error('loadFirstPage: Ошибка загрузки товаров:', error);
        
        // Скрываем индикатор загрузки
        hideLoadingScreen();
        
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        
        // Сохраняем loading indicator перед очисткой
        const loadingIndicator = container.querySelector('#loading-indicator');
        
        container.innerHTML = `
            <div class="error-message">
                <p>Произошла ошибка при загрузке товаров: ${error.message}</p>
                <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
            </div>
        `;
        
        // Восстанавливаем loading indicator если он был
        if (loadingIndicator) {
            container.appendChild(loadingIndicator);
        }
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
    // Сохраняем состояние при закрытии страницы
    window.addEventListener('beforeunload', () => {
        if (loadedProductNames.size > 0) {
            saveState();
        }
    });
    
    // Сохраняем состояние при изменении видимости страницы (включая F5)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && loadedProductNames.size > 0) {
            saveState();
        }
    });
    
    // Сохраняем состояние при потере фокуса окна
    window.addEventListener('blur', () => {
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

// Основная функция инициализации
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== Инициализация приложения v10.9 ===');
    console.log('DOM загружен, начинаем инициализацию...');
    
    try {
        // Проверяем, есть ли сохранённое состояние
        const savedState = loadState();
        
        if (savedState) {
            console.log('Найдено сохранённое состояние, пытаемся восстановить...');
            
            // Проверяем, не устарело ли состояние (24 часа)
            if (Date.now() - savedState.timestamp < 24 * 60 * 60 * 1000) {
                console.log('Состояние актуально, восстанавливаем...');
                
                // Увеличиваем счетчик обновлений после загрузки состояния
                refreshCounter++;
                console.log(`Инициализация: Счетчик обновлений увеличен до ${refreshCounter}`);
                
                // Проверяем, не нужно ли автоматически очистить кеш
                if (refreshCounter >= MAX_REFRESHES_BEFORE_CLEAR) {
                    console.log('Достигнут лимит обновлений, автоматически очищаем кеш и загружаем заново');
                    clearLocalStorage();
                    await loadFirstPage();
                    return;
                }
                
                // Восстанавливаем состояние
                window.isRestoring = true;
                const restored = await restoreAllProducts();
                window.isRestoring = false;
                
                if (restored) {
                    // Затем загружаем свежие данные для обновления статусов и рейтингов
                    console.log('Загружаем свежие данные для обновления статусов и рейтингов...');
                    await refreshProductData();
                    
                    // Восстанавливаем позицию скролла после обновления данных
                    if (savedState.scrollPosition > 0) {
                        console.log('Восстанавливаем позицию скролла после обновления данных:', savedState.scrollPosition);
                        
                        // Функция для надежного восстановления позиции скролла
                        const restoreScrollPosition = (position) => {
                            try {
                                console.log('=== ВОССТАНОВЛЕНИЕ СКРОЛЛА ===');
                                console.log('Пытаемся восстановить позицию:', position);
                                console.log('Текущая позиция до восстановления:', window.pageYOffset || document.documentElement.scrollTop);
                                console.log('Высота документа:', document.documentElement.scrollHeight);
                                console.log('Высота окна:', window.innerHeight);
                                
                                // Проверяем, что позиция не превышает максимальную высоту страницы
                                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                                const safePosition = Math.min(position, maxScroll);
                                
                                if (safePosition !== position) {
                                    console.log(`Позиция скорректирована с ${position} на ${safePosition} (максимум: ${maxScroll})`);
                                }
                                
                                // Проверяем, что страница достаточно загружена
                                if (document.documentElement.scrollHeight < window.innerHeight + 100) {
                                    console.log('Страница еще не полностью загружена, откладываем восстановление');
                                    return false;
                                }
                                
                                window.scrollTo(0, safePosition);
                                console.log('Позиция скролла восстановлена:', safePosition);
                                
                                // Проверяем, что скролл действительно восстановился
                                setTimeout(() => {
                                    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                                    console.log('Проверка после восстановления. Текущая позиция:', currentScroll);
                                    if (Math.abs(currentScroll - safePosition) > 10) {
                                        console.log('Позиция скролла не восстановилась корректно, повторяем...');
                                        window.scrollTo(0, safePosition);
                                        return false;
                                    } else {
                                        console.log('Позиция скролла восстановлена успешно!');
                                        return true;
                                    }
                                }, 50);
                                
                                return true;
                            } catch (error) {
                                console.error('Ошибка при восстановлении позиции скролла:', error);
                                return false;
                            }
                        };
                        
                        // Функция для попыток восстановления с проверкой успеха
                        const attemptRestoreScroll = (position, attempts = 0) => {
                            if (attempts >= 10) {
                                console.log('Достигнуто максимальное количество попыток восстановления скролла');
                                return;
                            }
                            
                            const success = restoreScrollPosition(position);
                            if (!success) {
                                console.log(`Попытка ${attempts + 1} не удалась, повторяем через 500мс...`);
                                setTimeout(() => attemptRestoreScroll(position, attempts + 1), 500);
                            }
                        };
                        
                        // Используем улучшенную логику восстановления
                        attemptRestoreScroll(savedState.scrollPosition);
                    }
                } else {
                    // Если восстановление не удалось, загружаем с нуля
                    console.log('Восстановление не удалось, загружаем с нуля...');
                    await loadFirstPage();
                }
            } else {
                console.log('Состояние устарело или неполное, загружаем с нуля...');
                await loadFirstPage();
            }
        } else {
            // Если нет сохранённого состояния, загружаем с нуля
            console.log('Нет сохранённого состояния, загружаем с нуля...');
            
            // Увеличиваем счетчик обновлений для первого посещения
            refreshCounter++;
            console.log(`Инициализация: Счетчик обновлений увеличен до ${refreshCounter} (первое посещение)`);
            
            await loadFirstPage();
        }
        
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
        
        // Настраиваем обработчики для кнопок меню и настроек
        console.log('=== НАСТРОЙКА КНОПОК МЕНЮ И НАСТРОЕК ===');
        const menuBtn = document.querySelector('.menu-btn');
        console.log('menuBtn найден:', menuBtn);
        if (menuBtn) {
            // Удаляем старые обработчики если они есть
            menuBtn.removeEventListener('click', menuBtn._clickHandler);
            
            // Создаем новый обработчик
            menuBtn._clickHandler = (e) => {
                console.log('КНОПКА МЕНЮ НАЖАТА! (addEventListener)');
                e.stopPropagation();
                e.preventDefault();
                showMenuPopup();
            };
            
            // Добавляем обработчик
            menuBtn.addEventListener('click', menuBtn._clickHandler);
            
            // Добавляем обработчик onclick для дополнительной надежности
            menuBtn.onclick = (e) => {
                console.log('КНОПКА МЕНЮ НАЖАТА! (onclick)');
                e.stopPropagation();
                e.preventDefault();
                showMenuPopup();
            };
            
            console.log('Обработчик кнопки меню настроен');
        } else {
            console.error('ОШИБКА: Кнопка меню не найдена!');
        }
        
        const settingsBtn = document.querySelector('.settings-btn');
        console.log('settingsBtn найден:', settingsBtn);
        if (settingsBtn) {
            // Удаляем старые обработчики если они есть
            settingsBtn.removeEventListener('click', settingsBtn._clickHandler);
            
            // Создаем новый обработчик
            settingsBtn._clickHandler = (e) => {
                console.log('КНОПКА НАСТРОЕК НАЖАТА! (addEventListener)');
                e.stopPropagation();
                e.preventDefault();
                showSettingsPopup();
            };
            
            // Добавляем обработчик
            settingsBtn.addEventListener('click', settingsBtn._clickHandler);
            
            // Добавляем обработчик onclick для дополнительной надежности
            settingsBtn.onclick = (e) => {
                console.log('КНОПКА НАСТРОЕК НАЖАТА! (onclick)');
                e.stopPropagation();
                e.preventDefault();
                showSettingsPopup();
            };
            
            console.log('Обработчик кнопки настроек настроен');
        } else {
            console.error('ОШИБКА: Кнопка настроек не найдена!');
        }
        console.log('=== КОНЕЦ НАСТРОЙКИ КНОПОК ===');
        
        // Настраиваем обработчики для переключения языков
        console.log('=== НАСТРОЙКА ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ ===');
        setupLanguageSwitchers();
        console.log('Обработчики переключения языков настроены');
        
        // Загружаем фото профиля из Telegram (если доступно)
        console.log('=== ЗАГРУЗКА ФОТО ПРОФИЛЯ ИЗ TELEGRAM ===');
        loadTelegramProfilePhoto();
        console.log('Фото профиля загружено (если доступно)');
        
        // Настраиваем закрытие всплывающих окон при клике вне их
        setupPopupClickOutside();
        console.log('Обработчики закрытия всплывающих окон настроены');
        
        // Кнопка "Загрузить все товары" удалена по запросу пользователя
        
        // Настраиваем кнопку поддержки
        const supportButton = document.querySelector('.online-status');
        if (supportButton) {
            supportButton.addEventListener('click', () => {
                openTelegramChat('GuitarStringsUSA');
            });
            
            // Обновляем статус кнопки поддержки
            updateSupportButtonStatus();
            
            // Обновляем статус каждые 5 минут
            setInterval(updateSupportButtonStatus, 5 * 60 * 1000);
        }
        
        // Настраиваем обработчики для нижней навигации
        console.log('=== НАСТРОЙКА НИЖНЕЙ НАВИГАЦИИ ===');
        const navItems = document.querySelectorAll('.nav-item');
        console.log('navItems найдены:', navItems.length);
        
        // Устанавливаем начальную активность для кнопки "Товары"
        if (navItems.length > 0) {
            navItems[0].classList.add('active');
            console.log('Установлена начальная активность для кнопки "Товары"');
        }
        
        navItems.forEach((navItem, index) => {
            // Удаляем старые обработчики если они есть
            navItem.removeEventListener('click', navItem._clickHandler);
            
            // Создаем новый обработчик
            navItem._clickHandler = (e) => {
                console.log(`Кнопка нижней навигации ${index + 1} нажата`);
                e.preventDefault();
                e.stopPropagation();
                
                // Убираем активный класс со всех кнопок
                navItems.forEach(item => {
                    item.classList.remove('active');
                    console.log(`Убран активный класс с кнопки ${item.querySelector('span')?.textContent}`);
                });
                
                // Добавляем активный класс к нажатой кнопке
                navItem.classList.add('active');
                console.log(`Добавлен активный класс к кнопке ${navItem.querySelector('span')?.textContent}`);
                
                // Здесь можно добавить логику для переключения разделов
                const navText = navItem.querySelector('span').textContent;
                console.log(`Переключение на раздел: ${navText}`);
                
                // Пока что просто переключаем активный класс без уведомлений
                // Убираем логику возврата к "Товары" - позволяем кнопкам оставаться активными
            };
            
            // Добавляем обработчик
            navItem.addEventListener('click', navItem._clickHandler);
            
            console.log(`Обработчик для nav-item ${index + 1} настроен`);
        });
        console.log('=== КОНЕЦ НАСТРОЙКИ НИЖНЕЙ НАВИГАЦИИ ===');
        
        // Настраиваем event delegation для карточек товаров (оптимизация производительности)
        console.log('=== НАСТРОЙКА EVENT DELEGATION ДЛЯ КАРТОЧЕК ТОВАРОВ ===');
        const innerContainer = document.querySelector('.inner');
        if (innerContainer) {
            innerContainer.addEventListener('click', (e) => {
                // Обработка кнопок покупки
                if (e.target.classList.contains('btn') && e.target.id) {
                    const availability = e.target.getAttribute('data-product-availability');
                    const productName = e.target.getAttribute('data-product-name');
                    
                    console.log(`Кнопка покупки нажата: ${productName}, статус: ${availability}`);
                    
                    if (availability === 'Снят с производства') {
                        showDiscontinuedPopup();
                    } else if (availability === 'Нет в наличии') {
                        showOutOfStockPopup();
                    } else if (availability === 'Ожидается') {
                        showExpectedPopup();
                    } else if (availability === 'Под заказ') {
                        showOnOrderPopup();
                    } else {
                        // Обычная покупка
                        if (window.tg && window.tg.MainButton) {
                            window.tg.MainButton.text = `Выбрано: ${productName}`;
                            window.tg.MainButton.show();
                        }
                    }
                }
                
                // Обработка кнопок избранного
                if (e.target.closest('.favorite-btn')) {
                    e.preventDefault();
                    const favoriteBtn = e.target.closest('.favorite-btn');
                    favoriteBtn.classList.toggle('favorited');
                    const icon = favoriteBtn.querySelector('i');
                    if (favoriteBtn.classList.contains('favorited')) {
                        icon.className = 'fas fa-heart';
                    } else {
                        icon.className = 'far fa-heart';
                    }
                }
                
                // Обработка кнопок сравнения
                if (e.target.closest('.compare-btn')) {
                    e.preventDefault();
                    const compareBtn = e.target.closest('.compare-btn');
                    compareBtn.style.color = compareBtn.style.color === 'var(--primary-color)' ? 'var(--text-light)' : 'var(--primary-color)';
                }
            });
            console.log('Event delegation для карточек товаров настроен');
        }
        console.log('=== КОНЕЦ НАСТРОЙКИ EVENT DELEGATION ===');
        
        // Настраиваем обработчики для поиска
        console.log('=== НАСТРОЙКА ПОИСКА ===');
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            console.log('searchInput найден:', searchInput);
            
            // Обработчик ввода в поисковую строку
            searchInput.addEventListener('input', async (e) => {
                const query = e.target.value;
                console.log(`Поисковый запрос: "${query}"`);
                await searchProducts(query);
            });
            
            // Обработчик нажатия Enter
            searchInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value;
                    console.log(`Поиск по Enter: "${query}"`);
                    await searchProducts(query);
                }
            });
            
            // Обработчик клика по иконке поиска
            const searchIcon = document.querySelector('.search-icon');
            if (searchIcon) {
                searchIcon.addEventListener('click', async () => {
                    const query = searchInput.value;
                    console.log(`Поиск по клику на иконку: "${query}"`);
                    await searchProducts(query);
                });
            }
            
            console.log('Обработчики поиска настроены');
        } else {
            console.error('ОШИБКА: Поле поиска не найдено!');
        }
        console.log('=== КОНЕЦ НАСТРОЙКИ ПОИСКА ===');
        
        console.log('Инициализация завершена успешно');
    } catch (error) {
        console.error('Ошибка во время инициализации:', error);
        
        // Показываем сообщение об ошибке
        const container = document.querySelector('.inner');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Произошла ошибка при загрузке товаров: ${error.message}</p>
                    <button class="btn" onclick="location.reload()">Перезагрузить страницу</button>
                </div>
            `;
        }
    }
});

// Функция для получения и отображения фото профиля из Telegram
function loadTelegramProfilePhoto() {
    if (window.Telegram && window.Telegram.WebApp && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        console.log('Telegram user data:', user);
        
        if (user.photo_url) {
            const profileImage = document.getElementById('profile-image');
            const profileIcon = document.getElementById('profile-icon');
            
            if (profileImage && profileIcon) {
                profileImage.src = user.photo_url;
                profileImage.style.display = 'block';
                profileIcon.style.display = 'none';
                
                // Добавляем обработчик ошибок для изображения
                profileImage.onerror = () => {
                    console.warn('Не удалось загрузить фото профиля из Telegram, показываем иконку');
                    profileImage.style.display = 'none';
                    profileIcon.style.display = 'block';
                };
                
                profileImage.onload = () => {
                    console.log('Фото профиля из Telegram успешно загружено');
                };
            }
        } else {
            console.log('Фото профиля не найдено в данных Telegram пользователя');
        }
    } else {
        console.log('Telegram WebApp недоступен или данные пользователя отсутствуют');
    }
}

// Обработчики событий Telegram
if (window.Telegram && window.Telegram.WebApp) {
    tg.ready();
    
    // Загружаем фото профиля после готовности Telegram WebApp
    loadTelegramProfilePhoto();
    
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

// Удалено - дублирующий обработчик DOMContentLoaded

// Функция показа сообщения о снятии с производства
function showDiscontinuedPopup() {
    console.log('showDiscontinuedPopup: Показываем popup для товара снятого с производства');
    openPopup('discontinuedPopup');
}

function showOutOfStockPopup() {
    console.log('showOutOfStockPopup: Показываем popup для товара которого нет в наличии');
    openPopup('outOfStockPopup');
}

function showExpectedPopup() {
    console.log('showExpectedPopup: Показываем popup для товара который ожидается');
    openPopup('expectedPopup');
}

function showOnOrderPopup() {
    console.log('showOnOrderPopup: Показываем popup для товара под заказ');
    openPopup('onOrderPopup');
}

// Функции для показа всплывающих окон меню и настроек
function showMenuPopup() {
    console.log('=== showMenuPopup: Показываем popup меню ===');
    const popup = document.getElementById('menuPopup');
    console.log('menuPopup найден:', popup);
    openPopup('menuPopup');
}

function showSettingsPopup() {
    console.log('=== showSettingsPopup: Показываем popup настроек ===');
    const popup = document.getElementById('settingsPopup');
    console.log('settingsPopup найден:', popup);
    openPopup('settingsPopup');
}

// Функция для закрытия всех всплывающих окон при клике вне их
function setupPopupClickOutside() {
    document.addEventListener('click', (e) => {
        const menuPopup = document.getElementById('menuPopup');
        const settingsPopup = document.getElementById('settingsPopup');
        
        // Закрываем меню если клик не по кнопке меню и не по содержимому меню
        if (menuPopup && menuPopup.classList.contains('show')) {
            const menuBtn = document.querySelector('.menu-btn');
            if (!menuBtn.contains(e.target) && !menuPopup.contains(e.target)) {
                closePopup('menuPopup');
            }
        }
        
        // Закрываем настройки если клик не по кнопке настроек и не по содержимому настроек
        if (settingsPopup && settingsPopup.classList.contains('show')) {
            const settingsBtn = document.querySelector('.settings-btn');
            if (!settingsBtn.contains(e.target) && !settingsPopup.contains(e.target)) {
                closePopup('settingsPopup');
            }
        }
    });
}

// Функция проверки онлайн статуса пользователя в Telegram
async function checkTelegramUserStatus(username) {
    // Простая логика по времени: 9:00-19:00 = онлайн, остальное время = оффлайн
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isWorkingHours = currentHour >= 9 && currentHour <= 19; // Рабочие часы 9:00-19:00, без выходных
    
    console.log(`Статус поддержки по времени:`, {
        currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
        isWorkingHours,
        isOnline: isWorkingHours
    });
    
    return { 
        isOnline: isWorkingHours, 
        username: username,
        debug: {
            currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
            isWorkingHours
        }
    };
}

// Функция открытия чата в Telegram
function openTelegramChat(username) {
    try {
        // Открываем чат с пользователем в Telegram
        const telegramUrl = `https://t.me/${username}`;
        
        // Если мы в Telegram Web App, используем встроенные методы
        if (window.Telegram && window.Telegram.WebApp) {
            // Открываем внешнюю ссылку
            tg.openTelegramLink(telegramUrl);
        } else {
            // Для обычного браузера открываем в новой вкладке
            window.open(telegramUrl, '_blank');
        }
        
        console.log(`Открыт чат с @${username}`);
    } catch (error) {
        console.error('Ошибка открытия чата в Telegram:', error);
        // Fallback - открываем в новой вкладке
        window.open(`https://t.me/${username}`, '_blank');
    }
}



// Функция обновления статуса кнопки поддержки
async function updateSupportButtonStatus() {
    const supportButton = document.querySelector('.online-status');
    const statusDot = supportButton.querySelector('.status-dot');
    const statusText = supportButton.querySelector('span');
    
    try {
        // Проверяем статус пользователя @GuitarStringsUSA
        const userInfo = await checkTelegramUserStatus('GuitarStringsUSA');
        
        if (userInfo && userInfo.isOnline) {
            // Если пользователь онлайн, показываем зеленый статус
            statusDot.style.background = '#4CAF50'; // Зеленый цвет для онлайн
            statusText.textContent = 'Напишите нам, мы онлайн!';
            supportButton.classList.add('online');
            supportButton.classList.remove('offline');
        } else {
            // Если пользователь оффлайн, показываем синий статус
            statusDot.style.background = '#2196F3'; // Синий цвет для оффлайн
            statusText.textContent = 'Напишите нам, мы позже ответим';
            supportButton.classList.add('offline');
            supportButton.classList.remove('online');
        }
    } catch (error) {
        console.error('Ошибка обновления статуса поддержки:', error);
        // По умолчанию показываем оффлайн статус
        statusDot.style.background = '#2196F3';
        statusText.textContent = 'Напишите нам, мы позже ответим';
        supportButton.classList.add('offline');
        supportButton.classList.remove('online');
    }
}

// Функция обновления данных товаров (статусы, рейтинги) без перезагрузки списка
async function refreshProductData() {
    try {
        console.log('Начинаем обновление данных товаров...');
        
        // Получаем текущие загруженные товары
        const currentProducts = Array.from(loadedProductNames);
        if (currentProducts.length === 0) {
            console.log('Нет товаров для обновления');
            return;
        }
        
        // Загружаем свежие данные с API для обновления
        const response = await fetch('http://localhost:8000/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const freshData = await response.json();
        console.log('Получены свежие данные для обновления:', freshData.length, 'товаров');
        
        // Обновляем статусы и рейтинги для существующих товаров
        let updatedCount = 0;
        for (const productName of currentProducts) {
            const freshProduct = freshData.find(p => p.name === productName);
            if (freshProduct) {
                // Находим DOM элемент товара
                const productCard = document.querySelector(`[data-product-name="${productName}"]`);
                if (productCard) {
                    // Обновляем статус
                    const statusElement = productCard.querySelector('.product-status');
                    if (statusElement) {
                        const newStatus = getStatusText(freshProduct.availability);
                        statusElement.textContent = newStatus;
                        
                        // Определяем правильный CSS класс для статуса
                        let statusClass = '';
                        if (freshProduct.availability === 'Нет в наличии') {
                            statusClass = 'out-of-stock';
                        } else if (freshProduct.availability === 'Ожидается') {
                            statusClass = 'expected';
                        } else if (freshProduct.availability === 'Под заказ') {
                            statusClass = 'on-order';
                        } else if (freshProduct.availability === 'Снят с производства') {
                            statusClass = 'discontinued';
                        } else {
                            statusClass = 'in-stock';
                        }
                        statusElement.className = `product-status ${statusClass}`;
                    }
                    
                    // Обновляем рейтинг
                    const ratingElement = productCard.querySelector('.product-rating');
                    if (ratingElement && freshProduct.rating) {
                        ratingElement.innerHTML = generateRatingStars(freshProduct.rating);
                    }
                    
                    // Обновляем кнопку в зависимости от статуса
                    const buttonElement = productCard.querySelector('.btn');
                    if (buttonElement) {
                        const newStatus = getStatusText(freshProduct.availability);
                        let buttonText = 'Купить';
                        let buttonClass = 'btn in-stock';
                        
                        if (freshProduct.availability === 'Снят с производства') {
                            buttonText = 'Снят с производства';
                            buttonClass = 'btn discontinued';
                        } else if (freshProduct.availability === 'Нет в наличии') {
                            buttonText = 'Нет в наличии';
                            buttonClass = 'btn out-of-stock';
                        } else if (freshProduct.availability === 'Ожидается') {
                            buttonText = 'Ожидается';
                            buttonClass = 'btn expected';
                        } else if (freshProduct.availability === 'Под заказ') {
                            buttonText = 'Под заказ';
                            buttonClass = 'btn on-order';
                        }
                        
                        buttonElement.textContent = buttonText;
                        buttonElement.className = buttonClass;
                    }
                    
                    updatedCount++;
                }
            }
        }
        
        console.log(`Обновлено ${updatedCount} товаров`);
        
        // Не вызываем saveState() здесь, чтобы избежать конфликтов с восстановлением
        // saveState() будет вызван автоматически через startAutoSave()
        
    } catch (error) {
        console.error('Ошибка при обновлении данных товаров:', error);
    }
}

// Функция автоматического сохранения

// Функция loadAllProducts удалена по запросу пользователя

// Функция обработки прокрутки для бесконечной загрузки

// Функция для закрытия всплывающих окон
function closePopup(popupId) {
    console.log(`closePopup: Закрываем popup с ID: ${popupId}`);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('show');
        console.log(`closePopup: Popup ${popupId} закрыт`);
    } else {
        console.error(`closePopup: Popup с ID ${popupId} не найден`);
    }
}

// Функция для открытия всплывающих окон
function openPopup(popupId) {
    console.log(`openPopup: Открываем popup с ID: ${popupId}`);
    
    // Сначала закрываем все другие popup'ы
    const allPopups = ['menuPopup', 'settingsPopup'];
    allPopups.forEach(id => {
        if (id !== popupId) {
            const popup = document.getElementById(id);
            if (popup && popup.classList.contains('show')) {
                popup.classList.remove('show');
                console.log(`openPopup: Закрыт popup ${id} перед открытием ${popupId}`);
            }
        }
    });
    
    // Теперь открываем нужный popup
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.add('show');
        console.log(`openPopup: Popup ${popupId} открыт`);
    } else {
        console.error(`openPopup: Popup с ID ${popupId} не найден`);
    }
}

// Функция для обновления переводов кнопок товаров при смене языка
function updateProductButtonTranslations(language) {
    const buttons = document.querySelectorAll('.product-card .btn');
    
    buttons.forEach(button => {
        const availability = button.getAttribute('data-product-availability');
        let newText = '';
        
        if (availability === 'Нет в наличии') {
            newText = 'Нет в наличии';
        } else if (availability === 'Ожидается') {
            newText = window.translations ? window.translations.getTranslation('expectedButton', language) : 'Ожидается';
        } else if (availability === 'Под заказ') {
            newText = window.translations ? window.translations.getTranslation('orderButton', language) : 'Под заказ';
        } else if (availability === 'Снят с производства') {
            newText = window.translations ? window.translations.getTranslation('discontinuedButton', language) : 'Снят с производства';
        } else {
            // По умолчанию "В наличии"
            newText = window.translations ? window.translations.getTranslation('buyButton', language) : 'Купить';
        }
        
        button.textContent = newText;
    });
}

// Функция для настройки переключателей языков
function setupLanguageSwitchers() {
    console.log('setupLanguageSwitchers: Настраиваем переключатели языков');
    
    const languageButtons = document.querySelectorAll('.language-btn');
    console.log(`setupLanguageSwitchers: Найдено ${languageButtons.length} кнопок языков`);
    
    // Получаем текущий язык
    const currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
    console.log(`setupLanguageSwitchers: Текущий язык: ${currentLanguage}`);
    
    // Устанавливаем активный класс для текущего языка
    languageButtons.forEach(button => {
        const lang = button.getAttribute('data-lang');
        if (lang === currentLanguage) {
            button.classList.add('active');
            console.log(`setupLanguageSwitchers: Установлен активный класс для языка ${lang}`);
        } else {
            button.classList.remove('active');
        }
        
        // Добавляем обработчик клика
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedLang = button.getAttribute('data-lang');
            console.log(`setupLanguageSwitchers: Выбран язык: ${selectedLang}`);
            
            // Убираем активный класс со всех кнопок
            languageButtons.forEach(btn => btn.classList.remove('active'));
            
            // Добавляем активный класс к нажатой кнопке
            button.classList.add('active');
            
            // Переключаем язык
            if (typeof window.translations !== 'undefined') {
                window.translations.setLanguage(selectedLang);
                console.log(`setupLanguageSwitchers: Язык переключен на ${selectedLang}`);
                
                // Обновляем переводы кнопок товаров
                updateProductButtonTranslations(selectedLang);
            } else {
                console.error('setupLanguageSwitchers: Система переводов не найдена');
            }
        });
        
        console.log(`setupLanguageSwitchers: Обработчик для языка ${lang} настроен`);
    });
}








